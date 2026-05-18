import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";

export function AppShell({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
  }

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <DesktopSidebar />
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-2xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-icon lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
                <h1 className="truncate font-display text-base font-bold tracking-normal sm:text-xl">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-glow-primary" aria-label="Open profile menu">
                    {(user?.name || user?.email || "E").slice(0, 1).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="block truncate">{user?.name || "SpendSync"}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-border/60 bg-background/75 px-4 py-5 backdrop-blur-2xl lg:block">
      <SidebarContent onLogout={undefined} />
    </aside>
  );
}

function MobileSidebar({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative h-full w-[min(20rem,88vw)] overflow-y-auto border-r border-border bg-background p-4 shadow-elegant"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/70 text-icon"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onLogout={onLogout} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function SidebarContent({ onLogout }: { onLogout?: () => void }) {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-primary text-primary-foreground shadow-glow-primary [&_svg]:text-primary-foreground"
        : "text-muted-foreground [&_svg]:text-icon hover:bg-muted hover:text-foreground hover:[&_svg]:text-icon"
    }`;

  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="mb-8 flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-primary">
          <Wallet className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold tracking-normal">SpendSync</p>
          <p className="text-xs text-muted-foreground">Personal finance desk</p>
        </div>
      </Link>
      <nav className="space-y-2">
        <NavLink to="/" className={itemClass}>
          <LayoutDashboard className="h-5 w-5" /> Dashboard
        </NavLink>
        <NavLink to="/income" className={itemClass}>
          <TrendingUp className="h-5 w-5" /> Income
        </NavLink>
        <NavLink to="/history" className={itemClass}>
          <History className="h-5 w-5" /> History
        </NavLink>
        <NavLink to="/analytics" className={itemClass}>
          <BarChart3 className="h-5 w-5" /> Analytics
        </NavLink>
        <NavLink to="/categories" className={itemClass}>
          <FolderKanban className="h-5 w-5" /> Categories
        </NavLink>
        <NavLink to="/settings" className={itemClass}>
          <Settings className="h-5 w-5" /> Settings
        </NavLink>
      </nav>
      <div className="mt-auto space-y-3 pt-8">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3">
          <span className="text-sm font-semibold text-muted-foreground">Theme</span>
          <ThemeToggle label="Toggle sidebar theme" />
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/60 px-3 py-3 text-sm font-semibold text-muted-foreground [&_svg]:text-icon hover:text-foreground"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        )}
      </div>
    </div>
  );
}
