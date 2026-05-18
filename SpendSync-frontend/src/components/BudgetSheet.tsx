import { useEffect, useMemo, useState } from "react";
import { categoryStyle, normalizeCategories } from "@/lib/categories";
import { api } from "@/lib/api";
import type { Budget, Category } from "@/lib/types";
import { TOTAL_CATEGORY, ymKey } from "@/lib/budgets";
import { toast } from "sonner";
import { Save, Trash2, X, Repeat, Calendar, Bell } from "lucide-react";

export function BudgetSheet({
  open,
  onClose,
  onSaved,
  budget,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  budget?: Budget | null;
  categories?: Category[];
}) {
  const isEdit = !!budget;
  const allCategories = useMemo(
    () => [{ id: TOTAL_CATEGORY, label: "Overall (all categories)", emoji: "💎" }, ...normalizeCategories(categories, "expense")],
    [categories],
  );
  const [category, setCategory] = useState<string>(TOTAL_CATEGORY);
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [startMonth, setStartMonth] = useState(() => ymKey(new Date()));
  const [endMonth, setEndMonth] = useState<string>("");
  const [threshold, setThreshold] = useState(80);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (budget) {
      setCategory(budget.category);
      setAmount(String(budget.amount));
      setRecurring(budget.recurring);
      setStartMonth(budget.startMonth);
      setEndMonth(budget.endMonth || "");
      setThreshold(Math.round((budget.alertThreshold ?? 0.8) * 100));
    } else {
      setCategory(TOTAL_CATEGORY);
      setAmount("");
      setRecurring(true);
      setStartMonth(ymKey(new Date()));
      setEndMonth("");
      setThreshold(80);
    }
  }, [open, budget]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a valid amount");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) return toast.error("Pick a start month");
    if (endMonth && endMonth < startMonth) return toast.error("End month must be after start");
    setBusy(true);
    try {
      const payload = {
        category,
        amount: n,
        period: "monthly" as const,
        recurring,
        startMonth,
        alertThreshold: Math.max(0, Math.min(1, threshold / 100)),
      };
      if (isEdit && budget) {
        await api.updateBudget(budget.id, { ...payload, endMonth });
        toast.success("Budget updated");
      } else {
        await api.createBudget({ ...payload, endMonth: endMonth || null });
        toast.success("Budget created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!budget) return;
    if (!confirm("Delete this budget?")) return;
    try {
      await api.deleteBudget(budget.id);
      toast.success("Budget deleted");
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-0 sm:items-center sm:px-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-background/70 backdrop-blur-md animate-fade-up" />
      <div className="relative z-10 max-h-[calc(100svh-1rem)] w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-3xl glass-card p-4 sm:mx-0 sm:max-h-[92svh] sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold sm:text-2xl">{isEdit ? "Edit budget" : "New budget"}</h2>
            <p className="text-sm text-muted-foreground">Set monthly limits and stay on track</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted/60" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</label>
            <div className="grid grid-cols-2 gap-2 min-[460px]:grid-cols-3">
              {allCategories.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-xs transition-all sm:p-3 ${
                      active ? "border-primary/60 bg-primary/15 shadow-glow-primary" : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                    style={active && "color" in c ? categoryStyle(c) : undefined}
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <span className={`text-center leading-snug ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Monthly limit</div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-display text-3xl text-muted-foreground">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-[min(11rem,60vw)] bg-transparent text-center font-display text-4xl font-bold text-gradient outline-none placeholder:text-muted-foreground/40 sm:text-5xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" /> Start month
              </label>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" /> End month <span className="normal-case text-muted-foreground/70">(optional)</span>
              </label>
              <input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                disabled={!recurring}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60 disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <Repeat className="h-4 w-4 text-icon" /> Repeat every month
              </div>
              <p className="text-xs text-muted-foreground">
                {recurring ? "Applies to every month from start (until end month if set)." : "Applies only to the start month."}
              </p>
            </div>
          </label>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Bell className="h-3 w-3" /> Alert threshold: <span className="text-foreground font-semibold">{threshold}%</span>
            </label>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Show a warning when spending crosses this percent of your limit.</p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground transition-all hover:scale-[1.01] hover:shadow-glow-primary disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {busy ? "Saving..." : isEdit ? "Save changes" : "Create budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
