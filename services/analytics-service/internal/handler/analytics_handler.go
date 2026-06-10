package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/services/analytics-service/internal/repository"
)

type AnalyticsHandler struct {
	repo        repository.AnalyticsRepository
	leaderboard repository.LeaderboardRepository
	roomStats   repository.RoomStatsRepository
}

func NewAnalyticsHandler(
	repo repository.AnalyticsRepository,
	leaderboard repository.LeaderboardRepository,
	roomStats repository.RoomStatsRepository,
) *AnalyticsHandler {
	return &AnalyticsHandler{
		repo:        repo,
		leaderboard: leaderboard,
		roomStats:   roomStats,
	}
}

// GetRoomStats returns real-time statistic metrics for a specific room.
// GET /api/analytics/rooms/{roomId}
func (h *AnalyticsHandler) GetRoomStats(w http.ResponseWriter, r *http.Request) {
	roomID, ok := h.parseUintParam(w, r, "roomId")
	if !ok {
		return
	}

	chatCount, err := h.repo.GetChatCount(r.Context(), roomID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve analytics metrics")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"room_id":    roomID,
		"chat_count": chatCount,
	})
}

// GetRoomTopDonors returns the top donors for a live room.
// GET /api/analytics/rooms/{roomId}/donors?limit=10
func (h *AnalyticsHandler) GetRoomTopDonors(w http.ResponseWriter, r *http.Request) {
	roomID, ok := h.parseUintParam(w, r, "roomId")
	if !ok {
		return
	}

	limit := h.parseLimit(r, 10)

	donors, err := h.roomStats.GetTopDonors(r.Context(), roomID, limit)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve top donors")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"room_id": roomID,
		"donors":  donors,
	})
}

// GetRoomTopChatters returns the most active chatters in a live room.
// GET /api/analytics/rooms/{roomId}/chatters?limit=10
func (h *AnalyticsHandler) GetRoomTopChatters(w http.ResponseWriter, r *http.Request) {
	roomID, ok := h.parseUintParam(w, r, "roomId")
	if !ok {
		return
	}

	limit := h.parseLimit(r, 10)

	chatters, err := h.roomStats.GetTopChatters(r.Context(), roomID, limit)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve top chatters")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"room_id":  roomID,
		"chatters": chatters,
	})
}

// GetLeaderboard returns the top streamers for a given metric and period.
// GET /api/analytics/leaderboard/streamers?metric=donate&period=weekly&limit=10
func (h *AnalyticsHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	metricStr := r.URL.Query().Get("metric")
	periodStr := r.URL.Query().Get("period")
	limit := h.parseLimit(r, 10)

	// Validate and default metric
	metric := repository.LeaderboardMetric(metricStr)
	switch metric {
	case repository.MetricViewers, repository.MetricDonate, repository.MetricChat:
		// valid
	default:
		metric = repository.MetricDonate
	}

	// Validate and default period
	period := repository.LeaderboardPeriod(periodStr)
	switch period {
	case repository.PeriodDaily, repository.PeriodWeekly, repository.PeriodMonthly, repository.PeriodYearly:
		// valid
	default:
		period = repository.PeriodDaily
	}

	entries, err := h.leaderboard.GetTopStreamers(r.Context(), metric, period, limit)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve leaderboard")
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"metric":   metric,
		"period":   period,
		"top":      limit,
		"entries":  entries,
	})
}

// GetStreamerRank returns a specific streamer's rank in a leaderboard.
// GET /api/analytics/leaderboard/streamers/{streamerId}?metric=donate&period=weekly
func (h *AnalyticsHandler) GetStreamerRank(w http.ResponseWriter, r *http.Request) {
	streamerID, ok := h.parseUintParam(w, r, "streamerId")
	if !ok {
		return
	}

	metricStr := r.URL.Query().Get("metric")
	periodStr := r.URL.Query().Get("period")

	metric := repository.LeaderboardMetric(metricStr)
	switch metric {
	case repository.MetricViewers, repository.MetricDonate, repository.MetricChat:
	default:
		metric = repository.MetricDonate
	}

	period := repository.LeaderboardPeriod(periodStr)
	switch period {
	case repository.PeriodDaily, repository.PeriodWeekly, repository.PeriodMonthly, repository.PeriodYearly:
	default:
		period = repository.PeriodDaily
	}

	entry, err := h.leaderboard.GetStreamerRank(r.Context(), metric, period, streamerID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve streamer rank")
		return
	}
	if entry == nil {
		h.respondJSON(w, http.StatusOK, map[string]any{
			"streamer_id": streamerID,
			"metric":      metric,
			"period":      period,
			"ranked":      false,
		})
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]any{
		"streamer_id": streamerID,
		"metric":      metric,
		"period":      period,
		"ranked":      true,
		"rank":        entry.Rank,
		"score":       entry.Score,
	})
}

// --- Helpers ---

func (h *AnalyticsHandler) parseUintParam(w http.ResponseWriter, r *http.Request, param string) (uint, bool) {
	s := r.PathValue(param)
	if s == "" {
		h.respondError(w, http.StatusBadRequest, param+" is required")
		return 0, false
	}
	id64, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid "+param)
		return 0, false
	}
	return uint(id64), true
}

func (h *AnalyticsHandler) parseLimit(r *http.Request, defaultVal int64) int64 {
	s := r.URL.Query().Get("limit")
	if s == "" {
		return defaultVal
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil || v <= 0 || v > 100 {
		return defaultVal
	}
	return v
}

func (h *AnalyticsHandler) respondJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *AnalyticsHandler) respondError(w http.ResponseWriter, statusCode int, message string) {
	h.respondJSON(w, statusCode, map[string]any{
		"status":     false,
		"statusCode": statusCode,
		"message":    message,
	})
}
