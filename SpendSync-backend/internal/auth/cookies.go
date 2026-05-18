package auth

import (
	"time"

	"expensemania-backend/internal/config"

	"github.com/gofiber/fiber/v2"
)

const (
	AccessCookieName  = "access_token"
	RefreshCookieName = "refresh_token"
)

func SetTokenCookies(c *fiber.Ctx, cfg config.Config, accessToken, refreshToken string) {
	setCookie(c, cfg, AccessCookieName, accessToken, cfg.AccessTokenTTL)
	setCookie(c, cfg, RefreshCookieName, refreshToken, cfg.RefreshTokenTTL)
}

func ClearTokenCookies(c *fiber.Ctx, cfg config.Config) {
	expired := time.Now().Add(-time.Hour)
	for _, name := range []string{AccessCookieName, RefreshCookieName} {
		c.Cookie(&fiber.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			Expires:  expired,
			MaxAge:   -1,
			HTTPOnly: true,
			Secure:   cfg.CookieSecure,
			SameSite: fiber.CookieSameSiteLaxMode,
		})
	}
}

func setCookie(c *fiber.Ctx, cfg config.Config, name, value string, ttl time.Duration) {
	sameSite := fiber.CookieSameSiteLaxMode
	if cfg.CookieSecure {
		sameSite = fiber.CookieSameSiteNoneMode
	}
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		Expires:  time.Now().UTC().Add(ttl),
		MaxAge:   int(ttl.Seconds()),
		HTTPOnly: true,
		Secure:   cfg.CookieSecure,
		SameSite: sameSite,
	})
}
