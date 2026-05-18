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

type RecurringRepository struct {
	col *mongo.Collection
}

func NewRecurringRepository(db *mongo.Database) *RecurringRepository {
	return &RecurringRepository{col: db.Collection("recurring_expenses")}
}

func (r *RecurringRepository) Create(ctx context.Context, recurring *models.RecurringExpense) error {
	result, err := r.col.InsertOne(ctx, recurring)
	if err != nil {
		return err
	}
	recurring.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *RecurringRepository) List(ctx context.Context, userID primitive.ObjectID, activeOnly bool) ([]models.RecurringExpense, error) {
	query := bson.M{"userId": userID}
	if activeOnly {
		query["active"] = true
	}
	cursor, err := r.col.Find(ctx, query, options.Find().SetSort(bson.D{{Key: "nextRunAt", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var recurring []models.RecurringExpense
	if err := cursor.All(ctx, &recurring); err != nil {
		return nil, err
	}
	return recurring, nil
}

func (r *RecurringRepository) Update(ctx context.Context, userID, id primitive.ObjectID, update bson.M) (models.RecurringExpense, error) {
	update["updatedAt"] = time.Now().UTC()
	var recurring models.RecurringExpense
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "userId": userID},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&recurring)
	return recurring, err
}

func (r *RecurringRepository) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	result, err := r.col.DeleteOne(ctx, bson.M{"_id": id, "userId": userID})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}

func NextRun(start time.Time, frequency string, interval int) time.Time {
	if interval < 1 {
		interval = 1
	}
	switch frequency {
	case "daily":
		return start.AddDate(0, 0, interval)
	case "weekly":
		return start.AddDate(0, 0, 7*interval)
	case "yearly":
		return start.AddDate(interval, 0, 0)
	default:
		return start.AddDate(0, interval, 0)
	}
}
