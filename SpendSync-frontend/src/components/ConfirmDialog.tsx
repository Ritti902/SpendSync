import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4" role="alertdialog" aria-modal="true">
      <button aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-background/70 backdrop-blur-md animate-fade-up" />
      <div className="relative z-10 w-full max-w-sm animate-fade-up rounded-[1.35rem] glass-card p-4 sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              destructive ? "bg-destructive/15 text-destructive" : "bg-icon/15 text-icon"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button onClick={onCancel} aria-label="Close" className="rounded-full p-1.5 hover:bg-muted/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border bg-card/40 px-4 py-2 text-sm font-medium hover:bg-card"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-gradient-primary text-primary-foreground"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
