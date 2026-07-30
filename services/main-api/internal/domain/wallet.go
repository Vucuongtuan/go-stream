package domain

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

var (
	ErrDailyCheckInUserOnly = errors.New("daily check-in is available to user accounts only")
	ErrAlreadyCheckedIn     = errors.New("already checked in today")
)

// Wallet represents a user's coin balance.
type Wallet struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"uniqueIndex;not null" json:"user_id"`
	Balance   int64          `gorm:"type:bigint;default:0;not null" json:"balance"`
	IsActive  bool           `gorm:"default:false;not null" json:"is_active"` // Wallet must be activated to receive donations
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// DailyCheckIn is the durable ledger for a user's daily coin reward.
// The composite unique index is the final guard against duplicate rewards,
// including after Redis restarts or concurrent requests.
type DailyCheckIn struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;uniqueIndex:idx_daily_checkin_user_date" json:"user_id"`
	CheckInDate string    `gorm:"type:date;not null;uniqueIndex:idx_daily_checkin_user_date" json:"check_in_date"`
	Reward      int64     `gorm:"not null" json:"reward"`
	CreatedAt   time.Time `json:"created_at"`
}

type DailyCheckInDay struct {
	Date    string `json:"date"`
	Claimed bool   `json:"claimed"`
}

type DailyCheckInStatus struct {
	Reward       int64             `json:"reward"`
	ClaimedToday bool              `json:"claimed_today"`
	Days         []DailyCheckInDay `json:"days"`
}

// Donation represents a gift donation transaction in a live room.
type Donation struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	SenderID   uint      `gorm:"not null;index" json:"sender_id"`
	RoomID     uint      `gorm:"not null;index" json:"room_id"`
	CoinAmount int64     `gorm:"type:bigint;not null" json:"coin_amount"`
	GiftType   int       `gorm:"not null" json:"gift_type"` // 1: Base, 2: Chest, 3: Rocket, 4: Castle, 5: Crown
	Message    string    `gorm:"size:255" json:"message,omitempty"`
	CreatedAt  time.Time `json:"created_at"`

	Sender *User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Room   *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
}

type WalletRepository interface {
	FindByUserID(ctx context.Context, userID uint) (*Wallet, error)
	Create(ctx context.Context, wallet *Wallet) error
	UpdateBalanceWithTx(ctx context.Context, tx *gorm.DB, userID uint, amount int64) error
	CheckIn(ctx context.Context, userID uint, points int64) error
	HasCheckedInToday(ctx context.Context, userID uint) (bool, error)
	FindCheckInsByDateRange(ctx context.Context, userID uint, startDate, endDate string) ([]DailyCheckIn, error)
}

type DonationRepository interface {
	CreateWithTx(ctx context.Context, tx *gorm.DB, donation *Donation) error
	GetRoomTotalDonations(ctx context.Context, roomID uint) (int64, error)
}

type DonationService interface {
	Donate(ctx context.Context, senderID uint, roomID uint, giftType int, message string) (*Donation, error)
	GetWallet(ctx context.Context, userID uint) (*Wallet, error)
	DailyCheckIn(ctx context.Context, userID uint) (int64, error) // Returns new balance
	GetDailyCheckInStatus(ctx context.Context, userID uint) (*DailyCheckInStatus, error)
}
