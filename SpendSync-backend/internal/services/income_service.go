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

type IncomeService struct {
	income *repositories.IncomeRepository
	cfg    config.Config
}

func NewIncomeService(income *repositories.IncomeRepository, cfg config.Config) *IncomeService {
	return &IncomeService{income: income, cfg: cfg}
}

func (s *IncomeService) Create(ctx context.Context, userID primitive.ObjectID, req types.IncomeRequest) (types.IncomeResponse, error) {
	date, err := parseOptionalDate(req.Date)
	if err != nil {
		return types.IncomeResponse{}, utils.BadRequest("Invalid income date", nil)
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
	income := models.Income{
		UserID:       userID,
		Amount:       req.Amount,
		Source:       utils.CleanString(req.Source),
		Category:     utils.CleanString(req.Category),
		Note:         utils.CleanString(req.Note),
		Date:         date,
		Currency:     currency,
		ExchangeRate: exchangeRate,
		Tags:         utils.CleanStringSlice(req.Tags, 20),
		IsRecurring:  req.IsRecurring,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if income.Category == "" {
		income.Category = "other"
	}
	if err := s.income.Create(ctx, &income); err != nil {
		return types.IncomeResponse{}, err
	}
	return types.NewIncomeResponse(income), nil
}

func (s *IncomeService) List(ctx context.Context, userID primitive.ObjectID, filter repositories.IncomeFilter) ([]types.IncomeResponse, utils.Pagination, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 50
	}
	incomes, total, err := s.income.List(ctx, userID, filter)
	if err != nil {
		return nil, utils.Pagination{}, err
	}
	return types.NewIncomeResponses(incomes), utils.NewPagination(filter.Page, filter.Limit, total), nil
}

func (s *IncomeService) Get(ctx context.Context, userID, id primitive.ObjectID) (types.IncomeResponse, error) {
	income, err := s.income.FindByID(ctx, userID, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.IncomeResponse{}, utils.NotFound("Income")
		}
		return types.IncomeResponse{}, err
	}
	return types.NewIncomeResponse(income), nil
}

func (s *IncomeService) Update(ctx context.Context, userID, id primitive.ObjectID, req types.IncomeUpdateRequest) (types.IncomeResponse, error) {
	update := bson.M{}
	if req.Amount != nil {
		update["amount"] = *req.Amount
	}
	if req.Source != nil {
		update["source"] = utils.CleanString(*req.Source)
	}
	if req.Category != nil {
		update["category"] = utils.CleanString(*req.Category)
	}
	if req.Note != nil {
		update["note"] = utils.CleanString(*req.Note)
	}
	if req.Date != nil {
		date, err := utils.ParseTime(*req.Date)
		if err != nil {
			return types.IncomeResponse{}, utils.BadRequest("Invalid income date", nil)
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
	if req.IsRecurring != nil {
		update["isRecurring"] = *req.IsRecurring
	}
	if len(update) == 0 {
		return s.Get(ctx, userID, id)
	}
	income, err := s.income.Update(ctx, userID, id, update)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.IncomeResponse{}, utils.NotFound("Income")
		}
		return types.IncomeResponse{}, err
	}
	return types.NewIncomeResponse(income), nil
}

func (s *IncomeService) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	deleted, err := s.income.Delete(ctx, userID, id)
	if err != nil {
		return 0, err
	}
	if deleted == 0 {
		return 0, utils.NotFound("Income")
	}
	return deleted, nil
}
