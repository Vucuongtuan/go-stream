package service

import (
	"errors"
	"strings"

	"go-stream/services/main-api/internal/domain"
)

type categoryService struct {
	repo domain.CategoryRepository
}

func NewCategoryService(repo domain.CategoryRepository) domain.CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) GetAllCategories() ([]domain.Category, error) {
	return s.repo.FindAll()
}

func (s *categoryService) GetCategoryByID(id uint) (*domain.Category, error) {
	return s.repo.FindByID(id)
}

func (s *categoryService) GetCategoryBySlug(slug string) (*domain.Category, error) {
	return s.repo.FindBySlug(slug)
}

func (s *categoryService) GetGamesByCategory(categoryID uint) ([]domain.Game, error) {
	return s.repo.FindGamesByCategoryID(categoryID)
}

func (s *categoryService) CreateCategory(name, slug, icon, description string, categoryType domain.CategoryType) (*domain.Category, error) {
	name = strings.TrimSpace(name)
	slug = strings.TrimSpace(slug)
	if name == "" || slug == "" {
		return nil, errors.New("name and slug are required")
	}

	category := &domain.Category{
		Name:        name,
		Slug:        slug,
		Type:        categoryType,
		Icon:        icon,
		Description: description,
	}
	if err := s.repo.Create(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *categoryService) UpdateCategory(id uint, name, slug, icon, description string, categoryType domain.CategoryType) (*domain.Category, error) {
	category, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("category not found")
	}

	if name != "" {
		category.Name = strings.TrimSpace(name)
	}
	if slug != "" {
		category.Slug = strings.TrimSpace(slug)
	}
	if icon != "" {
		category.Icon = icon
	}
	if description != "" {
		category.Description = description
	}
	if categoryType != "" {
		category.Type = categoryType
	}

	if err := s.repo.Update(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *categoryService) CreateGame(categoryID uint, name, slug, coverImage, description string) (*domain.Game, error) {
	name = strings.TrimSpace(name)
	slug = strings.TrimSpace(slug)
	if name == "" || slug == "" {
		return nil, errors.New("name and slug are required")
	}

	_, err := s.repo.FindByID(categoryID)
	if err != nil {
		return nil, errors.New("category not found")
	}

	game := &domain.Game{
		CategoryID:  categoryID,
		Name:        name,
		Slug:        slug,
		CoverImage:  coverImage,
		Description: description,
	}
	if err := s.repo.CreateGame(game); err != nil {
		return nil, err
	}
	return game, nil
}
