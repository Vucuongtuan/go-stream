package kafka

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	kafkago "github.com/segmentio/kafka-go"
	"go-stream/services/main-api/pkg/logger"
)

// Event represents a Kafka event message
type Event struct {
	EventType string    `json:"event_type"`
	Timestamp time.Time `json:"timestamp"`
	Payload   any       `json:"payload"`
}

// Producer wraps kafka-go writer
type Producer struct {
	writers map[string]*kafkago.Writer
	brokers []string
}

func NewProducer(brokers string) *Producer {
	brokerList := strings.Split(brokers, ",")
	return &Producer{
		writers: make(map[string]*kafkago.Writer),
		brokers: brokerList,
	}
}

func (p *Producer) getWriter(topic string) *kafkago.Writer {
	if w, ok := p.writers[topic]; ok {
		return w
	}
	w := &kafkago.Writer{
		Addr:         kafkago.TCP(p.brokers...),
		Topic:        topic,
		Balancer:     &kafkago.LeastBytes{},
		BatchTimeout: 10 * time.Millisecond,
	}
	p.writers[topic] = w
	return w
}

// Publish sends an event to a Kafka topic
func (p *Producer) Publish(ctx context.Context, topic string, key string, event Event) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	err = p.getWriter(topic).WriteMessages(ctx, kafkago.Message{
		Key:   []byte(key),
		Value: data,
	})
	if err != nil {
		logger.Error("Failed to publish Kafka event", err, "topic", topic, "event_type", event.EventType)
		return err
	}

	logger.Info("Kafka event published", "topic", topic, "event_type", event.EventType)
	return nil
}

func (p *Producer) Close() {
	for _, w := range p.writers {
		w.Close()
	}
}
