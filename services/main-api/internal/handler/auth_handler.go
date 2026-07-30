package handler

import (
	"encoding/json"
	"net/http"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/pkg/response"
)

type AuthHandler struct {
	asv domain.AuthService
}

const refreshCookieName = "refresh_token"

func setRefreshCookie(w http.ResponseWriter, r *http.Request, token string) {
	secure := r.TLS != nil || config.GetEnv("COOKIE_SECURE", "false") == "true"
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	cookie := &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/api/auth",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	}
	http.SetCookie(w, cookie)
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}

func clearRefreshCookie(w http.ResponseWriter, r *http.Request) {
	secure := r.TLS != nil || config.GetEnv("COOKIE_SECURE", "false") == "true"
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(w, &http.Cookie{Name: refreshCookieName, Value: "", Path: "/api/auth", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: sameSite})
	http.SetCookie(w, &http.Cookie{Name: refreshCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: sameSite})
}

func NewAuthHandler(asv domain.AuthService) *AuthHandler {
	return &AuthHandler{asv: asv}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.asv.Register(req.Name, req.Email, req.Password)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, accessToken, refreshToken, err := h.asv.Login(req.Email, req.Password)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	setRefreshCookie(w, r, refreshToken)
	response.Success(w, http.StatusOK, map[string]any{
		"user":         user,
		"access_token": accessToken,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil || cookie.Value == "" {
		clearRefreshCookie(w, r)
		response.Error(w, http.StatusUnauthorized, "Refresh session is missing")
		return
	}

	accessToken, refreshToken, err := h.asv.Refresh(cookie.Value)
	if err != nil {
		clearRefreshCookie(w, r)
		response.Error(w, http.StatusUnauthorized, "Refresh session is invalid or expired")
		return
	}
	setRefreshCookie(w, r, refreshToken)
	response.Success(w, http.StatusOK, map[string]string{"access_token": accessToken})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(refreshCookieName); err == nil && cookie.Value != "" {
		h.asv.RevokeRefresh(cookie.Value)
	}
	clearRefreshCookie(w, r)
	response.Success(w, http.StatusOK, map[string]bool{"logged_out": true})
}
