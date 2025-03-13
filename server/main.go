package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/user/alerting/internal/api"
	"github.com/user/alerting/internal/storage"
	webSocketClient "github.com/user/alerting/internal/websocket"
)

var (
	db     *sql.DB
	logger zerolog.Logger
	logMu  sync.Mutex
	reqLog *os.File
)

// RequestData stores request information for logging
type RequestData struct {
	ID        string          `json:"id"` // Unique request ID for correlation
	Method    string          `json:"method"`
	Path      string          `json:"path"`
	Body      json.RawMessage `json:"body"`
	Headers   http.Header     `json:"headers"`
	Timestamp time.Time       `json:"timestamp"`
	SourceIP  string          `json:"source_ip"`
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found, using defaults")
	}

	setupLogger()

	// Set up request log file
	var err error
	reqLog, err = os.OpenFile("request.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to open request log file")
	} else {
		log.Debug().Str("path", "request.log").Msg("Successfully opened request log file")
	}
	defer reqLog.Close()

	// Connect to database
	connectDB()
	defer db.Close()

	// Create storage instance
	store := storage.NewStorage(db)

	// Create router
	r := mux.NewRouter()

	// Apply middleware
	r.Use(corsMiddleware)
	r.Use(loggingMiddleware)

	// Create and start WebSocket hub
	hub := webSocketClient.NewHub()
	go hub.Run()

	// Set up API handlers and routes with WebSocket hub
	apiHandler := api.NewHandler(store, hub)
	apiHandler.RegisterRoutes(r)

	// Set up websocket routes with our new handler
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocketConnection(w, r, hub)
	})

	// Set up server
	port := flag.String("port", "8080", "port to run the server on")
	flag.Parse()

	srv := &http.Server{
		Addr:         ":" + *port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run server in a goroutine so that it doesn't block
	go func() {
		log.Info().Msgf("Starting server on port %s", *port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed to start")
		}
	}()

	// Set up graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	// Block until we receive a signal
	<-c

	// Create a deadline to wait for
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Doesn't block if no connections, but will otherwise wait
	// until the timeout deadline
	log.Info().Msg("Shutting down server...")
	srv.Shutdown(ctx)
	log.Info().Msg("Server gracefully stopped")
}

func setupLogger() {
	// Configure zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix

	// Set debug level to see more logs during development
	zerolog.SetGlobalLevel(zerolog.DebugLevel)

	// Set up console writer
	consoleWriter := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}

	// Create multi-writer for console and file
	logger = zerolog.New(consoleWriter).With().Timestamp().Logger()

	// Set as global logger
	log.Logger = logger

	log.Debug().Msg("Logger initialized at debug level")
}

func connectDB() {
	// Get database connection details from environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "alerting")

	// Build connection string
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	// Connect to database
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}

	// Check connection
	err = db.Ping()
	if err != nil {
		log.Warn().Err(err).Msg("Could not establish database connection")
	} else {
		log.Info().Msg("Database connection established")
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// CORS middleware to allow all origins
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Pass to the next middleware/handler
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		type contextKey string
		// Generate a unique request ID
		requestID := uuid.New().String()

		// Add request ID to context
		ctx := context.WithValue(r.Context(), contextKey("requestID"), requestID)
		r = r.WithContext(ctx)

		// Add request ID to response headers
		w.Header().Set("X-Request-ID", requestID)

		// Log request with request ID
		log.Info().
			Str("request_id", requestID).
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Str("remote_addr", r.RemoteAddr).
			Msg("Request received")

		// Create a copy of the request body so we can read it
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			log.Error().Err(err).Msg("Failed to read request body")
			http.Error(w, "Failed to read request body", http.StatusInternalServerError)
			return
		}

		// Create a new ReadCloser to replace the original body
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		// Create a safe JSON representation of the body
		var safeBodyJSON json.RawMessage
		if len(bodyBytes) > 0 {
			// Try to validate if the body is proper JSON
			if json.Valid(bodyBytes) {
				safeBodyJSON = bodyBytes
			} else {
				// If not valid JSON, create a JSON string with the body content
				safeBodyJSON, _ = json.Marshal(string(bodyBytes))
			}
		} else {
			// Empty body case
			safeBodyJSON = json.RawMessage([]byte("null"))
		}

		// Call the next handler
		next.ServeHTTP(w, r)

		reqData := RequestData{
			ID:        requestID,
			Method:    r.Method,
			Path:      r.URL.Path,
			Body:      safeBodyJSON,
			Headers:   r.Header,
			Timestamp: time.Now(),
			SourceIP:  r.RemoteAddr,
		}

		logRequestData(reqData)

		// Log response time with request ID
		log.Info().
			Str("request_id", requestID).
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Dur("elapsed_ms", time.Since(start)).
			Msg("Request processed")
	})
}

func logRequestData(reqData RequestData) {
	// Thread-safe logging to file
	logMu.Lock()
	defer logMu.Unlock()

	logJSON, err := json.Marshal(reqData)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal request data for logging")
		return
	}

	// Log to console for debugging
	log.Debug().Str("request_id", reqData.ID).Msg("Writing request to log file")

	// Write to log file
	_, err = reqLog.Write(logJSON)
	if err != nil {
		log.Error().Err(err).Msg("Failed to write to request log file")
		return
	}

	_, err = reqLog.Write([]byte("\n"))
	if err != nil {
		log.Error().Err(err).Msg("Failed to write newline to request log file")
	}

	// Flush the file to make sure it's written
	reqLog.Sync()
}

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections for development
	},
}

func handleWebSocketConnection(w http.ResponseWriter, r *http.Request, hub *webSocketClient.Hub) {
	// Upgrade HTTP connection to WebSocket
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("Failed to upgrade connection to WebSocket")
		return
	}

	// Create new client for this connection
	client := webSocketClient.NewClient(hub, conn)

	// Register the client with the hub
	hub.Register(client)

	// Start client's message writing pump
	go client.WritePump()

	// Handle incoming messages
	client.ReadPump(func(message []byte, c *webSocketClient.Client) {
		// Process the received message
		var jsonBody interface{}
		if err := json.Unmarshal(message, &jsonBody); err != nil {
			// If it's not valid JSON, use string as body
			jsonBody = string(message)
		}

		// Generate a unique request ID for the WebSocket message
		requestID := uuid.New().String()

		// Create request data
		reqData := RequestData{
			ID:        requestID,
			Method:    "WEBSOCKET",
			Path:      r.URL.Path,
			Body:      json.RawMessage(message),
			Headers:   r.Header,
			Timestamp: time.Now(),
			SourceIP:  conn.RemoteAddr().String(),
		}

		// Log and store the message with request ID
		logJSON, _ := json.MarshalIndent(reqData, "", "  ")
		log.Info().
			Str("request_id", requestID).
			Str("client_id", c.GetID()).
			RawJSON("websocket_data", logJSON).
			Msg("WebSocket message received")
		logRequestData(reqData)

		// Echo the message back to the client
		c.SendMessage("echo", jsonBody)
	})
}
