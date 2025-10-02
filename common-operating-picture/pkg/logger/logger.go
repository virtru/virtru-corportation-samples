package logger

import (
	"log/slog"
	"os"
	"strings"
)

var handler *slog.JSONHandler
var logger *slog.Logger

func init() {
	handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	logger = slog.New(handler)

	slog.SetDefault(logger)
}

func SetLevel(level string) {
	var lvl slog.Level
	switch strings.ToUpper(level) {
	case "DEBUG":
		lvl = slog.LevelDebug
	case "INFO":
		lvl = slog.LevelInfo
	case "WARN":
		lvl = slog.LevelWarn
	case "ERROR":
		lvl = slog.LevelError
	default:
		slog.Warn("Unknown log level", slog.String("level", level))
		lvl = slog.LevelInfo
	}

	logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: lvl,
	}))

	slog.SetDefault(logger)
}
