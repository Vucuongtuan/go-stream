package notifier

// Notifier defines the interface for handling notification events.
// Start with ConsoleNotifier, then implement EmailNotifier, PushNotifier, etc.
type Notifier interface {
	OnStreamStarted(roomID, hostID uint, title string) error
	OnStreamEnded(roomID, hostID uint) error
	OnUserRegistered(userID uint, name, email string) error
	OnAuthorApproved(userID uint, name string) error
	OnChatMessage(roomID, userID uint, userName, content string) error
	OnNotificationCreated(notificationID, userID uint, notificationType, title, body, actionURL string) error
}
