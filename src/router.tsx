import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";

// Giả lập hàm kiểm tra login (Sau này sẽ thay bằng check token thật)
const isAuthenticated = () => {
  return localStorage.getItem("token") ? true : false;
};

// Component bảo vệ route (Chưa login thì đá về trang Login)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const router = createBrowserRouter([
  // 1. Route cho Authentication (Login/Register) - Không cần Sidebar
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <div>Trang đăng ký (Làm sau)</div>,
      },
    ],
  },

  // 2. Route chính (Dashboard, Project, Task) - Có Sidebar, Header
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: <DashboardPage />,
      },
      {
        path: "/projects",
        element: <div>Trang danh sách dự án</div>,
      },
      {
        path: "/tasks",
        element: <div>Trang quản lý Task</div>,
      },
    ],
  },

  // 3. Route 404
  {
    path: "*",
    element: <div>404 - Không tìm thấy trang</div>,
  },
]);
