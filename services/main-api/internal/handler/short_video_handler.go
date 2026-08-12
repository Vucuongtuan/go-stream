package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"go-stream/services/main-api/internal/domain"
	"go-stream/services/main-api/internal/middleware"
	"go-stream/services/main-api/pkg/response"
	"go-stream/services/main-api/pkg/storage"

	"github.com/google/uuid"
)

const maxShortVideoUploadBytes = 100 << 20

type ShortVideoHandler struct {
	svc       domain.ShortVideoService
	authorSvc domain.AuthorService
	roomRepo  domain.RoomRepository
}

func NewShortVideoHandler(svc domain.ShortVideoService, authorSvc domain.AuthorService, roomRepo domain.RoomRepository) *ShortVideoHandler {
	return &ShortVideoHandler{svc: svc, authorSvc: authorSvc, roomRepo: roomRepo}
}

func (h *ShortVideoHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	videos, err := h.svc.GetFeed(videoPagination(r))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch video feed")
		return
	}
	response.Success(w, http.StatusOK, videos)
}

func (h *ShortVideoHandler) GetByAuthorSlug(w http.ResponseWriter, r *http.Request) {
	author, err := h.authorSvc.GetAuthorByUserSlug(r.PathValue("slug"))
	if err != nil || author.Status != domain.AuthorStatusApproved {
		response.Error(w, http.StatusNotFound, "Author not found")
		return
	}
	limit, offset := videoPagination(r)
	videos, err := h.svc.GetVideosByAuthor(author.ID, limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch author videos")
		return
	}
	response.Success(w, http.StatusOK, videos)
}

func (h *ShortVideoHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := videoID(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid video ID")
		return
	}
	video, err := h.svc.GetVideoByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Video not found")
		return
	}
	response.Success(w, http.StatusOK, video)
}

func (h *ShortVideoHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxShortVideoUploadBytes)
	if err := r.ParseMultipartForm(maxShortVideoUploadBytes); err != nil {
		response.Error(w, http.StatusBadRequest, "Video must be smaller than 100 MB")
		return
	}
	authorSlug := strings.TrimSpace(r.FormValue("author_slug"))
	if authorSlug == "" {
		response.Error(w, http.StatusBadRequest, "author_slug is required")
		return
	}
	author, err := h.authorSvc.GetAuthorByUserSlug(authorSlug)
	if err != nil || author.Status != domain.AuthorStatusApproved {
		response.Error(w, http.StatusNotFound, "Author not found")
		return
	}
	videoFile, header, err := r.FormFile("video")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Video file is required")
		return
	}
	defer videoFile.Close()
	if !isVideoExtension(header.Filename) {
		response.Error(w, http.StatusBadRequest, "Supported video formats: mp4, webm, mov")
		return
	}
	name := uuid.NewString() + strings.ToLower(filepath.Ext(header.Filename))
	videoURL, err := storage.Save(videoFile, filepath.Join("videos", name))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to save video")
		return
	}
	thumbnail, err := saveShortThumbnail(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	duration, _ := strconv.Atoi(r.FormValue("duration_seconds"))
	video, err := h.svc.UploadVideo(author.ID, userID, nil, r.FormValue("title"), r.FormValue("description"), videoURL, thumbnail, duration, domain.VideoSourceFan, parseTagIDs(r.FormValue("tag_ids")))
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, video)
}

// CreateLiveClip renders the latest HLS window into an MP4 short video. HLS
// segments start on keyframes, so a concat copy avoids a full re-encode.
func (h *ShortVideoHandler) CreateLiveClip(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	roomID, err := strconv.ParseUint(r.PathValue("id"), 10, 32)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	var req struct {
		Title           string `json:"title"`
		Description     string `json:"description"`
		DurationSeconds int    `json:"duration_seconds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.DurationSeconds < 10 || req.DurationSeconds > 60 {
		response.Error(w, http.StatusBadRequest, "Clip duration must be between 10 and 60 seconds")
		return
	}
	room, err := h.roomRepo.FindByID(uint(roomID))
	if err != nil || room.Status != domain.RoomStatusLive {
		response.Error(w, http.StatusConflict, "Room is not live")
		return
	}
	author, err := h.authorSvc.GetAuthorByUserID(room.HostID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Author not found")
		return
	}
	filename := fmt.Sprintf("clip-%s.mp4", uuid.NewString())
	outputPath := storage.VideoPath(filename)
	if err := renderLatestHLSSegments(r.Context(), room.StreamKey, req.DurationSeconds, outputPath); err != nil {
		response.Error(w, http.StatusInternalServerError, "Unable to render live clip: "+err.Error())
		return
	}
	video, err := h.svc.CreateLiveClip(author.ID, userID, req.Title, req.Description, storage.VideoURL(filename), req.DurationSeconds)
	if err != nil {
		_ = os.Remove(outputPath)
		response.Error(w, http.StatusForbidden, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, video)
}

func renderLatestHLSSegments(requestCtx context.Context, streamKey string, duration int, outputPath string) error {
	playlistPath := filepath.Join(storage.HLSLivePath(streamKey)+"_720", "index.m3u8")
	playlist, err := os.ReadFile(playlistPath)
	if err != nil {
		return fmt.Errorf("live playlist is not ready")
	}
	var segments []string
	for _, line := range strings.Split(string(playlist), "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			segments = append(segments, filepath.Join(filepath.Dir(playlistPath), line))
		}
	}
	required := (duration + 2) / 3
	if len(segments) < required {
		return fmt.Errorf("not enough live segments yet")
	}
	segments = segments[len(segments)-required:]
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return err
	}
	concat, err := os.CreateTemp(filepath.Dir(outputPath), "clip-*.txt")
	if err != nil {
		return err
	}
	concatPath := concat.Name()
	defer os.Remove(concatPath)
	for _, segment := range segments {
		if _, err := fmt.Fprintf(concat, "file '%s'\n", strings.ReplaceAll(segment, "'", "\\'")); err != nil {
			concat.Close()
			return err
		}
	}
	if err := concat.Close(); err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(requestCtx, 45*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", "-movflags", "+faststart", outputPath)
	if output, err := command.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return fmt.Errorf("ffmpeg failed: %s", strings.TrimSpace(string(output)))
	}
	return nil
}

func (h *ShortVideoHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	id, err := videoID(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid video ID")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid form data")
		return
	}
	thumbnail, err := saveShortThumbnail(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	status := domain.VideoStatus(r.FormValue("status"))
	if status == "" {
		status = domain.VideoStatusPublished
	}
	video, err := h.svc.UpdateVideo(id, userID, r.FormValue("title"), r.FormValue("description"), thumbnail, status, parseTagIDs(r.FormValue("tag_ids")))
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, video)
}

func (h *ShortVideoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextKeyUserID).(uint)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	id, err := videoID(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid video ID")
		return
	}
	if err := h.svc.DeleteVideo(id, userID); err != nil {
		response.Error(w, http.StatusForbidden, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]string{"message": "Video deleted"})
}

func (h *ShortVideoHandler) RecordView(w http.ResponseWriter, r *http.Request) {
	id, err := videoID(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid video ID")
		return
	}
	if err := h.svc.RecordView(id); err != nil {
		response.Error(w, http.StatusNotFound, "Video not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func videoPagination(r *http.Request) (int, int) {
	limit, offset := 20, 0
	if value, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && value > 0 {
		limit = value
	}
	if limit > 100 {
		limit = 100
	}
	if value, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && value > 0 {
		offset = value
	}
	return limit, offset
}

func videoID(r *http.Request) (uint, error) {
	value, err := strconv.ParseUint(r.PathValue("id"), 10, 32)
	return uint(value), err
}
func isVideoExtension(name string) bool {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".mp4", ".webm", ".mov":
		return true
	}
	return false
}
func parseTagIDs(value string) []uint {
	var ids []uint
	for _, part := range strings.Split(value, ",") {
		if id, err := strconv.ParseUint(strings.TrimSpace(part), 10, 32); err == nil && id > 0 {
			ids = append(ids, uint(id))
		}
	}
	return ids
}

func saveShortThumbnail(r *http.Request) (string, error) {
	file, header, err := r.FormFile("thumbnail")
	if err == http.ErrMissingFile {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	defer file.Close()
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if _, _, err := mime.ParseMediaType(header.Header.Get("Content-Type")); err != nil || !isImageExtension(ext) {
		return "", fmt.Errorf("unsupported thumbnail format")
	}
	return storage.Save(file, filepath.Join("thumbnails", fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.NewString(), ext)))
}
func isImageExtension(ext string) bool {
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp":
		return true
	}
	return false
}
