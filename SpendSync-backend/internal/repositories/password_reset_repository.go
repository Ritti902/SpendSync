package repositories

import (
	"context"
	"time"

	"expensemania-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type PasswordResetRepository struct {
	col *mongo.Collection
}

func NewPasswordResetRepository(db *mongo.Database) *PasswordResetRepository {
	return &PasswordResetRepository{col: db.Collection("password_reset_tokens")}
}

func (r *PasswordResetRepository) Create(ctx context.Context, token *models.PasswordResetToken) error {
	result, err := r.col.InsertOne(ctx, token)
	if err != nil {
		return err
	}
	token.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *PasswordResetRepository) FindActiveByHash(ctx context.Context, tokenHash string, now time.Time) (models.PasswordResetToken, error) {
	var token models.PasswordResetToken
	err := r.col.FindOne(ctx, bson.M{
		"tokenHash": tokenHash,
		"expiresAt": bson.M{"$gt": now},
		"usedAt":    bson.M{"$exists": false},
	}).Decode(&token)
	return token, err
}

func (r *PasswordResetRepository) MarkUsed(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"usedAt": now}})
	return err
}

func (r *PasswordResetRepository) InvalidateForUser(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateMany(ctx, bson.M{
		"userId": userID,
		"usedAt": bson.M{"$exists": false},
	}, bson.M{"$set": bson.M{"usedAt": now}})
	return err
}
