# Stage 1: Build the Go application
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile the application to a statically linked binary (CGO disabled for maximum performance and portability)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server/main.go

# Stage 2: Final lightweight image
FROM alpine:latest

# Install basic dependencies (ca-certificates for HTTPS calls, curl for health checks)
RUN apk --no-cache add ca-certificates curl tzdata

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/server .

# Create the storage directory inside the container
RUN mkdir -p /app/storage

EXPOSE 3000

# Start the application
CMD ["./server"]
