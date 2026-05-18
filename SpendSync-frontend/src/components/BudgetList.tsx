import type { Budget, Category, Expense } from "@/lib/types";
import { activeBudgetsForMonth, computeProgress, TOTAL_CATEGORY } from "@/lib/budgets";
import { categoryStyle, formatCurrency, getCategory } from "@/lib/categories";
import { AlertTriangle, Pencil, Plus, Repeat, Target } from "lucide-react";

export function BudgetList({
  budgets,
  expenses,
  monthKey,
  onAdd,
  onEdit,
  currency = "INR",
  categories,
}: {
  budgets: Budget[];
  expenses: Expense[];
  monthKey: string;
  onAdd: () => void;
  onEdit: (b: Budget) => void;
  currency?: string;
  categories?: Category[];
}) {
  const active = activeBudgetsForMonth(budgets, monthKey);
  const progress = active.map((b) => computeProgress(b, expenses, monthKey));

  progress.sort((a, b) => {
    if (a.budget.category === TOTAL_CATEGORY) return -1;
    if (b.budget.category === TOTAL_CATEGORY) return 1;
    return b.pct - a.pct;
  });

  return (
    <section className="animate-fade-up" style={{ animationDelay: "150ms" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Target className="h-4 w-4 text-icon" />
          <h3 className="font-display text-lg font-semibold">Budgets</h3>
          <span className="text-xs text-muted-foreground">· {monthKey}</span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg border border-icon/35 bg-icon/10 px-3 py-1.5 text-xs font-medium text-icon hover:bg-icon/15"
        >
          <Plus className="h-3.5 w-3.5" /> New budget
        </button>
      </div>

      {progress.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 rounded-[1.35rem] p-5 text-center sm:rounded-3xl sm:p-8">
          <div className="text-4xl">🎯</div>
          <p className="font-medium">No budgets for this month</p>
          <p className="text-sm text-muted-foreground">Create a budget to track spending against limits.</p>
          <button onClick={onAdd} className="mt-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid gap-2 min-[680px]:grid-cols-2">
          {progress.map((p) => {
            const isTotal = p.budget.category === TOTAL_CATEGORY;
            const cat = isTotal
              ? { label: "Overall", emoji: "💎", hue: 260 }
              : getCategory(p.budget.category, categories, "expense");
            const pct = Math.min(100, p.pct * 100);
            const barColor =
              p.status === "over"
                ? "from-destructive to-destructive"
                : p.status === "warn"
                ? "from-amber-500 to-orange-500"
                : "from-primary to-secondary";
            return (
              <div
                key={p.budget.id}
                className={`glass-card group relative overflow-hidden rounded-2xl p-3 transition-all hover:border-primary/40 sm:p-4 ${
                  p.status === "over" ? "border-destructive/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                      style={"color" in cat ? categoryStyle(cat) : { background: "hsl(260 80% 60% / 0.18)" }}
                    >
                      {cat.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium">{cat.label}</p>
                        {p.budget.recurring && (
                          <Repeat className="h-3 w-3 text-muted-foreground" aria-label="Recurring" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.spent, currency)} of {formatCurrency(p.budget.amount, currency)}
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label="Edit budget"
                    onClick={() => onEdit(p.budget)}
                    className="rounded-lg p-1.5 text-muted-foreground opacity-100 hover:bg-icon/15 hover:text-icon sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className={`flex items-center gap-1 font-medium tabular-nums ${
                      p.status === "over"
                        ? "text-destructive"
                        : p.status === "warn"
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {p.status !== "ok" && <AlertTriangle className="h-3 w-3" />}
                    {(p.pct * 100).toFixed(0)}% used
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.remaining >= 0
                      ? `${formatCurrency(p.remaining, currency)} left`
                      : `${formatCurrency(Math.abs(p.remaining), currency)} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
