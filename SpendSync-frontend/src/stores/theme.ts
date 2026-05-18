import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "spendsync-theme";

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

function applyTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

type ThemeState = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  syncSystemTheme: () => void;
};

const initialTheme = (() => {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
})();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme, resolvedTheme: resolveTheme(theme) });
  },
  toggleTheme: () => {
    const next = get().resolvedTheme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
  syncSystemTheme: () => {
    const { theme } = get();
    applyTheme(theme);
    set({ resolvedTheme: resolveTheme(theme) });
  },
}));

applyTheme(initialTheme);
