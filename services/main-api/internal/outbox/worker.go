package outbox

import (
	"context"
	"encoding/json"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"go-stream/services/main-api/pkg/logger"
)

type Worker struct {
	repo     *Repository
	producer *kafka.Producer
}

func NewWorker(repo *Repository, producer *kafka.Producer) *Worker {
	return &Worker{repo: repo, producer: producer}
}

func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	nextPrune := time.Now().Add(time.Hour)
	for {
		if err := w.drain(ctx); err != nil && ctx.Err() == nil {
			logger.Error("Outbox drain failed", err)
		}
		if time.Now().After(nextPrune) {
			if deleted, err := w.repo.PrunePublished(ctx, time.Now().Add(-30*24*time.Hour)); err != nil {
				logger.Error("Outbox pruning failed", err)
			} else if deleted > 0 {
				logger.Info("Pruned published outbox events", "count", deleted)
			}
			nextPrune = time.Now().Add(time.Hour)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (w *Worker) drain(ctx context.Context) error {
	events, err := w.repo.Claim(ctx, 50, 30*time.Second)
	if err != nil || len(events) == 0 {
		return err
	}
	for _, event := range events {
		if err := w.publish(ctx, event); err != nil {
			logger.Error("Outbox publish failed", err, "event_id", event.ID, "topic", event.Topic)
			if markErr := w.repo.MarkFailed(ctx, event.ID, err); markErr != nil {
				return markErr
			}
			continue
		}
		if err := w.repo.MarkPublished(ctx, event.ID); err != nil {
			return err
		}
	}
	return nil
}

func (w *Worker) publish(ctx context.Context, event domain.OutboxEvent) error {
	var payload kafka.Event
	if err := json.Unmarshal([]byte(event.Payload), &payload); err != nil {
		return err
	}
	publishCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return w.producer.Publish(publishCtx, event.Topic, event.MessageKey, payload)
}
