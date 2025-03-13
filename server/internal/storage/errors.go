package storage

import (
	"database/sql"
	"errors"
)

// Common errors
var (
	ErrNotFound = errors.New("record not found")
)

// MapError maps SQL errors to application errors
func MapError(err error) error {
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}