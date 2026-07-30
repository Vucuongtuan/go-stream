package service

import (
	"errors"
	"go-stream/services/main-api/internal/domain"
)

type authorFollowService struct {
	follows domain.AuthorFollowRepository
	authors domain.AuthorRepository
}

func NewAuthorFollowService(follows domain.AuthorFollowRepository, authors domain.AuthorRepository) domain.AuthorFollowService {
	return &authorFollowService{follows: follows, authors: authors}
}
func (s *authorFollowService) authorID(slug string) (uint, error) {
	author, err := s.authors.FindByUserSlug(slug)
	if err != nil || author.Status != domain.AuthorStatusApproved {
		return 0, errors.New("author not found")
	}
	return author.ID, nil
}
func (s *authorFollowService) FollowAuthor(followerID uint, slug string) error {
	authorID, err := s.authorID(slug)
	if err != nil {
		return err
	}
	return s.follows.Follow(followerID, authorID)
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
