package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"go-stream/internal/domain"
	"go-stream/internal/middleware"
	"go-stream/pkg/chat"
	"go-stream/pkg/response"

	"github.com/google/uuid"
)

type ChatHandler struct {
	hub      *chat.Hub
	userRepo domain.UserRepository
}

func NewChatHandler(hub *chat.Hub, userRepo domain.UserRepository) *ChatHandler {
	return &ChatHandler{hub: hub, userRepo: userRepo}
}

// Stream — SSE endpoint, client subscribe để nhận tin realtime
// GET /api/rooms/{id}/chat/stream
func (h *ChatHandler) Stream(w http.ResponseWriter, r *http.Request) {
	roomID, err := parseRoomID(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	// SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // tắt Nginx buffering nếu có

	flusher, ok := w.(http.Flusher)
	if !ok {
		response.Error(w, http.StatusInternalServerError, "SSE not supported")
		return
	}

	ch, history := h.hub.Subscribe(roomID)
	defer h.hub.Unsubscribe(roomID, ch)

	// Gửi lịch sử chat ngay khi connect
	for _, msg := range history {
		sendSSEEvent(w, flusher, msg)
	}

	// Giữ connection, đẩy message realtime
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			sendSSEEvent(w, flusher, msg)
		case <-r.Context().Done():
			return
		}
	}
}

// SendMessage — client gửi tin nhắn vào room
// POST /api/rooms/{id}/chat
func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	roomID, err := parseRoomID(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Fetch user details from database to avoid panics on missing context keys
	var userName string
	var avatar string
	user, err := h.userRepo.FindByID(userID)
	if err == nil && user != nil {
		userName = user.Name
		avatar = user.Avatar
	} else {
		userName = fmt.Sprintf("User %d", userID)
	}

	var req struct {
		Content string                  `json:"content"`
		Type    domain.ChatMessageType  `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		response.Error(w, http.StatusBadRequest, "Content is required")
		return
	}
	if req.Type == "" {
		req.Type = domain.ChatMessageTypeText
	}

	msg := domain.ChatMessage{
		ID:        uuid.NewString(),
		RoomID:    roomID,
		UserID:    userID,
		UserName:  userName,
		Avatar:    avatar,
		Content:   req.Content,
		Type:      req.Type,
		CreatedAt: time.Now(),
	}

	h.hub.Publish(roomID, msg)
	response.Success(w, http.StatusCreated, msg)
}

func sendSSEEvent(w http.ResponseWriter, flusher http.Flusher, msg domain.ChatMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()
}

func parseRoomID(r *http.Request) (uint, error) {
	val, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	return uint(val), err
}
