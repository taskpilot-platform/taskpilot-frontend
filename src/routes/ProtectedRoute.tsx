// src/routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

// Tạm thời giả lập, sau này bạn lấy token từ Zustand store
const isAuthenticated = () => {
  return localStorage.getItem("token") ? true : false;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    // Chưa đăng nhập thì đá văng ra trang login
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập thì cho phép render nội dung bên trong
  return <>{children}</>;
}
