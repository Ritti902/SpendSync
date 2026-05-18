import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import type {
  Budget,
  Category,
  AnalyticsSummary,
  DashboardSummary,
  Expense,
  Income,
  PaginatedExpenses,
  PaginatedIncome,
  User,
} from "@/lib/types";

type AuthResponse = {
  user: User;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
};

const API_PREFIX = "/api/v1";

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return API_PREFIX;
  const normalized = configured.replace(/\/$/, "");
  return /^https?:\/\//i.test(normalized) ? `${normalized}${API_PREFIX}` : `${normalized}${API_PREFIX}`;
}

const client = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<AuthResponse> | null = null;

export type ExpenseListParams = {
  page?: number;
  limit?: number;
  category?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type IncomeListParams = ExpenseListParams & {
  source?: string;
};

function cleanParams(params?: Record<string, string | number | undefined>) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = config?.url || "";
    const isAuthWrite = /\/auth\/(login|register|forgot-password|reset-password|logout|refresh)$/.test(url);
    if (status !== 401 || !config || config._retry || isAuthWrite) {
      return Promise.reject(toApiError(error));
    }
    config._retry = true;
    refreshPromise ??= client.post<AuthResponse>("/auth/refresh", {}).then((res) => res.data);
    try {
      await refreshPromise;
      return client(config);
    } finally {
      refreshPromise = null;
    }
  },
);

function toApiError(error: AxiosError) {
  if (error.code === "ECONNABORTED") {
    return new Error("The server took too long to respond");
  }
  if (error.code === "ERR_NETWORK") {
    return new Error("Unable to reach the API server");
  }
  const data = error.response?.data;
  if (data && typeof data === "object" && "error" in data) {
    return new Error(String((data as { error: unknown }).error));
  }
  if (error.message) return new Error(error.message);
  return new Error("Request failed");
}

export const api = {
  async register(payload: { email: string; password: string; name?: string }) {
    const { data } = await client.post<AuthResponse>("/auth/register", {
      email: payload.email,
      password: payload.password,
      name: payload.name,
      username: payload.name,
    });
    return data;
  },

  async signup(email: string, password: string, name?: string) {
    return api.register({ email, password, name });
  },

  async login(email: string, password: string) {
    const { data } = await client.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },

  async logout() {
    try {
      await client.post("/auth/logout", {});
    } catch {
      return;
    }
  },

  async me() {
    const { data } = await client.get<{ user: User }>("/auth/me");
    return data.user;
  },

  async forgotPassword(email: string) {
    const { data } = await client.post<{ message: string }>("/auth/forgot-password", { email });
    return data;
  },

  async resetPassword(token: string, newPassword: string) {
    const { data } = await client.post<{ message: string }>("/auth/reset-password", { token, newPassword });
    return data;
  },

  async updateProfile(payload: Partial<Pick<User, "name" | "username" | "avatar" | "currencyPreference" | "timezone" | "themePreference">>) {
    const { data } = await client.patch<{ user: User }>("/user/profile", payload);
    return data.user;
  },

  async listExpenses(params?: ExpenseListParams): Promise<Expense[]> {
    const { data } = await client.get<{ expenses: Expense[] }>("/expenses", { params: cleanParams(params) });
    return data.expenses ?? [];
  },

  async listExpenseHistory(params?: ExpenseListParams): Promise<PaginatedExpenses> {
    const { data } = await client.get<PaginatedExpenses>("/expenses", { params: cleanParams(params) });
    return data;
  },

  async createExpense(payload: {
    amount: number;
    category: string;
    note?: string;
    date?: string;
    isRecurring?: boolean;
  }): Promise<Expense> {
    const { data } = await client.post<{ expense: Expense }>("/expenses", payload);
    return data.expense;
  },

  async updateExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
    const { data } = await client.put<{ expense: Expense }>(`/expenses/${encodeURIComponent(id)}`, payload);
    return data.expense;
  },

  async deleteExpense(id: string) {
    const { data } = await client.delete<{ deleted: number }>(`/expenses/${encodeURIComponent(id)}`);
    return data.deleted;
  },

  async dashboard(): Promise<DashboardSummary> {
    const { data } = await client.get<DashboardSummary>("/dashboard");
    return data;
  },

  async monthlyAnalytics(params?: { year?: number; month?: number }): Promise<AnalyticsSummary> {
    const { data } = await client.get<AnalyticsSummary>("/analytics/monthly", { params: cleanParams(params) });
    return data;
  },

  async yearlyAnalytics(params?: { year?: number }): Promise<AnalyticsSummary> {
    const { data } = await client.get<AnalyticsSummary>("/analytics/yearly", { params: cleanParams(params) });
    return data;
  },

  async listIncome(params?: IncomeListParams): Promise<PaginatedIncome> {
    const { data } = await client.get<PaginatedIncome>("/income", { params: cleanParams(params) });
    return data;
  },

  async createIncome(payload: {
    amount: number;
    source: string;
    category?: string;
    note?: string;
    date?: string;
    isRecurring?: boolean;
  }): Promise<Income> {
    const { data } = await client.post<{ income: Income }>("/income", payload);
    return data.income;
  },

  async updateIncome(id: string, payload: Partial<Income>): Promise<Income> {
    const { data } = await client.put<{ income: Income }>(`/income/${encodeURIComponent(id)}`, payload);
    return data.income;
  },

  async deleteIncome(id: string): Promise<number> {
    const { data } = await client.delete<{ deleted: number }>(`/income/${encodeURIComponent(id)}`);
    return data.deleted;
  },

  async listCategories(type?: "expense" | "income"): Promise<Category[]> {
    const { data } = await client.get<{ categories: Category[] }>("/categories", { params: cleanParams({ type }) });
    return data.categories ?? [];
  },

  async createCategory(payload: {
    name: string;
    type: "expense" | "income";
    icon?: string;
    color?: string;
  }): Promise<Category> {
    const { data } = await client.post<{ category: Category }>("/categories", payload);
    return data.category;
  },

  async updateCategory(id: string, payload: Partial<Pick<Category, "name" | "slug" | "type" | "icon" | "color">>): Promise<Category> {
    const { data } = await client.put<{ category: Category }>(`/categories/${encodeURIComponent(id)}`, payload);
    return data.category;
  },

  async deleteCategory(id: string): Promise<number> {
    const { data } = await client.delete<{ deleted: number }>(`/categories/${encodeURIComponent(id)}`);
    return data.deleted;
  },

  async listBudgets(): Promise<Budget[]> {
    const { data } = await client.get<{ budgets: Budget[] }>("/budgets");
    return data.budgets ?? [];
  },

  async createBudget(payload: Omit<Budget, "id" | "userId" | "createdAt">): Promise<Budget> {
    const { data } = await client.post<{ budget: Budget }>("/budgets", payload);
    return data.budget;
  },

  async updateBudget(id: string, payload: Partial<Budget>): Promise<Budget> {
    const { data } = await client.put<{ budget: Budget }>(`/budgets/${encodeURIComponent(id)}`, payload);
    return data.budget;
  },

  async deleteBudget(id: string): Promise<number> {
    const { data } = await client.delete<{ deleted: number }>(`/budgets/${encodeURIComponent(id)}`);
    return data.deleted;
  },
};
