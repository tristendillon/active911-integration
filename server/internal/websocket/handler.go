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
	dashboardHub *Hub
	clientHub    *Hub
	logsHub      *Hub
	upgrader     websocket.Upgrader
	auth         *auth.Authenticator
	logger       *logging.Logger
}

// NewHandler creates a new WebSocket handler
func NewHandler(dashboardHub, clientHub, logsHub *Hub, auth *auth.Authenticator, logger *logging.Logger) *Handler {
	// Initialize the upgrader
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all connections for development
		},
	}

	return &Handler{
		dashboardHub: dashboardHub,
		clientHub:    clientHub,
		logsHub:      logsHub,
		upgrader:     upgrader,
		auth:         auth,
		logger:       logger,
	}
}

// HandleDashboardConnection handles connections to the dashboard WebSocket endpoint
// This combines alerts and weather data into a single WebSocket connection
func (h *Handler) HandleDashboardConnection(w http.ResponseWriter, r *http.Request) {
	// Check authentication
	authInfo := h.auth.GetAuthInfo(r)
	h.logger.Infof("Dashboard WebSocket connection authentication status: %v, password provided: %v",
		authInfo.Authenticated, authInfo.Password != "")

	// Note: Authentication check is commented out to allow public access with redacted data
	// if !authInfo.Authenticated {
	// 	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	// 	h.logger.Warn("Unauthorized attempt to connect to dashboard WebSocket")
	// 	return
	// }

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error(err, "Failed to upgrade connection to WebSocket")
		return
	}

	// Create a new client with authentication status
	client := NewClient(h.dashboardHub, conn, h.logger, authInfo.Authenticated)
	
	// Add user agent to the client metadata
	client.userAgent = r.UserAgent()
	// Add remote address from the HTTP request
	if r.RemoteAddr != "" {
		client.remoteAddr = r.RemoteAddr
	}

	h.logger.Infof("New dashboard WebSocket client created with ID %s, authentication status: %v",
		client.id, client.isAuthenticated)

	// Register client with hub
	h.dashboardHub.Register(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	client.ReadPump(func(message models.WebSocketMessage, client *Client) {
		h.logger.Infof("Received message from dashboard client %s: %s", client.id, message.Type)
		// Handle different message types
		switch message.Type {
		default:
			// Echo other message types back to the client
			client.SendMessage("echo", message.Content)
		}
	})
}

// HandleClientConnection handles connections for client control operations
// Such as page refreshes or redirects
func (h *Handler) HandleClientConnection(w http.ResponseWriter, r *http.Request) {
	// Check authentication for sending commands (but allow connections for listening)
	authInfo := h.auth.GetAuthInfo(r)
	h.logger.Infof("Client WebSocket connection authentication status: %v, password provided: %v",
		authInfo.Authenticated, authInfo.Password != "")

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error(err, "Failed to upgrade connection to WebSocket")
		return
	}

	// Create a new client with authentication status
	client := NewClient(h.clientHub, conn, h.logger, authInfo.Authenticated)
	
	// Add user agent to the client metadata
	client.userAgent = r.UserAgent()
	// Add remote address from the HTTP request
	if r.RemoteAddr != "" {
		client.remoteAddr = r.RemoteAddr
	}
	
	h.logger.Infof("New client control WebSocket client created with ID %s, authentication status: %v",
		client.id, authInfo.Authenticated)

	// Register client with hub
	h.clientHub.Register(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	client.ReadPump(func(message models.WebSocketMessage, client *Client) {
		h.logger.Infof("Received message from client control %s: %s", client.id, message.Type)

		// Handle different message types
		switch message.Type {
		case "refresh":
			// Only authenticated clients can trigger refresh
			if !client.isAuthenticated {
				client.SendMessage("error", "Unauthorized: Authentication required to send refresh command")
				h.logger.Warnf("Unauthorized attempt to send refresh command by client %s", client.id)
				return
			}

			// Broadcast refresh to all clients, including unauthenticated ones
			h.clientHub.BroadcastEvent("refresh", nil)
			h.logger.Infof("Refresh broadcast triggered by authenticated client %s", client.id)

		case "redirect":
			// Only authenticated clients can trigger redirect
			if !client.isAuthenticated {
				client.SendMessage("error", "Unauthorized: Authentication required to send redirect command")
				h.logger.Warnf("Unauthorized attempt to send redirect command by client %s", client.id)
				return
			}

			// Broadcast redirect to all clients, including unauthenticated ones
			h.clientHub.BroadcastEvent("redirect", message.Content)
			h.logger.Infof("Redirect broadcast triggered by authenticated client %s", client.id)

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
	
	// Add user agent to the client metadata
	client.userAgent = r.UserAgent()
	// Add remote address from the HTTP request
	if r.RemoteAddr != "" {
		client.remoteAddr = r.RemoteAddr
	}

	// Register client with hub
	h.logsHub.Register(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	client.ReadPump(func(message models.WebSocketMessage, client *Client) {
		// Handle different message types
		switch message.Type {
		default:
			// Echo other message types back to the client
			client.SendMessage("echo", message.Content)
		}
	})
}

// GetConnectionCounts returns the connection counts for all hubs
func (h *Handler) GetConnectionCounts() map[string]int {
	counts := make(map[string]int)

	// Get counts from each hub
	counts[string(HubTypeDashboard)] = h.dashboardHub.ClientCount()
	counts[string(HubTypeClient)] = h.clientHub.ClientCount()
	counts[string(HubTypeLogs)] = h.logsHub.ClientCount()

	// Calculate total
	counts["total"] = counts[string(HubTypeDashboard)] + counts[string(HubTypeClient)] + counts[string(HubTypeLogs)]

	return counts
}

// GetLogConnectionDetails returns detailed information about active log connections
func (h *Handler) GetLogConnectionDetails() []models.ConnectionDetail {
	return h.getConnectionDetails(h.logsHub)
}

// GetDashboardConnectionDetails returns detailed information about active dashboard connections
func (h *Handler) GetDashboardConnectionDetails() []models.ConnectionDetail {
	return h.getConnectionDetails(h.dashboardHub)
}

// GetClientConnectionDetails returns detailed information about active client connections
func (h *Handler) GetClientConnectionDetails() []models.ConnectionDetail {
	return h.getConnectionDetails(h.clientHub)
}

// getConnectionDetails is a helper function to get detailed information about clients in a hub
func (h *Handler) getConnectionDetails(hub *Hub) []models.ConnectionDetail {
	if hub == nil {
		return []models.ConnectionDetail{}
	}
	
	// Get clients from the hub
	clients := hub.GetClients()
	details := make([]models.ConnectionDetail, 0, len(clients))
	
	// Convert each client to a ConnectionDetail
	for _, client := range clients {
		lastHeartbeat := &client.lastHeartbeat
		
		// If lastHeartbeat is zero time, don't include it
		if client.lastHeartbeat.IsZero() {
			lastHeartbeat = nil
		}
		
		detail := models.ConnectionDetail{
			ID:                client.id,
			ConnectedAt:       client.connectedAt,
			IsAuthenticated:   client.isAuthenticated,
			RemoteAddr:        client.remoteAddr,
			LastActivity:      client.lastActivity,
			MessagesSent:      client.messagesSent,
			MessagesReceived:  client.messagesReceived,
			UserAgent:         client.userAgent,
			Metadata:          client.metadata,
			LastHeartbeatSent: lastHeartbeat,
		}
		
		details = append(details, detail)
	}
	
	return details
}
