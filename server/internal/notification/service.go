package notification

import (
	"github.com/user/alerting/server/internal/config"
	"github.com/user/alerting/server/internal/logging"
)

// Service provides access to all notification services
type Service struct {
	Email *EmailService
}

// NewService creates a new notification service
func NewService(cfg config.NotificationConfig, logger *logging.Logger) *Service {
	return &Service{
		Email: NewEmailService(cfg.Email, logger),
	}
}

// NotifyError sends an error notification to all configured channels
func (s *Service) NotifyError(err error, context string) {
	s.Email.logger.Infof("Sending error notification: %v", err)
	s.Email.NotifyError(err, context)
	// Add other notification channels here as needed (SMS, Slack, etc.)
}

// NotifyFatal sends a fatal notification to all configured channels
func (s *Service) NotifyFatal(err error, context string) {
	s.Email.logger.Infof("Sending fatal notification: %v", err)
	s.Email.NotifyFatal(err, context)
	// Add other notification channels here as needed (SMS, Slack, etc.)
}
