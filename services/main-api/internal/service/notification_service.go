package service

import (
	"encoding/json"
	"fmt"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"go-stream/services/main-api/internal/outbox"
	"gorm.io/gorm"
)

type notificationService struct {
	repo   domain.NotificationRepository
	db     *gorm.DB
	outbox *outbox.Repository
}

func NewNotificationService(db *gorm.DB, repo domain.NotificationRepository, outboxRepo *outbox.Repository) domain.NotificationService {
	return &notificationService{db: db, repo: repo, outbox: outboxRepo}
}

func (s *notificationService) Create(userID uint, notificationType, title, body, actionURL string, data map[string]any) error {
	encoded, err := json.Marshal(data)
	if err != nil {
		return err
	}
	notification := &domain.Notification{UserID: userID, Type: notificationType, Title: title, Body: body, ActionURL: actionURL, Data: string(encoded)}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(notification).Error; err != nil {
			return err
		}
		if s.outbox == nil {
			return nil
		}
		return s.outbox.Enqueue(tx, kafka.TopicNotificationEvents, fmt.Sprintf("%d", userID), kafka.Event{
			EventType: kafka.EventNotificationCreated,
			Timestamp: time.Now().UTC(),
			Payload:   notification,
		})
	})
}

func (s *notificationService) List(userID uint, limit, offset int) ([]domain.Notification, int64, error) {
	notifications, err := s.repo.ListByUserID(userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	unread, err := s.repo.UnreadCount(userID)
	return notifications, unread, err
}

func (s *notificationService) MarkRead(userID, notificationID uint) error {
	return s.repo.MarkRead(userID, notificationID)
}
func (s *notificationService) MarkAllRead(userID uint) error { return s.repo.MarkAllRead(userID) }
