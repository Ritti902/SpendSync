package services

import (
	"context"
	"errors"
	"strings"

	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserService struct {
	users *repositories.UserRepository
}

func NewUserService(users *repositories.UserRepository) *UserService {
	return &UserService{users: users}
}

func (s *UserService) GetProfile(ctx context.Context, userID primitive.ObjectID) (types.UserResponse, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.UserResponse{}, utils.NotFound("User")
		}
		return types.UserResponse{}, err
	}
	return types.NewUserResponse(user), nil
}

func (s *UserService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req types.UpdateProfileRequest) (types.UserResponse, error) {
	update := bson.M{}
	if req.Username != "" {
		update["username"] = strings.TrimSpace(req.Username)
	}
	if req.Name != "" {
		update["username"] = strings.TrimSpace(req.Name)
	}
	if req.Avatar != "" {
		update["avatar"] = strings.TrimSpace(req.Avatar)
	}
	if req.CurrencyPreference != "" {
		update["currencyPreference"] = strings.ToUpper(strings.TrimSpace(req.CurrencyPreference))
	}
	if req.Timezone != "" {
		update["timezone"] = strings.TrimSpace(req.Timezone)
	}
	if req.ThemePreference != "" {
		update["themePreference"] = strings.TrimSpace(req.ThemePreference)
	}
	if len(update) == 0 {
		return s.GetProfile(ctx, userID)
	}
	user, err := s.users.UpdateProfile(ctx, userID, update)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.UserResponse{}, utils.NotFound("User")
		}
		return types.UserResponse{}, err
	}
	return types.NewUserResponse(user), nil
}
