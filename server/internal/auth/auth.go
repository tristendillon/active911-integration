package auth

import (
	"context"
	"errors"
	"net/http"
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

// RedactAlertData removes sensitive information from alerts for unauthenticated users
func RedactAlertData(alert *models.Alert, keepCoordinates bool) {
	// Keep fields needed for minimal display
	if !keepCoordinates {
		alert.Alert.Lat = 0
		alert.Alert.Lon = 0
	}

	// Redact sensitive information
	alert.Alert.MapCode = nil
	alert.Alert.Units = nil
	alert.Alert.Unit = nil
	alert.Alert.Source = nil
}

// Auth middleware adds authentication info to the request context
func (a *Authenticator) Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get authentication info
		authInfo := a.GetAuthInfo(r)

		// Set authentication info in context
		ctx := context.WithValue(r.Context(), AuthInfoKey, authInfo)

		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
