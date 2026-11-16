import axios, { AxiosHeaders } from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";
import type { AuthResponse } from "@/types/auth";
import { AUTH_STORAGE_KEYS, authStorage } from "@/lib/storage";
import { disconnectAllRealtime } from "@/lib/realtime";
import { oneSignalLogout } from "@/lib/onesignal";
import { isTokenValid } from "@/lib/utils";

const AUTH_BROADCAST_CHANNEL = "taskpilot-auth";
const REFRESH_LOCK_NAME = "taskpilot-auth-refresh";
const REFRESH_LOCK_TIMEOUT_MS = 10000;

export function resolveApiBaseUrl(rawBaseUrl?: string): string {
  const trimmed = rawBaseUrl?.trim().replace(/\/+$/, "");
  return trimmed || "/api";
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
);

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthBridgeHooks {
  onTokensUpdated?: (tokens: RefreshedTokens) => void;
  onSessionCleared?: () => void;
  onForbidden?: () => void;
  onRedirectLogin?: () => void;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _requestGeneration?: number;
}

interface InFlightRefreshState {
  promise: Promise<RefreshedTokens | null>;
  generation: number;
  redirectOnFailure: boolean;
}

type AuthBroadcastMessage =
  | { type: "TOKEN_ROTATED"; accessToken: string; refreshToken: string }
  | { type: "SESSION_CLEARED" };

let authBridge: AuthBridgeHooks = {};
let redirectLoginHandler: (() => void) | null = null;
let sessionGeneration = 0;
let redirectedForGeneration: number | null = null;
let inFlightRefreshState: InFlightRefreshState | null = null;

const broadcastChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    : null;

function postAuthBroadcast(message: AuthBroadcastMessage): void {
  try {
    broadcastChannel?.postMessage(message);
  } catch {
    // Ignore closed or unsupported channel errors.
  }
}

export function registerAuthBridge(hooks: AuthBridgeHooks): void {
  authBridge = hooks;
}

export function setRedirectLoginHandler(handler: (() => void) | null): void {
  redirectLoginHandler = handler;
}

export function getSessionGeneration(): number {
  return sessionGeneration;
}

export function bumpSessionGeneration(): number {
  sessionGeneration += 1;
  inFlightRefreshState = null;
  return sessionGeneration;
}

export function isExcludedAuthRefreshUrl(url?: string): boolean {
  if (!url) return false;
  const cleanPath = url.split(/[?#]/, 1)[0];
  return (
    /\/v1\/auth(\/|$)/i.test(cleanPath) ||
    /\/v1\/(?:account\/)?(?:setup|restore|verify)(?:\/|$)/i.test(cleanPath)
  );
}

export function isForbiddenSyncExcludedUrl(url?: string): boolean {
  if (!url) return false;
  const cleanPath = url.split(/[?#]/, 1)[0];
  return /\/v1\/users\/me(?:\/|$)/i.test(cleanPath);
}

function redirectToLoginOnce(): void {
  if (redirectedForGeneration === sessionGeneration) {
    return;
  }
  redirectedForGeneration = sessionGeneration;

  if (typeof window === "undefined") {
    return;
  }
  if (window.location.pathname === "/login") {
    return;
  }

  const redirectHandler = redirectLoginHandler ?? authBridge.onRedirectLogin;
  if (redirectHandler) {
    redirectHandler();
    return;
  }
  window.location.assign("/login");
}

export function clearSessionState(options?: {
  redirectToLogin?: boolean;
  broadcast?: boolean;
}): void {
  const shouldRedirect = options?.redirectToLogin ?? false;
  const shouldBroadcast = options?.broadcast ?? true;

  bumpSessionGeneration();
  authStorage.clear();
  disconnectAllRealtime();
  void oneSignalLogout();
  authBridge.onSessionCleared?.();

  if (shouldBroadcast) {
    postAuthBroadcast({ type: "SESSION_CLEARED" });
  }
  if (shouldRedirect) {
    redirectToLoginOnce();
  }
}

if (broadcastChannel) {
  broadcastChannel.addEventListener(
    "message",
    (event: MessageEvent<AuthBroadcastMessage>) => {
      const payload = event.data;
      if (!payload) return;

      if (payload.type === "TOKEN_ROTATED") {
        if (payload.accessToken && payload.refreshToken) {
          authBridge.onTokensUpdated?.({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          });
        }
        return;
      }

      if (payload.type === "SESSION_CLEARED") {
        bumpSessionGeneration();
        disconnectAllRealtime();
        void oneSignalLogout();
        authBridge.onSessionCleared?.();
      }
    },
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event: StorageEvent) => {
    if (
      event.key !== AUTH_STORAGE_KEYS.ACCESS_TOKEN &&
      event.key !== AUTH_STORAGE_KEYS.REFRESH_TOKEN
    ) {
      return;
    }

    const nextAccess = authStorage.getAccessToken();
    const nextRefresh = authStorage.getRefreshToken();
    if (!nextAccess || !nextRefresh) {
      bumpSessionGeneration();
      disconnectAllRealtime();
      void oneSignalLogout();
      authBridge.onSessionCleared?.();
      return;
    }

    authBridge.onTokensUpdated?.({
      accessToken: nextAccess,
      refreshToken: nextRefresh,
    });
  });
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate un-intercepted Axios instance dedicated to token refresh calls.
const refreshHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

async function executeRefreshLocked(
  capturedGeneration: number,
  initialRefreshToken: string,
): Promise<RefreshedTokens | null> {
  if (capturedGeneration !== sessionGeneration) {
    return null;
  }

  const storedRefresh = authStorage.getRefreshToken();
  const storedAccess = authStorage.getAccessToken();

  if (!storedRefresh) {
    return null;
  }

  // Another tab rotated the refresh token while we waited for the lock.
  if (
    storedRefresh !== initialRefreshToken &&
    storedAccess &&
    isTokenValid(storedAccess)
  ) {
    const adopted: RefreshedTokens = {
      accessToken: storedAccess,
      refreshToken: storedRefresh,
    };
    authBridge.onTokensUpdated?.(adopted);
    return adopted;
  }

  const response = await refreshHttp.post<ApiResponse<AuthResponse>>(
    "/v1/auth/refresh",
    { refreshToken: storedRefresh },
  );

  const nextAccess = response.data?.data?.token;
  const nextRefresh = response.data?.data?.refreshToken;
  if (!nextAccess || !nextRefresh) {
    throw new Error("Refresh response missing rotated tokens");
  }

  // Logout or account switch occurred while refresh was in flight; never resurrect session.
  if (capturedGeneration !== sessionGeneration) {
    return null;
  }

  authStorage.setTokens(nextAccess, nextRefresh);
  const rotated: RefreshedTokens = {
    accessToken: nextAccess,
    refreshToken: nextRefresh,
  };
  authBridge.onTokensUpdated?.(rotated);
  postAuthBroadcast({
    type: "TOKEN_ROTATED",
    accessToken: nextAccess,
    refreshToken: nextRefresh,
  });
  return rotated;
}

async function runRefreshWithCrossTabLock(
  capturedGeneration: number,
  initialRefreshToken: string,
): Promise<RefreshedTokens | null> {
  const hasLocks =
    typeof navigator !== "undefined" &&
    Boolean(navigator.locks) &&
    typeof navigator.locks.request === "function";

  if (!hasLocks) {
    return executeRefreshLocked(capturedGeneration, initialRefreshToken);
  }

  const lockController = new AbortController();
  const timerId = globalThis.setTimeout(
    () => lockController.abort(),
    REFRESH_LOCK_TIMEOUT_MS,
  );
  try {
    return await navigator.locks.request(
      REFRESH_LOCK_NAME,
      { signal: lockController.signal },
      () => executeRefreshLocked(capturedGeneration, initialRefreshToken),
    );
  } finally {
    globalThis.clearTimeout(timerId);
  }
}

export function refreshSessionSingleFlight(options?: {
  redirectOnFailure?: boolean;
}): Promise<RefreshedTokens | null> {
  const redirectOnFailure = options?.redirectOnFailure ?? true;

  if (inFlightRefreshState && inFlightRefreshState.generation === sessionGeneration) {
    if (redirectOnFailure) {
      inFlightRefreshState.redirectOnFailure = true;
    }
    return inFlightRefreshState.promise;
  }

  const initialRefreshToken = authStorage.getRefreshToken();
  if (!initialRefreshToken) {
    clearSessionState({ redirectToLogin: redirectOnFailure });
    return Promise.resolve(null);
  }

  const capturedGeneration = sessionGeneration;
  const flightState: InFlightRefreshState = {
    promise: null as unknown as Promise<RefreshedTokens | null>,
    generation: capturedGeneration,
    redirectOnFailure,
  };

  flightState.promise = runRefreshWithCrossTabLock(
    capturedGeneration,
    initialRefreshToken,
  )
    .then((tokens) => {
      if (!tokens && flightState.generation === sessionGeneration) {
        clearSessionState({ redirectToLogin: flightState.redirectOnFailure });
      }
      return tokens;
    })
    .catch(() => {
      if (flightState.generation === sessionGeneration) {
        clearSessionState({ redirectToLogin: flightState.redirectOnFailure });
      }
      return null;
    })
    .finally(() => {
      if (inFlightRefreshState === flightState) {
        inFlightRefreshState = null;
      }
    });

  inFlightRefreshState = flightState;
  return flightState.promise;
}

function awaitWithAbort<T>(
  promise: Promise<T>,
  signal?: InternalAxiosRequestConfig["signal"],
): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(new axios.CanceledError("Request aborted"));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(new axios.CanceledError("Request aborted"));
    };
    signal.addEventListener?.("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener?.("abort", onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener?.("abort", onAbort);
        reject(err);
      },
    );
  });
}

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  token: string,
): void {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${token}`);
    return;
  }
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
}

http.interceptors.request.use((config) => {
  const retryConfig = config as RetryableRequestConfig;
  if (!retryConfig._retry && typeof retryConfig._requestGeneration !== "number") {
    retryConfig._requestGeneration = sessionGeneration;
  }
  const token = authStorage.getAccessToken();
  if (token) {
    setAuthorizationHeader(config, token);
  }
  const currentLang = localStorage.getItem("i18nextLng") || "vi";
  const langHeader = currentLang.startsWith("en") ? "en" : "vi";
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Accept-Language", langHeader);
    if (config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }
  } else {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Accept-Language", langHeader);
    if (config.data instanceof FormData) {
      headers.delete("Content-Type");
    }
    config.headers = headers;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }
    if (axios.isCancel(error) || error.config?.signal?.aborted) {
      return Promise.reject(error);
    }

    const originalConfig = error.config as RetryableRequestConfig | undefined;
    const requestGeneration =
      typeof originalConfig?._requestGeneration === "number"
        ? originalConfig._requestGeneration
        : sessionGeneration;
    const isStaleGeneration = requestGeneration !== sessionGeneration;

    const status = error.response?.status;
    if (status === 403) {
      if (
        !isStaleGeneration &&
        !isForbiddenSyncExcludedUrl(originalConfig?.url)
      ) {
        authBridge.onForbidden?.();
      }
      return Promise.reject(error);
    }
    if (status !== 401) {
      return Promise.reject(error);
    }

    if (
      !originalConfig ||
      isStaleGeneration ||
      isExcludedAuthRefreshUrl(originalConfig.url)
    ) {
      return Promise.reject(error);
    }

    if (originalConfig._retry) {
      clearSessionState({ redirectToLogin: true });
      return Promise.reject(error);
    }

    let rotatedTokens: RefreshedTokens | null;
    try {
      rotatedTokens = await awaitWithAbort(
        refreshSessionSingleFlight({ redirectOnFailure: true }),
        originalConfig.signal,
      );
    } catch (abortError) {
      return Promise.reject(abortError);
    }

    if (
      !rotatedTokens ||
      requestGeneration !== sessionGeneration ||
      originalConfig.signal?.aborted
    ) {
      if (originalConfig.signal?.aborted) {
        return Promise.reject(new axios.CanceledError("Request aborted"));
      }
      return Promise.reject(error);
    }

    originalConfig._retry = true;
    setAuthorizationHeader(originalConfig, rotatedTokens.accessToken);
    return http(originalConfig);
  },
);

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    http.get<ApiResponse<T>>(url, { params }).then((r) => r.data),
  post: <T>(url: string, data?: unknown) =>
    http.post<ApiResponse<T>>(url, data).then((r) => r.data),
  put: <T>(url: string, data?: unknown) =>
    http.put<ApiResponse<T>>(url, data).then((r) => r.data),
  patch: <T>(url: string, data?: unknown) =>
    http.patch<ApiResponse<T>>(url, data).then((r) => r.data),
  del: <T>(url: string, params?: Record<string, unknown>) =>
    http.delete<ApiResponse<T>>(url, { params }).then((r) => r.data),
};

export function getApiErrorMessage(error: unknown): string {
  const currentLang = localStorage.getItem("i18nextLng") || "vi";
  const isEn = currentLang.startsWith("en");
  const fallbackMessage = isEn
    ? "An error occurred. Please try again."
    : "Có lỗi xảy ra. Vui lòng thử lại.";

  if (!error) {
    return fallbackMessage;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return (
      axiosError.response?.data?.message ||
      axiosError.message ||
      fallbackMessage
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
