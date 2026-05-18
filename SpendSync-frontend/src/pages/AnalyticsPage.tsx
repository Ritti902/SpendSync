import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, Percent, PiggyBank, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { api } from "@/lib/api";
import { formatCurrency, getCategory } from "@/lib/categories";
import { useAuthStore } from "@/stores/auth";

const PIE_COLORS = ["#22c55e", "#06b6d4", "#a3e635", "#14b8a6", "#f59e0b", "#818cf8", "#fb7185"];

export default function AnalyticsPage() {
  const currency = useAuthStore((state) => state.user?.currencyPreference || "INR");
  const [year, setYear] = useState(new Date().getFullYear());
  const { categories } = useCategories("expense");
  const yearlyQuery = useQuery({ queryKey: ["analytics", "yearly", year], queryFn: () => api.yearlyAnalytics({ year }) });
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const analytics = yearlyQuery.data;
  const dashboard = dashboardQuery.data;

  const trendData = useMemo(
    () =>
      (analytics?.trend ?? []).map((point) => ({
        ...point,
        label: point.period.slice(5) || point.period,
      })),
    [analytics?.trend],
  );

  return (
    <AppShell
      eyebrow="Analytics"
      title="Income, expenses, and savings"
      actions={
        <label className="hidden items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm font-semibold sm:flex">
          <Calendar className="h-4 w-4 text-icon" />
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || new Date().getFullYear())}
            className="w-20 bg-transparent outline-none"
            aria-label="Analytics year"
          />
        </label>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        <section className="grid gap-3 min-[560px]:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={TrendingUp} label="Income" value={formatCurrency(analytics?.incomeTotal ?? dashboard?.totalIncome ?? 0, currency)} detail={`${analytics?.incomeCount ?? 0} income records`} />
          <Kpi icon={TrendingDown} label="Expenses" value={formatCurrency(analytics?.expenseTotal ?? dashboard?.totalExpenses ?? 0, currency)} detail={`${analytics?.expenseCount ?? 0} expenses`} />
          <Kpi icon={PiggyBank} label="Net savings" value={formatCurrency(analytics?.netSavings ?? dashboard?.savings ?? 0, currency)} detail="Income minus expenses" />
          <Kpi icon={Percent} label="Savings rate" value={`${(((analytics?.savingsPercentage ?? dashboard?.savingsPercentage ?? 0) || 0) * 100).toFixed(1)}%`} detail="Share of income saved" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          <div className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monthly trends</p>
                <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">{year} net savings</h2>
              </div>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60 sm:hidden"
                aria-label="Analytics year"
              >
                {[0, 1, 2].map((offset) => {
                  const value = new Date().getFullYear() - offset;
                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>
            {yearlyQuery.isLoading ? (
              <Skeleton className="h-72 rounded-2xl" />
            ) : trendData.length === 0 ? (
              <EmptyState title="No trend data yet" body="Add income and expenses to build savings trends." />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number, name: string) => [formatCurrency(value, currency), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" fill="hsl(var(--success))" radius={[6, 6, 2, 2]} />
                    <Bar dataKey="expense" fill="hsl(var(--primary))" radius={[6, 6, 2, 2]} />
                    <Line type="monotone" dataKey="net" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Income sources</p>
                <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Distribution</h2>
              </div>
              <BarChart3 className="h-5 w-5 text-icon" />
            </div>
            {(analytics?.incomeDistribution ?? []).length === 0 ? (
              <EmptyState title="No income distribution" body="Income sources will appear here." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics?.incomeDistribution ?? []} dataKey="total" nameKey="category" innerRadius={54} outerRadius={86} paddingAngle={3}>
                      {(analytics?.incomeDistribution ?? []).map((entry, index) => (
                        <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number) => formatCurrency(value, currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
          <div className="mb-5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Expense categories</p>
            <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Spending distribution</h2>
          </div>
          {(analytics?.categoryBreakdown ?? []).length === 0 ? (
            <EmptyState title="No expense distribution" body="Categorized spending will appear here." />
          ) : (
            <div className="grid gap-3 min-[640px]:grid-cols-2 xl:grid-cols-3">
              {(analytics?.categoryBreakdown ?? []).map((item) => {
                const category = getCategory(item.category, categories, "expense");
                return (
                  <div key={item.category} className="rounded-2xl border border-border/60 bg-card/45 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 font-semibold">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ backgroundColor: `${category.color}24` }}>
                          {category.emoji}
                        </span>
                        <span className="truncate">{category.label}</span>
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">{(item.percent * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                      <div className="h-full rounded-full" style={{ width: `${item.percent * 100}%`, backgroundColor: category.color }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{formatCurrency(item.total, currency)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="glass-card min-w-0 rounded-[1.35rem] p-4 sm:rounded-[1.5rem] sm:p-5">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-icon/15 text-icon">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words font-display text-[clamp(1.25rem,5vw,1.5rem)] font-bold leading-tight tracking-normal">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-border bg-card/40 p-5 text-center sm:rounded-[1.5rem] sm:p-8">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
