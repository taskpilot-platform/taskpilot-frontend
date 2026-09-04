import { api } from "@/lib/http";
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/auth";

export const authService = {
  register: (payload: RegisterRequest) => api.post<void>("/v1/auth/register", payload),
  login: (payload: LoginRequest) => api.post<AuthResponse>("/v1/auth/login", payload),
  refresh: (payload: RefreshTokenRequest) => api.post<AuthResponse>("/v1/auth/refresh", payload),
  logout: (payload: RefreshTokenRequest) => api.post<void>("/v1/auth/logout", payload),
  forgotPassword: (payload: ForgotPasswordRequest) =>
    api.post<void>("/v1/auth/forgot-password", payload),
  resetPassword: (payload: ResetPasswordRequest) =>
    api.post<void>("/v1/auth/reset-password", payload),
};
