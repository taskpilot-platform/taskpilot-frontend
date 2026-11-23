import { Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import { useAuthStore } from "@/stores/auth.store";

export default function RootIndexRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  if (isHydrating) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background"
        role="status"
        aria-live="polite"
        data-testid="auth-hydrating-loader"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Navigate to="/dashboard" replace />;
}
