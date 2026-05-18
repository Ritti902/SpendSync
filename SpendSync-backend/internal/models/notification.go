package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Notification struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	Type      string             `bson:"type" json:"type"`
	Title     string             `bson:"title" json:"title"`
	Message   string             `bson:"message" json:"message"`
	Read      bool               `bson:"read" json:"read"`
	Metadata  map[string]any     `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}
