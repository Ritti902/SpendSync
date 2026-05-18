package database

import (
	"context"
	"errors"
	"time"

	"expensemania-backend/internal/config"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Mongo struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func Connect(ctx context.Context, cfg config.Config) (*Mongo, error) {
	if cfg.MongoURI == "" {
		return nil, errors.New("MONGODB_URI is required")
	}
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		return nil, err
	}
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	db := client.Database(cfg.MongoDBName)
	if err := ensureIndexes(ctx, db); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	return &Mongo{Client: client, DB: db}, nil
}

func ensureIndexes(ctx context.Context, db *mongo.Database) error {
	indexes := map[string][]mongo.IndexModel{
		"users": {
			{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetSparse(true)},
			{Keys: bson.D{{Key: "refreshTokens.tokenHash", Value: 1}}},
		},
		"sessions": {
			{Keys: bson.D{{Key: "refreshTokenHash", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "revokedAt", Value: 1}}},
			{Keys: bson.D{{Key: "expiresAt", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(0)},
		},
		"password_reset_tokens": {
			{Keys: bson.D{{Key: "tokenHash", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "usedAt", Value: 1}}},
			{Keys: bson.D{{Key: "expiresAt", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(0)},
		},
		"expenses": {
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "category", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "amount", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "paymentMethod", Value: 1}}},
			{Keys: bson.D{{Key: "note", Value: "text"}, {Key: "merchant", Value: "text"}, {Key: "tags", Value: "text"}}},
		},
		"income": {
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "category", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "source", Value: 1}, {Key: "date", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "amount", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "source", Value: "text"}, {Key: "note", Value: "text"}, {Key: "tags", Value: "text"}}},
		},
		"budgets": {
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "category", Value: 1}, {Key: "startMonth", Value: 1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}},
		},
		"categories": {
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "slug", Value: 1}, {Key: "type", Value: 1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "isDefault", Value: 1}, {Key: "type", Value: 1}}},
		},
		"recurring_expenses": {
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "active", Value: 1}, {Key: "nextRunAt", Value: 1}}},
		},
		"notifications": {
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "read", Value: 1}, {Key: "createdAt", Value: -1}}},
		},
		"settings": {
			{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
	}

	for collection, models := range indexes {
		indexCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		_, err := db.Collection(collection).Indexes().CreateMany(indexCtx, models)
		cancel()
		if err != nil {
			return err
		}
	}
	return nil
}
