package kafka

const (
	// Topics
	TopicStreamEvents = "stream-events"
	TopicUserEvents   = "user-events"
	TopicChatEvents   = "chat-events"

	// Stream event types
	EventStreamStarted = "stream.started"
	EventStreamEnded   = "stream.ended"
	EventRoomCreated   = "room.created"

	// User event types
	EventUserRegistered = "user.registered"
	EventAuthorApproved = "author.approved"
	EventAuthorRejected = "author.rejected"

	// Chat event types
	EventChatMessage = "chat.message"
)
