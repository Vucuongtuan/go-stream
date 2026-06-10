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

	// Donation event types
	EventDonationSent = "donation.sent"

	// Dedicated topics
	TopicDonationEvents = "donation-events"

	// Prediction event types
	EventPredictionCreated  = "prediction.created"
	EventPredictionLocked   = "prediction.locked"
	EventPredictionResolved = "prediction.resolved"
	EventPredictionCanceled = "prediction.canceled"
	EventPredictionBet      = "prediction.bet"

	// Poll event types
	EventPollCreated = "poll.created"
	EventPollEnded   = "poll.ended"
	EventPollVoted   = "poll.voted"

	// Moderation event types
	EventUserBanned   = "user.banned"
	EventUserTimedOut = "user.timeout"
	EventUserUnbanned = "user.unbanned"
)
