package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/alerting/server/internal/config"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
	"github.com/user/alerting/server/internal/storage"
	"github.com/user/alerting/server/internal/websocket"
)

// Service handles weather data fetching, storage, and broadcasting
type Service struct {
	cfg            *config.Config
	hub            *websocket.Hub
	logger         *logging.Logger
	storage        *storage.Storage
	mutex          sync.RWMutex
	currentWeather *models.Weather
	shutdownCh     chan struct{}
	done           chan struct{}
}

// NewService creates a new weather service
func NewService(cfg *config.Config, hub *websocket.Hub, logger *logging.Logger, storage *storage.Storage) *Service {
	return &Service{
		cfg:        cfg,
		hub:        hub,
		logger:     logger,
		storage:    storage,
		shutdownCh: make(chan struct{}),
		done:       make(chan struct{}),
	}
}

// Start begins the weather service, fetching data at regular intervals
func (s *Service) Start() {
	s.logger.Info("Starting weather service")

	// Do an initial fetch
	s.fetchAndBroadcastWeather()

	// Set up ticker for periodic fetches (every 30 minutes)
	ticker := time.NewTicker(30 * time.Minute)

	go func() {
		defer close(s.done)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				s.fetchAndBroadcastWeather()
			case <-s.shutdownCh:
				s.logger.Info("Weather service shutting down")
				return
			}
		}
	}()
}

// Stop gracefully shuts down the weather service
func (s *Service) Stop() {
	s.logger.Info("Stopping weather service")
	close(s.shutdownCh)
	<-s.done
}

// GetAPIUrl builds the URL for the Visual Crossing weather API
func (s *Service) GetAPIUrl(lat, lng float64) string {
	today := time.Now().UTC()
	endDate := today.AddDate(0, 0, 3)

	formattedToday := today.Format("2006-01-02")
	formattedEndDate := endDate.Format("2006-01-02")

	apiKey := os.Getenv("WEATHER_API_KEY")
	if apiKey == "" {
		s.logger.Error(fmt.Errorf("WEATHER_API_KEY environment variable not set"), "WEATHER_API_KEY environment variable not set")
		return ""
	}

	return fmt.Sprintf(
		"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/%f,%f/%s/%s?unitGroup=us&elements=datetime,tempmax,tempmin,temp,humidity,precipprob,windspeed,winddir,conditions,description,icon&key=%s&contentType=json",
		lat, lng, formattedToday, formattedEndDate, apiKey,
	)
}

// fetchAndBroadcastWeather fetches weather data and broadcasts it to clients
func (s *Service) fetchAndBroadcastWeather() {
	s.logger.Info("Fetching weather data")

	// TODO: Replace with actual station coordinates or make configurable
	lat := 39.192838630478995
	lng := -96.60012287125629

	apiURL := s.GetAPIUrl(lat, lng)
	if apiURL == "" {
		s.logger.Error(fmt.Errorf("Failed to construct API URL"), "Failed to construct API URL")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		s.logger.Error(err, "Failed to create request")
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.logger.Error(err, "Failed to fetch weather data")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.logger.Error(fmt.Errorf("Weather API returned non-OK status: %d", resp.StatusCode), "Weather API returned non-OK status")
		return
	}

	var weather models.Weather
	if err := json.NewDecoder(resp.Body).Decode(&weather); err != nil {
		s.logger.Error(err, "Failed to decode weather data")
		return
	}

	// Add an ID and last updated timestamp
	weather.ID = uuid.New().String()
	weather.LastUpdated = time.Now().Unix()

	// Store in memory
	s.mutex.Lock()
	s.currentWeather = &weather
	s.mutex.Unlock()

	// Store in database
	if err := s.storeWeatherData(&weather); err != nil {
		s.logger.Error(err, "Failed to store weather data")
	}

	// Broadcast to clients
	s.hub.BroadcastEvent("weather_update", &weather)
	s.logger.Info("Weather data updated and broadcast to clients")
}

// storeWeatherData stores weather data in the database
func (s *Service) storeWeatherData(weather *models.Weather) error {
	// Store in a separate routine to not block the main flow
	go func() {
		if err := s.storage.SaveWeather(weather); err != nil {
			s.logger.Error(err, "Failed to save weather data to database")
		} else {
			s.logger.Infof("Weather data saved to database with ID: %s", weather.ID)
		}
	}()

	return nil
}

// GetCurrentWeather returns the current weather data
func (s *Service) GetCurrentWeather() *models.Weather {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.currentWeather
}
