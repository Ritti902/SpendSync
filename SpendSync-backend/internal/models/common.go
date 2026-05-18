package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RefreshToken struct {
	TokenHash string     `bson:"tokenHash" json:"-"`
	UserAgent string     `bson:"userAgent,omitempty" json:"userAgent,omitempty"`
	IPAddress string     `bson:"ipAddress,omitempty" json:"ipAddress,omitempty"`
	CreatedAt time.Time  `bson:"createdAt" json:"createdAt"`
	ExpiresAt time.Time  `bson:"expiresAt" json:"expiresAt"`
	RevokedAt *time.Time `bson:"revokedAt,omitempty" json:"revokedAt,omitempty"`
}

type Money struct {
	Amount   float64 `bson:"amount" json:"amount"`
	Currency string  `bson:"currency" json:"currency"`
}

func ObjectIDHex(id primitive.ObjectID) string {
	if id.IsZero() {
		return ""
	}
	return id.Hex()
}
