package websocket

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
)

// HubType represents different WebSocket hub types (alerts, logs)
type HubType string

const (
	// HubTypeAlerts is for alert messages
	HubTypeAlerts HubType = "alerts"
	// HubTypeLogs is for log messages
	HubTypeLogs HubType = "logs"
)

// LogMessageCallback is a function that logs websocket messages
type LogMessageCallback func(message models.WebSocketMessage, source string, clientID string)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients            map[*Client]bool
	broadcast          chan models.WebSocketMessage
	register           chan *Client
	unregister         chan *Client
	mutex              sync.Mutex
	logMessageCallback LogMessageCallback
	logger             *logging.Logger
	hubType            HubType
}

// NewHub creates a new hub instance
func NewHub(hubType HubType, logger *logging.Logger) *Hub {
	return &Hub{
		broadcast:  make(chan models.WebSocketMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		logger:     logger,
		hubType:    hubType,
	}
}

// SetLogMessageCallback sets the callback for logging WebSocket messages
func (h *Hub) SetLogMessageCallback(callback LogMessageCallback) {
	h.logMessageCallback = callback
}

// Run starts the hub and handles client operations
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			h.logger.Infof("Client %s registered with %s hub", client.id, h.hubType)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.logger.Infof("Client %s unregistered from %s hub", client.id, h.hubType)
			}
			h.mutex.Unlock()

		case message := <-h.broadcast:
			h.mutex.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
					h.logger.Infof("Client %s removed due to send buffer full", client.id)
				}
			}
			h.mutex.Unlock()
		}
	}
}

// BroadcastEvent creates and sends a structured event message to all clients
func (h *Hub) BroadcastEvent(eventType string, content interface{}) {
	// Create the message
	msg := models.WebSocketMessage{
		Type:    eventType,
		Content: content,
		ID:      uuid.New().String(),
		Time:    time.Now(),
	}

	// Log the message if there's a callback
	if h.logMessageCallback != nil && eventType != "new_log" {
		h.logMessageCallback(msg, "server-broadcast", "all")
	}

	// Send the message to all clients
	h.logger.Debugf("Broadcasting %s event to all clients on %s hub", eventType, h.hubType)
	h.broadcast <- msg
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	return len(h.clients)
}

// Register adds a client to the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// GetType returns the hub type
func (h *Hub) GetType() HubType {
	return h.hubType
}
