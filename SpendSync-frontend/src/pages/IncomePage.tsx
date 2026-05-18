import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Search, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddIncomeSheet } from "@/components/AddIncomeSheet";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IncomeRow } from "@/components/IncomeRow";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { api, type IncomeListParams } from "@/lib/api";
import { formatCurrency } from "@/lib/categories";
import type { Income, PaginatedIncome } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

export default function IncomePage() {
  const queryClient = useQueryClient();
  const currency = useAuthStore((state) => state.user?.currencyPreference || "INR");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Income | null>(null);
  const { categories, options } = useCategories("income");

  const params = useMemo<IncomeListParams>(() => ({ page, limit: 10, search, sortBy }), [page, search, sortBy]);
  const incomeQuery = useQuery({ queryKey: ["income", params], queryFn: () => api.listIncome(params) });
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const rows = incomeQuery.data?.income ?? [];
  const pagination = incomeQuery.data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (income: Income) => api.deleteIncome(income.id),
    onMutate: async (income) => {
      await queryClient.cancelQueries({ queryKey: ["income", params] });
      const previous = queryClient.getQueryData<PaginatedIncome>(["income", params]);
      queryClient.setQueryData<PaginatedIncome>(["income", params], (current) =>
        current
          ? {
              ...current,
              income: current.income.filter((item) => item.id !== income.id),
              pagination: { ...current.pagination, total: Math.max(0, current.pagination.total - 1) },
            }
          : current,
      );
      setConfirmDelete(null);
      return { previous, income };
    },
    onError: (error, _income, context) => {
      queryClient.setQueryData(["income", params], context?.previous);
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
    onSuccess: (_deleted, _income, context) => {
      toast("Income deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            const item = context?.income;
            if (!item) return;
            await api.createIncome({
              amount: item.amount,
              source: item.source,
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
      queryClient.invalidateQueries({ queryKey: ["income"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  const totalIncome = dashboardQuery.data?.totalIncome ?? 0;
  const totalExpenses = dashboardQuery.data?.totalExpenses ?? 0;
  const remaining = dashboardQuery.data?.remainingBalance ?? dashboardQuery.data?.totalBalance ?? totalIncome - totalExpenses;
  const monthlyIncome = dashboardQuery.data?.monthlyIncome ?? 0;

  return (
    <AppShell
      eyebrow="Income"
      title="Track incoming money"
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow-primary sm:flex"
        >
          <Plus className="h-4 w-4" /> Add income
        </button>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        <section className="grid gap-3 min-[560px]:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={TrendingUp} label="Total income" value={formatCurrency(totalIncome, currency)} detail="All-time inflow" />
          <Kpi icon={DollarSign} label="Total expenses" value={formatCurrency(totalExpenses, currency)} detail="All-time outflow" />
          <Kpi icon={Wallet} label="Remaining" value={formatCurrency(remaining, currency)} detail="Income minus expenses" />
          <Kpi icon={TrendingUp} label="This month" value={formatCurrency(monthlyIncome, currency)} detail={`${options.length} income categories`} />
        </section>

        <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Income records</p>
              <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Sources and payments</h2>
            </div>
            <div className="flex flex-col gap-2 min-[520px]:flex-row">
              <label className="relative min-[520px]:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search income"
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                />
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
                aria-label="Sort income"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </div>
          </div>

          {incomeQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-2xl" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : (
            <div className="space-y-3">
              {rows.map((income) => (
                <IncomeRow
                  key={income.id}
                  income={income}
                  currency={currency}
                  categories={categories}
                  onEdit={(item) => {
                    setEditing(item);
                    setSheetOpen(true);
                  }}
                  onDelete={() => setConfirmDelete(income)}
                />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="flex-1 rounded-xl border border-border bg-card/50 px-4 py-2 text-sm font-semibold disabled:opacity-50 sm:flex-none"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((value) => value + 1)}
                  className="flex-1 rounded-xl border border-border bg-card/50 px-4 py-2 text-sm font-semibold disabled:opacity-50 sm:flex-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={openCreate}
        aria-label="Add income"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary transition hover:-translate-y-1 sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddIncomeSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={refreshAll} income={editing} categories={categories} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this income?"
        description={confirmDelete?.source}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        busy={deleteMutation.isPending}
      />
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-border bg-card/40 p-5 text-center sm:rounded-[1.5rem] sm:p-8">
      <p className="font-semibold">No income yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Add salary, freelance payments, investments, or gifts.</p>
      <button onClick={onAdd} className="mt-4 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Add income
      </button>
    </div>
  );
}
