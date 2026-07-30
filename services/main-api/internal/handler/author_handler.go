package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
	"go-stream/services/main-api/pkg/storage"
)

type AuthorHandler struct {
	asv   domain.AuthorService
	repo  domain.AuthorRepository
	users domain.UserRepository
}

func NewAuthorHandler(asv domain.AuthorService, repo domain.AuthorRepository, users domain.UserRepository) *AuthorHandler {
	return &AuthorHandler{asv: asv, repo: repo, users: users}
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

func (h *AuthorHandler) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Người dùng chưa đăng nhập")
		return
	}

	author, err := h.asv.GetAuthorByUserID(userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Không tìm thấy hồ sơ streamer")
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "Dữ liệu tải lên không hợp lệ")
		return
	}

	displayName := strings.TrimSpace(r.FormValue("name"))
	if displayName == "" {
		displayName = author.DisplayName
	}
	bio := r.FormValue("bio")
	if bio == "" {
		bio = author.Bio
	}

	saveImage := func(field, folder string) (string, error) {
		file, header, formErr := r.FormFile(field)
		if formErr == http.ErrMissingFile {
			return "", nil
		}
		if formErr != nil {
			return "", formErr
		}
		defer file.Close()
		ext := strings.ToLower(filepath.Ext(header.Filename))
		switch ext {
		case ".png", ".jpg", ".jpeg", ".gif", ".webp":
		default:
			return "", fmt.Errorf("unsupported image format")
		}
		return storage.Save(file, filepath.Join("media", folder, fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)))
	}

	avatar, err := saveImage("avatar", "avatars")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Ảnh đại diện không hợp lệ")
		return
	}
	cover, err := saveImage("cover", "covers")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Ảnh bìa không hợp lệ")
		return
	}

	categoryIDs := make([]uint, len(author.Categories))
	for i, category := range author.Categories {
		categoryIDs[i] = category.ID
	}
	updated, err := h.asv.UpdateProfile(author.ID, userID, displayName, bio, avatar, cover, nil, categoryIDs)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	user, err := h.users.FindByID(userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Không thể cập nhật hồ sơ người dùng")
		return
	}
	user.Name = updated.DisplayName
	user.Bio = updated.Bio
	if updated.Avatar != "" {
		user.Avatar = updated.Avatar
	}
	if updated.CoverImage != "" {
		user.CoverURL = updated.CoverImage
	}
	if err := h.users.Update(user); err != nil {
		response.Error(w, http.StatusInternalServerError, "Không thể cập nhật hồ sơ người dùng")
		return
	}
	response.Success(w, http.StatusOK, map[string]string{
		"name":      updated.DisplayName,
		"bio":       updated.Bio,
		"avatar":    updated.Avatar,
		"cover_url": updated.CoverImage,
	})
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
