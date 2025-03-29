# Alerting System

A full-stack application with a Go backend API, NextJS frontend, and PostgreSQL database.

## Development with Dev Container

This project includes a dev container configuration for VS Code and GitHub Codespaces.

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [VS Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Getting Started

1. Open the project in VS Code
2. Click the green button in the bottom-left corner and select "Reopen in Container"
3. Wait for the container to build and initialize
4. Run `pnpm dev` to start all services

## Development without Dev Container

### Prerequisites

- Node.js 18+
- Go 1.22+
- Docker and Docker Compose
- pnpm

### Getting Started

1. Install dependencies: `pnpm install`
2. Start all services: `pnpm dev`

## Project Structure

- `/frontend` - Next.js frontend application
- `/server` - Go API server
  - `/internal` - Internal packages
  - `/db` - Database migrations and initialization scripts

## Available Scripts

From the root directory:

- `pnpm dev` - Start all services (Postgres, Go API, Next.js)
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages

## Accessing the Applications

- Frontend: http://localhost:3000
- API: http://localhost:8080
- PostgreSQL:
  - localhost:5432
  - host.docker.internal (in a dev container)


