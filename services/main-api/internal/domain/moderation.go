package domain

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type RoomModerator struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	RoomID    uint           `gorm:"not null;uniqueIndex:idx_room_mod" json:"room_id"`
	UserID    uint           `gorm:"not null;uniqueIndex:idx_room_mod" json:"user_id"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Room *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type ModerationAction string

const (
	ModerationActionBan     ModerationAction = "ban"
	ModerationActionTimeout ModerationAction = "timeout"
)

type ModerationLog struct {
	ID          uint             `gorm:"primaryKey" json:"id"`
	RoomID      uint             `gorm:"not null;index" json:"room_id"`
	TargetID    uint             `gorm:"not null;index" json:"target_id"`
	ModeratorID uint             `gorm:"not null;index" json:"moderator_id"`
	Action      ModerationAction `gorm:"not null;size:20" json:"action"`
	Reason      string           `gorm:"size:255" json:"reason,omitempty"`
	ExpiresAt   *time.Time       `json:"expires_at,omitempty"` // Null means permanent ban
	CreatedAt   time.Time        `json:"created_at"`

	Room      *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Target    *User `gorm:"foreignKey:TargetID" json:"target,omitempty"`
	Moderator *User `gorm:"foreignKey:ModeratorID" json:"moderator,omitempty"`
}

type ModerationRepository interface {
	AddModerator(ctx context.Context, roomID uint, userID uint) error
	RemoveModerator(ctx context.Context, roomID uint, userID uint) error
	IsModerator(ctx context.Context, roomID uint, userID uint) (bool, error)
	LogAction(ctx context.Context, log *ModerationLog) error
	GetActiveBanOrTimeout(ctx context.Context, roomID uint, userID uint) (*ModerationLog, error)
	RemoveActiveBan(ctx context.Context, roomID uint, userID uint) error
}

type ModerationService interface {
	AddModerator(ctx context.Context, hostID uint, roomID uint, targetEmail string) error
	RemoveModerator(ctx context.Context, hostID uint, roomID uint, targetUserID uint) error
	BanUser(ctx context.Context, moderatorID uint, roomID uint, targetUserID uint, reason string) error
	UnbanUser(ctx context.Context, moderatorID uint, roomID uint, targetUserID uint) error
	TimeoutUser(ctx context.Context, moderatorID uint, roomID uint, targetUserID uint, durationSec int, reason string) error
	IsUserMuted(ctx context.Context, roomID uint, userID uint) (bool, string, error) // Returns isMuted, reason
}
