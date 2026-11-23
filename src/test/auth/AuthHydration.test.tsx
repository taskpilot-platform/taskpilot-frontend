import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: vi.fn(() => Promise.resolve()),
}));

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const body = btoa(JSON.stringify(payload))
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
    statusText: status === 200 ? "OK" : "ERROR",
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

function getHeader(
  config: InternalAxiosRequestConfig,
  name: string,
): string | undefined {
  const headers = config.headers as AxiosHeaders | Record<string, unknown>;
  if (headers && typeof (headers as AxiosHeaders).get === "function") {
    const val = (headers as AxiosHeaders).get(name);
    return typeof val === "string" ? val : undefined;
  }
  const direct = (headers as Record<string, unknown>)[name] ??
    (headers as Record<string, unknown>)[name.toLowerCase()];
  return typeof direct === "string" ? direct : undefined;
}

describe("P1.3 Auth hydration & authoritative profile role", () => {
  const originalAdapter = axios.defaults.adapter;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("refreshes expired access token during hydrate() when refreshToken exists and loads authoritative profile", async () => {
    const expiredAccess = makeJwt({
      sub: "42",
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    const freshAccess = makeJwt({
      sub: "42",
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    let refreshCalls = 0;
    let profileCalls = 0;

    const adapter: AxiosAdapter = async (config) => {
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      const authHeader = getHeader(config, "Authorization");

      if (url.endsWith("/v1/auth/refresh")) {
        refreshCalls += 1;
        const body: ApiResponse<AuthResponse> = {
          status: 200,
          message: "OK",
          data: {
            token: freshAccess,
            refreshToken: "22222222-2222-4222-8222-222222222222",
            type: "Bearer",
            expiresIn: 900,
          },
        };
        return createResponse(config, 200, body);
      }

      if (url.endsWith("/v1/users/me")) {
        expect(authHeader).toBe(`Bearer ${freshAccess}`);
        profileCalls += 1;
        const body: ApiResponse<UserProfile> = {
          status: 200,
          message: "OK",
          data: {
            id: 42,
            email: "admin@taskpilot.local",
            fullName: "Admin User",
            avatarUrl: null,
            role: "ADMIN",
            status: "AVAILABLE",
            currentWorkload: 0,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        };
        return createResponse(config, 200, body);
      }

      throw createHttpError(config, 404, "Unexpected request");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    authStorage.setAccessToken(expiredAccess);
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");

    const { useAuthStore } = await import("@/stores/auth.store");
    await Promise.resolve(useAuthStore.getState().hydrate());

    expect(refreshCalls).toBe(1);
    expect(profileCalls).toBeGreaterThanOrEqual(1);
    expect(authStorage.getAccessToken()).toBe(freshAccess);
    expect(authStorage.getRefreshToken()).toBe("22222222-2222-4222-8222-222222222222");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe(freshAccess);
  });

  it("does not trust JWT role claim or stale localStorage userRole when authoritative profile returns USER", async () => {
    const forgedRoleAccess = makeJwt({
      sub: "7",
      role: "ADMIN",
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    let resolveProfile!: (res: AxiosResponse<ApiResponse<UserProfile>>) => void;

    const adapter: AxiosAdapter = async (config) => {
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      if (url.endsWith("/v1/users/me")) {
        return new Promise<AxiosResponse<ApiResponse<UserProfile>>>((resolve) => {
          resolveProfile = resolve;
        }).then((res) => ({ ...res, config }));
      }
      if (url.endsWith("/v1/notifications/my/unread-count")) {
        return createResponse(config, 200, { status: 200, message: "OK", data: 0 });
      }
      throw createHttpError(config, 404, "Unexpected request");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    authStorage.setAccessToken(forgedRoleAccess);
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    localStorage.setItem("userRole", "ADMIN");

    const { useAuthStore } = await import("@/stores/auth.store");
    const hydratePromise = Promise.resolve(useAuthStore.getState().hydrate());
    const { default: MainLayout } = await import("@/layouts/MainLayout");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MainLayout />
      </MemoryRouter>,
    );

    // While authoritative profile is still loading, stale localStorage/JWT ADMIN must NOT render admin switcher
    expect(screen.queryByTestId("nav-context-switcher")).not.toBeInTheDocument();

    resolveProfile(
      createResponse({} as InternalAxiosRequestConfig, 200, {
        status: 200,
        message: "OK",
        data: {
          id: 7,
          email: "member@taskpilot.local",
          fullName: "Member User",
          avatarUrl: null,
          role: "USER",
          status: "AVAILABLE",
          currentWorkload: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      }),
    );

    await hydratePromise;
    await waitFor(() => {
      expect(screen.queryByTestId("nav-context-switcher")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-admin-users")).not.toBeInTheDocument();
    });
  });

  it("attempts refresh once during hydrate() and clears session if refresh fails", async () => {
    const expiredAccess = makeJwt({
      sub: "42",
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    let refreshCalls = 0;

    const adapter: AxiosAdapter = async (config) => {
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      if (url.endsWith("/v1/auth/refresh")) {
        refreshCalls += 1;
        throw createHttpError(config, 401, "Expired refresh token");
      }
      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    authStorage.setAccessToken(expiredAccess);
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");

    const { useAuthStore } = await import("@/stores/auth.store");
    await Promise.resolve(useAuthStore.getState().hydrate());

    expect(refreshCalls).toBe(1);
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
