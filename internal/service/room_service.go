package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"go-stream/internal/domain"
)

type roomService struct {
	repo domain.RoomRepository
}

func NewRoomService(repo domain.RoomRepository) domain.RoomService {
	return &roomService{repo: repo}
}

func (s *roomService) GetLiveRooms(categoryID *uint, gameID *uint) ([]domain.Room, error) {
	status := domain.RoomStatusLive
	visibility := domain.RoomVisibilityPublic
	return s.repo.FindAll(domain.RoomFilter{
		Status:     &status,
		Visibility: &visibility,
		CategoryID: categoryID,
		GameID:     gameID,
	})
}

func (s *roomService) GetRoomByID(id uint) (*domain.Room, error) {
	return s.repo.FindByID(id)
}

func (s *roomService) GetRoomsByHost(hostID uint) ([]domain.Room, error) {
	return s.repo.FindByHostID(hostID)
}

func (s *roomService) CreateRoom(hostID uint, title, description string, categoryID, gameID *uint, tags string, visibility domain.RoomVisibility) (*domain.Room, error) {
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
		Tags:        tags,
		Visibility:  visibility,
		Status:      domain.RoomStatusOffline,
		StreamKey:   key,
	}
	if err := s.repo.Create(room); err != nil {
		return nil, err
	}
	return room, nil
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

	return s.repo.Update(room)
}

func (s *roomService) UpdateRoom(roomID, hostID uint, title, description string, categoryID, gameID *uint, tags string, visibility domain.RoomVisibility) (*domain.Room, error) {
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
	room.Tags = tags
	room.Visibility = visibility

	return room, s.repo.Update(room)
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

// generateStreamKey tạo random stream key 32 bytes hex
func generateStreamKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
