package consumer

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/segmentio/kafka-go"

	"go-stream/services/notification-service/internal/notifier"
)

// Event represents a Kafka event message
type Event struct {
	EventType string          `json:"event_type"`
	Timestamp string          `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

// StreamPayload for stream events
type StreamPayload struct {
	RoomID      uint   `json:"room_id"`
	HostID      uint   `json:"host_id"`
	Title       string `json:"title"`
	PlaybackURL string `json:"playback_url,omitempty"`
}

// UserPayload for user events  
type UserPayload struct {
	UserID uint   `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
}

// ChatPayload for chat events
type ChatPayload struct {
	RoomID   uint   `json:"room_id"`
	UserID   uint   `json:"user_id"`
	UserName string `json:"user_name"`
	Content  string `json:"content"`
}

// KafkaConsumer consumes messages from multiple topics
type KafkaConsumer struct {
	readers  []*kafka.Reader
	notifier notifier.Notifier
}

func NewKafkaConsumer(brokers []string, groupID string, topics []string, n notifier.Notifier) *KafkaConsumer {
	readers := make([]*kafka.Reader, len(topics))
	for i, topic := range topics {
		readers[i] = kafka.NewReader(kafka.ReaderConfig{
			Brokers:  brokers,
			GroupID:  groupID,
			Topic:    topic,
			MinBytes: 1,
			MaxBytes: 10e6,
		})
	}
	return &KafkaConsumer{readers: readers, notifier: n}
}

func (c *KafkaConsumer) Start(ctx context.Context) error {
	errCh := make(chan error, len(c.readers))

	for _, reader := range c.readers {
		go func(r *kafka.Reader) {
			slog.Info("Consumer started", "topic", r.Config().Topic)
			for {
				msg, err := r.ReadMessage(ctx)
				if err != nil {
					if ctx.Err() != nil {
						return // context cancelled, graceful shutdown
					}
					slog.Error("Error reading message", "topic", r.Config().Topic, "error", err)
					continue
				}
				c.handleMessage(msg)
			}
		}(reader)
	}

	// Wait for context cancellation
	<-ctx.Done()

	select {
	case err := <-errCh:
		return err
	default:
		return nil
	}
}

func (c *KafkaConsumer) handleMessage(msg kafka.Message) {
	var event Event
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		slog.Error("Failed to parse event", "error", err, "topic", msg.Topic)
		return
	}

	slog.Info("Event received", "topic", msg.Topic, "type", event.EventType)

	switch event.EventType {
	case "stream.started":
		var p StreamPayload
		if err := json.Unmarshal(event.Payload, &p); err == nil {
			c.notifier.OnStreamStarted(p.RoomID, p.HostID, p.Title)
		}

	case "stream.ended":
		var p StreamPayload
		if err := json.Unmarshal(event.Payload, &p); err == nil {
			c.notifier.OnStreamEnded(p.RoomID, p.HostID)
		}

	case "user.registered":
		var p UserPayload
		if err := json.Unmarshal(event.Payload, &p); err == nil {
			c.notifier.OnUserRegistered(p.UserID, p.Name, p.Email)
		}

	case "author.approved":
		var p UserPayload
		if err := json.Unmarshal(event.Payload, &p); err == nil {
			c.notifier.OnAuthorApproved(p.UserID, p.Name)
		}

	case "chat.message":
		var p ChatPayload
		if err := json.Unmarshal(event.Payload, &p); err == nil {
			c.notifier.OnChatMessage(p.RoomID, p.UserID, p.UserName, p.Content)
		}

	default:
		slog.Warn("Unknown event type", "type", event.EventType)
	}
}

func (c *KafkaConsumer) Close() {
	for _, r := range c.readers {
		r.Close()
	}
}
