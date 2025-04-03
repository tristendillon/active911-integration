package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/user/alerting/server/internal/models"
)

// InitWeatherTable initializes the weather table if it doesn't exist
func (s *Storage) InitWeatherTable() error {
	// Create weather table if it doesn't exist
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS weather (
		id TEXT PRIMARY KEY,
		lat DOUBLE PRECISION NOT NULL,
		lon DOUBLE PRECISION NOT NULL,
		data JSONB NOT NULL,
		last_updated TIMESTAMP NOT NULL
	);
	CREATE INDEX IF NOT EXISTS weather_last_updated_idx ON weather(last_updated);
	`

	_, err := s.db.ExecContext(context.Background(), createTableSQL)
	return err
}

// SaveWeather stores a weather record in the database
func (s *Storage) SaveWeather(weather *models.Weather) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Convert weather to JSON
	weatherJSON, err := json.Marshal(weather)
	if err != nil {
		return err
	}

	// Insert or update the weather record
	query := `
	INSERT INTO weather (id, lat, lon, data, last_updated)
	VALUES ($1, $2, $3, $4, NOW())
	ON CONFLICT (id) DO UPDATE
	SET data = $4, last_updated = NOW(), lat = $2, lon = $3
	`

	_, err = s.db.ExecContext(ctx, query, weather.ID, weather.Latitude, weather.Longitude, weatherJSON)
	return err
}

// GetLatestWeather retrieves the most recent weather data
func (s *Storage) GetLatestWeather() (*models.Weather, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
	SELECT data FROM weather
	ORDER BY last_updated DESC
	LIMIT 1
	`

	var weatherJSON []byte
	err := s.db.QueryRowContext(ctx, query).Scan(&weatherJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No weather data found
		}
		return nil, err
	}

	// Unmarshal weather data
	var weather models.Weather
	if err := json.Unmarshal(weatherJSON, &weather); err != nil {
		return nil, err
	}

	return &weather, nil
}
