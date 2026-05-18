import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddExpenseSheet } from "@/components/AddExpenseSheet";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExpenseRow } from "@/components/ExpenseRow";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { api, type ExpenseListParams } from "@/lib/api";
import { formatLocalDate } from "@/lib/dates";
import { normalizeCategories } from "@/lib/categories";
import type { Expense, PaginatedExpenses } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

const HISTORY_SCROLL_KEY = "spendsync-history-scroll";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const currency = useAuthStore((state) => state.user?.currencyPreference || "INR");
  const { categories } = useCategories("expense");
  const categoryOptions = useMemo(() => normalizeCategories(categories, "expense"), [categories]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const [mobileRows, setMobileRows] = useState<Expense[]>([]);

  const params = useMemo<ExpenseListParams>(
    () => ({
      page,
      limit: 12,
      search,
      sortBy,
      category,
      from,
      to,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
    }),
    [page, search, sortBy, category, from, to, minAmount, maxAmount],
  );

  const expensesQuery = useQuery({ queryKey: ["expenses", "history", params], queryFn: () => api.listExpenseHistory(params) });
  const pagination = expensesQuery.data?.pagination;
  const rows = isMobile ? mobileRows : expensesQuery.data?.expenses ?? [];

  useEffect(() => {
    const stored = sessionStorage.getItem(HISTORY_SCROLL_KEY);
    if (stored) requestAnimationFrame(() => window.scrollTo(0, Number(stored)));
    return () => sessionStorage.setItem(HISTORY_SCROLL_KEY, String(window.scrollY));
  }, []);

  useEffect(() => {
    if (!expensesQuery.data) return;
    setMobileRows((current) => (isMobile && page > 1 ? [...current, ...expensesQuery.data.expenses] : expensesQuery.data.expenses));
  }, [expensesQuery.data, isMobile, page]);

  useEffect(() => {
    setPage(1);
    setMobileRows([]);
  }, [search, sortBy, category, from, to, minAmount, maxAmount]);

  const deleteMutation = useMutation({
    mutationFn: (expense: Expense) => api.deleteExpense(expense.id),
    onMutate: async (expense) => {
      await queryClient.cancelQueries({ queryKey: ["expenses", "history", params] });
      const previous = queryClient.getQueryData<PaginatedExpenses>(["expenses", "history", params]);
      queryClient.setQueryData<PaginatedExpenses>(["expenses", "history", params], (current) =>
        current
          ? {
              ...current,
              expenses: current.expenses.filter((item) => item.id !== expense.id),
              pagination: { ...current.pagination, total: Math.max(0, current.pagination.total - 1) },
            }
          : current,
      );
      setMobileRows((current) => current.filter((item) => item.id !== expense.id));
      setConfirmDelete(null);
      return { previous, expense };
    },
    onError: (error, _expense, context) => {
      queryClient.setQueryData(["expenses", "history", params], context?.previous);
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
    onSuccess: (_deleted, _expense, context) => {
      toast("Expense deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            const item = context?.expense;
            if (!item) return;
            await api.createExpense({
              amount: item.amount,
              category: item.category,
              note: item.note,
              date: item.date,
              isRecurring: item.isRecurring,
            });
            await refreshAll();
          },
        },
      });
    },
    onSettled: () => refreshAll(),
  });

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  function applyQuickFilter(kind: "month" | "today" | "clear") {
    const now = new Date();
    if (kind === "clear") {
      setFrom("");
      setTo("");
      setCategory("");
      setMinAmount("");
      setMaxAmount("");
      setSearch("");
      return;
    }
    if (kind === "today") {
      const today = formatLocalDate(now);
      setFrom(today);
      setTo(today);
      return;
    }
    const start = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    setFrom(start);
    setTo(end);
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  return (
    <AppShell
      eyebrow="History"
      title="Expense history"
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow-primary sm:flex"
        >
          <Plus className="h-4 w-4" /> Add expense
        </button>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Browse</p>
              <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Search, filter, and edit any expense</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search note, category, merchant"
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                />
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
                aria-label="Sort expenses"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-2.5 text-sm font-semibold lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>

          <div className="mt-4 hidden lg:block">
            <Filters
              category={category}
              setCategory={setCategory}
              categoryOptions={categoryOptions}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              minAmount={minAmount}
              setMinAmount={setMinAmount}
              maxAmount={maxAmount}
              setMaxAmount={setMaxAmount}
              onQuickFilter={applyQuickFilter}
            />
          </div>
        </section>

        <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Results</p>
              <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">
                {pagination ? `${pagination.total} expense${pagination.total === 1 ? "" : "s"}` : "Expenses"}
              </h2>
            </div>
            <Filter className="h-5 w-5 text-icon" />
          </div>

          {expensesQuery.isLoading && page === 1 ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 rounded-2xl" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-border bg-card/40 p-5 text-center sm:rounded-[1.5rem] sm:p-8">
              <p className="font-semibold">No expenses match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Clear filters or add a new expense.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                  categories={categories}
                  onEdit={(item) => {
                    setEditing(item);
                    setSheetOpen(true);
                  }}
                  onDelete={() => setConfirmDelete(expense)}
                />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-5">
              {isMobile ? (
                <button
                  type="button"
                  disabled={!pagination.hasNext || expensesQuery.isFetching}
                  onClick={() => setPage((value) => value + 1)}
                  className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {expensesQuery.isFetching ? "Loading..." : pagination.hasNext ? "Load more" : "All expenses loaded"}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPrev}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="rounded-xl border border-border bg-card/50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!pagination.hasNext}
                      onClick={() => setPage((value) => value + 1)}
                      className="rounded-xl border border-border bg-card/50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[86svh] overflow-y-auto rounded-t-3xl border border-border bg-background p-4 shadow-elegant">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Filters</h3>
              <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">
                Done
              </button>
            </div>
            <Filters
              category={category}
              setCategory={setCategory}
              categoryOptions={categoryOptions}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              minAmount={minAmount}
              setMinAmount={setMinAmount}
              maxAmount={maxAmount}
              setMaxAmount={setMaxAmount}
              onQuickFilter={applyQuickFilter}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={openCreate}
        aria-label="Add expense"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary transition hover:-translate-y-1 sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddExpenseSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={refreshAll} expense={editing} categories={categories} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this expense?"
        description={confirmDelete?.note || confirmDelete?.category}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        busy={deleteMutation.isPending}
      />
    </AppShell>
  );
}

function Filters({
  category,
  setCategory,
  categoryOptions,
  from,
  setFrom,
  to,
  setTo,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  onQuickFilter,
}: {
  category: string;
  setCategory: (value: string) => void;
  categoryOptions: ReturnType<typeof normalizeCategories>;
  from: string;
  setFrom: (value: string) => void;
  to: string;
  setTo: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  onQuickFilter: (kind: "month" | "today" | "clear") => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_repeat(4,minmax(120px,0.8fr))]">
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60" aria-label="Filter category">
        <option value="">All categories</option>
        {categoryOptions.map((item) => (
          <option key={item.id} value={item.id}>
            {item.emoji} {item.label}
          </option>
        ))}
      </select>
      <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60" aria-label="From date" />
      <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60" aria-label="To date" />
      <input type="number" inputMode="decimal" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="Min amount" className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
      <input type="number" inputMode="decimal" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="Max amount" className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
      <div className="flex flex-wrap gap-2 lg:col-span-full">
        <button type="button" onClick={() => onQuickFilter("month")} className="rounded-xl border border-border bg-card/50 px-3 py-2 text-sm font-semibold">
          This month
        </button>
        <button type="button" onClick={() => onQuickFilter("today")} className="rounded-xl border border-border bg-card/50 px-3 py-2 text-sm font-semibold">
          Today
        </button>
        <button type="button" onClick={() => onQuickFilter("clear")} className="rounded-xl border border-border bg-card/50 px-3 py-2 text-sm font-semibold">
          Clear
        </button>
      </div>
    </div>
  );
}
