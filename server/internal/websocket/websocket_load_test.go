package websocket_test

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/user/alerting/server/internal/auth"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
	ws "github.com/user/alerting/server/internal/websocket"
)

// TestWebSocketLoad tests the WebSocket system under load with many connections
func TestWebSocketLoad(t *testing.T) {
	// Config
	const numConnections = 10000
	const numAlerts = 100
	const connectionTimeout = 10 * time.Second
	const messageTimeout = 30 * time.Second

	// Create a logger
	logger := logging.New("debug", "websocket_load_test")

	// Create authentication service (no auth required for this test)
	authenticator := auth.New("", logger)

	// Create the hubs
	dashboardHub := ws.NewHub(ws.HubTypeDashboard, logger)
	clientHub := ws.NewHub(ws.HubTypeClient, logger)
	logsHub := ws.NewHub(ws.HubTypeLogs, logger)

	// Start the hubs
	go dashboardHub.Run()
	go clientHub.Run()
	go logsHub.Run()

	// Create the WebSocket handler
	handler := ws.NewHandler(dashboardHub, clientHub, logsHub, authenticator, logger)

	// Create HTTP router
	router := mux.NewRouter()
	router.HandleFunc("/ws/dashboard", handler.HandleDashboardConnection)
	router.HandleFunc("/ws/client", handler.HandleClientConnection)
	router.HandleFunc("/ws/logs", handler.HandleLogsConnection)

	// Create test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Convert http to ws URL
	wsURL := strings.Replace(server.URL, "http", "ws", 1)
	dashboardURL := wsURL + "/ws/dashboard"

	// Keep track of alerts received by each client
	receivedAlertsLock := sync.Mutex{}
	receivedAlerts := make(map[string]map[string]bool) // clientID -> alertID -> received

	// WaitGroup to track connection setup and alert reception
	var wg sync.WaitGroup
	var connectionWg sync.WaitGroup

	// Create connections and track received alerts
	clients := make([]*websocket.Conn, 0, numConnections)
	clientIDs := make([]string, 0, numConnections)

	fmt.Printf("Creating %d WebSocket connections...\n", numConnections)
	connectionWg.Add(numConnections)

	for i := 0; i < numConnections; i++ {
		go func(connID int) {
			defer connectionWg.Done()

			// Connect to WebSocket server
			conn, _, err := websocket.DefaultDialer.Dial(dashboardURL, nil)
			if err != nil {
				t.Errorf("Failed to connect client %d: %v", connID, err)
				return
			}

			clientID := fmt.Sprintf("client-%d", connID)

			// Add client to tracking
			receivedAlertsLock.Lock()
			clients = append(clients, conn)
			clientIDs = append(clientIDs, clientID)
			receivedAlerts[clientID] = make(map[string]bool)
			receivedAlertsLock.Unlock()

			// Set up a goroutine to read messages from this connection
			wg.Add(1)
			go func(conn *websocket.Conn, clientID string) {
				defer wg.Done()

				for {
					// Read message
					_, message, err := conn.ReadMessage()
					if err != nil {
						// If connection is closed, don't report error
						if !strings.Contains(err.Error(), "websocket: close") {
							t.Logf("Read error on client %s: %v", clientID, err)
						}
						return
					}

					// Parse message
					var wsMessage models.WebSocketMessage
					if err := json.Unmarshal(message, &wsMessage); err != nil {
						t.Logf("Failed to unmarshal message on client %s: %v", clientID, err)
						continue
					}

					// Only track alert messages
					if wsMessage.Type == "new_alert" {
						// Extract alert
						alertBytes, err := json.Marshal(wsMessage.Content)
						if err != nil {
							t.Logf("Failed to marshal alert on client %s: %v", clientID, err)
							continue
						}

						var alert models.Alert
						if err := json.Unmarshal(alertBytes, &alert); err != nil {
							t.Logf("Failed to unmarshal alert on client %s: %v", clientID, err)
							continue
						}

						// Record this alert as received
						receivedAlertsLock.Lock()
						receivedAlerts[clientID][alert.Alert.ID] = true
						receivedAlertsLock.Unlock()
					}
				}
			}(conn, clientID)
		}(i)
	}

	// Wait for connections to be established
	connectionWg.Wait()
	time.Sleep(1 * time.Second) // Allow connections to stabilize

	// Verify all connections succeeded
	receivedAlertsLock.Lock()
	actualConnections := len(clients)
	receivedAlertsLock.Unlock()

	if actualConnections != numConnections {
		t.Errorf("Failed to establish all connections. Expected %d, got %d", numConnections, actualConnections)
	} else {
		fmt.Printf("Successfully established %d WebSocket connections\n", actualConnections)
	}

	// Generate and broadcast alerts
	fmt.Printf("Broadcasting %d test alerts...\n", numAlerts)
	alertIDs := make([]string, numAlerts)

	for i := 0; i < numAlerts; i++ {
		alertID := fmt.Sprintf("test-alert-%d", i)
		alertIDs[i] = alertID

		// Create test alert
		alert := models.Alert{
			Agency: models.Agency{
				Name:     "Test Agency",
				ID:       123,
				Timezone: "UTC",
			},
			Alert: models.AlertDetails{
				ID:          alertID,
				Description: stringPtr(fmt.Sprintf("Test Alert %d", i)),
				Lat:         42.123,
				Lon:         -71.456,
				Stamp:       float64(time.Now().Unix()),
				Status:      "new",
			},
		}

		// Broadcast the alert
		dashboardHub.BroadcastEvent("new_alert", alert)

		// Small delay between alerts
		time.Sleep(100 * time.Millisecond)
	}

	// Wait for all alerts to be processed
	fmt.Println("Waiting for alerts to be processed...")
	time.Sleep(5 * time.Second)

	// Close all WebSocket connections
	fmt.Println("Closing all WebSocket connections...")
	for _, conn := range clients {
		conn.Close()
	}

	// Wait for all goroutines to finish
	fmt.Println("Waiting for all client goroutines to finish...")
	wg.Wait()

	// Calculate statistics
	fmt.Println("\nResults:")

	// Gather stats
	totalExpectedAlerts := numConnections * numAlerts
	totalReceivedAlerts := 0
	fullyReceivedClients := 0

	receivedAlertsLock.Lock()
	defer receivedAlertsLock.Unlock()

	for clientID, alerts := range receivedAlerts {
		clientAlerts := 0
		for _, received := range alerts {
			if received {
				clientAlerts++
				totalReceivedAlerts++
			}
		}

		if clientAlerts == numAlerts {
			fullyReceivedClients++
		} else {
			t.Logf("Client %s received %d/%d alerts", clientID, clientAlerts, numAlerts)
		}
	}

	successRate := float64(totalReceivedAlerts) * 100 / float64(totalExpectedAlerts)
	clientSuccessRate := float64(fullyReceivedClients) * 100 / float64(numConnections)

	// Report overall results
	fmt.Printf("Total alerts sent: %d\n", numAlerts)
	fmt.Printf("Total connections: %d\n", numConnections)
	fmt.Printf("Clients receiving all alerts: %d/%d (%.2f%%)\n",
		fullyReceivedClients, numConnections, clientSuccessRate)
	fmt.Printf("Total alerts received: %d/%d (%.2f%%)\n",
		totalReceivedAlerts, totalExpectedAlerts, successRate)

	// Test passes if all clients received all alerts
	if fullyReceivedClients != numConnections {
		t.Errorf("Not all clients received all alerts. Only %d/%d clients (%.2f%%) received all alerts",
			fullyReceivedClients, numConnections, clientSuccessRate)
	} else {
		fmt.Println("✅ SUCCESS: All clients received all alerts")
	}
}

// Helper to create string pointers
func stringPtr(s string) *string {
	return &s
}
