package handlers

import (
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type IncomeHandler struct {
	service   *services.IncomeService
	validator *validators.Validator
}

func NewIncomeHandler(service *services.IncomeService, validator *validators.Validator) *IncomeHandler {
	return &IncomeHandler{service: service, validator: validator}
}

func (h *IncomeHandler) List(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	filter, err := incomeFilterFromQuery(c)
	if err != nil {
		return err
	}
	income, pagination, err := h.service.List(c.UserContext(), user, filter)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"income": income, "pagination": pagination})
}

func (h *IncomeHandler) Create(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	var req types.IncomeRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	income, err := h.service.Create(c.UserContext(), user, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusCreated, fiber.Map{"income": income})
}

func (h *IncomeHandler) Get(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	income, err := h.service.Get(c.UserContext(), user, id)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"income": income})
}

func (h *IncomeHandler) Update(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	id, err := objectIDParam(c)
	if err != nil {
		return err
	}
	var req types.IncomeUpdateRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	income, err := h.service.Update(c.UserContext(), user, id, req)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"income": income})
}

func (h *IncomeHandler) Delete(c *fiber.Ctx) error {
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
