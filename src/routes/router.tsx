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
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import PasswordSetupPage from "@/pages/PasswordSetupPage";
import RestoreAccountPage from "@/pages/RestoreAccountPage";
import AcceptInvitationPage from "@/pages/AcceptInvitationPage";
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
import GlobalChatPage from "@/pages/GlobalChatPage";
import GlobalMeetingsPage from "@/pages/GlobalMeetingsPage";
import GlobalCalendarPage from "@/pages/GlobalCalendarPage";
import DemoRecommendationCardPage from "@/pages/DemoRecommendationCardPage";
import LandingPage from "@/pages/LandingPage";
import { setRedirectLoginHandler } from "@/lib/http";

// Import Guard
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import RootIndexRoute from "./RootIndexRoute";

export const router = createBrowserRouter([
  // 0. Public Landing Page (Truy cập công khai cho quảng bá & SEO)
  {
    path: "/landing",
    element: <LandingPage />,
  },

  // Root path: Khách chưa đăng nhập -> Landing Page (tối ưu SEO); Đã đăng nhập -> Dashboard
  {
    path: "/",
    element: <RootIndexRoute />,
  },

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
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },
      {
        path: "/verify-email",
        element: <VerifyEmailPage />,
      },
      {
        path: "/setup-password",
        element: <PasswordSetupPage />,
      },
      {
        path: "/restore-account",
        element: <RestoreAccountPage />,
      },
    ],
  },
  {
    path: "/invitations/accept",
    element: <AcceptInvitationPage />,
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
        path: "/dashboard",
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
        path: "/chat",
        element: <GlobalChatPage />,
      },
      {
        path: "/chat/:projectId",
        element: <GlobalChatPage />,
      },
      {
        path: "/meetings",
        element: <GlobalMeetingsPage />,
      },
      {
        path: "/meetings/:projectId",
        element: <GlobalMeetingsPage />,
      },
      {
        path: "/calendar",
        element: <GlobalCalendarPage />,
      },
      {
        path: "/calendar/:projectId",
        element: <GlobalCalendarPage />,
      },
      {
        path: "/copilot",
        element: <AiChatPage />,
      },
      {
        path: "/demo-recommendation",
        element: <DemoRecommendationCardPage />,
      },

      // Admin
      {
        path: "/admin/users",
        element: (
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/skills",
        element: (
          <AdminRoute>
            <AdminGlobalSkillsPage />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/settings",
        element: (
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        ),
      },
    ],
  },
]);

setRedirectLoginHandler(() => {
  void router.navigate("/login", { replace: true });
});
