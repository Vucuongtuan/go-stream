package notifier

// Notifier defines the interface for handling notification events.
// Start with ConsoleNotifier, then implement EmailNotifier, PushNotifier, etc.
type Notifier interface {
	OnStreamStarted(roomID, hostID uint, title string)
	OnStreamEnded(roomID, hostID uint)
	OnUserRegistered(userID uint, name, email string)
	OnAuthorApproved(userID uint, name string)
	OnChatMessage(roomID, userID uint, userName, content string)
}
