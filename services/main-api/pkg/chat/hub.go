package chat

import (
	"sync"

	"go-stream/services/main-api/internal/domain"
)

// Hub keeps only active SSE subscriptions. Chat history is intentionally not
// retained in memory or persisted; a reconnect receives future messages only.
type roomState struct {
	subscribers map[chan domain.ChatMessage]struct{}
	mu          sync.RWMutex
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[uint]*roomState
}

func NewHub() *Hub { return &Hub{rooms: make(map[uint]*roomState)} }

func (h *Hub) getOrCreate(roomID uint) *roomState {
	h.mu.RLock()
	state := h.rooms[roomID]
	h.mu.RUnlock()
	if state != nil {
		return state
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if state = h.rooms[roomID]; state == nil {
		state = &roomState{subscribers: make(map[chan domain.ChatMessage]struct{})}
		h.rooms[roomID] = state
	}
	return state
}

func (h *Hub) Subscribe(roomID uint) chan domain.ChatMessage {
	state := h.getOrCreate(roomID)
	ch := make(chan domain.ChatMessage, 32)
	state.mu.Lock()
	state.subscribers[ch] = struct{}{}
	state.mu.Unlock()
	return ch
}

func (h *Hub) Unsubscribe(roomID uint, ch chan domain.ChatMessage) {
	h.mu.RLock()
	state := h.rooms[roomID]
	h.mu.RUnlock()
	if state == nil {
		return
	}
	state.mu.Lock()
	if _, ok := state.subscribers[ch]; ok {
		delete(state.subscribers, ch)
		close(ch)
	}
	state.mu.Unlock()
}

func (h *Hub) Publish(roomID uint, msg domain.ChatMessage) {
	state := h.getOrCreate(roomID)
	state.mu.RLock()
	defer state.mu.RUnlock()
	for ch := range state.subscribers {
		select {
		case ch <- msg:
		default:
		}
	}
}

func (h *Hub) CleanupRoom(roomID uint) {
	h.mu.Lock()
	state := h.rooms[roomID]
	delete(h.rooms, roomID)
	h.mu.Unlock()
	if state == nil {
		return
	}
	state.mu.Lock()
	for ch := range state.subscribers {
		close(ch)
	}
	state.subscribers = nil
	state.mu.Unlock()
}
