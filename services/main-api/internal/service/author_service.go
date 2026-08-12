package service

import (
	"errors"
	"time"

	"go-stream/services/main-api/internal/domain"
)

type authorService struct {
	authorRepo    domain.AuthorRepository
	users         domain.UserRepository
	notifications domain.NotificationService
}

func NewAuthorService(authorRepo domain.AuthorRepository, users domain.UserRepository, notifications domain.NotificationService) domain.AuthorService {
	return &authorService{authorRepo: authorRepo, users: users, notifications: notifications}
}

func (s *authorService) Apply(userID uint, displayName, bio string, categoryIDs []uint) (*domain.Author, error) {
	// Check if already applied
	existing, err := s.authorRepo.FindByUserID(userID)
	if err == nil && existing != nil {
		if existing.Status == domain.AuthorStatusApproved {
			return nil, errors.New("bạn đã là Streamer trên hệ thống")
		}
		if existing.Status == domain.AuthorStatusPending {
			return nil, errors.New("yêu cầu đăng ký làm Streamer của bạn đang được phê duyệt")
		}
		// If rejected, let them re-apply by updating existing or creating new
		existing.DisplayName = displayName
		existing.Bio = bio
		existing.Status = domain.AuthorStatusPending
		existing.AppliedAt = time.Now()
		existing.ApprovedAt = nil
		if err := s.authorRepo.Update(existing); err != nil {
			return nil, err
		}
		if err := s.authorRepo.SyncCategories(existing.ID, categoryIDs); err != nil {
			return nil, err
		}
		s.notifyAdminsOfApplication(existing)
		return existing, nil
	}

	author := &domain.Author{
		UserID:      userID,
		DisplayName: displayName,
		Bio:         bio,
		Status:      domain.AuthorStatusPending,
		AppliedAt:   time.Now(),
	}

	if err := s.authorRepo.Create(author); err != nil {
		return nil, err
	}

	if len(categoryIDs) > 0 {
		if err := s.authorRepo.SyncCategories(author.ID, categoryIDs); err != nil {
			return nil, err
		}
	}

	s.notifyAdminsOfApplication(author)
	return author, nil
}

func (s *authorService) GetAuthorByID(id uint) (*domain.Author, error) {
	return s.authorRepo.FindByID(id)
}

func (s *authorService) GetAuthorByUserID(userID uint) (*domain.Author, error) {
	return s.authorRepo.FindByUserID(userID)
}

func (s *authorService) GetAuthorByUserSlug(slug string) (*domain.Author, error) {
	return s.authorRepo.FindByUserSlug(slug)
}

func (s *authorService) GetApprovedAuthors(limit, offset int) ([]domain.Author, error) {
	status := domain.AuthorStatusApproved
	return s.authorRepo.FindAll(&status, limit, offset)
}

func (s *authorService) UpdateProfile(
	authorID, userID uint,
	displayName, bio, avatar, coverImage string,
	socialLinks []domain.SocialLink,
	categoryIDs []uint,
) (*domain.Author, error) {
	author, err := s.authorRepo.FindByID(authorID)
	if err != nil {
		return nil, err
	}

	if author.UserID != userID {
		return nil, errors.New("unauthorized profile update")
	}

	author.DisplayName = displayName
	author.Bio = bio
	if avatar != "" {
		author.Avatar = avatar
	}
	if coverImage != "" {
		author.CoverImage = coverImage
	}

	if err := s.authorRepo.Update(author); err != nil {
		return nil, err
	}

	if err := s.authorRepo.SyncCategories(author.ID, categoryIDs); err != nil {
		return nil, err
	}

	return author, nil
}

func (s *authorService) ApproveAuthor(authorID uint) error {
	now := time.Now()
	if err := s.authorRepo.UpdateStatus(authorID, domain.AuthorStatusApproved, &now); err != nil {
		return err
	}
	if s.notifications != nil {
		if author, err := s.authorRepo.FindByID(authorID); err == nil {
			_ = s.notifications.Create(author.UserID, "author.application_approved", "Bạn đã được phê duyệt làm Streamer", "Yêu cầu quyền live cho kênh "+author.DisplayName+" đã được quản trị viên chấp nhận.", "/streamer", map[string]any{"author_id": author.ID, "status": "approved"})
		}
	}
	return nil
}

func (s *authorService) RejectAuthor(authorID uint) error {
	return s.authorRepo.UpdateStatus(authorID, domain.AuthorStatusRejected, nil)
}

func (s *authorService) SuspendAuthor(authorID uint) error {
	return s.authorRepo.UpdateStatus(authorID, domain.AuthorStatusSuspended, nil)
}

func (s *authorService) notifyAdminsOfApplication(author *domain.Author) {
	if s.notifications == nil || s.users == nil {
		return
	}
	admins, err := s.users.FindByRole("admin")
	if err != nil {
		return
	}
	for _, admin := range admins {
		_ = s.notifications.Create(admin.ID, "author.application_submitted", "Có yêu cầu quyền live mới", author.DisplayName+" vừa gửi yêu cầu làm Streamer và cần được phê duyệt.", "/admin", map[string]any{"author_id": author.ID, "applicant_user_id": author.UserID, "status": "pending"})
	}
}
