package handler

import (
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
	"net/http"
)

type AuthorFollowHandler struct{ svc domain.AuthorFollowService }

func NewAuthorFollowHandler(svc domain.AuthorFollowService) *AuthorFollowHandler {
	return &AuthorFollowHandler{svc: svc}
}
func followUserID(r *http.Request) (uint, bool) {
	id, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	return id, ok && id != 0
}
func (h *AuthorFollowHandler) Follow(w http.ResponseWriter, r *http.Request) {
	userID, ok := followUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if err := h.svc.FollowAuthor(userID, r.PathValue("slug")); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, map[string]bool{"following": true})
}
func (h *AuthorFollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	userID, ok := followUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if err := h.svc.UnfollowAuthor(userID, r.PathValue("slug")); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]bool{"following": false})
}
func (h *AuthorFollowHandler) Status(w http.ResponseWriter, r *http.Request) {
	userID, ok := followUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	following, err := h.svc.IsFollowingAuthor(userID, r.PathValue("slug"))
	if err != nil {
		response.Error(w, http.StatusNotFound, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]bool{"following": following})
}
func (h *AuthorFollowHandler) ListFollowing(w http.ResponseWriter, r *http.Request) {
	userID, ok := followUserID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	authors, err := h.svc.GetFollowedAuthors(userID, 50, 0)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Unable to load followed channels")
		return
	}
	response.Success(w, http.StatusOK, authors)
}
