package repository

import (
	"context"
	"errors"
	"go-stream/services/main-api/internal/domain"
	"time"

	"gorm.io/gorm"
)

type GormModerationRepository struct {
	db *gorm.DB
}

func NewModerationRepository(db *gorm.DB) domain.ModerationRepository {
	return &GormModerationRepository{db: db}
}

func (r *GormModerationRepository) AddModerator(ctx context.Context, roomID uint, userID uint) error {
	mod := &domain.RoomModerator{
		RoomID: roomID,
		UserID: userID,
	}
	return r.db.WithContext(ctx).Create(mod).Error
}

func (r *GormModerationRepository) RemoveModerator(ctx context.Context, roomID uint, userID uint) error {
	return r.db.WithContext(ctx).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Delete(&domain.RoomModerator{}).Error
}

func (r *GormModerationRepository) IsModerator(ctx context.Context, roomID uint, userID uint) (bool, error) {
	// Check if the user is the host of the room
	var room domain.Room
	if err := r.db.WithContext(ctx).Select("host_id").First(&room, roomID).Error; err == nil {
		if room.HostID == userID {
			return true, nil
		}
	}

	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.RoomModerator{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *GormModerationRepository) LogAction(ctx context.Context, log *domain.ModerationLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *GormModerationRepository) GetActiveBanOrTimeout(ctx context.Context, roomID uint, userID uint) (*domain.ModerationLog, error) {
	var log domain.ModerationLog
	now := time.Now()
	// Find latest active ban or timeout
	err := r.db.WithContext(ctx).
		Where("room_id = ? AND target_id = ? AND (expires_at IS NULL OR expires_at > ?)", roomID, userID, now).
		Order("id DESC").
		First(&log).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &log, nil
}

func (r *GormModerationRepository) RemoveActiveBan(ctx context.Context, roomID uint, userID uint) error {
	// Expire active bans by setting expires_at = now
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.ModerationLog{}).
		Where("room_id = ? AND target_id = ? AND action = ? AND (expires_at IS NULL OR expires_at > ?)", roomID, userID, domain.ModerationActionBan, now).
		Update("expires_at", now).Error
}
