const ACCESS_TOKEN_KEY = "taskpilot_access_token";
const REFRESH_TOKEN_KEY = "taskpilot_refresh_token";
const LAST_PROJECT_ID_KEY = "taskpilot_last_project_id";
const USER_THEME_KEY = "taskpilot_user_theme_preference";
const AI_PENDING_REQUEST_PREFIX = "ai.pending.request.";

const SESSION_SCOPED_KEYS = [
  "userRole",
  "navContext",
  "lastAdminPath",
  "lastWorkspacePath",
  "user",
  "auth_token",
] as const;

export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: ACCESS_TOKEN_KEY,
  REFRESH_TOKEN: REFRESH_TOKEN_KEY,
} as const;

export const themeStorage = {
  getUserTheme(): string | null {
    return localStorage.getItem(USER_THEME_KEY);
  },
  setUserTheme(theme: string): void {
    localStorage.setItem(USER_THEME_KEY, theme);
  },
  removeUserTheme(): void {
    localStorage.removeItem(USER_THEME_KEY);
  },
};

export const authStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  removeAccessToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  removeRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (!accessToken || !refreshToken) {
      throw new Error("Both access token and refresh token are required.");
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearSessionCaches(): void {
    localStorage.removeItem(LAST_PROJECT_ID_KEY);
    for (const key of SESSION_SCOPED_KEYS) {
      localStorage.removeItem(key);
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(AI_PENDING_REQUEST_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    authStorage.clearSessionCaches();
  },
};

export const projectStorage = {
  getLastProjectId(): number | null {
    const id = localStorage.getItem(LAST_PROJECT_ID_KEY);
    return id ? Number(id) : null;
  },
  setLastProjectId(id: number): void {
    localStorage.setItem(LAST_PROJECT_ID_KEY, id.toString());
  },
  removeLastProjectId(): void {
    localStorage.removeItem(LAST_PROJECT_ID_KEY);
  },
};
