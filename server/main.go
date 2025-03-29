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
	"github.com/user/alerting/server/internal/notification"
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
	logger.Info("Config")
	logger.Infof("AUTH: %v", cfg.Auth.APIPassword)
	logger.Infof("HOST: %v", cfg.Database.Host)
	logger.Infof("NAME: %v", cfg.Database.Name)
	logger.Infof("USER: %v", cfg.Database.User)
	logger.Infof("PASSWORD: %v", cfg.Database.Password)
	logger.Infof("PORT: %v", cfg.Database.Port)
	logger.Infof("SSL: %v", cfg.Database.SSLMode)
	logger.Infof("DSN: %v", cfg.Database.DSN)
	logger.Infof("LOGGING: %v", cfg.Logging)
	logger.Infof("CORS: %v", cfg.Server.CorsAllowedOrigins)
	logger.Infof("PORT: %v", cfg.Server.Port)
	logger.Infof("IDLE TIMEOUT: %v", cfg.Server.IdleTimeout)
	logger.Infof("READ TIMEOUT: %v", cfg.Server.ReadTimeout)
	logger.Infof("SHUTDOWN TIMEOUT: %v", cfg.Server.ShutdownTimeout)
	logger.Infof("WRITE TIMEOUT: %v", cfg.Server.WriteTimeout)
	logger.Infof("EMAIL NOTIFICATIONS: %v", cfg.Notification.Email.Enabled)
	
	// Setup notification service
	notifyService := notification.NewService(cfg.Notification, logger)
	logger.Info("Notification service initialized")

	logger.Info("Starting server...")

	// Connect to database
	db, err := connectToDatabase(cfg, logger)
	if err != nil {
		notifyService.NotifyFatal(err, "Failed to connect to database")
		logger.Fatal(err, "Failed to connect to database")
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.Error(err, "Error closing database connection")
		}
	}()

	// Create notification middleware
	notifier := notification.NewStorageNotifier(notifyService)
	
	// Create storage
	store := storage.NewStorage(db)

	// Ensure database schema exists
	err = notifier.WithNotifications(context.Background(), "schema initialization", func(ctx context.Context) error {
		return store.EnsureSchema(ctx)
	})
	if err != nil {
		notifyService.NotifyFatal(err, "Failed to ensure database schema")
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
		// Use the notifier to catch critical errors when saving logs
		return notifier.WithNotifications(context.Background(), "save log entry", func(ctx context.Context) error {
			return store.SaveLog(ctx, logEntry)
		})
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

	// Create a logger callback that can use the notifier
	logMessageCallback := func(message models.WebSocketMessage, source, clientID string) {
		// Create a log entry
		bodyJSON, err := json.Marshal(message)
		if err != nil {
			logger.Error(err, "Failed to marshal WebSocket message for logging")
			return
		}
		
		// Marshal headers for metadata
		headers := map[string][]string{
			"X-WebSocket-Message-Type": {message.Type},
			"X-WebSocket-Source":       {source},
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
			Direction: source,
		}
		
		// Save log with notification for critical errors
		if err := notifier.WithNotifications(context.Background(), "save websocket log", func(ctx context.Context) error {
			return store.SaveLog(ctx, logEntry)
		}); err != nil {
			logger.Error(err, "Failed to save WebSocket message log")
		}
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
		notifyService.NotifyFatal(err, "Server forced to shutdown")
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

