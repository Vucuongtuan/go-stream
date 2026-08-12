package repository

import (
	"go-stream/services/main-api/internal/domain"

	"gorm.io/gorm"
)

type shortVideoRepository struct {
	db *gorm.DB
}

func NewShortVideoRepository(db *gorm.DB) domain.ShortVideoRepository {
	return &shortVideoRepository{db: db}
}

func (r *shortVideoRepository) FindByAuthorID(authorID uint, limit, offset int) ([]domain.ShortVideo, error) {
	var videos []domain.ShortVideo
	err := r.db.Preload("Author.User").Preload("Uploader").Preload("Tags").
		Where("author_id = ? AND status = ?", authorID, domain.VideoStatusPublished).
		Order("created_at DESC, id DESC").Limit(limit).Offset(offset).Find(&videos).Error
	return videos, err
}

func (r *shortVideoRepository) FindByID(id uint) (*domain.ShortVideo, error) {
	var video domain.ShortVideo
	err := r.db.Preload("Author.User").Preload("Uploader").Preload("Tags").First(&video, id).Error
	if err != nil {
		return nil, err
	}
	return &video, nil
}

func (r *shortVideoRepository) FindFeed(limit, offset int) ([]domain.ShortVideo, error) {
	var videos []domain.ShortVideo
	err := r.db.Preload("Author.User").Preload("Tags").
		Where("status = ?", domain.VideoStatusPublished).
		Order("created_at DESC, id DESC").Limit(limit).Offset(offset).Find(&videos).Error
	return videos, err
}

func (r *shortVideoRepository) Create(video *domain.ShortVideo) error {
	return r.db.Create(video).Error
}
func (r *shortVideoRepository) Update(video *domain.ShortVideo) error { return r.db.Save(video).Error }
func (r *shortVideoRepository) Delete(id uint) error {
	return r.db.Delete(&domain.ShortVideo{}, id).Error
}
func (r *shortVideoRepository) IncrementView(id uint) error {
	return r.db.Model(&domain.ShortVideo{}).Where("id = ?", id).UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}
