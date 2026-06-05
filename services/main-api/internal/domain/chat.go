package domain

import "time"

type ChatMessageType string

const (
	ChatMessageTypeText   ChatMessageType = "text"
	ChatMessageTypeGift   ChatMessageType = "gift"
	ChatMessageTypeSystem ChatMessageType = "system"
)

type ChatMessage struct {
	ID        string          `json:"id"`
	RoomID    uint            `json:"room_id"`
	UserID    uint            `json:"user_id"`
	UserName  string          `json:"user_name"`
	Avatar    string          `json:"avatar,omitempty"`
	Content   string          `json:"content"`
	Type      ChatMessageType `json:"type"`
	CreatedAt time.Time       `json:"created_at"`
}
