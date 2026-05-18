package middleware

import (
	"strings"

	"expensemania-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CurrentUserIDKey = "userID"
	CurrentEmailKey  = "email"
)

func Auth(tokens utils.TokenMaker) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := bearerToken(c.Get(fiber.HeaderAuthorization))
		if token == "" {
			token = c.Cookies("access_token")
		}
		if token == "" {
			return utils.Unauthorized("Missing authorization token")
		}
		claims, err := tokens.ValidateAccess(token)
		if err != nil {
			return utils.Unauthorized("Invalid or expired token")
		}
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			return utils.Unauthorized("Invalid token subject")
		}
		c.Locals(CurrentUserIDKey, userID)
		c.Locals(CurrentEmailKey, claims.Email)
		return c.Next()
	}
}

func UserID(c *fiber.Ctx) (primitive.ObjectID, error) {
	value := c.Locals(CurrentUserIDKey)
	userID, ok := value.(primitive.ObjectID)
	if !ok || userID.IsZero() {
		return primitive.NilObjectID, utils.Unauthorized("Unauthorized")
	}
	return userID, nil
}

func bearerToken(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
