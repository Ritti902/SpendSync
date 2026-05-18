package services

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"expensemania-backend/internal/models"
	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type CategoryService struct {
	categories *repositories.CategoryRepository
}

var hexColorPattern = regexp.MustCompile(`^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`)

func NewCategoryService(categories *repositories.CategoryRepository) *CategoryService {
	return &CategoryService{categories: categories}
}

func (s *CategoryService) SeedDefaults(ctx context.Context) error {
	return s.categories.UpsertDefaults(ctx, defaultCategories())
}

func (s *CategoryService) List(ctx context.Context, userID primitive.ObjectID, categoryType string) ([]models.Category, error) {
	return s.categories.List(ctx, userID, categoryType)
}

func (s *CategoryService) Create(ctx context.Context, userID primitive.ObjectID, req types.CategoryRequest) (models.Category, error) {
	now := time.Now().UTC()
	slug := strings.TrimSpace(req.Slug)
	if slug == "" {
		slug = slugify(req.Name)
	} else {
		slug = slugify(slug)
	}
	if slug == "" {
		return models.Category{}, utils.BadRequest("Invalid category name", nil)
	}
	exists, err := s.categories.ExistsVisibleSlug(ctx, userID, slug, req.Type, nil)
	if err != nil {
		return models.Category{}, err
	}
	if exists {
		return models.Category{}, utils.BadRequest("Category already exists", nil)
	}
	parentID, err := optionalObjectID(req.ParentID)
	if err != nil {
		return models.Category{}, utils.BadRequest("Invalid parent category id", nil)
	}
	color, err := normalizeCategoryColor(req.Color)
	if err != nil {
		return models.Category{}, err
	}
	category := models.Category{
		UserID:    &userID,
		Name:      utils.CleanString(req.Name),
		Slug:      slug,
		Type:      req.Type,
		Icon:      utils.CleanString(req.Icon),
		Color:     color,
		ParentID:  parentID,
		IsDefault: false,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if category.Icon == "" {
		category.Icon = "🏷️"
	}
	if err := s.categories.Create(ctx, &category); err != nil {
		return models.Category{}, err
	}
	return category, nil
}

func (s *CategoryService) Update(ctx context.Context, userID, id primitive.ObjectID, req types.CategoryUpdateRequest) (models.Category, error) {
	current, err := s.categories.FindByID(ctx, userID, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Category{}, utils.NotFound("Category")
		}
		return models.Category{}, err
	}
	nextType := current.Type
	if req.Type != nil {
		nextType = *req.Type
	}
	nextSlug := current.Slug
	if req.Slug != nil {
		nextSlug = slugify(*req.Slug)
	} else if req.Name != nil {
		nextSlug = slugify(*req.Name)
	}
	if nextSlug == "" {
		return models.Category{}, utils.BadRequest("Invalid category name", nil)
	}
	exists, err := s.categories.ExistsVisibleSlug(ctx, userID, nextSlug, nextType, &id)
	if err != nil {
		return models.Category{}, err
	}
	if exists {
		return models.Category{}, utils.BadRequest("Category already exists", nil)
	}

	update := bson.M{"slug": nextSlug, "type": nextType}
	if req.Name != nil {
		update["name"] = utils.CleanString(*req.Name)
	}
	if req.Icon != nil {
		icon := utils.CleanString(*req.Icon)
		if icon == "" {
			icon = "🏷️"
		}
		update["icon"] = icon
	}
	if req.Color != nil {
		color, err := normalizeCategoryColor(*req.Color)
		if err != nil {
			return models.Category{}, err
		}
		update["color"] = color
	}
	if req.ParentID != nil {
		parentID, err := optionalObjectID(*req.ParentID)
		if err != nil {
			return models.Category{}, utils.BadRequest("Invalid parent category id", nil)
		}
		update["parentId"] = parentID
	}

	category, err := s.categories.Update(ctx, userID, id, update)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Category{}, utils.NotFound("Category")
		}
		return models.Category{}, err
	}
	return category, nil
}

func (s *CategoryService) Delete(ctx context.Context, userID, id primitive.ObjectID) (int64, error) {
	deleted, err := s.categories.Delete(ctx, userID, id)
	if err != nil {
		return 0, err
	}
	if deleted == 0 {
		return 0, utils.NotFound("Category")
	}
	return deleted, nil
}

func normalizeCategoryColor(color string) (string, error) {
	color = utils.CleanString(color)
	if color == "" {
		return "#38bdf8", nil
	}
	if !hexColorPattern.MatchString(color) {
		return "", utils.BadRequest("Invalid category color", nil)
	}
	return color, nil
}

func slugify(value string) string {
	cleaned := strings.ToLower(strings.TrimSpace(value))
	cleaned = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '-' || r == '_':
			return '-'
		case r == ' ':
			return '-'
		default:
			return -1
		}
	}, cleaned)
	for strings.Contains(cleaned, "--") {
		cleaned = strings.ReplaceAll(cleaned, "--", "-")
	}
	return strings.Trim(cleaned, "-")
}

func optionalObjectID(raw string) (*primitive.ObjectID, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	id, err := primitive.ObjectIDFromHex(raw)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func defaultCategories() []models.Category {
	return []models.Category{
		{Name: "Food", Slug: "food", Type: "expense", Icon: "🍜", Color: "#fb7185", IsDefault: true},
		{Name: "Transport", Slug: "transport", Type: "expense", Icon: "🚕", Color: "#38bdf8", IsDefault: true},
		{Name: "Shopping", Slug: "shopping", Type: "expense", Icon: "🛍️", Color: "#f472b6", IsDefault: true},
		{Name: "Bills", Slug: "bills", Type: "expense", Icon: "🧾", Color: "#facc15", IsDefault: true},
		{Name: "Entertainment", Slug: "entertainment", Type: "expense", Icon: "🎉", Color: "#c084fc", IsDefault: true},
		{Name: "Health", Slug: "health", Type: "expense", Icon: "💊", Color: "#4ade80", IsDefault: true},
		{Name: "Education", Slug: "education", Type: "expense", Icon: "📚", Color: "#60a5fa", IsDefault: true},
		{Name: "Travel", Slug: "travel", Type: "expense", Icon: "✈️", Color: "#2dd4bf", IsDefault: true},
		{Name: "Other", Slug: "other", Type: "expense", Icon: "✨", Color: "#818cf8", IsDefault: true},
		{Name: "Salary", Slug: "salary", Type: "income", Icon: "💼", Color: "#22c55e", IsDefault: true},
		{Name: "Freelance", Slug: "freelance", Type: "income", Icon: "💻", Color: "#06b6d4", IsDefault: true},
		{Name: "Investments", Slug: "investments", Type: "income", Icon: "📈", Color: "#a3e635", IsDefault: true},
		{Name: "Business", Slug: "business", Type: "income", Icon: "🏢", Color: "#14b8a6", IsDefault: true},
		{Name: "Gifts", Slug: "gifts", Type: "income", Icon: "🎁", Color: "#f59e0b", IsDefault: true},
		{Name: "Other", Slug: "other", Type: "income", Icon: "✨", Color: "#818cf8", IsDefault: true},
	}
}
