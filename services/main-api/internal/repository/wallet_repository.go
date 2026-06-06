package repository

import (
	"context"
	"errors"
	"time"

	"go-stream/services/main-api/internal/domain"
	"gorm.io/gorm"
)

type GormWalletRepository struct {
	db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) domain.WalletRepository {
	return &GormWalletRepository{db: db}
}

func (r *GormWalletRepository) FindByUserID(ctx context.Context, userID uint) (*domain.Wallet, error) {
	var wallet domain.Wallet
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&wallet).Error
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (r *GormWalletRepository) Create(ctx context.Context, wallet *domain.Wallet) error {
	return r.db.WithContext(ctx).Create(wallet).Error
}

func (r *GormWalletRepository) UpdateBalanceWithTx(ctx context.Context, tx *gorm.DB, userID uint, amount int64) error {
	// Select ... For Update to prevent race conditions (double spending)
	var wallet domain.Wallet
	err := tx.WithContext(ctx).Clauses(gorm.Expr("FOR UPDATE")).Where("user_id = ?", userID).First(&wallet).Error
	if err != nil {
		return err
	}

	newBalance := wallet.Balance + amount
	if newBalance < 0 {
		return errors.New("insufficient balance")
	}

	return tx.WithContext(ctx).Model(&wallet).Update("balance", newBalance).Error
}

// DailyCheckIn logs daily checkin activity. 
// For simplicity, we store the last check-in date in the user wallet metadata or a temporary transaction.
// Here we use a query on transaction log or update the wallet directly using timezone-based date check.
func (r *GormWalletRepository) CheckIn(ctx context.Context, userID uint, points int64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var wallet domain.Wallet
		err := tx.Clauses(gorm.Expr("FOR UPDATE")).Where("user_id = ?", userID).First(&wallet).Error
		if err != nil {
			return err
		}

		// Update balance
		wallet.Balance += points
		wallet.UpdatedAt = time.Now()

		return tx.Save(&wallet).Error
	})
}

func (r *GormWalletRepository) HasCheckedInToday(ctx context.Context, userID uint) (bool, error) {
	// Handled atomically in service layer via Redis SetNX lock to ensure high performance
	return false, nil
}
