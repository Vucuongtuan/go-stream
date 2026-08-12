package service

import (
	"errors"
	"go-stream/services/main-api/internal/domain"
)

type authorFollowService struct {
	follows       domain.AuthorFollowRepository
	authors       domain.AuthorRepository
	users         domain.UserRepository
	notifications domain.NotificationService
}

func NewAuthorFollowService(follows domain.AuthorFollowRepository, authors domain.AuthorRepository, users domain.UserRepository, notifications domain.NotificationService) domain.AuthorFollowService {
	return &authorFollowService{follows: follows, authors: authors, users: users, notifications: notifications}
}
func (s *authorFollowService) GetFollowedAuthors(followerID uint, limit, offset int) ([]domain.Author, error) {
	return s.follows.ListAuthors(followerID, limit, offset)
}
func (s *authorFollowService) authorID(slug string) (uint, error) {
	author, err := s.authors.FindByUserSlug(slug)
	if err != nil || author.Status != domain.AuthorStatusApproved {
		return 0, errors.New("author not found")
	}
	return author.ID, nil
}
func (s *authorFollowService) FollowAuthor(followerID uint, slug string) error {
	author, err := s.authors.FindByUserSlug(slug)
	if err != nil || author.Status != domain.AuthorStatusApproved {
		return errors.New("author not found")
	}
	if author.UserID == followerID {
		return errors.New("you cannot follow your own channel")
	}
	if err := s.follows.Follow(followerID, author.ID); err != nil {
		return err
	}
	// Notifications are auxiliary to following: do not undo a successful follow
	// if the inbox write is temporarily unavailable.
	if s.notifications != nil {
		follower, userErr := s.users.FindByID(followerID)
		if userErr == nil {
			_ = s.notifications.Create(author.UserID, "author.followed", "Bạn có người theo dõi mới", follower.Name+" vừa theo dõi kênh của bạn.", "/streamer/"+slug, map[string]any{"follower_id": followerID, "follower_name": follower.Name, "follower_slug": follower.Slug, "author_id": author.ID})
		}
	}
	return nil
}
func (s *authorFollowService) UnfollowAuthor(followerID uint, slug string) error {
	authorID, err := s.authorID(slug)
	if err != nil {
		return err
	}
	return s.follows.Unfollow(followerID, authorID)
}
func (s *authorFollowService) IsFollowingAuthor(followerID uint, slug string) (bool, error) {
	authorID, err := s.authorID(slug)
	if err != nil {
		return false, err
	}
	return s.follows.IsFollowing(followerID, authorID)
}
