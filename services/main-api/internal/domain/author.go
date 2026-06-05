package domain

import (
	"time"

	"gorm.io/gorm"
)

type AuthorStatus string

const (
	AuthorStatusPending   AuthorStatus = "pending"
	AuthorStatusApproved  AuthorStatus = "approved"
	AuthorStatusSuspended AuthorStatus = "suspended"
	AuthorStatusRejected  AuthorStatus = "rejected"
)

type Author struct {
	ID          uint           `gorm:"primaryKey"              json:"id"`
	UserID      uint           `gorm:"uniqueIndex;not null"    json:"user_id"`
	DisplayName string         `gorm:"not null;size:100"       json:"display_name"`
	Bio         string         `gorm:"size:2000"               json:"bio,omitempty"`
	Avatar      string         `gorm:"size:512"                json:"avatar,omitempty"`
	CoverImage  string         `gorm:"size:512"                json:"cover_image,omitempty"`
	Status      AuthorStatus   `gorm:"default:pending;size:20" json:"status"`
	AppliedAt   time.Time      `json:"applied_at"`
	ApprovedAt  *time.Time     `json:"approved_at,omitempty"`

	FollowerCount  int `gorm:"default:0" json:"follower_count"`
	ViewTotalCount int `gorm:"default:0" json:"view_total_count"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User        User         `gorm:"foreignKey:UserID"                                                    json:"user,omitempty"`
	SocialLinks []SocialLink `gorm:"foreignKey:AuthorID"                                                  json:"social_links,omitempty"`
	Categories  []Category   `gorm:"many2many:author_categories;foreignKey:ID;joinForeignKey:AuthorID;References:ID;joinReferences:CategoryID" json:"categories,omitempty"`
}

type SocialLink struct {
	ID       uint   `gorm:"primaryKey"     json:"id"`
	AuthorID uint   `gorm:"not null;index" json:"author_id"`
	Platform string `gorm:"size:50"        json:"platform"`
	URL      string `gorm:"size:512"       json:"url"`
}

type AuthorRepository interface {
	FindAll(status *AuthorStatus, limit, offset int) ([]Author, error)
	FindByID(id uint) (*Author, error)
	FindByUserID(userID uint) (*Author, error)
	Create(author *Author) error
	Update(author *Author) error
	UpdateStatus(id uint, status AuthorStatus, approvedAt *time.Time) error
	SyncCategories(authorID uint, categoryIDs []uint) error
}

type AuthorService interface {
	Apply(userID uint, displayName, bio string, categoryIDs []uint) (*Author, error)
	GetAuthorByID(id uint) (*Author, error)
	GetAuthorByUserID(userID uint) (*Author, error)
	GetApprovedAuthors(limit, offset int) ([]Author, error)
	UpdateProfile(authorID, userID uint, displayName, bio, avatar, coverImage string, socialLinks []SocialLink, categoryIDs []uint) (*Author, error)

	ApproveAuthor(authorID uint) error
	RejectAuthor(authorID uint) error
	SuspendAuthor(authorID uint) error
}
