package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RankEntry represents one user's ranked activity score within a room
type RankEntry struct {
	UserID uint    `json:"user_id"`
	Score  float64 `json:"score"`
	Rank   int64   `json:"rank"`
}

// RoomStatsRepository manages per-room real-time donor and chatter rankings.
type RoomStatsRepository interface {
	// Donor tracking
	IncrementDonation(ctx context.Context, roomID uint, userID uint, coinAmount float64) error
	GetTopDonors(ctx context.Context, roomID uint, topN int64) ([]RankEntry, error)

	// Chatter tracking
	IncrementChatterCount(ctx context.Context, roomID uint, userID uint) error
	GetTopChatters(ctx context.Context, roomID uint, topN int64) ([]RankEntry, error)

	// Cleanup on stream end
	CleanupRoomRankings(ctx context.Context, roomID uint) error
}

// RedisRoomStatsRepository implements RoomStatsRepository using Redis Sorted Sets.
type RedisRoomStatsRepository struct {
	rdb *redis.Client
}

func NewRedisRoomStatsRepository(rdb *redis.Client) *RedisRoomStatsRepository {
	return &RedisRoomStatsRepository{rdb: rdb}
}

func (r *RedisRoomStatsRepository) donorKey(roomID uint) string {
	return fmt.Sprintf("gostream:analytics:room:%d:donors", roomID)
}

func (r *RedisRoomStatsRepository) chatterKey(roomID uint) string {
	return fmt.Sprintf("gostream:analytics:room:%d:chatters", roomID)
}

// IncrementDonation increments a donor's total coin contribution in the room ranking.
func (r *RedisRoomStatsRepository) IncrementDonation(ctx context.Context, roomID uint, userID uint, coinAmount float64) error {
	key := r.donorKey(roomID)
	member := fmt.Sprintf("%d", userID)

	pipe := r.rdb.Pipeline()
	pipe.ZIncrBy(ctx, key, coinAmount, member)
	pipe.Expire(ctx, key, 24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

// GetTopDonors returns the top N donors in a room sorted by total coins donated.
func (r *RedisRoomStatsRepository) GetTopDonors(ctx context.Context, roomID uint, topN int64) ([]RankEntry, error) {
	key := r.donorKey(roomID)
	results, err := r.rdb.ZRevRangeWithScores(ctx, key, 0, topN-1).Result()
	if err != nil {
		return nil, err
	}

	entries := make([]RankEntry, 0, len(results))
	for i, z := range results {
		member, _ := z.Member.(string)
		var id uint64
		fmt.Sscanf(member, "%d", &id)
		entries = append(entries, RankEntry{
			UserID: uint(id),
			Score:  z.Score,
			Rank:   int64(i + 1),
		})
	}
	return entries, nil
}

// IncrementChatterCount increments a user's message count in the room's chatter ranking.
func (r *RedisRoomStatsRepository) IncrementChatterCount(ctx context.Context, roomID uint, userID uint) error {
	key := r.chatterKey(roomID)
	member := fmt.Sprintf("%d", userID)

	pipe := r.rdb.Pipeline()
	pipe.ZIncrBy(ctx, key, 1, member)
	pipe.Expire(ctx, key, 24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

// GetTopChatters returns the top N most active chatters in a room.
func (r *RedisRoomStatsRepository) GetTopChatters(ctx context.Context, roomID uint, topN int64) ([]RankEntry, error) {
	key := r.chatterKey(roomID)
	results, err := r.rdb.ZRevRangeWithScores(ctx, key, 0, topN-1).Result()
	if err != nil {
		return nil, err
	}

	entries := make([]RankEntry, 0, len(results))
	for i, z := range results {
		member, _ := z.Member.(string)
		var id uint64
		fmt.Sscanf(member, "%d", &id)
		entries = append(entries, RankEntry{
			UserID: uint(id),
			Score:  z.Score,
			Rank:   int64(i + 1),
		})
	}
	return entries, nil
}

// CleanupRoomRankings deletes all per-room ranking keys after stream ends.
func (r *RedisRoomStatsRepository) CleanupRoomRankings(ctx context.Context, roomID uint) error {
	pipe := r.rdb.Pipeline()
	pipe.Del(ctx, r.donorKey(roomID))
	pipe.Del(ctx, r.chatterKey(roomID))
	_, err := pipe.Exec(ctx)
	return err
}
