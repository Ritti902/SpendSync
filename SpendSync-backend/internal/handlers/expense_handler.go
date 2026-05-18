package handlers

import (
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type ExpenseHandler struct {
	service   *services.ExpenseService
	validator *validators.Validator
}

func NewExpenseHandler(service *services.ExpenseService, validator *validators.Validator) *ExpenseHandler {
	return &ExpenseHandler{service: service, validator: validator}
}

func (h *ExpenseHandler) List(c *fiber.Ctx) error {
	id, err := userID(c)
	if err != nil {
		return err
	}
	filter, err := expenseFilterFromQuery(c)
	if err != nil {
		return err
	}
	expenses, pagination, err := h.service.List(c.UserContext(), id, filter)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"expenses": expenses, "pagination": pagination})
}

func (h *ExpenseHandler) Create(c *fiber.Ctx) error {
	id, err := userID(c)
	if err != nil {
		return err
	}
	var req types.ExpenseRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	expense, err := h.service.Create(c.UserContext(), id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusCreated, fiber.Map{"expense": expense})
}

func (h *ExpenseHandler) Get(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	expense, err := h.service.Get(c.UserContext(), user, id)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"expense": expense})
}

func (h *ExpenseHandler) Update(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	var req types.ExpenseUpdateRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	expense, err := h.service.Update(c.UserContext(), user, id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"expense": expense})
}

func (h *ExpenseHandler) Delete(c *fiber.Ctx) error {
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

func (h *ExpenseHandler) Export(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	filter, err := expenseFilterFromQuery(c)
	if err != nil {
		return err
	}
	body, contentType, filename, err := h.service.Export(c.UserContext(), user, filter, c.Query("format", "csv"))
	if err != nil {
		return err
	}
	c.Set(fiber.HeaderContentType, contentType)
	c.Set(fiber.HeaderContentDisposition, `attachment; filename="`+filename+`"`)
	return c.Status(fiber.StatusOK).Send(body)
}
