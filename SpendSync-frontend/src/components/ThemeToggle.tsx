import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme";

export function ThemeToggle({ label = "Toggle theme", className }: { label?: string; className?: string }) {
  const { resolvedTheme, toggleTheme, syncSystemTheme } = useThemeStore();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => syncSystemTheme();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [syncSystemTheme]);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 w-[4.75rem] shrink-0 items-center rounded-full border border-border bg-card/70 p-1 shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <Sun className="absolute left-2.5 h-4 w-4 text-icon" aria-hidden="true" />
      <Moon className="absolute right-2.5 h-4 w-4 text-icon/60" aria-hidden="true" />
      <motion.span
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow-primary"
        animate={{ x: isDark ? 34 : 0 }}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </motion.span>
    </button>
  );
}
