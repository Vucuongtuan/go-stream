package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type PredictionHandler struct {
	predictionSvc domain.PredictionService
}

func NewPredictionHandler(predictionSvc domain.PredictionService) *PredictionHandler {
	return &PredictionHandler{predictionSvc: predictionSvc}
}

type CreatePredictionRequest struct {
	Title       string   `json:"title"`
	Options     []string `json:"options"`
	DurationSec int      `json:"duration_sec"`
}

type PlaceBetRequest struct {
	OptionID uint  `json:"option_id"`
	Points   int64 `json:"points"`
}

type ResolvePredictionRequest struct {
	WinningOptionID uint `json:"winning_option_id"`
}

func (h *PredictionHandler) CreatePrediction(w http.ResponseWriter, r *http.Request) {
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

	var req CreatePredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.DurationSec <= 0 {
		req.DurationSec = 120 // 2 minutes default
	}

	prediction, err := h.predictionSvc.CreatePrediction(r.Context(), userID, roomID, req.Title, req.Options, req.DurationSec)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, prediction)
}

func (h *PredictionHandler) LockPrediction(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid prediction ID")
		return
	}
	predictionID := uint(id64)

	prediction, err := h.predictionSvc.LockPrediction(r.Context(), userID, predictionID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, prediction)
}

func (h *PredictionHandler) ResolvePrediction(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid prediction ID")
		return
	}
	predictionID := uint(id64)

	var req ResolvePredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	prediction, err := h.predictionSvc.ResolvePrediction(r.Context(), userID, predictionID, req.WinningOptionID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, prediction)
}

func (h *PredictionHandler) CancelPrediction(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid prediction ID")
		return
	}
	predictionID := uint(id64)

	prediction, err := h.predictionSvc.CancelPrediction(r.Context(), userID, predictionID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, prediction)
}

func (h *PredictionHandler) PlaceBet(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := r.PathValue("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid prediction ID")
		return
	}
	predictionID := uint(id64)

	var req PlaceBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	bet, err := h.predictionSvc.PlaceBet(r.Context(), userID, predictionID, req.OptionID, req.Points)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, bet)
}

func (h *PredictionHandler) GetActivePrediction(w http.ResponseWriter, r *http.Request) {
	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	prediction, err := h.predictionSvc.GetActivePrediction(r.Context(), roomID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if prediction == nil {
		response.Success(w, http.StatusOK, nil)
		return
	}

	response.Success(w, http.StatusOK, prediction)
}
