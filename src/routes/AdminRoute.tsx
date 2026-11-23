import type { ReactNode } from "react";
import ProtectedRoute from "./ProtectedRoute";

interface AdminRouteProps {
  children: ReactNode;
}

const ADMIN_ROLES = ["ADMIN"];

export default function AdminRoute({ children }: AdminRouteProps) {
  return (
    <ProtectedRoute requiredRoles={ADMIN_ROLES}>
      {children}
    </ProtectedRoute>
  );
}
