import { Home, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-3 py-6 sm:px-6">
      <div className="glass-card w-full max-w-md rounded-[1.35rem] p-5 text-center sm:rounded-[1.75rem] sm:p-8">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-primary sm:h-16 sm:w-16">
          <Wallet className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-normal sm:text-3xl">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">The route you requested does not exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary"
        >
          <Home className="h-4 w-4" />
          Back home
        </Link>
      </div>
    </main>
  );
}
