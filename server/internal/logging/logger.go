package logging

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Key type for context values
type contextKey string

// RequestIDKey is the key for request ID in context
const RequestIDKey contextKey = "requestID"

// Logger provides a unified logging interface for the application
type Logger struct {
	zlog zerolog.Logger
}

// New creates a new Logger instance
func New(level string, format string) *Logger {
	// Parse log level
	logLevel, err := zerolog.ParseLevel(level)
	if err != nil {
		logLevel = zerolog.DebugLevel
	}
	zerolog.SetGlobalLevel(logLevel)

	// Configure output format
	var output zerolog.ConsoleWriter
	if format == "console" {
		output = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}
	} else {
		// JSON format is the default for zerolog
		return &Logger{
			zlog: zerolog.New(os.Stdout).With().Timestamp().Logger(),
		}
	}

	return &Logger{
		zlog: zerolog.New(output).With().Timestamp().Logger(),
	}
}

// WithRequestID adds a request ID to the logger
func (l *Logger) WithRequestID(requestID string) *Logger {
	return &Logger{
		zlog: l.zlog.With().Str("request_id", requestID).Logger(),
	}
}

// WithField adds a field to the logger
func (l *Logger) WithField(key string, value interface{}) *Logger {
	return &Logger{
		zlog: l.zlog.With().Interface(key, value).Logger(),
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string) {
	l.zlog.Debug().Msg(msg)
}

// Debugf logs a formatted debug message
func (l *Logger) Debugf(format string, args ...interface{}) {
	l.zlog.Debug().Msgf(format, args...)
}

// Info logs an info message
func (l *Logger) Info(msg string) {
	l.zlog.Info().Msg(msg)
}

// Infof logs a formatted info message
func (l *Logger) Infof(format string, args ...interface{}) {
	l.zlog.Info().Msgf(format, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string) {
	l.zlog.Warn().Msg(msg)
}

// Warnf logs a formatted warning message
func (l *Logger) Warnf(format string, args ...interface{}) {
	l.zlog.Warn().Msgf(format, args...)
}

// Error logs an error message
func (l *Logger) Error(err error, msg string) {
	l.zlog.Error().Err(err).Msg(msg)
}

// Errorf logs a formatted error message
func (l *Logger) Errorf(err error, format string, args ...interface{}) {
	l.zlog.Error().Err(err).Msgf(format, args...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(err error, msg string) {
	l.zlog.Fatal().Err(err).Msg(msg)
}

// Fatalf logs a formatted fatal message and exits
func (l *Logger) Fatalf(err error, format string, args ...interface{}) {
	l.zlog.Fatal().Err(err).Msgf(format, args...)
}

// FromContext gets a Logger from context, or returns the default logger
func FromContext(ctx context.Context) *Logger {
	requestID, ok := ctx.Value(RequestIDKey).(string)
	if !ok {
		// Generate a new request ID if none exists
		requestID = uuid.New().String()
	}
	return &Logger{
		zlog: log.With().Str("request_id", requestID).Logger(),
	}
}

// WithContext adds a Logger to context
func WithContext(ctx context.Context) (context.Context, string) {
	requestID := uuid.New().String()
	return context.WithValue(ctx, RequestIDKey, requestID), requestID
}

// ToJSON converts an object to JSON string for logging
func ToJSON(v interface{}) string {
	jsonBytes, err := json.Marshal(v)
	if err != nil {
		return "{\"error\":\"failed to marshal to JSON\"}"
	}
	return string(jsonBytes)
}
