package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/user/alerting/server/internal/auth"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
	"github.com/user/alerting/server/internal/storage"
	"github.com/user/alerting/server/internal/websocket"
)

// HydrantHandler handles API requests for hydrants
type HydrantHandler struct {
	store        *storage.Storage
	logger       *logging.Logger
	hub          *websocket.Hub
	batchMutex   sync.Mutex
	activeUpload *models.HydrantBatchUploadProgress
}

// NewHydrantHandler creates a new hydrant handler
func NewHydrantHandler(store *storage.Storage, logger *logging.Logger, hub *websocket.Hub) *HydrantHandler {
	return &HydrantHandler{
		store:        store,
		logger:       logger,
		hub:          hub,
		activeUpload: nil,
	}
}

// RegisterRoutes registers API routes for hydrants
func (h *HydrantHandler) RegisterRoutes(r *mux.Router) {
	hydrantRouter := r.PathPrefix("/hydrants").Subrouter()

	// GET routes
	hydrantRouter.HandleFunc("", h.GetHydrants).Methods("GET")
	hydrantRouter.HandleFunc("/status", h.GetUploadStatus).Methods("GET")
	hydrantRouter.HandleFunc("/{id}", h.GetHydrant).Methods("GET")

	// POST routes
	hydrantRouter.HandleFunc("", h.UploadHydrants).Methods("POST")
	hydrantRouter.HandleFunc("/single", h.CreateHydrant).Methods("POST")

	// DELETE routes
	hydrantRouter.HandleFunc("/all", h.DeleteAllHydrants).Methods("DELETE")
}

// GetHydrants handles GET /hydrants requests with bounds parameters
func (h *HydrantHandler) GetHydrants(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters for bounds
	northLatStr := r.URL.Query().Get("north_lat")
	southLatStr := r.URL.Query().Get("south_lat")
	eastLngStr := r.URL.Query().Get("east_lng")
	westLngStr := r.URL.Query().Get("west_lng")

	// Validate bounds parameters
	if northLatStr == "" || southLatStr == "" || eastLngStr == "" || westLngStr == "" {
		h.respondWithError(w, http.StatusBadRequest, "Missing required bounds parameters (north_lat, south_lat, east_lng, west_lng)")
		return
	}

	// Parse lat/lng values
	northLat, err := strconv.ParseFloat(northLatStr, 64)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid north_lat parameter")
		return
	}

	southLat, err := strconv.ParseFloat(southLatStr, 64)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid south_lat parameter")
		return
	}

	eastLng, err := strconv.ParseFloat(eastLngStr, 64)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid east_lng parameter")
		return
	}

	westLng, err := strconv.ParseFloat(westLngStr, 64)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid west_lng parameter")
		return
	}

	// Create bounds query
	bounds := models.HydrantBoundsQuery{
		NorthLat: northLat,
		SouthLat: southLat,
		EastLng:  eastLng,
		WestLng:  westLng,
	}

	// Get hydrants within bounds
	hydrants, err := h.store.GetHydrantsByBounds(r.Context(), bounds)
	if err != nil {
		h.logger.Error(err, "Failed to retrieve hydrants")
		h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve hydrants")
		return
	}

	// Return hydrants
	h.respondWithJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    hydrants,
		Meta: map[string]interface{}{
			"count":  len(hydrants),
			"bounds": bounds,
		},
	})
}

// GetHydrant handles GET /hydrants/{id} requests
func (h *HydrantHandler) GetHydrant(w http.ResponseWriter, r *http.Request) {
	// Get hydrant ID from URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Get hydrant by ID
	hydrant, err := h.store.GetHydrantByID(r.Context(), id)
	if err != nil {
		if err == storage.ErrNotFound {
			h.respondWithError(w, http.StatusNotFound, "Hydrant not found")
		} else {
			h.logger.Error(err, "Failed to retrieve hydrant")
			h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve hydrant")
		}
		return
	}

	// Return hydrant
	h.respondWithJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    hydrant,
	})
}

// CreateHydrant handles POST /hydrants/single requests
func (h *HydrantHandler) CreateHydrant(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to create hydrant")
		return
	}

	// Parse request body
	var hydrant models.Hydrant
	if err := json.NewDecoder(r.Body).Decode(&hydrant); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required fields
	if hydrant.Lat == 0 && hydrant.Lng == 0 {
		h.respondWithError(w, http.StatusBadRequest, "Missing required fields: lat and lng")
		return
	}

	// Save hydrant
	id, err := h.store.SaveHydrant(r.Context(), hydrant)
	if err != nil {
		h.logger.Error(err, "Failed to save hydrant")
		h.respondWithError(w, http.StatusInternalServerError, "Failed to save hydrant: "+err.Error())
		return
	}

	// Update ID in case it was generated
	hydrant.ID = id

	// Return response
	h.respondWithJSON(w, http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    hydrant,
	})
}

// UploadHydrants handles POST /hydrants requests for batch upload
func (h *HydrantHandler) UploadHydrants(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to upload hydrants")
		return
	}

	// Check if there's already an active upload
	h.batchMutex.Lock()
	if h.activeUpload != nil && h.activeUpload.InProgress {
		h.batchMutex.Unlock()
		h.respondWithError(w, http.StatusConflict, "Another batch upload is already in progress")
		return
	}

	// Create a new upload progress tracker
	batchID := uuid.New().String()
	h.activeUpload = &models.HydrantBatchUploadProgress{
		InProgress: true,
		Progress:   0,
	}
	h.batchMutex.Unlock()

	// Parse request body
	var hydrants []models.Hydrant
	if err := json.NewDecoder(r.Body).Decode(&hydrants); err != nil {
		h.batchMutex.Lock()
		h.activeUpload = nil
		h.batchMutex.Unlock()
		h.respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Check if we received any hydrants
	if len(hydrants) == 0 {
		h.batchMutex.Lock()
		h.activeUpload = nil
		h.batchMutex.Unlock()
		h.respondWithError(w, http.StatusBadRequest, "No hydrants provided")
		return
	}

	// Start processing the batch in a goroutine and return immediately
	go func() {
		progressCallback := func(progress models.HydrantBatchUploadProgress) {
			// Update the current progress
			h.batchMutex.Lock()
			h.activeUpload = &progress
			h.batchMutex.Unlock()
		}

		// Process the batch
		h.logger.Infof("Starting batch upload of %d hydrants", len(hydrants))
		_, err := h.store.SaveManyHydrants(context.Background(), hydrants, progressCallback)
		if err != nil {
			h.logger.Error(err, "Failed to process hydrant batch")
			// Update progress with error
			finalProgress := models.HydrantBatchUploadProgress{
				Total:      len(hydrants),
				Processed:  len(hydrants),
				Successful: 0,
				Failed:     len(hydrants),
				Progress:   100.0,
				InProgress: false,
				FailedItems: []struct {
					Index int    `json:"index"`
					Error string `json:"error"`
				}{
					{
						Index: 0,
						Error: err.Error(),
					},
				},
			}
			progressCallback(finalProgress)
		}

		h.logger.Info("Batch upload completed")
	}()

	// Return immediate response with batch ID
	h.respondWithJSON(w, http.StatusAccepted, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"batch_id": batchID,
			"message":  "Batch upload started",
		},
	})
}

// GetUploadStatus handles GET /hydrants/status requests
func (h *HydrantHandler) GetUploadStatus(w http.ResponseWriter, r *http.Request) {
	h.batchMutex.Lock()
	progress := h.activeUpload
	h.batchMutex.Unlock()

	if progress == nil {
		// No upload has been started yet
		h.respondWithJSON(w, http.StatusOK, models.APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"in_progress": false,
			},
		})
		return
	}

	// Return current progress
	h.respondWithJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    progress,
	})
}

// DeleteAllHydrants handles DELETE /hydrants/all requests
func (h *HydrantHandler) DeleteAllHydrants(w http.ResponseWriter, r *http.Request) {
	// Get authentication info from context
	authInfo, _ := auth.GetAuthInfoFromContext(r.Context())
	if !authInfo.Authenticated {
		h.respondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid API password")
		h.logger.Warn("Unauthorized attempt to delete all hydrants")
		return
	}

	// Check if there's an active upload
	h.batchMutex.Lock()
	if h.activeUpload != nil && h.activeUpload.InProgress {
		h.batchMutex.Unlock()
		h.respondWithError(w, http.StatusConflict, "Cannot delete hydrants while a batch upload is in progress")
		return
	}
	h.batchMutex.Unlock()

	// Delete all hydrants
	count, err := h.store.DeleteAllHydrants(r.Context())
	if err != nil {
		h.logger.Error(err, "Failed to delete all hydrants")
		h.respondWithError(w, http.StatusInternalServerError, "Failed to delete all hydrants: "+err.Error())
		return
	}

	// Broadcast event to websocket clients
	deleteEvent := map[string]interface{}{
		"count":     count,
		"timestamp": time.Now().Unix(),
	}
	h.hub.BroadcastEvent("hydrants_deleted", deleteEvent)

	// Return response
	h.respondWithJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"count":   count,
			"message": fmt.Sprintf("Successfully deleted %d hydrants", count),
		},
	})
}

// respondWithError sends an error response
func (h *HydrantHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, models.APIResponse{
		Success: false,
		Error:   message,
	})
}

// respondWithJSON sends a JSON response
func (h *HydrantHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
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
