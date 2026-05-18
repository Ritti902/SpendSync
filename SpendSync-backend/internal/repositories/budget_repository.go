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

type BudgetRepository struct {
	col *mongo.Collection
}

func NewBudgetRepository(db *mongo.Database) *BudgetRepository {
	return &BudgetRepository{col: db.Collection("budgets")}
}

func (r *BudgetRepository) Collection() *mongo.Collection {
	return r.col
}

func (r *BudgetRepository) Create(ctx context.Context, budget *models.Budget) error {
	result, err := r.col.InsertOne(ctx, budget)
	if err != nil {
		return err
	}
	budget.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *BudgetRepository) List(ctx context.Context, userID primitive.ObjectID) ([]models.Budget, error) {
	cursor, err := r.col.Find(ctx, bson.M{"userId": userID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var budgets []models.Budget
	if err := cursor.All(ctx, &budgets); err != nil {
		return nil, err
	}
	return budgets, nil
}

func (r *BudgetRepository) ListActiveForMonth(ctx context.Context, userID primitive.ObjectID, monthKey string) ([]models.Budget, error) {
	query := bson.M{
		"userId":     userID,
		"startMonth": bson.M{"$lte": monthKey},
		"$or": []bson.M{
			{"recurring": false, "startMonth": monthKey},
			{"recurring": true, "$or": []bson.M{
				{"endMonth": bson.M{"$exists": false}},
				{"endMonth": nil},
				{"endMonth": ""},
				{"endMonth": bson.M{"$gte": monthKey}},
			}},
		},
	}
	cursor, err := r.col.Find(ctx, query, options.Find().SetSort(bson.D{{Key: "category", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var budgets []models.Budget
	if err := cursor.All(ctx, &budgets); err != nil {
		return nil, err
	}
	return budgets, nil
}

func (r *BudgetRepository) Update(ctx context.Context, userID, id primitive.ObjectID, update bson.M) (models.Budget, error) {
	update["updatedAt"] = time.Now().UTC()
	var budget models.Budget
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "userId": userID},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&budget)
	return budget, err
}

func (r *BudgetRepository) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	result, err := r.col.DeleteOne(ctx, bson.M{"_id": id, "userId": userID})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}
