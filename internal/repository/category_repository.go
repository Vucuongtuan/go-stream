package repository

import (
	"go-stream/internal/domain"

	"gorm.io/gorm"
)

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) domain.CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) FindAll() ([]domain.Category, error) {
	var categories []domain.Category
	err := r.db.Order("sort_order ASC, name ASC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) FindByID(id uint) (*domain.Category, error) {
	var category domain.Category
	err := r.db.Preload("Games").First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepository) FindBySlug(slug string) (*domain.Category, error) {
	var category domain.Category
	err := r.db.Preload("Games").Where("slug = ?", slug).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepository) FindByIDs(ids []uint) ([]domain.Category, error) {
	var categories []domain.Category
	err := r.db.Where("id IN ?", ids).Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) FindGamesByCategoryID(categoryID uint) ([]domain.Game, error) {
	var games []domain.Game
	err := r.db.Where("category_id = ?", categoryID).Order("name ASC").Find(&games).Error
	return games, err
}

func (r *categoryRepository) FindGameByID(id uint) (*domain.Game, error) {
	var game domain.Game
	err := r.db.Preload("Category").First(&game, id).Error
	if err != nil {
		return nil, err
	}
	return &game, nil
}

func (r *categoryRepository) Create(category *domain.Category) error {
	return r.db.Create(category).Error
}

func (r *categoryRepository) Update(category *domain.Category) error {
	return r.db.Save(category).Error
}

func (r *categoryRepository) CreateGame(game *domain.Game) error {
	return r.db.Create(game).Error
}
