package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/user/alerting/server/internal/auth"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
)

// Handler manages WebSocket connections
type Handler struct {
	alertsHub *Hub
	logsHub   *Hub
	upgrader  websocket.Upgrader
	auth      *auth.Authenticator
	logger    *logging.Logger
}

// NewHandler creates a new WebSocket handler
func NewHandler(alertsHub, logsHub *Hub, auth *auth.Authenticator, logger *logging.Logger) *Handler {
	// Initialize the upgrader
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all connections for development
		},
	}

	return &Handler{
		alertsHub: alertsHub,
		logsHub:   logsHub,
		upgrader:  upgrader,
		auth:      auth,
		logger:    logger,
	}
}

// HandleAlertsConnection handles connections to the alerts WebSocket endpoint
func (h *Handler) HandleAlertsConnection(w http.ResponseWriter, r *http.Request) {
	// Check authentication
	authInfo := h.auth.GetAuthInfo(r)
	h.logger.Infof("WebSocket connection authentication status: %v, password provided: %v", authInfo.Authenticated, authInfo.Password != "")

	// Note: Authentication check is commented out to allow public access with redacted data
	// if !authInfo.Authenticated {
	// 	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	// 	h.logger.Warn("Unauthorized attempt to connect to alerts WebSocket")
	// 	return
	// }

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error(err, "Failed to upgrade connection to WebSocket")
		return
	}

	// Create a new client with authentication status
	client := NewClient(h.alertsHub, conn, h.logger, authInfo.Authenticated)
	h.logger.Infof("New WebSocket client created with ID %s, authentication status: %v",
		client.id, client.isAuthenticated)

	// Register client with hub
	h.alertsHub.Register(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	client.ReadPump(func(message models.WebSocketMessage, client *Client) {
		h.logger.Infof("Received message from client %s: %s", client.id, message.Type)
		// Handle different message types
		switch message.Type {
		case "refresh":
			// Check if client is authenticated
			if !client.isAuthenticated {
				client.SendMessage("error", "Unauthorized: Authentication required for refresh")
				h.logger.Warnf("Unauthorized attempt to refresh by client %s", client.id)
				return
			}

			// Broadcast refresh to all clients
			h.alertsHub.BroadcastEvent("refresh", nil)
			h.logger.Infof("Refresh broadcast triggered by authenticated client %s", client.id)

		default:
			// Echo other message types back to the client
			client.SendMessage("echo", message.Content)
		}
	})
}

// HandleLogsConnection handles connections to the logs WebSocket endpoint
func (h *Handler) HandleLogsConnection(w http.ResponseWriter, r *http.Request) {
	// Check authentication
	authInfo := h.auth.GetAuthInfo(r)
	if !authInfo.Authenticated {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		h.logger.Warn("Unauthorized attempt to connect to logs WebSocket")
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error(err, "Failed to upgrade connection to WebSocket")
		return
	}

	// Create a new client with authentication status
	client := NewClient(h.logsHub, conn, h.logger, authInfo.Authenticated)

	// Register client with hub
	h.logsHub.Register(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	client.ReadPump(func(message models.WebSocketMessage, client *Client) {
		// Handle different message types
		switch message.Type {
		case "refresh":
			// Only authenticated clients can initiate refresh (already checked at connection time)
			h.alertsHub.BroadcastEvent("refresh", nil)
			h.logger.Infof("Refresh broadcast triggered by authenticated client %s", client.id)

		default:
			// Echo other message types back to the client
			client.SendMessage("echo", message.Content)
		}
	})
}
