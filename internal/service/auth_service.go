package service

import (
	"errors"
	"time"

	"go-stream/internal/domain"
	"go-stream/internal/utils"
	"go-stream/internal/config"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type authService struct {
	userRepo     domain.UserRepository
	identityRepo domain.IdentityRepository
}

func NewAuthService(userRepo domain.UserRepository, identityRepo domain.IdentityRepository) domain.AuthService {
	return &authService{
		userRepo:     userRepo,
		identityRepo: identityRepo,
	}
}

func (s *authService) Register(name, email, password string) (*domain.User, error) {
	existing, err := s.identityRepo.FindByProviderAndEmail(domain.ProviderLocal, email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email already registered")
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

	return user, nil
}

func (s *authService) Login(email, password string) (*domain.User, string, error) {
	identity, err := s.identityRepo.FindByProviderAndEmail(domain.ProviderLocal, email)
	if err != nil {
		return nil, "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(identity.PasswordHash), []byte(password)); err != nil {
		return nil, "", errors.New("invalid credentials")
	}

	user, err := s.userRepo.FindByID(identity.UserID)
	if err != nil {
		return nil, "", err
	}

	secret := []byte(config.GetEnv("JWT_SECRET", "changeme"))
	tokenPair, err := utils.GenerateTokenPair(user.ID, email, secret)
	if err != nil {
		return nil, "", err
	}

	return user, tokenPair.AccessToken, nil
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
