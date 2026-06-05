package handler

import (
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/pkg/response"
)

type SearchHandler struct {
	svc domain.SearchService
}

func NewSearchHandler(svc domain.SearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

// GlobalSearch handles GET /api/search?q=minecraft&limit=10
func (h *SearchHandler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		response.Error(w, http.StatusBadRequest, "Search query 'q' is required")
		return
	}

	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	result, err := h.svc.SearchGlobal(query, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to perform search")
		return
	}

	response.Success(w, http.StatusOK, result)
}
