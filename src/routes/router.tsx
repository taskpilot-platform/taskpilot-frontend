// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";

// Import Layouts
import AuthLayout from "@/layouts/AuthLayout";
import MainLayout from "@/layouts/MainLayout";

// Import Pages
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";
import MySkillsPage from "@/pages/MySkillsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectWorkspacePage from "@/pages/ProjectWorkspacePage";
import ProjectSettingsPage from "@/pages/ProjectSettingsPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import TaskLinkResolverPage from "@/pages/TaskLinkResolverPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminGlobalSkillsPage from "@/pages/AdminGlobalSkillsPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import AiChatPage from "@/pages/AiChatPage";
import NotificationsPage from "@/pages/NotificationsPage";
import CommentsPage from "@/pages/CommentsPage";

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
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "/reset-password",
        element: <ResetPasswordPage />,
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
      {
        path: "/profile",
        element: <ProfilePage />,
      },
      {
        path: "/projects",
        element: <ProjectsPage />,
      },
      {
        path: "/projects/:projectId",
        element: <ProjectWorkspacePage />,
      },
      {
        path: "/projects/:projectId/:tabId",
        element: <ProjectWorkspacePage />,
      },
      {
        path: "/projects/:projectId/settings",
        element: <ProjectSettingsPage />,
      },
      {
        path: "/projects/:projectId/tasks/:taskId",
        element: <TaskDetailPage />,
      },
      {
        path: "/tasks",
        element: <TaskLinkResolverPage />,
      },
      {
        path: "/my-skills",
        element: <MySkillsPage />,
      },
      {
        path: "/notifications",
        element: <NotificationsPage />,
      },
      {
        path: "/notifications/:notificationId",
        element: <NotificationsPage />,
      },
      {
        path: "/comments",
        element: <CommentsPage />,
      },
      // Thêm các route khác của TaskPilot vào đây sau:
      // { path: "/tasks", element: <TasksPage /> },

      {
        path: "/copilot",
        element: <AiChatPage />,
      },

      // Admin
      {
        path: "/admin/users",
        element: <AdminUsersPage />,
      },
      {
        path: "/admin/skills",
        element: <AdminGlobalSkillsPage />,
      },
      {
        path: "/admin/settings",
        element: <AdminSettingsPage />,
      },
    ],
  },
]);
