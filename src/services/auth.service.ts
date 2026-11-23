import { API_BASE_URL, api, http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  AuthResponse,
  CompletePasswordSetupRequest,
  ForgotPasswordRequest,
  LoginRequest,
  OAuth2ExchangeRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  RestoreAccountRequest,
  VerifyEmailRequest,
} from "@/types/auth";

export function getOAuthAuthorizeUrl(
  provider: string,
  options?: { purpose?: "login" | "link" | "reauth"; linkToken?: string },
): string {
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
  const url = `${baseUrl}/oauth2/authorization/${encodeURIComponent(provider)}`;
  if (!options?.purpose || options.purpose === "login") {
    return url;
  }
  const params = new URLSearchParams({ purpose: options.purpose });
  if (options.linkToken) {
    params.set("link_token", options.linkToken);
  }
  return `${url}?${params.toString()}`;
}

export const authService = {
  register: (payload: RegisterRequest) => api.post<void>("/v1/auth/register", payload),
  verifyEmail: (payload: VerifyEmailRequest) => api.post<void>("/v1/auth/verify-email", payload),
  resendVerification: (payload: ResendVerificationRequest) =>
    api.post<void>("/v1/auth/verify-email/resend", payload),
  login: (payload: LoginRequest) => api.post<AuthResponse>("/v1/auth/login", payload),
  confirmRestore: (payload: RestoreAccountRequest) =>
    api.post<AuthResponse>("/v1/auth/restore/confirm", payload),
  cancelRestore: (payload: RestoreAccountRequest) =>
    api.post<void>("/v1/auth/restore/cancel", payload),
  requestPasswordSetup: () => api.post<void>("/v1/auth/password-setup/request"),
  completePasswordSetup: (payload: CompletePasswordSetupRequest) =>
    api.post<void>("/v1/auth/password-setup/complete", payload),
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
