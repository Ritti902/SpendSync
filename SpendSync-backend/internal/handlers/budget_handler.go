package handlers

import (
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type BudgetHandler struct {
	service   *services.BudgetService
	validator *validators.Validator
}

func NewBudgetHandler(service *services.BudgetService, validator *validators.Validator) *BudgetHandler {
	return &BudgetHandler{service: service, validator: validator}
}

func (h *BudgetHandler) List(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	budgets, err := h.service.List(c.UserContext(), user)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"budgets": budgets})
}

func (h *BudgetHandler) Create(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	var req types.BudgetRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	budget, err := h.service.Create(c.UserContext(), user, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusCreated, fiber.Map{"budget": budget})
}

func (h *BudgetHandler) Update(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	var req types.BudgetUpdateRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	budget, err := h.service.Update(c.UserContext(), user, id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"budget": budget})
}

func (h *BudgetHandler) Delete(c *fiber.Ctx) error {
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
