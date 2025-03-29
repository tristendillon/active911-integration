package notification

import (
	"context"
	"fmt"
)

// StorageNotifier is a middleware that wraps the storage layer to send notifications on critical errors
type StorageNotifier struct {
	service *Service
}

// NewStorageNotifier creates a new storage notifier
func NewStorageNotifier(service *Service) *StorageNotifier {
	return &StorageNotifier{
		service: service,
	}
}

// NotifyOnError sends a notification if the error is critical
func (n *StorageNotifier) NotifyOnError(err error, operation string) error {
	if err != nil {
		// Only send notifications for critical database errors
		if isCriticalDatabaseError(err) {
			n.service.NotifyError(err, fmt.Sprintf("Database operation failed: %s", operation))
		}
	}
	return err
}

// NotifyOnFatal sends a notification for fatal errors and returns the original error
func (n *StorageNotifier) NotifyOnFatal(err error, operation string) error {
	if err != nil {
		n.service.NotifyFatal(err, fmt.Sprintf("Critical system error: %s", operation))
	}
	return err
}

// WithNotifications wraps a database operation with notifications
func (n *StorageNotifier) WithNotifications(ctx context.Context, operation string, fn func(context.Context) error) error {
	err := fn(ctx)
	return n.NotifyOnError(err, operation)
}

// isCriticalDatabaseError determines if an error is critical enough to notify about
func isCriticalDatabaseError(err error) bool {
	// In a real implementation, you would check for specific error types
	// For now, we'll consider all database errors as critical
	return err != nil
}