package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"go-stream/services/analytics-service/internal/consumer"
	"go-stream/services/analytics-service/internal/handler"
	"go-stream/services/analytics-service/internal/repository"
)

func main() {
	// 1. Initialize custom structured JSON Logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	slog.Info("📈 Analytics Service is starting...")

	// 2. Load configurations from environments
	redisAddr := fmt.Sprintf("%s:%s", getEnv("REDIS_HOST", "localhost"), getEnv("REDIS_PORT", "6379"))
	redisPassword := getEnv("REDIS_PASSWORD", "")
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9092")
	port := getEnv("PORT", "3003")

	// 3. Connect to Redis DB
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       0,
	})

	// Perform health check on Redis
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Error("Failed to connect to Redis", "err", err, "addr", redisAddr)
		os.Exit(1)
	}
	slog.Info("Connected to Redis successfully", "addr", redisAddr)

	// 4. Set up architecture components
	analyticsRepo := repository.NewRedisAnalyticsRepository(rdb)
	leaderboardRepo := repository.NewRedisLeaderboardRepository(rdb)
	roomStatsRepo := repository.NewRedisRoomStatsRepository(rdb)

	analyticsHandler := handler.NewAnalyticsHandler(analyticsRepo, leaderboardRepo, roomStatsRepo)

	// 5. Initialize and run HTTP server using native net/http multiplexer
	mux := http.NewServeMux()

	// --- Room real-time stats ---
	mux.HandleFunc("GET /api/analytics/rooms/{roomId}", analyticsHandler.GetRoomStats)
	mux.HandleFunc("GET /api/analytics/rooms/{roomId}/donors", analyticsHandler.GetRoomTopDonors)
	mux.HandleFunc("GET /api/analytics/rooms/{roomId}/chatters", analyticsHandler.GetRoomTopChatters)

	// --- Global leaderboards ---
	mux.HandleFunc("GET /api/analytics/leaderboard/streamers", analyticsHandler.GetLeaderboard)
	mux.HandleFunc("GET /api/analytics/leaderboard/streamers/{streamerId}", analyticsHandler.GetStreamerRank)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      loggerMiddleware(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// 6. Initialize Kafka Consumer
	// Subscribe to stream-events, chat-events, and the new donation-events topic
	topics := []string{"stream-events", "chat-events", "donation-events"}
	kafkaConsumer := consumer.NewServiceConsumer(
		kafkaBrokers,
		"analytics-service-group",
		topics,
		analyticsRepo,
		leaderboardRepo,
		roomStatsRepo,
	)

	// Application runtime context
	appCtx, appCancel := context.WithCancel(context.Background())
	defer appCancel()

	// Launch Kafka consumer running asynchronously in a goroutine
	go func() {
		slog.Info("Starting Kafka consumer worker loop")
		if err := kafkaConsumer.Start(appCtx); err != nil {
			slog.Error("Kafka consumer loop error occurred", "err", err)
		}
	}()

	// Launch HTTP Server asynchronously in a goroutine
	go func() {
		slog.Info("HTTP Server is listening", "port", port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("HTTP server failed to start", "err", err)
			os.Exit(1)
		}
	}()

	// 7. Handle Graceful Shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	slog.Info("🛑 Shutting down Analytics Service gracefully...")

	// Terminate background contexts
	appCancel()
	kafkaConsumer.Close()

	// Timeout context for HTTP server shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("Failed to shutdown HTTP server cleanly", "err", err)
	}

	slog.Info("Analytics Service stopped successfully")
}

func loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.Info("Incoming HTTP request", "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
