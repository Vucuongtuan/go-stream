package handler

import (
	"net/http"
	"strconv"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
)

type UserHandler struct {
	usv domain.UserService
}

func NewUserHandler(usv domain.UserService) *UserHandler {
	return &UserHandler{usv: usv}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Người dùng chưa đăng nhập")
		return
	}

	user, err := h.usv.GetUserByID(userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Không tìm thấy thông tin người dùng")
		return
	}
	response.Success(w, http.StatusOK, user)
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.usv.GetAllUsers()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, users)
}

func (h *UserHandler) GetUserByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := h.usv.GetUserByID(uint(id))
	if err != nil {
		response.Error(w, http.StatusNotFound, "User not found")
		return
	}
	response.Success(w, http.StatusOK, user)
}


