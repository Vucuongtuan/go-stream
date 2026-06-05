package domain

import (
	"time"

	"gorm.io/gorm"
)

type VideoStatus string
type VideoSource string

const (
	VideoStatusProcessing VideoStatus = "processing"
	VideoStatusPublished  VideoStatus = "published"
	VideoStatusFailed     VideoStatus = "failed"
	VideoStatusPrivate    VideoStatus = "private"

	VideoSourceAuthor VideoSource = "author"
	VideoSourceFan    VideoSource = "fan"
	VideoSourceClip   VideoSource = "clip"
)

type ShortVideo struct {
	ID           uint        `gorm:"primaryKey"                     json:"id"`
	AuthorID     uint        `gorm:"not null;index"                 json:"author_id"`
	UploaderID   uint        `gorm:"not null;index"                 json:"uploader_id"`
	SessionID    *uint       `gorm:"index"                          json:"session_id,omitempty"`
	Title        string      `gorm:"not null;size:255"              json:"title"`
	Description  string      `gorm:"size:2000"                      json:"description,omitempty"`
	VideoURL     string      `gorm:"not null;size:512"              json:"video_url"`
	ThumbnailURL string      `gorm:"size:512"                       json:"thumbnail_url,omitempty"`
	Duration     int         `json:"duration_seconds"`
	Status       VideoStatus `gorm:"default:processing;size:20"     json:"status"`
	Source       VideoSource `gorm:"size:20"                        json:"source"`
	ViewCount    int         `gorm:"default:0"                      json:"view_count"`
	LikeCount    int         `gorm:"default:0"                      json:"like_count"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Author   Author         `gorm:"foreignKey:AuthorID"   json:"author,omitempty"`
	Uploader User           `gorm:"foreignKey:UploaderID" json:"uploader,omitempty"`
	Session  *StreamSession `gorm:"foreignKey:SessionID"  json:"session,omitempty"`
	Tags     []Tag          `gorm:"many2many:short_video_tags" json:"tags,omitempty"`
}

type ShortVideoRepository interface {
	FindByAuthorID(authorID uint, limit, offset int) ([]ShortVideo, error)
	FindByID(id uint) (*ShortVideo, error)
	FindFeed(limit, offset int) ([]ShortVideo, error)
	Create(video *ShortVideo) error
	Update(video *ShortVideo) error
	Delete(id uint) error
	IncrementView(id uint) error
}

type ShortVideoService interface {
	GetFeed(limit, offset int) ([]ShortVideo, error)
	GetVideoByID(id uint) (*ShortVideo, error)
	GetVideosByAuthor(authorID uint, limit, offset int) ([]ShortVideo, error)
	UploadVideo(authorID, uploaderID uint, sessionID *uint, title, description, videoURL, thumbnail string, duration int, source VideoSource, tagIDs []uint) (*ShortVideo, error)
	DeleteVideo(videoID, uploaderID uint) error
	RecordView(videoID uint) error
}
