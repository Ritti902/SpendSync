package handlers

import (
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type CategoryHandler struct {
	service   *services.CategoryService
	validator *validators.Validator
}

func NewCategoryHandler(service *services.CategoryService, validator *validators.Validator) *CategoryHandler {
	return &CategoryHandler{service: service, validator: validator}
}

func (h *CategoryHandler) List(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	categories, err := h.service.List(c.UserContext(), user, c.Query("type"))
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"categories": categories})
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	var req types.CategoryRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	category, err := h.service.Create(c.UserContext(), user, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusCreated, fiber.Map{"category": category})
}

func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	var req types.CategoryUpdateRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	category, err := h.service.Update(c.UserContext(), user, id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"category": category})
}

func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	deleted, err := h.service.Delete(c.UserContext(), user, id)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"deleted": deleted})
}
