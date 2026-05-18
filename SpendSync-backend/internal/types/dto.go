package types

import (
	"time"

	"expensemania-backend/internal/models"
)

type UserResponse struct {
	ID                 string    `json:"id"`
	Username           string    `json:"username"`
	Name               string    `json:"name"`
	Email              string    `json:"email"`
	Avatar             string    `json:"avatar,omitempty"`
	CurrencyPreference string    `json:"currencyPreference"`
	Timezone           string    `json:"timezone"`
	ThemePreference    string    `json:"themePreference"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

func NewUserResponse(user models.User) UserResponse {
	return UserResponse{
		ID:                 user.ID.Hex(),
		Username:           user.Username,
		Name:               user.Username,
		Email:              user.Email,
		Avatar:             user.Avatar,
		CurrencyPreference: user.CurrencyPreference,
		Timezone:           user.Timezone,
		ThemePreference:    user.ThemePreference,
		CreatedAt:          user.CreatedAt,
		UpdatedAt:          user.UpdatedAt,
	}
}

type RegisterRequest struct {
	Username           string `json:"username" validate:"omitempty,min=1,max=80"`
	Name               string `json:"name" validate:"omitempty,min=1,max=80"`
	Email              string `json:"email" validate:"required,email,max=255"`
	Password           string `json:"password" validate:"required,min=8,max=200"`
	CurrencyPreference string `json:"currencyPreference" validate:"omitempty,len=3"`
	Timezone           string `json:"timezone" validate:"omitempty,max=80"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,max=200"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

type UpdateProfileRequest struct {
	Username           string `json:"username" validate:"omitempty,min=1,max=80"`
	Name               string `json:"name" validate:"omitempty,min=1,max=80"`
	Avatar             string `json:"avatar" validate:"omitempty,max=500"`
	CurrencyPreference string `json:"currencyPreference" validate:"omitempty,len=3"`
	Timezone           string `json:"timezone" validate:"omitempty,max=80"`
	ThemePreference    string `json:"themePreference" validate:"omitempty,oneof=light dark system"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email,max=255"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required,min=32,max=512"`
	NewPassword string `json:"newPassword" validate:"required,min=8,max=200"`
}

type ExpenseRequest struct {
	Amount        float64  `json:"amount" validate:"required,gt=0,lte=1000000000"`
	Category      string   `json:"category" validate:"required,min=1,max=80"`
	Subcategory   string   `json:"subcategory" validate:"omitempty,max=80"`
	Note          string   `json:"note" validate:"omitempty,max=280"`
	Date          string   `json:"date" validate:"omitempty"`
	Currency      string   `json:"currency" validate:"omitempty,len=3"`
	ExchangeRate  float64  `json:"exchangeRate" validate:"omitempty,gt=0"`
	Tags          []string `json:"tags" validate:"omitempty,dive,max=40"`
	PaymentMethod string   `json:"paymentMethod" validate:"omitempty,max=80"`
	Merchant      string   `json:"merchant" validate:"omitempty,max=120"`
	IsRecurring   bool     `json:"isRecurring"`
}

type ExpenseUpdateRequest struct {
	Amount        *float64  `json:"amount" validate:"omitempty,gt=0,lte=1000000000"`
	Category      *string   `json:"category" validate:"omitempty,min=1,max=80"`
	Subcategory   *string   `json:"subcategory" validate:"omitempty,max=80"`
	Note          *string   `json:"note" validate:"omitempty,max=280"`
	Date          *string   `json:"date" validate:"omitempty"`
	Currency      *string   `json:"currency" validate:"omitempty,len=3"`
	ExchangeRate  *float64  `json:"exchangeRate" validate:"omitempty,gt=0"`
	Tags          *[]string `json:"tags" validate:"omitempty,dive,max=40"`
	PaymentMethod *string   `json:"paymentMethod" validate:"omitempty,max=80"`
	Merchant      *string   `json:"merchant" validate:"omitempty,max=120"`
	IsRecurring   *bool     `json:"isRecurring"`
}

type ExpenseResponse struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId,omitempty"`
	Amount        float64   `json:"amount"`
	Category      string    `json:"category"`
	Subcategory   string    `json:"subcategory,omitempty"`
	Note          string    `json:"note"`
	Date          time.Time `json:"date"`
	Currency      string    `json:"currency,omitempty"`
	ExchangeRate  float64   `json:"exchangeRate,omitempty"`
	Tags          []string  `json:"tags,omitempty"`
	PaymentMethod string    `json:"paymentMethod,omitempty"`
	Merchant      string    `json:"merchant,omitempty"`
	IsRecurring   bool      `json:"isRecurring"`
	CreatedAt     time.Time `json:"createdAt,omitempty"`
	UpdatedAt     time.Time `json:"updatedAt,omitempty"`
}

func NewExpenseResponse(expense models.Expense) ExpenseResponse {
	return ExpenseResponse{
		ID:            expense.ID.Hex(),
		UserID:        expense.UserID.Hex(),
		Amount:        expense.Amount,
		Category:      expense.Category,
		Subcategory:   expense.Subcategory,
		Note:          expense.Note,
		Date:          expense.Date,
		Currency:      expense.Currency,
		ExchangeRate:  expense.ExchangeRate,
		Tags:          expense.Tags,
		PaymentMethod: expense.PaymentMethod,
		Merchant:      expense.Merchant,
		IsRecurring:   expense.IsRecurring,
		CreatedAt:     expense.CreatedAt,
		UpdatedAt:     expense.UpdatedAt,
	}
}

func NewExpenseResponses(expenses []models.Expense) []ExpenseResponse {
	out := make([]ExpenseResponse, 0, len(expenses))
	for _, expense := range expenses {
		out = append(out, NewExpenseResponse(expense))
	}
	return out
}

type BudgetRequest struct {
	Category       string  `json:"category" validate:"required,min=1,max=80"`
	Amount         float64 `json:"amount" validate:"required,gt=0,lte=1000000000"`
	Period         string  `json:"period" validate:"omitempty,oneof=monthly"`
	Recurring      bool    `json:"recurring"`
	StartMonth     string  `json:"startMonth" validate:"required,month"`
	EndMonth       *string `json:"endMonth" validate:"omitempty,month"`
	AlertThreshold float64 `json:"alertThreshold" validate:"omitempty,gte=0,lte=1"`
	Currency       string  `json:"currency" validate:"omitempty,len=3"`
}

type BudgetUpdateRequest struct {
	Category       *string  `json:"category" validate:"omitempty,min=1,max=80"`
	Amount         *float64 `json:"amount" validate:"omitempty,gt=0,lte=1000000000"`
	Period         *string  `json:"period" validate:"omitempty,oneof=monthly"`
	Recurring      *bool    `json:"recurring"`
	StartMonth     *string  `json:"startMonth" validate:"omitempty,month"`
	EndMonth       *string  `json:"endMonth" validate:"omitempty,month"`
	AlertThreshold *float64 `json:"alertThreshold" validate:"omitempty,gte=0,lte=1"`
	Currency       *string  `json:"currency" validate:"omitempty,len=3"`
}

type BudgetResponse struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId,omitempty"`
	Category       string    `json:"category"`
	Amount         float64   `json:"amount"`
	Period         string    `json:"period"`
	Recurring      bool      `json:"recurring"`
	StartMonth     string    `json:"startMonth"`
	EndMonth       *string   `json:"endMonth"`
	AlertThreshold float64   `json:"alertThreshold"`
	Currency       string    `json:"currency,omitempty"`
	CreatedAt      time.Time `json:"createdAt,omitempty"`
	UpdatedAt      time.Time `json:"updatedAt,omitempty"`
}

func NewBudgetResponse(budget models.Budget) BudgetResponse {
	return BudgetResponse{
		ID:             budget.ID.Hex(),
		UserID:         budget.UserID.Hex(),
		Category:       budget.Category,
		Amount:         budget.Amount,
		Period:         budget.Period,
		Recurring:      budget.Recurring,
		StartMonth:     budget.StartMonth,
		EndMonth:       budget.EndMonth,
		AlertThreshold: budget.AlertThreshold,
		Currency:       budget.Currency,
		CreatedAt:      budget.CreatedAt,
		UpdatedAt:      budget.UpdatedAt,
	}
}

func NewBudgetResponses(budgets []models.Budget) []BudgetResponse {
	out := make([]BudgetResponse, 0, len(budgets))
	for _, budget := range budgets {
		out = append(out, NewBudgetResponse(budget))
	}
	return out
}

type IncomeRequest struct {
	Amount       float64  `json:"amount" validate:"required,gt=0,lte=1000000000"`
	Source       string   `json:"source" validate:"required,min=1,max=120"`
	Category     string   `json:"category" validate:"omitempty,max=80"`
	Note         string   `json:"note" validate:"omitempty,max=280"`
	Date         string   `json:"date" validate:"omitempty"`
	Currency     string   `json:"currency" validate:"omitempty,len=3"`
	ExchangeRate float64  `json:"exchangeRate" validate:"omitempty,gt=0"`
	Tags         []string `json:"tags" validate:"omitempty,dive,max=40"`
	IsRecurring  bool     `json:"isRecurring"`
}

type IncomeUpdateRequest struct {
	Amount       *float64  `json:"amount" validate:"omitempty,gt=0,lte=1000000000"`
	Source       *string   `json:"source" validate:"omitempty,min=1,max=120"`
	Category     *string   `json:"category" validate:"omitempty,max=80"`
	Note         *string   `json:"note" validate:"omitempty,max=280"`
	Date         *string   `json:"date" validate:"omitempty"`
	Currency     *string   `json:"currency" validate:"omitempty,len=3"`
	ExchangeRate *float64  `json:"exchangeRate" validate:"omitempty,gt=0"`
	Tags         *[]string `json:"tags" validate:"omitempty,dive,max=40"`
	IsRecurring  *bool     `json:"isRecurring"`
}

type IncomeResponse struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId,omitempty"`
	Amount       float64   `json:"amount"`
	Source       string    `json:"source"`
	Category     string    `json:"category"`
	Note         string    `json:"note"`
	Date         time.Time `json:"date"`
	Currency     string    `json:"currency"`
	ExchangeRate float64   `json:"exchangeRate"`
	Tags         []string  `json:"tags,omitempty"`
	IsRecurring  bool      `json:"isRecurring"`
	CreatedAt    time.Time `json:"createdAt,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt,omitempty"`
}

func NewIncomeResponse(income models.Income) IncomeResponse {
	return IncomeResponse{
		ID:           income.ID.Hex(),
		UserID:       income.UserID.Hex(),
		Amount:       income.Amount,
		Source:       income.Source,
		Category:     income.Category,
		Note:         income.Note,
		Date:         income.Date,
		Currency:     income.Currency,
		ExchangeRate: income.ExchangeRate,
		Tags:         income.Tags,
		IsRecurring:  income.IsRecurring,
		CreatedAt:    income.CreatedAt,
		UpdatedAt:    income.UpdatedAt,
	}
}

func NewIncomeResponses(incomes []models.Income) []IncomeResponse {
	out := make([]IncomeResponse, 0, len(incomes))
	for _, income := range incomes {
		out = append(out, NewIncomeResponse(income))
	}
	return out
}

type CategoryRequest struct {
	Name     string `json:"name" validate:"required,min=1,max=80"`
	Slug     string `json:"slug" validate:"omitempty,min=1,max=80"`
	Type     string `json:"type" validate:"required,oneof=expense income"`
	Icon     string `json:"icon" validate:"omitempty,max=20"`
	Color    string `json:"color" validate:"omitempty,max=40"`
	ParentID string `json:"parentId" validate:"omitempty"`
}

type CategoryUpdateRequest struct {
	Name     *string `json:"name" validate:"omitempty,min=1,max=80"`
	Slug     *string `json:"slug" validate:"omitempty,min=1,max=80"`
	Type     *string `json:"type" validate:"omitempty,oneof=expense income"`
	Icon     *string `json:"icon" validate:"omitempty,max=20"`
	Color    *string `json:"color" validate:"omitempty,max=40"`
	ParentID *string `json:"parentId" validate:"omitempty"`
}

type RecurringExpenseRequest struct {
	Amount        float64  `json:"amount" validate:"required,gt=0,lte=1000000000"`
	Category      string   `json:"category" validate:"required,min=1,max=80"`
	Subcategory   string   `json:"subcategory" validate:"omitempty,max=80"`
	Note          string   `json:"note" validate:"omitempty,max=280"`
	Currency      string   `json:"currency" validate:"omitempty,len=3"`
	PaymentMethod string   `json:"paymentMethod" validate:"omitempty,max=80"`
	Tags          []string `json:"tags" validate:"omitempty,dive,max=40"`
	Frequency     string   `json:"frequency" validate:"required,oneof=daily weekly monthly yearly"`
	Interval      int      `json:"interval" validate:"omitempty,gte=1,lte=24"`
	StartDate     string   `json:"startDate" validate:"omitempty"`
	EndDate       *string  `json:"endDate" validate:"omitempty"`
	Active        *bool    `json:"active" validate:"omitempty"`
}
