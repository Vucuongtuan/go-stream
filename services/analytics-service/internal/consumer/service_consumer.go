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
	RoomID uint `json:"room_id"`
}

// ChatPayload represents incoming chat message payload
type ChatPayload struct {
	RoomID uint `json:"room_id"`
}

// ServiceConsumer wraps goroutine loop consuming from Kafka and updating Repository
type ServiceConsumer struct {
	brokers []string
	groupID string
	topics  []string
	repo    repository.AnalyticsRepository
	readers []*kafka.Reader
}

func NewServiceConsumer(brokers string, groupID string, topics []string, repo repository.AnalyticsRepository) *ServiceConsumer {
	brokerList := strings.Split(brokers, ",")
	return &ServiceConsumer{
		brokers: brokerList,
		groupID: groupID,
		topics:  topics,
		repo:    repo,
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
		var p StreamPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			slog.Error("Failed to parse stream.started payload", "err", err)
			return
		}
		if err := sc.repo.StartRoomSession(ctx, p.RoomID); err != nil {
			slog.Error("Failed to start room session in Redis", "room_id", p.RoomID, "err", err)
		}

	case "stream.ended":
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

	case "chat.message":
		// Check key first
		var roomID uint
		if k, err := strconv.ParseUint(string(msg.Key), 10, 64); err == nil {
			roomID = uint(k)
		} else {
			// Fallback to parse payload
			var p ChatPayload
			if err := json.Unmarshal(event.Payload, &p); err != nil {
				slog.Error("Failed to parse chat.message payload", "err", err)
				return
			}
			roomID = p.RoomID
		}

		if err := sc.repo.IncrementChatCount(ctx, roomID); err != nil {
			slog.Error("Failed to increment chat count in Redis", "room_id", roomID, "err", err)
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
