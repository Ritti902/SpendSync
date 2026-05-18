package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"expensemania-backend/internal/config"
	"expensemania-backend/internal/database"
	"expensemania-backend/internal/handlers"
	"expensemania-backend/internal/mailer"
	appmiddleware "expensemania-backend/internal/middleware"
	"expensemania-backend/internal/repositories"
	"expensemania-backend/internal/routes"
	"expensemania-backend/internal/services"
	"expensemania-backend/internal/utils"
	"expensemania-backend/internal/validators"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	mongoDB, err := database.Connect(ctx, cfg)
	if err != nil {
		logger.Error("database_connect_failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if err := mongoDB.Client.Disconnect(shutdownCtx); err != nil {
			logger.Error("database_disconnect_failed", "error", err)
		}
	}()

	tokenMaker := utils.NewTokenMaker(cfg.JWTAccessSecret, cfg.JWTRefreshSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	validator := validators.New()

	userRepo := repositories.NewUserRepository(mongoDB.DB)
	expenseRepo := repositories.NewExpenseRepository(mongoDB.DB)
	budgetRepo := repositories.NewBudgetRepository(mongoDB.DB)
	incomeRepo := repositories.NewIncomeRepository(mongoDB.DB)
	categoryRepo := repositories.NewCategoryRepository(mongoDB.DB)
	recurringRepo := repositories.NewRecurringRepository(mongoDB.DB)
	sessionRepo := repositories.NewSessionRepository(mongoDB.DB)
	resetRepo := repositories.NewPasswordResetRepository(mongoDB.DB)
	smtpMailer := mailer.New(cfg)

	authService := services.NewAuthService(userRepo, sessionRepo, resetRepo, smtpMailer, tokenMaker, cfg)
	userService := services.NewUserService(userRepo)
	expenseService := services.NewExpenseService(expenseRepo, cfg)
	budgetService := services.NewBudgetService(budgetRepo, cfg)
	incomeService := services.NewIncomeService(incomeRepo, cfg)
	categoryService := services.NewCategoryService(categoryRepo)
	recurringService := services.NewRecurringService(recurringRepo, cfg)
	analyticsService := services.NewAnalyticsService(expenseRepo, incomeRepo, budgetRepo)

	if err := categoryService.SeedDefaults(context.Background()); err != nil {
		logger.Warn("default_category_seed_failed", "error", err)
	}

	app := fiber.New(fiber.Config{
		AppName:      "SpendSync API",
		ErrorHandler: utils.ErrorHandler,
		BodyLimit:    2 * 1024 * 1024,
	})

	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(helmet.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(cfg.CORSAllowedOrigins, ","),
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-CSRF-Token",
		AllowCredentials: true,
		MaxAge:           3600,
	}))
	app.Use(limiter.New(limiter.Config{
		Max:        cfg.RateLimitMax,
		Expiration: cfg.RateLimitWindow,
	}))
	app.Use(appmiddleware.RequestLogger(logger))

	authMiddleware := appmiddleware.Auth(tokenMaker)
	routes.Register(app, routes.Handlers{
		Auth:       handlers.NewAuthHandler(authService, validator, cfg),
		User:       handlers.NewUserHandler(userService, validator),
		Expenses:   handlers.NewExpenseHandler(expenseService, validator),
		Budgets:    handlers.NewBudgetHandler(budgetService, validator),
		Income:     handlers.NewIncomeHandler(incomeService, validator),
		Categories: handlers.NewCategoryHandler(categoryService, validator),
		Recurring:  handlers.NewRecurringHandler(recurringService, validator),
		Analytics:  handlers.NewAnalyticsHandler(analyticsService),
	}, authMiddleware)

	go func() {
		addr := ":" + cfg.Port
		logger.Info("server_starting", "addr", addr, "env", cfg.AppEnv)
		if err := app.Listen(addr); err != nil {
			logger.Error("server_listen_failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	logger.Info("server_shutdown_started")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		logger.Error("server_shutdown_failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server_shutdown_complete")
}
