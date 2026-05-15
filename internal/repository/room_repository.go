package repository

import (
	"go-stream/internal/domain"

	"gorm.io/gorm"
)

type roomRepository struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) domain.RoomRepository {
	return &roomRepository{db: db}
}

func (r *roomRepository) FindAll(filter domain.RoomFilter) ([]domain.Room, error) {
	var rooms []domain.Room
	q := r.db.Preload("Host")

	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.Visibility != nil {
		q = q.Where("visibility = ?", *filter.Visibility)
	}
	if filter.HostID != nil {
		q = q.Where("host_id = ?", *filter.HostID)
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		q = q.Offset(filter.Offset)
	}

	return rooms, q.Find(&rooms).Error
}

func (r *roomRepository) FindByID(id uint) (*domain.Room, error) {
	var room domain.Room
	err := r.db.Preload("Host").First(&room, id).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) FindByStreamKey(key string) (*domain.Room, error) {
	var room domain.Room
	err := r.db.Where("stream_key = ?", key).First(&room).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) FindByHostID(hostID uint) ([]domain.Room, error) {
	var rooms []domain.Room
	err := r.db.Where("host_id = ?", hostID).Find(&rooms).Error
	return rooms, err
}

func (r *roomRepository) Create(room *domain.Room) error {
	return r.db.Create(room).Error
}

func (r *roomRepository) Update(room *domain.Room) error {
	return r.db.Save(room).Error
}

func (r *roomRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Room{}, id).Error
}
