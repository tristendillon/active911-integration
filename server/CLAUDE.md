# CLAUDE.md - Settings for Claude Code

## Build/Run Commands
- Dev: `npm run dev` (run with turbo)
- Build: `go build -o ./bin/server .`
- Test: `go test ./...`
- Lint: `golangci-lint run`
- Single test: `go test -v ./path/to/package -run TestName`

## Style Guidelines
- Go formatting: standard gofmt rules
- Error handling: use zerolog for structured logging
- Function naming: CamelCase
- Variable naming: camelCase for locals, CamelCase for exports
- Imports: grouped standard, 3rd party, project
- Postgres: use sql.DB with prepared statements
- Logging: use zerolog with structured fields

## Project Structure
- Main server logic in main.go
- Database access via standard lib/pq
- Environment vars loaded via godotenv
- Docker deployed with multi-stage builds
- All request logs saved to request.log