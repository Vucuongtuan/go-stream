package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type ModerationHandler struct {
	moderationSvc domain.ModerationService
}

func NewModerationHandler(moderationSvc domain.ModerationService) *ModerationHandler {
	return &ModerationHandler{moderationSvc: moderationSvc}
}

type AddModeratorRequest struct {
	Email string `json:"email"`
}

type RemoveModeratorRequest struct {
	UserID uint `json:"user_id"`
}

type BanUserRequest struct {
	TargetUserID uint   `json:"target_user_id"`
	Reason       string `json:"reason"`
}

type TimeoutUserRequest struct {
	TargetUserID uint   `json:"target_user_id"`
	DurationSec  int    `json:"duration_sec"`
	Reason       string `json:"reason"`
}

func (h *ModerationHandler) AddModerator(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	var req AddModeratorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.moderationSvc.AddModerator(r.Context(), userID, roomID, req.Email); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "Moderator added successfully"})
}

func (h *ModerationHandler) RemoveModerator(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	var req RemoveModeratorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.moderationSvc.RemoveModerator(r.Context(), userID, roomID, req.UserID); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "Moderator removed successfully"})
}

func (h *ModerationHandler) BanUser(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	var req BanUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.moderationSvc.BanUser(r.Context(), userID, roomID, req.TargetUserID, req.Reason); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "User banned successfully"})
}

func (h *ModerationHandler) UnbanUser(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	targetUserID := uint(id64)

	if err := h.moderationSvc.UnbanUser(r.Context(), userID, roomID, targetUserID); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "User unbanned successfully"})
}

func (h *ModerationHandler) TimeoutUser(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	var req TimeoutUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.DurationSec <= 0 {
		req.DurationSec = 600 // 10 minutes default
	}

	if err := h.moderationSvc.TimeoutUser(r.Context(), userID, roomID, req.TargetUserID, req.DurationSec, req.Reason); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "User timed out successfully"})
}

func (h *ModerationHandler) CheckMuteStatus(w http.ResponseWriter, r *http.Request) {
	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	userIDStr := r.PathValue("userId")
	userID64, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	userID := uint(userID64)

	isMuted, reason, err := h.moderationSvc.IsUserMuted(r.Context(), roomID, userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]any{
		"is_muted": isMuted,
		"reason":   reason,
	})
}
