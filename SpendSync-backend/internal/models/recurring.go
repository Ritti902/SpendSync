package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RecurringExpense struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID        primitive.ObjectID `bson:"userId" json:"userId"`
	Amount        float64            `bson:"amount" json:"amount"`
	Category      string             `bson:"category" json:"category"`
	Subcategory   string             `bson:"subcategory,omitempty" json:"subcategory,omitempty"`
	Note          string             `bson:"note" json:"note"`
	Currency      string             `bson:"currency" json:"currency"`
	PaymentMethod string             `bson:"paymentMethod,omitempty" json:"paymentMethod,omitempty"`
	Tags          []string           `bson:"tags,omitempty" json:"tags,omitempty"`
	Frequency     string             `bson:"frequency" json:"frequency"`
	Interval      int                `bson:"interval" json:"interval"`
	StartDate     time.Time          `bson:"startDate" json:"startDate"`
	EndDate       *time.Time         `bson:"endDate,omitempty" json:"endDate,omitempty"`
	NextRunAt     time.Time          `bson:"nextRunAt" json:"nextRunAt"`
	Active        bool               `bson:"active" json:"active"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
}
