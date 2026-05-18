package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"expensemania-backend/internal/config"
	"expensemania-backend/internal/models"
	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ExpenseService struct {
	expenses *repositories.ExpenseRepository
	cfg      config.Config
}

func NewExpenseService(expenses *repositories.ExpenseRepository, cfg config.Config) *ExpenseService {
	return &ExpenseService{expenses: expenses, cfg: cfg}
}

func (s *ExpenseService) Create(ctx context.Context, userID primitive.ObjectID, req types.ExpenseRequest) (types.ExpenseResponse, error) {
	date, err := parseOptionalDate(req.Date)
	if err != nil {
		return types.ExpenseResponse{}, utils.BadRequest("Invalid expense date", nil)
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = s.cfg.DefaultCurrency
	}
	exchangeRate := req.ExchangeRate
	if exchangeRate <= 0 {
		exchangeRate = 1
	}
	now := time.Now().UTC()
	expense := models.Expense{
		UserID:        userID,
		Amount:        req.Amount,
		Category:      utils.CleanString(req.Category),
		Subcategory:   utils.CleanString(req.Subcategory),
		Note:          utils.CleanString(req.Note),
		Date:          date,
		Currency:      currency,
		ExchangeRate:  exchangeRate,
		Tags:          utils.CleanStringSlice(req.Tags, 20),
		PaymentMethod: utils.CleanString(req.PaymentMethod),
		Merchant:      utils.CleanString(req.Merchant),
		IsRecurring:   req.IsRecurring,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.expenses.Create(ctx, &expense); err != nil {
		return types.ExpenseResponse{}, err
	}
	return types.NewExpenseResponse(expense), nil
}

func (s *ExpenseService) List(ctx context.Context, userID primitive.ObjectID, filter repositories.ExpenseFilter) ([]types.ExpenseResponse, utils.Pagination, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 50
	}
	expenses, total, err := s.expenses.List(ctx, userID, filter)
	if err != nil {
		return nil, utils.Pagination{}, err
	}
	return types.NewExpenseResponses(expenses), utils.NewPagination(filter.Page, filter.Limit, total), nil
}

func (s *ExpenseService) Get(ctx context.Context, userID, id primitive.ObjectID) (types.ExpenseResponse, error) {
	expense, err := s.expenses.FindByID(ctx, userID, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.ExpenseResponse{}, utils.NotFound("Expense")
		}
		return types.ExpenseResponse{}, err
	}
	return types.NewExpenseResponse(expense), nil
}

func (s *ExpenseService) Update(ctx context.Context, userID, id primitive.ObjectID, req types.ExpenseUpdateRequest) (types.ExpenseResponse, error) {
	update := bson.M{}
	if req.Amount != nil {
		update["amount"] = *req.Amount
	}
	if req.Category != nil {
		update["category"] = utils.CleanString(*req.Category)
	}
	if req.Subcategory != nil {
		update["subcategory"] = utils.CleanString(*req.Subcategory)
	}
	if req.Note != nil {
		update["note"] = utils.CleanString(*req.Note)
	}
	if req.Date != nil {
		date, err := utils.ParseTime(*req.Date)
		if err != nil {
			return types.ExpenseResponse{}, utils.BadRequest("Invalid expense date", nil)
		}
		update["date"] = date
	}
	if req.Currency != nil {
		update["currency"] = strings.ToUpper(strings.TrimSpace(*req.Currency))
	}
	if req.ExchangeRate != nil {
		update["exchangeRate"] = *req.ExchangeRate
	}
	if req.Tags != nil {
		update["tags"] = utils.CleanStringSlice(*req.Tags, 20)
	}
	if req.PaymentMethod != nil {
		update["paymentMethod"] = utils.CleanString(*req.PaymentMethod)
	}
	if req.Merchant != nil {
		update["merchant"] = utils.CleanString(*req.Merchant)
	}
	if req.IsRecurring != nil {
		update["isRecurring"] = *req.IsRecurring
	}
	if len(update) == 0 {
		return s.Get(ctx, userID, id)
	}
	expense, err := s.expenses.Update(ctx, userID, id, update)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.ExpenseResponse{}, utils.NotFound("Expense")
		}
		return types.ExpenseResponse{}, err
	}
	return types.NewExpenseResponse(expense), nil
}

func (s *ExpenseService) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	deleted, err := s.expenses.Delete(ctx, userID, id)
	if err != nil {
		return 0, err
	}
	if deleted == 0 {
		return 0, utils.NotFound("Expense")
	}
	return deleted, nil
}

func (s *ExpenseService) Export(ctx context.Context, userID primitive.ObjectID, filter repositories.ExpenseFilter, format string) ([]byte, string, string, error) {
	filter.Page = 1
	filter.Limit = 5000
	expenses, _, err := s.expenses.List(ctx, userID, filter)
	if err != nil {
		return nil, "", "", err
	}
	switch strings.ToLower(format) {
	case "json":
		payload := map[string]any{"expenses": types.NewExpenseResponses(expenses)}
		body, err := json.MarshalIndent(payload, "", "  ")
		return body, "application/json", "expensemania-expenses.json", err
	default:
		var buf bytes.Buffer
		writer := csv.NewWriter(&buf)
		_ = writer.Write([]string{"id", "date", "amount", "currency", "category", "subcategory", "paymentMethod", "merchant", "note", "tags"})
		for _, expense := range expenses {
			_ = writer.Write([]string{
				expense.ID.Hex(),
				expense.Date.Format(time.RFC3339),
				strconv.FormatFloat(expense.Amount, 'f', 2, 64),
				expense.Currency,
				expense.Category,
				expense.Subcategory,
				expense.PaymentMethod,
				expense.Merchant,
				expense.Note,
				strings.Join(expense.Tags, "|"),
			})
		}
		writer.Flush()
		if err := writer.Error(); err != nil {
			return nil, "", "", fmt.Errorf("write csv: %w", err)
		}
		return buf.Bytes(), "text/csv", "expensemania-expenses.csv", nil
	}
}

func parseOptionalDate(raw string) (time.Time, error) {
	if raw == "" {
		return time.Now().UTC(), nil
	}
	return utils.ParseTime(raw)
}
