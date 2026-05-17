package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-stream/internal/domain"
	"go-stream/pkg/response"
)

type TagHandler struct {
	svc domain.TagService
}

func NewTagHandler(svc domain.TagService) *TagHandler {
	return &TagHandler{svc: svc}
}

func (h *TagHandler) GetAllTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.svc.GetAllTags()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch tags")
		return
	}
	response.Success(w, http.StatusOK, tags)
}

func (h *TagHandler) GetTagByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid tag ID")
		return
	}

	tag, err := h.svc.GetTagByID(uint(id))
	if err != nil {
		response.Error(w, http.StatusNotFound, "Tag not found")
		return
	}
	response.Success(w, http.StatusOK, tag)
}

type createTagRequest struct {
	Name string `json:"name"`
}

func (h *TagHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
	var req createTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tag, err := h.svc.CreateTag(req.Name)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, tag)
}

func (h *TagHandler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid tag ID")
		return
	}

	if err := h.svc.DeleteTag(uint(id)); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]string{"message": "Tag deleted"})
}

func (h *TagHandler) GetTagsByRoom(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	tags, err := h.svc.GetTagsByRoom(uint(id))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch tags")
		return
	}
	response.Success(w, http.StatusOK, tags)
}

func (h *TagHandler) GetTagsByShortVideo(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid video ID")
		return
	}

	tags, err := h.svc.GetTagsByShortVideo(uint(id))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch tags")
		return
	}
	response.Success(w, http.StatusOK, tags)
}

type syncTagsRequest struct {
	TagIDs []uint `json:"tag_ids"`
}

func (h *TagHandler) SyncRoomTags(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	var req syncTagsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.SyncRoomTags(uint(id), req.TagIDs); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]string{"message": "Room tags synced"})
}

func (h *TagHandler) SyncShortVideoTags(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid video ID")
		return
	}

	var req syncTagsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.svc.SyncShortVideoTags(uint(id), req.TagIDs); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, http.StatusOK, map[string]string{"message": "Video tags synced"})
}
