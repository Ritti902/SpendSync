package handlers

import (
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	service   *services.UserService
	validator *validators.Validator
}

func NewUserHandler(service *services.UserService, validator *validators.Validator) *UserHandler {
	return &UserHandler{service: service, validator: validator}
}

func (h *UserHandler) Profile(c *fiber.Ctx) error {
	id, err := userID(c)
	if err != nil {
		return err
	}
	user, err := h.service.GetProfile(c.UserContext(), id)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"user": user})
}

func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	id, err := userID(c)
	if err != nil {
		return err
	}
	var req types.UpdateProfileRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	user, err := h.service.UpdateProfile(c.UserContext(), id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"user": user})
}
