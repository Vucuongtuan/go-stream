package repository

import (
	"go-stream/services/main-api/internal/domain"

	"gorm.io/gorm"
)

type tagRepository struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) domain.TagRepository {
	return &tagRepository{db: db}
}

func (r *tagRepository) FindAll() ([]domain.Tag, error) {
	var tags []domain.Tag
	err := r.db.Order("name ASC").Find(&tags).Error
	return tags, err
}

func (r *tagRepository) FindByID(id uint) (*domain.Tag, error) {
	var tag domain.Tag
	err := r.db.First(&tag, id).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *tagRepository) FindBySlug(slug string) (*domain.Tag, error) {
	var tag domain.Tag
	err := r.db.Where("slug = ?", slug).First(&tag).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *tagRepository) FindByIDs(ids []uint) ([]domain.Tag, error) {
	var tags []domain.Tag
	err := r.db.Where("id IN ?", ids).Find(&tags).Error
	return tags, err
}

func (r *tagRepository) Create(tag *domain.Tag) error {
	return r.db.Create(tag).Error
}

func (r *tagRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Tag{}, id).Error
}

func (r *tagRepository) FindByRoomID(roomID uint) ([]domain.Tag, error) {
	var tags []domain.Tag
	err := r.db.
		Joins("JOIN room_tags ON room_tags.tag_id = tags.id").
		Where("room_tags.room_id = ?", roomID).
		Find(&tags).Error
	return tags, err
}

func (r *tagRepository) FindByShortVideoID(videoID uint) ([]domain.Tag, error) {
	var tags []domain.Tag
	err := r.db.
		Joins("JOIN short_video_tags ON short_video_tags.tag_id = tags.id").
		Where("short_video_tags.short_video_id = ?", videoID).
		Find(&tags).Error
	return tags, err
}

func (r *tagRepository) SyncRoomTags(roomID uint, tagIDs []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("room_id = ?", roomID).Delete(&domain.RoomTag{}).Error; err != nil {
			return err
		}
		for _, tagID := range tagIDs {
			if err := tx.Create(&domain.RoomTag{RoomID: roomID, TagID: tagID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *tagRepository) SyncShortVideoTags(videoID uint, tagIDs []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("short_video_id = ?", videoID).Delete(&domain.ShortVideoTag{}).Error; err != nil {
			return err
		}
		for _, tagID := range tagIDs {
			if err := tx.Create(&domain.ShortVideoTag{ShortVideoID: videoID, TagID: tagID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
