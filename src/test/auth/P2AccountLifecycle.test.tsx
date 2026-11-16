import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import PasswordSetupPage from "@/pages/PasswordSetupPage";
import RestoreAccountPage from "@/pages/RestoreAccountPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import { validatePassword } from "@/lib/password-policy";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { adminProjectRecoveryService, adminUserService } from "@/services/admin.service";
import { useAuthStore } from "@/stores/auth.store";
import i18n from "i18next";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("P2 Frontend Account Lifecycle & Credential Policy", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
  });

  it("enforces 8 code point minimum and 72 UTF-8 byte maximum on password policy", () => {
    expect(validatePassword("1234567")).toBe("too_short");
    expect(validatePassword("Valid1234")).toBeNull();
    expect(validatePassword("a".repeat(72))).toBeNull();
    expect(validatePassword("a".repeat(73))).toBe("too_long_bytes");
    expect(validatePassword("\uD83D\uDE00".repeat(18))).toBeNull();
    expect(validatePassword("\uD83D\uDE00".repeat(19))).toBe("too_long_bytes");
  });

  it("VerifyEmailPage submits mailbox owner chosen final password", async () => {
    const verifySpy = vi.spyOn(authService, "verifyEmail").mockResolvedValue({
      status: 200,
      message: "OK",
      data: undefined as unknown as void,
    });

    render(
      <MemoryRouter initialEntries={["/verify-email?token=verify-tok-123"]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/login" element={<div>Login View</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: "OwnerPass!99" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "OwnerPass!99" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify & Activate Account/i }));

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith({
        token: "verify-tok-123",
        newPassword: "OwnerPass!99",
      });
      expect(screen.getByText(/Email Verified/i)).toBeInTheDocument();
    });
  });

  it("PasswordSetupPage completes OAuth-only password setup and navigates to login", async () => {
    const setupSpy = vi.spyOn(authService, "completePasswordSetup").mockResolvedValue({
      status: 200,
      message: "OK",
      data: undefined as unknown as void,
    });

    render(
      <MemoryRouter initialEntries={["/setup-password?token=setup-tok-456"]}>
        <Routes>
          <Route path="/setup-password" element={<PasswordSetupPage />} />
          <Route path="/login" element={<div>Login After Setup</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: "SetupPass!99" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "SetupPass!99" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Password/i }));

    await waitFor(() => {
      expect(setupSpy).toHaveBeenCalledWith({
        token: "setup-tok-456",
        newPassword: "SetupPass!99",
      });
      expect(screen.getByText("Login After Setup")).toBeInTheDocument();
    });
  });

  it("RestoreAccountPage handles explicit restore confirmation and cancel", async () => {
    const confirmMock = vi.fn().mockResolvedValue({
      token: "t",
      refreshToken: "r",
      type: "Bearer",
      expiresIn: 900,
      outcome: "AUTHENTICATED",
    });
    const cancelSpy = vi.spyOn(authService, "cancelRestore").mockResolvedValue({
      status: 200,
      message: "OK",
      data: undefined as unknown as void,
    });
    useAuthStore.setState({ confirmRestore: confirmMock });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/restore-account", state: { ticket: "restore-ticket-1", email: "me@example.com" } },
        ]}
      >
        <Routes>
          <Route path="/restore-account" element={<RestoreAccountPage />} />
          <Route path="/dashboard" element={<div>Dashboard Restored</div>} />
          <Route path="/login" element={<div>Login Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirm Restore/i }));
    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith("restore-ticket-1");
      expect(screen.getByText("Dashboard Restored")).toBeInTheDocument();
    });
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it("AuthCallbackPage routes LINK_COMPLETED back to /profile without losing active session", async () => {
    const originalLoginWithOAuthCode = useAuthStore.getState().loginWithOAuthCode;
    try {
      useAuthStore.setState({
        isAuthenticated: true,
        accessToken: "existing-jwt",
        loginWithOAuthCode: vi.fn().mockResolvedValue({
          token: null,
          refreshToken: null,
          type: null,
          expiresIn: null,
          outcome: "LINK_COMPLETED",
          provider: "github",
        }),
      });

      render(
        <MemoryRouter initialEntries={["/auth/callback?code=link-code-1"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/profile" element={<div>Profile After Link</div>} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Profile After Link")).toBeInTheDocument();
        expect(useAuthStore.getState().accessToken).toBe("existing-jwt");
      });
    } finally {
      useAuthStore.setState({ loginWithOAuthCode: originalLoginWithOAuthCode });
    }
  });

  it("ProfilePage renders email-based password setup for OAuth-only user and updates availability", async () => {
    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 1,
        email: "oauth@example.com",
        fullName: "OAuth User",
        avatarUrl: null,
        role: "USER",
        status: "AVAILABLE",
        availability: "AVAILABLE",
        accountState: "ACTIVE",
        emailVerified: true,
        hasPassword: false,
        linkedProviders: ["google"],
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    const availSpy = vi.spyOn(profileService, "updateAvailability").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 1,
        email: "oauth@example.com",
        fullName: "OAuth User",
        avatarUrl: null,
        role: "USER",
        status: "OOO",
        availability: "OOO",
        accountState: "ACTIVE",
        emailVerified: true,
        hasPassword: false,
        linkedProviders: ["google"],
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    const reqSetupSpy = vi.spyOn(authService, "requestPasswordSetup").mockResolvedValue({
      status: 200,
      message: "OK",
      data: undefined as unknown as void,
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Work Availability/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Work Availability/i), { target: { value: "OOO" } });
    await waitFor(() => {
      expect(availSpy).toHaveBeenCalledWith({ availability: "OOO" });
    });

    fireEvent.click(screen.getByRole("button", { name: /Security/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send Password Setup Email/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Password Setup Email/i }));
    await waitFor(() => {
      expect(reqSetupSpy).toHaveBeenCalled();
    });
  });

  it("ProfilePage shows avatarRejected alert, links OAuth with current password, and renders blocking project IDs on 409", async () => {
    useAuthStore.setState({ accessToken: "active-user-jwt", isAuthenticated: true, isHydrating: false });
    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 5,
        email: "user@example.com",
        fullName: "Local User",
        avatarUrl: null,
        avatarRejected: true,
        role: "USER",
        status: "AVAILABLE",
        availability: "AVAILABLE",
        accountState: "ACTIVE",
        emailVerified: true,
        hasPassword: true,
        linkedProviders: ["google"],
        currentWorkload: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    const beginLinkSpy = vi.spyOn(profileService, "beginProviderLink").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { linkToken: "link-intent-tok", provider: "github", expiresInSeconds: 300 },
    });
    const deactivateErr = new AxiosError(
      "Conflict",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 409,
        statusText: "Conflict",
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {
          status: 409,
          message: "Sole active manager",
          data: { blockingProjectIds: [77, 88] },
        },
      },
    );
    vi.spyOn(profileService, "selfDeactivate").mockRejectedValue(deactivateErr);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/previous avatar URL is blocked/i);
    });

    fireEvent.click(screen.getByRole("button", { name: /Security/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Current password to authorize linking/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Current password to authorize linking/i), {
      target: { value: "CurrentPass!99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Connect Github/i }));
    await waitFor(() => {
      expect(beginLinkSpy).toHaveBeenCalledWith({
        provider: "github",
        currentPassword: "CurrentPass!99",
        reauthTicket: undefined,
      });
    });

    fireEvent.change(screen.getByPlaceholderText(/Type "DEACTIVATE"/i), { target: { value: "DEACTIVATE" } });
    fireEvent.change(screen.getByPlaceholderText("Current password"), { target: { value: "CurrentPass!99" } });
    fireEvent.click(screen.getByRole("button", { name: /Self-Deactivate Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/#77, #88/i)).toBeInTheDocument();
    });
    expect(useAuthStore.getState().accessToken).toBe("active-user-jwt");
  });

  it("AuthCallbackPage maps provider/link errors back to /profile or /login and forwards EMAIL_VERIFICATION_REQUIRED email", async () => {
    for (const errCode of [
      "provider_already_bound",
      "provider_already_linked",
      "provider_reauth_mismatch",
      "invalid_link_state",
    ]) {
      useAuthStore.setState({ accessToken: "signed-in-jwt", isAuthenticated: true, isHydrating: false });
      const { unmount } = render(
        <MemoryRouter initialEntries={[`/auth/callback?error=${errCode}`]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/profile" element={<div>Back To Profile On {errCode}</div>} />
            <Route path="/login" element={<div>Login View</div>} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getByText(`Back To Profile On ${errCode}`)).toBeInTheDocument();
      });
      unmount();
    }

    useAuthStore.setState({ accessToken: null, isAuthenticated: false, isHydrating: false });
    const inactiveView = render(
      <MemoryRouter initialEntries={["/auth/callback?error=account_inactive"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/login" element={<div>Login On Inactive</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Login On Inactive")).toBeInTheDocument();
    });
    inactiveView.unmount();

    vi.spyOn(authService, "exchangeOAuthCode").mockResolvedValue({
      status: 200,
      message: "Verify",
      data: {
        token: null,
        refreshToken: null,
        type: null,
        expiresIn: null,
        outcome: "EMAIL_VERIFICATION_REQUIRED",
        email: "verify.me@example.com",
      },
    });
    render(
      <MemoryRouter initialEntries={["/auth/callback?code=verify-code-1"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue("verify.me@example.com")).toBeInTheDocument();
    });
  });

  it("AdminUsersPage suspends user, shows lifecycle/availability badges, and transfers manager for attention-required projects", async () => {
    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 1,
        email: "admin@example.com",
        fullName: "Admin",
        avatarUrl: null,
        role: "ADMIN",
        status: "AVAILABLE",
        availability: "AVAILABLE",
        accountState: "ACTIVE",
        emailVerified: true,
        hasPassword: true,
        linkedProviders: [],
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    vi.spyOn(adminUserService, "getAllUsers").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        content: [
          {
            id: 2,
            email: "member@example.com",
            fullName: "Target Member",
            avatarUrl: null,
            role: "USER",
            status: "AVAILABLE",
            availability: "AVAILABLE",
            accountState: "ACTIVE",
            emailVerified: true,
            currentWorkload: 2,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
      },
    });
    const suspendSpy = vi.spyOn(adminUserService, "suspendUser").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 2,
        email: "member@example.com",
        fullName: "Target Member",
        avatarUrl: null,
        role: "USER",
        status: "DEACTIVATED",
        availability: "AVAILABLE",
        accountState: "ADMIN_SUSPENDED",
        emailVerified: true,
        currentWorkload: 2,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    vi.spyOn(adminProjectRecoveryService, "listAttentionRequired").mockResolvedValue({
      status: 200,
      message: "OK",
      data: [
        {
          projectId: 42,
          projectName: "Critical Recovery",
          projectStatus: "ACTIVE",
          reason: "NO_ACTIVE_MANAGER",
          since: "2026-11-16T00:00:00Z",
          attentionEventId: "evt-42",
          eligibleActiveMembers: [
            { userId: 9, fullName: "Eligible Handover", email: "handover@example.com", currentRole: "MEMBER" },
          ],
        },
      ],
    });
    const transferSpy = vi.spyOn(adminProjectRecoveryService, "transferManager").mockResolvedValue({
      status: 200,
      message: "OK",
      data: null,
    });

    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("member@example.com")).toBeInTheDocument();
      expect(screen.getByText("#42 · Critical Recovery")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("member@example.com"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Suspend Account/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Suspend Account/i }));
    await waitFor(() => {
      expect(suspendSpy).toHaveBeenCalledWith(2, undefined);
    });

    fireEvent.click(screen.getByRole("button", { name: /Transfer Manager/i }));
    await waitFor(() => {
      expect(transferSpy).toHaveBeenCalledWith(42, {
        targetUserId: 9,
        reason: "Admin manager transfer",
      });
    });
  });
});
