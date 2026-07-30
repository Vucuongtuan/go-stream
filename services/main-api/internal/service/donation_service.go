package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/kafka"
	"go-stream/services/main-api/internal/outbox"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const dailyCheckInReward int64 = 10

type DonationServiceImpl struct {
	db           *gorm.DB
	walletRepo   domain.WalletRepository
	donationRepo domain.DonationRepository
	rdb          *redis.Client
	outboxRepo   *outbox.Repository
}

func NewDonationService(
	db *gorm.DB,
	walletRepo domain.WalletRepository,
	donationRepo domain.DonationRepository,
	rdb *redis.Client,
	outboxRepo *outbox.Repository,
) domain.DonationService {
	return &DonationServiceImpl{
		db:           db,
		walletRepo:   walletRepo,
		donationRepo: donationRepo,
		rdb:          rdb,
		outboxRepo:   outboxRepo,
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
	var coinCost int64
	var gift domain.Gift
	if err := s.db.WithContext(ctx).First(&gift, giftType).Error; err == nil {
		coinCost = gift.CoinPrice
	} else {
		rate, ok := giftRates[giftType]
		if !ok {
			return nil, errors.New("invalid gift type")
		}
		coinCost = rate
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

	// Fetch sender data before the transaction so the durable event has the
	// complete payload when the donation is committed.
	var sender domain.User
	if err := s.db.WithContext(ctx).First(&sender, senderID).Error; err != nil {
		sender.Name = fmt.Sprintf("User %d", senderID)
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

		if s.outboxRepo != nil {
			chatEvent := kafka.Event{EventType: kafka.EventChatMessage, Timestamp: time.Now(), Payload: map[string]any{
				"id": fmt.Sprintf("donate-%d", donation.ID), "room_id": roomID, "user_id": senderID,
				"user_name": sender.Name, "avatar": sender.Avatar, "content": message, "type": "gift",
				"created_at": donation.CreatedAt.Format(time.RFC3339), "gift_type": giftType, "coin": coinCost,
			}}
			if err := s.outboxRepo.Enqueue(tx, kafka.TopicChatEvents, fmt.Sprintf("%d", roomID), chatEvent); err != nil {
				return err
			}
			donationEvent := kafka.Event{EventType: kafka.EventDonationSent, Timestamp: time.Now(), Payload: map[string]any{
				"room_id": roomID, "streamer_id": room.HostID, "donor_id": senderID, "coin_amount": coinCost, "gift_type": giftType,
			}}
			if err := s.outboxRepo.Enqueue(tx, kafka.TopicDonationEvents, fmt.Sprintf("%d", roomID), donationEvent); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return donation, nil
}

func (s *DonationServiceImpl) GetWallet(ctx context.Context, userID uint) (*domain.Wallet, error) {
	return s.walletRepo.FindByUserID(ctx, userID)
}

func (s *DonationServiceImpl) DailyCheckIn(ctx context.Context, userID uint) (int64, error) {
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	todayStr := time.Now().In(loc).Format("2006-01-02")
	var balance int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user domain.User
		if err := tx.First(&user, userID).Error; err != nil {
			return err
		}
		if user.Role != "user" {
			return domain.ErrDailyCheckInUserOnly
		}

		checkIn := domain.DailyCheckIn{
			UserID:      userID,
			CheckInDate: todayStr,
			Reward:      dailyCheckInReward,
		}
		result := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "check_in_date"}},
			DoNothing: true,
		}).Create(&checkIn)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return domain.ErrAlreadyCheckedIn
		}

		if err := s.walletRepo.UpdateBalanceWithTx(ctx, tx, userID, dailyCheckInReward); err != nil {
			return err
		}
		var wallet domain.Wallet
		if err := tx.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return err
		}
		balance = wallet.Balance
		return nil
	})
	if err != nil {
		return 0, err
	}

	return balance, nil
}

func (s *DonationServiceImpl) GetDailyCheckInStatus(ctx context.Context, userID uint) (*domain.DailyCheckInStatus, error) {
	var user domain.User
	if err := s.db.WithContext(ctx).First(&user, userID).Error; err != nil {
		return nil, err
	}
	if user.Role != "user" {
		return nil, domain.ErrDailyCheckInUserOnly
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	today := time.Now().In(loc)
	// Monday-Sunday grid resets naturally every week, keeping the UI to seven days.
	weekStart := today.AddDate(0, 0, -((int(today.Weekday()) + 6) % 7))
	weekEnd := weekStart.AddDate(0, 0, 6)
	checkIns, err := s.walletRepo.FindCheckInsByDateRange(ctx, userID, weekStart.Format("2006-01-02"), weekEnd.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}

	claimed := make(map[string]struct{}, len(checkIns))
	for _, checkIn := range checkIns {
		// PostgreSQL DATE may be scanned by the driver with a time suffix.
		// The calendar is keyed by YYYY-MM-DD, so normalize it before matching.
		date := strings.TrimSpace(checkIn.CheckInDate)
		if len(date) >= len("2006-01-02") {
			date = date[:len("2006-01-02")]
		}
		claimed[date] = struct{}{}
	}
	status := &domain.DailyCheckInStatus{Reward: dailyCheckInReward, Days: make([]domain.DailyCheckInDay, 7)}
	for i := range status.Days {
		date := weekStart.AddDate(0, 0, i).Format("2006-01-02")
		_, status.Days[i].Claimed = claimed[date]
		status.Days[i].Date = date
		if date == today.Format("2006-01-02") {
			status.ClaimedToday = status.Days[i].Claimed
		}
	}
	return status, nil
}
