package repositories

import (
	"context"
	"time"

	"expensemania-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type SessionRepository struct {
	col *mongo.Collection
}

func NewSessionRepository(db *mongo.Database) *SessionRepository {
	return &SessionRepository{col: db.Collection("sessions")}
}

func (r *SessionRepository) Create(ctx context.Context, session *models.Session) error {
	result, err := r.col.InsertOne(ctx, session)
	if err != nil {
		return err
	}
	session.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *SessionRepository) FindActiveByTokenHash(ctx context.Context, tokenHash string, now time.Time) (models.Session, error) {
	var session models.Session
	err := r.col.FindOne(ctx, bson.M{
		"refreshTokenHash": tokenHash,
		"expiresAt":        bson.M{"$gt": now},
		"revokedAt":        bson.M{"$exists": false},
	}).Decode(&session)
	return session, err
}

func (r *SessionRepository) RevokeByTokenHash(ctx context.Context, tokenHash string) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{
		"refreshTokenHash": tokenHash,
		"revokedAt":        bson.M{"$exists": false},
	}, bson.M{"$set": bson.M{"revokedAt": now}})
	return err
}

func (r *SessionRepository) RevokeAllForUser(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateMany(ctx, bson.M{
		"userId":    userID,
		"revokedAt": bson.M{"$exists": false},
	}, bson.M{"$set": bson.M{"revokedAt": now}})
	return err
}
