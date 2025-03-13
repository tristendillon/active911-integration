# Alerting API

A Go-based API/WebSocket server with Postgres database for alerting services.

## Features

- RESTful API with Gorilla Mux router
- WebSocket support for real-time communication
- PostgreSQL database integration
- Structured logging with zerolog
- Docker and Docker Compose setup
- Hot module reloading with Air
- Graceful shutdown handling
- Comprehensive request logging

## Requirements

- Go 1.22+
- Docker and Docker Compose
- Node.js 18+ (for Turbo)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and modify as needed
3. Install dependencies

```bash
go mod download
npm install
```

## Development

Start the development server with Turbo:

```bash
npm run dev
```

This will:
- Start PostgreSQL in Docker
- Start the Go API server with hot reloading via Air

## Testing the API

You can test the API with curl:

```bash
# Test the POST /api/log endpoint
curl -X POST -H "Content-Type: application/json" -d '{"message":"Hello, World!"}' http://localhost:8080/api/log

# Test the WebSocket endpoint (using websocat)
websocat ws://localhost:8080/ws
```

## Project Structure

```
/alerting
├── .air.toml            # Air configuration for hot reloading
├── .env.example         # Example environment variables
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile.dev       # Development Dockerfile
├── go.mod               # Go module definition
├── go.sum               # Go module checksums
├── main.go              # Main application entry point
├── package.json         # Turbo monorepo configuration
└── turbo.json           # Turbo pipeline configuration
```

## License

MIT