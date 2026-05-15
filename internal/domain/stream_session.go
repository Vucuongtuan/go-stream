package domain

import (
	"time"

	"gorm.io/gorm"
)

// StreamSession records metadata of a completed livestream.
// Created when a Room transitions from "live" → "ended".
type StreamSession struct {
	ID         uint      `gorm:"primaryKey"     json:"id"`
	RoomID     uint      `gorm:"not null;index" json:"room_id"`
	AuthorID   uint      `gorm:"not null;index" json:"author_id"`
	Title      string    `gorm:"size:255"       json:"title"`
	Thumbnail  string    `gorm:"size:512"       json:"thumbnail,omitempty"`
	StartedAt  time.Time `json:"started_at"`
	EndedAt    time.Time `json:"ended_at"`
	Duration   int       `json:"duration_seconds"`
	PeakViewers int      `json:"peak_viewers"`
	TotalViews  int      `json:"total_views"`
	VodURL     string    `gorm:"size:512"       json:"vod_url,omitempty"` // recording URL if available

	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Room   Room   `gorm:"foreignKey:RoomID"   json:"room,omitempty"`
	Author Author `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}

type StreamSessionRepository interface {
	FindByAuthorID(authorID uint, limit, offset int) ([]StreamSession, error)
	FindByID(id uint) (*StreamSession, error)
	Create(session *StreamSession) error
}

type StreamSessionService interface {
	GetSessionsByAuthor(authorID uint, limit, offset int) ([]StreamSession, error)
	GetSessionByID(id uint) (*StreamSession, error)
}
