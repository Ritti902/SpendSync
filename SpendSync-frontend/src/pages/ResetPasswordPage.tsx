import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, Wallet } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      toast.success("Password reset complete");
      navigate("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-background px-3 py-4 text-foreground sm:px-6 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] h-72 w-72 rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute bottom-[10%] right-[12%] h-80 w-80 rounded-full bg-secondary/40 blur-[130px]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100svh-4rem)]">
        <div className="flex w-full justify-end pb-4 sm:pb-6">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="mb-6 text-center sm:mb-8">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-primary sm:mb-5 sm:h-16 sm:w-16">
                <Wallet className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-normal sm:text-4xl">SpendSync</h1>
              <p className="mt-2 text-sm text-muted-foreground">Set a new password</p>
            </div>

            <div className="glass-card rounded-[1.35rem] p-4 sm:rounded-[1.75rem] sm:p-8">
              {!token ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">This reset link is missing a token.</p>
                  <Link to="/forgot-password" className="inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
                    Request a new link
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <PasswordField
                    id="password"
                    label="New password"
                    value={password}
                    show={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    onChange={setPassword}
                  />
                  <PasswordField
                    id="confirm"
                    label="Confirm password"
                    value={confirm}
                    show={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    onChange={setConfirm}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Reset password
                  </button>
                </form>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" aria-hidden="true" />
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="premium-input pl-11 pr-12"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-icon transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
