package websocket

import (
	"bytes"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB

	// Time to send heartbeats to peers
	heartbeatPeriod = 30 * time.Second

	// Buffer size for the send channel
	sendBufferSize = 256
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

// Client represents a connected websocket client
type Client struct {
	hub             *Hub
	conn            *websocket.Conn
	send            chan models.WebSocketMessage
	id              string
	logger          *logging.Logger
	isAuthenticated bool // Track authentication status
}

// MessageHandler is a function that handles incoming messages
type MessageHandler func(message models.WebSocketMessage, client *Client)

// NewClient creates a new websocket client
func NewClient(hub *Hub, conn *websocket.Conn, logger *logging.Logger, isAuthenticated bool) *Client {
	clientID := uuid.New().String()

	return &Client{
		hub:             hub,
		conn:            conn,
		send:            make(chan models.WebSocketMessage, sendBufferSize),
		id:              clientID,
		logger:          logger.WithField("client_id", clientID),
		isAuthenticated: isAuthenticated,
	}
}

// ReadPump pumps messages from the websocket connection to the hub
func (c *Client) ReadPump(messageHandler MessageHandler) {
	defer func() {
		c.hub.Unregister(c)
		if err := c.conn.Close(); err != nil {
			c.logger.Error(err, "Error closing WebSocket connection")
		}
	}()

	c.conn.SetReadLimit(maxMessageSize)

	// Protocol-level ping handler
	c.conn.SetPingHandler(func(appData string) error {
		c.logger.Debug("Received protocol ping, sending protocol pong")
		err := c.conn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(writeWait))
		if err != nil {
			c.logger.Error(err, "Failed to send protocol pong")
		}

		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error(err, "Unexpected close error")
			}
			break
		}

		messageBytes = bytes.TrimSpace(bytes.Replace(messageBytes, newline, space, -1))

		// Parse the message
		var message models.WebSocketMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			// If we can't unmarshal, create a simple message with the raw data
			message = models.WebSocketMessage{
				Type:    "unknown",
				Content: string(messageBytes),
				ID:      uuid.New().String(),
				Time:    time.Now(),
			}
		}

		// Log the incoming message (except ping messages)
		if message.Type != "ping" {
			c.logger.Debugf("Received %s message from client", message.Type)

			// Log through the callback (except ping messages)
			if c.hub != nil && c.hub.logMessageCallback != nil {
				c.hub.logMessageCallback(message, "client", c.id)
			}
		}

		// Handle ping messages at application level
		if message.Type == "ping" {
			pongMessage := models.WebSocketMessage{
				Type:    "pong",
				Content: map[string]interface{}{"timestamp": time.Now().Unix()},
				ID:      uuid.New().String(),
				Time:    time.Now(),
			}

			c.send <- pongMessage
			continue
		}

		// Process the message with the handler
		if messageHandler != nil {
			messageHandler(message, c)
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection
func (c *Client) WritePump() {
	heartbeatTicker := time.NewTicker(heartbeatPeriod)
	defer func() {
		heartbeatTicker.Stop()
		if err := c.conn.Close(); err != nil {
			c.logger.Error(err, "Error closing WebSocket connection")
		}
	}()

	for {
		select {
		case message, ok := <-c.send:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				c.logger.Error(err, "Failed to set write deadline")
				return
			}

			if !ok {
				// The hub closed the channel
				if err := c.conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					c.logger.Error(err, "Failed to write close message")
				}
				return
			}

			// Marshal the message
			messageBytes, err := json.Marshal(message)
			if err != nil {
				c.logger.Error(err, "Failed to marshal message")
				continue
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			if _, err := w.Write(messageBytes); err != nil {
				c.logger.Error(err, "Failed to write message")
				return
			}

			// Add queued messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				nextMessage := <-c.send
				nextMessageBytes, err := json.Marshal(nextMessage)
				if err != nil {
					c.logger.Error(err, "Failed to marshal queued message")
					continue
				}

				if _, err := w.Write(newline); err != nil {
					c.logger.Error(err, "Failed to write newline")
					return
				}

				if _, err := w.Write(nextMessageBytes); err != nil {
					c.logger.Error(err, "Failed to write queued message")
					return
				}
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-heartbeatTicker.C:
			// Send heartbeat message
			c.logger.Debug("Sending heartbeat to client")
			heartbeat := models.WebSocketMessage{
				Type:    "heartbeat",
				Content: map[string]interface{}{"timestamp": time.Now().Unix()},
				ID:      uuid.New().String(),
				Time:    time.Now(),
			}

			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				c.logger.Error(err, "Failed to set write deadline for heartbeat")
				return
			}

			// Marshal and send the heartbeat
			heartbeatBytes, err := json.Marshal(heartbeat)
			if err != nil {
				c.logger.Error(err, "Failed to marshal heartbeat")
				continue
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, heartbeatBytes); err != nil {
				c.logger.Error(err, "Failed to send heartbeat")
				return
			}
		}
	}
}

// GetID returns the client's unique ID
func (c *Client) GetID() string {
	return c.id
}

// SendMessage sends a message to this client
func (c *Client) SendMessage(messageType string, content interface{}) {
	message := models.WebSocketMessage{
		Type:    messageType,
		Content: content,
		ID:      uuid.New().String(),
		Time:    time.Now(),
	}

	// Only log non-ping/pong/heartbeat messages
	if messageType != "ping" && messageType != "pong" && messageType != "heartbeat" {
		// Log the outgoing message
		c.logger.Debugf("Sending %s message to client", messageType)

		// Log through the callback
		if c.hub != nil && c.hub.logMessageCallback != nil {
			c.hub.logMessageCallback(message, "server", c.id)
		}
	}

	c.send <- message
}
