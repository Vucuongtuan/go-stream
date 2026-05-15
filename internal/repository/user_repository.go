package repository

import (
	"go-stream/internal/domain"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindAll() ([]domain.User, error) {
	var users []domain.User
	if result := r.db.Find(&users); result.Error != nil {
		return nil, result.Error
	}
	return users, nil
}

func (r *userRepository) FindByID(id uint) (*domain.User, error) {
	var user domain.User
	if result := r.db.First(&user, id); result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *userRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&domain.User{}, id).Error
}

