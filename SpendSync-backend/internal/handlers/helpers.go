package handlers

import (
	"errors"
	"strconv"
	"strings"
	"time"

	appmiddleware "expensemania-backend/internal/middleware"
	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func parseBody(c *fiber.Ctx, validator *validators.Validator, dest any) error {
	if err := c.BodyParser(dest); err != nil {
		return utils.BadRequest("Invalid JSON body", nil)
	}
	if err := validator.Struct(dest); err != nil {
		var validationErr validators.ValidationError
		if errors.As(err, &validationErr) {
			return utils.BadRequest("Validation failed", validationErr.Fields)
		}
		return err
	}
	return nil
}

func userID(c *fiber.Ctx) (primitive.ObjectID, error) {
	return appmiddleware.UserID(c)
}

func objectIDParam(c *fiber.Ctx) (primitive.ObjectID, error) {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		id = strings.TrimSpace(c.Query("id"))
	}
	if id == "" {
		return primitive.NilObjectID, utils.BadRequest("Missing id", nil)
	}
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return primitive.NilObjectID, utils.BadRequest("Invalid id", nil)
	}
	return oid, nil
}

func expenseFilterFromQuery(c *fiber.Ctx) (repositories.ExpenseFilter, error) {
	page, limit := utils.ParsePagination(c, 1000, 5000)
	filter := repositories.ExpenseFilter{
		Page:          page,
		Limit:         limit,
		Category:      strings.TrimSpace(c.Query("category")),
		Search:        strings.TrimSpace(c.Query("search")),
		PaymentMethod: strings.TrimSpace(c.Query("paymentMethod")),
		SortBy:        strings.TrimSpace(c.Query("sortBy")),
		SortOrder:     strings.TrimSpace(c.Query("sortOrder")),
		Tags:          splitCSV(c.Query("tags")),
	}
	if from := strings.TrimSpace(c.Query("from")); from != "" {
		parsed, err := utils.ParseTime(from)
		if err != nil {
			return filter, utils.BadRequest("Invalid from date", nil)
		}
		filter.From = &parsed
	}
	if to := strings.TrimSpace(c.Query("to")); to != "" {
		parsed, err := utils.ParseTime(to)
		if err != nil {
			return filter, utils.BadRequest("Invalid to date", nil)
		}
		if len(to) == len("2006-01-02") {
			parsed = parsed.Add(24*time.Hour - time.Nanosecond)
		}
		filter.To = &parsed
	}
	if min := strings.TrimSpace(c.Query("minAmount")); min != "" {
		value, err := strconv.ParseFloat(min, 64)
		if err != nil {
			return filter, utils.BadRequest("Invalid minAmount", nil)
		}
		filter.MinAmount = &value
	}
	if max := strings.TrimSpace(c.Query("maxAmount")); max != "" {
		value, err := strconv.ParseFloat(max, 64)
		if err != nil {
			return filter, utils.BadRequest("Invalid maxAmount", nil)
		}
		filter.MaxAmount = &value
	}
	return filter, nil
}

func incomeFilterFromQuery(c *fiber.Ctx) (repositories.IncomeFilter, error) {
	page, limit := utils.ParsePagination(c, 50, 500)
	filter := repositories.IncomeFilter{
		Page:      page,
		Limit:     limit,
		Category:  strings.TrimSpace(c.Query("category")),
		Source:    strings.TrimSpace(c.Query("source")),
		Search:    strings.TrimSpace(c.Query("search")),
		SortBy:    strings.TrimSpace(c.Query("sortBy")),
		SortOrder: strings.TrimSpace(c.Query("sortOrder")),
	}
	if from := strings.TrimSpace(c.Query("from")); from != "" {
		parsed, err := utils.ParseTime(from)
		if err != nil {
			return filter, utils.BadRequest("Invalid from date", nil)
		}
		filter.From = &parsed
	}
	if to := strings.TrimSpace(c.Query("to")); to != "" {
		parsed, err := utils.ParseTime(to)
		if err != nil {
			return filter, utils.BadRequest("Invalid to date", nil)
		}
		if len(to) == len("2006-01-02") {
			parsed = parsed.Add(24*time.Hour - time.Nanosecond)
		}
		filter.To = &parsed
	}
	if min := strings.TrimSpace(c.Query("minAmount")); min != "" {
		value, err := strconv.ParseFloat(min, 64)
		if err != nil {
			return filter, utils.BadRequest("Invalid minAmount", nil)
		}
		filter.MinAmount = &value
	}
	if max := strings.TrimSpace(c.Query("maxAmount")); max != "" {
		value, err := strconv.ParseFloat(max, 64)
		if err != nil {
			return filter, utils.BadRequest("Invalid maxAmount", nil)
		}
		filter.MaxAmount = &value
	}
	return filter, nil
}

func splitCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	return utils.CleanStringSlice(strings.Split(raw, ","), 20)
}
