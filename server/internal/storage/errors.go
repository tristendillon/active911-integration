package storage

import "errors"

// Common error definitions
var (
	// ErrNotFound indicates that a requested resource was not found
	ErrNotFound = errors.New("resource not found")

	// ErrInvalidInput indicates that the input data is invalid
	ErrInvalidInput = errors.New("invalid input data")

	// ErrDatabaseOperation indicates a database operation failure
	ErrDatabaseOperation = errors.New("database operation failed")
)
