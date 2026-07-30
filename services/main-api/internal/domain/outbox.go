package domain

import "time"

// OutboxEvent is persisted in the same database transaction as the business
// change that produced it. A background worker publishes it to Kafka later.
type OutboxEvent struct {
	ID          string     `gorm:"primaryKey;size:36" json:"id"`
	Topic       string     `gorm:"not null;size:100;index" json:"topic"`
	MessageKey  string     `gorm:"not null;size:255" json:"message_key"`
	Payload     string     `gorm:"type:jsonb;not null" json:"payload"`
	Status      string     `gorm:"not null;size:20;index:idx_outbox_status_lock" json:"status"`
	Attempts    int        `gorm:"not null;default:0" json:"attempts"`
	LockedUntil *time.Time `gorm:"index:idx_outbox_status_lock" json:"locked_until,omitempty"`
	LastError   string     `gorm:"size:1000" json:"last_error,omitempty"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}
