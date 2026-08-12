package repository

import (
	"time"

	"go-stream/services/main-api/internal/domain"
	"gorm.io/gorm"
)

type notificationRepository struct{ db *gorm.DB }

func NewNotificationRepository(db *gorm.DB) domain.NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) Create(notification *domain.Notification) error {
	return r.db.Create(notification).Error
}

func (r *notificationRepository) ListByUserID(userID uint, limit, offset int) ([]domain.Notification, error) {
	var notifications []domain.Notification
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(limit).Offset(offset).Find(&notifications).Error
	return notifications, err
}

func (r *notificationRepository) UnreadCount(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&count).Error
	return count, err
}

func (r *notificationRepository) MarkRead(userID, notificationID uint) error {
	now := time.Now()
	return r.db.Model(&domain.Notification{}).Where("id = ? AND user_id = ? AND read_at IS NULL", notificationID, userID).Update("read_at", now).Error
}

func (r *notificationRepository) MarkAllRead(userID uint) error {
	now := time.Now()
	return r.db.Model(&domain.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Update("read_at", now).Error
}
