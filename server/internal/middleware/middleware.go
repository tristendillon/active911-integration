package middleware

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
)

// Logger logs HTTP requests and responses
type Logger struct {
	logger       *logging.Logger
	logCallback  func(models.LogEntry) error
	eventEmitter func(string, interface{})
}

// NewLogger creates a new logger middleware
func NewLogger(logger *logging.Logger, logCallback func(models.LogEntry) error, eventEmitter func(string, interface{})) *Logger {
	return &Logger{
		logger:       logger,
		logCallback:  logCallback,
		eventEmitter: eventEmitter,
	}
}

// Logging middleware logs HTTP requests and responses
func (l *Logger) Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Generate a unique request ID
		requestID := uuid.New().String()

		// Add request ID to context
		ctx, _ := logging.WithContext(r.Context())
		ctx = context.WithValue(ctx, logging.RequestIDKey, requestID)
		r = r.WithContext(ctx)

		// Add request ID to response headers
		w.Header().Set("X-Request-ID", requestID)

		// Create logger with request ID
		reqLogger := l.logger.WithRequestID(requestID)

		// Log the incoming request
		reqLogger.Infof("Request received: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)

		// Create a response recorder to capture the response
		recorder := &responseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default status code
			body:           &bytes.Buffer{},
		}

		// Read the request body
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			reqLogger.Error(err, "Failed to read request body")
			http.Error(w, "Failed to read request body", http.StatusInternalServerError)
			return
		}

		// Replace the body for downstream handlers
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		// Create JSON representation of the body
		var bodyJSON json.RawMessage
		if len(bodyBytes) > 0 {
			if json.Valid(bodyBytes) {
				bodyJSON = bodyBytes
			} else {
				bodyJSON, err = json.Marshal(string(bodyBytes))
				if err != nil {
					l.logger.Error(err, "Failed to marshal request body")
					bodyJSON = json.RawMessage([]byte(`"Error marshaling body"`))
				}
			}
		} else {
			bodyJSON = json.RawMessage([]byte("null"))
		}

		// Create headers JSON
		headersMap := make(map[string][]string)
		for k, v := range r.Header {
			headersMap[k] = v
		}
		headersJSON, err := json.Marshal(headersMap)
		if err != nil {
			l.logger.Error(err, "Failed to marshal request headers")
			headersJSON = json.RawMessage([]byte("{}"))
		}

		// Create log entry for the request
		logEntry := models.LogEntry{
			ID:        requestID,
			Type:      "api_request",
			Method:    r.Method,
			Path:      r.URL.Path,
			Body:      bodyJSON,
			Headers:   headersJSON,
			Timestamp: time.Now(),
			SourceIP:  r.RemoteAddr,
			Direction: "incoming",
		}

		// Call the next handler
		next.ServeHTTP(recorder, r)

		// Calculate request duration
		duration := time.Since(start).Milliseconds()

		// Update log entry with response info
		logEntry.Duration = &duration
		logEntry.StatusCode = &recorder.statusCode

		// Log the request to the database
		if l.logCallback != nil && !isLogEndpoint(r.URL.Path) {
			if err := l.logCallback(logEntry); err != nil {
				reqLogger.Error(err, "Failed to save request log")
			}
		}

		// Emit an event for the new log
		if l.eventEmitter != nil && !isLogEndpoint(r.URL.Path) {
			logNotification := map[string]interface{}{
				"id":         requestID,
				"method":     r.Method,
				"path":       r.URL.Path,
				"timestamp":  time.Now().Unix(),
				"source_ip":  r.RemoteAddr,
				"duration":   duration,
				"statusCode": recorder.statusCode,
			}
			l.eventEmitter("new_log", logNotification)
		}

		// Log the response time
		reqLogger.Infof("Request completed: %s %s in %dms with status %d",
			r.Method, r.URL.Path, duration, recorder.statusCode)
	})
}

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Set CORS headers
			w.Header().Set("Access-Control-Allow-Origin", "*") // Use specific origins in production

			// Set other CORS headers
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "3600")

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			// Call the next handler
			next.ServeHTTP(w, r)
		})
	}
}

// responseRecorder is a custom http.ResponseWriter that records the status code and response body
type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       *bytes.Buffer
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	// Write to the response and to our buffer
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

func (r *responseRecorder) Flush() {
	if flusher, ok := r.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (r *responseRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hijacker, ok := r.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, fmt.Errorf("responseRecorder does not implement http.Hijacker")
}

// CloseNotify is deprecated but kept for compatibility with older versions of Go
// nolint:staticcheck
func (r *responseRecorder) CloseNotify() <-chan bool {
	if cn, ok := r.ResponseWriter.(http.CloseNotifier); ok {
		return cn.CloseNotify()
	}
	return nil
}

// isLogEndpoint checks if the path is a log-related endpoint
func isLogEndpoint(path string) bool {
	return path == "/logs" || path == "/internal/logs" || len(path) > 5 && path[:6] == "/logs/"
}
