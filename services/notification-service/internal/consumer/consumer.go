package consumer

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/segmentio/kafka-go"
	"go-stream/services/notification-service/internal/notifier"
)

const (
	dlqTopic     = "notification-events-dlq"
	maxAttempts  = 3
	retryBackoff = 250 * time.Millisecond
)

type Event struct {
	EventType string          `json:"event_type"`
	Timestamp string          `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}
type StreamPayload struct {
	RoomID      uint   `json:"room_id"`
	HostID      uint   `json:"host_id"`
	Title       string `json:"title"`
	PlaybackURL string `json:"playback_url,omitempty"`
}
type UserPayload struct {
	UserID uint   `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
}
type ChatPayload struct {
	RoomID   uint   `json:"room_id"`
	UserID   uint   `json:"user_id"`
	UserName string `json:"user_name"`
	Content  string `json:"content"`
}
type NotificationPayload struct {
	ID        uint   `json:"id"`
	UserID    uint   `json:"user_id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	ActionURL string `json:"action_url"`
}

type KafkaConsumer struct {
	readers   []*kafka.Reader
	notifier  notifier.Notifier
	dlqWriter *kafka.Writer
}

func NewKafkaConsumer(brokers []string, groupID string, topics []string, n notifier.Notifier) *KafkaConsumer {
	readers := make([]*kafka.Reader, len(topics))
	for i, topic := range topics {
		readers[i] = kafka.NewReader(kafka.ReaderConfig{Brokers: brokers, GroupID: groupID, Topic: topic, MinBytes: 1, MaxBytes: 10e6})
	}
	return &KafkaConsumer{readers: readers, notifier: n, dlqWriter: &kafka.Writer{Addr: kafka.TCP(brokers...), Topic: dlqTopic, RequiredAcks: kafka.RequireAll}}
}

func (c *KafkaConsumer) Start(ctx context.Context) error {
	for _, reader := range c.readers {
		go c.consume(ctx, reader)
	}
	<-ctx.Done()
	return nil
}

func (c *KafkaConsumer) consume(ctx context.Context, reader *kafka.Reader) {
	slog.Info("Notification consumer started", "topic", reader.Config().Topic)
	for {
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.Error("Kafka fetch failed", "topic", reader.Config().Topic, "error", err)
			if !wait(ctx, retryBackoff) {
				return
			}
			continue
		}
		if err := c.processWithRetry(ctx, msg); err != nil {
			slog.Error("Notification message was not processed", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "error", err)
			if !wait(ctx, retryBackoff) {
				return
			}
			continue
		}
		if err := reader.CommitMessages(ctx, msg); err != nil {
			slog.Error("Kafka commit failed", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "error", err)
		}
	}
}

func (c *KafkaConsumer) processWithRetry(ctx context.Context, msg kafka.Message) error {
	var err error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if err = c.handleMessage(msg); err == nil {
			return nil
		}
		if attempt < maxAttempts && !wait(ctx, retryBackoff*time.Duration(attempt)) {
			return ctx.Err()
		}
	}
	return c.publishDLQ(ctx, msg, err)
}

func (c *KafkaConsumer) publishDLQ(ctx context.Context, msg kafka.Message, processErr error) error {
	payload, err := json.Marshal(map[string]any{"failed_at": time.Now().UTC().Format(time.RFC3339Nano), "error": processErr.Error(), "attempts": maxAttempts, "source": map[string]any{"topic": msg.Topic, "partition": msg.Partition, "offset": msg.Offset, "key": string(msg.Key), "value_base64": base64.StdEncoding.EncodeToString(msg.Value)}})
	if err != nil {
		return fmt.Errorf("marshal DLQ payload: %w", err)
	}
	if err := c.dlqWriter.WriteMessages(ctx, kafka.Message{Key: msg.Key, Value: payload}); err != nil {
		return fmt.Errorf("write DLQ event: %w", err)
	}
	slog.Error("Notification message sent to DLQ", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset, "error", processErr)
	return nil
}

func (c *KafkaConsumer) handleMessage(msg kafka.Message) error {
	var event Event
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		return fmt.Errorf("parse event: %w", err)
	}
	switch event.EventType {
	case "stream.started":
		var p StreamPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			return err
		}
		return c.notifier.OnStreamStarted(p.RoomID, p.HostID, p.Title)
	case "stream.ended":
		var p StreamPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			return err
		}
		return c.notifier.OnStreamEnded(p.RoomID, p.HostID)
	case "user.registered":
		var p UserPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			return err
		}
		return c.notifier.OnUserRegistered(p.UserID, p.Name, p.Email)
	case "author.approved":
		var p UserPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			return err
		}
		return c.notifier.OnAuthorApproved(p.UserID, p.Name)
	case "chat.message":
		var p ChatPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			return err
		}
		return c.notifier.OnChatMessage(p.RoomID, p.UserID, p.UserName, p.Content)
	case "notification.created":
		var p NotificationPayload
		if err := json.Unmarshal(event.Payload, &p); err != nil {
			return err
		}
		return c.notifier.OnNotificationCreated(p.ID, p.UserID, p.Type, p.Title, p.Body, p.ActionURL)
	default:
		slog.Debug("Ignoring unsupported notification event", "type", event.EventType)
		return nil
	}
}

func wait(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
func (c *KafkaConsumer) Close() {
	for _, r := range c.readers {
		_ = r.Close()
	}
	if c.dlqWriter != nil {
		_ = c.dlqWriter.Close()
	}
}
