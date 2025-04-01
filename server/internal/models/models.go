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

// DeepCopyAlertPtr creates a deep copy of an Alert struct from a pointer
// and returns a new pointer to the copy
func DeepCopyAlertPtr(original *Alert) *Alert {
	if original == nil {
		return nil
	}

	copy := DeepCopyAlert(*original)
	return &copy
}

// DeepCopyAlert creates a deep copy of an Alert struct
func DeepCopyAlert(original Alert) Alert {
	// Create a new Alert
	copy := Alert{
		Agency: Agency{
			Name:     original.Agency.Name,
			ID:       original.Agency.ID,
			Timezone: original.Agency.Timezone,
		},
		Alert: AlertDetails{
			ID:     original.Alert.ID,
			Lat:    original.Alert.Lat,
			Lon:    original.Alert.Lon,
			Stamp:  original.Alert.Stamp,
			Status: original.Alert.Status,
		},
	}

	// Deep copy all pointer fields by creating new pointers with copied values
	if original.Alert.City != nil {
		city := *original.Alert.City
		copy.Alert.City = &city
	}

	if original.Alert.CoordinateSource != nil {
		coordinateSource := *original.Alert.CoordinateSource
		copy.Alert.CoordinateSource = &coordinateSource
	}

	if original.Alert.CrossStreet != nil {
		crossStreet := *original.Alert.CrossStreet
		copy.Alert.CrossStreet = &crossStreet
	}

	if original.Alert.CustomIdentifiers != nil {
		customIdentifiers := *original.Alert.CustomIdentifiers
		copy.Alert.CustomIdentifiers = &customIdentifiers
	}

	if original.Alert.Description != nil {
		description := *original.Alert.Description
		copy.Alert.Description = &description
	}

	if original.Alert.Details != nil {
		details := *original.Alert.Details
		copy.Alert.Details = &details
	}

	if original.Alert.DispatchCoords != nil {
		dispatchCoords := *original.Alert.DispatchCoords
		copy.Alert.DispatchCoords = &dispatchCoords
	}

	if original.Alert.MapAddress != nil {
		mapAddress := *original.Alert.MapAddress
		copy.Alert.MapAddress = &mapAddress
	}

	if original.Alert.MapCode != nil {
		mapCode := *original.Alert.MapCode
		copy.Alert.MapCode = &mapCode
	}

	if original.Alert.Place != nil {
		place := *original.Alert.Place
		copy.Alert.Place = &place
	}

	if original.Alert.Priority != nil {
		priority := *original.Alert.Priority
		copy.Alert.Priority = &priority
	}

	if original.Alert.Received != nil {
		received := *original.Alert.Received
		copy.Alert.Received = &received
	}

	if original.Alert.Source != nil {
		source := *original.Alert.Source
		copy.Alert.Source = &source
	}

	if original.Alert.State != nil {
		state := *original.Alert.State
		copy.Alert.State = &state
	}

	if original.Alert.Unit != nil {
		unit := *original.Alert.Unit
		copy.Alert.Unit = &unit
	}

	if original.Alert.Units != nil {
		units := *original.Alert.Units
		copy.Alert.Units = &units
	}

	// Deep copy slice
	if original.Alert.PageGroups != nil {
		copy.Alert.PageGroups = make([]string, len(original.Alert.PageGroups))
		for i, pg := range original.Alert.PageGroups {
			copy.Alert.PageGroups[i] = pg
		}
	}

	return copy
}
