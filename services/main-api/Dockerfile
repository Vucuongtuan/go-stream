FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates curl tzdata
WORKDIR /app
COPY --from=builder /app/server .
RUN mkdir -p /app/storage
EXPOSE 3000
CMD ["./server"]
