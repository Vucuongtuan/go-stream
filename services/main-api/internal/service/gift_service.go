package service

import (
	"context"

	"go-stream/services/main-api/internal/domain"
)

type GiftServiceImpl struct {
	giftRepo domain.GiftRepository
}

func NewGiftService(giftRepo domain.GiftRepository) domain.GiftService {
	return &GiftServiceImpl{giftRepo: giftRepo}
}

func (s *GiftServiceImpl) GetAllGifts(ctx context.Context) ([]domain.Gift, error) {
	return s.giftRepo.FindAll(ctx)
}

func (s *GiftServiceImpl) GetGiftByID(ctx context.Context, id uint) (*domain.Gift, error) {
	return s.giftRepo.FindByID(ctx, id)
}

func (s *GiftServiceImpl) CreateGift(ctx context.Context, name string, coinPrice int64, imageURL string) (*domain.Gift, error) {
	gift := &domain.Gift{
		Name:      name,
		CoinPrice: coinPrice,
		ImageURL:  imageURL,
	}
	if err := s.giftRepo.Create(ctx, gift); err != nil {
		return nil, err
	}
	return gift, nil
}

func (s *GiftServiceImpl) UpdateGift(ctx context.Context, id uint, name string, coinPrice int64, imageURL string) (*domain.Gift, error) {
	gift, err := s.giftRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	gift.Name = name
	gift.CoinPrice = coinPrice
	if imageURL != "" {
		gift.ImageURL = imageURL
	}
	if err := s.giftRepo.Update(ctx, gift); err != nil {
		return nil, err
	}
	return gift, nil
}

func (s *GiftServiceImpl) DeleteGift(ctx context.Context, id uint) error {
	return s.giftRepo.Delete(ctx, id)
}
