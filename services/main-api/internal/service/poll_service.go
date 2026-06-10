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

type PollServiceImpl struct {
	db             *gorm.DB
	pollRepo       domain.PollRepository
	moderationRepo domain.ModerationRepository
	kafkaProducer  *kafka.Producer
}

func NewPollService(
	db *gorm.DB,
	pollRepo domain.PollRepository,
	moderationRepo domain.ModerationRepository,
	kafkaProducer *kafka.Producer,
) domain.PollService {
	return &PollServiceImpl{
		db:             db,
		pollRepo:       pollRepo,
		moderationRepo: moderationRepo,
		kafkaProducer:  kafkaProducer,
	}
}

func (s *PollServiceImpl) CreatePoll(ctx context.Context, creatorID uint, roomID uint, title string, options []string, durationSec int) (*domain.Poll, error) {
	// Must be moderator or host of the room
	isMod, err := s.moderationRepo.IsModerator(ctx, roomID, creatorID)
	if err != nil {
		return nil, err
	}
	if !isMod {
		return nil, errors.New("only host or moderators can create polls")
	}

	active, err := s.pollRepo.FindActiveByRoomID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, errors.New("an active poll already exists in this room")
	}

	if len(options) < 2 {
		return nil, errors.New("poll must have at least 2 options")
	}

	poll := &domain.Poll{
		RoomID:    roomID,
		Title:     title,
		Status:    domain.PollStatusActive,
		EndTime:   time.Now().Add(time.Duration(durationSec) * time.Second),
		CreatedAt: time.Now(),
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(poll).Error; err != nil {
			return err
		}

		for _, optTitle := range options {
			opt := &domain.PollOption{
				PollID: poll.ID,
				Title:  optTitle,
				Votes:  0,
			}
			if err := tx.Create(opt).Error; err != nil {
				return err
			}
			poll.Options = append(poll.Options, *opt)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.publishPollEvent(roomID, kafka.EventPollCreated, poll)

	return poll, nil
}

func (s *PollServiceImpl) EndPoll(ctx context.Context, creatorID uint, pollID uint) (*domain.Poll, error) {
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	isMod, err := s.moderationRepo.IsModerator(ctx, poll.RoomID, creatorID)
	if err != nil {
		return nil, err
	}
	if !isMod {
		return nil, errors.New("only host or moderators can end polls")
	}

	if poll.Status != domain.PollStatusActive {
		return nil, errors.New("poll is already ended")
	}

	poll.Status = domain.PollStatusEnded
	if err := s.pollRepo.Update(ctx, poll); err != nil {
		return nil, err
	}

	s.publishPollEvent(poll.RoomID, kafka.EventPollEnded, poll)

	return poll, nil
}

func (s *PollServiceImpl) Vote(ctx context.Context, userID uint, pollID uint, optionID uint) error {
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return err
	}
	if poll == nil {
		return errors.New("poll not found")
	}

	if poll.Status != domain.PollStatusActive {
		return errors.New("poll is not active")
	}

	if time.Now().After(poll.EndTime) {
		return errors.New("poll has expired")
	}

	// Verify option ID belongs to the poll
	var isValidOption bool
	for _, opt := range poll.Options {
		if opt.ID == optionID {
			isValidOption = true
			break
		}
	}
	if !isValidOption {
		return errors.New("invalid option ID")
	}

	voted, err := s.pollRepo.HasUserVoted(ctx, pollID, userID)
	if err != nil {
		return err
	}
	if voted {
		return errors.New("you have already voted in this poll")
	}

	vote := &domain.PollVote{
		PollID:    pollID,
		OptionID:  optionID,
		UserID:    userID,
		CreatedAt: time.Now(),
	}

	if err := s.pollRepo.CreateVote(ctx, vote); err != nil {
		return err
	}

	// Refresh poll to get updated vote counts to broadcast
	updatedPoll, _ := s.pollRepo.FindByID(ctx, pollID)
	s.publishPollEvent(poll.RoomID, kafka.EventPollVoted, updatedPoll)

	return nil
}

func (s *PollServiceImpl) GetActivePoll(ctx context.Context, roomID uint) (*domain.Poll, error) {
	return s.pollRepo.FindActiveByRoomID(ctx, roomID)
}

func (s *PollServiceImpl) publishPollEvent(roomID uint, eventType string, poll *domain.Poll) {
	if s.kafkaProducer == nil {
		return
	}
	go func() {
		err := s.kafkaProducer.Publish(context.Background(), kafka.TopicChatEvents, fmt.Sprintf("%d", roomID), kafka.Event{
			EventType: eventType,
			Timestamp: time.Now(),
			Payload:   poll,
		})
		if err != nil {
			fmt.Printf("Failed to publish poll event to Kafka: %v\n", err)
		}
	}()
}
