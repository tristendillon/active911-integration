package websocket

import (
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

// Client represents a connected websocket client
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	id   string
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mutex      sync.Mutex
}

// NewHub creates a new hub instance
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

// Run starts the hub and handles client operations
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Info().Str("client_id", client.id).Msg("Client registered with hub")
			
		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Info().Str("client_id", client.id).Msg("Client unregistered from hub")
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
					log.Info().Str("client_id", client.id).Msg("Client removed due to send buffer full")
				}
			}
			h.mutex.Unlock()
		}
	}
}

// Broadcast sends a message to all connected clients
func (h *Hub) Broadcast(message []byte) {
	h.broadcast <- message
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