package api

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/user/alerting/server/internal/auth"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
	"github.com/user/alerting/server/internal/storage"
)

// Handler handles API requests
type Handler struct {
	store        *storage.Storage
	logger       *logging.Logger
	eventEmitter func(string, interface{})
}

// New creates a new API handler
func New(store *storage.Storage, logger *logging.Logger, eventEmitter func(string, interface{})) *Handler {
	return &Handler{
		store:        store,
		logger:       logger,
		eventEmitter: eventEmitter,
	}
}

// RegisterRoutes registers API routes
func (h *Handler) RegisterRoutes(r *mux.Router) {
	// Alerts endpoints
	r.HandleFunc("/alerts", h.GetAlerts).Methods("GET")
	r.HandleFunc("/alerts", h.CreateAlert).Methods("POST")
	r.HandleFunc("/alerts/{id}", h.GetAlert).Methods("GET")
	r.HandleFunc("/alerts/{id}", h.DeleteAlert).Methods("DELETE")

	// Logs endpoints
	r.HandleFunc("/logs", h.GetLogs).Methods("GET")
	r.HandleFunc("/logs/{id}", h.GetLogByID).Methods("GET")
}

// GetAlerts handles GET /alerts requests
func (h *Handler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())

	// Parse query parameters
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	// Parse pagination parameters
	limit := 10 // Default limit
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	offset := 0 // Default offset
	if offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get alerts from database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	alerts, err := h.store.GetAlerts(ctx, status, limit, offset)
	if err != nil {
		h.logger.Error(err, "Failed to retrieve alerts")
		h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve alerts")
		return
	}

	// Get total count for pagination
	total, err := h.store.CountAlerts(ctx, status)
	if err != nil {
		h.logger.Error(err, "Failed to count alerts")
		total = len(alerts) // Fallback to result count
	}

	// Redact sensitive information if not authenticated
	if !authInfo.Authenticated {
		for i := range alerts {
			auth.RedactAlertData(&alerts[i], false)
		}
		h.logger.Info("Returning redacted alerts (unauthenticated access)")
	}

	// Calculate next/prev pagination offsets
	var nextOffset, prevOffset *int
	if offset+limit < total {
		next := offset + limit
		nextOffset = &next
	}
	if offset > 0 {
		prev := offset - limit
		if prev < 0 {
			prev = 0
		}
		prevOffset = &prev
	}

	// Build response
	response := models.PaginatedResponse{
		Data:   alerts,
		Count:  len(alerts),
		Total:  total,
		Limit:  limit,
		Offset: offset,
		Filters: map[string]string{
			"status": status,
		},
		NextOffset: nextOffset,
		PrevOffset: prevOffset,
	}

	h.respondWithJSON(w, http.StatusOK, response)
}

// CreateAlert handles POST /alerts requests
func (h *Handler) CreateAlert(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to create alert")
		return
	}

	// Check if the content is gzipped
	var reader io.Reader

	if r.Header.Get("Content-Encoding") == "gzip" {
		gzipReader, err := gzip.NewReader(r.Body)
		if err != nil {
			h.respondWithError(w, http.StatusBadRequest, "Failed to read gzipped data: "+err.Error())
			return
		}
		defer func() {
			if err := gzipReader.Close(); err != nil {
				h.logger.Error(err, "Failed to close gzip reader")
			}
		}()
		reader = gzipReader
	} else {
		reader = r.Body
	}

	// Parse request body
	var rawData map[string]interface{}
	if err := json.NewDecoder(reader).Decode(&rawData); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Extract agency data
	agencyData, ok := rawData["agency"].(map[string]interface{})
	if !ok {
		h.respondWithError(w, http.StatusBadRequest, "Invalid agency data format")
		return
	}

	agency := models.Agency{
		Name:     getString(agencyData, "name"),
		ID:       getInt(agencyData, "id"),
		Timezone: getString(agencyData, "timezone"),
	}

	// Extract alert data
	alertData, ok := rawData["alert"].(map[string]interface{})
	if !ok {
		h.respondWithError(w, http.StatusBadRequest, "Invalid alert data format")
		return
	}

	// Extract pagegroups
	var pageGroups []string
	if pg, pgOk := alertData["pagegroups"].([]interface{}); pgOk {
		for _, p := range pg {
			if str, strOk := p.(string); strOk {
				pageGroups = append(pageGroups, str)
			}
		}
	}

	// Extract normalized message
	normalizedMsg, ok := alertData["normalized_message"].(map[string]interface{})
	if !ok {
		normalizedMsg = make(map[string]interface{})
	}

	// Parse fields for AlertDetails
	alertID := getString(alertData, "id")
	if alertID == "" {
		alertID = fmt.Sprintf("A%d", time.Now().UnixNano())
	}

	// Extract coordinates
	lat, err := strconv.ParseFloat(getString(normalizedMsg, "lat"), 64)
	if err != nil && getString(normalizedMsg, "lat") != "" {
		h.logger.Error(err, "Failed to parse latitude")
		lat = 0
	}

	lon, err := strconv.ParseFloat(getString(normalizedMsg, "lon"), 64)
	if err != nil && getString(normalizedMsg, "lon") != "" {
		h.logger.Error(err, "Failed to parse longitude")
		lon = 0
	}

	// Extract timestamp
	stamp := getFloat(alertData, "stamp")

	// Create AlertDetails
	alertDetails := models.AlertDetails{
		ID:                alertID,
		City:              getStringPtr(normalizedMsg, "city"),
		CoordinateSource:  getStringPtr(normalizedMsg, "coordinate_source"),
		CrossStreet:       getStringPtr(normalizedMsg, "cross_street"),
		CustomIdentifiers: getStringPtr(normalizedMsg, "custom_identifiers"),
		Description:       getStringPtr(normalizedMsg, "description"),
		Details:           getStringPtr(normalizedMsg, "details"),
		DispatchCoords:    getStringPtr(normalizedMsg, "dispatch_coords"),
		Lat:               lat,
		Lon:               lon,
		MapAddress:        getStringPtr(normalizedMsg, "map_address"),
		MapCode:           getStringPtr(normalizedMsg, "map_code"),
		Place:             getStringPtr(normalizedMsg, "place"),
		Priority:          getStringPtr(normalizedMsg, "priority"),
		Received:          getStringPtr(normalizedMsg, "received"),
		Source:            getStringPtr(normalizedMsg, "source"),
		State:             getStringPtr(normalizedMsg, "state"),
		Unit:              getStringPtr(normalizedMsg, "unit"),
		Units:             getStringPtr(normalizedMsg, "units"),
		PageGroups:        pageGroups,
		Stamp:             stamp,
		Status:            "new", // Default status
	}

	// Create alert with proper structure
	alert := models.Alert{
		Agency: agency,
		Alert:  alertDetails,
	}

	// Validate required fields
	if alert.Agency.Name == "" {
		h.respondWithError(w, http.StatusBadRequest, "Missing required field: agency.name")
		return
	}

	// Create alert in database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	id, err := h.store.CreateAlert(ctx, alert)
	if err != nil {
		h.logger.Error(err, "Failed to create alert")
		h.respondWithError(w, http.StatusInternalServerError, "Failed to create alert: "+err.Error())
		return
	}

	// Update ID in case it was generated
	alert.Alert.ID = id

	// Broadcast the new alert event
	if h.eventEmitter != nil {
		h.eventEmitter("new_alert", alert)
		h.logger.Infof("Alert %s broadcasted to WebSocket clients", id)
	}

	h.respondWithJSON(w, http.StatusCreated, alert)
}

// GetAlert handles GET /alerts/{id} requests
func (h *Handler) GetAlert(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())

	// Get alert ID from URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Get alert from database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	alert, err := h.store.GetAlertByID(ctx, id)
	if err != nil {
		if err == storage.ErrNotFound {
			h.respondWithError(w, http.StatusNotFound, "Alert not found")
		} else {
			h.logger.Error(err, "Failed to retrieve alert")
			h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve alert")
		}
		return
	}

	// Redact sensitive information if not authenticated
	if !authInfo.Authenticated {
		auth.RedactAlertData(&alert, false)
		h.logger.Infof("Returning redacted alert %s (unauthenticated access)", id)
	}

	h.respondWithJSON(w, http.StatusOK, alert)
}

// DeleteAlert handles DELETE /alerts/{id} requests
func (h *Handler) DeleteAlert(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to delete alert")
		return
	}

	// Get alert ID from URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Delete alert from database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	err := h.store.DeleteAlert(ctx, id)
	if err != nil {
		if err == storage.ErrNotFound {
			h.respondWithError(w, http.StatusNotFound, "Alert not found")
		} else {
			h.logger.Error(err, "Failed to delete alert")
			h.respondWithError(w, http.StatusInternalServerError, "Failed to delete alert")
		}
		return
	}

	// Broadcast alert deletion event
	if h.eventEmitter != nil {
		deleteNotification := map[string]string{"id": id}
		h.eventEmitter("alert_deleted", deleteNotification)
		h.logger.Infof("Alert %s deletion broadcasted to WebSocket clients", id)
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "Alert deleted successfully",
	})
}

// GetLogs handles GET /logs requests
func (h *Handler) GetLogs(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to access logs")
		return
	}

	// Parse query parameters
	query := r.URL.Query()

	// Parse pagination parameters
	limit := parseIntParam(query.Get("limit"), 10)
	offset := parseIntParam(query.Get("offset"), 0)

	// Parse filtering parameters
	logType := query.Get("type")
	method := query.Get("method")
	path := query.Get("path")
	eventType := query.Get("event_type")
	clientID := query.Get("client_id")
	direction := query.Get("direction")

	// Parse time range parameters
	var startTime, endTime *time.Time
	if startTimeStr := query.Get("start_time"); startTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			startTime = &t
		}
	}
	if endTimeStr := query.Get("end_time"); endTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			endTime = &t
		}
	}

	// Parse sorting parameters
	sortField := query.Get("sort")
	if sortField == "" {
		sortField = "timestamp"
	}

	sortOrder := strings.ToLower(query.Get("order"))
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	// Build filter for query
	filter := storage.LogFilter{
		Type:      logType,
		Method:    method,
		Path:      path,
		EventType: eventType,
		ClientID:  clientID,
		Direction: direction,
		StartTime: startTime,
		EndTime:   endTime,
		Limit:     limit,
		Offset:    offset,
		SortField: sortField,
		SortOrder: sortOrder,
	}

	// Get logs from database (summary version without body and headers)
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logSummaries, total, err := h.store.GetLogsSummary(ctx, filter)
	if err != nil {
		h.logger.Error(err, "Failed to retrieve logs")
		h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve logs")
		return
	}

	// Calculate next/prev pagination offsets
	var nextOffset, prevOffset *int
	if offset+limit < total {
		next := offset + limit
		nextOffset = &next
	}
	if offset > 0 {
		prev := offset - limit
		if prev < 0 {
			prev = 0
		}
		prevOffset = &prev
	}

	// Build response
	response := models.PaginatedResponse{
		Data:   logSummaries,
		Count:  len(logSummaries),
		Total:  total,
		Limit:  limit,
		Offset: offset,
		Filters: map[string]interface{}{
			"type":       logType,
			"method":     method,
			"path":       path,
			"event_type": eventType,
			"client_id":  clientID,
			"direction":  direction,
			"start_time": startTime,
			"end_time":   endTime,
		},
		Sorting: map[string]string{
			"field": sortField,
			"order": sortOrder,
		},
		NextOffset: nextOffset,
		PrevOffset: prevOffset,
	}

	h.respondWithJSON(w, http.StatusOK, response)
}

// GetLogByID handles GET /logs/{id} requests
func (h *Handler) GetLogByID(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to access log details")
		return
	}

	// Get log ID from URL
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		h.respondWithError(w, http.StatusBadRequest, "Missing log ID")
		return
	}

	// Get log from database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	log, err := h.store.GetLogByID(ctx, id)
	if err != nil {
		if err == storage.ErrNotFound {
			h.respondWithError(w, http.StatusNotFound, "Log not found")
		} else {
			h.logger.Error(err, "Failed to retrieve log")
			h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve log")
		}
		return
	}

	// Build response
	response := models.APIResponse{
		Success: true,
		Data:    log,
	}

	h.respondWithJSON(w, http.StatusOK, response)
}

// Helper functions for responses

// respondWithError sends an error response
func (h *Handler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, models.APIResponse{
		Success: false,
		Error:   message,
	})
}

// respondWithJSON sends a JSON response
func (h *Handler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		h.logger.Error(err, "Failed to marshal response")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if _, err = w.Write(response); err != nil {
		h.logger.Error(err, "Failed to write response")
	}
}

// Helper functions for data extraction

func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
		// Try to convert to string
		return fmt.Sprintf("%v", val)
	}
	return ""
}

func getStringPtr(data map[string]interface{}, key string) *string {
	if val, ok := data[key]; ok && val != nil {
		str := fmt.Sprintf("%v", val)
		return &str
	}
	return nil
}

func getInt(data map[string]interface{}, key string) int {
	if val, ok := data[key]; ok {
		switch v := val.(type) {
		case int:
			return v
		case float64:
			return int(v)
		case string:
			i, err := strconv.Atoi(v)
			if err != nil {
				// Return 0 on error (but we don't need to log this as it's a normal conversion operation)
				return 0
			}
			return i
		}
	}
	return 0
}

func getFloat(data map[string]interface{}, key string) float64 {
	if val, ok := data[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		case string:
			f, err := strconv.ParseFloat(v, 64)
			if err != nil {
				// Return 0 on error (but we don't need to log this as it's a normal conversion operation)
				return 0
			}
			return f
		}
	}
	return 0
}

func parseIntParam(param string, defaultValue int) int {
	if param == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(param)
	if err != nil || value < 0 {
		return defaultValue
	}

	return value
}
