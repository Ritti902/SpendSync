package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type AnalyticsService struct {
	expenses *repositories.ExpenseRepository
	income   *repositories.IncomeRepository
	budgets  *repositories.BudgetRepository
}

type DashboardResponse struct {
	TotalBalance       float64             `json:"totalBalance"`
	RemainingBalance   float64             `json:"remainingBalance"`
	TotalExpenses      float64             `json:"totalExpenses"`
	MonthlySpending    float64             `json:"monthlySpending"`
	MonthlyIncome      float64             `json:"monthlyIncome"`
	TotalIncome        float64             `json:"totalIncome"`
	Savings            float64             `json:"savings"`
	SavingsPercentage  float64             `json:"savingsPercentage"`
	RecentTransactions []TransactionItem   `json:"recentTransactions"`
	SpendingChart      []TrendPoint        `json:"spendingChart"`
	MonthlyNetSavings  []TrendPoint        `json:"monthlyNetSavings"`
	CategoryBreakdown  []CategoryBreakdown `json:"categoryBreakdown"`
	IncomeDistribution []CategoryBreakdown `json:"incomeDistribution"`
	BudgetAlerts       []BudgetAlert       `json:"budgetAlerts"`
	Insights           []string            `json:"insights"`
}

type AnalyticsResponse struct {
	Period             string              `json:"period"`
	Start              time.Time           `json:"start"`
	End                time.Time           `json:"end"`
	ExpenseTotal       float64             `json:"expenseTotal"`
	IncomeTotal        float64             `json:"incomeTotal"`
	NetSavings         float64             `json:"netSavings"`
	SavingsPercentage  float64             `json:"savingsPercentage"`
	ExpenseCount       int                 `json:"expenseCount"`
	IncomeCount        int                 `json:"incomeCount"`
	CategoryBreakdown  []CategoryBreakdown `json:"categoryBreakdown"`
	IncomeDistribution []CategoryBreakdown `json:"incomeDistribution"`
	Trend              []TrendPoint        `json:"trend"`
	Insights           []string            `json:"insights"`
}

type TransactionItem struct {
	ID       string    `json:"id"`
	Type     string    `json:"type"`
	Title    string    `json:"title"`
	Category string    `json:"category"`
	Amount   float64   `json:"amount"`
	Currency string    `json:"currency"`
	Date     time.Time `json:"date"`
}

type TrendPoint struct {
	Period  string  `json:"period"`
	Expense float64 `json:"expense"`
	Income  float64 `json:"income"`
	Net     float64 `json:"net"`
}

type CategoryBreakdown struct {
	Category string  `json:"category"`
	Total    float64 `json:"total"`
	Count    int     `json:"count"`
	Percent  float64 `json:"percent"`
}

type BudgetAlert struct {
	BudgetID  string  `json:"budgetId"`
	Category  string  `json:"category"`
	Limit     float64 `json:"limit"`
	Spent     float64 `json:"spent"`
	Remaining float64 `json:"remaining"`
	Percent   float64 `json:"percent"`
	Status    string  `json:"status"`
	Threshold float64 `json:"threshold"`
}

func NewAnalyticsService(expenses *repositories.ExpenseRepository, income *repositories.IncomeRepository, budgets *repositories.BudgetRepository) *AnalyticsService {
	return &AnalyticsService{expenses: expenses, income: income, budgets: budgets}
}

func (s *AnalyticsService) Dashboard(ctx context.Context, userID primitive.ObjectID) (DashboardResponse, error) {
	now := time.Now().UTC()
	monthStart, monthEnd := utils.MonthRange(now.Year(), now.Month())

	allExpenses, _, err := s.sum(ctx, s.expenses.Collection(), userID, nil, nil)
	if err != nil {
		return DashboardResponse{}, err
	}
	allIncome, _, err := s.sum(ctx, s.income.Collection(), userID, nil, nil)
	if err != nil {
		return DashboardResponse{}, err
	}
	monthlyExpense, monthlyExpenseCount, err := s.sum(ctx, s.expenses.Collection(), userID, &monthStart, &monthEnd)
	if err != nil {
		return DashboardResponse{}, err
	}
	monthlyIncome, _, err := s.sum(ctx, s.income.Collection(), userID, &monthStart, &monthEnd)
	if err != nil {
		return DashboardResponse{}, err
	}
	breakdown, err := s.categoryBreakdown(ctx, userID, monthStart, monthEnd)
	if err != nil {
		return DashboardResponse{}, err
	}
	incomeDistribution, err := s.incomeDistribution(ctx, userID, monthStart, monthEnd)
	if err != nil {
		return DashboardResponse{}, err
	}
	trend, err := s.trend(ctx, userID, monthStart, monthEnd, "%Y-%m-%d")
	if err != nil {
		return DashboardResponse{}, err
	}
	recent, err := s.recentTransactions(ctx, userID)
	if err != nil {
		return DashboardResponse{}, err
	}
	alerts, err := s.budgetAlerts(ctx, userID, now.Format("2006-01"), monthlyExpense, breakdown)
	if err != nil {
		return DashboardResponse{}, err
	}
	remaining := allIncome - allExpenses
	monthlySavings := monthlyIncome - monthlyExpense
	return DashboardResponse{
		TotalBalance:       allIncome - allExpenses,
		RemainingBalance:   remaining,
		TotalExpenses:      allExpenses,
		MonthlySpending:    monthlyExpense,
		MonthlyIncome:      monthlyIncome,
		TotalIncome:        allIncome,
		Savings:            monthlySavings,
		SavingsPercentage:  savingsPercentage(monthlyIncome, monthlyExpense),
		RecentTransactions: recent,
		SpendingChart:      trend,
		MonthlyNetSavings:  trend,
		CategoryBreakdown:  breakdown,
		IncomeDistribution: incomeDistribution,
		BudgetAlerts:       alerts,
		Insights:           buildInsights(monthlyExpense, monthlyIncome, monthlyExpenseCount, alerts),
	}, nil
}

func (s *AnalyticsService) Monthly(ctx context.Context, userID primitive.ObjectID, year int, month time.Month) (AnalyticsResponse, error) {
	start, end := utils.MonthRange(year, month)
	return s.period(ctx, userID, "monthly", start, end, "%Y-%m-%d")
}

func (s *AnalyticsService) Weekly(ctx context.Context, userID primitive.ObjectID, anchor time.Time) (AnalyticsResponse, error) {
	start, end := utils.WeekRange(anchor)
	return s.period(ctx, userID, "weekly", start, end, "%Y-%m-%d")
}

func (s *AnalyticsService) Yearly(ctx context.Context, userID primitive.ObjectID, year int) (AnalyticsResponse, error) {
	start, end := utils.YearRange(year)
	return s.period(ctx, userID, "yearly", start, end, "%Y-%m")
}

func (s *AnalyticsService) period(ctx context.Context, userID primitive.ObjectID, name string, start, end time.Time, format string) (AnalyticsResponse, error) {
	expenseTotal, expenseCount, err := s.sum(ctx, s.expenses.Collection(), userID, &start, &end)
	if err != nil {
		return AnalyticsResponse{}, err
	}
	incomeTotal, incomeCount, err := s.sum(ctx, s.income.Collection(), userID, &start, &end)
	if err != nil {
		return AnalyticsResponse{}, err
	}
	breakdown, err := s.categoryBreakdown(ctx, userID, start, end)
	if err != nil {
		return AnalyticsResponse{}, err
	}
	incomeDistribution, err := s.incomeDistribution(ctx, userID, start, end)
	if err != nil {
		return AnalyticsResponse{}, err
	}
	trend, err := s.trend(ctx, userID, start, end, format)
	if err != nil {
		return AnalyticsResponse{}, err
	}
	return AnalyticsResponse{
		Period:             name,
		Start:              start,
		End:                end,
		ExpenseTotal:       expenseTotal,
		IncomeTotal:        incomeTotal,
		NetSavings:         incomeTotal - expenseTotal,
		SavingsPercentage:  savingsPercentage(incomeTotal, expenseTotal),
		ExpenseCount:       expenseCount,
		IncomeCount:        incomeCount,
		CategoryBreakdown:  breakdown,
		IncomeDistribution: incomeDistribution,
		Trend:              trend,
		Insights:           buildInsights(expenseTotal, incomeTotal, expenseCount, nil),
	}, nil
}

func (s *AnalyticsService) sum(ctx context.Context, col *mongo.Collection, userID primitive.ObjectID, start, end *time.Time) (float64, int, error) {
	match := bson.M{"userId": userID}
	if start != nil || end != nil {
		date := bson.M{}
		if start != nil {
			date["$gte"] = *start
		}
		if end != nil {
			date["$lt"] = *end
		}
		match["date"] = date
	}
	cursor, err := col.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{"_id": nil, "total": bson.M{"$sum": "$amount"}, "count": bson.M{"$sum": 1}}}},
	})
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)
	var rows []struct {
		Total float64 `bson:"total"`
		Count int     `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return 0, 0, err
	}
	if len(rows) == 0 {
		return 0, 0, nil
	}
	return rows[0].Total, rows[0].Count, nil
}

func (s *AnalyticsService) categoryBreakdown(ctx context.Context, userID primitive.ObjectID, start, end time.Time) ([]CategoryBreakdown, error) {
	match := bson.M{"userId": userID, "date": bson.M{"$gte": start, "$lt": end}}
	cursor, err := s.expenses.Collection().Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{"_id": "$category", "total": bson.M{"$sum": "$amount"}, "count": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"total": -1}}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var rows []struct {
		ID    string  `bson:"_id"`
		Total float64 `bson:"total"`
		Count int     `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	total := 0.0
	for _, row := range rows {
		total += row.Total
	}
	breakdown := make([]CategoryBreakdown, 0, len(rows))
	for _, row := range rows {
		percent := 0.0
		if total > 0 {
			percent = row.Total / total
		}
		breakdown = append(breakdown, CategoryBreakdown{
			Category: row.ID,
			Total:    row.Total,
			Count:    row.Count,
			Percent:  percent,
		})
	}
	return breakdown, nil
}

func (s *AnalyticsService) trend(ctx context.Context, userID primitive.ObjectID, start, end time.Time, format string) ([]TrendPoint, error) {
	expenses, err := bucketTotals(ctx, s.expenses.Collection(), userID, start, end, format)
	if err != nil {
		return nil, err
	}
	income, err := bucketTotals(ctx, s.income.Collection(), userID, start, end, format)
	if err != nil {
		return nil, err
	}
	keys := make(map[string]struct{})
	for key := range expenses {
		keys[key] = struct{}{}
	}
	for key := range income {
		keys[key] = struct{}{}
	}
	periods := make([]string, 0, len(keys))
	for key := range keys {
		periods = append(periods, key)
	}
	sort.Strings(periods)
	points := make([]TrendPoint, 0, len(periods))
	for _, period := range periods {
		points = append(points, TrendPoint{Period: period, Expense: expenses[period], Income: income[period], Net: income[period] - expenses[period]})
	}
	return points, nil
}

func (s *AnalyticsService) incomeDistribution(ctx context.Context, userID primitive.ObjectID, start, end time.Time) ([]CategoryBreakdown, error) {
	match := bson.M{"userId": userID, "date": bson.M{"$gte": start, "$lt": end}}
	cursor, err := s.income.Collection().Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{"_id": "$source", "total": bson.M{"$sum": "$amount"}, "count": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"total": -1}}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var rows []struct {
		ID    string  `bson:"_id"`
		Total float64 `bson:"total"`
		Count int     `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	total := 0.0
	for _, row := range rows {
		total += row.Total
	}
	breakdown := make([]CategoryBreakdown, 0, len(rows))
	for _, row := range rows {
		percent := 0.0
		if total > 0 {
			percent = row.Total / total
		}
		label := row.ID
		if label == "" {
			label = "Other"
		}
		breakdown = append(breakdown, CategoryBreakdown{
			Category: label,
			Total:    row.Total,
			Count:    row.Count,
			Percent:  percent,
		})
	}
	return breakdown, nil
}

func bucketTotals(ctx context.Context, col *mongo.Collection, userID primitive.ObjectID, start, end time.Time, format string) (map[string]float64, error) {
	cursor, err := col.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"userId": userID, "date": bson.M{"$gte": start, "$lt": end}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": format, "date": "$date"}},
			"total": bson.M{"$sum": "$amount"},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var rows []struct {
		ID    string  `bson:"_id"`
		Total float64 `bson:"total"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[string]float64, len(rows))
	for _, row := range rows {
		out[row.ID] = row.Total
	}
	return out, nil
}

func (s *AnalyticsService) recentTransactions(ctx context.Context, userID primitive.ObjectID) ([]TransactionItem, error) {
	expenses, _, err := s.expenses.List(ctx, userID, repositories.ExpenseFilter{Page: 1, Limit: 5, SortBy: "date", SortOrder: "desc"})
	if err != nil {
		return nil, err
	}
	incomes, _, err := s.income.List(ctx, userID, repositories.IncomeFilter{Page: 1, Limit: 5})
	if err != nil {
		return nil, err
	}
	items := make([]TransactionItem, 0, len(expenses)+len(incomes))
	for _, expense := range expenses {
		title := expense.Note
		if title == "" {
			title = expense.Category
		}
		items = append(items, TransactionItem{
			ID:       expense.ID.Hex(),
			Type:     "expense",
			Title:    title,
			Category: expense.Category,
			Amount:   expense.Amount,
			Currency: expense.Currency,
			Date:     expense.Date,
		})
	}
	for _, income := range incomes {
		title := income.Source
		if title == "" {
			title = income.Category
		}
		items = append(items, TransactionItem{
			ID:       income.ID.Hex(),
			Type:     "income",
			Title:    title,
			Category: income.Category,
			Amount:   income.Amount,
			Currency: income.Currency,
			Date:     income.Date,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Date.After(items[j].Date)
	})
	if len(items) > 10 {
		items = items[:10]
	}
	return items, nil
}

func (s *AnalyticsService) budgetAlerts(ctx context.Context, userID primitive.ObjectID, monthKey string, monthlyTotal float64, breakdown []CategoryBreakdown) ([]BudgetAlert, error) {
	budgets, err := s.budgets.ListActiveForMonth(ctx, userID, monthKey)
	if err != nil {
		return nil, err
	}
	spentByCategory := make(map[string]float64, len(breakdown))
	for _, item := range breakdown {
		spentByCategory[item.Category] = item.Total
	}
	alerts := make([]BudgetAlert, 0, len(budgets))
	for _, budget := range budgets {
		spent := spentByCategory[budget.Category]
		if budget.Category == "__total__" {
			spent = monthlyTotal
		}
		percent := 0.0
		if budget.Amount > 0 {
			percent = spent / budget.Amount
		}
		status := "ok"
		if percent >= 1 {
			status = "over"
		} else if percent >= budget.AlertThreshold {
			status = "warn"
		}
		if status == "ok" {
			continue
		}
		alerts = append(alerts, BudgetAlert{
			BudgetID:  budget.ID.Hex(),
			Category:  budget.Category,
			Limit:     budget.Amount,
			Spent:     spent,
			Remaining: budget.Amount - spent,
			Percent:   percent,
			Status:    status,
			Threshold: budget.AlertThreshold,
		})
	}
	return alerts, nil
}

func buildInsights(expenseTotal, incomeTotal float64, expenseCount int, alerts []BudgetAlert) []string {
	insights := make([]string, 0, 4)
	if incomeTotal > 0 {
		rate := (incomeTotal - expenseTotal) / incomeTotal
		insights = append(insights, fmt.Sprintf("Savings rate is %.1f%% for this period.", rate*100))
	}
	if expenseCount > 0 {
		insights = append(insights, fmt.Sprintf("Average transaction size is %.2f.", expenseTotal/float64(expenseCount)))
	}
	if len(alerts) > 0 {
		insights = append(insights, fmt.Sprintf("%d budget alert(s) need attention.", len(alerts)))
	}
	if len(insights) == 0 {
		insights = append(insights, "Add income, expenses, and budgets to unlock financial insights.")
	}
	return insights
}

func savingsPercentage(incomeTotal, expenseTotal float64) float64 {
	if incomeTotal <= 0 {
		return 0
	}
	return (incomeTotal - expenseTotal) / incomeTotal
}
