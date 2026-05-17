package router

import (
	"fmt"
	"net/http"
	"os"

	"go-stream/internal/config"
	"go-stream/internal/handler"
	"go-stream/internal/middleware"
	"go-stream/pkg/response"
)

func auth(h http.HandlerFunc) http.Handler {
	return middleware.Auth(h)
}

func ingestOnly(h http.HandlerFunc) http.Handler {
	return middleware.IngestOnly(h)
}

func SetupRoutes(
	mux *http.ServeMux,
	userHandler *handler.UserHandler,
	authHandler *handler.AuthHandler,
	roomHandler *handler.RoomHandler,
	chatHandler *handler.ChatHandler,
	ingestHandler *handler.IngestHandler,
	searchHandler *handler.SearchHandler,
	categoryHandler *handler.CategoryHandler,
	tagHandler *handler.TagHandler,
) {
	storagePath := config.GetEnv("STORAGE_PATH", "./storage")
	mux.Handle("GET /storage/", http.StripPrefix("/storage/", http.FileServer(http.Dir(storagePath))))

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		port := os.Getenv("PORT")
		if port == "" {
			port = "3000"
		}
		fmt.Printf("=> [Load Balancer Test] Request hit server running on port: %s\n", port)

		response.Success(w, http.StatusOK, map[string]string{
			"message": fmt.Sprintf("Welcome to Go Stream API! (Served from port: %s)", port),
		})
	})

	mux.HandleFunc("GET /api/users", userHandler.GetUsers)
	mux.HandleFunc("GET /api/users/{id}", userHandler.GetUserByID)

	mux.HandleFunc("GET /api/search", searchHandler.GlobalSearch)

	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	mux.HandleFunc("GET /api/categories", categoryHandler.GetAllCategories)
	mux.HandleFunc("GET /api/categories/{id}", categoryHandler.GetCategoryByID)
	mux.HandleFunc("GET /api/categories/slug/{slug}", categoryHandler.GetCategoryBySlug)
	mux.HandleFunc("GET /api/categories/{id}/games", categoryHandler.GetGamesByCategory)
	mux.Handle("POST /api/categories", auth(categoryHandler.CreateCategory))
	mux.Handle("PUT /api/categories/{id}", auth(categoryHandler.UpdateCategory))
	mux.Handle("POST /api/categories/{id}/games", auth(categoryHandler.CreateGame))

	mux.HandleFunc("GET /api/tags", tagHandler.GetAllTags)
	mux.HandleFunc("GET /api/tags/{id}", tagHandler.GetTagByID)
	mux.Handle("POST /api/tags", auth(tagHandler.CreateTag))
	mux.Handle("DELETE /api/tags/{id}", auth(tagHandler.DeleteTag))
	mux.HandleFunc("GET /api/rooms/{id}/tags", tagHandler.GetTagsByRoom)
	mux.Handle("PUT /api/rooms/{id}/tags", auth(tagHandler.SyncRoomTags))
	mux.HandleFunc("GET /api/videos/{id}/tags", tagHandler.GetTagsByShortVideo)
	mux.Handle("PUT /api/videos/{id}/tags", auth(tagHandler.SyncShortVideoTags))

	mux.HandleFunc("GET /api/rooms", roomHandler.GetLiveRooms)
	mux.HandleFunc("GET /api/rooms/{id}", roomHandler.GetRoom)
	mux.HandleFunc("GET /api/rooms/{id}/playback", ingestHandler.Playback)
	mux.Handle("GET /api/rooms/me", auth(roomHandler.GetMyRooms))
	mux.Handle("GET /api/rooms/{id}/stream-key", auth(roomHandler.GetStreamKey))
	mux.Handle("POST /api/rooms", auth(roomHandler.CreateRoom))
	mux.Handle("PUT /api/rooms/{id}", auth(roomHandler.UpdateRoom))
	mux.Handle("DELETE /api/rooms/{id}", auth(roomHandler.DeleteRoom))
	mux.Handle("POST /api/rooms/{id}/live", auth(roomHandler.GoLive))
	mux.Handle("POST /api/rooms/{id}/end", auth(roomHandler.EndStream))

	mux.HandleFunc("GET /api/rooms/{id}/chat/stream", chatHandler.Stream)
	mux.Handle("POST /api/rooms/{id}/chat", auth(chatHandler.SendMessage))

	mux.Handle("POST /ingest/on-publish", ingestOnly(ingestHandler.OnPublish))
	mux.Handle("POST /ingest/on-publish-done", ingestOnly(ingestHandler.OnPublishDone))
}
