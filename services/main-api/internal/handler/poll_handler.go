package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type PollHandler struct {
	pollSvc domain.PollService
}

func NewPollHandler(pollSvc domain.PollService) *PollHandler {
	return &PollHandler{pollSvc: pollSvc}
}

type CreatePollRequest struct {
	Title       string   `json:"title"`
	Options     []string `json:"options"`
	DurationSec int      `json:"duration_sec"`
}

type VoteRequest struct {
	OptionID uint `json:"option_id"`
}

func (h *PollHandler) CreatePoll(w http.ResponseWriter, r *http.Request) {
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

	var req CreatePollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.DurationSec <= 0 {
		req.DurationSec = 60 // 1 minute default
	}

	poll, err := h.pollSvc.CreatePoll(r.Context(), userID, roomID, req.Title, req.Options, req.DurationSec)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, poll)
}

func (h *PollHandler) EndPoll(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid poll ID")
		return
	}
	pollID := uint(id64)

	poll, err := h.pollSvc.EndPoll(r.Context(), userID, pollID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, poll)
}

func (h *PollHandler) Vote(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid poll ID")
		return
	}
	pollID := uint(id64)

	var req VoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err = h.pollSvc.Vote(r.Context(), userID, pollID, req.OptionID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "Vote recorded successfully"})
}

func (h *PollHandler) GetActivePoll(w http.ResponseWriter, r *http.Request) {
	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	poll, err := h.pollSvc.GetActivePoll(r.Context(), roomID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if poll == nil {
		response.Success(w, http.StatusOK, nil)
		return
	}

	response.Success(w, http.StatusOK, poll)
}
