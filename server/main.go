package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/user/alerting/server/internal/api"
	"github.com/user/alerting/server/internal/auth"
	"github.com/user/alerting/server/internal/config"
	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/middleware"
	"github.com/user/alerting/server/internal/models"
	"github.com/user/alerting/server/internal/storage"
	"github.com/user/alerting/server/internal/websocket"
)

func main() {
	// Load .env file if it exists
	envFile := ".env"
	if err := godotenv.Load(envFile); err != nil {
		fmt.Printf("Warning: Error loading %s file: %v\n", envFile, err)
	} else {
		fmt.Printf("Successfully loaded environment from %s\n", envFile)
	}

	// Load configuration
	cfg := config.New()
	cfg.Initialize()

	// Setup logger
	logger := logging.New(cfg.Logging.Level, cfg.Logging.Format)
	logger.Info("Starting server...")

	// Connect to database
	db, err := connectToDatabase(cfg, logger)
	if err != nil {
		logger.Fatal(err, "Failed to connect to database")
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.Error(err, "Error closing database connection")
		}
	}()

	// Create storage
	store := storage.NewStorage(db)

	// Ensure database schema exists
	if err := store.EnsureSchema(context.Background()); err != nil {
		logger.Fatal(err, "Failed to ensure database schema")
	}

	// Create authenticator
	authenticator := auth.New(cfg.Auth.APIPassword, logger)

	// Initialize websocket hubs
	alertsHub := websocket.NewHub(websocket.HubTypeAlerts, logger)
	logsHub := websocket.NewHub(websocket.HubTypeLogs, logger)

	// Start the hubs
	go alertsHub.Run()
	go logsHub.Run()

	// Initialize router
	r := mux.NewRouter()
	r.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Setup middlewares
	loggerMiddleware := middleware.NewLogger(logger, func(logEntry models.LogEntry) error {
		return store.SaveLog(context.Background(), logEntry)
	}, func(eventType string, data interface{}) {
		// Broadcast log events to websocket clients
		logsHub.BroadcastEvent(eventType, data)
	})

	// Apply middleware to all routes
	r.Use(middleware.CORS(cfg.Server.CorsAllowedOrigins))
	r.Use(authenticator.Auth) // Authenticate API requests
	r.Use(loggerMiddleware.Logging)

	// Register API routes
	apiHandler := api.New(store, logger, func(eventType string, data interface{}) {
		// Broadcast API events to websocket clients
		alertsHub.BroadcastEvent(eventType, data)
	})
	apiHandler.RegisterRoutes(r)

	// Register WebSocket handlers
	wsHandler := websocket.NewHandler(alertsHub, logsHub, authenticator, logger)
	r.HandleFunc("/ws/alerts", wsHandler.HandleAlertsConnection)
	r.HandleFunc("/ws/logs", wsHandler.HandleLogsConnection)

	// Setup log message callback for both hubs
	logMessageCallback := func(message models.WebSocketMessage, source, clientID string) {
		saveWebSocketMessage(message, clientID, source, store, logger)
	}
	alertsHub.SetLogMessageCallback(logMessageCallback)
	logsHub.SetLogMessageCallback(logMessageCallback)

	// Setup HTTP server
	serverAddr := ":" + cfg.Server.Port
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in a goroutine
	go func() {
		logger.Infof("Server listening on %s", serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal(err, "Failed to start server")
		}
	}()

	// Set up graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Wait for interrupt signal
	<-quit
	logger.Info("Server is shutting down...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	// Shutdown server
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal(err, "Server forced to shutdown")
	}

	logger.Info("Server exited properly")
}

// connectToDatabase connects to the database
func connectToDatabase(cfg *config.Config, logger *logging.Logger) (*sql.DB, error) {
	// Get database connection string
	dsn := cfg.Database.DSN
	if dsn == "" {
		dsn = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			cfg.Database.Host,
			cfg.Database.Port,
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.Name,
			cfg.Database.SSLMode,
		)
	}

	logger.Infof("Connecting to database: %s", dsn)

	// Connect to database
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Set connection pool parameters
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Try to ping database up to 5 times to verify connection
	const maxRetries = 5
	var lastErr error

	for i := range maxRetries {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		lastErr = db.PingContext(ctx)
		cancel()

		if lastErr == nil {
			logger.Infof("Connected to database successfully after %d attempt(s)", i+1)
			return db, nil
		}

		logger.Warnf("Database connection attempt %d/%d failed: %v", i+1, maxRetries, lastErr)

		if i < maxRetries-1 {
			// Wait before retrying, with exponential backoff
			time.Sleep(time.Duration(1<<uint(i)) * time.Second)
		}
	}

	return nil, fmt.Errorf("failed to ping database after %d attempts: %w", maxRetries, lastErr)
}

// saveWebSocketMessage logs a WebSocket message to the database
func saveWebSocketMessage(message models.WebSocketMessage, clientID, direction string, store *storage.Storage, logger *logging.Logger) {
	// Marshal the WebSocket message for request body
	bodyJSON, err := json.Marshal(message)
	if err != nil {
		logger.Error(err, "Failed to marshal WebSocket message for logging")
		return
	}

	// Marshal headers for metadata
	headers := map[string][]string{
		"X-WebSocket-Message-Type": {message.Type},
		"X-WebSocket-Source":       {direction},
		"X-WebSocket-Client-ID":    {clientID},
	}
	headersJSON, err := json.Marshal(headers)
	if err != nil {
		logger.Error(err, "Failed to marshal WebSocket headers")
		headersJSON = []byte("{}")
	}

	// Create log entry with a timestamp-based suffix to ensure uniqueness
	now := time.Now()
	uniqueID := message.ID + "-" + now.Format("20060102150405.000000000")

	logEntry := models.LogEntry{
		ID:        uniqueID,
		Type:      "ws_message",
		Method:    "WEBSOCKET",
		Path:      "/ws",
		Body:      bodyJSON,
		Headers:   headersJSON,
		Timestamp: now,
		SourceIP:  clientID,
		ClientID:  clientID,
		EventType: message.Type,
		Direction: direction,
	}

	// Save log entry
	if err := store.SaveLog(context.Background(), logEntry); err != nil {
		logger.Error(err, "Failed to save WebSocket message log")
	}
}
