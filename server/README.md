# Alert System API Server (Refactored)

This is a refactored implementation of the alerting API server that handles alerts and logs with WebSocket support.

## Features

- RESTful API for alert management
- WebSocket real-time updates for alerts and logs
- Comprehensive logging system
- Authentication support
- Email notifications for critical system errors
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

**Note**: For unauthenticated WebSocket clients, alert data in these events is automatically redacted to remove sensitive information, just like in the REST API. The redaction is based on the alert description and certain fields like medical details, addresses, and coordinates are redacted for privacy.

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

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=false  # Set to true to enable
EMAIL_SMTP_HOST=smtp.example.com   # Your SMTP server (e.g., smtp.gmail.com)
EMAIL_SMTP_PORT=587               # TLS port (587) or SSL port (465)
EMAIL_USERNAME=alerts@alertdashboard.com  # Email username
EMAIL_PASSWORD=your-secure-password      # Email password or app-specific password
EMAIL_FROM_ADDRESS=alerts@alertdashboard.com  # Sender address
EMAIL_TO_ADDRESSES=admin1@example.com,admin2@example.com  # Comma-separated list of recipients
EMAIL_MIN_LEVEL=error             # Minimum level to trigger email: "error" or "fatal"

# See /internal/notification/README.md for detailed SMTP and DMARC configuration
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
│   ├── notification/
│   │   ├── email.go          # Email notifications
│   │   ├── middleware.go     # Notification middleware
│   │   ├── service.go        # Notification service
│   │   └── README.md         # Notification documentation
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
