package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"gorm.io/gorm"
)

type DonationServiceImpl struct {
	db            *gorm.DB
	walletRepo    domain.WalletRepository
	donationRepo  domain.DonationRepository
	rdb           *redis.Client
	kafkaProducer *kafka.Producer
}

func NewDonationService(
	db *gorm.DB,
	walletRepo domain.WalletRepository,
	donationRepo domain.DonationRepository,
	rdb *redis.Client,
	kafkaProducer *kafka.Producer,
) domain.DonationService {
	return &DonationServiceImpl{
		db:            db,
		walletRepo:    walletRepo,
		donationRepo:  donationRepo,
		rdb:           rdb,
		kafkaProducer: kafkaProducer,
	}
}

// Gift value map config
var giftRates = map[int]int64{
	1: 20,  // Base - Text
	2: 50,  // Chest
	3: 100, // Rocket
	4: 200, // Castle
	5: 500, // Crown
}

func (s *DonationServiceImpl) Donate(ctx context.Context, senderID uint, roomID uint, giftType int, message string) (*domain.Donation, error) {
	coinCost, ok := giftRates[giftType]
	if !ok {
		return nil, errors.New("invalid gift type")
	}

	donation := &domain.Donation{
		SenderID:   senderID,
		RoomID:     roomID,
		CoinAmount: coinCost,
		GiftType:   giftType,
		Message:    message,
		CreatedAt:  time.Now(),
	}

	// Fetch host of the room
	var room domain.Room
	if err := s.db.WithContext(ctx).First(&room, roomID).Error; err != nil {
		return nil, errors.New("room not found")
	}

	// Verify if the streamer's wallet is active
	var hostWallet domain.Wallet
	if err := s.db.WithContext(ctx).Where("user_id = ?", room.HostID).First(&hostWallet).Error; err != nil {
		// If wallet does not exist, host cannot receive donations
		return nil, errors.New("streamer has not activated their donation wallet")
	}
	if !hostWallet.IsActive {
		return nil, errors.New("streamer has not activated their donation wallet")
	}

	// Database Transaction block to ensure consistency (ACID)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Deduct sender wallet balance (uses SELECT FOR UPDATE lock internally)
		err := s.walletRepo.UpdateBalanceWithTx(ctx, tx, senderID, -coinCost)
		if err != nil {
			return err // Will rollback automatically (e.g., if insufficient balance)
		}

		// 2. Save donation record
		err = s.donationRepo.CreateWithTx(ctx, tx, donation)
		if err != nil {
			return err
		}

		// 3. Add coin amount to streamer's wallet balance
		err = s.walletRepo.UpdateBalanceWithTx(ctx, tx, room.HostID, coinCost)
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Fetch sender metadata for event payload
	var sender domain.User
	if err := s.db.WithContext(ctx).First(&sender, senderID).Error; err != nil {
		sender.Name = fmt.Sprintf("User %d", senderID)
	}

	// 3. Publish donation.created event to Kafka asynchronously
	if s.kafkaProducer != nil {
		go func() {
			// 3a. Publish to chat-events so the chat-service can broadcast the gift message
			kafkaErr := s.kafkaProducer.Publish(context.Background(), kafka.TopicChatEvents, fmt.Sprintf("%d", roomID), kafka.Event{
				EventType: kafka.EventChatMessage, // Chat Service maps to 'chat.message'
				Timestamp: time.Now(),
				Payload: map[string]any{
					"id":         fmt.Sprintf("donate-%d", donation.ID),
					"room_id":    roomID,
					"user_id":    senderID,
					"user_name":  sender.Name,
					"avatar":     sender.Avatar,
					"content":    message,
					"type":       "gift",
					"created_at": donation.CreatedAt.Format(time.RFC3339),
					"gift_type":  giftType,
					"coin":       coinCost,
				},
			})
			if kafkaErr != nil {
				// Log but do not block HTTP response
				fmt.Printf("Failed to publish donation chat event to Kafka: %v\n", kafkaErr)
			}

			// 3b. Publish dedicated donation.sent event for analytics tracking
			analyticsErr := s.kafkaProducer.Publish(context.Background(), kafka.TopicDonationEvents, fmt.Sprintf("%d", roomID), kafka.Event{
				EventType: kafka.EventDonationSent,
				Timestamp: time.Now(),
				Payload: map[string]any{
					"room_id":     roomID,
					"streamer_id": room.HostID,
					"donor_id":    senderID,
					"coin_amount": coinCost,
					"gift_type":   giftType,
				},
			})
			if analyticsErr != nil {
				fmt.Printf("Failed to publish donation.sent analytics event to Kafka: %v\n", analyticsErr)
			}
		}()
	}

	return donation, nil
}

func (s *DonationServiceImpl) GetWallet(ctx context.Context, userID uint) (*domain.Wallet, error) {
	return s.walletRepo.FindByUserID(ctx, userID)
}

func (s *DonationServiceImpl) DailyCheckIn(ctx context.Context, userID uint) (int64, error) {
	// Redis key structure for daily checkin tracking: gostream:user:{id}:checkin:YYYY-MM-DD
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	todayStr := time.Now().In(loc).Format("2006-01-02")
	redisKey := fmt.Sprintf("gostream:user:%d:checkin:%s", userID, todayStr)

	// Redis SETNX: atomic operation to verify checkin
	success, err := s.rdb.SetNX(ctx, redisKey, "checked", 24*time.Hour).Result()
	if err != nil {
		return 0, err
	}
	if !success {
		return 0, errors.New("already checked in today")
	}

	// Add 10 Coins
	const checkinReward = 10
	err = s.walletRepo.CheckIn(ctx, userID, checkinReward)
	if err != nil {
		// Clean up Redis lock on DB failure
		s.rdb.Del(ctx, redisKey)
		return 0, err
	}

	// Fetch final balance
	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return 0, nil
	}

	return wallet.Balance, nil
}
