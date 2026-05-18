import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";

const AuthPage = lazy(() => import("@/pages/AuthPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const IncomePage = lazy(() => import("@/pages/IncomePage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function Boot() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/income" element={<ProtectedRoute><IncomePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RouteLoader() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-elegant">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary shadow-glow-primary" />
        Loading SpendSync
      </div>
    </main>
  );
}

export default function App() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Boot />
        </BrowserRouter>
        <Sonner richColors theme={resolvedTheme} position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
