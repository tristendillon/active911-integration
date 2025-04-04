package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	Server       ServerConfig
	Database     DatabaseConfig
	Auth         AuthConfig
	Logging      LoggingConfig
	Notification NotificationConfig
}

// ServerConfig holds the server configuration
type ServerConfig struct {
	Port               string
	ReadTimeout        time.Duration
	WriteTimeout       time.Duration
	IdleTimeout        time.Duration
	ShutdownTimeout    time.Duration
	CorsAllowedOrigins []string
}

// DatabaseConfig holds the database configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	DSN      string // Computed from the above fields
}

// AuthConfig holds the authentication configuration
type AuthConfig struct {
	APIPassword string
}

// LoggingConfig holds the logging configuration
type LoggingConfig struct {
	Level          string
	Format         string
	RequestLogging bool
}

// NotificationConfig holds the notification configuration
type NotificationConfig struct {
	Email EmailConfig
}

// EmailConfig holds the email notification configuration
type EmailConfig struct {
	Enabled     bool
	SMTPHost    string
	SMTPPort    int
	Username    string
	Password    string
	FromAddress string
	ToAddresses []string
	MinLevel    string // Minimum level to trigger email (error, fatal)
}

// New returns a new Config struct
func New() *Config {
	return &Config{
		Server: ServerConfig{
			Port:               getEnv("SERVER_PORT", "8080"),
			ReadTimeout:        getDurationEnv("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:       getDurationEnv("SERVER_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:        getDurationEnv("SERVER_IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout:    getDurationEnv("SERVER_SHUTDOWN_TIMEOUT", 15*time.Second),
			CorsAllowedOrigins: getSliceEnv("CORS_ALLOWED_ORIGINS", []string{"*"}),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "alerting"),
			Password: getEnv("DB_PASSWORD", "alerting"),
			Name:     getEnv("DB_NAME", "alerting"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		Auth: AuthConfig{
			APIPassword: getEnv("API_PASSWORD", ""),
		},
		Logging: LoggingConfig{
			Level:          getEnv("LOG_LEVEL", "debug"),
			Format:         getEnv("LOG_FORMAT", "console"),
			RequestLogging: getBoolEnv("REQUEST_LOGGING", true),
		},
		Notification: NotificationConfig{
			Email: EmailConfig{
				Enabled:     getBoolEnv("EMAIL_NOTIFICATIONS_ENABLED", false),
				SMTPHost:    getEnv("EMAIL_SMTP_HOST", ""),
				SMTPPort:    getIntEnv("EMAIL_SMTP_PORT", 587),
				Username:    getEnv("EMAIL_USERNAME", ""),
				Password:    getEnv("EMAIL_PASSWORD", ""),
				FromAddress: getEnv("EMAIL_FROM_ADDRESS", ""),
				ToAddresses: getSliceEnv("EMAIL_TO_ADDRESSES", []string{}),
				MinLevel:    getEnv("EMAIL_MIN_LEVEL", "error"),
			},
		},
	}
}

// Initialize sets up any derived configuration values
func (c *Config) Initialize() {
	// Build the DSN for the database
	c.Database.DSN = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.Database.User, c.Database.Password, c.Database.Host, c.Database.Port, c.Database.Name, c.Database.SSLMode)
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	// Add validation logic as needed
	return nil
}

// Helper functions for environment variables

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getIntEnv gets an integer environment variable or returns the default value
func getIntEnv(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value, exists := os.LookupEnv(key); exists {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getSliceEnv(key string, defaultValue []string) []string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
