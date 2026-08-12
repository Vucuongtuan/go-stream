package domain

import "time"

// AuthorFollow is a user's subscription to an author channel.
type AuthorFollow struct {
	FollowerID uint      `gorm:"primaryKey" json:"follower_id"`
	AuthorID   uint      `gorm:"primaryKey;index" json:"author_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type AuthorFollowRepository interface {
	ListAuthors(followerID uint, limit, offset int) ([]Author, error)
	Follow(followerID, authorID uint) error
	Unfollow(followerID, authorID uint) error
	IsFollowing(followerID, authorID uint) (bool, error)
}

type AuthorFollowService interface {
	GetFollowedAuthors(followerID uint, limit, offset int) ([]Author, error)
	FollowAuthor(followerID uint, slug string) error
	UnfollowAuthor(followerID uint, slug string) error
	IsFollowingAuthor(followerID uint, slug string) (bool, error)
}
