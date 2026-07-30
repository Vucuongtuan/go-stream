package service

import (
	"errors"
	"strings"

	"go-stream/services/main-api/internal/domain"
)

type shortVideoService struct {
	repo       domain.ShortVideoRepository
	authorRepo domain.AuthorRepository
	followRepo domain.AuthorFollowRepository
	tagRepo    domain.TagRepository
}

func NewShortVideoService(repo domain.ShortVideoRepository, authorRepo domain.AuthorRepository, followRepo domain.AuthorFollowRepository, tagRepo domain.TagRepository) domain.ShortVideoService {
	return &shortVideoService{repo: repo, authorRepo: authorRepo, followRepo: followRepo, tagRepo: tagRepo}
}

func (s *shortVideoService) GetFeed(limit, offset int) ([]domain.ShortVideo, error) {
	return s.repo.FindFeed(limit, offset)
}

func (s *shortVideoService) GetVideoByID(id uint) (*domain.ShortVideo, error) {
	video, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if video.Status != domain.VideoStatusPublished {
		return nil, errors.New("video is not published")
	}
	return video, nil
}

func (s *shortVideoService) GetVideosByAuthor(authorID uint, limit, offset int) ([]domain.ShortVideo, error) {
	return s.repo.FindByAuthorID(authorID, limit, offset)
}

func (s *shortVideoService) UploadVideo(authorID, uploaderID uint, sessionID *uint, title, description, videoURL, thumbnail string, duration int, source domain.VideoSource, tagIDs []uint) (*domain.ShortVideo, error) {
	if strings.TrimSpace(title) == "" || videoURL == "" {
		return nil, errors.New("title and video file are required")
	}
	author, err := s.authorRepo.FindByID(authorID)
	if err != nil || author.Status != domain.AuthorStatusApproved {
		return nil, errors.New("author not found")
	}
	following, err := s.followRepo.IsFollowing(uploaderID, authorID)
	if err != nil || !following {
		return nil, errors.New("you must follow this author before uploading a video")
	}
	video := &domain.ShortVideo{AuthorID: authorID, UploaderID: uploaderID, SessionID: sessionID, Title: strings.TrimSpace(title), Description: strings.TrimSpace(description), VideoURL: videoURL, ThumbnailURL: thumbnail, Duration: duration, Status: domain.VideoStatusPublished, Source: source}
	if err := s.repo.Create(video); err != nil {
		return nil, err
	}
	if err := s.tagRepo.SyncShortVideoTags(video.ID, tagIDs); err != nil {
		return nil, err
	}
	return s.repo.FindByID(video.ID)
}

func (s *shortVideoService) CreateLiveClip(authorID, uploaderID uint, title, description, videoURL string, duration int) (*domain.ShortVideo, error) {
	return s.UploadVideo(authorID, uploaderID, nil, title, description, videoURL, "", duration, domain.VideoSourceClip, nil)
}

func (s *shortVideoService) UpdateVideo(videoID, uploaderID uint, title, description, thumbnail string, status domain.VideoStatus, tagIDs []uint) (*domain.ShortVideo, error) {
	video, err := s.repo.FindByID(videoID)
	if err != nil {
		return nil, err
	}
	if video.UploaderID != uploaderID {
		return nil, errors.New("unauthorized video update")
	}
	if strings.TrimSpace(title) == "" {
		return nil, errors.New("title is required")
	}
	if status != domain.VideoStatusPublished && status != domain.VideoStatusPrivate {
		return nil, errors.New("invalid video status")
	}
	video.Title, video.Description, video.Status = strings.TrimSpace(title), strings.TrimSpace(description), status
	if thumbnail != "" {
		video.ThumbnailURL = thumbnail
	}
	if err := s.repo.Update(video); err != nil {
		return nil, err
	}
	if err := s.tagRepo.SyncShortVideoTags(video.ID, tagIDs); err != nil {
		return nil, err
	}
	return s.repo.FindByID(video.ID)
}

func (s *shortVideoService) DeleteVideo(videoID, uploaderID uint) error {
	video, err := s.repo.FindByID(videoID)
	if err != nil {
		return err
	}
	if video.UploaderID != uploaderID {
		return errors.New("unauthorized video deletion")
	}
	return s.repo.Delete(videoID)
}

func (s *shortVideoService) RecordView(videoID uint) error {
	if _, err := s.GetVideoByID(videoID); err != nil {
		return err
	}
	return s.repo.IncrementView(videoID)
}
