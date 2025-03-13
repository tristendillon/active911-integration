FROM golang:1.22

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum* ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

WORKDIR /app/server
EXPOSE 8080

CMD ["go run main.go"]