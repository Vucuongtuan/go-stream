package router

import (
	"net/http"

	"go-stream/internal/handler"
	"go-stream/internal/middleware"
	"go-stream/internal/config"
	"go-stream/pkg/response"
)

func auth(h http.HandlerFunc) http.Handler {
	return middleware.Auth(h)
}

func ingestOnly(h http.HandlerFunc) http.Handler {
	return middleware.IngestOnly(h)
}

func SetupRoutes(mux *http.ServeMux, userHandler *handler.UserHandler, authHandler *handler.AuthHandler, roomHandler *handler.RoomHandler, chatHandler *handler.ChatHandler, ingestHandler *handler.IngestHandler, searchHandler *handler.SearchHandler) {
	// Static file server for local storage (HLS segments, videos, thumbnails)
	storagePath := config.GetEnv("STORAGE_PATH", "./storage")
	mux.Handle("GET /storage/", http.StripPrefix("/storage/", http.FileServer(http.Dir(storagePath))))

	// Root
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		response.Success(w, http.StatusOK, map[string]string{
			"message": "Welcome to Go Stream API!",
		})
	})

	// User routes (public)
	mux.HandleFunc("GET /api/users", userHandler.GetUsers)
	mux.HandleFunc("GET /api/users/{id}", userHandler.GetUserByID)

	// Search route (public)
	mux.HandleFunc("GET /api/search", searchHandler.GlobalSearch)

	// Auth routes (public)
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	// Room routes
	mux.HandleFunc("GET /api/rooms", roomHandler.GetLiveRooms)           // public
	mux.HandleFunc("GET /api/rooms/{id}", roomHandler.GetRoom)            // public
	mux.HandleFunc("GET /api/rooms/{id}/playback", ingestHandler.Playback) // public
	mux.Handle("GET /api/rooms/me", auth(roomHandler.GetMyRooms))         // protected
	mux.Handle("GET /api/rooms/{id}/stream-key", auth(roomHandler.GetStreamKey)) // protected
	mux.Handle("POST /api/rooms", auth(roomHandler.CreateRoom))           // protected
	mux.Handle("PUT /api/rooms/{id}", auth(roomHandler.UpdateRoom))       // protected
	mux.Handle("DELETE /api/rooms/{id}", auth(roomHandler.DeleteRoom))    // protected
	mux.Handle("POST /api/rooms/{id}/live", auth(roomHandler.GoLive))     // protected
	mux.Handle("POST /api/rooms/{id}/end", auth(roomHandler.EndStream))   // protected

	// Chat routes
	mux.HandleFunc("GET /api/rooms/{id}/chat/stream", chatHandler.Stream) // public (SSE)
	mux.Handle("POST /api/rooms/{id}/chat", auth(chatHandler.SendMessage)) // protected

	// Ingest hooks — internal only (protected by IngestOnly middleware)
	mux.Handle("POST /ingest/on-publish", ingestOnly(ingestHandler.OnPublish))
	mux.Handle("POST /ingest/on-publish-done", ingestOnly(ingestHandler.OnPublishDone))
}




