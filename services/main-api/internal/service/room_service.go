package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"go-stream/services/main-api/internal/domain"

	"github.com/redis/go-redis/v9"
)

type roomService struct {
	repo    domain.RoomRepository
	tagRepo domain.TagRepository
	rdb     *redis.Client
}

func NewRoomService(repo domain.RoomRepository, tagRepo domain.TagRepository, rdb *redis.Client) domain.RoomService {
	return &roomService{repo: repo, tagRepo: tagRepo, rdb: rdb}
}

func (s *roomService) GetLiveRooms(categoryID *uint, gameID *uint) ([]domain.Room, error) {
	status := domain.RoomStatusLive
	visibility := domain.RoomVisibilityPublic
	rooms, err := s.repo.FindAll(domain.RoomFilter{
		Status:     &status,
		Visibility: &visibility,
		CategoryID: categoryID,
		GameID:     gameID,
	})
	if err != nil {
		return nil, err
	}
	for i := range rooms {
		rooms[i].ViewerCount = s.GetViewerCount(rooms[i].ID)
	}
	return rooms, nil
}

func (s *roomService) GetRoomByID(id uint) (*domain.Room, error) {
	room, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	room.ViewerCount = s.GetViewerCount(room.ID)
	return room, nil
}

func (s *roomService) GetRoomsByHost(hostID uint) ([]domain.Room, error) {
	rooms, err := s.repo.FindByHostID(hostID)
	if err != nil {
		return nil, err
	}
	for i := range rooms {
		rooms[i].ViewerCount = s.GetViewerCount(rooms[i].ID)
	}
	return rooms, nil
}

func (s *roomService) GetRoomByHostSlug(slug string) (*domain.Room, error) {
	room, err := s.repo.FindByHostSlug(slug)
	if err != nil {
		return nil, err
	}
	room.ViewerCount = s.GetViewerCount(room.ID)
	return room, nil
}

func (s *roomService) CreateRoom(hostID uint, title, description string, categoryID, gameID *uint, tagIDs []uint, visibility domain.RoomVisibility) (*domain.Room, error) {
	key, err := generateStreamKey()
	if err != nil {
		return nil, err
	}

	room := &domain.Room{
		HostID:      hostID,
		CategoryID:  categoryID,
		GameID:      gameID,
		Title:       title,
		Description: description,
		Visibility:  visibility,
		Status:      domain.RoomStatusOffline,
		StreamKey:   key,
	}
	if err := s.repo.Create(room); err != nil {
		return nil, err
	}

	if len(tagIDs) > 0 {
		if err := s.tagRepo.SyncRoomTags(room.ID, tagIDs); err != nil {
			return nil, err
		}
	}

	return s.repo.FindByID(room.ID)
}

func (s *roomService) GoLive(roomID, hostID uint) (*domain.Room, error) {
	room, err := s.repo.FindByID(roomID)
	if err != nil {
		return nil, err
	}
	if room.HostID != hostID {
		return nil, errors.New("unauthorized")
	}
	if room.Status == domain.RoomStatusLive {
		return nil, errors.New("room is already live")
	}

	now := time.Now()
	room.Status = domain.RoomStatusLive
	room.StartedAt = &now
	room.EndedAt = nil

	return room, s.repo.Update(room)
}

func (s *roomService) EndStream(roomID, hostID uint) error {
	room, err := s.repo.FindByID(roomID)
	if err != nil {
		return err
	}
	if room.HostID != hostID {
		return errors.New("unauthorized")
	}
	if room.Status != domain.RoomStatusLive {
		return errors.New("room is not live")
	}

	now := time.Now()
	room.Status = domain.RoomStatusEnded
	room.EndedAt = &now

	if err := s.repo.Update(room); err != nil {
		return err
	}

	// Clean up viewers count key in Redis when stream ends
	if s.rdb != nil {
		s.rdb.Del(context.Background(), fmt.Sprintf("room:%d:viewers", roomID))
	}

	return nil
}

func (s *roomService) UpdateRoom(roomID, hostID uint, title, description string, categoryID, gameID *uint, tagIDs []uint, visibility domain.RoomVisibility) (*domain.Room, error) {
	room, err := s.repo.FindByID(roomID)
	if err != nil {
		return nil, err
	}
	if room.HostID != hostID {
		return nil, errors.New("unauthorized")
	}

	room.Title = title
	room.Description = description
	room.CategoryID = categoryID
	room.GameID = gameID
	room.Visibility = visibility

	if err := s.repo.Update(room); err != nil {
		return nil, err
	}

	if err := s.tagRepo.SyncRoomTags(roomID, tagIDs); err != nil {
		return nil, err
	}

	return s.repo.FindByID(roomID)
}

func (s *roomService) DeleteRoom(roomID, hostID uint) error {
	room, err := s.repo.FindByID(roomID)
	if err != nil {
		return err
	}
	if room.HostID != hostID {
		return errors.New("unauthorized")
	}
	return s.repo.Delete(roomID)
}

func (s *roomService) TrackViewerHeartbeat(roomID uint, viewerSessionID string) error {
	if s.rdb == nil {
		return nil
	}
	ctx := context.Background()
	key := fmt.Sprintf("room:%d:viewers", roomID)
	now := time.Now().Unix()

	_, err := s.rdb.ZAdd(ctx, key, redis.Z{
		Score:  float64(now),
		Member: viewerSessionID,
	}).Result()
	if err != nil {
		return err
	}

	s.rdb.Expire(ctx, key, 2*time.Hour)
	return nil
}

func (s *roomService) GetViewerCount(roomID uint) int {
	if s.rdb == nil {
		return 0
	}
	ctx := context.Background()
	key := fmt.Sprintf("room:%d:viewers", roomID)
	now := time.Now().Unix()

	// Clean up viewers that haven't sent a heartbeat in the last 40 seconds
	timeout := int64(40)
	s.rdb.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", now-timeout))

	count, err := s.rdb.ZCard(ctx, key).Result()
	if err != nil {
		return 0
	}
	return int(count)
}

func generateStreamKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
