import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Settings, UserRound, Wallet } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { ThemePreference, useThemeStore } from "@/stores/theme";

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { theme, setTheme } = useThemeStore();
  const [name, setName] = useState(user?.name || user?.username || "");
  const [currency, setCurrency] = useState(user?.currencyPreference || "INR");
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || user.username || "");
    setCurrency(user.currencyPreference || "INR");
    setTimezone(user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
  }, [user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const nextUser = await api.updateProfile({
        name: name.trim(),
        username: name.trim(),
        currencyPreference: currency.trim().toUpperCase(),
        timezone: timezone.trim(),
        themePreference: theme,
      });
      updateUser(nextUser);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  async function changeTheme(value: ThemePreference) {
    setTheme(value);
    if (!user) return;
    try {
      const nextUser = await api.updateProfile({ themePreference: value });
      updateUser(nextUser);
    } catch {
      toast.message("Theme saved locally. Profile sync will retry when available.");
    }
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-background px-3 py-4 text-foreground sm:px-6 sm:py-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute left-[10%] top-[10%] h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[8%] h-96 w-96 rounded-full bg-secondary/25 blur-[140px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-icon transition hover:text-foreground"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
              <h1 className="font-display text-xl font-bold tracking-normal sm:text-2xl">Settings</h1>
            </div>
          </div>
          <ThemeToggle className="ml-auto" />
        </header>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            onSubmit={submit}
            className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-7"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-icon/15 text-icon">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold tracking-normal">Profile</h2>
                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" id="name">
                <input id="name" className="premium-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
              </Field>
              <Field label="Currency" id="currency">
                <input id="currency" className="premium-input uppercase" value={currency} onChange={(event) => setCurrency(event.target.value)} maxLength={3} />
              </Field>
              <Field label="Timezone" id="timezone">
                <input id="timezone" className="premium-input" value={timezone} onChange={(event) => setTimezone(event.target.value)} maxLength={80} />
              </Field>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary disabled:opacity-60 sm:w-auto"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </motion.form>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="space-y-5 sm:space-y-6"
          >
            <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-icon/15 text-icon">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold tracking-normal">Theme</h2>
                  <p className="text-sm text-muted-foreground">Light, dark, or system</p>
                </div>
              </div>
              <div className="grid gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void changeTheme(option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      theme === option.value ? "border-primary bg-primary text-primary-foreground shadow-glow-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-5">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-icon/15 text-icon">
                <Wallet className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-normal">Account</h2>
              <p className="mt-2 text-sm text-muted-foreground">Email/password authentication is active for this workspace.</p>
            </section>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
