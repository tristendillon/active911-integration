# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands
- Dev (all services): `pnpm dev` or `turbo dev`
- Dev PostgreSQL only: `pnpm dev:postgres`
- Dev Go API only: `pnpm dev:api`
- Dev Frontend only: `pnpm dev:frontend`
- Build: `pnpm build`
- Lint: `pnpm lint` (frontend: `cd frontend && npm run lint`, server: `cd server && npm run lint` or `cd server && golangci-lint run ./...`)
- Format: `cd frontend && npm run format`
- Go tests: `cd server && go test ./internal/...` (for a specific test: `cd server && go test ./internal/path/to/package -run TestName`)

## Code Style Guidelines
- **TypeScript/React**:
  - Use TypeScript strict mode
  - Import order: React, libraries, local modules
  - Use React functional components and hooks
  - Follow Next.js App Router conventions
  - Use Tailwind for styling through `cn()` utility
  - Prefer named exports
  - Use async/await for asynchronous code

- **Go**:
  - Follow standard Go conventions (gofmt)
  - Error handling: check errors and log appropriately
  - Use context for timeouts and cancellation
  - Struct initialization: use field names
  - Use pointers for nullable fields
  - Log errors using the logger service

## Project Structure
- `/frontend` - Next.js frontend application
- `/server` - Go API server with PostgreSQL database