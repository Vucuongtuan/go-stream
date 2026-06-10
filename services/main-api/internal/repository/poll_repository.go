package repository

import (
	"context"
	"errors"
	"go-stream/services/main-api/internal/domain"

	"gorm.io/gorm"
)

type GormPollRepository struct {
	db *gorm.DB
}

func NewPollRepository(db *gorm.DB) domain.PollRepository {
	return &GormPollRepository{db: db}
}

func (r *GormPollRepository) Create(ctx context.Context, poll *domain.Poll) error {
	return r.db.WithContext(ctx).Create(poll).Error
}

func (r *GormPollRepository) FindByID(ctx context.Context, id uint) (*domain.Poll, error) {
	var poll domain.Poll
	err := r.db.WithContext(ctx).Preload("Options").First(&poll, id).Error
	if err != nil {
		return nil, err
	}
	return &poll, nil
}

func (r *GormPollRepository) FindActiveByRoomID(ctx context.Context, roomID uint) (*domain.Poll, error) {
	var poll domain.Poll
	err := r.db.WithContext(ctx).
		Preload("Options").
		Where("room_id = ? AND status = ?", roomID, domain.PollStatusActive).
		Order("id DESC").
		First(&poll).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (r *GormPollRepository) Update(ctx context.Context, poll *domain.Poll) error {
	return r.db.WithContext(ctx).Save(poll).Error
}

func (r *GormPollRepository) CreateVote(ctx context.Context, vote *domain.PollVote) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update option vote count
		err := tx.Model(&domain.PollOption{}).
			Where("id = ?", vote.OptionID).
			UpdateColumn("votes", gorm.Expr("votes + 1")).Error
		if err != nil {
			return err
		}
		return tx.Create(vote).Error
	})
}

func (r *GormPollRepository) HasUserVoted(ctx context.Context, pollID uint, userID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.PollVote{}).
		Where("poll_id = ? AND user_id = ?", pollID, userID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
