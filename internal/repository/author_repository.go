package repository

import (
	"time"

	"go-stream/internal/domain"

	"gorm.io/gorm"
)

type authorRepository struct {
	db *gorm.DB
}

func NewAuthorRepository(db *gorm.DB) domain.AuthorRepository {
	return &authorRepository{db: db}
}

func (r *authorRepository) FindAll(status *domain.AuthorStatus, limit, offset int) ([]domain.Author, error) {
	var authors []domain.Author
	query := r.db.Preload("User").Preload("Categories")

	if status != nil && *status != "" {
		query = query.Where("status = ?", *status)
	}

	err := query.Order("applied_at DESC").Limit(limit).Offset(offset).Find(&authors).Error
	return authors, err
}

func (r *authorRepository) FindByID(id uint) (*domain.Author, error) {
	var author domain.Author
	err := r.db.Preload("User").Preload("Categories").First(&author, id).Error
	if err != nil {
		return nil, err
	}
	return &author, nil
}

func (r *authorRepository) FindByUserID(userID uint) (*domain.Author, error) {
	var author domain.Author
	err := r.db.Preload("User").Preload("Categories").Where("user_id = ?", userID).First(&author).Error
	if err != nil {
		return nil, err
	}
	return &author, nil
}

func (r *authorRepository) Create(author *domain.Author) error {
	return r.db.Create(author).Error
}

func (r *authorRepository) Update(author *domain.Author) error {
	return r.db.Save(author).Error
}

func (r *authorRepository) UpdateStatus(id uint, status domain.AuthorStatus, approvedAt *time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.Author{}).Where("id = ?", id).Updates(map[string]any{
			"status":      status,
			"approved_at": approvedAt,
		}).Error; err != nil {
			return err
		}

		if status == domain.AuthorStatusApproved {
			var author domain.Author
			if err := tx.First(&author, id).Error; err != nil {
				return err
			}
			if err := tx.Model(&domain.User{}).Where("id = ?", author.UserID).Update("role", "author").Error; err != nil {
				return err
			}
		} else if status == domain.AuthorStatusRejected || status == domain.AuthorStatusSuspended {
			var author domain.Author
			if err := tx.First(&author, id).Error; err != nil {
				return err
			}
			if err := tx.Model(&domain.User{}).Where("id = ?", author.UserID).Update("role", "user").Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *authorRepository) SyncCategories(authorID uint, categoryIDs []uint) error {
	var author domain.Author
	if err := r.db.First(&author, authorID).Error; err != nil {
		return err
	}

	var categories []domain.Category
	if len(categoryIDs) > 0 {
		if err := r.db.Where("id IN ?", categoryIDs).Find(&categories).Error; err != nil {
			return err
		}
	}

	return r.db.Model(&author).Association("Categories").Replace(categories)
}
