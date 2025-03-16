package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/user/alerting/server/internal/models"
)

// Storage handles database operations
type Storage struct {
	db     *sql.DB
	logger zerolog.Logger
}

// NewStorage creates a new storage instance
func NewStorage(db *sql.DB) *Storage {
	return &Storage{
		db:     db,
		logger: log.Logger,
	}
}

// EnsureSchema ensures that the database schema exists
func (s *Storage) EnsureSchema(ctx context.Context) error {
	s.logger.Info().Msg("Checking database schema...")

	// Create extensions
	_, err := s.db.ExecContext(ctx, "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
	if err != nil {
		return fmt.Errorf("failed to create UUID extension: %w", err)
	}

	// Check if tables exist
	alertsExists, logsExists, err := s.checkTablesExist(ctx)
	if err != nil {
		return err
	}

	// Create alerts table if it doesn't exist
	if !alertsExists {
		s.logger.Info().Msg("Creating alerts table...")
		if err := s.createAlertsTable(ctx); err != nil {
			return err
		}
	}

	// Create logs table if it doesn't exist
	if !logsExists {
		s.logger.Info().Msg("Creating logs table...")
		if err := s.createLogsTable(ctx); err != nil {
			return err
		}
	}

	s.logger.Info().Msg("Database schema is ready")
	return nil
}

// checkTablesExist checks if the required tables exist
func (s *Storage) checkTablesExist(ctx context.Context) (bool, bool, error) {
	var alertsExists, logsExists bool

	// Check alerts table
	err := s.db.QueryRowContext(ctx,
		"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts')").
		Scan(&alertsExists)
	if err != nil {
		return false, false, fmt.Errorf("failed to check if alerts table exists: %w", err)
	}

	// Check logs table
	err = s.db.QueryRowContext(ctx,
		"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'logs')").
		Scan(&logsExists)
	if err != nil {
		return false, false, fmt.Errorf("failed to check if logs table exists: %w", err)
	}

	return alertsExists, logsExists, nil
}

// createAlertsTable creates the alerts table
func (s *Storage) createAlertsTable(ctx context.Context) error {
	// SQL to create alerts table
	sql := `
	CREATE TABLE IF NOT EXISTS alerts (
		id VARCHAR(255) PRIMARY KEY,
		agency_name VARCHAR(255) NOT NULL,
		agency_id INTEGER NOT NULL,
		agency_timezone VARCHAR(50) NOT NULL,
		alert_city VARCHAR(255),
		alert_coordinate_source VARCHAR(100),
		alert_cross_street TEXT,
		alert_description TEXT,
		alert_details TEXT,
		alert_lat FLOAT,
		alert_lon FLOAT,
		alert_map_address TEXT,
		alert_map_code VARCHAR(255),
		alert_place VARCHAR(255),
		alert_priority VARCHAR(50),
		alert_received VARCHAR(50),
		alert_source VARCHAR(100),
		alert_state VARCHAR(50),
		alert_unit VARCHAR(50),
		alert_units VARCHAR(255),
		alert_pagegroups JSONB, -- Store as JSON array
		alert_stamp FLOAT,
		status VARCHAR(50) NOT NULL DEFAULT 'new',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	-- Create index on alert status for faster queries
	CREATE INDEX alerts_status_idx ON alerts (status);
	CREATE INDEX alerts_agency_id_idx ON alerts (agency_id);
	CREATE INDEX alerts_received_idx ON alerts (alert_received);
	CREATE INDEX alerts_state_city_idx ON alerts (alert_state, alert_city);

	-- Create function to update updated_at column
	CREATE OR REPLACE FUNCTION update_updated_at_column()
	RETURNS TRIGGER AS $$
	BEGIN
		NEW.updated_at = NOW();
		RETURN NEW;
	END;
	$$ language 'plpgsql';

	-- Create trigger to update updated_at timestamp on alerts table
	CREATE TRIGGER update_alerts_updated_at
	BEFORE UPDATE ON alerts
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();
	`

	_, err := s.db.ExecContext(ctx, sql)
	if err != nil {
		return fmt.Errorf("failed to create alerts table: %w", err)
	}

	return nil
}

// createLogsTable creates the logs table
func (s *Storage) createLogsTable(ctx context.Context) error {
	// SQL to create logs table
	sql := `
	CREATE TABLE IF NOT EXISTS logs (
		id VARCHAR(255) PRIMARY KEY,
		type VARCHAR(50) NOT NULL,
		method VARCHAR(20) NOT NULL,
		path TEXT NOT NULL,
		body JSONB,
		headers JSONB,
		timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
		source_ip VARCHAR(50),
		client_id VARCHAR(255),
		event_type VARCHAR(50),
		direction VARCHAR(20),
		duration INTEGER,
		status_code INTEGER,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	-- Create indexes for faster queries
	CREATE INDEX logs_timestamp_idx ON logs (timestamp DESC);
	CREATE INDEX logs_type_idx ON logs (type);
	CREATE INDEX logs_method_idx ON logs (method);
	CREATE INDEX logs_event_type_idx ON logs (event_type);
	CREATE INDEX logs_client_id_idx ON logs (client_id);
	`

	_, err := s.db.ExecContext(ctx, sql)
	if err != nil {
		return fmt.Errorf("failed to create logs table: %w", err)
	}

	return nil
}

// CreateAlert creates a new alert with the new schema
func (s *Storage) CreateAlert(ctx context.Context, alert models.Alert) (string, error) {
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
func (s *Storage) GetAlerts(ctx context.Context, status string, limit int, offset int) ([]models.Alert, error) {
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
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			s.logger.Error().Err(closeErr).Msg("Error closing rows")
		}
	}()

	var alerts []models.Alert
	for rows.Next() {
		var alert models.Alert
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
func (s *Storage) GetAlertByID(ctx context.Context, id string) (models.Alert, error) {
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

	var alert models.Alert
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
			return models.Alert{}, ErrNotFound
		}
		return models.Alert{}, err
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

// SaveLog saves a log entry to the database
func (s *Storage) SaveLog(ctx context.Context, log models.LogEntry) error {
	query := `
		INSERT INTO logs (
			id,
			type,
			method,
			path,
			body,
			headers,
			timestamp,
			source_ip,
			client_id,
			event_type,
			direction,
			duration,
			status_code
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	// Debug logging for the inputs
	logger := zerolog.Ctx(ctx)
	if logger == nil {
		logger = &zerolog.Logger{}
	}

	logger.Debug().
		Str("id", log.ID).
		Str("type", log.Type).
		Str("method", log.Method).
		Str("path", log.Path).
		Str("source_ip", log.SourceIP).
		Str("client_id", log.ClientID).
		Str("event_type", log.EventType).
		Str("direction", log.Direction).
		Time("timestamp", log.Timestamp).
		Msg("Saving log entry with details")

	result, err := s.db.ExecContext(
		ctx,
		query,
		log.ID,
		log.Type,
		log.Method,
		log.Path,
		log.Body,
		log.Headers,
		log.Timestamp,
		log.SourceIP,
		log.ClientID,
		log.EventType,
		log.Direction,
		log.Duration,
		log.StatusCode,
	)

	if err != nil {
		logger.Error().
			Err(err).
			Str("id", log.ID).
			Str("type", log.Type).
			Str("method", log.Method).
			Str("path", log.Path).
			Msg("Database error when saving log entry")
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		s.logger.Error().Err(err).Msg("Error getting rows affected")
	}
	logger.Debug().
		Str("id", log.ID).
		Str("type", log.Type).
		Str("method", log.Method).
		Int64("rows_affected", rowsAffected).
		Msg("Log entry database operation complete")

	return nil
}

// GetLogs retrieves logs with pagination
func (s *Storage) GetLogs(ctx context.Context, limit, offset int) ([]models.LogEntry, error) {
	query := `
		SELECT id, type, method, path, body, headers, timestamp, source_ip, client_id, event_type, direction, duration, status_code
		FROM logs
		ORDER BY timestamp DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := s.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			s.logger.Error().Err(closeErr).Msg("Error closing rows")
		}
	}()

	var logs []models.LogEntry
	for rows.Next() {
		var log models.LogEntry
		err := rows.Scan(
			&log.ID,
			&log.Type,
			&log.Method,
			&log.Path,
			&log.Body,
			&log.Headers,
			&log.Timestamp,
			&log.SourceIP,
			&log.ClientID,
			&log.EventType,
			&log.Direction,
			&log.Duration,
			&log.StatusCode,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return logs, nil
}

// CountAlerts counts alerts with optional filtering
func (s *Storage) CountAlerts(ctx context.Context, status string) (int, error) {
	var query string
	var args []interface{}

	if status != "" {
		query = "SELECT COUNT(*) FROM alerts WHERE status = $1"
		args = append(args, status)
	} else {
		query = "SELECT COUNT(*) FROM alerts"
	}

	var count int
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	return count, nil
}

// LogFilter contains filtering and pagination parameters for logs
type LogFilter struct {
	Type      string
	Method    string
	Path      string
	EventType string
	ClientID  string
	Direction string
	StartTime *time.Time
	EndTime   *time.Time
	Limit     int
	Offset    int
	SortField string
	SortOrder string
}

// GetLogsSummary retrieves logs with pagination, filtering, and sorting (excludes body and headers)
func (s *Storage) GetLogsSummary(ctx context.Context, params LogFilter) ([]models.LogEntrySummary, int, error) {
	// Build query with filters
	baseQuery := `
		SELECT
			id,
			type,
			method,
			path,
			timestamp,
			source_ip,
			client_id,
			event_type,
			direction,
			duration,
			status_code
		FROM logs
	`

	countQuery := `SELECT COUNT(*) FROM logs`

	// Build WHERE clause
	whereClause, args := s.buildLogFilterWhereClause(params)
	if whereClause != "" {
		baseQuery += " WHERE " + whereClause
		countQuery += " WHERE " + whereClause
	}

	// Add ORDER BY clause
	orderClause := s.buildOrderByClause(params.SortField, params.SortOrder)
	baseQuery += orderClause

	// Add LIMIT and OFFSET
	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, params.Limit, params.Offset)

	// Execute query
	rows, err := s.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			s.logger.Error().Err(closeErr).Msg("Error closing rows")
		}
	}()

	// Process results
	var logs []models.LogEntrySummary
	for rows.Next() {
		var log models.LogEntrySummary
		scanErr := rows.Scan(
			&log.ID,
			&log.Type,
			&log.Method,
			&log.Path,
			&log.Timestamp,
			&log.SourceIP,
			&log.ClientID,
			&log.EventType,
			&log.Direction,
			&log.Duration,
			&log.StatusCode,
		)
		if scanErr != nil {
			return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, scanErr)
		}
		logs = append(logs, log)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, rowsErr)
	}

	// Get total count
	var total int
	err = s.db.QueryRowContext(ctx, countQuery, args[:len(args)-2]...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	return logs, total, nil
}

// GetLogByID retrieves a single log by ID
func (s *Storage) GetLogByID(ctx context.Context, id string) (models.LogEntry, error) {
	query := `
		SELECT
			id,
			type,
			method,
			path,
			body,
			headers,
			timestamp,
			source_ip,
			client_id,
			event_type,
			direction,
			duration,
			status_code
		FROM logs
		WHERE id = $1
	`

	var log models.LogEntry
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&log.ID,
		&log.Type,
		&log.Method,
		&log.Path,
		&log.Body,
		&log.Headers,
		&log.Timestamp,
		&log.SourceIP,
		&log.ClientID,
		&log.EventType,
		&log.Direction,
		&log.Duration,
		&log.StatusCode,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return models.LogEntry{}, ErrNotFound
		}
		return models.LogEntry{}, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	return log, nil
}

// buildLogFilterWhereClause builds a WHERE clause for log filtering
func (s *Storage) buildLogFilterWhereClause(params LogFilter) (string, []interface{}) {
	var conditions []string
	var args []interface{}
	argPos := 1

	if params.Type != "" {
		conditions = append(conditions, fmt.Sprintf("type = $%d", argPos))
		args = append(args, params.Type)
		argPos++
	}

	if params.Method != "" {
		conditions = append(conditions, fmt.Sprintf("method = $%d", argPos))
		args = append(args, params.Method)
		argPos++
	}

	if params.Path != "" {
		conditions = append(conditions, fmt.Sprintf("path ILIKE $%d", argPos))
		args = append(args, "%"+params.Path+"%")
		argPos++
	}

	if params.EventType != "" {
		conditions = append(conditions, fmt.Sprintf("event_type = $%d", argPos))
		args = append(args, params.EventType)
		argPos++
	}

	if params.ClientID != "" {
		conditions = append(conditions, fmt.Sprintf("client_id = $%d", argPos))
		args = append(args, params.ClientID)
		argPos++
	}

	if params.Direction != "" {
		conditions = append(conditions, fmt.Sprintf("direction = $%d", argPos))
		args = append(args, params.Direction)
		argPos++
	}

	if params.StartTime != nil {
		conditions = append(conditions, fmt.Sprintf("timestamp >= $%d", argPos))
		args = append(args, params.StartTime)
		argPos++
	}

	if params.EndTime != nil {
		conditions = append(conditions, fmt.Sprintf("timestamp <= $%d", argPos))
		args = append(args, params.EndTime)
	}

	return strings.Join(conditions, " AND "), args
}

// buildOrderByClause builds an ORDER BY clause for sorting
func (s *Storage) buildOrderByClause(field, order string) string {
	// Validate field
	validFields := map[string]bool{
		"id":         true,
		"type":       true,
		"method":     true,
		"path":       true,
		"timestamp":  true,
		"source_ip":  true,
		"client_id":  true,
		"event_type": true,
		"direction":  true,
	}

	if !validFields[field] {
		field = "timestamp" // Default sort field
	}

	// Validate order
	order = strings.ToLower(order)
	if order != "asc" && order != "desc" {
		order = "desc" // Default sort order
	}

	return fmt.Sprintf(" ORDER BY %s %s", field, order)
}

// This method is deprecated, use GetLogsSummary instead
// GetFilteredLogs retrieves logs with pagination, filtering, and sorting
func (s *Storage) GetFilteredLogs(ctx context.Context, limit, offset int, method, path, messageType string, excludeWebsocket bool, sortField, sortOrder string) ([]models.LogEntry, error) {
	// Build the base query
	baseQuery := `
		SELECT id, type, method, path, body, headers, timestamp, source_ip, client_id, event_type, direction, duration, status_code
		FROM logs
	`

	// Add WHERE clause for filtering
	var conditions []string
	var args []interface{}
	argPosition := 1

	if method != "" {
		conditions = append(conditions, fmt.Sprintf("method = $%d", argPosition))
		args = append(args, method)
		argPosition++
	}

	if path != "" {
		conditions = append(conditions, fmt.Sprintf("path ILIKE $%d", argPosition))
		args = append(args, "%"+path+"%")
		argPosition++
	}

	// Filter WebSocket messages
	if excludeWebsocket {
		conditions = append(conditions, "method != 'WEBSOCKET'")
	} else if method == "WEBSOCKET" && messageType != "" {
		log.Debug().Msgf("Filtering for WebSocket message type: %s", messageType)
		// If explicitly filtering for WebSocket messages with a specific type
		// Handle both array format and direct string format for headers
		conditions = append(conditions, fmt.Sprintf(`(
			headers::jsonb->>'X-Websocket-Message-Type' = $%d OR
			headers::text::jsonb->>'X-Websocket-Message-Type' = $%d OR
			(headers::jsonb->'X-Websocket-Message-Type'->>0) = $%d OR
			(headers::text::jsonb->'X-Websocket-Message-Type'->>0) = $%d
		)`, argPosition, argPosition, argPosition, argPosition))
		args = append(args, messageType)
		argPosition++
	}

	// Add WHERE clause if we have conditions
	if len(conditions) > 0 {
		baseQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ORDER BY clause for sorting
	validSortFields := map[string]bool{
		"id":        true,
		"method":    true,
		"path":      true,
		"timestamp": true,
		"source_ip": true,
	}

	validSortOrders := map[string]bool{
		"asc":  true,
		"desc": true,
	}

	// Set default values if invalid
	if !validSortFields[sortField] {
		sortField = "timestamp"
	}

	if !validSortOrders[strings.ToLower(sortOrder)] {
		sortOrder = "desc"
	}

	baseQuery += fmt.Sprintf(" ORDER BY %s %s", sortField, sortOrder)

	// Add LIMIT and OFFSET
	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPosition, argPosition+1)
	args = append(args, limit, offset)

	// Execute the query
	rows, err := s.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			s.logger.Error().Err(closeErr).Msg("Error closing rows")
		}
	}()

	var logs []models.LogEntry
	for rows.Next() {
		var log models.LogEntry
		err := rows.Scan(
			&log.ID,
			&log.Type,
			&log.Method,
			&log.Path,
			&log.Body,
			&log.Headers,
			&log.Timestamp,
			&log.SourceIP,
			&log.ClientID,
			&log.EventType,
			&log.Direction,
			&log.Duration,
			&log.StatusCode,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return logs, nil
}

// CountRequestLogs returns the total number of request logs
func (s *Storage) CountRequestLogs(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM request_logs`

	var count int
	err := s.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

// CountFilteredRequestLogs returns the total number of filtered request logs
func (s *Storage) CountFilteredRequestLogs(ctx context.Context, method, path, messageType string, excludeWebsocket bool) (int, error) {
	// Build the base query
	baseQuery := `SELECT COUNT(*) FROM request_logs`

	// Add WHERE clause for filtering
	var conditions []string
	var args []interface{}
	argPosition := 1

	if method != "" {
		conditions = append(conditions, fmt.Sprintf("method = $%d", argPosition))
		args = append(args, method)
		argPosition++
	}

	if path != "" {
		conditions = append(conditions, fmt.Sprintf("path ILIKE $%d", argPosition))
		args = append(args, "%"+path+"%")
		argPosition++
	}

	// Filter WebSocket messages
	if excludeWebsocket {
		conditions = append(conditions, "method != 'WEBSOCKET'")
	} else if method == "WEBSOCKET" && messageType != "" {
		// If explicitly filtering for WebSocket messages with a specific type
		conditions = append(conditions, fmt.Sprintf("headers->>'X-WebSocket-Message-Type' = $%d", argPosition))
		args = append(args, messageType)
		// No need to increment argPosition as it's not used after this
	}

	// Add WHERE clause if we have conditions
	if len(conditions) > 0 {
		baseQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Execute the query
	var count int
	err := s.db.QueryRowContext(ctx, baseQuery, args...).Scan(&count)
	return count, err
}
