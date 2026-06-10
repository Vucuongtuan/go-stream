package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// LeaderboardMetric defines what metric is being ranked
type LeaderboardMetric string

const (
	MetricViewers LeaderboardMetric = "viewers"
	MetricDonate  LeaderboardMetric = "donate"
	MetricChat    LeaderboardMetric = "chat"
)

// LeaderboardPeriod defines the time window for ranking
type LeaderboardPeriod string

const (
	PeriodDaily   LeaderboardPeriod = "daily"
	PeriodWeekly  LeaderboardPeriod = "weekly"
	PeriodMonthly LeaderboardPeriod = "monthly"
	PeriodYearly  LeaderboardPeriod = "yearly"
)

// LeaderboardEntry represents a single ranked entry
type LeaderboardEntry struct {
	StreamerID uint    `json:"streamer_id"`
	Score      float64 `json:"score"`
	Rank       int64   `json:"rank"`
}

// LeaderboardRepository defines operations for managing streamer leaderboards.
type LeaderboardRepository interface {
	// IncrBy adds delta to a streamer's score for the given metric and period
	IncrBy(ctx context.Context, metric LeaderboardMetric, period LeaderboardPeriod, streamerID uint, delta float64) error
	// GetTopStreamers returns the top N streamers for the given metric and period
	GetTopStreamers(ctx context.Context, metric LeaderboardMetric, period LeaderboardPeriod, topN int64) ([]LeaderboardEntry, error)
	// GetStreamerRank returns the rank and score of a specific streamer
	GetStreamerRank(ctx context.Context, metric LeaderboardMetric, period LeaderboardPeriod, streamerID uint) (*LeaderboardEntry, error)
}

// RedisLeaderboardRepository implements LeaderboardRepository using Redis Sorted Sets.
type RedisLeaderboardRepository struct {
	rdb *redis.Client
}

func NewRedisLeaderboardRepository(rdb *redis.Client) *RedisLeaderboardRepository {
	return &RedisLeaderboardRepository{rdb: rdb}
}

// buildKey generates a time-bucketed Redis key for the leaderboard.
// Examples:
//   - gostream:leaderboard:viewers:daily:2026-06-07
//   - gostream:leaderboard:donate:weekly:2026-W23
//   - gostream:leaderboard:chat:monthly:2026-06
//   - gostream:leaderboard:viewers:yearly:2026
func (r *RedisLeaderboardRepository) buildKey(metric LeaderboardMetric, period LeaderboardPeriod) string {
	now := time.Now()
	var bucket string
	switch period {
	case PeriodDaily:
		bucket = now.Format("2006-01-02")
	case PeriodWeekly:
		year, week := now.ISOWeek()
		bucket = fmt.Sprintf("%d-W%02d", year, week)
	case PeriodMonthly:
		bucket = now.Format("2006-01")
	case PeriodYearly:
		bucket = now.Format("2006")
	default:
		bucket = now.Format("2006-01-02")
	}
	return fmt.Sprintf("gostream:leaderboard:%s:%s:%s", metric, period, bucket)
}

// ttlForPeriod returns an appropriate TTL for each leaderboard period key.
func ttlForPeriod(period LeaderboardPeriod) time.Duration {
	switch period {
	case PeriodDaily:
		return 48 * time.Hour
	case PeriodWeekly:
		return 14 * 24 * time.Hour
	case PeriodMonthly:
		return 62 * 24 * time.Hour
	case PeriodYearly:
		return 400 * 24 * time.Hour
	default:
		return 48 * time.Hour
	}
}

func (r *RedisLeaderboardRepository) IncrBy(ctx context.Context, metric LeaderboardMetric, period LeaderboardPeriod, streamerID uint, delta float64) error {
	key := r.buildKey(metric, period)
	member := fmt.Sprintf("%d", streamerID)

	pipe := r.rdb.Pipeline()
	pipe.ZIncrBy(ctx, key, delta, member)
	pipe.Expire(ctx, key, ttlForPeriod(period))
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RedisLeaderboardRepository) GetTopStreamers(ctx context.Context, metric LeaderboardMetric, period LeaderboardPeriod, topN int64) ([]LeaderboardEntry, error) {
	key := r.buildKey(metric, period)
	results, err := r.rdb.ZRevRangeWithScores(ctx, key, 0, topN-1).Result()
	if err != nil {
		return nil, err
	}

	entries := make([]LeaderboardEntry, 0, len(results))
	for i, z := range results {
		member, _ := z.Member.(string)
		var id uint64
		fmt.Sscanf(member, "%d", &id)
		entries = append(entries, LeaderboardEntry{
			StreamerID: uint(id),
			Score:      z.Score,
			Rank:       int64(i + 1),
		})
	}
	return entries, nil
}

func (r *RedisLeaderboardRepository) GetStreamerRank(ctx context.Context, metric LeaderboardMetric, period LeaderboardPeriod, streamerID uint) (*LeaderboardEntry, error) {
	key := r.buildKey(metric, period)
	member := fmt.Sprintf("%d", streamerID)

	rank, err := r.rdb.ZRevRank(ctx, key, member).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	score, err := r.rdb.ZScore(ctx, key, member).Result()
	if err != nil {
		return nil, err
	}

	return &LeaderboardEntry{
		StreamerID: streamerID,
		Score:      score,
		Rank:       rank + 1,
	}, nil
}
