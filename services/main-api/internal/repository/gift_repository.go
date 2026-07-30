package repository

import (
	"context"

	"go-stream/services/main-api/internal/domain"
	"gorm.io/gorm"
)

type GormGiftRepository struct {
	db *gorm.DB
}

func NewGiftRepository(db *gorm.DB) domain.GiftRepository {
	return &GormGiftRepository{db: db}
}

func (r *GormGiftRepository) FindAll(ctx context.Context) ([]domain.Gift, error) {
	var gifts []domain.Gift
	err := r.db.WithContext(ctx).Order("coin_price asc").Find(&gifts).Error
	return gifts, err
}

func (r *GormGiftRepository) FindByID(ctx context.Context, id uint) (*domain.Gift, error) {
	var gift domain.Gift
	err := r.db.WithContext(ctx).First(&gift, id).Error
	if err != nil {
		return nil, err
	}
	return &gift, nil
}

func (r *GormGiftRepository) Create(ctx context.Context, gift *domain.Gift) error {
	return r.db.WithContext(ctx).Create(gift).Error
}

func (r *GormGiftRepository) Update(ctx context.Context, gift *domain.Gift) error {
	return r.db.WithContext(ctx).Save(gift).Error
}

func (r *GormGiftRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&domain.Gift{}, id).Error
}
