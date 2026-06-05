package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type AuthorHandler struct {
	asv  domain.AuthorService
	repo domain.AuthorRepository
}

func NewAuthorHandler(asv domain.AuthorService, repo domain.AuthorRepository) *AuthorHandler {
	return &AuthorHandler{asv: asv, repo: repo}
}

// Apply handles POST /api/authors/apply
func (h *AuthorHandler) Apply(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Người dùng chưa đăng nhập")
		return
	}

	var req struct {
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		CategoryIDs []uint `json:"category_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Dữ liệu yêu cầu không hợp lệ")
		return
	}

	if req.DisplayName == "" {
		response.Error(w, http.StatusBadRequest, "Vui lòng nhập tên hiển thị kênh")
		return
	}

	author, err := h.asv.Apply(userID, req.DisplayName, req.Bio, req.CategoryIDs)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, author)
}

// ListCandidates handles GET /api/admin/authors
func (h *AuthorHandler) ListCandidates(w http.ResponseWriter, r *http.Request) {
	statusStr := r.URL.Query().Get("status")
	var status *domain.AuthorStatus

	if statusStr != "" {
		s := domain.AuthorStatus(statusStr)
		status = &s
	}

	limit := 50
	offset := 0

	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil {
			limit = l
		}
	}
	if oStr := r.URL.Query().Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil {
			offset = o
		}
	}

	authors, err := h.repo.FindAll(status, limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Không thể lấy danh sách ứng viên")
		return
	}

	response.Success(w, http.StatusOK, authors)
}

// Approve handles PUT /api/admin/authors/{id}/approve
func (h *AuthorHandler) Approve(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID ứng viên không hợp lệ")
		return
	}

	if err := h.asv.ApproveAuthor(uint(id)); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{
		"message": "Phê duyệt streamer thành công",
	})
}

// Reject handles PUT /api/admin/authors/{id}/reject
func (h *AuthorHandler) Reject(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID ứng viên không hợp lệ")
		return
	}

	if err := h.asv.RejectAuthor(uint(id)); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, map[string]string{
		"message": "Từ chối yêu cầu ứng tuyển thành công",
	})
}
