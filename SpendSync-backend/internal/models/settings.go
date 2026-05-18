package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Settings struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID             primitive.ObjectID `bson:"userId" json:"userId"`
	CurrencyPreference string             `bson:"currencyPreference" json:"currencyPreference"`
	Timezone           string             `bson:"timezone" json:"timezone"`
	WeekStartsOn       string             `bson:"weekStartsOn" json:"weekStartsOn"`
	BudgetAlerts       bool               `bson:"budgetAlerts" json:"budgetAlerts"`
	MonthlyReports     bool               `bson:"monthlyReports" json:"monthlyReports"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}
