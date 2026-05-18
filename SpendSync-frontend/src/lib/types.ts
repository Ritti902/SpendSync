export type User = {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  currencyPreference?: string;
  timezone?: string;
  themePreference?: "light" | "dark" | "system";
  createdAt?: string;
  updatedAt?: string;
};
export type Expense = {
  id: string;
  userId?: string;
  amount: number;
  category: string;
  subcategory?: string;
  note: string;
  date: string; // ISO
  currency?: string;
  exchangeRate?: number;
  tags?: string[];
  paymentMethod?: string;
  merchant?: string;
  isRecurring?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedExpenses = {
  expenses: Expense[];
  pagination: Pagination;
};

export type Income = {
  id: string;
  userId?: string;
  amount: number;
  source: string;
  category: string;
  note: string;
  date: string;
  currency?: string;
  exchangeRate?: number;
  tags?: string[];
  isRecurring?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginatedIncome = {
  income: Income[];
  pagination: Pagination;
};

export type Category = {
  id: string;
  userId?: string | null;
  name: string;
  slug: string;
  type: "expense" | "income";
  icon: string;
  color: string;
  parentId?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TrendPoint = {
  period: string;
  expense: number;
  income: number;
  net: number;
};

export type CategoryBreakdown = {
  category: string;
  total: number;
  count: number;
  percent: number;
};

export type DashboardSummary = {
  totalBalance: number;
  remainingBalance?: number;
  totalExpenses?: number;
  monthlySpending: number;
  monthlyIncome?: number;
  totalIncome: number;
  savings: number;
  savingsPercentage?: number;
  spendingChart: TrendPoint[];
  monthlyNetSavings?: TrendPoint[];
  categoryBreakdown: CategoryBreakdown[];
  incomeDistribution?: CategoryBreakdown[];
};

export type AnalyticsSummary = {
  period: string;
  start: string;
  end: string;
  expenseTotal: number;
  incomeTotal: number;
  netSavings: number;
  savingsPercentage: number;
  expenseCount: number;
  incomeCount: number;
  categoryBreakdown: CategoryBreakdown[];
  incomeDistribution: CategoryBreakdown[];
  trend: TrendPoint[];
  insights: string[];
};

export type Budget = {
  id: string;
  userId?: string;
  /** Category id from CATEGORIES, or "__total__" for an overall monthly cap. */
  category: string;
  /** Cap amount in INR for one month. */
  amount: number;
  /** Period (only "monthly" supported for now). */
  period: "monthly";
  /** If true, applies to every month from startMonth (until endMonth if set). */
  recurring: boolean;
  /** "YYYY-MM" — first month this budget applies to. */
  startMonth: string;
  /** Optional "YYYY-MM" — last month this budget applies to. */
  endMonth?: string | null;
  /** Optional notify threshold (0..1). Default 0.8. */
  alertThreshold?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
};
