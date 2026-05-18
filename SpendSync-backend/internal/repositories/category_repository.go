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

type CategoryRepository struct {
	col *mongo.Collection
}

func NewCategoryRepository(db *mongo.Database) *CategoryRepository {
	return &CategoryRepository{col: db.Collection("categories")}
}

func (r *CategoryRepository) Create(ctx context.Context, category *models.Category) error {
	result, err := r.col.InsertOne(ctx, category)
	if err != nil {
		return err
	}
	category.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *CategoryRepository) ExistsVisibleSlug(ctx context.Context, userID primitive.ObjectID, slug, categoryType string, excludeID *primitive.ObjectID) (bool, error) {
	query := bson.M{
		"slug": slug,
		"type": categoryType,
		"$or": []bson.M{
			{"isDefault": true},
			{"userId": userID},
		},
	}
	if excludeID != nil {
		query["_id"] = bson.M{"$ne": *excludeID}
	}
	count, err := r.col.CountDocuments(ctx, query)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *CategoryRepository) List(ctx context.Context, userID primitive.ObjectID, categoryType string) ([]models.Category, error) {
	query := bson.M{
		"$or": []bson.M{
			{"isDefault": true},
			{"userId": userID},
		},
	}
	if categoryType != "" {
		query["type"] = categoryType
	}
	cursor, err := r.col.Find(ctx, query, options.Find().SetSort(bson.D{{Key: "isDefault", Value: -1}, {Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var categories []models.Category
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, err
	}
	return categories, nil
}

func (r *CategoryRepository) FindByID(ctx context.Context, userID, id primitive.ObjectID) (models.Category, error) {
	var category models.Category
	err := r.col.FindOne(ctx, bson.M{"_id": id, "userId": userID, "isDefault": false}).Decode(&category)
	return category, err
}

func (r *CategoryRepository) Update(ctx context.Context, userID, id primitive.ObjectID, update bson.M) (models.Category, error) {
	update["updatedAt"] = time.Now().UTC()
	var category models.Category
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "userId": userID, "isDefault": false},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&category)
	return category, err
}

func (r *CategoryRepository) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	result, err := r.col.DeleteOne(ctx, bson.M{"_id": id, "userId": userID, "isDefault": false})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}

func (r *CategoryRepository) UpsertDefaults(ctx context.Context, categories []models.Category) error {
	for _, category := range categories {
		now := time.Now().UTC()
		category.CreatedAt = now
		category.UpdatedAt = now
		_, err := r.col.UpdateOne(
			ctx,
			bson.M{"slug": category.Slug, "type": category.Type, "isDefault": true},
			bson.M{
				"$set": bson.M{
					"name":      category.Name,
					"icon":      category.Icon,
					"color":     category.Color,
					"updatedAt": category.UpdatedAt,
				},
				"$setOnInsert": bson.M{
					"slug":      category.Slug,
					"type":      category.Type,
					"isDefault": category.IsDefault,
					"createdAt": category.CreatedAt,
				},
			},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			return err
		}
	}
	return nil
}
