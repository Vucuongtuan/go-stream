package main

import (
	"context"
	"errors"
	"net/http"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/internal/database"
	internalgrpc "go-stream/services/main-api/internal/grpc"
	"go-stream/services/main-api/internal/handler"
	"go-stream/services/main-api/internal/kafka"
	"go-stream/services/main-api/internal/outbox"
	"go-stream/services/main-api/internal/repository"
	"go-stream/services/main-api/internal/router"
	"go-stream/services/main-api/internal/service"
	"go-stream/services/main-api/pkg/chat"
	"go-stream/services/main-api/pkg/logger"
	"go-stream/services/main-api/pkg/metrics"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func main() {
	// Config logger custom
	logger.InitLogger()

	// Load config .env
	config.LoadConfig()

	// Connect Database
	db := database.ConnectDB()

	// Connect Redis
	redisClient := database.ConnectRedis()

	// Initialize Kafka producer
	kafkaProducer := kafka.NewProducer(config.GetEnv("KAFKA_BROKERS", "localhost:9092"))
	defer kafkaProducer.Close()

	// Setup Dependency Injection
	outboxRepo := outbox.NewRepository(db)
	userRepo := repository.NewUserRepository(db)
	identityRepo := repository.NewIdentityRepository(db)
	tagRepo := repository.NewTagRepository(db)
	roomRepo := repository.NewRoomRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	authorRepo := repository.NewAuthorRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	donationRepo := repository.NewDonationRepository(db)
	predictionRepo := repository.NewPredictionRepository(db)
	pollRepo := repository.NewPollRepository(db)
	moderationRepo := repository.NewModerationRepository(db)
	giftRepo := repository.NewGiftRepository(db)
	shortVideoRepo := repository.NewShortVideoRepository(db)
	authorFollowRepo := repository.NewAuthorFollowRepository(db)

	userSvc := service.NewUserService(userRepo)
	authSvc := service.NewAuthService(userRepo, identityRepo, walletRepo)
	tagSvc := service.NewTagService(tagRepo)
	roomSvc := service.NewRoomService(roomRepo, tagRepo, redisClient)
	categorySvc := service.NewCategoryService(categoryRepo)
	searchSvc := service.NewSearchService(db)
	authorSvc := service.NewAuthorService(authorRepo)
	donationSvc := service.NewDonationService(db, walletRepo, donationRepo, redisClient, outboxRepo)
	predictionSvc := service.NewPredictionService(db, predictionRepo, walletRepo, kafkaProducer)
	pollSvc := service.NewPollService(db, pollRepo, moderationRepo, kafkaProducer)
	moderationSvc := service.NewModerationService(db, moderationRepo, userRepo, kafkaProducer)
	giftSvc := service.NewGiftService(giftRepo)
	shortVideoSvc := service.NewShortVideoService(shortVideoRepo, authorRepo, authorFollowRepo, tagRepo)
	authorFollowSvc := service.NewAuthorFollowService(authorFollowRepo, authorRepo)

	chatHub := chat.NewHub()

	userHandler := handler.NewUserHandler(userSvc)
	authHandler := handler.NewAuthHandler(authSvc)
	roomHandler := handler.NewRoomHandler(roomSvc)
	chatHandler := handler.NewChatHandler(chatHub, userRepo)
	ingestHandler := handler.NewIngestHandler(db, roomRepo, chatHub, outboxRepo)
	searchHandler := handler.NewSearchHandler(searchSvc)
	categoryHandler := handler.NewCategoryHandler(categorySvc)
	tagHandler := handler.NewTagHandler(tagSvc)
	authorHandler := handler.NewAuthorHandler(authorSvc, authorRepo, userRepo)
	donationHandler := handler.NewDonationHandler(donationSvc)
	predictionHandler := handler.NewPredictionHandler(predictionSvc)
	pollHandler := handler.NewPollHandler(pollSvc)
	moderationHandler := handler.NewModerationHandler(moderationSvc)
	giftHandler := handler.NewGiftHandler(giftSvc)
	shortVideoHandler := handler.NewShortVideoHandler(shortVideoSvc, authorSvc, roomRepo)
	authorFollowHandler := handler.NewAuthorFollowHandler(authorFollowSvc)

	// Config router
	mux := http.NewServeMux()
	httpMetrics := metrics.NewHTTPMetrics()
	mux.HandleFunc("GET /metrics", httpMetrics.Handler)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("GET /readyz", readinessHandler(db, redisClient))
	router.SetupRoutes(mux, userHandler, authHandler, roomHandler, chatHandler, ingestHandler, searchHandler, categoryHandler, tagHandler, authorHandler, donationHandler, predictionHandler, pollHandler, moderationHandler, giftHandler, shortVideoHandler, authorFollowHandler, userRepo)

	// Port
	port := config.GetEnv("PORT", "8080")
	grpcPort := config.GetEnv("GRPC_PORT", "50051")

	// Start gRPC Server
	grpcServer, err := internalgrpc.StartGrpcServer(grpcPort, moderationSvc)
	logger.FatalIfError(err, "Failed to start gRPC server")
	defer grpcServer.GracefulStop()

	logger.Info("Server starting", "port", port)

	// Middleware
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           httpMetrics.Middleware(corsMiddleware(loggerMiddleware(mux))),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	workerCtx, stopWorker := context.WithCancel(context.Background())
	defer stopWorker()
	go outbox.NewWorker(outboxRepo, kafkaProducer).Run(workerCtx)

	// Gracefully stop accepting work on SIGTERM/SIGINT, allowing reverse proxies
	// to drain this replica during a deploy or an autoscaling event.
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- server.ListenAndServe()
	}()

	shutdownSignal, stopSignal := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stopSignal()
	select {
	case err = <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.FatalIfError(err, "Failed to start server")
		}
	case <-shutdownSignal.Done():
		logger.Info("Shutdown signal received")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("HTTP server shutdown failed", err)
		}
	}
}

// readinessHandler verifies dependencies required to serve API traffic. Keep
// this separate from /healthz so an orchestrator can restart a live-but-not-
// ready replica without routing user requests to it.
func readinessHandler(db *gorm.DB, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if rdb == nil {
			http.Error(w, "redis is unavailable", http.StatusServiceUnavailable)
			return
		}
		sqlDB, err := db.DB()
		if err != nil {
			http.Error(w, "database is unavailable", http.StatusServiceUnavailable)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := sqlDB.PingContext(ctx); err != nil {
			http.Error(w, "database is unavailable", http.StatusServiceUnavailable)
			return
		}
		if err := rdb.Ping(ctx).Err(); err != nil {
			http.Error(w, "redis is unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}

// loggerMiddleware logs each incoming HTTP request
func loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Info("Incoming request", "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// corsMiddleware permits the configured frontend origins and supports HttpOnly cookie credentials.
func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigins := config.GetEnv("CORS_ALLOWED_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isAllowedOrigin(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string, configuredOrigins string) bool {
	if origin == "" {
		return false
	}
	for _, candidate := range strings.Split(configuredOrigins, ",") {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if strings.EqualFold(origin, candidate) || candidate == "*" {
			return true
		}
	}
	return false
}
