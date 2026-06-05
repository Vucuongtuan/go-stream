package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"go-stream/services/notification-service/internal/consumer"
	"go-stream/services/notification-service/internal/notifier"
)

func main() {
	// Setup structured logger
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	handler := slog.NewJSONHandler(os.Stdout, opts)
	logger := slog.New(handler)
	slog.SetDefault(logger)

	brokers := getEnv("KAFKA_BROKERS", "localhost:9092")
	brokerList := strings.Split(brokers, ",")

	slog.Info("🟠 Notification Service starting", "brokers", brokers)

	// Create notifier (starts with console logging, can add email/push later)
	n := notifier.NewConsoleNotifier()

	// Create and start Kafka consumer
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	topics := []string{"stream-events", "user-events", "chat-events"}
	c := consumer.NewKafkaConsumer(brokerList, "notification-service-group", topics, n)

	go func() {
		if err := c.Start(ctx); err != nil {
			slog.Error("Consumer error", "error", err)
		}
	}()

	slog.Info("🟠 Notification Service started", "topics", topics)

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	fmt.Println("\n🛑 Shutting down Notification Service...")
	cancel()
	c.Close()
	slog.Info("Notification Service stopped")
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
