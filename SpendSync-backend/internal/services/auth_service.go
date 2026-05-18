package services

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"time"

	"expensemania-backend/internal/config"
	"expensemania-backend/internal/mailer"
	"expensemania-backend/internal/models"
	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type AuthService struct {
	users    *repositories.UserRepository
	sessions *repositories.SessionRepository
	resets   *repositories.PasswordResetRepository
	mailer   *mailer.Mailer
	tokens   utils.TokenMaker
	cfg      config.Config
}

type AuthResult struct {
	User                 types.UserResponse `json:"user"`
	Token                string             `json:"token"`
	AccessToken          string             `json:"accessToken"`
	RefreshToken         string             `json:"refreshToken"`
	AccessTokenExpiresAt time.Time          `json:"accessTokenExpiresAt"`
}

func NewAuthService(
	users *repositories.UserRepository,
	sessions *repositories.SessionRepository,
	resets *repositories.PasswordResetRepository,
	mailer *mailer.Mailer,
	tokens utils.TokenMaker,
	cfg config.Config,
) *AuthService {
	return &AuthService{
		users:    users,
		sessions: sessions,
		resets:   resets,
		mailer:   mailer,
		tokens:   tokens,
		cfg:      cfg,
	}
}

func (s *AuthService) Register(ctx context.Context, req types.RegisterRequest, userAgent, ip string) (AuthResult, error) {
	email := utils.NormalizeEmail(req.Email)
	username := strings.TrimSpace(req.Username)
	if username == "" {
		username = strings.TrimSpace(req.Name)
	}
	if username == "" {
		username = strings.Split(email, "@")[0]
	}

	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return AuthResult{}, utils.Conflict("Email already registered")
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return AuthResult{}, err
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return AuthResult{}, err
	}
	now := time.Now().UTC()
	currency := strings.ToUpper(strings.TrimSpace(req.CurrencyPreference))
	if currency == "" {
		currency = s.cfg.DefaultCurrency
	}
	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" {
		timezone = s.cfg.DefaultTimezone
	}
	user := models.User{
		Username:           username,
		Email:              email,
		PasswordHash:       hash,
		CurrencyPreference: currency,
		Timezone:           timezone,
		ThemePreference:    "system",
		Provider:           "password",
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := s.users.Create(ctx, &user); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return AuthResult{}, utils.Conflict("Email already registered")
		}
		return AuthResult{}, err
	}
	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Login(ctx context.Context, req types.LoginRequest, userAgent, ip string) (AuthResult, error) {
	email := utils.NormalizeEmail(req.Email)
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return AuthResult{}, utils.Unauthorized("Invalid credentials")
		}
		return AuthResult{}, err
	}
	if !utils.ComparePassword(user.PasswordHash, req.Password) {
		return AuthResult{}, utils.Unauthorized("Invalid credentials")
	}
	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Me(ctx context.Context, userID primitive.ObjectID) (types.UserResponse, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return types.UserResponse{}, utils.NotFound("User")
		}
		return types.UserResponse{}, err
	}
	return types.NewUserResponse(user), nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken, userAgent, ip string) (AuthResult, error) {
	claims, err := s.tokens.ValidateRefresh(refreshToken)
	if err != nil {
		return AuthResult{}, utils.Unauthorized("Invalid refresh token")
	}
	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return AuthResult{}, utils.Unauthorized("Invalid refresh token")
	}
	tokenHash := utils.HashToken(refreshToken)
	session, err := s.sessions.FindActiveByTokenHash(ctx, tokenHash, time.Now().UTC())
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return AuthResult{}, utils.Unauthorized("Refresh token has expired or was revoked")
		}
		return AuthResult{}, err
	}
	if session.UserID != userID {
		return AuthResult{}, utils.Unauthorized("Invalid refresh token")
	}
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return AuthResult{}, utils.Unauthorized("Invalid refresh token")
		}
		return AuthResult{}, err
	}
	if err := s.sessions.RevokeByTokenHash(ctx, tokenHash); err != nil {
		return AuthResult{}, err
	}
	return s.issueTokens(ctx, user, userAgent, ip)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	return s.sessions.RevokeByTokenHash(ctx, utils.HashToken(refreshToken))
}

func (s *AuthService) ForgotPassword(ctx context.Context, req types.ForgotPasswordRequest) error {
	email := utils.NormalizeEmail(req.Email)
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil
		}
		return err
	}
	rawToken, err := utils.SecureToken(40)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	if err := s.resets.Create(ctx, &models.PasswordResetToken{
		UserID:    user.ID,
		Email:     user.Email,
		TokenHash: utils.HashToken(rawToken),
		CreatedAt: now,
		ExpiresAt: now.Add(30 * time.Minute),
	}); err != nil {
		return err
	}
	resetURL, err := s.resetURL(rawToken)
	if err != nil {
		return err
	}
	return s.mailer.SendPasswordReset(user.Email, resetURL)
}

func (s *AuthService) ResetPassword(ctx context.Context, req types.ResetPasswordRequest) error {
	reset, err := s.resets.FindActiveByHash(ctx, utils.HashToken(req.Token), time.Now().UTC())
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return utils.BadRequest("Reset token is invalid or expired", nil)
		}
		return err
	}
	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}
	if err := s.users.UpdatePassword(ctx, reset.UserID, hash); err != nil {
		return err
	}
	if err := s.resets.MarkUsed(ctx, reset.ID); err != nil {
		return err
	}
	if err := s.resets.InvalidateForUser(ctx, reset.UserID); err != nil {
		return err
	}
	return s.sessions.RevokeAllForUser(ctx, reset.UserID)
}

func (s *AuthService) issueTokens(ctx context.Context, user models.User, userAgent, ip string) (AuthResult, error) {
	pair, err := s.tokens.CreatePair(user.ID, user.Email)
	if err != nil {
		return AuthResult{}, err
	}
	now := time.Now().UTC()
	if err := s.sessions.Create(ctx, &models.Session{
		UserID:           user.ID,
		RefreshTokenHash: utils.HashToken(pair.RefreshToken),
		UserAgent:        userAgent,
		IPAddress:        ip,
		CreatedAt:        now,
		ExpiresAt:        pair.RefreshTokenExpiresAt,
	}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{
		User:                 types.NewUserResponse(user),
		Token:                pair.AccessToken,
		AccessToken:          pair.AccessToken,
		RefreshToken:         pair.RefreshToken,
		AccessTokenExpiresAt: pair.AccessTokenExpiresAt,
	}, nil
}

func (s *AuthService) resetURL(token string) (string, error) {
	base, err := url.Parse(s.cfg.FrontendURL)
	if err != nil {
		return "", err
	}
	base.Path = "/reset-password"
	q := base.Query()
	q.Set("token", token)
	base.RawQuery = q.Encode()
	return base.String(), nil
}
