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

	// Register client with hub
	h.alertsHub.Register(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	client.ReadPump(func(message models.WebSocketMessage, client *Client) {
		// Echo the message back to the client
		client.SendMessage("echo", message.Content)
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
		// Echo the message back to the client
		client.SendMessage("echo", message.Content)
	})
}
