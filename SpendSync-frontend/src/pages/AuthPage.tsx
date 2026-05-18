import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, Mail, Wallet } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

type AuthMode = "login" | "register" | "forgot";

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPassword("");
    setShowPassword(false);
  }, [mode]);

  const title = useMemo(() => {
    if (mode === "register") return "Create your account";
    if (mode === "forgot") return "Reset your password";
    return "Welcome back";
  }, [mode]);

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "forgot") {
        await api.forgotPassword(cleanEmail);
        toast.success("Reset link sent if the email exists");
        navigate("/login");
        return;
      }
      if (mode === "register") {
        await register({ email: cleanEmail, password, name: name.trim() || undefined });
        toast.success("Account created");
      } else {
        await login(cleanEmail, password);
        toast.success("Signed in");
      }
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-background px-3 py-4 text-foreground sm:px-6 sm:py-8">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100svh-4rem)]">
        <div className="flex w-full justify-end pb-4 sm:pb-6">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <motion.section
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="mb-6 text-center sm:mb-8">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-primary sm:mb-5 sm:h-16 sm:w-16">
                <Wallet className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-normal text-foreground sm:text-4xl">SpendSync</h1>
              <p className="mt-2 text-sm text-muted-foreground">{title}</p>
            </div>

            <div className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-8">
              {mode !== "forgot" && (
                <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-muted/50 p-1 sm:mb-6">
                  <Link
                    to="/login"
                    className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition sm:px-4 ${
                      mode === "login" ? "bg-primary text-primary-foreground shadow-glow-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition sm:px-4 ${
                      mode === "register" ? "bg-primary text-primary-foreground shadow-glow-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Register
                  </Link>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <Field label="Name" id="name">
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      className="premium-input"
                      maxLength={80}
                      placeholder="Your name"
                    />
                  </Field>
                )}

                <Field label="Email" id="email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" aria-hidden="true" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="premium-input pl-11"
                      placeholder="you@example.com"
                    />
                  </div>
                </Field>

                {mode !== "forgot" && (
                  <Field label="Password" id="password">
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" aria-hidden="true" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        className="premium-input pl-11 pr-12"
                        placeholder="Minimum 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-icon transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                )}

                {mode === "login" && (
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-sm font-medium text-icon hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}
                </button>
              </form>

              {mode === "forgot" && (
                <Link to="/login" className="mt-5 block text-center text-sm font-medium text-muted-foreground hover:text-foreground">
                  Back to login
                </Link>
              )}
            </div>
          </motion.section>
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

function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[12%] top-[15%] h-72 w-72 rounded-full bg-primary/25 blur-[110px]" />
      <div className="absolute bottom-[12%] right-[10%] h-80 w-80 rounded-full bg-secondary/45 blur-[120px] dark:bg-muted/30" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[150px]" />
    </div>
  );
}
