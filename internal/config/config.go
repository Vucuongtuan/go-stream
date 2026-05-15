package config

import (
	"os"

	"github.com/joho/godotenv"
	"go-stream/pkg/logger"
)

// LoadConfig reads the .env file and loads it into the environment variables
func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		logger.Warn(".env file not found, falling back to system environment variables")
	}
}

// GetEnv retrieves the environment variable by key or returns a fallback value
func GetEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
