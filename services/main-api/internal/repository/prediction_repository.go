package repository

import (
	"context"
	"errors"
	"go-stream/services/main-api/internal/domain"

	"gorm.io/gorm"
)

type GormPredictionRepository struct {
	db *gorm.DB
}

func NewPredictionRepository(db *gorm.DB) domain.PredictionRepository {
	return &GormPredictionRepository{db: db}
}

func (r *GormPredictionRepository) Create(ctx context.Context, prediction *domain.Prediction) error {
	return r.db.WithContext(ctx).Create(prediction).Error
}

func (r *GormPredictionRepository) FindByID(ctx context.Context, id uint) (*domain.Prediction, error) {
	var prediction domain.Prediction
	err := r.db.WithContext(ctx).Preload("Options").First(&prediction, id).Error
	if err != nil {
		return nil, err
	}
	return &prediction, nil
}

func (r *GormPredictionRepository) FindActiveByRoomID(ctx context.Context, roomID uint) (*domain.Prediction, error) {
	var prediction domain.Prediction
	err := r.db.WithContext(ctx).
		Preload("Options").
		Where("room_id = ? AND status IN (?, ?)", roomID, domain.PredictionStatusActive, domain.PredictionStatusLocked).
		Order("id DESC").
		First(&prediction).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &prediction, nil
}

func (r *GormPredictionRepository) Update(ctx context.Context, prediction *domain.Prediction) error {
	return r.db.WithContext(ctx).Save(prediction).Error
}

func (r *GormPredictionRepository) CreateBet(ctx context.Context, bet *domain.PredictionBet) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update option total_points
		err := tx.Model(&domain.PredictionOption{}).
			Where("id = ?", bet.OptionID).
			UpdateColumn("total_points", gorm.Expr("total_points + ?", bet.Points)).Error
		if err != nil {
			return err
		}
		return tx.Create(bet).Error
	})
}

func (r *GormPredictionRepository) GetBet(ctx context.Context, predictionID uint, userID uint) (*domain.PredictionBet, error) {
	var bet domain.PredictionBet
	err := r.db.WithContext(ctx).
		Where("prediction_id = ? AND user_id = ?", predictionID, userID).
		First(&bet).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &bet, nil
}

func (r *GormPredictionRepository) UpdateBetPoints(ctx context.Context, betID uint, points int64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bet domain.PredictionBet
		if err := tx.First(&bet, betID).Error; err != nil {
			return err
		}
		// Update option total_points
		err := tx.Model(&domain.PredictionOption{}).
			Where("id = ?", bet.OptionID).
			UpdateColumn("total_points", gorm.Expr("total_points + ?", points)).Error
		if err != nil {
			return err
		}
		return tx.Model(&bet).UpdateColumn("points", gorm.Expr("points + ?", points)).Error
	})
}

func (r *GormPredictionRepository) FindBetsByPredictionID(ctx context.Context, predictionID uint) ([]domain.PredictionBet, error) {
	var bets []domain.PredictionBet
	err := r.db.WithContext(ctx).
		Where("prediction_id = ?", predictionID).
		Find(&bets).Error
	return bets, err
}

func (r *GormPredictionRepository) FindBetsByOptionID(ctx context.Context, optionID uint) ([]domain.PredictionBet, error) {
	var bets []domain.PredictionBet
	err := r.db.WithContext(ctx).
		Where("option_id = ?", optionID).
		Find(&bets).Error
	return bets, err
}
