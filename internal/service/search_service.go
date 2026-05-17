package service

import (
	"fmt"
	"strings"

	"go-stream/internal/domain"
	"gorm.io/gorm"
)

type sqliteSearchService struct {
	db *gorm.DB
}

func NewSearchService(db *gorm.DB) domain.SearchService {
	return &sqliteSearchService{db: db}
}

// SearchGlobal queries the SQLite database directly using LIKE.
// This is a temporary solution before moving to a dedicated search engine.
func (s *sqliteSearchService) SearchGlobal(query string, limit int) (*domain.SearchResult, error) {
	if query == "" {
		return &domain.SearchResult{
			Rooms:   []domain.Room{},
			Authors: []domain.Author{},
			Games:   []domain.Game{},
		}, nil
	}

	// SQLite is case-insensitive for LIKE with ASCII characters by default.
	// For a better match, we wrap the query in wildcards.
	likeQuery := fmt.Sprintf("%%%s%%", strings.TrimSpace(query))
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	result := &domain.SearchResult{
		Rooms:   make([]domain.Room, 0),
		Authors: make([]domain.Author, 0),
		Games:   make([]domain.Game, 0),
	}

	// 1. Search Live Rooms (only live and public)
	err := s.db.Preload("Host").Preload("Category").Preload("Game").Preload("Tags").
		Joins("LEFT JOIN room_tags ON room_tags.room_id = rooms.id").
		Joins("LEFT JOIN tags ON tags.id = room_tags.tag_id").
		Where("rooms.status = ? AND rooms.visibility = ?", domain.RoomStatusLive, domain.RoomVisibilityPublic).
		Where("(rooms.title LIKE ? OR rooms.description LIKE ? OR tags.name LIKE ?)", likeQuery, likeQuery, likeQuery).
		Group("rooms.id").
		Limit(limit).
		Find(&result.Rooms).Error
	if err != nil {
		return nil, fmt.Errorf("failed to search rooms: %w", err)
	}

	// 2. Search Authors
	// Need to join User to search by Username or DisplayName
	err = s.db.Preload("User").
		Joins("JOIN users ON authors.user_id = users.id").
		Where("authors.display_name LIKE ? OR users.name LIKE ? OR authors.bio LIKE ?", likeQuery, likeQuery, likeQuery).
		Limit(limit).
		Find(&result.Authors).Error
	if err != nil {
		return nil, fmt.Errorf("failed to search authors: %w", err)
	}

	// 3. Search Games
	err = s.db.Preload("Category").
		Where("name LIKE ? OR slug LIKE ?", likeQuery, likeQuery).
		Limit(limit).
		Find(&result.Games).Error
	if err != nil {
		return nil, fmt.Errorf("failed to search games: %w", err)
	}

	return result, nil
}
