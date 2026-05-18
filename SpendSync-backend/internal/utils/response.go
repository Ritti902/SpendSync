package utils

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

func JSON(c *fiber.Ctx, status int, payload any) error {
	return c.Status(status).JSON(payload)
}

func ErrorHandler(c *fiber.Ctx, err error) error {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return c.Status(appErr.Status).JSON(fiber.Map{
			"error":   appErr.Message,
			"code":    appErr.Code,
			"details": appErr.Details,
		})
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return c.Status(fiberErr.Code).JSON(fiber.Map{
			"error": fiberErr.Message,
			"code":  "HTTP_ERROR",
		})
	}

	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"error": "Internal server error",
		"code":  "INTERNAL_ERROR",
	})
}
