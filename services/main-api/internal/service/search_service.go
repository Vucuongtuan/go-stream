package service

import (
	"fmt"
	"strings"

	"go-stream/services/main-api/internal/domain"
	"gorm.io/gorm"
)

type dbSearchService struct {
	db *gorm.DB
}

func NewSearchService(db *gorm.DB) domain.SearchService {
	return &dbSearchService{db: db}
}

// SearchGlobal queries the database directly using ILIKE.
// This is a temporary solution before moving to a dedicated search engine.
func (s *dbSearchService) SearchGlobal(query string, limit int) (*domain.SearchResult, error) {
	if query == "" {
		return &domain.SearchResult{
			Rooms:   []domain.Room{},
			Authors: []domain.Author{},
			Games:   []domain.Game{},
		}, nil
	}

	// PostgreSQL uses ILIKE for case-insensitive search.
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
		Where("(rooms.title ILIKE ? OR rooms.description ILIKE ? OR tags.name ILIKE ?)", likeQuery, likeQuery, likeQuery).
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
		Where("authors.display_name ILIKE ? OR users.name ILIKE ? OR authors.bio ILIKE ?", likeQuery, likeQuery, likeQuery).
		Limit(limit).
		Find(&result.Authors).Error
	if err != nil {
		return nil, fmt.Errorf("failed to search authors: %w", err)
	}

	// 3. Search Games
	err = s.db.Preload("Category").
		Where("name ILIKE ? OR slug ILIKE ?", likeQuery, likeQuery).
		Limit(limit).
		Find(&result.Games).Error
	if err != nil {
		return nil, fmt.Errorf("failed to search games: %w", err)
	}

	return result, nil
}
