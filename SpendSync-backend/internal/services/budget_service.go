package services

import (
	"context"
	"errors"
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

type BudgetService struct {
	budgets *repositories.BudgetRepository
	cfg     config.Config
}

func NewBudgetService(budgets *repositories.BudgetRepository, cfg config.Config) *BudgetService {
	return &BudgetService{budgets: budgets, cfg: cfg}
}

func (s *BudgetService) Create(ctx context.Context, userID primitive.ObjectID, req types.BudgetRequest) (types.BudgetResponse, error) {
	if req.EndMonth != nil && *req.EndMonth != "" && *req.EndMonth < req.StartMonth {
		return types.BudgetResponse{}, utils.BadRequest("End month must be after start month", nil)
	}
	period := req.Period
	if period == "" {
		period = "monthly"
	}
	alertThreshold := req.AlertThreshold
	if alertThreshold == 0 {
		alertThreshold = 0.8
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = s.cfg.DefaultCurrency
	}
	now := time.Now().UTC()
	budget := models.Budget{
		UserID:         userID,
		Category:       utils.CleanString(req.Category),
		Amount:         req.Amount,
		Period:         period,
		Recurring:      req.Recurring,
		StartMonth:     req.StartMonth,
		EndMonth:       req.EndMonth,
		AlertThreshold: alertThreshold,
		Currency:       currency,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := s.budgets.Create(ctx, &budget); err != nil {
		return types.BudgetResponse{}, err
	}
	return types.NewBudgetResponse(budget), nil
}

func (s *BudgetService) List(ctx context.Context, userID primitive.ObjectID) ([]types.BudgetResponse, error) {
	budgets, err := s.budgets.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	return types.NewBudgetResponses(budgets), nil
}

func (s *BudgetService) Update(ctx context.Context, userID, id primitive.ObjectID, req types.BudgetUpdateRequest) (types.BudgetResponse, error) {
	update := bson.M{}
	if req.Category != nil {
		update["category"] = utils.CleanString(*req.Category)
	}
	if req.Amount != nil {
		update["amount"] = *req.Amount
	}
	if req.Period != nil {
		update["period"] = *req.Period
	}
	if req.Recurring != nil {
		update["recurring"] = *req.Recurring
	}
	if req.StartMonth != nil {
		update["startMonth"] = strings.TrimSpace(*req.StartMonth)
	}
	if req.EndMonth != nil {
		update["endMonth"] = strings.TrimSpace(*req.EndMonth)
	}
	if req.AlertThreshold != nil {
		update["alertThreshold"] = *req.AlertThreshold
	}
	if req.Currency != nil {
		update["currency"] = strings.ToUpper(strings.TrimSpace(*req.Currency))
	}
	if len(update) == 0 {
		return types.BudgetResponse{}, utils.BadRequest("No budget fields to update", nil)
	}
	budget, err := s.budgets.Update(ctx, userID, id, update)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.BudgetResponse{}, utils.NotFound("Budget")
		}
		return types.BudgetResponse{}, err
	}
	return types.NewBudgetResponse(budget), nil
}

func (s *BudgetService) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	deleted, err := s.budgets.Delete(ctx, userID, id)
	if err != nil {
		return 0, err
	}
	if deleted == 0 {
		return 0, utils.NotFound("Budget")
	}
	return deleted, nil
}
