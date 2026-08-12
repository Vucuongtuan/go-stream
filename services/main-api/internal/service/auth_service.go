package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// hashRefreshToken returns a fixed-length, non-reversible value suitable for
// storage. JWT refresh tokens are longer than bcrypt's 72-byte input limit.
func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

type authService struct {
	userRepo     domain.UserRepository
	identityRepo domain.IdentityRepository
	walletRepo   domain.WalletRepository
}

func NewAuthService(
	userRepo domain.UserRepository,
	identityRepo domain.IdentityRepository,
	walletRepo domain.WalletRepository,
) domain.AuthService {
	return &authService{
		userRepo:     userRepo,
		identityRepo: identityRepo,
		walletRepo:   walletRepo,
	}
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validateRegistrationInput(name, email, password string) error {
	if length := utf8.RuneCountInString(name); length < 2 || length > 50 {
		return errors.New("display name must be between 2 and 50 characters")
	}
	parsedEmail, err := mail.ParseAddress(email)
	if err != nil || parsedEmail.Address != email {
		return errors.New("invalid email address")
	}
	// bcrypt rejects passwords above 72 bytes. Keep this constraint explicit so
	// the client receives a useful validation error instead of a server failure.
	if length := len(password); length < 8 || length > 72 {
		return errors.New("password must be between 8 and 72 characters")
	}
	return nil
}

func (s *authService) Register(name, email, password string) (*domain.User, error) {
	name = strings.TrimSpace(name)
	email = normalizeEmail(email)
	if err := validateRegistrationInput(name, email, password); err != nil {
		return nil, err
	}

	existing, err := s.identityRepo.FindByProviderAndEmail(domain.ProviderLocal, email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email already registered")
	}
	// Users created by OAuth/SAML may not have a local identity. Check the user
	// record as well so the database unique constraint never leaks to clients.
	if existingUser, err := s.userRepo.FindByEmail(email); err == nil && existingUser != nil {
		return nil, errors.New("email already registered")
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		Name:  name,
		Email: email,
		Slug:  utils.GenerateSlug(name),
	}
	if err := s.userRepo.Create(user); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return nil, errors.New("email already registered")
		}
		return nil, err
	}

	identity := &domain.Identity{
		UserID:       user.ID,
		Provider:     domain.ProviderLocal,
		Email:        email,
		PasswordHash: string(hash),
		IsVerified:   false,
	}
	if err := s.identityRepo.Create(identity); err != nil {
		return nil, err
	}

	// Auto-create a starter wallet for every new user (IsActive is false until they become a streamer).
	wallet := &domain.Wallet{
		UserID:   user.ID,
		Balance:  1000,
		IsActive: false,
	}
	if err := s.walletRepo.Create(context.Background(), wallet); err != nil {
		// Just log error but do not fail registration
		slog.Error("Failed to auto-create wallet for registered user", "user_id", user.ID, "err", err)
	}

	return user, nil
}

func (s *authService) Login(email, password string) (*domain.User, string, string, error) {
	email = normalizeEmail(email)
	if email == "" || password == "" {
		return nil, "", "", errors.New("invalid credentials")
	}

	identity, err := s.identityRepo.FindByProviderAndEmail(domain.ProviderLocal, email)
	if err != nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(identity.PasswordHash), []byte(password)); err != nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	user, err := s.userRepo.FindByID(identity.UserID)
	if err != nil {
		return nil, "", "", err
	}

	secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
	tokenPair, err := utils.GenerateTokenPair(user.ID, email, secret)
	if err != nil {
		return nil, "", "", err
	}
	identity.RefreshToken = hashRefreshToken(tokenPair.RefreshToken)
	if err := s.identityRepo.Update(identity); err != nil {
		return nil, "", "", err
	}

	return user, tokenPair.AccessToken, tokenPair.RefreshToken, nil
}

func (s *authService) Refresh(refreshToken string) (string, string, error) {
	secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
	claims, err := utils.ValidateRefreshToken(refreshToken, secret)
	if err != nil {
		return "", "", errors.New("invalid or expired refresh token")
	}
	identity, err := s.identityRepo.FindByProviderAndEmail(domain.ProviderLocal, claims.Email)
	if err != nil || identity.UserID != claims.UserID || identity.RefreshToken == "" {
		return "", "", errors.New("refresh session is no longer valid")
	}
	if identity.RefreshToken != hashRefreshToken(refreshToken) {
		return "", "", errors.New("refresh session is no longer valid")
	}

	tokenPair, err := utils.GenerateTokenPair(claims.UserID, claims.Email, secret)
	if err != nil {
		return "", "", err
	}
	identity.RefreshToken = hashRefreshToken(tokenPair.RefreshToken)
	if err := s.identityRepo.Update(identity); err != nil {
		return "", "", err
	}
	return tokenPair.AccessToken, tokenPair.RefreshToken, nil
}

func (s *authService) RevokeRefresh(refreshToken string) {
	secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
	claims, err := utils.ValidateRefreshToken(refreshToken, secret)
	if err != nil {
		return
	}
	identity, err := s.identityRepo.FindByProviderAndEmail(domain.ProviderLocal, claims.Email)
	if err != nil || identity.UserID != claims.UserID {
		return
	}
	if identity.RefreshToken != hashRefreshToken(refreshToken) {
		return
	}
	identity.RefreshToken = ""
	_ = s.identityRepo.Update(identity)
}

func (s *authService) LoginWithOAuth(
	provider domain.IdentityProvider,
	providerUserID, email, name, avatar, accessToken, refreshToken string,
	tokenExpiry *time.Time,
) (*domain.User, string, error) {
	identity, err := s.identityRepo.FindByProviderUserID(provider, providerUserID)

	var user *domain.User

	if errors.Is(err, gorm.ErrRecordNotFound) {
		user = &domain.User{
			Name:   name,
			Email:  email,
			Slug:   utils.GenerateSlug(name),
			Avatar: avatar,
		}
		if err := s.userRepo.Create(user); err != nil {
			return nil, "", err
		}
		identity = &domain.Identity{
			UserID:         user.ID,
			Provider:       provider,
			Email:          email,
			ProviderUserID: providerUserID,
			AccessToken:    accessToken,
			RefreshToken:   refreshToken,
			TokenExpiry:    tokenExpiry,
		}
		if err := s.identityRepo.Create(identity); err != nil {
			return nil, "", err
		}
	} else if err != nil {
		return nil, "", err
	} else {
		identity.AccessToken = accessToken
		identity.RefreshToken = refreshToken
		identity.TokenExpiry = tokenExpiry
		if err := s.identityRepo.Update(identity); err != nil {
			return nil, "", err
		}
		user, err = s.userRepo.FindByID(identity.UserID)
		if err != nil {
			return nil, "", err
		}
	}

	secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
	tokenPair, err := utils.GenerateTokenPair(user.ID, email, secret)
	if err != nil {
		return nil, "", err
	}

	return user, tokenPair.AccessToken, nil
}

func (s *authService) LoginWithSAML(idpID, nameID, name, email string) (*domain.User, string, error) {
	identity, err := s.identityRepo.FindBySAML(idpID, nameID)

	var user *domain.User

	if errors.Is(err, gorm.ErrRecordNotFound) {
		user = &domain.User{
			Name:  name,
			Email: email,
			Slug:  utils.GenerateSlug(name),
		}
		if err := s.userRepo.Create(user); err != nil {
			return nil, "", err
		}
		identity = &domain.Identity{
			UserID:   user.ID,
			Provider: domain.ProviderSAML,
			Email:    email,
			IDPID:    idpID,
			NameID:   nameID,
		}
		if err := s.identityRepo.Create(identity); err != nil {
			return nil, "", err
		}
	} else if err != nil {
		return nil, "", err
	} else {
		user, err = s.userRepo.FindByID(identity.UserID)
		if err != nil {
			return nil, "", err
		}
	}

	secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
	tokenPair, err := utils.GenerateTokenPair(user.ID, email, secret)
	if err != nil {
		return nil, "", err
	}

	return user, tokenPair.AccessToken, nil
}
