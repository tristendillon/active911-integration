package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
	"github.com/user/alerting/server/internal/weather"
)

// WeatherHandler handles weather-related HTTP requests
type WeatherHandler struct {
	weatherService *weather.Service
	logger         *logging.Logger
}

// NewWeatherHandler creates a new weather handler
func NewWeatherHandler(weatherService *weather.Service) *WeatherHandler {
	return &WeatherHandler{
		weatherService: weatherService,
	}
}

// RegisterRoutes registers weather routes
func (h *WeatherHandler) RegisterRoutes(r *mux.Router) {
	// Create a subrouter for weather routes
	weatherRouter := r.PathPrefix("/weather").Subrouter()
	// Register routes
	weatherRouter.HandleFunc("", h.GetWeather).Methods("GET")
}

// GetWeather returns the current weather data
func (h *WeatherHandler) GetWeather(w http.ResponseWriter, r *http.Request) {
	weather := h.weatherService.GetCurrentWeather()

	if weather == nil {
		h.respondWithJSON(w, http.StatusOK, models.APIResponse{
			Success: true,
			Data:    nil,
			Meta:    map[string]any{"message": "No weather data available"},
		})
		return
	}

	h.respondWithJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    weather,
	})
}

// respondWithJSON sends a JSON response
func (h *WeatherHandler) respondWithJSON(w http.ResponseWriter, code int, payload any) {
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
