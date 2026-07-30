package database

import (
	"strconv"
	"time"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/pkg/logger"

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

	// GORM delegates connection management to database/sql. Explicit bounds keep
	// multiple API replicas from exhausting PostgreSQL connections under load.
	sqlDB, err := db.DB()
	logger.FatalIfError(err, "Failed to access database connection pool")
	sqlDB.SetMaxOpenConns(getPositiveIntEnv("DB_MAX_OPEN_CONNS", 25))
	sqlDB.SetMaxIdleConns(getPositiveIntEnv("DB_MAX_IDLE_CONNS", 10))
	sqlDB.SetConnMaxLifetime(getPositiveDurationEnv("DB_CONN_MAX_LIFETIME", 5*time.Minute))
	sqlDB.SetConnMaxIdleTime(getPositiveDurationEnv("DB_CONN_MAX_IDLE_TIME", time.Minute))

	logger.Info("Database connected successfully",
		"max_open_conns", getPositiveIntEnv("DB_MAX_OPEN_CONNS", 25),
		"max_idle_conns", getPositiveIntEnv("DB_MAX_IDLE_CONNS", 10),
	)

	err = db.AutoMigrate(
		&domain.User{},
		&domain.Identity{},
		&domain.Author{},
		&domain.AuthorFollow{},
		&domain.SocialLink{},
		&domain.Category{},
		&domain.Game{},
		&domain.Room{},
		&domain.StreamSession{},
		&domain.ShortVideo{},
		&domain.Tag{},
		&domain.RoomTag{},
		&domain.ShortVideoTag{},
		&domain.Wallet{},
		&domain.DailyCheckIn{},
		&domain.Donation{},
		&domain.Prediction{},
		&domain.PredictionOption{},
		&domain.PredictionBet{},
		&domain.RoomModerator{},
		&domain.ModerationLog{},
		&domain.Poll{},
		&domain.PollOption{},
		&domain.PollVote{},
		&domain.Gift{},
		&domain.OutboxEvent{},
	)
	logger.FatalIfError(err, "Failed to run database migration")

	// Self-healing: Update all approved authors' users to have role = "author"
	var approvedAuthors []domain.Author
	if err := db.Where("status = ?", domain.AuthorStatusApproved).Find(&approvedAuthors).Error; err == nil {
		for _, auth := range approvedAuthors {
			db.Model(&domain.User{}).Where("id = ?", auth.UserID).Update("role", "author")
			wallet := domain.Wallet{UserID: auth.UserID, IsActive: true}
			if err := db.Where("user_id = ?", auth.UserID).
				Assign(domain.Wallet{IsActive: true}).
				FirstOrCreate(&wallet).Error; err != nil {
				logger.Info("Failed to activate wallet for approved author", "user_id", auth.UserID, "error", err)
			}
		}
		logger.Info("Self-healing: Synced user roles and wallets for approved authors")
	}

	seedAdmin(db)
	seedCategories(db)
	seedGifts(db)

	return db
}

func getPositiveIntEnv(key string, fallback int) int {
	value, err := strconv.Atoi(config.GetEnv(key, ""))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func getPositiveDurationEnv(key string, fallback time.Duration) time.Duration {
	value, err := time.ParseDuration(config.GetEnv(key, ""))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
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
		{Name: "League of Legends", Slug: "league-of-legends", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-lol.png", Description: "Trận chiến đấu trường trực tuyến nhiều người chơi phổ biến nhất.", SortOrder: 1},
		{Name: "Just Chatting", Slug: "just-chatting", Type: domain.CategoryTypeTalk, Icon: "/storage/media/cate-talk.png", Description: "Trò chuyện, chia sẻ và tương tác trực tiếp với khán giả của bạn.", SortOrder: 2},
		{Name: "Grand Theft Auto V", Slug: "gta-v", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-gta.jpg", Description: "Hòa mình vào thế giới mở Los Santos đầy kịch tính.", SortOrder: 3},
		{Name: "Counter-Strike 2", Slug: "cs-2", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-cs2.jpg", Description: "Game bắn súng chiến thuật góc nhìn thứ nhất hàng đầu thế giới.", SortOrder: 4},
		{Name: "Minecraft", Slug: "minecraft", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-minecraft.jpg", Description: "Khám phá, sáng tạo và sinh tồn trong thế giới khối vuông bất tận.", SortOrder: 5},
		{Name: "EA Sports FC", Slug: "ea-sports-fc", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-fc.png", Description: "Những trận cầu đỉnh cao cùng EA Sports FC.", SortOrder: 6},
		{Name: "FIFA Online 4", Slug: "fifa-online-4", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-fo4.jpg", Description: "Thi đấu và xây dựng đội bóng trong FIFA Online 4.", SortOrder: 7},
		{Name: "PUBG: BATTLEGROUNDS", Slug: "pubg-battlegrounds", Type: domain.CategoryTypeGame, Icon: "/storage/media/cate-pubg.jpg", Description: "Sinh tồn đến cuối cùng trên chiến trường PUBG.", SortOrder: 8},
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
		} else if err := db.Model(&existing).Updates(map[string]interface{}{
			"icon":       cat.Icon,
			"sort_order": cat.SortOrder,
		}).Error; err != nil {
			logger.Info("Failed to update seeded category", "name", cat.Name, "error", err)
		}
	}
}

func seedGifts(db *gorm.DB) {
	defaultGifts := []domain.Gift{
		{ID: 1, Name: "Base", CoinPrice: 20, ImageURL: "http://localhost:3000/storage/gift/base.png"},
		{ID: 2, Name: "Chest", CoinPrice: 50, ImageURL: "http://localhost:3000/storage/gift/chest.png"},
		{ID: 3, Name: "Rocket", CoinPrice: 100, ImageURL: "http://localhost:3000/storage/gift/rocket.png"},
		{ID: 4, Name: "Castle", CoinPrice: 200, ImageURL: "http://localhost:3000/storage/gift/castle.png"},
		{ID: 5, Name: "Crown", CoinPrice: 500, ImageURL: "http://localhost:3000/storage/gift/crown.png"},
	}

	for _, gift := range defaultGifts {
		var existing domain.Gift
		if err := db.First(&existing, gift.ID).Error; err != nil {
			if err := db.Create(&gift).Error; err != nil {
				logger.Info("Failed to seed gift", "name", gift.Name, "error", err)
			} else {
				logger.Info("Gift successfully seeded", "name", gift.Name)
			}
		}
	}
}
