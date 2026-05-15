package domain

import (
	"time"

	"gorm.io/gorm"
)

type AuthorStatus string
type AuthorCategory string

const (
	AuthorStatusPending   AuthorStatus = "pending"
	AuthorStatusApproved  AuthorStatus = "approved"
	AuthorStatusSuspended AuthorStatus = "suspended"
	AuthorStatusRejected  AuthorStatus = "rejected"

	CategoryGaming    AuthorCategory = "gaming"
	CategoryMusic     AuthorCategory = "music"
	CategorySports    AuthorCategory = "sports"
	CategoryEducation AuthorCategory = "education"
	CategoryTech      AuthorCategory = "tech"
	CategoryLifestyle AuthorCategory = "lifestyle"
	CategoryOther     AuthorCategory = "other"
)

// Author represents a creator profile linked one-to-one with a User.
// A user must apply and be approved before becoming an Author.
type Author struct {
	ID          uint           `gorm:"primaryKey"              json:"id"`
	UserID      uint           `gorm:"uniqueIndex;not null"    json:"user_id"`
	DisplayName string         `gorm:"not null;size:100"       json:"display_name"`
	Bio         string         `gorm:"size:2000"               json:"bio,omitempty"`
	Avatar      string         `gorm:"size:512"                json:"avatar,omitempty"`
	CoverImage  string         `gorm:"size:512"                json:"cover_image,omitempty"`
	Category    AuthorCategory `gorm:"size:50"                 json:"category"`
	Status      AuthorStatus   `gorm:"default:pending;size:20" json:"status"`
	AppliedAt   time.Time      `json:"applied_at"`
	ApprovedAt  *time.Time     `json:"approved_at,omitempty"`

	// Cached counters — updated async, không query live
	FollowerCount  int `gorm:"default:0" json:"follower_count"`
	ViewTotalCount int `gorm:"default:0" json:"view_total_count"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User        User          `gorm:"foreignKey:UserID"   json:"user,omitempty"`
	SocialLinks []SocialLink  `gorm:"foreignKey:AuthorID" json:"social_links,omitempty"`
}

// SocialLink stores external profile links for an author
type SocialLink struct {
	ID       uint   `gorm:"primaryKey"   json:"id"`
	AuthorID uint   `gorm:"not null;index" json:"author_id"`
	Platform string `gorm:"size:50"      json:"platform"` // "youtube", "twitter", "instagram", etc.
	URL      string `gorm:"size:512"     json:"url"`
}

type AuthorRepository interface {
	FindAll(status *AuthorStatus, category *AuthorCategory, limit, offset int) ([]Author, error)
	FindByID(id uint) (*Author, error)
	FindByUserID(userID uint) (*Author, error)
	Create(author *Author) error
	Update(author *Author) error
	UpdateStatus(id uint, status AuthorStatus, approvedAt *time.Time) error
}

type AuthorService interface {
	Apply(userID uint, displayName, bio, category string) (*Author, error)
	GetAuthorByID(id uint) (*Author, error)
	GetAuthorByUserID(userID uint) (*Author, error)
	GetApprovedAuthors(category *AuthorCategory, limit, offset int) ([]Author, error)
	UpdateProfile(authorID, userID uint, displayName, bio, avatar, coverImage string, socialLinks []SocialLink) (*Author, error)

	// Admin actions
	ApproveAuthor(authorID uint) error
	RejectAuthor(authorID uint) error
	SuspendAuthor(authorID uint) error
}
