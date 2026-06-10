package handler

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"go-stream/services/main-api/pkg/chat"
	"go-stream/services/main-api/pkg/logger"
	"go-stream/services/main-api/pkg/response"
	"go-stream/services/main-api/pkg/storage"
)

// IngestHandler handles RTMP lifecycle hooks from nginx-rtmp / SRS / MediaMTX.
// These endpoints are NOT public — they should only be called by the ingest server
// (whitelist ingest server IP at load balancer / firewall level).
type IngestHandler struct {
	roomRepo      domain.RoomRepository
	chatHub       *chat.Hub
	kafkaProducer *kafka.Producer
}

func NewIngestHandler(roomRepo domain.RoomRepository, chatHub *chat.Hub, kafkaProducer *kafka.Producer) *IngestHandler {
	return &IngestHandler{roomRepo: roomRepo, chatHub: chatHub, kafkaProducer: kafkaProducer}
}

// OnPublish is called by the RTMP ingest server when a stream starts.
// nginx-rtmp config example:
//
//	on_publish http://api:3000/ingest/on-publish;
//
// SRS config example:
//
//	on_publish http://api:3000/ingest/on-publish;
//
// POST /ingest/on-publish
// Form params: name=<stream_key>
func (h *IngestHandler) OnPublish(w http.ResponseWriter, r *http.Request) {
	streamKey := r.FormValue("name")
	if streamKey == "" {
		streamKey = r.URL.Query().Get("name")
	}
	if streamKey == "" {
		// nginx-rtmp expects 4xx to deny the stream
		response.Error(w, http.StatusBadRequest, "Missing stream key")
		return
	}

	room, err := h.roomRepo.FindByStreamKey(streamKey)
	if err != nil {
		logger.Warn("Ingest: unknown stream key", "key", streamKey)
		response.Error(w, http.StatusForbidden, "Invalid stream key")
		return
	}

	if room.Status == domain.RoomStatusLive {
		logger.Warn("Ingest: room is already live, allowing republish", "room_id", room.ID)
	}

	room.PlaybackURL = storage.HLSLiveURL(streamKey)
	room.Status = domain.RoomStatusLive

	if err := h.roomRepo.Update(room); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update room")
		return
	}

	logger.Info("Stream started", "room_id", room.ID, "host_id", room.HostID)

	// Publish stream.started event to Kafka
	if h.kafkaProducer != nil {
		go func() {
			err := h.kafkaProducer.Publish(context.Background(), kafka.TopicStreamEvents, fmt.Sprintf("%d", room.ID), kafka.Event{
				EventType: kafka.EventStreamStarted,
				Timestamp: time.Now(),
				Payload: map[string]any{
					"room_id":      room.ID,
					"host_id":      room.HostID,
					"title":        room.Title,
					"playback_url": room.PlaybackURL,
				},
			})
			if err != nil {
				logger.Error("Failed to publish stream.started event", err)
			}
		}()
	}

	// 200 OK tells nginx-rtmp to allow the stream
	response.Success(w, http.StatusOK, map[string]any{
		"room_id":      room.ID,
		"playback_url": room.PlaybackURL,
	})
}

// OnPublishDone is called when the stream ends (OBS disconnects / stops).
// POST /ingest/on-publish-done
func (h *IngestHandler) OnPublishDone(w http.ResponseWriter, r *http.Request) {
	streamKey := r.FormValue("name")
	if streamKey == "" {
		streamKey = r.URL.Query().Get("name")
	}

	room, err := h.roomRepo.FindByStreamKey(streamKey)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Room not found")
		return
	}

	room.Status = domain.RoomStatusEnded
	room.VodURL = storage.HLSVodURL(streamKey)

	if err := h.roomRepo.Update(room); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update room")
		return
	}

	// Cleanup in-memory chat — stream is over
	h.chatHub.CleanupRoom(room.ID)

	// Publish stream.ended event to Kafka
	if h.kafkaProducer != nil {
		go func() {
			err := h.kafkaProducer.Publish(context.Background(), kafka.TopicStreamEvents, fmt.Sprintf("%d", room.ID), kafka.Event{
				EventType: kafka.EventStreamEnded,
				Timestamp: time.Now(),
				Payload: map[string]any{
					"room_id": room.ID,
					"host_id": room.HostID,
				},
			})
			if err != nil {
				logger.Error("Failed to publish stream.ended event", err)
			}
		}()
	}

	logger.Info("Stream ended", "room_id", room.ID, "vod_url", room.VodURL)
	response.Success(w, http.StatusOK, nil)
}

// Playback returns the HLS manifest URL for a given room.
// GET /api/rooms/{id}/playback
func (h *IngestHandler) Playback(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	room, err := h.roomRepo.FindByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Room not found")
		return
	}

	switch room.Status {
	case domain.RoomStatusLive:
		response.Success(w, http.StatusOK, map[string]any{
			"type":         "live",
			"playback_url": room.PlaybackURL,
		})
	case domain.RoomStatusEnded:
		response.Success(w, http.StatusOK, map[string]any{
			"type":    "vod",
			"vod_url": room.VodURL,
		})
	default:
		response.Error(w, http.StatusBadRequest, "Room is not live")
	}
}
