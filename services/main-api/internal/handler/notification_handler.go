package handler

import (
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type NotificationHandler struct{ svc domain.NotificationService }

func NewNotificationHandler(svc domain.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

func notificationUserID(r *http.Request) (uint, bool) {
	id, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	return id, ok && id != 0
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := notificationUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	limit := 30
	if requested, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && requested > 0 {
		limit = min(requested, 100)
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	notifications, unread, err := h.svc.List(userID, limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Không thể tải thông báo")
		return
	}
	response.Success(w, http.StatusOK, map[string]any{"notifications": notifications, "unread_count": unread})
}

func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := notificationUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		response.Error(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}
	if err := h.svc.MarkRead(userID, uint(id)); err != nil {
		response.Error(w, http.StatusInternalServerError, "Không thể cập nhật thông báo")
		return
	}
	response.Success(w, http.StatusOK, map[string]bool{"read": true})
}

func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := notificationUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if err := h.svc.MarkAllRead(userID); err != nil {
		response.Error(w, http.StatusInternalServerError, "Không thể cập nhật thông báo")
		return
	}
	response.Success(w, http.StatusOK, map[string]bool{"read": true})
}
