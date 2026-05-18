import { useEffect, useMemo, useState } from "react";
import { Plus, Repeat, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { categoryStyle, normalizeCategories } from "@/lib/categories";
import { formatDateInputValue, todayDateInputValue } from "@/lib/dates";
import type { Category, Income } from "@/lib/types";

export function AddIncomeSheet({
  open,
  onClose,
  onSaved,
  income,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  income?: Income | null;
  categories?: Category[];
}) {
  const isEdit = !!income;
  const categoryOptions = useMemo(() => normalizeCategories(categories, "income"), [categories]);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState(categoryOptions[0]?.id ?? "salary");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => todayDateInputValue());
  const [recurring, setRecurring] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (income) {
      setAmount(String(income.amount));
      setSource(income.source);
      setCategory(income.category || categoryOptions[0]?.id || "salary");
      setNote(income.note || "");
      setDate(formatDateInputValue(income.date));
      setRecurring(!!income.isRecurring);
    } else {
      setAmount("");
      setSource("");
      setCategory(categoryOptions[0]?.id ?? "salary");
      setNote("");
      setDate(todayDateInputValue());
      setRecurring(false);
    }
  }, [open, income, categoryOptions]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!source.trim()) {
      toast.error("Enter an income source");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && income) {
        await api.updateIncome(income.id, {
          amount: value,
          source: source.trim(),
          category,
          note: note.trim(),
          date,
          isRecurring: recurring,
        });
        toast.success("Income updated");
      } else {
        await api.createIncome({
          amount: value,
          source: source.trim(),
          category,
          note: note.trim(),
          date,
          isRecurring: recurring,
        });
        toast.success("Income added");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save income");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-0 sm:items-center sm:px-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 animate-fade-up bg-background/70 backdrop-blur-md" />
      <div className="relative z-10 max-h-[calc(100svh-1rem)] w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-3xl glass-card p-4 sm:mx-0 sm:max-h-[min(92svh,44rem)] sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold sm:text-2xl">{isEdit ? "Edit income" : "New income"}</h2>
            <p className="text-sm text-muted-foreground">Track money coming in</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted/60" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="text-center">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Amount</div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-display text-3xl text-muted-foreground">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-[min(11rem,60vw)] bg-transparent text-center font-display text-4xl font-bold text-gradient outline-none placeholder:text-muted-foreground/40 sm:text-5xl"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={120}
              placeholder="Salary, client payment, bonus"
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Income category</label>
            <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
              {categoryOptions.map((item) => {
                const active = category === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setCategory(item.id)}
                    className={`flex min-h-[5.25rem] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-xs transition-all sm:p-3 ${
                      active ? "border-primary/60 bg-primary/15 shadow-glow-primary" : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                    style={active ? categoryStyle(item) : undefined}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className={active ? "font-semibold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                placeholder="Optional"
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <span className="flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Repeat className="h-4 w-4 text-icon" /> Recurring income
              </span>
              <span className="block text-xs text-muted-foreground">Mark predictable income like salary or retainers.</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground transition-all hover:scale-[1.01] hover:shadow-glow-primary disabled:opacity-60"
          >
            {isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {busy ? "Saving..." : isEdit ? "Save changes" : "Add income"}
          </button>
        </form>
      </div>
    </div>
  );
}
