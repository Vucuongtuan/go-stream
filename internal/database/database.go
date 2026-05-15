package database

import (
	"go-stream/internal/config"
	"go-stream/internal/domain"
	"go-stream/pkg/logger"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func ConnectDB() *gorm.DB {
	dbFile := config.GetEnv("DB_FILE", "gostream.db")

	db, err := gorm.Open(sqlite.Open(dbFile), &gorm.Config{
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
	)
	logger.FatalIfError(err, "Failed to run database migration")

	return db
}

