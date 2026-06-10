package consumer

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
	"go-stream/services/analytics-service/internal/repository"
)

// KafkaEvent represents standard payload format
type KafkaEvent struct {
	EventType string          `json:"event_type"`
	Timestamp string          `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

// StreamPayload represents room status change payload
type StreamPayload struct {
	RoomID     uint `json:"room_id"`
	StreamerID uint `json:"streamer_id"`
}

// ChatPayload represents incoming chat message payload
type ChatPayload struct {
	RoomID uint `json:"room_id"`
	UserID uint `json:"user_id"`
}

// DonationPayload represents a donation.sent event payload
type DonationPayload struct {
	RoomID     uint    `json:"room_id"`
	StreamerID uint    `json:"streamer_id"`
	DonorID    uint    `json:"donor_id"`
	CoinAmount float64 `json:"coin_amount"`
	GiftType   int     `json:"gift_type"`
}

// ServiceConsumer wraps goroutine loop consuming from Kafka and updating Repository
type ServiceConsumer struct {
	brokers      []string
	groupID      string
	topics       []string
	repo         repository.AnalyticsRepository
	leaderboard  repository.LeaderboardRepository
	roomStats    repository.RoomStatsRepository
	readers      []*kafka.Reader
}

func NewServiceConsumer(
	brokers string,
	groupID string,
	topics []string,
	repo repository.AnalyticsRepository,
	leaderboard repository.LeaderboardRepository,
	roomStats repository.RoomStatsRepository,
) *ServiceConsumer {
	brokerList := strings.Split(brokers, ",")
	return &ServiceConsumer{
		brokers:     brokerList,
		groupID:     groupID,
		topics:      topics,
		repo:        repo,
		leaderboard: leaderboard,
		roomStats:   roomStats,
	}
}

// Start spawns reader loops concurrently for each topic.
// It returns an error if any of the consumers fail or when context is cancelled.
func (sc *ServiceConsumer) Start(ctx context.Context) error {
	sc.readers = make([]*kafka.Reader, len(sc.topics))

	for i, topic := range sc.topics {
		reader := kafka.NewReader(kafka.ReaderConfig{
			Brokers:  sc.brokers,
			GroupID:  sc.groupID,
			Topic:    topic,
			MinBytes: 1,
			MaxBytes: 10e6,
		})
		sc.readers[i] = reader

		// Launch concurrent worker for each topic
		go func(r *kafka.Reader, t string) {
			slog.Info("Kafka Consumer started listening", "topic", t)
			for {
				msg, err := r.ReadMessage(ctx)
				if err != nil {
					if ctx.Err() != nil {
						// Context cancelled, clean exit
						return
					}
					slog.Error("Kafka read message error", "topic", t, "err", err)
					time.Sleep(1 * time.Second) // backoff to prevent log spamming
					continue
				}

				// Spawn a lightweight goroutine to handle processing asynchronously
				go sc.processMessage(ctx, msg)
			}
		}(reader, topic)
	}

	<-ctx.Done()
	return nil
}

func (sc *ServiceConsumer) processMessage(ctx context.Context, msg kafka.Message) {
	var event KafkaEvent
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		slog.Error("Failed to unmarshal Kafka event", "topic", msg.Topic, "err", err)
		return
	}

	slog.Info("Processing Kafka event", "type", event.EventType, "topic", msg.Topic)

	switch event.EventType {
	case "stream.started":
		sc.handleStreamStarted(ctx, event)

	case "stream.ended":
		sc.handleStreamEnded(ctx, event)

	case "chat.message":
		sc.handleChatMessage(ctx, msg, event)

	case "donation.sent":
		sc.handleDonationSent(ctx, event)
	}
}

func (sc *ServiceConsumer) handleStreamStarted(ctx context.Context, event KafkaEvent) {
	var p StreamPayload
	if err := json.Unmarshal(event.Payload, &p); err != nil {
		slog.Error("Failed to parse stream.started payload", "err", err)
		return
	}
	if err := sc.repo.StartRoomSession(ctx, p.RoomID); err != nil {
		slog.Error("Failed to start room session in Redis", "room_id", p.RoomID, "err", err)
	}
}

func (sc *ServiceConsumer) handleStreamEnded(ctx context.Context, event KafkaEvent) {
	var p StreamPayload
	if err := json.Unmarshal(event.Payload, &p); err != nil {
		slog.Error("Failed to parse stream.ended payload", "err", err)
		return
	}

	stats, err := sc.repo.EndRoomSession(ctx, p.RoomID)
	if err != nil {
		slog.Error("Failed to end room session in Redis", "room_id", p.RoomID, "err", err)
		return
	}

	slog.Info("📈 Live Stream Session Ended Stats",
		"room_id", stats["room_id"],
		"total_chats", stats["total_chats"],
		"duration_seconds", stats["duration_seconds"],
	)

	// Update all leaderboards with session stats (all periods)
	if sc.leaderboard != nil && p.StreamerID != 0 {
		durationSec, _ := stats["duration_seconds"].(float64)
		chatCount, _ := stats["total_chats"].(int64)
		allPeriods := []repository.LeaderboardPeriod{
			repository.PeriodDaily,
			repository.PeriodWeekly,
			repository.PeriodMonthly,
			repository.PeriodYearly,
		}
		for _, period := range allPeriods {
			// Chat leaderboard: add chat count from this session
			if chatCount > 0 {
				if err := sc.leaderboard.IncrBy(ctx, repository.MetricChat, period, p.StreamerID, float64(chatCount)); err != nil {
					slog.Warn("Failed to update chat leaderboard", "streamer_id", p.StreamerID, "period", period, "err", err)
				}
			}
			// Viewer leaderboard: use duration as proxy for viewer engagement (weighted)
			if durationSec > 0 {
				if err := sc.leaderboard.IncrBy(ctx, repository.MetricViewers, period, p.StreamerID, durationSec); err != nil {
					slog.Warn("Failed to update viewers leaderboard", "streamer_id", p.StreamerID, "period", period, "err", err)
				}
			}
		}
	}

	// Cleanup per-room rankings after stream ends
	if sc.roomStats != nil {
		if err := sc.roomStats.CleanupRoomRankings(ctx, p.RoomID); err != nil {
			slog.Warn("Failed to cleanup room rankings", "room_id", p.RoomID, "err", err)
		}
	}
}

func (sc *ServiceConsumer) handleChatMessage(ctx context.Context, msg kafka.Message, event KafkaEvent) {
	// Resolve room_id: prefer message key, fall back to payload
	var roomID uint
	if k, err := strconv.ParseUint(string(msg.Key), 10, 64); err == nil {
		roomID = uint(k)
	} else {
		var p ChatPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			slog.Error("Failed to parse chat.message payload", "err", err)
			return
		}
		roomID = p.RoomID
	}

	// Increment overall room chat counter
	if err := sc.repo.IncrementChatCount(ctx, roomID); err != nil {
		slog.Error("Failed to increment chat count in Redis", "room_id", roomID, "err", err)
	}

	// Track individual chatter in per-room ranking
	if sc.roomStats != nil {
		var p ChatPayload
		if err := json.Unmarshal(event.Payload, &p); err == nil && p.UserID != 0 {
			if err := sc.roomStats.IncrementChatterCount(ctx, roomID, p.UserID); err != nil {
				slog.Warn("Failed to increment chatter count", "room_id", roomID, "user_id", p.UserID, "err", err)
			}
		}
	}
}

func (sc *ServiceConsumer) handleDonationSent(ctx context.Context, event KafkaEvent) {
	var p DonationPayload
	if err := json.Unmarshal(event.Payload, &p); err != nil {
		slog.Error("Failed to parse donation.sent payload", "err", err)
		return
	}

	// 1. Track donor in per-room ranking
	if sc.roomStats != nil && p.DonorID != 0 {
		if err := sc.roomStats.IncrementDonation(ctx, p.RoomID, p.DonorID, p.CoinAmount); err != nil {
			slog.Warn("Failed to track donation in room stats", "room_id", p.RoomID, "donor_id", p.DonorID, "err", err)
		}
	}

	// 2. Update streamer's donation leaderboard for all periods
	if sc.leaderboard != nil && p.StreamerID != 0 {
		allPeriods := []repository.LeaderboardPeriod{
			repository.PeriodDaily,
			repository.PeriodWeekly,
			repository.PeriodMonthly,
			repository.PeriodYearly,
		}
		for _, period := range allPeriods {
			if err := sc.leaderboard.IncrBy(ctx, repository.MetricDonate, period, p.StreamerID, p.CoinAmount); err != nil {
				slog.Warn("Failed to update donation leaderboard", "streamer_id", p.StreamerID, "period", period, "err", err)
			}
		}
	}
}

// Close gracefully closes all Kafka readers
func (sc *ServiceConsumer) Close() {
	for _, r := range sc.readers {
		if r != nil {
			_ = r.Close()
		}
	}
	slog.Info("All Kafka consumers closed")
}
