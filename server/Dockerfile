FROM golang:1.22-alpine AS builder

WORKDIR /src

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server ./cmd/api

# Create a minimal image
FROM alpine:latest

# Install CA certificates for HTTPS connections
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /bin/server /app/server

# Copy any additional files needed at runtime
COPY .env.example /app/.env

# Expose the application port
EXPOSE 8080

# Run the application
CMD ["/app/server"]