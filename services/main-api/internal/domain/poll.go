package domain

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type PollStatus string

const (
	PollStatusActive PollStatus = "active"
	PollStatusEnded  PollStatus = "ended"
)

type Poll struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	RoomID    uint           `gorm:"not null;index" json:"room_id"`
	Title     string         `gorm:"not null;size:255" json:"title"`
	Status    PollStatus     `gorm:"default:active;size:20" json:"status"`
	EndTime   time.Time      `gorm:"not null" json:"end_time"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Options []PollOption `gorm:"foreignKey:PollID" json:"options,omitempty"`
}

type PollOption struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	PollID uint   `gorm:"not null;index" json:"poll_id"`
	Title  string `gorm:"not null;size:255" json:"title"`
	Votes  int64  `gorm:"default:0;not null" json:"votes"`
}

type PollVote struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PollID    uint      `gorm:"not null;index" json:"poll_id"`
	OptionID  uint      `gorm:"not null;index" json:"option_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}

type PollRepository interface {
	Create(ctx context.Context, poll *Poll) error
	FindByID(ctx context.Context, id uint) (*Poll, error)
	FindActiveByRoomID(ctx context.Context, roomID uint) (*Poll, error)
	Update(ctx context.Context, poll *Poll) error
	CreateVote(ctx context.Context, vote *PollVote) error
	HasUserVoted(ctx context.Context, pollID uint, userID uint) (bool, error)
}

type PollService interface {
	CreatePoll(ctx context.Context, creatorID uint, roomID uint, title string, options []string, durationSec int) (*Poll, error)
	EndPoll(ctx context.Context, creatorID uint, pollID uint) (*Poll, error)
	Vote(ctx context.Context, userID uint, pollID uint, optionID uint) error
	GetActivePoll(ctx context.Context, roomID uint) (*Poll, error)
}
