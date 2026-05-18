package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Budget struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID         primitive.ObjectID `bson:"userId" json:"userId"`
	Category       string             `bson:"category" json:"category"`
	Amount         float64            `bson:"amount" json:"amount"`
	Period         string             `bson:"period" json:"period"`
	Recurring      bool               `bson:"recurring" json:"recurring"`
	StartMonth     string             `bson:"startMonth" json:"startMonth"`
	EndMonth       *string            `bson:"endMonth,omitempty" json:"endMonth,omitempty"`
	AlertThreshold float64            `bson:"alertThreshold" json:"alertThreshold"`
	Currency       string             `bson:"currency" json:"currency"`
	CreatedAt      time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt" json:"updatedAt"`
}
