const ACCESS_TOKEN_KEY = "taskpilot_access_token";
const REFRESH_TOKEN_KEY = "taskpilot_refresh_token";
const LAST_PROJECT_ID_KEY = "taskpilot_last_project_id";

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

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LAST_PROJECT_ID_KEY);
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
