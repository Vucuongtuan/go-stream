package domain

import (
	"context"
	"time"
)

type Gift struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null;size:100;uniqueIndex" json:"name"`
	CoinPrice int64     `gorm:"not null;type:bigint" json:"coin_price"`
	ImageURL  string    `gorm:"size:512" json:"image_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type GiftRepository interface {
	FindAll(ctx context.Context) ([]Gift, error)
	FindByID(ctx context.Context, id uint) (*Gift, error)
	Create(ctx context.Context, gift *Gift) error
	Update(ctx context.Context, gift *Gift) error
	Delete(ctx context.Context, id uint) error
}

type GiftService interface {
	GetAllGifts(ctx context.Context) ([]Gift, error)
	GetGiftByID(ctx context.Context, id uint) (*Gift, error)
	CreateGift(ctx context.Context, name string, coinPrice int64, imageURL string) (*Gift, error)
	UpdateGift(ctx context.Context, id uint, name string, coinPrice int64, imageURL string) (*Gift, error)
	DeleteGift(ctx context.Context, id uint) error
}
