package repositories

import (
	"context"
	"regexp"
	"strings"
	"time"

	"expensemania-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ExpenseRepository struct {
	col *mongo.Collection
}

type ExpenseFilter struct {
	From          *time.Time
	To            *time.Time
	Category      string
	Search        string
	PaymentMethod string
	Tags          []string
	MinAmount     *float64
	MaxAmount     *float64
	Page          int
	Limit         int
	SortBy        string
	SortOrder     string
}

func NewExpenseRepository(db *mongo.Database) *ExpenseRepository {
	return &ExpenseRepository{col: db.Collection("expenses")}
}

func (r *ExpenseRepository) Collection() *mongo.Collection {
	return r.col
}

func (r *ExpenseRepository) Create(ctx context.Context, expense *models.Expense) error {
	result, err := r.col.InsertOne(ctx, expense)
	if err != nil {
		return err
	}
	expense.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ExpenseRepository) List(ctx context.Context, userID primitive.ObjectID, filter ExpenseFilter) ([]models.Expense, int64, error) {
	query := expenseQuery(userID, filter)
	total, err := r.col.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	sort := expenseSort(filter.SortBy, filter.SortOrder)
	findOptions := options.Find().
		SetSort(sort).
		SetSkip(int64((filter.Page - 1) * filter.Limit)).
		SetLimit(int64(filter.Limit))
	cursor, err := r.col.Find(ctx, query, findOptions)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var expenses []models.Expense
	if err := cursor.All(ctx, &expenses); err != nil {
		return nil, 0, err
	}
	return expenses, total, nil
}

func (r *ExpenseRepository) FindByID(ctx context.Context, userID, id primitive.ObjectID) (models.Expense, error) {
	var expense models.Expense
	err := r.col.FindOne(ctx, bson.M{"_id": id, "userId": userID}).Decode(&expense)
	return expense, err
}

func (r *ExpenseRepository) Update(ctx context.Context, userID, id primitive.ObjectID, update bson.M) (models.Expense, error) {
	update["updatedAt"] = time.Now().UTC()
	var expense models.Expense
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "userId": userID},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&expense)
	return expense, err
}

func (r *ExpenseRepository) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	result, err := r.col.DeleteOne(ctx, bson.M{"_id": id, "userId": userID})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}

func expenseQuery(userID primitive.ObjectID, filter ExpenseFilter) bson.M {
	query := bson.M{"userId": userID}
	if filter.Category != "" {
		query["category"] = filter.Category
	}
	if filter.PaymentMethod != "" {
		query["paymentMethod"] = filter.PaymentMethod
	}
	if len(filter.Tags) > 0 {
		query["tags"] = bson.M{"$all": filter.Tags}
	}
	if filter.From != nil || filter.To != nil {
		date := bson.M{}
		if filter.From != nil {
			date["$gte"] = *filter.From
		}
		if filter.To != nil {
			date["$lte"] = *filter.To
		}
		query["date"] = date
	}
	if filter.MinAmount != nil || filter.MaxAmount != nil {
		amount := bson.M{}
		if filter.MinAmount != nil {
			amount["$gte"] = *filter.MinAmount
		}
		if filter.MaxAmount != nil {
			amount["$lte"] = *filter.MaxAmount
		}
		query["amount"] = amount
	}
	if strings.TrimSpace(filter.Search) != "" {
		pattern := regexp.QuoteMeta(strings.TrimSpace(filter.Search))
		query["$or"] = []bson.M{
			{"note": bson.M{"$regex": pattern, "$options": "i"}},
			{"category": bson.M{"$regex": pattern, "$options": "i"}},
			{"subcategory": bson.M{"$regex": pattern, "$options": "i"}},
			{"merchant": bson.M{"$regex": pattern, "$options": "i"}},
			{"tags": bson.M{"$regex": pattern, "$options": "i"}},
		}
	}
	return query
}

func expenseSort(sortBy, order string) bson.D {
	sortBy = strings.ToLower(strings.TrimSpace(sortBy))
	switch sortBy {
	case "newest":
		sortBy, order = "date", "desc"
	case "oldest":
		sortBy, order = "date", "asc"
	case "highest", "highest_amount":
		sortBy, order = "amount", "desc"
	case "lowest", "lowest_amount":
		sortBy, order = "amount", "asc"
	}
	allowed := map[string]string{
		"date":          "date",
		"amount":        "amount",
		"category":      "category",
		"createdat":     "createdAt",
		"paymentMethod": "paymentMethod",
		"paymentmethod": "paymentMethod",
	}
	field, ok := allowed[sortBy]
	if !ok {
		field = "date"
	}
	direction := -1
	if strings.EqualFold(order, "asc") {
		direction = 1
	}
	return bson.D{{Key: field, Value: direction}}
}
