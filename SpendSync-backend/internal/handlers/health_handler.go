package handlers

import (
	"expensemania-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func Health(c *fiber.Ctx) error {
	return utils.JSON(c, fiber.StatusOK, fiber.Map{
		"status":  "ok",
		"message": "SpendSync API running",
	})
}
