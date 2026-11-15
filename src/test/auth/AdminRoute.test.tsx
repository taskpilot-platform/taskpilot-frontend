import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import axios, { AxiosHeaders } from "axios";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types/api";
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
    statusText: "OK",
    headers: new AxiosHeaders(),
    config,
  };
}

function buildMockAdapter(
  role: "USER" | "ADMIN",
  onAdminEndpoint?: (url: string) => void,
): AxiosAdapter {
  return async (config) => {
    const url = `${config.baseURL ?? ""}${config.url ?? ""}`;

    if (url.includes("/v1/admin/")) {
      onAdminEndpoint?.(url);
      return createResponse(config, 200, {
        status: 200,
        message: "OK",
        data: { content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 },
      });
    }

    if (url.endsWith("/v1/users/me")) {
      const profile: ApiResponse<UserProfile> = {
        status: 200,
        message: "OK",
        data: {
          id: role === "ADMIN" ? 1 : 2,
          email: `${role.toLowerCase()}@taskpilot.local`,
          fullName: role === "ADMIN" ? "System Admin" : "Standard User",
          avatarUrl: null,
          role,
          status: "AVAILABLE",
          currentWorkload: 0,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };
      return createResponse(config, 200, profile);
    }

    if (url.endsWith("/v1/notifications/my/unread-count")) {
      return createResponse(config, 200, { status: 200, message: "OK", data: 0 });
    }

    return createResponse(config, 200, {
      status: 200,
      message: "OK",
      data: [],
    });
  };
}

describe("P1.3 Admin route & navigation guard", () => {
  const originalAdapter = axios.defaults.adapter;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("blocks non-admin USER from /admin/users, /admin/skills, and /admin/settings routes even if localStorage userRole is stale ADMIN", async () => {
    const adminRequests: string[] = [];
    axios.defaults.adapter = buildMockAdapter("USER", (url) => {
      adminRequests.push(url);
    });

    const token = makeJwt({ sub: "2", role: "ADMIN", exp: Math.floor(Date.now() / 1000) + 900 });
    const { authStorage } = await import("@/lib/storage");
    authStorage.setAccessToken(token);
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    localStorage.setItem("userRole", "ADMIN");
    localStorage.setItem("navContext", "ADMIN_SYSTEM");

    const { useAuthStore } = await import("@/stores/auth.store");
    await Promise.resolve(useAuthStore.getState().hydrate());

    const { router } = await import("@/routes/router");
    for (const adminPath of ["/admin/users", "/admin/skills", "/admin/settings"]) {
      const memoryRouter = createMemoryRouter(router.routes, {
        initialEntries: [adminPath],
      });
      const { unmount } = render(<RouterProvider router={memoryRouter} />);

      await waitFor(() => {
        expect(memoryRouter.state.location.pathname).not.toBe(adminPath);
      });
      expect(screen.queryByTestId("nav-context-switcher")).not.toBeInTheDocument();
      unmount();
    }

    expect(adminRequests).toHaveLength(0);
  });

  it("allows authoritative ADMIN user to access /admin/users and shows admin navigation switcher", async () => {
    const adminRequests: string[] = [];
    axios.defaults.adapter = buildMockAdapter("ADMIN", (url) => {
      adminRequests.push(url);
    });

    const token = makeJwt({ sub: "1", exp: Math.floor(Date.now() / 1000) + 900 });
    const { authStorage } = await import("@/lib/storage");
    authStorage.setAccessToken(token);
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");

    const { useAuthStore } = await import("@/stores/auth.store");
    await Promise.resolve(useAuthStore.getState().hydrate());

    const { router } = await import("@/routes/router");
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/admin/users"],
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(memoryRouter.state.location.pathname).toBe("/admin/users");
      expect(screen.getByTestId("nav-context-switcher")).toBeInTheDocument();
      expect(adminRequests.some((u) => u.includes("/v1/admin/users"))).toBe(true);
    });
  });
});
