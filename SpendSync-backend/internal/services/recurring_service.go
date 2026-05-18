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

type RecurringService struct {
	recurring *repositories.RecurringRepository
	cfg       config.Config
}

func NewRecurringService(recurring *repositories.RecurringRepository, cfg config.Config) *RecurringService {
	return &RecurringService{recurring: recurring, cfg: cfg}
}

func (s *RecurringService) Create(ctx context.Context, userID primitive.ObjectID, req types.RecurringExpenseRequest) (models.RecurringExpense, error) {
	start, err := parseOptionalDate(req.StartDate)
	if err != nil {
		return models.RecurringExpense{}, utils.BadRequest("Invalid start date", nil)
	}
	var end *time.Time
	if req.EndDate != nil && *req.EndDate != "" {
		parsed, err := utils.ParseTime(*req.EndDate)
		if err != nil {
			return models.RecurringExpense{}, utils.BadRequest("Invalid end date", nil)
		}
		end = &parsed
	}
	interval := req.Interval
	if interval < 1 {
		interval = 1
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = s.cfg.DefaultCurrency
	}
	now := time.Now().UTC()
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	recurring := models.RecurringExpense{
		UserID:        userID,
		Amount:        req.Amount,
		Category:      utils.CleanString(req.Category),
		Subcategory:   utils.CleanString(req.Subcategory),
		Note:          utils.CleanString(req.Note),
		Currency:      currency,
		PaymentMethod: utils.CleanString(req.PaymentMethod),
		Tags:          utils.CleanStringSlice(req.Tags, 20),
		Frequency:     req.Frequency,
		Interval:      interval,
		StartDate:     start,
		EndDate:       end,
		NextRunAt:     start,
		Active:        active,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.recurring.Create(ctx, &recurring); err != nil {
		return models.RecurringExpense{}, err
	}
	return recurring, nil
}

func (s *RecurringService) List(ctx context.Context, userID primitive.ObjectID, activeOnly bool) ([]models.RecurringExpense, error) {
	return s.recurring.List(ctx, userID, activeOnly)
}

func (s *RecurringService) Update(ctx context.Context, userID, id primitive.ObjectID, req types.RecurringExpenseRequest) (models.RecurringExpense, error) {
	update := bson.M{
		"amount":        req.Amount,
		"category":      utils.CleanString(req.Category),
		"subcategory":   utils.CleanString(req.Subcategory),
		"note":          utils.CleanString(req.Note),
		"paymentMethod": utils.CleanString(req.PaymentMethod),
		"tags":          utils.CleanStringSlice(req.Tags, 20),
		"frequency":     req.Frequency,
	}
	if req.Active != nil {
		update["active"] = *req.Active
	}
	if req.Currency != "" {
		update["currency"] = strings.ToUpper(strings.TrimSpace(req.Currency))
	}
	if req.Interval > 0 {
		update["interval"] = req.Interval
	}
	if req.StartDate != "" {
		start, err := utils.ParseTime(req.StartDate)
		if err != nil {
			return models.RecurringExpense{}, utils.BadRequest("Invalid start date", nil)
		}
		update["startDate"] = start
		update["nextRunAt"] = start
	}
	if req.EndDate != nil {
		if *req.EndDate == "" {
			update["endDate"] = nil
		} else {
			end, err := utils.ParseTime(*req.EndDate)
			if err != nil {
				return models.RecurringExpense{}, utils.BadRequest("Invalid end date", nil)
			}
			update["endDate"] = end
		}
	}
	if len(update) == 0 {
		return models.RecurringExpense{}, utils.BadRequest("No recurring expense fields to update", nil)
	}
	recurring, err := s.recurring.Update(ctx, userID, id, update)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.RecurringExpense{}, utils.NotFound("Recurring expense")
		}
		return models.RecurringExpense{}, err
	}
	return recurring, nil
}

func (s *RecurringService) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	deleted, err := s.recurring.Delete(ctx, userID, id)
	if err != nil {
		return 0, err
	}
	if deleted == 0 {
		return 0, utils.NotFound("Recurring expense")
	}
	return deleted, nil
}
