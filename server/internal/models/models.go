package models

import (
	"encoding/json"
	"time"
)

// Alert represents a complete alert with agency information
type Alert struct {
	Agency Agency       `json:"agency"`
	Alert  AlertDetails `json:"alert"`
}

// Agency represents the agency information in an alert
type Agency struct {
	Name     string `json:"name"`
	ID       int    `json:"id"`
	Timezone string `json:"timezone"`
}

// AlertDetails represents the detailed alert information
type AlertDetails struct {
	ID                string   `json:"id"`
	City              *string  `json:"city,omitempty"`
	CoordinateSource  *string  `json:"coordinate_source,omitempty"`
	CrossStreet       *string  `json:"cross_street,omitempty"`
	CustomIdentifiers *string  `json:"custom_identifiers,omitempty"`
	Description       *string  `json:"description,omitempty"`
	Details           *string  `json:"details,omitempty"`
	DispatchCoords    *string  `json:"dispatch_coords,omitempty"`
	Lat               float64  `json:"lat,omitempty"`
	Lon               float64  `json:"lon,omitempty"`
	MapAddress        *string  `json:"map_address,omitempty"`
	MapCode           *string  `json:"map_code,omitempty"`
	Place             *string  `json:"place,omitempty"`
	Priority          *string  `json:"priority,omitempty"`
	Received          *string  `json:"received,omitempty"`
	Source            *string  `json:"source,omitempty"`
	State             *string  `json:"state,omitempty"`
	Unit              *string  `json:"unit,omitempty"`
	Units             *string  `json:"units,omitempty"`
	PageGroups        []string `json:"pagegroups,omitempty"`
	Stamp             float64  `json:"stamp,omitempty"`
	Status            string   `json:"status,omitempty"` // Added for internal tracking
}

// LogEntry represents a log entry in the system
type LogEntry struct {
	ID         string          `json:"id"`          // Unique identifier
	Type       string          `json:"type"`        // Log type: api_request, api_response, ws_message, ws_client, etc.
	Method     string          `json:"method"`      // HTTP method or WS direction (incoming/outgoing)
	Path       string          `json:"path"`        // API path or websocket endpoint
	Body       json.RawMessage `json:"body"`        // Request/response body
	Headers    json.RawMessage `json:"headers"`     // HTTP headers or metadata
	Timestamp  time.Time       `json:"timestamp"`   // When the event occurred
	SourceIP   string          `json:"source_ip"`   // Client IP or WebSocket client ID
	ClientID   string          `json:"client_id"`   // For WebSocket messages
	EventType  string          `json:"event_type"`  // For WebSocket events: new_alert, heartbeat, etc.
	Direction  string          `json:"direction"`   // incoming, outgoing
	Duration   *int64          `json:"duration_ms"` // Request duration in milliseconds (for API requests)
	StatusCode *int            `json:"status_code"` // HTTP status code (for API responses)
}

// WebSocketMessage represents a structured message for WebSocket communication
type WebSocketMessage struct {
	Type    string      `json:"type"`    // Message type (e.g., new_alert, ping, pong, heartbeat)
	Content interface{} `json:"content"` // Message payload
	ID      string      `json:"id"`      // Unique message ID
	Time    time.Time   `json:"time"`    // Message timestamp
}

// LogEntrySummary is a lightweight version of LogEntry without large fields like body and headers
type LogEntrySummary struct {
	ID         string    `json:"id"`                    // Unique identifier
	Type       string    `json:"type"`                  // Log type: api_request, api_response, ws_message, etc.
	Method     string    `json:"method"`                // HTTP method or WS direction
	Path       string    `json:"path"`                  // API path or websocket endpoint
	Timestamp  time.Time `json:"timestamp"`             // When the event occurred
	SourceIP   string    `json:"source_ip"`             // Client IP or WebSocket client ID
	ClientID   string    `json:"client_id"`             // For WebSocket messages
	EventType  string    `json:"event_type"`            // For WebSocket events: new_alert, heartbeat, etc.
	Direction  string    `json:"direction"`             // incoming, outgoing
	Duration   *int64    `json:"duration_ms,omitempty"` // Request duration in milliseconds
	StatusCode *int      `json:"status_code,omitempty"` // HTTP status code
}

// PaginatedResponse is a generic structure for paginated API responses
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Count      int         `json:"count"`   // Number of items in this response
	Total      int         `json:"total"`   // Total number of items available
	Limit      int         `json:"limit"`   // Items per page
	Offset     int         `json:"offset"`  // Current offset
	Filters    interface{} `json:"filters"` // Applied filters
	Sorting    interface{} `json:"sorting"` // Applied sorting
	NextOffset *int        `json:"next"`    // Next page offset if available
	PrevOffset *int        `json:"prev"`    // Previous page offset if available
}

// APIResponse is the standard API response structure
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}
