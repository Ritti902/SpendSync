import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FolderKanban, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { categoryStyle, getCategory, normalizeCategories } from "@/lib/categories";
import type { Category } from "@/lib/types";

const EMOJIS = ["🍜", "🚕", "🛍️", "🧾", "🎉", "💊", "📚", "✈️", "✨", "💼", "💻", "📈", "🏢", "🎁", "🏷️", "💡", "🏠", "💳"];
const COLORS = ["#fb7185", "#38bdf8", "#f472b6", "#facc15", "#c084fc", "#4ade80", "#60a5fa", "#2dd4bf", "#818cf8", "#22c55e", "#f59e0b", "#14b8a6"];

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏷️");
  const [color, setColor] = useState("#38bdf8");

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const visible = useMemo(() => normalizeCategories(categories, type), [categories, type]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Category name is required");
      if (editing) {
        return api.updateCategory(editing.id, { name: name.trim(), icon: emoji, color, type });
      }
      return api.createCategory({ name: name.trim(), icon: emoji, color, type });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editing ? "Category updated" : "Category created");
      resetForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (category: Category) => api.deleteCategory(category.id),
    onMutate: async (category) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previous = queryClient.getQueryData<Category[]>(["categories"]) ?? [];
      queryClient.setQueryData<Category[]>(["categories"], previous.filter((item) => item.id !== category.id));
      setConfirmDelete(null);
      return { previous };
    },
    onError: (error, _category, context) => {
      queryClient.setQueryData(["categories"], context?.previous ?? []);
      toast.error(error instanceof Error ? error.message : "Could not delete category");
    },
    onSuccess: () => toast.success("Category deleted"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  function startEdit(category: Category) {
    setEditing(category);
    setType(category.type);
    setName(category.name);
    setEmoji(getCategory(category.slug, categories, category.type).emoji);
    setColor(category.color || "#38bdf8");
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setEmoji("🏷️");
    setColor("#38bdf8");
  }

  return (
    <AppShell eyebrow="Categories" title="Expense and income categories">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Manage</p>
              <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Custom categories</h2>
            </div>
            <div className="flex rounded-xl border border-border bg-card/60 p-1">
              {(["expense", "income"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${type === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              {visible.map((category, index) => {
                const raw = category.source;
                return (
                  <motion.div
                    key={`${category.type}-${category.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                    className="rounded-2xl border border-border/60 bg-card/45 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={categoryStyle(category)}>
                          {category.emoji}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{category.label}</p>
                          <p className="text-xs text-muted-foreground">{raw?.isDefault ? "Default" : "Custom"} category</p>
                        </div>
                      </div>
                      {raw && !raw.isDefault && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(raw)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-icon/15 hover:text-icon"
                            aria-label={`Edit ${raw.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(raw)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                            aria-label={`Delete ${raw.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{editing ? "Edit" : "Create"}</p>
              <h2 className="font-display text-xl font-bold tracking-normal sm:text-2xl">{editing ? editing.name : "New category"}</h2>
            </div>
            <FolderKanban className="h-5 w-5 text-icon" />
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Category name"
                maxLength={80}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Emoji</label>
              <div className="grid grid-cols-6 gap-2 min-[380px]:grid-cols-9 xl:grid-cols-6">
                {EMOJIS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEmoji(item)}
                    className={`grid h-10 place-items-center rounded-xl border text-lg ${emoji === item ? "border-primary bg-primary/15" : "border-border bg-muted/30 hover:bg-muted/60"}`}
                    aria-label={`Use ${item}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setColor(item)}
                    className={`h-9 w-9 rounded-xl border ${color === item ? "border-foreground ring-2 ring-primary/30" : "border-border"}`}
                    style={{ backgroundColor: item }}
                    aria-label={`Use ${item}`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-12 rounded-xl border border-border bg-transparent p-1"
                  aria-label="Custom color"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-semibold"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create category"}
              </button>
            </div>
          </form>
        </aside>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this category?"
        description={confirmDelete?.name}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        busy={deleteMutation.isPending}
      />
    </AppShell>
  );
}
