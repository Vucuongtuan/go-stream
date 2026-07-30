package repository

import (
	"go-stream/services/main-api/internal/domain"

	"gorm.io/gorm"
)

type authorFollowRepository struct{ db *gorm.DB }

func NewAuthorFollowRepository(db *gorm.DB) domain.AuthorFollowRepository {
	return &authorFollowRepository{db: db}
}

func (r *authorFollowRepository) Follow(followerID, authorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		follow := domain.AuthorFollow{FollowerID: followerID, AuthorID: authorID}
		result := tx.Where("follower_id = ? AND author_id = ?", followerID, authorID).FirstOrCreate(&follow)
		if result.Error != nil || result.RowsAffected == 0 {
			return result.Error
		}
		return tx.Model(&domain.Author{}).Where("id = ?", authorID).UpdateColumn("follower_count", gorm.Expr("follower_count + 1")).Error
	})
}

func (r *authorFollowRepository) Unfollow(followerID, authorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Where("follower_id = ? AND author_id = ?", followerID, authorID).Delete(&domain.AuthorFollow{})
		if result.Error != nil || result.RowsAffected == 0 {
			return result.Error
		}
		return tx.Model(&domain.Author{}).Where("id = ?", authorID).UpdateColumn("follower_count", gorm.Expr("GREATEST(follower_count - 1, 0)")).Error
	})
}

func (r *authorFollowRepository) IsFollowing(followerID, authorID uint) (bool, error) {
	var count int64
	err := r.db.Model(&domain.AuthorFollow{}).Where("follower_id = ? AND author_id = ?", followerID, authorID).Count(&count).Error
	return count > 0, err
}
