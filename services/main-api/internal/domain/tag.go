package domain

import "time"

type Tag struct {
	ID        uint      `gorm:"primaryKey"                    json:"id"`
	Name      string    `gorm:"not null;size:100;uniqueIndex" json:"name"`
	Slug      string    `gorm:"not null;size:100;uniqueIndex" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
}

type RoomTag struct {
	RoomID uint `gorm:"primaryKey" json:"room_id"`
	TagID  uint `gorm:"primaryKey" json:"tag_id"`
}

type ShortVideoTag struct {
	ShortVideoID uint `gorm:"primaryKey" json:"short_video_id"`
	TagID        uint `gorm:"primaryKey" json:"tag_id"`
}

type TagRepository interface {
	FindAll() ([]Tag, error)
	FindByID(id uint) (*Tag, error)
	FindBySlug(slug string) (*Tag, error)
	FindByIDs(ids []uint) ([]Tag, error)
	Create(tag *Tag) error
	Delete(id uint) error
	FindByRoomID(roomID uint) ([]Tag, error)
	FindByShortVideoID(videoID uint) ([]Tag, error)
	SyncRoomTags(roomID uint, tagIDs []uint) error
	SyncShortVideoTags(videoID uint, tagIDs []uint) error
}

type TagService interface {
	GetAllTags() ([]Tag, error)
	GetTagByID(id uint) (*Tag, error)
	CreateTag(name string) (*Tag, error)
	DeleteTag(id uint) error
	GetTagsByRoom(roomID uint) ([]Tag, error)
	GetTagsByShortVideo(videoID uint) ([]Tag, error)
	SyncRoomTags(roomID uint, tagIDs []uint) error
	SyncShortVideoTags(videoID uint, tagIDs []uint) error
}
