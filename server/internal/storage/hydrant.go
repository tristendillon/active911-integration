package storage

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/alerting/server/internal/models"
)

// InitHydrantTable initializes the hydrants table if it doesn't exist
func (s *Storage) InitHydrantTable() error {
	ctx := context.Background()

	// Try to create PostGIS extension if available, but don't fail if it's not
	_, err := s.db.ExecContext(ctx, "CREATE EXTENSION IF NOT EXISTS postgis;")
	if err != nil {
		s.logger.Warn().Err(err).Msg("PostGIS extension not available - will use standard indexes only")
	}

	// Create the table and indexes
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS hydrants (
		id TEXT PRIMARY KEY,
		type TEXT,
		nozzles INTEGER,
		flow_rate DOUBLE PRECISION,
		color TEXT,
		status TEXT,
		lat DOUBLE PRECISION NOT NULL,
		lng DOUBLE PRECISION NOT NULL,
		flow_status TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	-- Create simple indexes on lat/lng
	CREATE INDEX IF NOT EXISTS hydrants_lat_idx ON hydrants (lat);
	CREATE INDEX IF NOT EXISTS hydrants_lng_idx ON hydrants (lng);

	-- Create trigger to update updated_at timestamp on hydrants table
	CREATE OR REPLACE FUNCTION update_hydrant_updated_at_column()
	RETURNS TRIGGER AS $$
	BEGIN
		NEW.updated_at = NOW();
		RETURN NEW;
	END;
	$$ language 'plpgsql';

	DROP TRIGGER IF EXISTS update_hydrants_updated_at ON hydrants;
	CREATE TRIGGER update_hydrants_updated_at
	BEFORE UPDATE ON hydrants
	FOR EACH ROW
	EXECUTE FUNCTION update_hydrant_updated_at_column();
	`

	_, err = s.db.ExecContext(ctx, createTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create hydrants table: %w", err)
	}

	// Create spatial index if PostGIS is available
	_, err = s.db.ExecContext(ctx, `
	DO $$
	BEGIN
		IF EXISTS (
			SELECT 1 FROM pg_extension WHERE extname = 'postgis'
		) THEN
			BEGIN
				EXECUTE 'CREATE INDEX IF NOT EXISTS hydrants_location_idx ON hydrants USING gist (ST_SetSRID(ST_MakePoint(lng, lat), 4326))';
			EXCEPTION WHEN OTHERS THEN
				RAISE NOTICE 'Unable to create spatial index: %', SQLERRM;
			END;
		END IF;
	END
	$$;
	`)
	if err != nil {
		s.logger.Warn().Err(err).Msg("Failed to create spatial index, falling back to regular indexes")
	}

	return nil
}

// SaveHydrant stores a single hydrant in the database
func (s *Storage) SaveHydrant(ctx context.Context, hydrant models.Hydrant) (string, error) {
	// If ID is empty, generate a new UUID
	if hydrant.ID == "" {
		hydrant.ID = uuid.New().String()
	}

	now := float64(time.Now().Unix())
	if hydrant.CreatedAt == 0 {
		hydrant.CreatedAt = now
	}
	hydrant.UpdatedAt = now

	query := `
	INSERT INTO hydrants (
		id, type, nozzles, flow_rate, color, status, lat, lng, flow_status, created_at, updated_at
	)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10), to_timestamp($11))
	ON CONFLICT (id) DO UPDATE
	SET
		type = $2,
		nozzles = $3,
		flow_rate = $4,
		color = $5,
		status = $6,
		lat = $7,
		lng = $8,
		flow_status = $9,
		updated_at = to_timestamp($11)
	RETURNING id
	`

	var id string
	err := s.db.QueryRowContext(
		ctx, query,
		hydrant.ID, hydrant.Type, hydrant.Nozzles, hydrant.FlowRate,
		hydrant.Color, hydrant.Status, hydrant.Lat, hydrant.Lng,
		hydrant.FlowStatus, hydrant.CreatedAt, hydrant.UpdatedAt,
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("failed to save hydrant: %w", err)
	}

	return id, nil
}

// SaveManyHydrants saves multiple hydrants in the database using transactions
func (s *Storage) SaveManyHydrants(ctx context.Context, hydrants []models.Hydrant, progressCallback func(progress models.HydrantBatchUploadProgress)) ([]string, error) {
	total := len(hydrants)
	if total == 0 {
		return []string{}, nil
	}

	// Optional: add a timeout if the context doesn't already have one
	// ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	// defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO hydrants (
			id, type, nozzles, flow_rate, color, status, lat, lng, flow_status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10), to_timestamp($11))
		ON CONFLICT (id) DO UPDATE
		SET
			type = $2,
			nozzles = $3,
			flow_rate = $4,
			color = $5,
			status = $6,
			lat = $7,
			lng = $8,
			flow_status = $9,
			updated_at = to_timestamp($11)
		RETURNING id
	`)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	ids := make([]string, 0, total)
	now := float64(time.Now().Unix())
	failedItems := make([]struct {
		Index int    `json:"index"`
		Error string `json:"error"`
	}, 0)

	for i, hydrant := range hydrants {
		// Check if context has been canceled
		select {
		case <-ctx.Done():
			tx.Rollback()
			progressCallback(models.HydrantBatchUploadProgress{
				Total:       total,
				Processed:   i,
				Successful:  len(ids),
				Failed:      len(failedItems),
				Progress:    100.0,
				InProgress:  false,
				FailedItems: failedItems,
			})
			return nil, fmt.Errorf("context canceled at hydrant %d: %w", i, ctx.Err())
		default:
		}

		if hydrant.ID == "" {
			hydrant.ID = uuid.New().String()
		}
		if hydrant.CreatedAt == 0 {
			hydrant.CreatedAt = now
		}
		hydrant.UpdatedAt = now

		var id string
		err := stmt.QueryRowContext(
			ctx,
			hydrant.ID, hydrant.Type, hydrant.Nozzles, hydrant.FlowRate,
			hydrant.Color, hydrant.Status, hydrant.Lat, hydrant.Lng,
			hydrant.FlowStatus, hydrant.CreatedAt, hydrant.UpdatedAt,
		).Scan(&id)

		if err != nil {
			failedItems = append(failedItems, struct {
				Index int    `json:"index"`
				Error string `json:"error"`
			}{
				Index: i,
				Error: err.Error(),
			})
			progressCallback(models.HydrantBatchUploadProgress{
				Total:       total,
				Processed:   i,
				Successful:  len(ids),
				Failed:      len(failedItems),
				Progress:    100.0,
				InProgress:  true,
				FailedItems: failedItems,
			})
			s.logger.Error().Int("index", i).Err(err).Msg("Failed to save hydrant")
		} else {
			ids = append(ids, id)
			progressCallback(models.HydrantBatchUploadProgress{
				Total:       total,
				Processed:   i,
				Successful:  len(ids),
				Failed:      len(failedItems),
				Progress:    100.0,
				InProgress:  false,
				FailedItems: failedItems,
			})
		}
	}
	progressCallback(models.HydrantBatchUploadProgress{
		Total:       total,
		Processed:   total,
		Successful:  len(ids),
		Failed:      len(failedItems),
		Progress:    100.0,
		InProgress:  false,
		FailedItems: failedItems,
	})

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return ids, nil
}

// GetHydrantsByBounds retrieves hydrants within the specified geographic bounds
func (s *Storage) GetHydrantsByBounds(ctx context.Context, bounds models.HydrantBoundsQuery) ([]models.Hydrant, error) {
	query := `
	SELECT
		id, type, nozzles, flow_rate, color, status, lat, lng, flow_status,
		EXTRACT(EPOCH FROM created_at) as created_at,
		EXTRACT(EPOCH FROM updated_at) as updated_at
	FROM hydrants
	WHERE
		lat <= $1 AND lat >= $2 AND
		lng <= $3 AND lng >= $4
	`

	rows, err := s.db.QueryContext(ctx, query,
		bounds.NorthLat, bounds.SouthLat, bounds.EastLng, bounds.WestLng)
	if err != nil {
		return nil, fmt.Errorf("failed to query hydrants: %w", err)
	}
	defer rows.Close()

	hydrants := make([]models.Hydrant, 0)
	for rows.Next() {
		var h models.Hydrant
		if err := rows.Scan(
			&h.ID, &h.Type, &h.Nozzles, &h.FlowRate, &h.Color, &h.Status,
			&h.Lat, &h.Lng, &h.FlowStatus, &h.CreatedAt, &h.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan hydrant row: %w", err)
		}
		hydrants = append(hydrants, h)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating hydrant rows: %w", err)
	}

	return hydrants, nil
}

// GetHydrantByID retrieves a single hydrant by ID
func (s *Storage) GetHydrantByID(ctx context.Context, id string) (models.Hydrant, error) {
	query := `
	SELECT
		id, type, nozzles, flow_rate, color, status, lat, lng, flow_status,
		EXTRACT(EPOCH FROM created_at) as created_at,
		EXTRACT(EPOCH FROM updated_at) as updated_at
	FROM hydrants
	WHERE id = $1
	`

	var h models.Hydrant
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&h.ID, &h.Type, &h.Nozzles, &h.FlowRate, &h.Color, &h.Status,
		&h.Lat, &h.Lng, &h.FlowStatus, &h.CreatedAt, &h.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return models.Hydrant{}, ErrNotFound
		}
		return models.Hydrant{}, fmt.Errorf("failed to get hydrant: %w", err)
	}

	return h, nil
}

// DeleteAllHydrants deletes all hydrants in the database
func (s *Storage) DeleteAllHydrants(ctx context.Context) (int, error) {
	query := `DELETE FROM hydrants`

	result, err := s.db.ExecContext(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all hydrants: %w", err)
	}

	count, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get affected rows count: %w", err)
	}

	return int(count), nil
}

// CountHydrants returns the total number of hydrants in the database
func (s *Storage) CountHydrants(ctx context.Context) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM hydrants").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count hydrants: %w", err)
	}
	return count, nil
}
