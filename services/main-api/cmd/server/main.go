package main

import (
	"net/http"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/internal/database"
	"go-stream/services/main-api/internal/handler"
	"go-stream/services/main-api/internal/kafka"
	"go-stream/services/main-api/internal/repository"
	"go-stream/services/main-api/internal/router"
	"go-stream/services/main-api/internal/service"
	"go-stream/services/main-api/pkg/chat"
	"go-stream/services/main-api/pkg/logger"
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
	userRepo := repository.NewUserRepository(db)
	identityRepo := repository.NewIdentityRepository(db)
	tagRepo := repository.NewTagRepository(db)
	roomRepo := repository.NewRoomRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	authorRepo := repository.NewAuthorRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	donationRepo := repository.NewDonationRepository(db)

	userSvc := service.NewUserService(userRepo)
	authSvc := service.NewAuthService(userRepo, identityRepo, walletRepo)
	tagSvc := service.NewTagService(tagRepo)
	roomSvc := service.NewRoomService(roomRepo, tagRepo, redisClient)
	categorySvc := service.NewCategoryService(categoryRepo)
	searchSvc := service.NewSearchService(db)
	authorSvc := service.NewAuthorService(authorRepo)
	donationSvc := service.NewDonationService(db, walletRepo, donationRepo, redisClient, kafkaProducer)

	chatHub := chat.NewHub()

	userHandler := handler.NewUserHandler(userSvc)
	authHandler := handler.NewAuthHandler(authSvc)
	roomHandler := handler.NewRoomHandler(roomSvc)
	chatHandler := handler.NewChatHandler(chatHub, userRepo)
	ingestHandler := handler.NewIngestHandler(roomRepo, chatHub, kafkaProducer)
	searchHandler := handler.NewSearchHandler(searchSvc)
	categoryHandler := handler.NewCategoryHandler(categorySvc)
	tagHandler := handler.NewTagHandler(tagSvc)
	authorHandler := handler.NewAuthorHandler(authorSvc, authorRepo)
	donationHandler := handler.NewDonationHandler(donationSvc)

	// Config router
	mux := http.NewServeMux()
	router.SetupRoutes(mux, userHandler, authHandler, roomHandler, chatHandler, ingestHandler, searchHandler, categoryHandler, tagHandler, authorHandler, donationHandler, userRepo)

	// Port
	port := config.GetEnv("PORT", "8080")
	logger.Info("Server starting", "port", port)

	// Middleware
	server := &http.Server{
		Addr:    ":" + port,
		Handler: loggerMiddleware(mux),
	}

	// Running server
	err := server.ListenAndServe()
	logger.FatalIfError(err, "Failed to start server")
}

// loggerMiddleware logs each incoming HTTP request
func loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Info("Incoming request", "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
// corsMiddleware sets basic CORS headers for all responses
// func corsMiddleware(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		w.Header().Set("Access-Control-Allow-Origin", "*")
// 		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
// 		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
// 		if r.Method == "OPTIONS" {
// 			w.WriteHeader(http.StatusOK)
// 			return
// 		}
// 		next.ServeHTTP(w, r)
// 	})
// }