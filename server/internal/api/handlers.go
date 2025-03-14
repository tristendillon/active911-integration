package api

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/user/alerting/internal/storage"
	"github.com/user/alerting/internal/websocket"
)

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
			i, _ := strconv.Atoi(v)
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
			f, _ := strconv.ParseFloat(v, 64)
			return f
		}
	}
	return 0
}

// Handler contains the HTTP handlers for the API
type Handler struct {
	store *storage.Storage
	hub   *websocket.Hub
}

// NewHandler creates a new API handler
func NewHandler(store *storage.Storage, hub *websocket.Hub) *Handler {
	return &Handler{store: store, hub: hub}
}

// RegisterRoutes registers API routes on the router
func (h *Handler) RegisterRoutes(r *mux.Router) {
	// Alerts endpoints
	r.HandleFunc("/alerts", h.GetAlertsHandler).Methods("GET")
	r.HandleFunc("/alerts", h.CreateAlertHandler).Methods("POST")
	r.HandleFunc("/alerts/{id}", h.GetAlertHandler).Methods("GET")
	r.HandleFunc("/alerts/{id}", h.UpdateAlertHandler).Methods("PUT")
	r.HandleFunc("/alerts/{id}", h.DeleteAlertHandler).Methods("DELETE")

	r.HandleFunc("/logs", h.getLogsHandler).Methods("GET")
}

// GetAlertsHandler returns a list of alerts
func (h *Handler) GetAlertsHandler(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

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
		log.Error().Err(err).Msg("Failed to retrieve alerts")
		http.Error(w, "Failed to retrieve alerts", http.StatusInternalServerError)
		return
	}

	// Return alerts
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(alerts)
	if err != nil {
		log.Error().Err(err).Msg("Could not send GetAlertsHandler Response")
	}
}

// CreateAlertHandler creates a new alert
func (h *Handler) CreateAlertHandler(w http.ResponseWriter, r *http.Request) {
	// Check if the content is gzipped
	var reader io.Reader

	if r.Header.Get("Content-Encoding") == "gzip" {
		gzipReader, err := gzip.NewReader(r.Body)
		if err != nil {
			http.Error(w, "Failed to read gzipped data: "+err.Error(), http.StatusBadRequest)
			return
		}
		defer gzipReader.Close()
		reader = gzipReader
	} else {
		reader = r.Body
	}

	// Parse request body as raw map to handle the nested structure
	var rawData map[string]interface{}
	if err := json.NewDecoder(reader).Decode(&rawData); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Extract agency data
	agencyData, ok := rawData["agency"].(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid agency data format", http.StatusBadRequest)
		return
	}

	agency := storage.Agency{
		Name:     getString(agencyData, "name"),
		ID:       getInt(agencyData, "id"),
		Timezone: getString(agencyData, "timezone"),
	}

	// Extract alert data
	alertData, ok := rawData["alert"].(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid alert data format", http.StatusBadRequest)
		return
	}

	// Extract pagegroups
	var pageGroups []string
	if pg, ok := alertData["pagegroups"].([]interface{}); ok {
		for _, p := range pg {
			if str, ok := p.(string); ok {
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
	lat, _ := strconv.ParseFloat(getString(normalizedMsg, "lat"), 64)
	lon, _ := strconv.ParseFloat(getString(normalizedMsg, "lon"), 64)

	// Extract timestamp
	stamp := getFloat(alertData, "stamp")

	// Create AlertDetails
	alertDetails := storage.AlertDetails{
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
	alert := storage.Alert{
		Agency: agency,
		Alert:  alertDetails,
	}

	// Validate required fields
	if alert.Agency.Name == "" {
		http.Error(w, "Missing required field: agency.name", http.StatusBadRequest)
		return
	}

	// Create alert in database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	id, err := h.store.CreateAlert(ctx, alert)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create alert")
		http.Error(w, "Failed to create alert: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update ID in case it was generated by the database
	alert.Alert.ID = id

	// Broadcast alert to all connected WebSocket clients
	if h.hub != nil {
		// Get the request ID from context
		requestID := r.Context().Value("requestID")
		if requestID == nil {
			requestID = "unknown"
		}

		alertJSON, _ := json.Marshal(map[string]interface{}{
			"type":    "new_alert",
			"content": alert,
			"id":      requestID,
			"time":    time.Now(),
		})
		h.hub.Broadcast(alertJSON)
		log.Info().Str("alert_id", id).Str("request_id", fmt.Sprintf("%v", requestID)).Msg("Alert broadcasted to WebSocket clients")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	err = json.NewEncoder(w).Encode(alert)
	if err != nil {
		log.Error().Err(err).Msg("Could not send CreateAlertHandler Response")
	}
}

// GetAlertHandler returns a single alert by ID
func (h *Handler) GetAlertHandler(w http.ResponseWriter, r *http.Request) {
	// Get alert ID from URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Get alert from database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	alert, err := h.store.GetAlertByID(ctx, id)
	if err != nil {
		if err == storage.ErrNotFound {
			http.Error(w, "Alert not found", http.StatusNotFound)
		} else {
			log.Error().Err(err).Str("id", id).Msg("Failed to retrieve alert")
			http.Error(w, "Failed to retrieve alert", http.StatusInternalServerError)
		}
		return
	}

	// Return alert
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(alert)
	if err != nil {
		log.Error().Err(err).Msg("Could not send GetAlertHandler Response")
	}
}

func (h *Handler) getLogsHandler(w http.ResponseWriter, r *http.Request) {
	// Set content type
	w.Header().Set("Content-Type", "application/json")

	// Open the log file
	logFile, err := os.Open("request.log")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		err = json.NewEncoder(w).Encode(map[string]string{"error": "Failed to open log file: " + err.Error()})
		if err != nil {
			log.Error().Err(err).Msg("Could not send Response")
		}
		return
	}
	defer logFile.Close()

	// Read the file contents
	logData, err := io.ReadAll(logFile)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		err = json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read log file: " + err.Error()})
		if err != nil {
			log.Error().Err(err).Msg("Could not send Response")
		}
		return
	}

	// Split the log file into lines
	logLines := strings.Split(string(logData), "\n")

	// Parse each log line into a JSON object
	var logs []map[string]interface{}
	for _, line := range logLines {
		if line == "" {
			continue
		}

		var logEntry map[string]interface{}
		if err := json.Unmarshal([]byte(line), &logEntry); err != nil {
			// If parsing fails, store as raw string
			logEntry = map[string]interface{}{"raw": line}
		}

		logs = append(logs, logEntry)
	}

	// Return logs as JSON
	response := map[string]interface{}{
		"logs":  logs,
		"count": len(logs),
	}

	// Write the response
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		log.Error().Err(err).Msg("Could not send GetLogsHandler Response")
	}
}

// UpdateAlertHandler updates an alert's status
func (h *Handler) UpdateAlertHandler(w http.ResponseWriter, r *http.Request) {
	// Get alert ID from URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Parse request body
	var updateData struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate status
	if updateData.Status == "" {
		http.Error(w, "Status is required", http.StatusBadRequest)
		return
	}

	// Allow only specific status values
	validStatuses := map[string]bool{
		"new":          true,
		"acknowledged": true,
		"resolved":     true,
		"closed":       true,
	}
	if !validStatuses[updateData.Status] {
		http.Error(w, "Invalid status value. Must be one of: new, acknowledged, resolved, closed", http.StatusBadRequest)
		return
	}

	// Update alert in database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	err := h.store.UpdateAlertStatus(ctx, id, updateData.Status)
	if err != nil {
		if err == storage.ErrNotFound {
			http.Error(w, "Alert not found", http.StatusNotFound)
		} else {
			log.Error().Err(err).Str("id", id).Msg("Failed to update alert")
			http.Error(w, "Failed to update alert", http.StatusInternalServerError)
		}
		return
	}

	// Get updated alert
	alert, err := h.store.GetAlertByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to retrieve updated alert")
		http.Error(w, "Alert updated but failed to retrieve", http.StatusInternalServerError)
		return
	}

	// Broadcast status update to all connected WebSocket clients
	if h.hub != nil {
		// Get the request ID from context
		requestID := r.Context().Value("requestID")
		if requestID == nil {
			requestID = "unknown"
		}

		updateJSON, _ := json.Marshal(map[string]interface{}{
			"type":    "alert_updated",
			"content": alert,
			"id":      requestID,
			"time":    time.Now(),
		})
		h.hub.Broadcast(updateJSON)
		log.Info().Str("alert_id", id).Str("request_id", fmt.Sprintf("%v", requestID)).Msg("Alert update broadcasted to WebSocket clients")
	}

	// Return updated alert
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(alert)
	if err != nil {
		log.Error().Err(err).Msg("Could not send UpdateAlertHandler Response")
	}
}

// DeleteAlertHandler deletes an alert
func (h *Handler) DeleteAlertHandler(w http.ResponseWriter, r *http.Request) {
	// Get alert ID from URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Delete alert from database
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	err := h.store.DeleteAlert(ctx, id)
	if err != nil {
		if err == storage.ErrNotFound {
			http.Error(w, "Alert not found", http.StatusNotFound)
		} else {
			log.Error().Err(err).Str("id", id).Msg("Failed to delete alert")
			http.Error(w, "Failed to delete alert", http.StatusInternalServerError)
		}
		return
	}

	// Broadcast deletion to all connected WebSocket clients
	if h.hub != nil {
		// Get the request ID from context
		requestID := r.Context().Value("requestID")
		if requestID == nil {
			requestID = "unknown"
		}

		deleteJSON, _ := json.Marshal(map[string]interface{}{
			"type":    "alert_deleted",
			"content": map[string]string{"id": id},
			"id":      requestID,
			"time":    time.Now(),
		})
		h.hub.Broadcast(deleteJSON)
		log.Info().Str("alert_id", id).Str("request_id", fmt.Sprintf("%v", requestID)).Msg("Alert deletion broadcasted to WebSocket clients")
	}

	// Return success message
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Alert deleted successfully",
	})

	if err != nil {
		log.Error().Err(err).Msg("Could not send DeleteAlertHandler Response")
	}
}
