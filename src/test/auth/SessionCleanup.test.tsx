import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios, { AxiosError, AxiosHeaders } from "axios";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse } from "@/types/auth";
import type { UserProfile } from "@/types/user";

const oneSignalLoginMock = vi.fn(() => Promise.resolve());
const oneSignalLogoutMock = vi.fn(() => Promise.resolve());
const fetchEventSourceMock = vi.fn();

vi.mock("@/lib/onesignal", () => ({
  initOneSignal: vi.fn(() => Promise.resolve()),
  oneSignalLogin: oneSignalLoginMock,
  oneSignalLogout: oneSignalLogoutMock,
}));

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: fetchEventSourceMock,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function makeJwt(sub: string, expOffsetSec = 900): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const body = btoa(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + expOffsetSec }),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.sig`;
}

function createResponse<T>(
  config: InternalAxiosRequestConfig,
  status: number,
  data: T,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: "OK",
    headers: new AxiosHeaders(),
    config,
  };
}

function createHttpError(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
): AxiosError {
  return new AxiosError(
    message,
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    createResponse(config, status, { status, message }),
  );
}

describe("P1.3 Session cleanup, OneSignal alias & realtime teardown", () => {
  const originalAdapter = axios.defaults.adapter;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    localStorage.clear();
    oneSignalLoginMock.mockClear();
    oneSignalLogoutMock.mockClear();
    fetchEventSourceMock.mockReset();
    fetchEventSourceMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("clears tokens, user caches, OneSignal alias, and aborts notification SSE when refresh fails", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    let capturedSignal: AbortSignal | undefined;
    fetchEventSourceMock.mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
      capturedSignal = opts.signal;
      return new Promise(() => {
        // Keep SSE stream open until aborted
      });
    });

    const adapter: AxiosAdapter = async (config) => {
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      if (url.endsWith("/v1/users/me")) {
        const profile: ApiResponse<UserProfile> = {
          status: 200,
          message: "OK",
          data: {
            id: 10,
            email: "alice@taskpilot.local",
            fullName: "Alice",
            avatarUrl: null,
            role: "ADMIN",
            status: "AVAILABLE",
            currentWorkload: 0,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        };
        return createResponse(config, 200, profile);
      }
      if (url.endsWith("/v1/notifications/my/unread-count")) {
        return createResponse(config, 200, { status: 200, message: "OK", data: 2 });
      }
      if (url.endsWith("/v1/auth/refresh")) {
        throw createHttpError(config, 401, "Refresh token revoked");
      }
      throw createHttpError(config, 401, "Access expired");
    };

    axios.defaults.adapter = adapter;
    const { authStorage, projectStorage } = await import("@/lib/storage");
    const { api } = await import("@/lib/http");
    const { useAuthStore } = await import("@/stores/auth.store");

    const validToken = makeJwt("10", 900);
    authStorage.setAccessToken(validToken);
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    projectStorage.setLastProjectId(99);
    localStorage.setItem("userRole", "ADMIN");
    localStorage.setItem("navContext", "ADMIN_SYSTEM");
    localStorage.setItem("lastAdminPath", "/admin/users");
    localStorage.setItem("ai.pending.request.5", "client-msg-1");
    localStorage.setItem("taskpilot_user_theme_preference", "dark");
    localStorage.setItem("taskpilot_custom_group_chats", JSON.stringify([{ id: "grp-1", name: "Keep Me" }]));
    localStorage.setItem("taskpilot_custom_chat_msg_grp-1", JSON.stringify([{ id: 1, content: "Saved" }]));

    useAuthStore.setState({
      accessToken: validToken,
      refreshToken: "11111111-1111-4111-8111-111111111111",
      isAuthenticated: true,
    });

    const { default: MainLayout } = await import("@/layouts/MainLayout");
    const { unmount } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MainLayout />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchEventSourceMock).toHaveBeenCalled();
    });

    // TECH-CONFIG-01: Notification SSE must target /api/v1/notifications/my/stream by default
    expect(fetchEventSourceMock.mock.calls[0]?.[0]).toBe("/api/v1/notifications/my/stream");

    await expect(api.get("/v1/projects")).rejects.toThrow();

    await waitFor(() => {
      expect(authStorage.getAccessToken()).toBeNull();
      expect(authStorage.getRefreshToken()).toBeNull();
      expect(projectStorage.getLastProjectId()).toBeNull();
      expect(localStorage.getItem("userRole")).toBeNull();
      expect(localStorage.getItem("navContext")).toBeNull();
      expect(localStorage.getItem("lastAdminPath")).toBeNull();
      expect(localStorage.getItem("ai.pending.request.5")).toBeNull();
      expect(localStorage.getItem("taskpilot_user_theme_preference")).toBe("dark");
      expect(localStorage.getItem("taskpilot_custom_group_chats")).not.toBeNull();
      expect(localStorage.getItem("taskpilot_custom_chat_msg_grp-1")).not.toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(oneSignalLogoutMock).toHaveBeenCalled();
      expect(capturedSignal?.aborted).toBe(true);
    });

    unmount();
  });

  it("clears previous user caches and resets OneSignal alias before binding new user on account switch", async () => {
    const adapter: AxiosAdapter = async (config) => {
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      if (url.endsWith("/v1/auth/login")) {
        const body: ApiResponse<AuthResponse> = {
          status: 200,
          message: "OK",
          data: {
            token: makeJwt("20", 900),
            refreshToken: "33333333-3333-4333-8333-333333333333",
            type: "Bearer",
            expiresIn: 900,
          },
        };
        return createResponse(config, 200, body);
      }
      if (url.endsWith("/v1/auth/logout")) {
        return createResponse(config, 200, { status: 200, message: "OK", data: null });
      }
      if (url.endsWith("/v1/users/me")) {
        const profile: ApiResponse<UserProfile> = {
          status: 200,
          message: "OK",
          data: {
            id: 20,
            email: "bob@taskpilot.local",
            fullName: "Bob",
            avatarUrl: null,
            role: "USER",
            status: "AVAILABLE",
            currentWorkload: 0,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        };
        return createResponse(config, 200, profile);
      }
      throw createHttpError(config, 404, "Unexpected request");
    };

    axios.defaults.adapter = adapter;
    const { authStorage, projectStorage } = await import("@/lib/storage");
    const { useAuthStore } = await import("@/stores/auth.store");

    authStorage.setAccessToken(makeJwt("10", 900));
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    projectStorage.setLastProjectId(77);
    localStorage.setItem("userRole", "ADMIN");
    localStorage.setItem("navContext", "ADMIN_SYSTEM");
    localStorage.setItem("ai.pending.request.9", "stale-pending");

    useAuthStore.setState({
      accessToken: authStorage.getAccessToken(),
      refreshToken: authStorage.getRefreshToken(),
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();
    await useAuthStore.getState().login({
      email: "bob@taskpilot.local",
      password: "Password123!",
    });

    expect(oneSignalLogoutMock).toHaveBeenCalled();
    expect(oneSignalLoginMock).toHaveBeenCalledWith(20);
    expect(projectStorage.getLastProjectId()).toBeNull();
    expect(localStorage.getItem("navContext")).toBeNull();
    expect(localStorage.getItem("ai.pending.request.9")).toBeNull();
  });
});
