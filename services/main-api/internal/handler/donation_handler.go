package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type DonationHandler struct {
	donationSvc domain.DonationService
}

func NewDonationHandler(donationSvc domain.DonationService) *DonationHandler {
	return &DonationHandler{donationSvc: donationSvc}
}

type DonateRequest struct {
	GiftType int    `json:"gift_type"`
	Message  string `json:"message"`
}

func (h *DonationHandler) Donate(w http.ResponseWriter, r *http.Request) {
	// 1. Get authenticated user from context
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 2. Parse room ID from path
	roomIDStr := r.PathValue("roomId")
	roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	roomID := uint(roomID64)

	// 3. Decode payload
	var req DonateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.GiftType < 1 || req.GiftType > 5 {
		response.Error(w, http.StatusBadRequest, "Gift type must be between 1 and 5")
		return
	}

	// 4. Execute transaction
	donation, err := h.donationSvc.Donate(r.Context(), userID, roomID, req.GiftType, req.Message)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, donation)
}

func (h *DonationHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	newBalance, err := h.donationSvc.DailyCheckIn(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]any{
		"message":     "Check-in successful! +10 Coins",
		"new_balance": newBalance,
	})
}

func (h *DonationHandler) GetWallet(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	wallet, err := h.donationSvc.GetWallet(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Wallet not found")
		return
	}

	response.Success(w, http.StatusOK, wallet)
}
