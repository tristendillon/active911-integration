package auth

import (
	"context"
	"errors"
	"net/http"
	"reflect"
	"strings"

	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
)

// Common errors
var (
	ErrUnauthorized = errors.New("unauthorized: invalid API password")
)

// AuthKey is the context key for authentication info
type AuthKey string

// Context keys
const (
	AuthInfoKey AuthKey = "auth_info"
)

// AuthInfo contains authentication information
type AuthInfo struct {
	Authenticated bool
	Password      string
}

// Authenticator handles authentication
type Authenticator struct {
	apiPassword string
	logger      *logging.Logger
}

// New creates a new Authenticator
func New(apiPassword string, logger *logging.Logger) *Authenticator {
	return &Authenticator{
		apiPassword: apiPassword,
		logger:      logger,
	}
}

// Authenticate checks the API password
func (a *Authenticator) Authenticate(password string) (bool, error) {
	if a.apiPassword == "" {
		// If no password is set, authentication is bypassed
		a.logger.Info("No API password configured - authentication bypass enabled")
		return true, nil
	}

	a.logger.Infof("Authenticating request - API password configured: %v, password provided: %v",
		a.apiPassword != "", password != "")

	if password != a.apiPassword {
		a.logger.Info("Authentication failed - incorrect password provided")
		return false, ErrUnauthorized
	}

	a.logger.Info("Authentication successful")
	return true, nil
}

// GetAuthInfo extracts authentication info from a request
func (a *Authenticator) GetAuthInfo(r *http.Request) AuthInfo {
	// Check query parameter first
	password := r.URL.Query().Get("password")
	a.logger.Infof("Auth check - Query param password present: %v", password != "")

	// If empty, check Authorization header
	if password == "" {
		authHeader := r.Header.Get("Authorization")
		a.logger.Infof("Auth check - Authorization header present: %v", authHeader != "")
		if strings.HasPrefix(authHeader, "Bearer ") {
			password = strings.TrimPrefix(authHeader, "Bearer ")
			a.logger.Infof("Auth check - Bearer token extracted")
		}
	}

	// Check if password is valid
	isAuthenticated, err := a.Authenticate(password)
	if err != nil {
		a.logger.Error(err, "Error authenticating request")
		isAuthenticated = false
	}

	a.logger.Infof("Auth check complete - Password provided: %v, Authenticated: %v",
		password != "", isAuthenticated)

	return AuthInfo{
		Authenticated: isAuthenticated,
		Password:      password,
	}
}

// GetAuthInfoFromContext gets authentication info from context
func GetAuthInfoFromContext(ctx context.Context) (AuthInfo, bool) {
	if authInfo, ok := ctx.Value(AuthInfoKey).(AuthInfo); ok {
		return authInfo, true
	}
	return AuthInfo{}, false
}

// RedactionLevel defines the level of redaction to apply
type RedactionLevel int

const (
	// NormalRedaction redacts always redacted fields only
	NormalRedaction RedactionLevel = iota
	// PartialRedaction redacts more fields, primarily location data
	PartialRedaction
	// FullRedaction redacts the entire alert other than timestamp and ID
	FullRedaction
)

var alwaysRedactedFields = []string{
	"Details",
}

// Additional fields to redact in partial redaction mode
var partialRedactedFields = []string{
	"CrossStreet",
	"MapAddress",
	"Place",
	"DispatchCoords",
	"City",
	"State",
	"CoordinateSource",
	"Lat",
	"Lon",
}

// Fields to preserve in full redaction mode (everything else is redacted)
var preservedFieldsInFullRedaction = []string{
	"ID",
	"Stamp",
	"Status",
}

var redactedDescriptors = []string{
	"med",
}
var fullRedactedDescriptors = []string{
	"rape",
	"gun",
	"stab",
}

func RedactAlertData(alert *models.Alert) *models.Alert {
	// Determine redaction level based on description
	level := NormalRedaction

	// Check if Description is nil before dereferencing
	if alert.Alert.Description != nil {
		descriptor := *alert.Alert.Description
		for _, redactedDescriptor := range redactedDescriptors {
			if strings.Contains(strings.ToLower(descriptor), redactedDescriptor) {
				// Medical calls get partial redaction by default
				level = PartialRedaction
				break
			}
		}
		for _, fullRedactedDescriptor := range fullRedactedDescriptors {
			if strings.Contains(strings.ToLower(descriptor), fullRedactedDescriptor) {
				// Medical calls get partial redaction by default
				level = FullRedaction
				break
			}
		}
	}

	return RedactAlertDataWithLevel(alert, level)
}

// RedactAlertDataWithLevel applies redaction to an alert based on the specified redaction level
func RedactAlertDataWithLevel(alert *models.Alert, level RedactionLevel) *models.Alert {
	// Create a deep copy of the alert to avoid modifying the original
	redactedAlert := *alert // Copy the top level struct

	// Prepare the reflection to access fields
	alertValue := reflect.ValueOf(&redactedAlert.Alert).Elem()

	// Apply redaction based on level
	switch level {
	case NormalRedaction:
		// Only redact always redacted fields
		redactFields(alertValue, alwaysRedactedFields)

	case PartialRedaction:
		// Redact always redacted fields
		redactFields(alertValue, alwaysRedactedFields)
		// Redact additional location fields
		redactFields(alertValue, partialRedactedFields)

	case FullRedaction:
		// Redact everything except preserved fields
		// Get all field names using reflection
		alertType := alertValue.Type()
		fieldCount := alertType.NumField()

		for i := 0; i < fieldCount; i++ {
			fieldName := alertType.Field(i).Name

			// Skip preserved fields
			if contains(preservedFieldsInFullRedaction, fieldName) {
				continue
			}

			fieldValue := alertValue.FieldByName(fieldName)
			if fieldValue.IsValid() && fieldValue.CanSet() {
				redactField(fieldValue)
			}
		}

		// Always redact coordinates in full redaction mode
		redactedAlert.Alert.Lat = 0
		redactedAlert.Alert.Lon = 0
	}

	return &redactedAlert
}

// redactFields applies redaction to the specified fields
func redactFields(alertValue reflect.Value, fields []string) {
	for _, field := range fields {
		fieldValue := alertValue.FieldByName(field)
		if fieldValue.IsValid() && fieldValue.CanSet() {
			redactField(fieldValue)
		}
	}
}

// redactField redacts a single field based on its type
func redactField(fieldValue reflect.Value) {
	switch fieldValue.Kind() {
	case reflect.String:
		fieldValue.SetString("[Redacted]")
	case reflect.Ptr:
		// Handle string pointers
		if !fieldValue.IsNil() && fieldValue.Elem().Kind() == reflect.String {
			fieldValue.Elem().SetString("[Redacted]")
		}
	case reflect.Float64:
		fieldValue.SetFloat(0)
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		fieldValue.SetInt(0)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		fieldValue.SetUint(0)
	case reflect.Bool:
		fieldValue.SetBool(false)
	case reflect.Slice:
		// Clear slices
		fieldValue.Set(reflect.Zero(fieldValue.Type()))
	}
}

// contains checks if a string is in a slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Auth middleware adds authentication info to the request context
func (a *Authenticator) Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get authentication info
		authInfo := a.GetAuthInfo(r)

		// Set authentication info in context
		ctx := context.WithValue(r.Context(), AuthInfoKey, authInfo)
		a.logger.Infof("Authentication info: %+v", authInfo)
		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
