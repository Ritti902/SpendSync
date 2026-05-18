# ExpenseMania API

Base URL:

- Local: `http://localhost:8080/api/v1`
- Render: `https://YOUR-RENDER-URL.onrender.com/api/v1`

All protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

## Health

`GET /health`

```json
{
  "status": "ok",
  "message": "ExpenseMania API running"
}
```

## Auth

`POST /auth/register`

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "User Name",
  "currencyPreference": "INR",
  "timezone": "Asia/Kolkata"
}
```

Returns `token`, `accessToken`, `refreshToken`, and `user`.

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

`POST /auth/refresh`

```json
{
  "refreshToken": "<refreshToken>"
}
```

`POST /auth/logout`

```json
{
  "refreshToken": "<refreshToken>"
}
```

`GET /auth/me`

## User

`GET /user/profile`

`PUT /user/profile`

```json
{
  "name": "Updated Name",
  "avatar": "https://example.com/avatar.png",
  "currencyPreference": "INR",
  "timezone": "Asia/Kolkata"
}
```

## Expenses

`GET /expenses`

Query filters: `from`, `to`, `category`, `search`, `paymentMethod`, `tags`, `minAmount`, `maxAmount`, `page`, `limit`, `sortBy`, `sortOrder`.

`POST /expenses`

```json
{
  "amount": 499.5,
  "category": "food",
  "subcategory": "dining",
  "note": "Dinner",
  "date": "2026-05-09T10:30:00Z",
  "currency": "INR",
  "tags": ["friends"],
  "paymentMethod": "upi",
  "merchant": "Local Cafe"
}
```

`GET /expenses/:id`

`PUT /expenses/:id`

`DELETE /expenses/:id`

`GET /expenses/export?format=csv`

`GET /expenses/export?format=json`

## Budgets

`GET /budgets`

`POST /budgets`

```json
{
  "category": "__total__",
  "amount": 25000,
  "period": "monthly",
  "recurring": true,
  "startMonth": "2026-05",
  "endMonth": null,
  "alertThreshold": 0.8
}
```

`PUT /budgets/:id`

`DELETE /budgets/:id`

## Income

`GET /income`

Query filters: `from`, `to`, `category`, `source`, `search`, `minAmount`, `maxAmount`, `page`, `limit`, `sortBy`, `sortOrder`.

`POST /income`

```json
{
  "amount": 85000,
  "source": "Salary",
  "category": "salary",
  "date": "2026-05-01T00:00:00Z",
  "currency": "INR"
}
```

`PUT /income/:id`

`GET /income/:id`

`DELETE /income/:id`

## Categories

`GET /categories?type=expense`

`POST /categories`

```json
{
  "name": "Education",
  "type": "expense",
  "icon": "book-open",
  "color": "#38bdf8"
}
```

`DELETE /categories/:id`

`PUT /categories/:id`

## Recurring Expenses

`GET /recurring-expenses?activeOnly=true`

`POST /recurring-expenses`

```json
{
  "amount": 999,
  "category": "bills",
  "note": "Internet",
  "frequency": "monthly",
  "interval": 1,
  "startDate": "2026-05-09T00:00:00Z",
  "active": true
}
```

`PUT /recurring-expenses/:id`

`DELETE /recurring-expenses/:id`

## Analytics

`GET /dashboard`

Returns balance, monthly spending, income, savings, recent transactions, spending chart data, category breakdown, budget alerts, and insights.

`GET /analytics/monthly?year=2026&month=5`

`GET /analytics/weekly?date=2026-05-09`

`GET /analytics/yearly?year=2026`
