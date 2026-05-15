package domain

import (
	"time"

	"gorm.io/gorm"
)

type CategoryType string

const (
	CategoryTypeGame      CategoryType = "game"
	CategoryTypeTalk      CategoryType = "talk"       // Just Chatting, talk show
	CategoryTypeMusic     CategoryType = "music"
	CategoryTypeSports    CategoryType = "sports"
	CategoryTypeEducation CategoryType = "education"
	CategoryTypeCreative  CategoryType = "creative"   // art, cooking, DIY
	CategoryTypeOther     CategoryType = "other"
)

// Category is a top-level stream category (Gaming, Music, Just Chatting, ...)
type Category struct {
	ID          uint         `gorm:"primaryKey"      json:"id"`
	Name        string       `gorm:"not null;size:100;uniqueIndex" json:"name"`
	Slug        string       `gorm:"not null;size:100;uniqueIndex" json:"slug"`
	Type        CategoryType `gorm:"not null;size:30" json:"type"`
	Icon        string       `gorm:"size:512"         json:"icon,omitempty"`
	Description string       `gorm:"size:500"         json:"description,omitempty"`
	SortOrder   int          `gorm:"default:0"        json:"sort_order"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`

	Games []Game `gorm:"foreignKey:CategoryID" json:"games,omitempty"`
}

// Game is a specific title under the "game" category type.
// e.g. League of Legends, Valorant, Minecraft
type Game struct {
	ID          uint           `gorm:"primaryKey"                   json:"id"`
	CategoryID  uint           `gorm:"not null;index"               json:"category_id"`
	Name        string         `gorm:"not null;size:200;uniqueIndex" json:"name"`
	Slug        string         `gorm:"not null;size:200;uniqueIndex" json:"slug"`
	CoverImage  string         `gorm:"size:512"                     json:"cover_image,omitempty"`
	Description string         `gorm:"size:500"                     json:"description,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"                        json:"-"`

	Category Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type CategoryRepository interface {
	FindAll() ([]Category, error)
	FindByID(id uint) (*Category, error)
	FindBySlug(slug string) (*Category, error)
	FindGamesByCategoryID(categoryID uint) ([]Game, error)
	FindGameByID(id uint) (*Game, error)
	Create(category *Category) error
	CreateGame(game *Game) error
}

type CategoryService interface {
	GetAllCategories() ([]Category, error)
	GetCategoryBySlug(slug string) (*Category, error)
	GetGamesByCategory(categoryID uint) ([]Game, error)
}
