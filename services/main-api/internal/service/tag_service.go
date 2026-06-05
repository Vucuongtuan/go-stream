package service

import (
	"errors"
	"regexp"
	"strings"

	"go-stream/services/main-api/internal/domain"
)

type tagService struct {
	repo domain.TagRepository
}

func NewTagService(repo domain.TagRepository) domain.TagService {
	return &tagService{repo: repo}
}

func (s *tagService) GetAllTags() ([]domain.Tag, error) {
	return s.repo.FindAll()
}

func (s *tagService) GetTagByID(id uint) (*domain.Tag, error) {
	return s.repo.FindByID(id)
}

func (s *tagService) CreateTag(name string) (*domain.Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("tag name is required")
	}

	tag := &domain.Tag{
		Name: name,
		Slug: generateSlug(name),
	}
	if err := s.repo.Create(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

func (s *tagService) DeleteTag(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("tag not found")
	}
	return s.repo.Delete(id)
}

func (s *tagService) GetTagsByRoom(roomID uint) ([]domain.Tag, error) {
	return s.repo.FindByRoomID(roomID)
}

func (s *tagService) GetTagsByShortVideo(videoID uint) ([]domain.Tag, error) {
	return s.repo.FindByShortVideoID(videoID)
}

func (s *tagService) SyncRoomTags(roomID uint, tagIDs []uint) error {
	if len(tagIDs) > 0 {
		tags, err := s.repo.FindByIDs(tagIDs)
		if err != nil {
			return err
		}
		if len(tags) != len(tagIDs) {
			return errors.New("one or more tag IDs are invalid")
		}
	}
	return s.repo.SyncRoomTags(roomID, tagIDs)
}

func (s *tagService) SyncShortVideoTags(videoID uint, tagIDs []uint) error {
	if len(tagIDs) > 0 {
		tags, err := s.repo.FindByIDs(tagIDs)
		if err != nil {
			return err
		}
		if len(tags) != len(tagIDs) {
			return errors.New("one or more tag IDs are invalid")
		}
	}
	return s.repo.SyncShortVideoTags(videoID, tagIDs)
}

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

func generateSlug(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = nonAlphaNum.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}
