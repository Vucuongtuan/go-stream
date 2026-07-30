package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/pkg/response"
	"go-stream/services/main-api/pkg/storage"
)

type GiftHandler struct {
	svc domain.GiftService
}

func NewGiftHandler(svc domain.GiftService) *GiftHandler {
	return &GiftHandler{svc: svc}
}

func (h *GiftHandler) GetAllGifts(w http.ResponseWriter, r *http.Request) {
	gifts, err := h.svc.GetAllGifts(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch gifts")
		return
	}
	response.Success(w, http.StatusOK, gifts)
}

func (h *GiftHandler) GetGiftByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid gift ID")
		return
	}

	gift, err := h.svc.GetGiftByID(r.Context(), uint(id))
	if err != nil {
		response.Error(w, http.StatusNotFound, "Gift not found")
		return
	}
	response.Success(w, http.StatusOK, gift)
}

func (h *GiftHandler) CreateGift(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		response.Error(w, http.StatusBadRequest, "Failed to parse multipart form")
		return
	}

	name := r.FormValue("name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Name is required")
		return
	}

	coinPriceStr := r.FormValue("coin_price")
	coinPrice, err := strconv.ParseInt(coinPriceStr, 10, 64)
	if err != nil || coinPrice <= 0 {
		response.Error(w, http.StatusBadRequest, "Invalid coin price")
		return
	}

	// Handle file upload
	file, fileHeader, err := r.FormFile("image")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Image file is required")
		return
	}
	defer file.Close()

	// Validate extension
	ext := filepath.Ext(fileHeader.Filename)
	extLower := filepath.Clean(ext)
	if extLower != ".png" && extLower != ".jpg" && extLower != ".jpeg" && extLower != ".gif" && extLower != ".webp" {
		response.Error(w, http.StatusBadRequest, "Invalid image format. Allowed: PNG, JPG, JPEG, GIF, WEBP")
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), fileHeader.Filename)
	subPath := filepath.Join("gift", filename)

	imageURL, err := storage.Save(file, subPath)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to save image: "+err.Error())
		return
	}

	gift, err := h.svc.CreateGift(r.Context(), name, coinPrice, imageURL)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, gift)
}

func (h *GiftHandler) UpdateGift(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid gift ID")
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "Failed to parse multipart form")
		return
	}

	name := r.FormValue("name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Name is required")
		return
	}

	coinPriceStr := r.FormValue("coin_price")
	coinPrice, err := strconv.ParseInt(coinPriceStr, 10, 64)
	if err != nil || coinPrice <= 0 {
		response.Error(w, http.StatusBadRequest, "Invalid coin price")
		return
	}

	var imageURL string
	file, fileHeader, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), fileHeader.Filename)
		subPath := filepath.Join("gift", filename)
		imageURL, err = storage.Save(file, subPath)
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to save image: "+err.Error())
			return
		}
	}

	gift, err := h.svc.UpdateGift(r.Context(), uint(id), name, coinPrice, imageURL)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, gift)
}

func (h *GiftHandler) DeleteGift(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid gift ID")
		return
	}

	if err := h.svc.DeleteGift(r.Context(), uint(id)); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{"message": "Gift deleted successfully"})
}
