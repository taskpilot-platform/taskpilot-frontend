import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError, AxiosHeaders, CanceledError } from "axios";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse } from "@/types/auth";

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
  message = `Request failed with status ${status}`,
): AxiosError {
  return new AxiosError(
    message,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
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

function getRequestPath(config: InternalAxiosRequestConfig): string {
  const base = config.baseURL ?? "";
  const url = config.url ?? "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${base}${url}`;
}

describe("P1.3 HTTP single-flight refresh & TECH-CONFIG-01", () => {
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

  it("TECH-CONFIG-01: defaults API baseURL to /api when VITE_API_BASE_URL is unset and preserves explicit override", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { http: defaultHttp } = await import("@/lib/http");
    const { getOAuthAuthorizeUrl: defaultOAuthUrl } = await import("@/services/auth.service");
    expect(defaultHttp.defaults.baseURL).toBe("/api");
    expect(defaultOAuthUrl("google")).toBe("/oauth2/authorization/google");

    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "https://api.taskpilot.example/api");
    const { http: customHttp } = await import("@/lib/http");
    const { getOAuthAuthorizeUrl: customOAuthUrl } = await import("@/services/auth.service");
    expect(customHttp.defaults.baseURL).toBe("https://api.taskpilot.example/api");
    expect(customOAuthUrl("github")).toBe("https://api.taskpilot.example/oauth2/authorization/github");
  });

  it("collapses N concurrent protected 401 responses into one un-intercepted refresh, saves rotated tokens atomically, and replays each once", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const observedCalls: Array<{
      path: string;
      authHeader: string | undefined;
    }> = [];
    let refreshCount = 0;

    const adapter: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      const authHeader = getHeader(config, "Authorization");
      observedCalls.push({ path, authHeader });

      if (path.endsWith("/v1/auth/refresh")) {
        refreshCount += 1;
        expect(authHeader).toBeUndefined();
        await new Promise((resolve) => setTimeout(resolve, 15));
        const body: ApiResponse<AuthResponse> = {
          status: 200,
          message: "OK",
          data: {
            token: "fresh-access-token",
            refreshToken: "22222222-2222-4222-8222-222222222222",
            type: "Bearer",
            expiresIn: 900,
          },
        };
        return createResponse(config, 200, body);
      }

      if (authHeader === "Bearer fresh-access-token") {
        return createResponse(config, 200, {
          status: 200,
          message: "OK",
          data: { path },
        });
      }

      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    const { api } = await import("@/lib/http");
    const { useAuthStore } = await import("@/stores/auth.store");

    authStorage.setAccessToken("expired-access-token");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    useAuthStore.setState({
      accessToken: "expired-access-token",
      refreshToken: "11111111-1111-4111-8111-111111111111",
      isAuthenticated: true,
    });

    const [r1, r2, r3] = await Promise.all([
      api.get<{ path: string }>("/v1/projects"),
      api.get<{ path: string }>("/v1/notifications/my"),
      api.get<{ path: string }>("/v1/users/me"),
    ]);

    expect(refreshCount).toBe(1);
    expect(r1.data.path).toBe("/api/v1/projects");
    expect(r2.data.path).toBe("/api/v1/notifications/my");
    expect(r3.data.path).toBe("/api/v1/users/me");
    expect(authStorage.getAccessToken()).toBe("fresh-access-token");
    expect(authStorage.getRefreshToken()).toBe("22222222-2222-4222-8222-222222222222");
    expect(useAuthStore.getState().accessToken).toBe("fresh-access-token");
    expect(useAuthStore.getState().refreshToken).toBe("22222222-2222-4222-8222-222222222222");
    expect(
      observedCalls.filter((c) => c.path.endsWith("/v1/projects")),
    ).toHaveLength(2);
  });

  it("never refreshes on 403 Forbidden and keeps existing tokens intact", async () => {
    let refreshCount = 0;

    const adapter: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      if (path.endsWith("/v1/auth/refresh")) {
        refreshCount += 1;
      }
      throw createHttpError(config, 403, "Forbidden");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    const { api } = await import("@/lib/http");

    authStorage.setAccessToken("valid-user-token");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");

    await expect(api.get("/v1/admin/users")).rejects.toThrow();
    expect(refreshCount).toBe(0);
    expect(authStorage.getAccessToken()).toBe("valid-user-token");
    expect(authStorage.getRefreshToken()).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("excludes auth, refresh, setup, and restore endpoints from 401 refresh loops", async () => {
    let refreshCalls = 0;

    const adapter: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      if (path.endsWith("/v1/auth/refresh")) {
        refreshCalls += 1;
      }
      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    const { api } = await import("@/lib/http");

    authStorage.setAccessToken("some-access");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");

    await expect(api.post("/v1/auth/login", { email: "a@b.com", password: "bad" })).rejects.toThrow();
    await expect(api.post("/v1/auth/setup/confirm", { token: "t" })).rejects.toThrow();
    await expect(api.post("/v1/auth/restore/confirm", { ticket: "t" })).rejects.toThrow();
    expect(refreshCalls).toBe(0);

    await expect(
      api.post("/v1/auth/refresh", {
        refreshToken: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toThrow();
    expect(refreshCalls).toBe(1);
  });

  it("does not recurse when refresh returns 401 and stops after 1 replay if replayed request still returns 401", async () => {
    let refreshCount = 0;
    let protectedCount = 0;

    const adapterFailRefresh: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      if (path.endsWith("/v1/auth/refresh")) {
        refreshCount += 1;
        throw createHttpError(config, 401, "Refresh revoked");
      }
      protectedCount += 1;
      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapterFailRefresh;
    const { authStorage } = await import("@/lib/storage");
    const { api, setRedirectLoginHandler } = await import("@/lib/http");
    const { useAuthStore } = await import("@/stores/auth.store");

    const redirectSpy = vi.fn();
    setRedirectLoginHandler(redirectSpy);

    authStorage.setAccessToken("expired-access");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    useAuthStore.setState({
      accessToken: "expired-access",
      refreshToken: "11111111-1111-4111-8111-111111111111",
      isAuthenticated: true,
    });

    await Promise.allSettled([api.get("/v1/projects"), api.get("/v1/notifications/my")]);
    expect(refreshCount).toBe(1);
    expect(protectedCount).toBe(2);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    vi.resetModules();
    refreshCount = 0;
    protectedCount = 0;

    const adapterReplayStill401: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      if (path.endsWith("/v1/auth/refresh")) {
        refreshCount += 1;
        return createResponse(config, 200, {
          status: 200,
          message: "OK",
          data: {
            token: "new-token-still-rejected",
            refreshToken: "22222222-2222-4222-8222-222222222222",
            type: "Bearer",
            expiresIn: 900,
          },
        });
      }
      protectedCount += 1;
      throw createHttpError(config, 401, "Still unauthorized");
    };

    axios.defaults.adapter = adapterReplayStill401;
    const { authStorage: storage2 } = await import("@/lib/storage");
    const { api: api2 } = await import("@/lib/http");
    storage2.setAccessToken("expired-access");
    storage2.setRefreshToken("11111111-1111-4111-8111-111111111111");

    await expect(api2.get("/v1/projects")).rejects.toThrow();
    expect(refreshCount).toBe(1);
    expect(protectedCount).toBe(2);
  });

  it("respects AbortSignal cancellation while single-flight refresh is pending without replaying cancelled request", async () => {
    let resolveRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    let replayAttempted = false;

    const adapter: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      const authHeader = getHeader(config, "Authorization");

      if (path.endsWith("/v1/auth/refresh")) {
        await refreshGate;
        return createResponse(config, 200, {
          status: 200,
          message: "OK",
          data: {
            token: "fresh-access",
            refreshToken: "22222222-2222-4222-8222-222222222222",
            type: "Bearer",
            expiresIn: 900,
          },
        });
      }

      if (path.endsWith("/v1/cancelled-resource")) {
        if (authHeader === "Bearer fresh-access") {
          replayAttempted = true;
        }
        throw createHttpError(config, 401, "Unauthorized");
      }

      if (authHeader === "Bearer fresh-access") {
        return createResponse(config, 200, { status: 200, message: "OK", data: { ok: true } });
      }
      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    const { http } = await import("@/lib/http");

    authStorage.setAccessToken("expired-access");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");

    const controller = new AbortController();
    const cancelledReq = http.get("/v1/cancelled-resource", {
      signal: controller.signal,
    });
    const activeReq = http.get("/v1/active-resource");

    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    resolveRefresh();

    try {
      await cancelledReq;
      expect.unreachable("Expected cancelled request to reject");
    } catch (err) {
      expect(
        axios.isCancel(err) ||
          err instanceof CanceledError ||
          (err as Error)?.name === "AbortError",
      ).toBe(true);
    }
    const activeRes = await activeReq;
    expect(activeRes.status).toBe(200);
    expect(replayAttempted).toBe(false);
  });

  it("prevents logout-while-refresh-pending from resurrecting the session", async () => {
    let resolveRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    const adapter: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      if (path.endsWith("/v1/auth/refresh")) {
        await refreshGate;
        return createResponse(config, 200, {
          status: 200,
          message: "OK",
          data: {
            token: "resurrected-access",
            refreshToken: "33333333-3333-4333-8333-333333333333",
            type: "Bearer",
            expiresIn: 900,
          },
        });
      }
      if (path.endsWith("/v1/auth/logout")) {
        return createResponse(config, 200, { status: 200, message: "OK", data: null });
      }
      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    const { api } = await import("@/lib/http");
    const { useAuthStore } = await import("@/stores/auth.store");

    authStorage.setAccessToken("expired-access");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    useAuthStore.setState({
      accessToken: "expired-access",
      refreshToken: "11111111-1111-4111-8111-111111111111",
      isAuthenticated: true,
    });

    const pendingProtected = api.get("/v1/projects");
    await new Promise((resolve) => setTimeout(resolve, 10));

    await useAuthStore.getState().logout();
    resolveRefresh();

    await expect(pendingProtected).rejects.toThrow();
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("coordinates with another tab that already rotated tokens in storage", async () => {
    let refreshNetworkCalls = 0;

    const futureJwt = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ sub: "7", exp: Math.floor(Date.now() / 1000) + 600 }))}.sig`;

    const adapter: AxiosAdapter = async (config) => {
      const path = getRequestPath(config);
      const authHeader = getHeader(config, "Authorization");

      if (path.endsWith("/v1/auth/refresh")) {
        refreshNetworkCalls += 1;
        return createResponse(config, 200, {
          status: 200,
          message: "OK",
          data: {
            token: futureJwt,
            refreshToken: "99999999-9999-4999-8999-999999999999",
            type: "Bearer",
            expiresIn: 900,
          },
        });
      }

      if (authHeader === `Bearer ${futureJwt}`) {
        return createResponse(config, 200, { status: 200, message: "OK", data: { synced: true } });
      }
      throw createHttpError(config, 401, "Unauthorized");
    };

    axios.defaults.adapter = adapter;
    const { authStorage } = await import("@/lib/storage");
    const { api } = await import("@/lib/http");
    const { useAuthStore } = await import("@/stores/auth.store");

    authStorage.setAccessToken("old-tab-access");
    authStorage.setRefreshToken("11111111-1111-4111-8111-111111111111");
    useAuthStore.setState({
      accessToken: "old-tab-access",
      refreshToken: "11111111-1111-4111-8111-111111111111",
      isAuthenticated: true,
    });

    // Simulate Tab B rotating tokens in localStorage and firing StorageEvent before Tab A acquires refresh lock
    vi.stubGlobal("navigator", {
      ...navigator,
      locks: {
        request: async (_name: string, _optsOrCb: unknown, maybeCb?: (lock: unknown) => Promise<unknown>) => {
          const cb = typeof _optsOrCb === "function"
            ? (_optsOrCb as (lock: unknown) => Promise<unknown>)
            : maybeCb!;
          authStorage.setAccessToken(futureJwt);
          authStorage.setRefreshToken("22222222-2222-4222-8222-222222222222");
          return cb({});
        },
      },
    });

    const response = await api.get<{ synced: boolean }>("/v1/projects");
    expect(response.data.synced).toBe(true);
    expect(refreshNetworkCalls).toBe(0);
    expect(useAuthStore.getState().accessToken).toBe(futureJwt);

    // Simulate another tab clearing authStorage and firing StorageEvent
    authStorage.clear();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "taskpilot_refresh_token",
        oldValue: "22222222-2222-4222-8222-222222222222",
        newValue: null,
      }),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
