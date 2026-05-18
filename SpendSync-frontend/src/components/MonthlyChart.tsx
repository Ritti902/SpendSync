import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line } from "recharts";
import type { Expense, Income } from "@/lib/types";
import { formatCurrency } from "@/lib/categories";
import { parseApiDate } from "@/lib/dates";

export function MonthlyChart({
  expenses,
  income = [],
  monthDate,
  currency = "INR",
}: {
  expenses: Expense[];
  income?: Income[];
  monthDate: Date;
  currency?: string;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const data = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    expense: 0,
    income: 0,
    net: 0,
  }));

  for (const e of expenses) {
    const d = parseApiDate(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      data[d.getDate() - 1].expense += e.amount;
    }
  }
  for (const item of income) {
    const d = parseApiDate(item.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      data[d.getDate() - 1].income += item.amount;
    }
  }
  for (const point of data) point.net = point.income - point.expense;

  return (
    <div className="h-52 w-full sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 2, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(daysInMonth / 8)}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [formatCurrency(v, currency), name === "expense" ? "Expense" : name === "income" ? "Income" : "Net"]}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="expense" fill="url(#expenseFill)" radius={[6, 6, 2, 2]} />
          <Bar dataKey="income" fill="url(#incomeFill)" radius={[6, 6, 2, 2]} />
          <Line type="monotone" dataKey="net" stroke="hsl(var(--foreground))" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
