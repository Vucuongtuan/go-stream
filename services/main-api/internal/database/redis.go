package database

import (
	"context"
	"fmt"
	"time"

	"go-stream/services/main-api/internal/config"
	"go-stream/services/main-api/pkg/logger"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// ConnectRedis initializes the Redis client using environment variables
func ConnectRedis() *redis.Client {
	host := config.GetEnv("REDIS_HOST", "localhost")
	port := config.GetEnv("REDIS_PORT", "6379")
	password := config.GetEnv("REDIS_PASSWORD", "")

	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       0, // Use default DB
	})

	// Test connection with a timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		logger.Warn("Failed to connect to Redis, caching and viewer count features will be disabled", "error", err)
		return nil
	}

	logger.Info("Redis connected successfully")
	RedisClient = rdb
	return rdb
}
