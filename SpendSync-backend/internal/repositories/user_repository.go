package repositories

import (
	"context"
	"time"

	"expensemania-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepository struct {
	col *mongo.Collection
}

func NewUserRepository(db *mongo.Database) *UserRepository {
	return &UserRepository{col: db.Collection("users")}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	result, err := r.col.InsertOne(ctx, user)
	if err != nil {
		return err
	}
	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	return user, err
}

func (r *UserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (models.User, error) {
	var user models.User
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	return user, err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, id primitive.ObjectID, update bson.M) (models.User, error) {
	update["updatedAt"] = time.Now().UTC()
	var user models.User
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&user)
	return user, err
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id primitive.ObjectID, passwordHash string) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"passwordHash": passwordHash,
			"updatedAt":    now,
		},
	})
	return err
}

func (r *UserRepository) AddRefreshToken(ctx context.Context, id primitive.ObjectID, token models.RefreshToken) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$push": bson.M{"refreshTokens": token},
		"$set":  bson.M{"updatedAt": time.Now().UTC()},
	})
	return err
}

func (r *UserRepository) HasActiveRefreshToken(ctx context.Context, id primitive.ObjectID, tokenHash string, now time.Time) (bool, error) {
	count, err := r.col.CountDocuments(ctx, bson.M{
		"_id": id,
		"refreshTokens": bson.M{
			"$elemMatch": bson.M{
				"tokenHash": tokenHash,
				"expiresAt": bson.M{"$gt": now},
				"revokedAt": bson.M{"$exists": false},
			},
		},
	})
	return count > 0, err
}

func (r *UserRepository) RevokeRefreshToken(ctx context.Context, id primitive.ObjectID, tokenHash string) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{
		"_id":                     id,
		"refreshTokens.tokenHash": tokenHash,
		"refreshTokens.revokedAt": bson.M{"$exists": false},
	}, bson.M{
		"$set": bson.M{
			"refreshTokens.$.revokedAt": now,
			"updatedAt":                 now,
		},
	})
	return err
}

func (r *UserRepository) RevokeAllRefreshTokens(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"refreshTokens.$[].revokedAt": now,
			"updatedAt":                   now,
		},
	})
	return err
}
