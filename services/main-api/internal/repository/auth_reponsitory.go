package repository

import (
	"go-stream/services/main-api/internal/domain"

	"gorm.io/gorm"
)

type identityRepository struct {
	db *gorm.DB
}

func NewIdentityRepository(db *gorm.DB) domain.IdentityRepository {
	return &identityRepository{db: db}
}

func (r *identityRepository) FindByProviderAndEmail(provider domain.IdentityProvider, email string) (*domain.Identity, error) {
	var identity domain.Identity
	err := r.db.Where("provider = ? AND email = ?", provider, email).First(&identity).Error
	if err != nil {
		return nil, err
	}
	return &identity, nil
}

func (r *identityRepository) FindByProviderUserID(provider domain.IdentityProvider, providerUserID string) (*domain.Identity, error) {
	var identity domain.Identity
	err := r.db.Where("provider = ? AND provider_user_id = ?", provider, providerUserID).First(&identity).Error
	if err != nil {
		return nil, err
	}
	return &identity, nil
}

func (r *identityRepository) FindBySAML(idpID, nameID string) (*domain.Identity, error) {
	var identity domain.Identity
	err := r.db.Where("idp_id = ? AND name_id = ?", idpID, nameID).First(&identity).Error
	if err != nil {
		return nil, err
	}
	return &identity, nil
}

func (r *identityRepository) Create(identity *domain.Identity) error {
	return r.db.Create(identity).Error
}

func (r *identityRepository) Update(identity *domain.Identity) error {
	return r.db.Save(identity).Error
}