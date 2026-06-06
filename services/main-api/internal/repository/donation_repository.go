package repository

import (
	"context"

	"go-stream/services/main-api/internal/domain"
	"gorm.io/gorm"
)

type GormDonationRepository struct {
	db *gorm.DB
}

func NewDonationRepository(db *gorm.DB) domain.DonationRepository {
	return &GormDonationRepository{db: db}
}

func (r *GormDonationRepository) CreateWithTx(ctx context.Context, tx *gorm.DB, donation *domain.Donation) error {
	return tx.WithContext(ctx).Create(donation).Error
}

func (r *GormDonationRepository) GetRoomTotalDonations(ctx context.Context, roomID uint) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&domain.Donation{}).
		Where("room_id = ?", roomID).
		Select("COALESCE(SUM(coin_amount), 0)").
		Row().Scan(&total)
	return total, err
}
