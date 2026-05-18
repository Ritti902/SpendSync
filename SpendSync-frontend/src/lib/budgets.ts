import type { Budget, Expense } from "./types";
import { parseApiDate } from "./dates";

export const TOTAL_CATEGORY = "__total__";

export function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isBudgetActiveForMonth(b: Budget, monthKey: string) {
  if (b.startMonth > monthKey) return false;
  if (b.recurring) {
    if (b.endMonth && b.endMonth < monthKey) return false;
    return true;
  }
  return b.startMonth === monthKey;
}

/** Sum of expenses matching a category for a given month. */
export function spentFor(expenses: Expense[], monthKey: string, category: string) {
  return expenses
    .filter((e) => ymKey(parseApiDate(e.date)) === monthKey)
    .filter((e) => category === TOTAL_CATEGORY ? true : e.category === category)
    .reduce((s, e) => s + e.amount, 0);
}

export type BudgetProgress = {
  budget: Budget;
  spent: number;
  remaining: number;
  pct: number;
  status: "ok" | "warn" | "over";
};

export function computeProgress(b: Budget, expenses: Expense[], monthKey: string): BudgetProgress {
  const spent = spentFor(expenses, monthKey, b.category);
  const pct = b.amount > 0 ? spent / b.amount : 0;
  const threshold = b.alertThreshold ?? 0.8;
  const status: BudgetProgress["status"] = pct >= 1 ? "over" : pct >= threshold ? "warn" : "ok";
  return { budget: b, spent, remaining: b.amount - spent, pct, status };
}

export function activeBudgetsForMonth(budgets: Budget[], monthKey: string) {
  return budgets.filter((b) => isBudgetActiveForMonth(b, monthKey));
}
