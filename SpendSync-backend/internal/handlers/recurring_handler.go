package handlers

import (
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type RecurringHandler struct {
	service   *services.RecurringService
	validator *validators.Validator
}

func NewRecurringHandler(service *services.RecurringService, validator *validators.Validator) *RecurringHandler {
	return &RecurringHandler{service: service, validator: validator}
}

func (h *RecurringHandler) List(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	recurring, err := h.service.List(c.UserContext(), user, c.QueryBool("activeOnly", false))
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"recurringExpenses": recurring})
}

func (h *RecurringHandler) Create(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	var req types.RecurringExpenseRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	recurring, err := h.service.Create(c.UserContext(), user, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusCreated, fiber.Map{"recurringExpense": recurring})
}

func (h *RecurringHandler) Update(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	var req types.RecurringExpenseRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	recurring, err := h.service.Update(c.UserContext(), user, id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"recurringExpense": recurring})
}

func (h *RecurringHandler) Delete(c *fiber.Ctx) error {
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
