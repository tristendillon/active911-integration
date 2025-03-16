# CLAUDE.md - Project-wide settings for Claude Code

## Build/Run Commands
- Dev (all services): `pnpm dev` or `turbo dev`
- Dev PostgreSQL only: `pnpm dev:postgres`
- Dev Go API only: `pnpm dev:api`
- Dev Frontend only: `pnpm dev:frontend`
- Build: `pnpm build`
- Lint: `pnpm lint`

## Server-specific Commands
- Go build: `cd server && go build -o ./bin/server .`
- Go test: `cd server && go test ./...`
- Go lint: `cd server && npm run lint` or `cd server && golangci-lint run ./...`

## Frontend-specific Commands
- Next.js build: `cd frontend && npm run build`
- Next.js lint: `cd frontend && npm run lint`

## Dev Container
- Open in container: Use VS Code's "Reopen in Container" command
- Dev container includes:
  - Node.js 20
  - Go 1.22
  - Docker-in-Docker
  - PostgreSQL 16
  - Required VS Code extensions

## Project Structure
- `/frontend` - Next.js frontend application
- `/server` - Go API server with PostgreSQL database
- `/.devcontainer` - Dev container configuration