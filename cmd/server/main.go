package main

import (
	"net/http"

	"go-stream/internal/config"
	"go-stream/internal/database"
	"go-stream/internal/handler"
	"go-stream/internal/repository"
	"go-stream/internal/router"
	"go-stream/internal/service"
	"go-stream/pkg/logger"
)

func main() {
	// Config logger custom 
	logger.InitLogger()

	// Load config .env
	config.LoadConfig()

	// Connect Database
	db := database.ConnectDB()

	// Setup Dependency Injection for module User
	userRepo := repository.NewUserRepository(db)
	userSvc := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userSvc)

	// Config router
	mux := http.NewServeMux()
	router.SetupRoutes(mux, userHandler)

	// Port
	port := config.GetEnv("PORT", "3000")
	logger.Info("Server starting", "port", port)

	// Middleware
	server := &http.Server{
		Addr:    ":" + port,
		Handler: loggerMiddleware(corsMiddleware(mux)),
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
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
