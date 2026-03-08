// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";

// Import Layouts
import AuthLayout from "@/layouts/AuthLayout";
import MainLayout from "@/layouts/MainLayout";

// Import Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";

// Import Guard
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
  // 1. Nhóm Auth (Không cần đăng nhập)
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },

  // 2. Nhóm Main (Bắt buộc phải đăng nhập)
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
      // Thêm các route khác của TaskPilot vào đây sau:
      // { path: "/tasks", element: <TasksPage /> },
    ],
  },
]);
