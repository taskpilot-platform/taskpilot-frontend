import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import i18n from "i18next";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
  }),
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("OAuth2 & Social Login Unit Tests", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
  });

  describe("SocialLoginButtons", () => {
    it("renders Google and GitHub login buttons", async () => {
      vi.spyOn(authService, "getOAuthProviders").mockResolvedValue({
        status: 200,
        message: "OK",
        data: ["google", "github"],
      });

      render(
        <MemoryRouter>
          <SocialLoginButtons />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "GitHub" })).toBeInTheDocument();
      });
    });

    it("does not render when no providers are available", async () => {
      vi.spyOn(authService, "getOAuthProviders").mockResolvedValue({
        status: 200,
        message: "OK",
        data: [],
      });

      const { container } = render(
        <MemoryRouter>
          <SocialLoginButtons />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe("AuthCallbackPage", () => {
    it("handles OAuth2 error callback and redirects to /login", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/callback?error=access_denied"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div>Login Page Redirect Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Login Page Redirect Target")).toBeInTheDocument();
      });
    });

    it("handles missing code parameter by redirecting to /login", async () => {
      render(
        <MemoryRouter initialEntries={["/auth/callback"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div>Login Page Redirect Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Login Page Redirect Target")).toBeInTheDocument();
      });
    });

    it("successfully exchanges valid one-time code and navigates to /dashboard", async () => {
      const loginWithOAuthCodeMock = vi.fn().mockResolvedValue({
        accessToken: "mock-jwt-token",
        refreshToken: "mock-refresh-token",
      });

      useAuthStore.setState({
        loginWithOAuthCode: loginWithOAuthCodeMock,
      });

      render(
        <MemoryRouter initialEntries={["/auth/callback?code=valid-one-time-code-123"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div>Dashboard Target</div>} />
            <Route path="/login" element={<div>Login Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(loginWithOAuthCodeMock).toHaveBeenCalledWith("valid-one-time-code-123");
        expect(screen.getByText("Dashboard Target")).toBeInTheDocument();
      });
    });
  });
});
