package notifier

import "log/slog"

// ConsoleNotifier logs notifications to console.
// This is the starting implementation — replace with email/push/webhook later.
type ConsoleNotifier struct{}

func NewConsoleNotifier() *ConsoleNotifier {
	return &ConsoleNotifier{}
}

func (n *ConsoleNotifier) OnStreamStarted(roomID, hostID uint, title string) error {
	slog.Info("🔴 NOTIFICATION: Stream started!",
		"room_id", roomID,
		"host_id", hostID,
		"title", title,
		"action", "Notify all followers of host",
	)
	return nil
}

func (n *ConsoleNotifier) OnStreamEnded(roomID, hostID uint) error {
	slog.Info("⏹️ NOTIFICATION: Stream ended",
		"room_id", roomID,
		"host_id", hostID,
	)
	return nil
}

func (n *ConsoleNotifier) OnUserRegistered(userID uint, name, email string) error {
	slog.Info("👋 NOTIFICATION: Welcome new user!",
		"user_id", userID,
		"name", name,
		"email", email,
		"action", "Send welcome email",
	)
	return nil
}

func (n *ConsoleNotifier) OnAuthorApproved(userID uint, name string) error {
	slog.Info("✅ NOTIFICATION: Author approved!",
		"user_id", userID,
		"name", name,
		"action", "Send approval congratulations email",
	)
	return nil
}

func (n *ConsoleNotifier) OnChatMessage(roomID, userID uint, userName, content string) error {
	// Only log @mentions or special messages to avoid spam
	// In production, check for @mentions and notify the mentioned user
	slog.Debug("💬 Chat message",
		"room_id", roomID,
		"user", userName,
		"content", content,
	)
	return nil
}
