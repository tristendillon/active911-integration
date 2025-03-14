FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY server/go.mod server/go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY server/ ./

# Build the app
RUN go build -o server .

# Final image
FROM alpine:latest

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/server .

# Copy required configuration files if needed
COPY --from=builder /app/ssl /app/ssl

EXPOSE 8080

# Run the binary
CMD ["./server"]