package utils

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"totalPages"`
	HasNext    bool  `json:"hasNext"`
	HasPrev    bool  `json:"hasPrev"`
}

func ParsePagination(c *fiber.Ctx, defaultLimit, maxLimit int) (page, limit int) {
	page = parsePositiveInt(c.Query("page"), 1)
	limit = parsePositiveInt(c.Query("limit"), defaultLimit)
	if limit > maxLimit {
		limit = maxLimit
	}
	return page, limit
}

func NewPagination(page, limit int, total int64) Pagination {
	totalPages := int64(0)
	if limit > 0 {
		totalPages = (total + int64(limit) - 1) / int64(limit)
	}
	return Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    int64(page) < totalPages,
		HasPrev:    page > 1,
	}
}

func parsePositiveInt(raw string, fallback int) int {
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
