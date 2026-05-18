package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TokenClaims struct {
	UserID string `json:"sub"`
	Email  string `json:"email"`
	Type   string `json:"typ"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken           string    `json:"accessToken"`
	RefreshToken          string    `json:"refreshToken"`
	Token                 string    `json:"token"`
	AccessTokenExpiresAt  time.Time `json:"accessTokenExpiresAt"`
	RefreshTokenExpiresAt time.Time `json:"refreshTokenExpiresAt"`
}

type TokenMaker struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewTokenMaker(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) TokenMaker {
	return TokenMaker{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (m TokenMaker) CreatePair(userID primitive.ObjectID, email string) (TokenPair, error) {
	now := time.Now().UTC()
	accessExpires := now.Add(m.accessTTL)
	refreshExpires := now.Add(m.refreshTTL)

	access, err := m.sign(userID.Hex(), email, "access", accessExpires, m.accessSecret)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, err := m.sign(userID.Hex(), email, "refresh", refreshExpires, m.refreshSecret)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken:           access,
		RefreshToken:          refresh,
		Token:                 access,
		AccessTokenExpiresAt:  accessExpires,
		RefreshTokenExpiresAt: refreshExpires,
	}, nil
}

func (m TokenMaker) ValidateAccess(tokenString string) (*TokenClaims, error) {
	return m.validate(tokenString, "access", m.accessSecret)
}

func (m TokenMaker) ValidateRefresh(tokenString string) (*TokenClaims, error) {
	return m.validate(tokenString, "refresh", m.refreshSecret)
}

func (m TokenMaker) sign(userID, email, tokenType string, expiresAt time.Time, secret []byte) (string, error) {
	claims := TokenClaims{
		UserID: userID,
		Email:  email,
		Type:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
			ID:        primitive.NewObjectID().Hex(),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

func (m TokenMaker) validate(tokenString, expectedType string, secret []byte) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (any, error) {
		return secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid || claims.Type != expectedType {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
