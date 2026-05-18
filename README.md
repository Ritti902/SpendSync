# SpendSync

SpendSync is a full-stack expense tracker and personal finance management web app built with React, TypeScript, Go, Fiber, MongoDB, and Docker. It helps users manage expenses, income, budgets, and categories through a modern dashboard with secure JWT-based authentication.

![SpendSync dashboard preview](SpendSync-frontend/public/spending.png)

## Features

- JWT authentication with access and refresh token flows
- Expense and income tracking
- Budget management
- Category management
- Dashboard analytics and history views
- Responsive UI built with Tailwind CSS
- Dockerized local services for MongoDB, Redis, and MailHog

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Zustand

### Backend
- Go
- Fiber
- MongoDB
- JWT authentication
- Redis

### Dev Tools
- Docker Compose
- MailHog

## Project Structure

```text
.
|-- SpendSync-frontend/
|-- SpendSync-backend/
|-- docker-compose.yml
|-- README.md
`-- .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- Go 1.22+
- Docker Desktop

### 1. Clone the repository

```bash
git clone https://github.com/your-username/SpendSync.git
cd SpendSync
```

### 2. Configure environment variables

Create real `.env` files from the examples:

- `SpendSync-frontend/.env.example` -> `SpendSync-frontend/.env`
- `SpendSync-backend/.env.example` -> `SpendSync-backend/.env`

Important frontend variables:

```env
VITE_API_URL=
VITE_PROXY_TARGET=http://localhost:8080
```

Important backend variables:

```env
APP_ENV=development
PORT=8080
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=expensemania
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

### 3. Install dependencies

Frontend:

```bash
cd SpendSync-frontend
npm install
```

Backend:

```bash
cd ../SpendSync-backend
go mod download
```

### 4. Start local services

From the project root:

```bash
docker compose up -d mongodb redis mailhog
```

### 5. Run the backend

```bash
cd SpendSync-backend
go run ./cmd/api
```

The API runs at `http://localhost:8080`.

### 6. Run the frontend

In a new terminal:

```bash
cd SpendSync-frontend
npm run dev
```

The frontend runs at `http://localhost:5173`.

### 7. Optional: run backend services with Docker Compose

The current `docker-compose.yml` includes MongoDB, Redis, MailHog, and the Go backend service. The frontend is not containerized in this setup, so it still runs with Vite locally.

```bash
docker compose up --build backend
```

## Available Commands

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

### Backend

```bash
go run ./cmd/api
```

## API Notes

- Base API prefix: `/api/v1`
- Health check: `GET /api/v1/health`
- Additional API documentation: `SpendSync-backend/docs/API.md`

## Docker Services

- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`
- MailHog SMTP: `localhost:1025`
- MailHog UI: `http://localhost:8025`

## GitHub Upload Notes

- Do not commit `.env` files
- Do not commit `node_modules`, `dist`, or `build`
- Commit `.env.example` files so others know what to configure

## License

This project is intended for learning, development, and portfolio use.
