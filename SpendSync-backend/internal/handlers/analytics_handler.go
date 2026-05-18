package handlers

import (
	"strconv"
	"time"

	"expensemania-backend/internal/services"
	"expensemania-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

type AnalyticsHandler struct {
	service *services.AnalyticsService
}

func NewAnalyticsHandler(service *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: service}
}

func (h *AnalyticsHandler) Dashboard(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	dashboard, err := h.service.Dashboard(c.UserContext(), user)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, dashboard)
}

func (h *AnalyticsHandler) Monthly(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	year := queryInt(c, "year", now.Year())
	month := queryInt(c, "month", int(now.Month()))
	if month < 1 || month > 12 {
		return utils.BadRequest("Invalid month", nil)
	}
	analytics, err := h.service.Monthly(c.UserContext(), user, year, time.Month(month))
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, analytics)
}

func (h *AnalyticsHandler) Weekly(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	anchor := time.Now().UTC()
	if raw := c.Query("date"); raw != "" {
		parsed, err := utils.ParseTime(raw)
		if err != nil {
			return utils.BadRequest("Invalid date", nil)
		}
		anchor = parsed
	}
	analytics, err := h.service.Weekly(c.UserContext(), user, anchor)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, analytics)
}

func (h *AnalyticsHandler) Yearly(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	year := queryInt(c, "year", time.Now().UTC().Year())
	analytics, err := h.service.Yearly(c.UserContext(), user, year)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, analytics)
}

func queryInt(c *fiber.Ctx, key string, fallback int) int {
	value, err := strconv.Atoi(c.Query(key))
	if err != nil {
		return fallback
	}
	return value
}
