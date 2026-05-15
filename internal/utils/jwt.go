package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

type Claims struct {
	UserID    uint      `json:"user_id"`
	Email     string    `json:"email"`
	TokenType TokenType `json:"token_type"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// GenerateTokenPair tạo cặp access + refresh token
func GenerateTokenPair(userID uint, email string, secret []byte) (*TokenPair, error) {
	accessToken, err := generateToken(userID, email, AccessToken, 15*time.Minute, secret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateToken(userID, email, RefreshToken, 7*24*time.Hour, secret)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func generateToken(userID uint, email string, tokenType TokenType, duration time.Duration, secret []byte) (string, error) {
	claims := &Claims{
		UserID:    userID,
		Email:     email,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "go-stream",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// ValidateToken parses và validate token, trả về Claims nếu hợp lệ
func ValidateToken(tokenStr string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// ValidateAccessToken chỉ chấp nhận access token
func ValidateAccessToken(tokenStr string, secret []byte) (*Claims, error) {
	claims, err := ValidateToken(tokenStr, secret)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != AccessToken {
		return nil, errors.New("not an access token")
	}
	return claims, nil
}

// ValidateRefreshToken chỉ chấp nhận refresh token
func ValidateRefreshToken(tokenStr string, secret []byte) (*Claims, error) {
	claims, err := ValidateToken(tokenStr, secret)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != RefreshToken {
		return nil, errors.New("not a refresh token")
	}
	return claims, nil
}
