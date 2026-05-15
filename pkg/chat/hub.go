package chat

import (
	"sync"

	"go-stream/internal/domain"
)

const maxMessagesPerRoom = 300

// ringBuffer là circular buffer lưu tối đa N message per room
type ringBuffer struct {
	mu       sync.RWMutex
	messages []domain.ChatMessage
	head     int
	count    int
	capacity int
}

func newRingBuffer(capacity int) *ringBuffer {
	return &ringBuffer{
		messages: make([]domain.ChatMessage, capacity),
		capacity: capacity,
	}
}

func (rb *ringBuffer) push(msg domain.ChatMessage) {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	rb.messages[rb.head] = msg
	rb.head = (rb.head + 1) % rb.capacity
	if rb.count < rb.capacity {
		rb.count++
	}
}

// snapshot trả về các message theo thứ tự từ cũ → mới
func (rb *ringBuffer) snapshot() []domain.ChatMessage {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	if rb.count == 0 {
		return nil
	}
	out := make([]domain.ChatMessage, rb.count)
	start := (rb.head - rb.count + rb.capacity) % rb.capacity
	for i := 0; i < rb.count; i++ {
		out[i] = rb.messages[(start+i)%rb.capacity]
	}
	return out
}

// roomState giữ buffer và danh sách SSE subscriber của 1 room
type roomState struct {
	buffer      *ringBuffer
	subscribers map[chan domain.ChatMessage]struct{}
	mu          sync.RWMutex
}

func newRoomState() *roomState {
	return &roomState{
		buffer:      newRingBuffer(maxMessagesPerRoom),
		subscribers: make(map[chan domain.ChatMessage]struct{}),
	}
}

// Hub quản lý toàn bộ chat rooms trong memory
type Hub struct {
	mu    sync.RWMutex
	rooms map[uint]*roomState
}

func NewHub() *Hub {
	return &Hub{
		rooms: make(map[uint]*roomState),
	}
}

func (h *Hub) getOrCreate(roomID uint) *roomState {
	h.mu.RLock()
	state, ok := h.rooms[roomID]
	h.mu.RUnlock()
	if ok {
		return state
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	// double-check sau khi lấy write lock
	if state, ok = h.rooms[roomID]; ok {
		return state
	}
	state = newRoomState()
	h.rooms[roomID] = state
	return state
}

// Subscribe đăng ký nhận tin SSE, trả về channel và lịch sử chat hiện tại
func (h *Hub) Subscribe(roomID uint) (chan domain.ChatMessage, []domain.ChatMessage) {
	state := h.getOrCreate(roomID)
	ch := make(chan domain.ChatMessage, 32)

	state.mu.Lock()
	state.subscribers[ch] = struct{}{}
	history := state.buffer.snapshot()
	state.mu.Unlock()

	return ch, history
}

// Unsubscribe hủy đăng ký khi client disconnect
func (h *Hub) Unsubscribe(roomID uint, ch chan domain.ChatMessage) {
	h.mu.RLock()
	state, ok := h.rooms[roomID]
	h.mu.RUnlock()
	if !ok {
		return
	}

	state.mu.Lock()
	delete(state.subscribers, ch)
	close(ch)
	state.mu.Unlock()
}

// Publish lưu message vào ring buffer và broadcast đến tất cả subscriber
func (h *Hub) Publish(roomID uint, msg domain.ChatMessage) {
	state := h.getOrCreate(roomID)
	state.buffer.push(msg)

	state.mu.RLock()
	defer state.mu.RUnlock()
	for ch := range state.subscribers {
		select {
		case ch <- msg:
		default:
			// client chậm quá → bỏ qua, không block
		}
	}
}

// CleanupRoom xóa toàn bộ state của room khi room kết thúc live
func (h *Hub) CleanupRoom(roomID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()

	state, ok := h.rooms[roomID]
	if !ok {
		return
	}

	state.mu.Lock()
	for ch := range state.subscribers {
		close(ch)
	}
	state.mu.Unlock()

	delete(h.rooms, roomID)
}
