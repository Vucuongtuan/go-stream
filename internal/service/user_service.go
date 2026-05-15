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
