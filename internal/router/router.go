package router

import (
	"net/http"

	"go-stream/internal/handler"
	"go-stream/pkg/response"
)

func SetupRoutes(mux *http.ServeMux, userHandler *handler.UserHandler) {
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		response.Success(w, http.StatusOK, map[string]string{
			"message": "Welcome to Go Stream API!",
		})
	})

	mux.HandleFunc("GET /api/users", userHandler.GetUsers)
	mux.HandleFunc("GET /api/users/{id}", userHandler.GetUserByID)
}

