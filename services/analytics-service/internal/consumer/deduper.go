package consumer

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const processedEventTTL = 14 * 24 * time.Hour

// EventDeduper stores only short-lived event IDs, never chat payloads.
type EventDeduper struct{ rdb *redis.Client }

func NewEventDeduper(rdb *redis.Client) *EventDeduper { return &EventDeduper{rdb: rdb} }

func (d *EventDeduper) IsProcessed(ctx context.Context, eventID string) (bool, error) {
	if d == nil || d.rdb == nil || eventID == "" {
		return false, nil
	}
	result, err := d.rdb.Exists(ctx, d.key(eventID)).Result()
	return result == 1, err
}

func (d *EventDeduper) MarkProcessed(ctx context.Context, eventID string) error {
	if d == nil || d.rdb == nil || eventID == "" {
		return nil
	}
	return d.rdb.Set(ctx, d.key(eventID), "1", processedEventTTL).Err()
}

func (d *EventDeduper) key(eventID string) string {
	return fmt.Sprintf("gostream:analytics:processed-event:%s", eventID)
}
