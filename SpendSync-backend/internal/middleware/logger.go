package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

func RequestLogger(logger *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		duration := time.Since(start)
		logger.Info("http_request",
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"duration_ms", duration.Milliseconds(),
			"ip", c.IP(),
			"request_id", c.Locals("requestid"),
		)
		return err
	}
}
