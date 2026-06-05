package notifier

import "log/slog"

// ConsoleNotifier logs notifications to console.
// This is the starting implementation — replace with email/push/webhook later.
type ConsoleNotifier struct{}

func NewConsoleNotifier() *ConsoleNotifier {
	return &ConsoleNotifier{}
}

func (n *ConsoleNotifier) OnStreamStarted(roomID, hostID uint, title string) {
	slog.Info("🔴 NOTIFICATION: Stream started!",
		"room_id", roomID,
		"host_id", hostID,
		"title", title,
		"action", "Notify all followers of host",
	)
}

func (n *ConsoleNotifier) OnStreamEnded(roomID, hostID uint) {
	slog.Info("⏹️ NOTIFICATION: Stream ended",
		"room_id", roomID,
		"host_id", hostID,
	)
}

func (n *ConsoleNotifier) OnUserRegistered(userID uint, name, email string) {
	slog.Info("👋 NOTIFICATION: Welcome new user!",
		"user_id", userID,
		"name", name,
		"email", email,
		"action", "Send welcome email",
	)
}

func (n *ConsoleNotifier) OnAuthorApproved(userID uint, name string) {
	slog.Info("✅ NOTIFICATION: Author approved!",
		"user_id", userID,
		"name", name,
		"action", "Send approval congratulations email",
	)
}

func (n *ConsoleNotifier) OnChatMessage(roomID, userID uint, userName, content string) {
	// Only log @mentions or special messages to avoid spam
	// In production, check for @mentions and notify the mentioned user
	slog.Debug("💬 Chat message",
		"room_id", roomID,
		"user", userName,
		"content", content,
	)
}
