package websocket

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/alerting/server/internal/auth"
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
// It also handles redaction of sensitive information for unauthenticated clients
func (h *Hub) BroadcastEvent(eventType string, content interface{}) {
	// Check if the content needs redaction
	// For alert related events, we need to check if it contains sensitive information
	if content != nil && (eventType == "new_alert" || eventType == "alert_deleted" || eventType == "alert_updated") {
		// Handle alert redaction
		if alert, ok := content.(models.Alert); ok {
			// Create the message with proper redaction
			h.broadcastRedactedAlert(eventType, alert)
			return
		}
	}

	// For other events, no redaction needed
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

// broadcastRedactedAlert sends a redacted version of an alert to clients that are not authenticated
func (h *Hub) broadcastRedactedAlert(eventType string, alert models.Alert) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Loop through all clients
	for client := range h.clients {
		// Get authentication info from the client - check if the client is authenticated
		isAuthenticated := client.isAuthenticated

		var msgContent any

		// If not authenticated, redact sensitive information
		if !isAuthenticated {
			// Use the auth package to redact the alert
			redactedAlert := auth.RedactAlertData(&alert, false)
			msgContent = redactedAlert
			h.logger.Infof("Sending redacted alert to unauthenticated client %s", client.id)
		} else {
			// Send the full alert to authenticated clients
			msgContent = alert
			h.logger.Debugf("Sending full alert to authenticated client %s", client.id)
		}

		// Create message for this specific client
		msg := models.WebSocketMessage{
			Type:    eventType,
			Content: msgContent,
			ID:      uuid.New().String(),
			Time:    time.Now(),
		}

		// Log the message if there's a callback
		if h.logMessageCallback != nil {
			h.logMessageCallback(msg, "server-broadcast", client.id)
		}

		// Send to the specific client
		select {
		case client.send <- msg:
		default:
			close(client.send)
			delete(h.clients, client)
			h.logger.Infof("Client %s removed due to send buffer full", client.id)
		}
	}
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

// // createRedactedAlert creates a redacted version of the alert for unauthenticated clients
// // This is similar to the auth.RedactAlertData function but implemented directly in the websocket package
// // to avoid circular dependencies
// func createRedactedAlert(alert *models.Alert) models.Alert {
// 	// Create a deep copy of the alert to avoid modifying the original
// 	redactedAlert := *alert // Copy the top level struct

// 	// Define fields that are always redacted regardless of description
// 	var alwaysRedactedFields = []string{
// 		"Details",
// 	}

// 	// Define fields that are redacted for sensitive alerts (based on description)
// 	var redactedFields = []string{
// 		"CrossStreet",
// 		"MapAddress",
// 		"Place",
// 		"DispatchCoords",
// 	}

// 	// Define descriptors that indicate a sensitive alert
// 	var redactedDescriptors = []string{
// 		"med",
// 	}

// 	// First determine if we need to redact sensitive fields based on the description
// 	needsRedaction := false

// 	// Check if Description is nil before dereferencing
// 	if alert.Alert.Description != nil {
// 		descriptor := *alert.Alert.Description
// 		for _, redactedDescriptor := range redactedDescriptors {
// 			if strings.Contains(strings.ToLower(descriptor), redactedDescriptor) {
// 				needsRedaction = true
// 				break
// 			}
// 		}
// 	}

// 	// Prepare the reflection to access fields
// 	alertValue := reflect.ValueOf(&redactedAlert.Alert).Elem()

// 	// Always redact the fields in alwaysRedactedFields regardless of description
// 	for _, field := range alwaysRedactedFields {
// 		fieldValue := alertValue.FieldByName(field)
// 		if fieldValue.IsValid() && fieldValue.CanSet() {
// 			// Handle different types of fields
// 			switch fieldValue.Kind() {
// 			case reflect.String:
// 				fieldValue.SetString("[Redacted]")
// 			case reflect.Ptr:
// 				// Handle string pointers
// 				if !fieldValue.IsNil() && fieldValue.Elem().Kind() == reflect.String {
// 					fieldValue.Elem().SetString("[Redacted]")
// 				}
// 			}
// 		}
// 	}

// 	// If no further redaction needed based on description, return the alert with just always-redacted fields
// 	if !needsRedaction {
// 		return redactedAlert
// 	}

// 	// Redact additional fields for sensitive alerts
// 	for _, field := range redactedFields {
// 		fieldValue := alertValue.FieldByName(field)
// 		if fieldValue.IsValid() && fieldValue.CanSet() {
// 			// Handle different types of fields
// 			switch fieldValue.Kind() {
// 			case reflect.String:
// 				fieldValue.SetString("[Redacted]")
// 			case reflect.Ptr:
// 				// Handle string pointers
// 				if !fieldValue.IsNil() && fieldValue.Elem().Kind() == reflect.String {
// 					fieldValue.Elem().SetString("[Redacted]")
// 				}
// 			}
// 		}
// 	}

// 	return redactedAlert
// }
