import type { Expense } from "./types";
import { getCategory } from "./categories";
import { compareApiDatesDesc, formatDateInputValue } from "./dates";

function esc(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportExpensesCsv(expenses: Expense[], filename = "expenses.csv") {
  const headers = ["Date", "Time", "Category", "Note", "Amount (INR)"];
  const rows = expenses
    .slice()
    .sort((a, b) => compareApiDatesDesc(a.date, b.date))
    .map((e) => {
      const hasTime = /T\d{2}:\d{2}/.test(e.date);
      const d = hasTime ? new Date(e.date) : null;
      return [
        formatDateInputValue(e.date),
        d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
        getCategory(e.category).label,
        e.note || "",
        e.amount.toFixed(2),
      ].map(esc).join(",");
    });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
