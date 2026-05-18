package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Category struct {
	ID        primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID    *primitive.ObjectID `bson:"userId,omitempty" json:"userId,omitempty"`
	Name      string              `bson:"name" json:"name"`
	Slug      string              `bson:"slug" json:"slug"`
	Type      string              `bson:"type" json:"type"`
	Icon      string              `bson:"icon" json:"icon"`
	Color     string              `bson:"color" json:"color"`
	ParentID  *primitive.ObjectID `bson:"parentId,omitempty" json:"parentId,omitempty"`
	IsDefault bool                `bson:"isDefault" json:"isDefault"`
	CreatedAt time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time           `bson:"updatedAt" json:"updatedAt"`
}
