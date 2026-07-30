package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
	"go-stream/services/analytics-service/internal/repository"
)

const (
	defaultMaxProcessAttempts = 3
	defaultRetryBackoff       = 250 * time.Millisecond
	defaultDLQTopic           = "analytics-events-dlq"
)

// KafkaEvent represents standard payload format.
type KafkaEvent struct {
	EventID   string          `json:"event_id"`
	EventType string          `json:"event_type"`
	Timestamp string          `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

type StreamPayload struct {
	RoomID     uint `json:"room_id"`
	StreamerID uint `json:"streamer_id"`
	// host_id is kept for compatibility with stream events published by older
	// main-api versions.
	HostID uint `json:"host_id"`
}

type ChatPayload struct {
	RoomID uint `json:"room_id"`
	UserID uint `json:"user_id"`
}

type DonationPayload struct {
	RoomID     uint    `json:"room_id"`
	StreamerID uint    `json:"streamer_id"`
	DonorID    uint    `json:"donor_id"`
	CoinAmount float64 `json:"coin_amount"`
	GiftType   int     `json:"gift_type"`
}

// ServiceConsumer consumes one message at a time per topic reader. A message
// is committed only after processing succeeds or after it is safely persisted
// to the DLQ. This prevents the previous ReadMessage + goroutine pattern from
// committing an offset before Redis work had completed.
type ServiceConsumer struct {
	brokers      []string
	groupID      string
	topics       []string
	repo         repository.AnalyticsRepository
	leaderboard  repository.LeaderboardRepository
	roomStats    repository.RoomStatsRepository
	readers      []*kafka.Reader
	dlqWriter    *kafka.Writer
	maxAttempts  int
	retryBackoff time.Duration
	deduper      *EventDeduper
}

func NewServiceConsumer(brokers, groupID string, topics []string, repo repository.AnalyticsRepository, leaderboard repository.LeaderboardRepository, roomStats repository.RoomStatsRepository, deduper *EventDeduper) *ServiceConsumer {
	brokerList := strings.Split(brokers, ",")
	return &ServiceConsumer{
		brokers:     brokerList,
		groupID:     groupID,
		topics:      topics,
		repo:        repo,
		leaderboard: leaderboard,
		roomStats:   roomStats,
		dlqWriter: &kafka.Writer{
			Addr:         kafka.TCP(brokerList...),
			Topic:        defaultDLQTopic,
			RequiredAcks: kafka.RequireAll,
			Async:        false,
		},
		maxAttempts:  defaultMaxProcessAttempts,
		retryBackoff: defaultRetryBackoff,
		deduper:      deduper,
	}
}

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

		go sc.consumeTopic(ctx, reader, topic)
	}

	<-ctx.Done()
	return nil
}

func (sc *ServiceConsumer) consumeTopic(ctx context.Context, reader *kafka.Reader, topic string) {
	slog.Info("Kafka consumer started", "topic", topic)
	for {
		// FetchMessage deliberately leaves the consumer offset uncommitted.
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.Error("Kafka fetch message failed", "topic", topic, "err", err)
			if !waitForRetry(ctx, sc.retryBackoff) {
				return
			}
			continue
		}

		if err := sc.processWithRetry(ctx, msg); err != nil {
			// Do not commit. The message will be redelivered after a rebalance or
			// restart, so transient failures are never silently discarded.
			slog.Error("Kafka message was not processed or sent to DLQ", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "err", err)
			if !waitForRetry(ctx, sc.retryBackoff) {
				return
			}
			continue
		}

		if err := reader.CommitMessages(ctx, msg); err != nil {
			slog.Error("Kafka offset commit failed", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "err", err)
			if !waitForRetry(ctx, sc.retryBackoff) {
				return
			}
		}
	}
}

func (sc *ServiceConsumer) processWithRetry(ctx context.Context, msg kafka.Message) error {
	eventID, err := eventIDFromMessage(msg)
	if err != nil {
		return sc.publishDLQ(ctx, msg, err)
	}
	if eventID != "" {
		processed, err := sc.deduper.IsProcessed(ctx, eventID)
		if err != nil {
			return fmt.Errorf("check processed event %s: %w", eventID, err)
		}
		if processed {
			slog.Info("Skipping already processed analytics event", "event_id", eventID, "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset)
			return nil
		}
	}

	var processErr error
	for attempt := 1; attempt <= sc.maxAttempts; attempt++ {
		if processErr = sc.processMessage(ctx, msg); processErr == nil {
			if eventID != "" {
				if err := sc.deduper.MarkProcessed(ctx, eventID); err != nil {
					return fmt.Errorf("mark processed event %s: %w", eventID, err)
				}
			}
			return nil
		}
		slog.Warn("Kafka message processing failed", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "attempt", attempt, "max_attempts", sc.maxAttempts, "err", processErr)
		if attempt < sc.maxAttempts && !waitForRetry(ctx, sc.retryBackoff*time.Duration(attempt)) {
			return ctx.Err()
		}
	}
	return sc.publishDLQ(ctx, msg, processErr)
}

func eventIDFromMessage(msg kafka.Message) (string, error) {
	var event KafkaEvent
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		return "", fmt.Errorf("unmarshal Kafka event: %w", err)
	}
	return event.EventID, nil
}

func (sc *ServiceConsumer) publishDLQ(ctx context.Context, msg kafka.Message, processErr error) error {
	payload, err := json.Marshal(map[string]any{
		"failed_at": time.Now().UTC().Format(time.RFC3339Nano),
		"error":     processErr.Error(),
		"attempts":  sc.maxAttempts,
		"source": map[string]any{
			"topic":     msg.Topic,
			"partition": msg.Partition,
			"offset":    msg.Offset,
			"key":       string(msg.Key),
			"value":     json.RawMessage(msg.Value),
		},
	})
	if err != nil {
		return fmt.Errorf("marshal DLQ payload: %w", err)
	}
	if err := sc.dlqWriter.WriteMessages(ctx, kafka.Message{Key: msg.Key, Value: payload}); err != nil {
		return fmt.Errorf("write analytics DLQ message: %w", err)
	}
	slog.Error("Kafka message sent to DLQ", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "error", processErr)
	return nil
}

func waitForRetry(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func (sc *ServiceConsumer) processMessage(ctx context.Context, msg kafka.Message) error {
	var event KafkaEvent
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		return fmt.Errorf("unmarshal Kafka event: %w", err)
	}

	slog.Info("Processing Kafka event", "type", event.EventType, "topic", msg.Topic)
	switch event.EventType {
	case "stream.started":
		return sc.handleStreamStarted(ctx, event)
	case "stream.ended":
		return sc.handleStreamEnded(ctx, event)
	case "chat.message":
		return sc.handleChatMessage(ctx, msg, event)
	case "donation.sent":
		return sc.handleDonationSent(ctx, event)
	default:
		// The topic can safely contain event types owned by other consumers.
		slog.Debug("Ignoring unsupported analytics event", "type", event.EventType, "topic", msg.Topic)
		return nil
	}
}

func (sc *ServiceConsumer) handleStreamStarted(ctx context.Context, event KafkaEvent) error {
	var p StreamPayload
	if err := json.Unmarshal(event.Payload, &p); err != nil {
		return fmt.Errorf("parse stream.started payload: %w", err)
	}
	if err := sc.repo.StartRoomSession(ctx, p.RoomID); err != nil {
		return fmt.Errorf("start room session %d: %w", p.RoomID, err)
	}
	return nil
}

func (sc *ServiceConsumer) handleStreamEnded(ctx context.Context, event KafkaEvent) error {
	var p StreamPayload
	if err := json.Unmarshal(event.Payload, &p); err != nil {
		return fmt.Errorf("parse stream.ended payload: %w", err)
	}

	stats, err := sc.repo.EndRoomSession(ctx, p.RoomID)
	if err != nil {
		return fmt.Errorf("end room session %d: %w", p.RoomID, err)
	}
	slog.Info("Live stream session ended", "room_id", stats["room_id"], "total_chats", stats["total_chats"], "duration_seconds", stats["duration_seconds"])

	streamerID := p.StreamerID
	if streamerID == 0 {
		streamerID = p.HostID
	}
	if sc.leaderboard != nil && streamerID != 0 {
		durationSec, _ := stats["duration_seconds"].(float64)
		chatCount, _ := stats["total_chats"].(int64)
		for _, period := range []repository.LeaderboardPeriod{repository.PeriodDaily, repository.PeriodWeekly, repository.PeriodMonthly, repository.PeriodYearly} {
			if chatCount > 0 {
				if err := sc.leaderboard.IncrBy(ctx, repository.MetricChat, period, streamerID, float64(chatCount)); err != nil {
					return fmt.Errorf("update chat leaderboard: %w", err)
				}
			}
			if durationSec > 0 {
				if err := sc.leaderboard.IncrBy(ctx, repository.MetricViewers, period, streamerID, durationSec); err != nil {
					return fmt.Errorf("update viewer leaderboard: %w", err)
				}
			}
		}
	}
	if sc.roomStats != nil {
		if err := sc.roomStats.CleanupRoomRankings(ctx, p.RoomID); err != nil {
			return fmt.Errorf("cleanup room rankings %d: %w", p.RoomID, err)
		}
	}
	return nil
}

func (sc *ServiceConsumer) handleChatMessage(ctx context.Context, msg kafka.Message, event KafkaEvent) error {
	var payload ChatPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("parse chat.message payload: %w", err)
	}
	roomID := payload.RoomID
	if keyID, err := strconv.ParseUint(string(msg.Key), 10, 64); err == nil {
		roomID = uint(keyID)
	}
	if err := sc.repo.IncrementChatCount(ctx, roomID); err != nil {
		return fmt.Errorf("increment chat count for room %d: %w", roomID, err)
	}
	if sc.roomStats != nil && payload.UserID != 0 {
		if err := sc.roomStats.IncrementChatterCount(ctx, roomID, payload.UserID); err != nil {
			return fmt.Errorf("increment chatter count for room %d: %w", roomID, err)
		}
	}
	return nil
}

func (sc *ServiceConsumer) handleDonationSent(ctx context.Context, event KafkaEvent) error {
	var p DonationPayload
	if err := json.Unmarshal(event.Payload, &p); err != nil {
		return fmt.Errorf("parse donation.sent payload: %w", err)
	}
	if sc.roomStats != nil && p.DonorID != 0 {
		if err := sc.roomStats.IncrementDonation(ctx, p.RoomID, p.DonorID, p.CoinAmount); err != nil {
			return fmt.Errorf("track donation for room %d: %w", p.RoomID, err)
		}
	}
	if sc.leaderboard != nil && p.StreamerID != 0 {
		for _, period := range []repository.LeaderboardPeriod{repository.PeriodDaily, repository.PeriodWeekly, repository.PeriodMonthly, repository.PeriodYearly} {
			if err := sc.leaderboard.IncrBy(ctx, repository.MetricDonate, period, p.StreamerID, p.CoinAmount); err != nil {
				return fmt.Errorf("update donation leaderboard: %w", err)
			}
		}
	}
	return nil
}

func (sc *ServiceConsumer) Close() {
	for _, r := range sc.readers {
		if r != nil {
			_ = r.Close()
		}
	}
	if sc.dlqWriter != nil {
		_ = sc.dlqWriter.Close()
	}
	slog.Info("All Kafka consumers closed")
}
