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
	err := s.db.Preload("Host").Preload("Category").Preload("Game").
		Where("status = ? AND visibility = ?", domain.RoomStatusLive, domain.RoomVisibilityPublic).
		Where("(title LIKE ? OR tags LIKE ? OR description LIKE ?)", likeQuery, likeQuery, likeQuery).
		Limit(limit).
		Find(&result.Rooms).Error
	if err != nil {
		return nil, fmt.Errorf("failed to search rooms: %w", err)
	}

	// 2. Search Authors
	// Need to join User to search by Username or DisplayName
	err = s.db.Preload("User").
		Joins("JOIN users ON authors.user_id = users.id").
		Where("users.username LIKE ? OR users.display_name LIKE ? OR authors.bio LIKE ?", likeQuery, likeQuery, likeQuery).
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
