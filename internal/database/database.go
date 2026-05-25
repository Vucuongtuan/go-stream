package database

import (
	"go-stream/internal/config"
	"go-stream/internal/domain"
	"go-stream/pkg/logger"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func ConnectDB() *gorm.DB {
	dsn := config.GetEnv("DATABASE_URL", "host=localhost user=gostream password=gostream dbname=gostream port=5432 sslmode=disable TimeZone=Asia/Ho_Chi_Minh")

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Info),
	})

	logger.FatalIfError(err, "Failed to connect to database")

	logger.Info("Database connected successfully")

	err = db.AutoMigrate(
		&domain.User{},
		&domain.Identity{},
		&domain.Author{},
		&domain.SocialLink{},
		&domain.Category{},
		&domain.Game{},
		&domain.Room{},
		&domain.StreamSession{},
		&domain.ShortVideo{},
		&domain.Tag{},
		&domain.RoomTag{},
		&domain.ShortVideoTag{},
	)
	logger.FatalIfError(err, "Failed to run database migration")

	// Self-healing: Update all approved authors' users to have role = "author"
	var approvedAuthors []domain.Author
	if err := db.Where("status = ?", domain.AuthorStatusApproved).Find(&approvedAuthors).Error; err == nil {
		for _, auth := range approvedAuthors {
			db.Model(&domain.User{}).Where("id = ?", auth.UserID).Update("role", "author")
		}
		logger.Info("Self-healing: Synced user roles for approved authors")
	}

	seedAdmin(db)
	seedCategories(db)

	return db
}

func seedAdmin(db *gorm.DB) {
	var adminIdentity domain.Identity
	err := db.Where("provider = ? AND email = ?", domain.ProviderLocal, "admin@gostream.com").First(&adminIdentity).Error
	if err == nil {
		logger.Info("Admin account already exists")
		// Update existing admin user with email and slug if not already set
		var adminUser domain.User
		if db.First(&adminUser, adminIdentity.UserID).Error == nil {
			updated := false
			if adminUser.Email == "" {
				adminUser.Email = "admin@gostream.com"
				updated = true
			}
			if adminUser.Slug == "" {
				adminUser.Slug = "admin"
				updated = true
			}
			if updated {
				db.Save(&adminUser)
				logger.Info("Updated existing admin user with email and slug", "email", "admin@gostream.com", "slug", "admin")
			}
		}
		return
	}

	// Create admin user
	adminUser := &domain.User{
		Name:  "Admin Manager",
		Role:  "admin",
		Email: "admin@gostream.com",
		Slug:  "admin",
	}
	if err := db.Create(adminUser).Error; err != nil {
		logger.Info("Failed to seed admin user", "error", err)
		return
	}

	// Hash password 'admin123'
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		logger.Info("Failed to hash admin password", "error", err)
		return
	}

	adminIdentity = domain.Identity{
		UserID:       adminUser.ID,
		Provider:     domain.ProviderLocal,
		Email:        "admin@gostream.com",
		PasswordHash: string(hash),
		IsVerified:   true,
	}
	if err := db.Create(&adminIdentity).Error; err != nil {
		logger.Info("Failed to seed admin identity", "error", err)
		return
	}

	logger.Info("Admin account successfully seeded", "email", "admin@gostream.com", "password", "admin123")
}

func seedCategories(db *gorm.DB) {
	defaultCategories := []domain.Category{
		{Name: "League of Legends", Slug: "league-of-legends", Type: domain.CategoryTypeGame, Description: "Trận chiến đấu trường trực tuyến nhiều người chơi phổ biến nhất."},
		{Name: "Just Chatting", Slug: "just-chatting", Type: domain.CategoryTypeTalk, Description: "Trò chuyện, chia sẻ và tương tác trực tiếp với khán giả của bạn."},
		{Name: "Grand Theft Auto V", Slug: "gta-v", Type: domain.CategoryTypeGame, Description: "Hòa mình vào thế giới mở Los Santos đầy kịch tính."},
		{Name: "Counter-Strike 2", Slug: "cs-2", Type: domain.CategoryTypeGame, Description: "Game bắn súng chiến thuật góc nhìn thứ nhất hàng đầu thế giới."},
	}

	for _, cat := range defaultCategories {
		var existing domain.Category
		if err := db.Where("slug = ?", cat.Slug).First(&existing).Error; err != nil {
			// Category not found, let's create it
			if err := db.Create(&cat).Error; err != nil {
				logger.Info("Failed to seed category", "name", cat.Name, "error", err)
			} else {
				logger.Info("Category successfully seeded", "name", cat.Name)
			}
		}
	}
}
