package websocket

import (
	"bytes"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024 // 512KB

	// Send heartbeat messages to peer with this period.
	heartbeatPeriod = 30 * time.Second
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

// Message represents a data structure for messages sent over websocket
type Message struct {
	Type    string    `json:"type"`
	Content any       `json:"content"`
	ID      string    `json:"id"`
	Time    time.Time `json:"time"`
}

// NewClient creates a new websocket client
func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	clientID := uuid.New().String()

	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
		id:   clientID,
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump(messageHandler func([]byte, *Client)) {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	
	// Set up a ping handler - when client sends ping, server responds with pong
	c.conn.SetPingHandler(func(appData string) error {
		log.Debug().Str("client_id", c.id).Msg("Received ping from client, sending pong")
		err := c.conn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(writeWait))
		if err != nil {
			log.Error().Err(err).Str("client_id", c.id).Msg("Failed to send pong")
		}
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error().Err(err).Str("client_id", c.id).Msg("Unexpected close error")
			}
			break
		}

		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))

		// Process "ping" messages from client for manual ping/pong (in addition to protocol-level)
		var msgData map[string]interface{}
		if json.Unmarshal(message, &msgData) == nil {
			if msgType, ok := msgData["type"].(string); ok && msgType == "ping" {
				log.Debug().Str("client_id", c.id).Msg("Received application ping, sending pong")
				pongMsg := Message{
					Type:    "pong",
					Content: map[string]interface{}{"timestamp": time.Now().Unix()},
					ID:      uuid.New().String(),
					Time:    time.Now(),
				}
				
				data, err := json.Marshal(pongMsg)
				if err == nil {
					c.send <- data
				} else {
					log.Error().Err(err).Str("client_id", c.id).Msg("Failed to marshal pong message")
				}
				continue
			}
		}

		// Call the message handler if provided
		if messageHandler != nil {
			messageHandler(message, c)
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	heartbeatTicker := time.NewTicker(heartbeatPeriod)
	defer func() {
		heartbeatTicker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-heartbeatTicker.C:
			// Send a heartbeat message that clients can process
			log.Debug().Str("client_id", c.id).Msg("Sending heartbeat to client")
			heartbeat := Message{
				Type:    "heartbeat",
				Content: map[string]interface{}{"timestamp": time.Now().Unix()},
				ID:      uuid.New().String(),
				Time:    time.Now(),
			}
			data, err := json.Marshal(heartbeat)
			if err != nil {
				log.Error().Err(err).Str("client_id", c.id).Msg("Failed to marshal heartbeat")
				continue
			}
			
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Error().Err(err).Str("client_id", c.id).Msg("Failed to send heartbeat")
				return
			}
		}
	}
}

// GetID returns the client's unique ID
func (c *Client) GetID() string {
	return c.id
}

// SendMessage sends a structured message to this client
func (c *Client) SendMessage(msgType string, content interface{}) error {
	msg := Message{
		Type:    msgType,
		Content: content,
		ID:      uuid.New().String(),
		Time:    time.Now(),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	c.send <- data
	return nil
}