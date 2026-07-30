package outbox

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	statusPending    = "pending"
	statusProcessing = "processing"
	statusPublished  = "published"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Enqueue(tx *gorm.DB, topic, key string, event kafka.Event) error {
	id := uuid.NewString()
	// Keep the existing event fields and add a stable ID for downstream
	// idempotency. Existing consumers safely ignore the extra field.
	payload, err := json.Marshal(map[string]any{
		"event_id":   id,
		"event_type": event.EventType,
		"timestamp":  event.Timestamp,
		"payload":    event.Payload,
	})
	if err != nil {
		return fmt.Errorf("marshal outbox event: %w", err)
	}
	return tx.Create(&domain.OutboxEvent{
		ID: id, Topic: topic, MessageKey: key, Payload: string(payload), Status: statusPending,
	}).Error
}

// Claim atomically leases events. SKIP LOCKED lets multiple API replicas run
// workers without waiting on each other.
func (r *Repository) Claim(ctx context.Context, limit int, lease time.Duration) ([]domain.OutboxEvent, error) {
	var events []domain.OutboxEvent
	now := time.Now()
	until := now.Add(lease)
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("(status = ? OR (status = ? AND locked_until < ?))", statusPending, statusProcessing, now).
			Order("created_at ASC").Limit(limit).Find(&events).Error; err != nil {
			return err
		}
		for i := range events {
			if err := tx.Model(&events[i]).Updates(map[string]any{"status": statusProcessing, "locked_until": until}).Error; err != nil {
				return err
			}
			events[i].Status = statusProcessing
			events[i].LockedUntil = &until
		}
		return nil
	})
	return events, err
}

func (r *Repository) MarkPublished(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&domain.OutboxEvent{}).Where("id = ?", id).Updates(map[string]any{
		"status": statusPublished, "published_at": now, "locked_until": nil, "last_error": "",
	}).Error
}

func (r *Repository) MarkFailed(ctx context.Context, id string, publishErr error) error {
	return r.db.WithContext(ctx).Model(&domain.OutboxEvent{}).Where("id = ?", id).Updates(map[string]any{
		"status": statusPending, "locked_until": nil, "last_error": publishErr.Error(), "attempts": gorm.Expr("attempts + 1"),
	}).Error
}

// PrunePublished removes only successfully delivered events. Failed events are
// retained for investigation and manual replay.
func (r *Repository) PrunePublished(ctx context.Context, olderThan time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Where("status = ? AND published_at < ?", statusPublished, olderThan).Delete(&domain.OutboxEvent{})
	return result.RowsAffected, result.Error
}
