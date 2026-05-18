package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username           string             `bson:"username" json:"username"`
	Email              string             `bson:"email" json:"email"`
	PasswordHash       string             `bson:"passwordHash" json:"-"`
	Avatar             string             `bson:"avatar,omitempty" json:"avatar,omitempty"`
	CurrencyPreference string             `bson:"currencyPreference" json:"currencyPreference"`
	Timezone           string             `bson:"timezone" json:"timezone"`
	ThemePreference    string             `bson:"themePreference" json:"themePreference"`
	Provider           string             `bson:"provider" json:"provider"`
	RefreshTokens      []RefreshToken     `bson:"refreshTokens,omitempty" json:"-"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}
