# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /src

# Install dependencies
RUN apk add --no-cache git

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server .

# Final image
FROM alpine:latest

# Install CA certificates for HTTPS connections
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the built server binary
COPY --from=builder /bin/server /app/server

# Copy .env file (ensure it exists at build time)
COPY .env /app/.env

# Expose the application port
EXPOSE 8080

# Set environment variables
ENV GIN_MODE=release

# Run the application
CMD ["/app/server"]
