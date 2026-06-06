package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/analytics-service/internal/repository"
)

type AnalyticsHandler struct {
	repo repository.AnalyticsRepository
}

func NewAnalyticsHandler(repo repository.AnalyticsRepository) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo}
}

// GetRoomStats returns real-time statistic metrics for a specific room.
// GET /api/analytics/rooms/{roomId}
func (h *AnalyticsHandler) GetRoomStats(w http.ResponseWriter, r *http.Request) {
	// Parse room ID from path
	roomIDStr := r.PathValue("roomId")
	if roomIDStr == "" {
		h.respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}

	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid Room ID")
		return
	}
	roomID := uint(roomID64)

	chatCount, err := h.repo.GetChatCount(r.Context(), roomID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve analytics metrics")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"room_id":    roomID,
		"chat_count": chatCount,
	})
}

func (h *AnalyticsHandler) respondJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *AnalyticsHandler) respondError(w http.ResponseWriter, statusCode int, message string) {
	h.respondJSON(w, statusCode, map[string]any{
		"status":     false,
		"statusCode": statusCode,
		"message":    message,
	})
}
