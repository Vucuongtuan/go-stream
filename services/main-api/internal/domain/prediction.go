package domain

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type PredictionStatus string

const (
	PredictionStatusActive   PredictionStatus = "active"   // accepting bets
	PredictionStatusLocked   PredictionStatus = "locked"   // closed to bets, waiting for result
	PredictionStatusResolved PredictionStatus = "resolved" // resolved, rewards distributed
	PredictionStatusCanceled PredictionStatus = "canceled" // canceled, refunds returned
)

type Prediction struct {
	ID              uint             `gorm:"primaryKey" json:"id"`
	RoomID          uint             `gorm:"not null;index" json:"room_id"`
	Title           string           `gorm:"not null;size:255" json:"title"`
	Status          PredictionStatus `gorm:"default:active;size:20" json:"status"`
	WinningOptionID *uint            `json:"winning_option_id,omitempty"`
	EndTime         time.Time        `gorm:"not null" json:"end_time"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	DeletedAt       gorm.DeletedAt   `gorm:"index" json:"-"`

	Room    *Room              `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Options []PredictionOption `gorm:"foreignKey:PredictionID" json:"options,omitempty"`
	Bets    []PredictionBet    `gorm:"foreignKey:PredictionID" json:"bets,omitempty"`
}

type PredictionOption struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	PredictionID uint   `gorm:"not null;index" json:"prediction_id"`
	Title        string `gorm:"not null;size:255" json:"title"`
	TotalPoints  int64  `gorm:"default:0;not null" json:"total_points"`
}

type PredictionBet struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PredictionID uint      `gorm:"not null;index" json:"prediction_id"`
	OptionID     uint      `gorm:"not null;index" json:"option_id"`
	UserID       uint      `gorm:"not null;index" json:"user_id"`
	Points       int64     `gorm:"not null" json:"points"`
	CreatedAt    time.Time `json:"created_at"`

	User   *User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Option *PredictionOption `gorm:"foreignKey:OptionID" json:"option,omitempty"`
}

type PredictionRepository interface {
	Create(ctx context.Context, prediction *Prediction) error
	FindByID(ctx context.Context, id uint) (*Prediction, error)
	FindActiveByRoomID(ctx context.Context, roomID uint) (*Prediction, error)
	Update(ctx context.Context, prediction *Prediction) error
	CreateBet(ctx context.Context, bet *PredictionBet) error
	GetBet(ctx context.Context, predictionID uint, userID uint) (*PredictionBet, error)
	UpdateBetPoints(ctx context.Context, betID uint, points int64) error
	FindBetsByPredictionID(ctx context.Context, predictionID uint) ([]PredictionBet, error)
	FindBetsByOptionID(ctx context.Context, optionID uint) ([]PredictionBet, error)
}

type PredictionService interface {
	CreatePrediction(ctx context.Context, hostID uint, roomID uint, title string, options []string, durationSec int) (*Prediction, error)
	LockPrediction(ctx context.Context, hostID uint, predictionID uint) (*Prediction, error)
	ResolvePrediction(ctx context.Context, hostID uint, predictionID uint, winningOptionID uint) (*Prediction, error)
	CancelPrediction(ctx context.Context, hostID uint, predictionID uint) (*Prediction, error)
	PlaceBet(ctx context.Context, userID uint, predictionID uint, optionID uint, points int64) (*PredictionBet, error)
	GetActivePrediction(ctx context.Context, roomID uint) (*Prediction, error)
}
