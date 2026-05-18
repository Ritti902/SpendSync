package handlers

import (
	"expensemania-backend/internal/auth"
	"expensemania-backend/internal/config"
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/types"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	service   *services.AuthService
	validator *validators.Validator
	cfg       config.Config
}

func NewAuthHandler(service *services.AuthService, validator *validators.Validator, cfg config.Config) *AuthHandler {
	return &AuthHandler{service: service, validator: validator, cfg: cfg}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req types.RegisterRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	result, err := h.service.Register(c.UserContext(), req, c.Get(fiber.HeaderUserAgent), c.IP())
	if err != nil {
		return err
	}
	auth.SetTokenCookies(c, h.cfg, result.AccessToken, result.RefreshToken)
	return utils.JSON(c, fiber.StatusCreated, result)
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req types.LoginRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	result, err := h.service.Login(c.UserContext(), req, c.Get(fiber.HeaderUserAgent), c.IP())
	if err != nil {
		return err
	}
	auth.SetTokenCookies(c, h.cfg, result.AccessToken, result.RefreshToken)
	return utils.JSON(c, fiber.StatusOK, result)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	id, err := userID(c)
	if err != nil {
		return err
	}
	user, err := h.service.Me(c.UserContext(), id)
	if err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"user": user})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req types.RefreshRequest
	_ = c.BodyParser(&req)
	refreshToken := req.RefreshToken
	if refreshToken == "" {
		refreshToken = c.Cookies(auth.RefreshCookieName)
	}
	if refreshToken == "" {
		return utils.Unauthorized("Missing refresh token")
	}
	result, err := h.service.Refresh(c.UserContext(), refreshToken, c.Get(fiber.HeaderUserAgent), c.IP())
	if err != nil {
		return err
	}
	auth.SetTokenCookies(c, h.cfg, result.AccessToken, result.RefreshToken)
	return utils.JSON(c, fiber.StatusOK, result)
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req types.RefreshRequest
	_ = c.BodyParser(&req)
	refreshToken := req.RefreshToken
	if refreshToken == "" {
		refreshToken = c.Cookies(auth.RefreshCookieName)
	}
	if err := h.service.Logout(c.UserContext(), refreshToken); err != nil {
		return err
	}
	auth.ClearTokenCookies(c, h.cfg)
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"message": "Logged out"})
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req types.ForgotPasswordRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	if err := h.service.ForgotPassword(c.UserContext(), req); err != nil {
		return err
	}
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"message": "If that email exists, a reset link has been sent"})
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req types.ResetPasswordRequest
	if err := parseBody(c, h.validator, &req); err != nil {
		return err
	}
	if err := h.service.ResetPassword(c.UserContext(), req); err != nil {
		return err
	}
	auth.ClearTokenCookies(c, h.cfg)
	return utils.JSON(c, fiber.StatusOK, fiber.Map{"message": "Password has been reset"})
}
