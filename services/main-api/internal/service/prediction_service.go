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

type PredictionServiceImpl struct {
	db             *gorm.DB
	predictionRepo domain.PredictionRepository
	walletRepo     domain.WalletRepository
	kafkaProducer  *kafka.Producer
}

func NewPredictionService(
	db *gorm.DB,
	predictionRepo domain.PredictionRepository,
	walletRepo domain.WalletRepository,
	kafkaProducer *kafka.Producer,
) domain.PredictionService {
	return &PredictionServiceImpl{
		db:             db,
		predictionRepo: predictionRepo,
		walletRepo:     walletRepo,
		kafkaProducer:  kafkaProducer,
	}
}

func (s *PredictionServiceImpl) CreatePrediction(ctx context.Context, hostID uint, roomID uint, title string, options []string, durationSec int) (*domain.Prediction, error) {
	// Verify host is indeed the owner of the room
	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, roomID).Error; err != nil {
		return nil, errors.New("room not found")
	}
	if room.HostID != hostID {
		return nil, errors.New("only the stream author can create predictions")
	}

	// Verify no active prediction exists
	active, err := s.predictionRepo.FindActiveByRoomID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, errors.New("an active prediction already exists in this room")
	}

	if len(options) < 2 {
		return nil, errors.New("prediction must have at least 2 options")
	}

	prediction := &domain.Prediction{
		RoomID:    roomID,
		Title:     title,
		Status:    domain.PredictionStatusActive,
		EndTime:   time.Now().Add(time.Duration(durationSec) * time.Second),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(prediction).Error; err != nil {
			return err
		}

		for _, optTitle := range options {
			opt := &domain.PredictionOption{
				PredictionID: prediction.ID,
				Title:        optTitle,
				TotalPoints:  0,
			}
			if err := tx.Create(opt).Error; err != nil {
				return err
			}
			prediction.Options = append(prediction.Options, *opt)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Publish prediction.created to Kafka
	s.publishPredictionEvent(roomID, kafka.EventPredictionCreated, prediction)

	return prediction, nil
}

func (s *PredictionServiceImpl) LockPrediction(ctx context.Context, hostID uint, predictionID uint) (*domain.Prediction, error) {
	prediction, err := s.predictionRepo.FindByID(ctx, predictionID)
	if err != nil {
		return nil, err
	}
	if prediction == nil {
		return nil, errors.New("prediction not found")
	}

	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, prediction.RoomID).Error; err != nil {
		return nil, err
	}
	if room.HostID != hostID {
		return nil, errors.New("only the stream author can manage predictions")
	}

	if prediction.Status != domain.PredictionStatusActive {
		return nil, errors.New("prediction is not active")
	}

	prediction.Status = domain.PredictionStatusLocked
	prediction.UpdatedAt = time.Now()

	if err := s.predictionRepo.Update(ctx, prediction); err != nil {
		return nil, err
	}

	s.publishPredictionEvent(prediction.RoomID, kafka.EventPredictionLocked, prediction)

	return prediction, nil
}

func (s *PredictionServiceImpl) ResolvePrediction(ctx context.Context, hostID uint, predictionID uint, winningOptionID uint) (*domain.Prediction, error) {
	prediction, err := s.predictionRepo.FindByID(ctx, predictionID)
	if err != nil {
		return nil, err
	}
	if prediction == nil {
		return nil, errors.New("prediction not found")
	}

	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, prediction.RoomID).Error; err != nil {
		return nil, err
	}
	if room.HostID != hostID {
		return nil, errors.New("only the stream author can manage predictions")
	}

	if prediction.Status != domain.PredictionStatusActive && prediction.Status != domain.PredictionStatusLocked {
		return nil, errors.New("prediction cannot be resolved from its current status")
	}

	// Verify winningOptionID belongs to the prediction
	var isValidOption bool
	var winningOptionTotalPoints int64
	var totalPoints int64
	for _, opt := range prediction.Options {
		totalPoints += opt.TotalPoints
		if opt.ID == winningOptionID {
			isValidOption = true
			winningOptionTotalPoints = opt.TotalPoints
		}
	}
	if !isValidOption {
		return nil, errors.New("invalid winning option ID")
	}

	bets, err := s.predictionRepo.FindBetsByPredictionID(ctx, predictionID)
	if err != nil {
		return nil, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		prediction.Status = domain.PredictionStatusResolved
		prediction.WinningOptionID = &winningOptionID
		prediction.UpdatedAt = time.Now()

		if err := tx.Save(prediction).Error; err != nil {
			return err
		}

		if winningOptionTotalPoints == 0 {
			// No bets on winning option, refund everyone
			for _, bet := range bets {
				err := s.walletRepo.UpdateBalanceWithTx(ctx, tx, bet.UserID, bet.Points)
				if err != nil {
					return err
				}
			}
		} else {
			// Distribute rewards proportional to bets on the winning option
			for _, bet := range bets {
				if bet.OptionID == winningOptionID {
					// Payout = bet + share of losing pool
					// Payout = bet.Points * totalPoints / winningOptionTotalPoints
					payout := (bet.Points * totalPoints) / winningOptionTotalPoints
					err := s.walletRepo.UpdateBalanceWithTx(ctx, tx, bet.UserID, payout)
					if err != nil {
						return err
					}
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.publishPredictionEvent(prediction.RoomID, kafka.EventPredictionResolved, prediction)

	return prediction, nil
}

func (s *PredictionServiceImpl) CancelPrediction(ctx context.Context, hostID uint, predictionID uint) (*domain.Prediction, error) {
	prediction, err := s.predictionRepo.FindByID(ctx, predictionID)
	if err != nil {
		return nil, err
	}
	if prediction == nil {
		return nil, errors.New("prediction not found")
	}

	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, prediction.RoomID).Error; err != nil {
		return nil, err
	}
	if room.HostID != hostID {
		return nil, errors.New("only the stream author can manage predictions")
	}

	if prediction.Status != domain.PredictionStatusActive && prediction.Status != domain.PredictionStatusLocked {
		return nil, errors.New("only active or locked predictions can be canceled")
	}

	bets, err := s.predictionRepo.FindBetsByPredictionID(ctx, predictionID)
	if err != nil {
		return nil, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		prediction.Status = domain.PredictionStatusCanceled
		prediction.UpdatedAt = time.Now()

		if err := tx.Save(prediction).Error; err != nil {
			return err
		}

		// Refund everyone
		for _, bet := range bets {
			err := s.walletRepo.UpdateBalanceWithTx(ctx, tx, bet.UserID, bet.Points)
			if err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.publishPredictionEvent(prediction.RoomID, kafka.EventPredictionCanceled, prediction)

	return prediction, nil
}

func (s *PredictionServiceImpl) PlaceBet(ctx context.Context, userID uint, predictionID uint, optionID uint, points int64) (*domain.PredictionBet, error) {
	if points <= 0 {
		return nil, errors.New("points must be greater than zero")
	}

	prediction, err := s.predictionRepo.FindByID(ctx, predictionID)
	if err != nil {
		return nil, err
	}
	if prediction == nil {
		return nil, errors.New("prediction not found")
	}

	if prediction.Status != domain.PredictionStatusActive {
		return nil, errors.New("prediction is not accepting bets")
	}

	if time.Now().After(prediction.EndTime) {
		return nil, errors.New("prediction betting time has expired")
	}

	var isValidOption bool
	for _, opt := range prediction.Options {
		if opt.ID == optionID {
			isValidOption = true
			break
		}
	}
	if !isValidOption {
		return nil, errors.New("invalid option ID")
	}

	existingBet, err := s.predictionRepo.GetBet(ctx, predictionID, userID)
	if err != nil {
		return nil, err
	}

	if existingBet != nil && existingBet.OptionID != optionID {
		return nil, errors.New("you have already bet on a different option")
	}

	var bet *domain.PredictionBet
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deduct wallet balance
		err := s.walletRepo.UpdateBalanceWithTx(ctx, tx, userID, -points)
		if err != nil {
			return err
		}

		if existingBet != nil {
			err = s.predictionRepo.UpdateBetPoints(ctx, existingBet.ID, points)
			if err != nil {
				return err
			}
			bet = existingBet
			bet.Points += points
		} else {
			bet = &domain.PredictionBet{
				PredictionID: predictionID,
				OptionID:     optionID,
				UserID:       userID,
				Points:       points,
				CreatedAt:    time.Now(),
			}
			err = s.predictionRepo.CreateBet(ctx, bet)
			if err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Refresh prediction to fetch updated points to broadcast
	updatedPrediction, _ := s.predictionRepo.FindByID(ctx, predictionID)
	s.publishPredictionEvent(prediction.RoomID, kafka.EventPredictionBet, updatedPrediction)

	return bet, nil
}

func (s *PredictionServiceImpl) GetActivePrediction(ctx context.Context, roomID uint) (*domain.Prediction, error) {
	return s.predictionRepo.FindActiveByRoomID(ctx, roomID)
}

func (s *PredictionServiceImpl) publishPredictionEvent(roomID uint, eventType string, prediction *domain.Prediction) {
	if s.kafkaProducer == nil {
		return
	}
	go func() {
		err := s.kafkaProducer.Publish(context.Background(), kafka.TopicChatEvents, fmt.Sprintf("%d", roomID), kafka.Event{
			EventType: eventType,
			Timestamp: time.Now(),
			Payload:   prediction,
		})
		if err != nil {
			fmt.Printf("Failed to publish prediction event to Kafka: %v\n", err)
		}
	}()
}
