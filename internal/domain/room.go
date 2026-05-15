package domain

import (
	"time"

	"gorm.io/gorm"
)

type RoomStatus string
type RoomVisibility string

const (
	RoomStatusOffline RoomStatus = "offline"
	RoomStatusLive    RoomStatus = "live"
	RoomStatusEnded   RoomStatus = "ended"

	RoomVisibilityPublic   RoomVisibility = "public"
	RoomVisibilityPrivate  RoomVisibility = "private"
	RoomVisibilityUnlisted RoomVisibility = "unlisted"
)

type Room struct {
	ID          uint           `gorm:"primaryKey"              json:"id"`
	HostID      uint           `gorm:"not null;index"          json:"host_id"`
	CategoryID  *uint          `gorm:"index"                   json:"category_id,omitempty"`
	GameID      *uint          `gorm:"index"                   json:"game_id,omitempty"`
	Title       string         `gorm:"not null;size:255"       json:"title"`
	Description string         `gorm:"size:2000"               json:"description,omitempty"`
	Thumbnail   string         `gorm:"size:512"                json:"thumbnail,omitempty"`
	Tags        string         `gorm:"size:500"                json:"tags,omitempty"` // comma-separated tags
	StreamKey   string         `gorm:"uniqueIndex;size:64"     json:"-"`
	Status      RoomStatus     `gorm:"default:offline;size:20" json:"status"`
	Visibility  RoomVisibility `gorm:"default:public;size:20"  json:"visibility"`

	// HLS playback — populated after ingest server starts transcoding
	PlaybackURL string `gorm:"size:512" json:"playback_url,omitempty"`
	VodURL      string `gorm:"size:512" json:"vod_url,omitempty"`

	// Quality preset — passed to FFmpeg
	Quality string `gorm:"default:auto;size:20" json:"quality"`

	ViewerCount int        `gorm:"-"      json:"viewer_count"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	EndedAt     *time.Time `json:"ended_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Host     User      `gorm:"foreignKey:HostID"     json:"host,omitempty"`
	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Game     *Game     `gorm:"foreignKey:GameID"     json:"game,omitempty"`
}

type RoomRepository interface {
	FindAll(filter RoomFilter) ([]Room, error)
	FindByID(id uint) (*Room, error)
	FindByStreamKey(key string) (*Room, error)
	FindByHostID(hostID uint) ([]Room, error)
	Create(room *Room) error
	Update(room *Room) error
	Delete(id uint) error
}

type RoomFilter struct {
	Status     *RoomStatus
	Visibility *RoomVisibility
	HostID     *uint
	CategoryID *uint
	GameID     *uint
	Limit      int
	Offset     int
}

type RoomService interface {
	GetLiveRooms(categoryID *uint, gameID *uint) ([]Room, error)
	GetRoomByID(id uint) (*Room, error)
	GetRoomsByHost(hostID uint) ([]Room, error)
	CreateRoom(hostID uint, title, description string, categoryID, gameID *uint, tags string, visibility RoomVisibility) (*Room, error)
	GoLive(roomID, hostID uint) (*Room, error)
	EndStream(roomID, hostID uint) error
	UpdateRoom(roomID, hostID uint, title, description string, categoryID, gameID *uint, tags string, visibility RoomVisibility) (*Room, error)
	DeleteRoom(roomID, hostID uint) error
}
