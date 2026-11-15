import { API_BASE_URL, api, http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OAuth2ExchangeRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/auth";

export function getOAuthAuthorizeUrl(provider: string): string {
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}/oauth2/authorization/${provider}`;
}

export const authService = {
  register: (payload: RegisterRequest) => api.post<void>("/v1/auth/register", payload),
  login: (payload: LoginRequest) => api.post<AuthResponse>("/v1/auth/login", payload),
  refresh: (payload: RefreshTokenRequest) => api.post<AuthResponse>("/v1/auth/refresh", payload),
  logout: (payload: RefreshTokenRequest, accessToken?: string) =>
    http
      .post<ApiResponse<void>>(
        "/v1/auth/logout",
        payload,
        accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined,
      )
      .then((r) => r.data),
  forgotPassword: (payload: ForgotPasswordRequest) =>
    api.post<void>("/v1/auth/forgot-password", payload),
  resetPassword: (payload: ResetPasswordRequest) =>
    api.post<void>("/v1/auth/reset-password", payload),
  getOAuthProviders: () => api.get<string[]>("/v1/auth/oauth2/providers"),
  exchangeOAuthCode: (code: string) =>
    api.post<AuthResponse>("/v1/auth/oauth2/exchange", { code } as OAuth2ExchangeRequest),
};
