package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"go-stream/services/main-api/internal/config"
)

// basePath returns the root storage directory from config
func basePath() string {
	return config.GetEnv("STORAGE_PATH", "./storage")
}

// Save writes an uploaded file to the given sub-path under storage root.
// subPath example: "thumbnails/abc.jpg" or "videos/clip.mp4"
// Returns the public URL path to access the file.
func Save(file multipart.File, subPath string) (string, error) {
	dest := filepath.Join(basePath(), subPath)

	if err := os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	out, err := os.Create(dest)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return publicURL(subPath), nil
}

// HLSLivePath returns the filesystem path where the ingest server should write
// HLS segments for a live stream.
// nginx-rtmp / SRS should be configured to write to this path.
func HLSLivePath(streamKey string) string {
	return filepath.Join(basePath(), "live", streamKey)
}

// HLSLiveURL returns the public HTTP URL for the live HLS manifest.
func HLSLiveURL(streamKey string) string {
	return publicURL(fmt.Sprintf("live/%s/index.m3u8", streamKey))
}

// HLSVodURL returns the public HTTP URL for the VOD HLS manifest.
func HLSVodURL(streamKey string) string {
	return publicURL(fmt.Sprintf("vod/%s/index.m3u8", streamKey))
}

// VideoURL returns the public URL for a short video file.
func VideoURL(filename string) string {
	return publicURL(fmt.Sprintf("videos/%s", filename))
}

// ThumbnailURL returns the public URL for a thumbnail.
func ThumbnailURL(filename string) string {
	return publicURL(fmt.Sprintf("thumbnails/%s", filename))
}

func publicURL(subPath string) string {
	base := config.GetEnv("STORAGE_BASE_URL", "http://localhost:3000/storage")
	return fmt.Sprintf("%s/%s", strings.TrimRight(base, "/"), subPath)
}
