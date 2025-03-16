# Alert System API Server (Refactored)

This is a refactored implementation of the alerting API server that handles alerts and logs with WebSocket support.

## Features

- RESTful API for alert management
- WebSocket real-time updates for alerts and logs
- Comprehensive logging system
- Authentication support
- Graceful shutdown
- Pagination, filtering, and sorting
- Separate endpoints for alerts and logs

## API Endpoints

### Alerts

- `GET /alerts` - List alerts with pagination and filtering
- `POST /alerts` - Create a new alert
- `GET /alerts/{id}` - Get a specific alert
- `DELETE /alerts/{id}` - Delete an alert

### Logs

- `GET /logs` - Get logs with filtering, pagination, and sorting

### WebSocket Endpoints

- `ws://host:port/ws/alerts` - WebSocket endpoint for alert events
- `ws://host:port/ws/logs` - WebSocket endpoint for log events

## WebSocket Events

### Alert Events

- `new_alert` - Sent when a new alert is created
- `alert_deleted` - Sent when an alert is deleted
- `ping`/`pong` - For client-initiated ping/pong
- `heartbeat` - Periodic server heartbeat (every 30 seconds)

### Log Events

- `new_log` - Sent when a new log entry is created
- `ping`/`pong` - For client-initiated ping/pong
- `heartbeat` - Periodic server heartbeat (every 30 seconds)

## Authentication

API authentication is done via a query parameter `password` or Bearer token in the `Authorization` header.

Example:

```
GET /alerts?password=your_api_password
```

or

```
GET /alerts
Authorization: Bearer your_api_password
```

The API password is set via the `API_PASSWORD` environment variable.

## Environment Variables

The server uses the following environment variables:

```
# Server configuration
SERVER_PORT=8080
SERVER_READ_TIMEOUT=15s
SERVER_WRITE_TIMEOUT=15s
SERVER_IDLE_TIMEOUT=60s
SERVER_SHUTDOWN_TIMEOUT=15s
CORS_ALLOWED_ORIGINS=*

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=alerting
DB_PASSWORD=alerting
DB_NAME=alerting
DB_SSL_MODE=require

# Authentication
API_PASSWORD=your_secure_password

# Logging
LOG_LEVEL=debug
LOG_FORMAT=console
REQUEST_LOGGING=true
```

## Project Structure

```
server/
├── cmd/
│   └── api/
│       └── main.go           # Main application entry point
├── internal/
│   ├── api/
│   │   └── handlers.go       # API handlers
│   ├── auth/
│   │   └── auth.go           # Authentication utilities
│   ├── config/
│   │   └── config.go         # Configuration management
│   ├── logging/
│   │   └── logger.go         # Logging utilities
│   ├── middleware/
│   │   └── middleware.go     # HTTP middleware
│   ├── models/
│   │   └── models.go         # Data models
│   ├── storage/
│   │   └── db.go             # Database operations
│   └── websocket/
│       ├── client.go         # WebSocket client
│       ├── handler.go        # WebSocket handler
│       └── hub.go            # WebSocket hub
├── README.md                 # Project documentation
```

## Running the Server

To run the server:

```bash
go run cmd/api/main.go
```

Or build and run:

```bash
go build -o bin/server cmd/api/main.go
./bin/server
```

## Database Schema

The server uses PostgreSQL and automatically creates the following tables:

- `alerts` - Stores alert information
- `logs` - Stores request and WebSocket logs

## Development

### Requirements

- Go 1.22+
- PostgreSQL 14+

### Building

```bash
go build -o bin/server cmd/api/main.go
```

### Testing

```bash
go test ./...
```
