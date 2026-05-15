package service

import (
	"go-stream/internal/domain"
)

type userService struct {
	repo domain.UserRepository
}

func NewUserService(repo domain.UserRepository) domain.UserService {
	return &userService{repo: repo}
}

func (s *userService) GetAllUsers() ([]domain.User, error) {
	return s.repo.FindAll()
}

func (s *userService) GetUserByID(id uint) (*domain.User, error) {
	return s.repo.FindByID(id)
}

func (s *userService) FindByProviderAndEmail(provider domain.IdentityProvider, email string) (*domain.User, error) {
	return s.repo.FindByProviderAndEmail(provider, email)
}

func (s *userService) FindByProviderUserID(provider domain.IdentityProvider, providerUserID string) (*domain.User, error) {
	return s.repo.FindByProviderUserID(provider, providerUserID)
}

func (s *userService) FindBySAML(idpID, nameID string) (*domain.User, error) {
	return s.repo.FindBySAML(idpID, nameID)
}

func (s *userService) Create(user *domain.User) error {
	return s.repo.Create(user)
}

func (s *userService) Update(user *domain.User) error {
	return s.repo.Update(user)
}
