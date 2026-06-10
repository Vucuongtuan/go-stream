package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"gorm.io/gorm"
)

type ModerationServiceImpl struct {
	db             *gorm.DB
	moderationRepo domain.ModerationRepository
	userRepo       domain.UserRepository
	kafkaProducer  *kafka.Producer
}

func NewModerationService(
	db *gorm.DB,
	moderationRepo domain.ModerationRepository,
	userRepo domain.UserRepository,
	kafkaProducer *kafka.Producer,
) domain.ModerationService {
	return &ModerationServiceImpl{
		db:             db,
		moderationRepo: moderationRepo,
		userRepo:       userRepo,
		kafkaProducer:  kafkaProducer,
	}
}

func (s *ModerationServiceImpl) AddModerator(ctx context.Context, hostID uint, roomID uint, targetEmail string) error {
	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, roomID).Error; err != nil {
		return errors.New("room not found")
	}
	if room.HostID != hostID {
		return errors.New("only the stream host can add moderators")
	}

	targetUser, err := s.userRepo.FindByEmail(targetEmail)
	if err != nil {
		return errors.New("user not found with specified email")
	}
	if targetUser == nil {
		return errors.New("user not found")
	}

	if targetUser.ID == hostID {
		return errors.New("stream host is already a moderator by default")
	}

	isMod, err := s.moderationRepo.IsModerator(ctx, roomID, targetUser.ID)
	if err != nil {
		return err
	}
	if isMod {
		return nil // already a moderator
	}

	return s.moderationRepo.AddModerator(ctx, roomID, targetUser.ID)
}

func (s *ModerationServiceImpl) RemoveModerator(ctx context.Context, hostID uint, roomID uint, targetUserID uint) error {
	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, roomID).Error; err != nil {
		return errors.New("room not found")
	}
	if room.HostID != hostID {
		return errors.New("only the stream host can remove moderators")
	}

	return s.moderationRepo.RemoveModerator(ctx, roomID, targetUserID)
}

func (s *ModerationServiceImpl) BanUser(ctx context.Context, moderatorID uint, roomID uint, targetUserID uint, reason string) error {
	if moderatorID == targetUserID {
		return errors.New("you cannot ban yourself")
	}

	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, roomID).Error; err != nil {
		return errors.New("room not found")
	}

	if targetUserID == room.HostID {
		return errors.New("you cannot ban the stream host")
	}

	// Verify moderatorID is host or moderator
	isMod, err := s.moderationRepo.IsModerator(ctx, roomID, moderatorID)
	if err != nil || !isMod {
		return errors.New("unauthorized: only host or moderators can ban users")
	}

	// If caller is moderator, they cannot ban other moderators or the host
	if moderatorID != room.HostID {
		isTargetMod, err := s.moderationRepo.IsModerator(ctx, roomID, targetUserID)
		if err == nil && isTargetMod {
			return errors.New("moderators cannot ban other moderators")
		}
	}

	log := &domain.ModerationLog{
		RoomID:      roomID,
		TargetID:    targetUserID,
		ModeratorID: moderatorID,
		Action:      domain.ModerationActionBan,
		Reason:      reason,
		ExpiresAt:   nil, // permanent ban
		CreatedAt:   time.Now(),
	}

	if err := s.moderationRepo.LogAction(ctx, log); err != nil {
		return err
	}

	s.publishModerationEvent(roomID, kafka.EventUserBanned, map[string]any{
		"room_id":      roomID,
		"user_id":      targetUserID,
		"moderator_id": moderatorID,
		"reason":       reason,
	})

	return nil
}

func (s *ModerationServiceImpl) UnbanUser(ctx context.Context, moderatorID uint, roomID uint, targetUserID uint) error {
	isMod, err := s.moderationRepo.IsModerator(ctx, roomID, moderatorID)
	if err != nil || !isMod {
		return errors.New("unauthorized: only host or moderators can unban users")
	}

	if err := s.moderationRepo.RemoveActiveBan(ctx, roomID, targetUserID); err != nil {
		return err
	}

	s.publishModerationEvent(roomID, kafka.EventUserUnbanned, map[string]any{
		"room_id":      roomID,
		"user_id":      targetUserID,
		"moderator_id": moderatorID,
	})

	return nil
}

func (s *ModerationServiceImpl) TimeoutUser(ctx context.Context, moderatorID uint, roomID uint, targetUserID uint, durationSec int, reason string) error {
	if moderatorID == targetUserID {
		return errors.New("you cannot timeout yourself")
	}

	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, roomID).Error; err != nil {
		return errors.New("room not found")
	}

	if targetUserID == room.HostID {
		return errors.New("you cannot timeout the stream host")
	}

	isMod, err := s.moderationRepo.IsModerator(ctx, roomID, moderatorID)
	if err != nil || !isMod {
		return errors.New("unauthorized: only host or moderators can timeout users")
	}

	if moderatorID != room.HostID {
		isTargetMod, err := s.moderationRepo.IsModerator(ctx, roomID, targetUserID)
		if err == nil && isTargetMod {
			return errors.New("moderators cannot timeout other moderators")
		}
	}

	expiresAt := time.Now().Add(time.Duration(durationSec) * time.Second)
	log := &domain.ModerationLog{
		RoomID:      roomID,
		TargetID:    targetUserID,
		ModeratorID: moderatorID,
		Action:      domain.ModerationActionTimeout,
		Reason:      reason,
		ExpiresAt:   &expiresAt,
		CreatedAt:   time.Now(),
	}

	if err := s.moderationRepo.LogAction(ctx, log); err != nil {
		return err
	}

	s.publishModerationEvent(roomID, kafka.EventUserTimedOut, map[string]any{
		"room_id":      roomID,
		"user_id":      targetUserID,
		"moderator_id": moderatorID,
		"reason":       reason,
		"expires_at":   expiresAt.Format(time.RFC3339),
	})

	return nil
}

func (s *ModerationServiceImpl) IsUserMuted(ctx context.Context, roomID uint, userID uint) (bool, string, error) {
	log, err := s.moderationRepo.GetActiveBanOrTimeout(ctx, roomID, userID)
	if err != nil {
		return false, "", err
	}
	if log == nil {
		return false, "", nil
	}

	reason := log.Reason
	if reason == "" {
		if log.Action == domain.ModerationActionBan {
			reason = "You have been banned from this room."
		} else {
			reason = "You have been temporarily timed out."
		}
	}
	return true, reason, nil
}

func (s *ModerationServiceImpl) publishModerationEvent(roomID uint, eventType string, payload any) {
	if s.kafkaProducer == nil {
		return
	}
	go func() {
		err := s.kafkaProducer.Publish(context.Background(), kafka.TopicChatEvents, fmt.Sprintf("%d", roomID), kafka.Event{
			EventType: eventType,
			Timestamp: time.Now(),
			Payload:   payload,
		})
		if err != nil {
			fmt.Printf("Failed to publish moderation event to Kafka: %v\n", err)
		}
	}()
}
