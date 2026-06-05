package logger

import (
	"log/slog"
	"os"
)

func InitLogger() {
	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo, 
	}
	handler := slog.NewJSONHandler(os.Stdout, opts)
	slog.SetDefault(slog.New(handler))
}

func Info(msg string, args ...any) {
	slog.Info(msg, args...)
}

func Warn(msg string, args ...any) {
	slog.Warn(msg, args...)
}

func Error(msg string, err error, args ...any) {
	if err != nil {
		args = append(args, "error", err.Error())
	}
	slog.Error(msg, args...)
}

func Fatal(msg string, err error, args ...any) {
	if err != nil {
		args = append(args, "error", err.Error())
	}
	slog.Error(msg, args...)
	os.Exit(1)
}

func FatalIfError(err error, msg string, args ...any) {
	if err != nil {
		Fatal(msg, err, args...)
	}
}

func CheckError(err error, msg string, args ...any) bool {
	if err != nil {
		Error(msg, err, args...)
		return true
	}
	return false
}
