import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  Download,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { toast } from "sonner";
import { AddExpenseSheet } from "@/components/AddExpenseSheet";
import { AddIncomeSheet } from "@/components/AddIncomeSheet";
import { BudgetList } from "@/components/BudgetList";
import { BudgetSheet } from "@/components/BudgetSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExpenseRow } from "@/components/ExpenseRow";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { api } from "@/lib/api";
import { ymKey } from "@/lib/budgets";
import { exportExpensesCsv } from "@/lib/csv";
import { formatCurrency, getCategory } from "@/lib/categories";
import { compareApiDatesDesc, parseApiDate, todayDateInputValue } from "@/lib/dates";
import type { Budget, Expense, Income } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

function isSameMonth(date: Date, monthDate: Date) {
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const [monthDate, setMonthDate] = useState(new Date());
  const { categories: expenseCategories, options: expenseCategoryOptions } = useCategories("expense");
  const { categories: incomeCategories } = useCategories("income");

  const expensesQuery = useQuery({ queryKey: ["expenses", "dashboard"], queryFn: () => api.listExpenses({ limit: 1000, sortBy: "newest" }) });
  const incomeQuery = useQuery({ queryKey: ["income", "dashboard"], queryFn: () => api.listIncome({ limit: 1000 }) });
  const budgetsQuery = useQuery({ queryKey: ["budgets"], queryFn: api.listBudgets });
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const incomes = useMemo(() => incomeQuery.data?.income ?? [], [incomeQuery.data]);
  const budgets = useMemo(() => budgetsQuery.data ?? [], [budgetsQuery.data]);
  const currency = user?.currencyPreference || "INR";
  const monthKey = ymKey(monthDate);
  const loading = expensesQuery.isLoading || budgetsQuery.isLoading || incomeQuery.isLoading || dashboardQuery.isLoading;

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => isSameMonth(parseApiDate(expense.date), monthDate)),
    [expenses, monthDate],
  );
  const monthIncome = useMemo(
    () => incomes.filter((income) => isSameMonth(parseApiDate(income.date), monthDate)),
    [incomes, monthDate],
  );
  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => compareApiDatesDesc(a.date, b.date)).slice(0, 8),
    [expenses],
  );
  const monthTotal = useMemo(() => monthExpenses.reduce((sum, expense) => sum + expense.amount, 0), [monthExpenses]);
  const monthIncomeTotal = useMemo(() => monthIncome.reduce((sum, income) => sum + income.amount, 0), [monthIncome]);
  const totalExpenses = dashboardQuery.data?.totalExpenses ?? expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = dashboardQuery.data?.totalIncome ?? incomes.reduce((sum, income) => sum + income.amount, 0);
  const remainingBalance = dashboardQuery.data?.remainingBalance ?? dashboardQuery.data?.totalBalance ?? totalIncome - totalExpenses;
  const savingsRate = dashboardQuery.data?.savingsPercentage ?? (monthIncomeTotal > 0 ? (monthIncomeTotal - monthTotal) / monthIncomeTotal : 0);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of monthExpenses) map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    return [...map.entries()]
      .map(([id, total]) => ({ id, total, ...getCategory(id, expenseCategories, "expense") }))
      .sort((a, b) => b.total - a.total);
  }, [expenseCategories, monthExpenses]);

  function openAddExpense() {
    setEditingExpense(null);
    setExpenseOpen(true);
  }

  function openAddIncome() {
    setEditingIncome(null);
    setIncomeOpen(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setExpenseOpen(true);
  }

  function openAddBudget() {
    setEditingBudget(null);
    setBudgetOpen(true);
  }

  function openEditBudget(budget: Budget) {
    setEditingBudget(budget);
    setBudgetOpen(true);
  }

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["income"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  async function deleteExpense() {
    if (!confirmDelete) return;
    const previous = queryClient.getQueryData<Expense[]>(["expenses"]) ?? [];
    queryClient.setQueryData<Expense[]>(["expenses"], previous.filter((expense) => expense.id !== confirmDelete.id));
    try {
      await api.deleteExpense(confirmDelete.id);
      const deleted = confirmDelete;
      toast("Expense deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            await api.createExpense({
              amount: deleted.amount,
              category: deleted.category,
              note: deleted.note,
              date: deleted.date,
              isRecurring: deleted.isRecurring,
            });
            await refreshAll();
          },
        },
      });
      setConfirmDelete(null);
    } catch (error) {
      queryClient.setQueryData(["expenses"], previous);
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function exportCsv() {
    if (expenses.length === 0) {
      toast.message("No expenses to export");
      return;
    }
    exportExpensesCsv(expenses, `spendsync-${todayDateInputValue()}.csv`);
    toast.success("CSV exported");
  }

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
  }

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[8%] h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[8%] right-[8%] h-96 w-96 rounded-full bg-secondary/30 blur-[150px] dark:bg-muted/20" />
      </div>

      <DesktopSidebar />
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-2xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-icon lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
                <h1 className="truncate font-display text-base font-bold tracking-normal sm:text-xl">
                  Good to see you, {user?.name || user?.username || "there"}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={exportCsv}
                className="hidden items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground md:flex"
              >
                <Download className="h-4 w-4" /> Export
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-glow-primary" aria-label="Open profile menu">
                    {(user?.name || user?.email || "E").slice(0, 1).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="block truncate">{user?.name || "SpendSync"}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
          <section className="grid gap-3 min-[560px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <KpiCard icon={TrendingUp} label="Total income" value={formatCurrency(totalIncome, currency)} detail={`${monthIncome.length} income records this month`} />
            <KpiCard icon={TrendingDown} label="Total expenses" value={formatCurrency(totalExpenses, currency)} detail={`${monthExpenses.length} expenses this month`} />
            <KpiCard icon={Wallet} label="Remaining" value={formatCurrency(remainingBalance, currency)} detail="Income minus expenses" />
            <KpiCard icon={PiggyBank} label="Savings rate" value={`${(savingsRate * 100).toFixed(1)}%`} detail={`${formatCurrency(monthIncomeTotal - monthTotal, currency)} this month`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="glass-card overflow-hidden rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monthly analytics</p>
                  <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">
                    {monthDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </h2>
                </div>
                <div className="flex w-full rounded-xl border border-border bg-card/60 p-1 min-[420px]:w-auto">
                  <button className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted" onClick={() => setMonthDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>
                    Previous
                  </button>
                  <button className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted" onClick={() => setMonthDate(new Date())}>
                    Current
                  </button>
                </div>
              </div>
              {loading ? <Skeleton className="h-56 rounded-2xl" /> : <MonthlyChart expenses={monthExpenses} income={monthIncome} monthDate={monthDate} currency={currency} />}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Categories</p>
                  <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Spending mix</h2>
                </div>
                <Sparkles className="h-5 w-5 text-icon" aria-hidden="true" />
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-14 rounded-2xl" />)}
                </div>
              ) : byCategory.length === 0 ? (
                <EmptyState title="No category data" body="Add an expense to see your spending mix." />
              ) : (
                <div className="space-y-3">
                  {byCategory.slice(0, 6).map((category) => {
                    const pct = monthTotal > 0 ? (category.total / monthTotal) * 100 : 0;
                    return (
                      <div key={category.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 font-medium">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">{category.emoji}</span>
                            <span className="truncate">{category.label}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:text-sm">{formatCurrency(category.total, currency)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                          <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </section>

          <BudgetList
            budgets={budgets}
            expenses={expenses}
            monthKey={monthKey}
            onAdd={openAddBudget}
            onEdit={openEditBudget}
            currency={currency}
            categories={expenseCategories}
          />

          <section className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            <div className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recent transactions</p>
                  <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Latest activity</h2>
                </div>
                <div className="flex w-full flex-col gap-2 min-[420px]:w-auto min-[420px]:flex-row">
                  <button
                    type="button"
                    onClick={openAddIncome}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-icon/35 bg-icon/10 px-4 py-2.5 text-sm font-bold text-icon hover:bg-icon/15"
                  >
                    <TrendingUp className="h-4 w-4" /> Add income
                  </button>
                  <button
                    type="button"
                    onClick={openAddExpense}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow-primary"
                  >
                    <Plus className="h-4 w-4" /> Add expense
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-2xl" />)}
                </div>
              ) : recentExpenses.length === 0 ? (
                <EmptyState title="No expenses yet" body="Your first transaction will appear here." />
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      currency={currency}
                      categories={expenseCategories}
                      onEdit={openEditExpense}
                      onDelete={(id) => setConfirmDelete(expenses.find((item) => item.id === id) ?? null)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick categories</p>
                  <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Track faster</h2>
                </div>
                <ReceiptText className="h-5 w-5 text-icon" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-2">
                {expenseCategoryOptions.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={openAddExpense}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 p-3 text-left text-sm font-medium transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-lg">{category.emoji}</span>
                    <span className="min-w-0 truncate">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <button
        type="button"
        onClick={openAddExpense}
        aria-label="Add expense"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary transition hover:-translate-y-1 lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} onSaved={refreshAll} expense={editingExpense} categories={expenseCategories} />
      <AddIncomeSheet open={incomeOpen} onClose={() => setIncomeOpen(false)} onSaved={refreshAll} income={editingIncome} categories={incomeCategories} />
      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} onSaved={refreshAll} budget={editingBudget} categories={expenseCategories} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this expense?"
        description={confirmDelete ? `${formatCurrency(confirmDelete.amount, currency)} - ${confirmDelete.note || getCategory(confirmDelete.category, expenseCategories, "expense").label}` : null}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={deleteExpense}
        busy={false}
      />
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-border/60 bg-background/75 px-4 py-5 backdrop-blur-2xl lg:block">
      <SidebarContent onLogout={undefined} />
    </aside>
  );
}

function MobileSidebar({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative h-full w-[min(20rem,88vw)] overflow-y-auto border-r border-border bg-background p-4 shadow-elegant"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/70 text-icon"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onLogout={onLogout} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function SidebarContent({ onLogout }: { onLogout?: () => void }) {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-primary text-primary-foreground shadow-glow-primary [&_svg]:text-primary-foreground"
        : "text-muted-foreground [&_svg]:text-icon hover:bg-muted hover:text-foreground hover:[&_svg]:text-icon"
    }`;

  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="mb-8 flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-primary">
          <Wallet className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold tracking-normal">SpendSync</p>
          <p className="text-xs text-muted-foreground">Premium finance desk</p>
        </div>
      </Link>
      <nav className="space-y-2">
        <NavLink to="/" className={itemClass}>
          <LayoutDashboard className="h-5 w-5" /> Dashboard
        </NavLink>
        <NavLink to="/income" className={itemClass}>
          <TrendingUp className="h-5 w-5" /> Income
        </NavLink>
        <NavLink to="/history" className={itemClass}>
          <History className="h-5 w-5" /> History
        </NavLink>
        <NavLink to="/analytics" className={itemClass}>
          <BarChart3 className="h-5 w-5" /> Analytics
        </NavLink>
        <NavLink to="/categories" className={itemClass}>
          <FolderKanban className="h-5 w-5" /> Categories
        </NavLink>
        <NavLink to="/settings" className={itemClass}>
          <Settings className="h-5 w-5" /> Settings
        </NavLink>
      </nav>
      <div className="mt-8 rounded-[1.35rem] border border-border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-icon" /> Monthly focus
        </div>
        <p className="text-sm text-muted-foreground">Review budgets weekly and keep recurring spend visible.</p>
      </div>
      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3">
          <span className="text-sm font-semibold text-muted-foreground">Theme</span>
          <ThemeToggle label="Toggle sidebar theme" />
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/60 px-3 py-3 text-sm font-semibold text-muted-foreground [&_svg]:text-icon hover:text-foreground"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card min-w-0 rounded-[1.35rem] p-4 sm:rounded-[1.5rem] sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-icon/15 text-icon sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" />
        </div>
        <CalendarDays className="h-4 w-4 text-icon/60" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words font-display text-[clamp(1.25rem,5vw,1.5rem)] font-bold leading-tight tracking-normal">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </motion.div>
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
