# Build stage
FROM golang:1.24-alpine AS builder

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

# Expose the application port
EXPOSE 8080

# Set environment variables
ENV GIN_MODE=release

# Add diagnostics logging comment
# Please use https://aka.ms/linux-diagnostics to enable logging to see container logs here.

# Run the application
CMD ["/app/server"]
