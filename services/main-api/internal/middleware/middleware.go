package middleware

import (
	"context"
	"net/http"
	"strings"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/utils"
	"go-stream/services/main-api/pkg/response"
)

type contextKey string

const (
	ContextKeyUserID   contextKey = "user_id"
	ContextKeyEmail    contextKey = "email"
	ContextKeyUserName contextKey = "user_name"
	ContextKeyAvatar   contextKey = "avatar"
)

// Auth validates JWT and injects claims into context.
// Returns 401 if token is missing or invalid.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractBearerToken(r)
		if token == "" {
			response.Error(w, http.StatusUnauthorized, "Missing authorization token")
			return
		}

		secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
		claims, err := utils.ValidateAccessToken(token, secret)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
		ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth validates JWT if present, but does NOT block unauthenticated requests.
// Useful for public endpoints that behave differently when logged in.
func OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractBearerToken(r)
		if token != "" {
			secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
			if claims, err := utils.ValidateAccessToken(token, secret); err == nil {
				ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
				ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
				r = r.WithContext(ctx)
			}
		}
		next.ServeHTTP(w, r)
	})
}

// IngestOnly blocks any request that doesn't come from the configured ingest server IP.
func IngestOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowed := config.GetEnv("INGEST_SERVER_IP", "127.0.0.1")
		clientIP := realIP(r)
		if clientIP != allowed {
			response.Error(w, http.StatusForbidden, "Forbidden")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func extractBearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return ""
}

func realIP(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ",")[0]
	}
	// strip port
	ip := r.RemoteAddr
	if i := strings.LastIndex(ip, ":"); i != -1 {
		return ip[:i]
	}
	return ip
}

// AdminOnly checks if the authenticated user has the 'admin' role.
func AdminOnly(userRepo domain.UserRepository, next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(ContextKeyUserID).(uint)
		if !ok || userID == 0 {
			token := extractBearerToken(r)
			if token == "" {
				response.Error(w, http.StatusUnauthorized, "Missing authorization token")
				return
			}
			secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
			claims, err := utils.ValidateAccessToken(token, secret)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}
			userID = claims.UserID
		}

		user, err := userRepo.FindByID(userID)
		if err != nil || user == nil {
			response.Error(w, http.StatusUnauthorized, "User not found")
			return
		}

		if user.Role != "admin" {
			response.Error(w, http.StatusForbidden, "Quyền truy cập bị từ chối: Chỉ dành cho Admin")
			return
		}

		next.ServeHTTP(w, r)
	})
}
