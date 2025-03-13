package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
)

// RequestLog represents a log entry of an API request - used only for in-memory processing
type RequestLog struct {
	ID        string          `json:"id"` // Unique request ID for correlation
	Method    string          `json:"method"`
	Path      string          `json:"path"`
	Body      json.RawMessage `json:"body"`
	Headers   json.RawMessage `json:"headers"`
	Timestamp time.Time       `json:"timestamp"`
	SourceIP  string          `json:"source_ip"`
}

// Agency represents the agency information in an alert
type Agency struct {
	Name     string `json:"name"`
	ID       int    `json:"id"`
	Timezone string `json:"timezone"`
}

// AlertDetails represents the detailed alert information
type AlertDetails struct {
	ID                string   `json:"id"`
	City              *string  `json:"city,omitempty"`
	CoordinateSource  *string  `json:"coordinate_source,omitempty"`
	CrossStreet       *string  `json:"cross_street,omitempty"`
	CustomIdentifiers *string  `json:"custom_identifiers,omitempty"`
	Description       *string  `json:"description,omitempty"`
	Details           *string  `json:"details,omitempty"`
	DispatchCoords    *string  `json:"dispatch_coords,omitempty"`
	Lat               float64  `json:"lat,omitempty"`
	Lon               float64  `json:"lon,omitempty"`
	MapAddress        *string  `json:"map_address,omitempty"`
	MapCode           *string  `json:"map_code,omitempty"`
	Place             *string  `json:"place,omitempty"`
	Priority          *string  `json:"priority,omitempty"`
	Received          *string  `json:"received,omitempty"`
	Source            *string  `json:"source,omitempty"`
	State             *string  `json:"state,omitempty"`
	Unit              *string  `json:"unit,omitempty"`
	Units             *string  `json:"units,omitempty"`
	PageGroups        []string `json:"pagegroups,omitempty"`
	Stamp             float64  `json:"stamp,omitempty"`
	Status            string   `json:"status,omitempty"` // Added for internal tracking
}

// Alert represents a complete alert in the system with agency information
type Alert struct {
	Agency Agency       `json:"agency"`
	Alert  AlertDetails `json:"alert"`
}

// Storage handles database operations
type Storage struct {
	db *sql.DB
}

// NewStorage creates a new storage instance
func NewStorage(db *sql.DB) *Storage {
	return &Storage{db: db}
}

// CreateAlert creates a new alert with the new schema
func (s *Storage) CreateAlert(ctx context.Context, alert Alert) (string, error) {
	query := `
		INSERT INTO alerts (
			id,
			agency_name,
			agency_id,
			agency_timezone,
			alert_city,
			alert_coordinate_source,
			alert_cross_street,
			alert_description,
			alert_details,
			alert_lat,
			alert_lon,
			alert_map_address,
			alert_map_code,
			alert_place,
			alert_priority,
			alert_received,
			alert_source,
			alert_state,
			alert_unit,
			alert_units,
			alert_pagegroups,
			alert_stamp,
			status
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
			$21, $22, $23
		)
		RETURNING id
	`

	// Convert pagegroups to JSON
	pageGroupsJSON, err := json.Marshal(alert.Alert.PageGroups)
	if err != nil {
		return "", fmt.Errorf("failed to marshal pagegroups: %w", err)
	}

	// Generate ID if not provided
	alertID := alert.Alert.ID
	if alertID == "" {
		alertID = fmt.Sprintf("A%d", time.Now().UnixNano())
	}

	err = s.db.QueryRowContext(
		ctx, query,
		alertID,
		alert.Agency.Name,
		alert.Agency.ID,
		alert.Agency.Timezone,
		alert.Alert.City,
		alert.Alert.CoordinateSource,
		alert.Alert.CrossStreet,
		alert.Alert.Description,
		alert.Alert.Details,
		alert.Alert.Lat,
		alert.Alert.Lon,
		alert.Alert.MapAddress,
		alert.Alert.MapCode,
		alert.Alert.Place,
		alert.Alert.Priority,
		alert.Alert.Received,
		alert.Alert.Source,
		alert.Alert.State,
		alert.Alert.Unit,
		alert.Alert.Units,
		pageGroupsJSON,
		alert.Alert.Stamp,
		alert.Alert.Status,
	).Scan(&alertID)

	if err != nil {
		return "", err
	}

	return alertID, nil
}

// GetAlerts retrieves alerts with optional filtering
func (s *Storage) GetAlerts(ctx context.Context, status string, limit int, offset int) ([]Alert, error) {
	var query string
	var args []interface{}

	baseQuery := `
		SELECT
			id,
			agency_name,
			agency_id,
			agency_timezone,
			alert_city,
			alert_coordinate_source,
			alert_cross_street,
			alert_description,
			alert_details,
			alert_lat,
			alert_lon,
			alert_map_address,
			alert_map_code,
			alert_place,
			alert_priority,
			alert_received,
			alert_source,
			alert_state,
			alert_unit,
			alert_units,
			alert_pagegroups,
			alert_stamp,
			status,
			created_at,
			updated_at
		FROM alerts
	`

	if status != "" {
		query = baseQuery + `
			WHERE status = $1
			ORDER BY updated_at DESC
			LIMIT $2 OFFSET $3
		`
		args = append(args, status, limit, offset)
	} else {
		query = baseQuery + `
			ORDER BY updated_at DESC
			LIMIT $1 OFFSET $2
		`
		args = append(args, limit, offset)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var alert Alert
		var pageGroupsJSON []byte
		var createdAt, updatedAt time.Time

		err := rows.Scan(
			&alert.Alert.ID,
			&alert.Agency.Name,
			&alert.Agency.ID,
			&alert.Agency.Timezone,
			&alert.Alert.City,
			&alert.Alert.CoordinateSource,
			&alert.Alert.CrossStreet,
			&alert.Alert.Description,
			&alert.Alert.Details,
			&alert.Alert.Lat,
			&alert.Alert.Lon,
			&alert.Alert.MapAddress,
			&alert.Alert.MapCode,
			&alert.Alert.Place,
			&alert.Alert.Priority,
			&alert.Alert.Received,
			&alert.Alert.Source,
			&alert.Alert.State,
			&alert.Alert.Unit,
			&alert.Alert.Units,
			&pageGroupsJSON,
			&alert.Alert.Stamp,
			&alert.Alert.Status,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse the page groups JSON
		if err := json.Unmarshal(pageGroupsJSON, &alert.Alert.PageGroups); err != nil {
			log.Error().Err(err).Str("alert_id", alert.Alert.ID).Msg("Failed to unmarshal page groups")
			alert.Alert.PageGroups = []string{} // Default to empty array
		}

		alerts = append(alerts, alert)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return alerts, nil
}

// GetAlertByID retrieves a single alert by ID
func (s *Storage) GetAlertByID(ctx context.Context, id string) (Alert, error) {
	query := `
		SELECT
			id,
			agency_name,
			agency_id,
			agency_timezone,
			alert_city,
			alert_coordinate_source,
			alert_cross_street,
			alert_description,
			alert_details,
			alert_lat,
			alert_lon,
			alert_map_address,
			alert_map_code,
			alert_place,
			alert_priority,
			alert_received,
			alert_source,
			alert_state,
			alert_unit,
			alert_units,
			alert_pagegroups,
			alert_stamp,
			status,
			created_at,
			updated_at
		FROM alerts
		WHERE id = $1
	`

	var alert Alert
	var pageGroupsJSON []byte
	var createdAt, updatedAt time.Time

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&alert.Alert.ID,
		&alert.Agency.Name,
		&alert.Agency.ID,
		&alert.Agency.Timezone,
		&alert.Alert.City,
		&alert.Alert.CoordinateSource,
		&alert.Alert.CrossStreet,
		&alert.Alert.Description,
		&alert.Alert.Details,
		&alert.Alert.Lat,
		&alert.Alert.Lon,
		&alert.Alert.MapAddress,
		&alert.Alert.MapCode,
		&alert.Alert.Place,
		&alert.Alert.Priority,
		&alert.Alert.Received,
		&alert.Alert.Source,
		&alert.Alert.State,
		&alert.Alert.Unit,
		&alert.Alert.Units,
		&pageGroupsJSON,
		&alert.Alert.Stamp,
		&alert.Alert.Status,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return Alert{}, ErrNotFound
		}
		return Alert{}, err
	}

	// Parse the page groups JSON
	if err := json.Unmarshal(pageGroupsJSON, &alert.Alert.PageGroups); err != nil {
		log.Error().Err(err).Str("alert_id", alert.Alert.ID).Msg("Failed to unmarshal page groups")
		alert.Alert.PageGroups = []string{} // Default to empty array
	}

	return alert, nil
}

// UpdateAlertStatus updates the status of an alert
func (s *Storage) UpdateAlertStatus(ctx context.Context, id string, status string) error {
	query := `
		UPDATE alerts
		SET status = $1
		WHERE id = $2
	`

	result, err := s.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// DeleteAlert deletes an alert by ID
func (s *Storage) DeleteAlert(ctx context.Context, id string) error {
	query := `
		DELETE FROM alerts
		WHERE id = $1
	`

	result, err := s.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// MigrateRequestLogs is now a no-op since we're only using file-based logging
func (s *Storage) MigrateRequestLogs(ctx context.Context, logs []RequestLog) error {
	// Since request logs are now only in the file, this method doesn't need to do anything
	log.Info().Msgf("Request logs are file-based, skipping database migration of %d logs", len(logs))
	return nil
}
