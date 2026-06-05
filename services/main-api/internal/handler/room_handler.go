package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type RoomHandler struct {
	svc domain.RoomService
}

func NewRoomHandler(svc domain.RoomService) *RoomHandler {
	return &RoomHandler{svc: svc}
}

func (h *RoomHandler) GetLiveRooms(w http.ResponseWriter, r *http.Request) {
	var categoryID *uint
	if cStr := r.URL.Query().Get("category_id"); cStr != "" {
		if c, err := strconv.ParseUint(cStr, 10, 64); err == nil {
			cUint := uint(c)
			categoryID = &cUint
		}
	}

	var gameID *uint
	if gStr := r.URL.Query().Get("game_id"); gStr != "" {
		if g, err := strconv.ParseUint(gStr, 10, 64); err == nil {
			gUint := uint(g)
			gameID = &gUint
		}
	}

	rooms, err := h.svc.GetLiveRooms(categoryID, gameID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, rooms)
}

func (h *RoomHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	room, err := h.svc.GetRoomByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Room not found")
		return
	}
	response.Success(w, http.StatusOK, room)
}

func (h *RoomHandler) GetRoomBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		response.Error(w, http.StatusBadRequest, "Slug is required")
		return
	}
	room, err := h.svc.GetRoomByHostSlug(slug)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Kênh phát sóng không tồn tại")
		return
	}
	response.Success(w, http.StatusOK, room)
}

func (h *RoomHandler) GetMyRooms(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	rooms, err := h.svc.GetRoomsByHost(hostID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, rooms)
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)

	var req struct {
		Title       string                `json:"title"`
		Description string                `json:"description"`
		CategoryID  *uint                 `json:"category_id"`
		GameID      *uint                 `json:"game_id"`
		TagIDs      []uint                `json:"tag_ids"`
		Visibility  domain.RoomVisibility `json:"visibility"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Title == "" {
		response.Error(w, http.StatusBadRequest, "Title is required")
		return
	}
	if req.Visibility == "" {
		req.Visibility = domain.RoomVisibilityPublic
	}

	room, err := h.svc.CreateRoom(hostID, req.Title, req.Description, req.CategoryID, req.GameID, req.TagIDs, req.Visibility)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, room)
}

func (h *RoomHandler) GoLive(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	room, err := h.svc.GoLive(id, hostID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, room)
}

func (h *RoomHandler) EndStream(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	if err := h.svc.EndStream(id, hostID); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]string{"message": "Stream ended"})
}

func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	var req struct {
		Title       string                `json:"title"`
		Description string                `json:"description"`
		CategoryID  *uint                 `json:"category_id"`
		GameID      *uint                 `json:"game_id"`
		TagIDs      []uint                `json:"tag_ids"`
		Visibility  domain.RoomVisibility `json:"visibility"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	room, err := h.svc.UpdateRoom(id, hostID, req.Title, req.Description, req.CategoryID, req.GameID, req.TagIDs, req.Visibility)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, room)
}

func (h *RoomHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	if err := h.svc.DeleteRoom(id, hostID); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]string{"message": "Room deleted"})
}

func (h *RoomHandler) GetStreamKey(w http.ResponseWriter, r *http.Request) {
	hostID := r.Context().Value(middleware.ContextKeyUserID).(uint)
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	room, err := h.svc.GetRoomByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Room not found")
		return
	}

	if room.HostID != hostID {
		response.Error(w, http.StatusForbidden, "Unauthorized")
		return
	}

	response.Success(w, http.StatusOK, map[string]string{
		"stream_key": room.StreamKey,
	})
}

func (h *RoomHandler) ViewerHeartbeat(w http.ResponseWriter, r *http.Request) {
	roomID, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	var req struct {
		ViewerSessionID string `json:"viewer_session_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ViewerSessionID == "" {
		response.Error(w, http.StatusBadRequest, "viewer_session_id is required")
		return
	}

	if err := h.svc.TrackViewerHeartbeat(roomID, req.ViewerSessionID); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]any{
		"viewer_count": h.svc.GetViewerCount(roomID),
	})
}

func parseID(r *http.Request, key string) (uint, error) {
	val, err := strconv.ParseUint(r.PathValue(key), 10, 64)
	return uint(val), err
}
