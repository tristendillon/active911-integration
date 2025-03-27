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
		return true, nil
	}

	if password != a.apiPassword {
		return false, ErrUnauthorized
	}

	return true, nil
}

// GetAuthInfo extracts authentication info from a request
func (a *Authenticator) GetAuthInfo(r *http.Request) AuthInfo {
	// Check query parameter first
	password := r.URL.Query().Get("password")

	// If empty, check Authorization header
	if password == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			password = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	// Check if password is valid
	isAuthenticated, err := a.Authenticate(password)
	if err != nil {
		a.logger.Error(err, "Error authenticating request")
		isAuthenticated = false
	}

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

var alwaysRedactedFields = []string{
	"Details",
}

var redactedFields = []string{
	"CrossStreet",
	"MapAddress",
	"Place",
	"DispatchCoords",
}

var redactedDescriptors = []string{
	"med",
}

func RedactAlertData(alert *models.Alert, keepCoordinates bool) *models.Alert {
	// Create a deep copy of the alert to avoid modifying the original
	redactedAlert := *alert // Copy the top level struct

	// First determine if we need to redact sensitive fields based on the description
	needsRedaction := false

	// Check if Description is nil before dereferencing
	if alert.Alert.Description != nil {
		descriptor := *alert.Alert.Description
		for _, redactedDescriptor := range redactedDescriptors {
			if strings.Contains(strings.ToLower(descriptor), redactedDescriptor) {
				needsRedaction = true
				break
			}
		}
	}

	// Prepare the reflection to access fields
	alertValue := reflect.ValueOf(&redactedAlert.Alert).Elem()

	// Always redact the fields in alwaysRedactedFields regardless of description
	for _, field := range alwaysRedactedFields {
		fieldValue := alertValue.FieldByName(field)
		if fieldValue.IsValid() && fieldValue.CanSet() {
			// Handle different types of fields
			switch fieldValue.Kind() {
			case reflect.String:
				fieldValue.SetString("[Redacted]")
			case reflect.Ptr:
				// Handle string pointers
				if !fieldValue.IsNil() && fieldValue.Elem().Kind() == reflect.String {
					fieldValue.Elem().SetString("[Redacted]")
				}
			}
		}
	}

	// If no further redaction needed based on description, return the alert with just always-redacted fields
	if !needsRedaction {
		return &redactedAlert
	}

	// If we reach here, full redaction is needed
	if !keepCoordinates {
		redactedAlert.Alert.Lat = 0
		redactedAlert.Alert.Lon = 0
	}

	// Loop through fields that need redaction based on description
	for _, field := range redactedFields {
		fieldValue := alertValue.FieldByName(field)
		if fieldValue.IsValid() && fieldValue.CanSet() {
			// Handle different types of fields
			switch fieldValue.Kind() {
			case reflect.String:
				fieldValue.SetString("[Redacted]")
			case reflect.Ptr:
				// Handle string pointers
				if !fieldValue.IsNil() && fieldValue.Elem().Kind() == reflect.String {
					fieldValue.Elem().SetString("[Redacted]")
				}
			}
		}
	}

	return &redactedAlert
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
