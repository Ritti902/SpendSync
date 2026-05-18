import type { Category } from "@/lib/types";

export type CategoryMeta = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  hue: number;
  type: "expense" | "income";
  isDefault?: boolean;
  source?: Category;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "food", label: "Food", emoji: "🍜", color: "#fb7185", hue: 351, type: "expense", isDefault: true },
  { id: "transport", label: "Transport", emoji: "🚕", color: "#38bdf8", hue: 199, type: "expense", isDefault: true },
  { id: "shopping", label: "Shopping", emoji: "🛍️", color: "#f472b6", hue: 330, type: "expense", isDefault: true },
  { id: "bills", label: "Bills", emoji: "🧾", color: "#facc15", hue: 45, type: "expense", isDefault: true },
  { id: "entertainment", label: "Entertainment", emoji: "🎉", color: "#c084fc", hue: 270, type: "expense", isDefault: true },
  { id: "health", label: "Health", emoji: "💊", color: "#4ade80", hue: 142, type: "expense", isDefault: true },
  { id: "education", label: "Education", emoji: "📚", color: "#60a5fa", hue: 214, type: "expense", isDefault: true },
  { id: "travel", label: "Travel", emoji: "✈️", color: "#2dd4bf", hue: 173, type: "expense", isDefault: true },
  { id: "other", label: "Other", emoji: "✨", color: "#818cf8", hue: 239, type: "expense", isDefault: true },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { id: "salary", label: "Salary", emoji: "💼", color: "#22c55e", hue: 142, type: "income", isDefault: true },
  { id: "freelance", label: "Freelance", emoji: "💻", color: "#06b6d4", hue: 188, type: "income", isDefault: true },
  { id: "investments", label: "Investments", emoji: "📈", color: "#a3e635", hue: 84, type: "income", isDefault: true },
  { id: "business", label: "Business", emoji: "🏢", color: "#14b8a6", hue: 174, type: "income", isDefault: true },
  { id: "gifts", label: "Gifts", emoji: "🎁", color: "#f59e0b", hue: 38, type: "income", isDefault: true },
  { id: "other", label: "Other", emoji: "✨", color: "#818cf8", hue: 239, type: "income", isDefault: true },
];

const LEGACY_ALIASES: Record<string, string> = {
  fun: "entertainment",
  investment: "investments",
  gift: "gifts",
};

const ICON_TO_EMOJI: Record<string, string> = {
  utensils: "🍜",
  car: "🚕",
  "shopping-bag": "🛍️",
  receipt: "🧾",
  "party-popper": "🎉",
  "heart-pulse": "💊",
  plane: "✈️",
  sparkles: "✨",
  briefcase: "💼",
  laptop: "💻",
  "trending-up": "📈",
  gift: "🎁",
  tag: "🏷️",
};

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function normalizeCategories(categories?: Category[], type: "expense" | "income" = "expense") {
  const defaults = type === "income" ? INCOME_CATEGORIES : CATEGORIES;
  if (!categories || categories.length === 0) return defaults;

  const visible = categories
    .filter((category) => category.type === type)
    .map((category) => {
      const fallback = defaults.find((item) => item.id === category.slug) ?? defaults[defaults.length - 1];
      const color = category.color || fallback.color;
      return {
        id: category.slug,
        label: category.name,
        emoji: emojiFromIcon(category.icon, fallback.emoji),
        color,
        hue: hexToHue(color, fallback.hue),
        type,
        isDefault: category.isDefault,
        source: category,
      } satisfies CategoryMeta;
    });

  const ids = new Set(visible.map((category) => category.id));
  return [...visible, ...defaults.filter((category) => !ids.has(category.id))];
}

export function getCategory(id: string, categories?: Category[], type: "expense" | "income" = "expense") {
  const normalized = normalizeCategoryKey(id);
  const all = normalizeCategories(categories, type);
  return (
    all.find((category) => normalizeCategoryKey(category.id) === normalized || normalizeCategoryKey(category.label) === normalized) ||
    all[all.length - 1]
  );
}

export function categoryStyle(category: CategoryMeta) {
  return {
    backgroundColor: `${category.color}24`,
    color: category.color,
    boxShadow: `0 0 24px ${category.color}26`,
  };
}

export function formatCurrency(n: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `Rs ${n.toFixed(2)}`;
  }
}

function normalizeCategoryKey(value: string) {
  const key = value.toLowerCase().trim().replace(/\s+/g, "-");
  return LEGACY_ALIASES[key] ?? key;
}

function emojiFromIcon(icon: string, fallback: string) {
  const cleaned = icon.trim();
  if (!cleaned) return fallback;
  return ICON_TO_EMOJI[cleaned] ?? cleaned;
}

function hexToHue(hex: string, fallback: number) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return fallback;
  const r = parseInt(match[1], 16) / 255;
  const g = parseInt(match[2], 16) / 255;
  const b = parseInt(match[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  if (max === g) hue = (b - r) / delta + 2;
  if (max === b) hue = (r - g) / delta + 4;
  return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
}
