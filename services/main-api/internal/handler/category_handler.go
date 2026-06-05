package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/pkg/response"
)

type CategoryHandler struct {
	svc domain.CategoryService
}

func NewCategoryHandler(svc domain.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

func (h *CategoryHandler) GetAllCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.svc.GetAllCategories()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}
	response.Success(w, http.StatusOK, categories)
}

func (h *CategoryHandler) GetCategoryByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	category, err := h.svc.GetCategoryByID(uint(id))
	if err != nil {
		response.Error(w, http.StatusNotFound, "Category not found")
		return
	}
	response.Success(w, http.StatusOK, category)
}

func (h *CategoryHandler) GetCategoryBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		response.Error(w, http.StatusBadRequest, "Slug is required")
		return
	}

	category, err := h.svc.GetCategoryBySlug(slug)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Category not found")
		return
	}
	response.Success(w, http.StatusOK, category)
}

func (h *CategoryHandler) GetGamesByCategory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	games, err := h.svc.GetGamesByCategory(uint(id))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch games")
		return
	}
	response.Success(w, http.StatusOK, games)
}

type createCategoryRequest struct {
	Name        string              `json:"name"`
	Slug        string              `json:"slug"`
	Type        domain.CategoryType `json:"type"`
	Icon        string              `json:"icon"`
	Description string              `json:"description"`
}

func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req createCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	category, err := h.svc.CreateCategory(req.Name, req.Slug, req.Icon, req.Description, req.Type)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, category)
}

type updateCategoryRequest struct {
	Name        string              `json:"name"`
	Slug        string              `json:"slug"`
	Type        domain.CategoryType `json:"type"`
	Icon        string              `json:"icon"`
	Description string              `json:"description"`
}

func (h *CategoryHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	var req updateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	category, err := h.svc.UpdateCategory(uint(id), req.Name, req.Slug, req.Icon, req.Description, req.Type)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, category)
}

type createGameRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	CoverImage  string `json:"cover_image"`
	Description string `json:"description"`
}

func (h *CategoryHandler) CreateGame(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	var req createGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	game, err := h.svc.CreateGame(uint(id), req.Name, req.Slug, req.CoverImage, req.Description)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, game)
}
