


package repository

import (
	"go-stream/internal/domain"
	"go-stream/pkg/logger"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &UserRepository{db: db}
}


func (r *UserRepository) FindByProviderAndEmail(provider domain.IdentityProvider, email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("provider = ? AND email = ?", provider, email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByProviderUserID(provider domain.IdentityProvider, providerUserID string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("provider = ? AND provider_user_id = ?", provider, providerUserID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindBySAML(idpID, nameID string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("idp_id = ? AND name_id = ?", idpID, nameID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}