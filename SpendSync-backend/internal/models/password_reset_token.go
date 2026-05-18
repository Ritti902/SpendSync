package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PasswordResetToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	Email     string             `bson:"email" json:"email"`
	TokenHash string             `bson:"tokenHash" json:"-"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	ExpiresAt time.Time          `bson:"expiresAt" json:"expiresAt"`
	UsedAt    *time.Time         `bson:"usedAt,omitempty" json:"usedAt,omitempty"`
}
