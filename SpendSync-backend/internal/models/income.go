package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Income struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID  `bson:"userId" json:"userId"`
	Amount       float64             `bson:"amount" json:"amount"`
	Source       string              `bson:"source" json:"source"`
	Category     string              `bson:"category" json:"category"`
	Note         string              `bson:"note" json:"note"`
	Date         time.Time           `bson:"date" json:"date"`
	Currency     string              `bson:"currency" json:"currency"`
	ExchangeRate float64             `bson:"exchangeRate" json:"exchangeRate"`
	Tags         []string            `bson:"tags,omitempty" json:"tags,omitempty"`
	IsRecurring  bool                `bson:"isRecurring" json:"isRecurring"`
	RecurringID  *primitive.ObjectID `bson:"recurringId,omitempty" json:"recurringId,omitempty"`
	CreatedAt    time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time           `bson:"updatedAt" json:"updatedAt"`
}
