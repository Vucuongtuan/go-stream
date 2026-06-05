package domain

import (
	"time"

	"gorm.io/gorm"
)

type CategoryType string

const (
	CategoryTypeGame      CategoryType = "game"
	CategoryTypeTalk      CategoryType = "talk"
	CategoryTypeMusic     CategoryType = "music"
	CategoryTypeSports    CategoryType = "sports"
	CategoryTypeEducation CategoryType = "education"
	CategoryTypeCreative  CategoryType = "creative"
	CategoryTypeOther     CategoryType = "other"
)

type Category struct {
	ID          uint         `gorm:"primaryKey"                    json:"id"`
	Name        string       `gorm:"not null;size:100;uniqueIndex" json:"name"`
	Slug        string       `gorm:"not null;size:100;uniqueIndex" json:"slug"`
	Type        CategoryType `gorm:"not null;size:30"              json:"type"`
	Icon        string       `gorm:"size:512"                      json:"icon,omitempty"`
	Description string       `gorm:"size:500"                      json:"description,omitempty"`
	SortOrder   int          `gorm:"default:0"                     json:"sort_order"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`

	Games   []Game   `gorm:"foreignKey:CategoryID" json:"games,omitempty"`
	Authors []Author `gorm:"many2many:author_categories;foreignKey:ID;joinForeignKey:CategoryID;References:ID;joinReferences:AuthorID" json:"authors,omitempty"`
}

type Game struct {
	ID          uint           `gorm:"primaryKey"                    json:"id"`
	CategoryID  uint           `gorm:"not null;index"                json:"category_id"`
	Name        string         `gorm:"not null;size:200;uniqueIndex" json:"name"`
	Slug        string         `gorm:"not null;size:200;uniqueIndex" json:"slug"`
	CoverImage  string         `gorm:"size:512"                      json:"cover_image,omitempty"`
	Description string         `gorm:"size:500"                      json:"description,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"                         json:"-"`

	Category Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type CategoryRepository interface {
	FindAll() ([]Category, error)
	FindByID(id uint) (*Category, error)
	FindBySlug(slug string) (*Category, error)
	FindByIDs(ids []uint) ([]Category, error)
	FindGamesByCategoryID(categoryID uint) ([]Game, error)
	FindGameByID(id uint) (*Game, error)
	Create(category *Category) error
	Update(category *Category) error
	CreateGame(game *Game) error
}

type CategoryService interface {
	GetAllCategories() ([]Category, error)
	GetCategoryByID(id uint) (*Category, error)
	GetCategoryBySlug(slug string) (*Category, error)
	GetGamesByCategory(categoryID uint) ([]Game, error)
	CreateCategory(name, slug, icon, description string, categoryType CategoryType) (*Category, error)
	UpdateCategory(id uint, name, slug, icon, description string, categoryType CategoryType) (*Category, error)
	CreateGame(categoryID uint, name, slug, coverImage, description string) (*Game, error)
}
