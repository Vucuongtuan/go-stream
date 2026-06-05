package domain

// SearchResult aggregates search results across different models
type SearchResult struct {
	Rooms    []Room    `json:"rooms"`
	Authors  []Author  `json:"authors"`
	Games    []Game    `json:"games"`
	// ShortVideos []ShortVideo `json:"short_videos"` // we will add this later if needed
}

// SearchService defines the abstraction for searching.
// This interface allows us to easily swap out SQLite search for Meilisearch later.
type SearchService interface {
	// SearchGlobal performs a global search across all indexable models.
	SearchGlobal(query string, limit int) (*SearchResult, error)
	
	// These methods are placeholders for future external search engines (like Meilisearch).
	// For SQLite, they might just be no-ops since the DB already has the data.
	// IndexRoom(room *Room) error
	// RemoveRoom(roomID uint) error
}
