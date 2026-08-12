package domain

import "time"

// Notification is a durable per-user inbox item.  Delivery channels (web,
// mobile push, email) consume the notification.created outbox event; they do
// not own the user's read state.
type Notification struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"not null;index:idx_notifications_user_created" json:"user_id"`
	Type      string     `gorm:"not null;size:100;index" json:"type"`
	Title     string     `gorm:"not null;size:255" json:"title"`
	Body      string     `gorm:"not null;size:2000" json:"body"`
	ActionURL string     `gorm:"size:512" json:"action_url,omitempty"`
	Data      string     `gorm:"type:jsonb;not null;default:'{}'" json:"data"`
	ReadAt    *time.Time `gorm:"index" json:"read_at,omitempty"`
	CreatedAt time.Time  `gorm:"index:idx_notifications_user_created" json:"created_at"`
}

type NotificationRepository interface {
	Create(notification *Notification) error
	ListByUserID(userID uint, limit, offset int) ([]Notification, error)
	UnreadCount(userID uint) (int64, error)
	MarkRead(userID, notificationID uint) error
	MarkAllRead(userID uint) error
}

type NotificationService interface {
	Create(userID uint, notificationType, title, body, actionURL string, data map[string]any) error
	List(userID uint, limit, offset int) ([]Notification, int64, error)
	MarkRead(userID, notificationID uint) error
	MarkAllRead(userID uint) error
}
