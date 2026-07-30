package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

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

	// Liveness endpoint for the container orchestrator. Notification delivery
	// is asynchronous, so it deliberately does not expose a public API.
	healthServer := &http.Server{
		Addr:              ":" + getEnv("PORT", "3002"),
		ReadHeaderTimeout: 5 * time.Second,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet && r.URL.Path == "/healthz" {
				w.WriteHeader(http.StatusOK)
				return
			}
			http.NotFound(w, r)
		}),
	}
	go func() {
		if err := healthServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Notification health server failed", "error", err)
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
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := healthServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("Notification health server shutdown failed", "error", err)
	}
	slog.Info("Notification Service stopped")
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
