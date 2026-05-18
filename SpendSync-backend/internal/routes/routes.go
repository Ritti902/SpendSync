package routes

import (
	"expensemania-backend/internal/handlers"

	"github.com/gofiber/fiber/v2"
)

type Handlers struct {
	Auth       *handlers.AuthHandler
	User       *handlers.UserHandler
	Expenses   *handlers.ExpenseHandler
	Budgets    *handlers.BudgetHandler
	Income     *handlers.IncomeHandler
	Categories *handlers.CategoryHandler
	Recurring  *handlers.RecurringHandler
	Analytics  *handlers.AnalyticsHandler
}

func Register(app *fiber.App, h Handlers, auth fiber.Handler) {
	app.Get("/", handlers.Health)
	registerAuthRoutes(app.Group("/auth"), h, auth)

	v1 := app.Group("/api/v1")
	v1.Get("/health", handlers.Health)

	registerAuthRoutes(v1.Group("/auth"), h, auth)

	user := v1.Group("/user", auth)
	user.Get("/profile", h.User.Profile)
	user.Put("/profile", h.User.UpdateProfile)
	user.Patch("/profile", h.User.UpdateProfile)

	expenses := v1.Group("/expenses", auth)
	expenses.Get("/", h.Expenses.List)
	expenses.Get("/export", h.Expenses.Export)
	expenses.Post("/", h.Expenses.Create)
	expenses.Get("/:id", h.Expenses.Get)
	expenses.Put("/:id", h.Expenses.Update)
	expenses.Patch("/:id", h.Expenses.Update)
	expenses.Delete("/:id", h.Expenses.Delete)

	income := v1.Group("/income", auth)
	income.Get("/", h.Income.List)
	income.Post("/", h.Income.Create)
	income.Get("/:id", h.Income.Get)
	income.Put("/:id", h.Income.Update)
	income.Patch("/:id", h.Income.Update)
	income.Delete("/:id", h.Income.Delete)

	budgets := v1.Group("/budgets", auth)
	budgets.Get("/", h.Budgets.List)
	budgets.Post("/", h.Budgets.Create)
	budgets.Put("/:id", h.Budgets.Update)
	budgets.Patch("/:id", h.Budgets.Update)
	budgets.Delete("/:id", h.Budgets.Delete)

	categories := v1.Group("/categories", auth)
	categories.Get("/", h.Categories.List)
	categories.Post("/", h.Categories.Create)
	categories.Put("/:id", h.Categories.Update)
	categories.Patch("/:id", h.Categories.Update)
	categories.Delete("/:id", h.Categories.Delete)

	recurring := v1.Group("/recurring-expenses", auth)
	recurring.Get("/", h.Recurring.List)
	recurring.Post("/", h.Recurring.Create)
	recurring.Put("/:id", h.Recurring.Update)
	recurring.Patch("/:id", h.Recurring.Update)
	recurring.Delete("/:id", h.Recurring.Delete)

	v1.Get("/dashboard", auth, h.Analytics.Dashboard)
	analytics := v1.Group("/analytics", auth)
	analytics.Get("/monthly", h.Analytics.Monthly)
	analytics.Get("/weekly", h.Analytics.Weekly)
	analytics.Get("/yearly", h.Analytics.Yearly)

	registerLegacyRoutes(app, h, auth)
}

func registerAuthRoutes(group fiber.Router, h Handlers, auth fiber.Handler) {
	group.Post("/register", h.Auth.Register)
	group.Post("/login", h.Auth.Login)
	group.Post("/logout", h.Auth.Logout)
	group.Post("/refresh", h.Auth.Refresh)
	group.Post("/forgot-password", h.Auth.ForgotPassword)
	group.Post("/reset-password", h.Auth.ResetPassword)
	group.Get("/me", auth, h.Auth.Me)
}

func registerLegacyRoutes(app *fiber.App, h Handlers, auth fiber.Handler) {
	legacy := app.Group("/api")
	legacy.Post("/auth/signup", h.Auth.Register)
	legacy.Post("/auth/register", h.Auth.Register)
	legacy.Post("/auth/login", h.Auth.Login)
	legacy.Post("/auth/forgot-password", h.Auth.ForgotPassword)
	legacy.Post("/auth/reset-password", h.Auth.ResetPassword)
	legacy.Get("/auth/me", auth, h.Auth.Me)
	legacy.Post("/auth/refresh", h.Auth.Refresh)
	legacy.Post("/auth/logout", h.Auth.Logout)

	legacy.Get("/expenses", auth, h.Expenses.List)
	legacy.Post("/expenses", auth, h.Expenses.Create)
	legacy.Put("/expenses", auth, h.Expenses.Update)
	legacy.Patch("/expenses", auth, h.Expenses.Update)
	legacy.Delete("/expenses", auth, h.Expenses.Delete)

	legacy.Get("/budgets", auth, h.Budgets.List)
	legacy.Post("/budgets", auth, h.Budgets.Create)
	legacy.Put("/budgets", auth, h.Budgets.Update)
	legacy.Patch("/budgets", auth, h.Budgets.Update)
	legacy.Delete("/budgets", auth, h.Budgets.Delete)
}
