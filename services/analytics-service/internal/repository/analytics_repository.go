package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// AnalyticsRepository defines operations for storing and retrieving room analytics metrics.
type AnalyticsRepository interface {
	IncrementChatCount(ctx context.Context, roomID uint) error
	GetChatCount(ctx context.Context, roomID uint) (int64, error)
	StartRoomSession(ctx context.Context, roomID uint) error
	EndRoomSession(ctx context.Context, roomID uint) (map[string]any, error)
}

// RedisAnalyticsRepository implements AnalyticsRepository using Redis.
type RedisAnalyticsRepository struct {
	rdb *redis.Client
}

func NewRedisAnalyticsRepository(rdb *redis.Client) *RedisAnalyticsRepository {
	return &RedisAnalyticsRepository{rdb: rdb}
}

// keys helper to generate redis keys consistently
func (r *RedisAnalyticsRepository) chatKey(roomID uint) string {
	return fmt.Sprintf("gostream:analytics:room:%d:chat_count", roomID)
}

func (r *RedisAnalyticsRepository) metaKey(roomID uint) string {
	return fmt.Sprintf("gostream:analytics:room:%d:meta", roomID)
}

func (r *RedisAnalyticsRepository) IncrementChatCount(ctx context.Context, roomID uint) error {
	key := r.chatKey(roomID)
	// Increment key and set a safety TTL of 24 hours
	err := r.rdb.Incr(ctx, key).Err()
	if err != nil {
		return err
	}
	// Soft TTL update just in case room session was never closed
	r.rdb.Expire(ctx, key, 24*time.Hour)
	return nil
}

func (r *RedisAnalyticsRepository) GetChatCount(ctx context.Context, roomID uint) (int64, error) {
	val, err := r.rdb.Get(ctx, r.chatKey(roomID)).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

func (r *RedisAnalyticsRepository) StartRoomSession(ctx context.Context, roomID uint) error {
	metaKey := r.metaKey(roomID)
	chatKey := r.chatKey(roomID)

	pipe := r.rdb.Pipeline()
	// Initialize chat count to 0
	pipe.Set(ctx, chatKey, 0, 24*time.Hour)
	// Save start metadata
	pipe.HSet(ctx, metaKey, map[string]interface{}{
		"start_time": time.Now().Format(time.RFC3339),
		"status":     "live",
	})
	pipe.Expire(ctx, metaKey, 24*time.Hour)

	_, err := pipe.Exec(ctx)
	return err
}

func (r *RedisAnalyticsRepository) EndRoomSession(ctx context.Context, roomID uint) (map[string]any, error) {
	metaKey := r.metaKey(roomID)
	chatKey := r.chatKey(roomID)

	// Fetch current stats before cleanup
	chatCount, err := r.GetChatCount(ctx, roomID)
	if err != nil {
		chatCount = 0
	}

	startTimeStr, err := r.rdb.HGet(ctx, metaKey, "start_time").Result()
	var duration time.Duration
	if err == nil {
		if startTime, parseErr := time.Parse(time.RFC3339, startTimeStr); parseErr == nil {
			duration = time.Since(startTime)
		}
	}

	// Clean up Redis keys in transaction pipeline
	pipe := r.rdb.Pipeline()
	pipe.Del(ctx, chatKey)
	pipe.Del(ctx, metaKey)
	_, _ = pipe.Exec(ctx)

	return map[string]any{
		"room_id":          roomID,
		"total_chats":      chatCount,
		"duration_seconds": duration.Seconds(),
		"ended_at":         time.Now().Format(time.RFC3339),
	}, nil
}
