import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/auth";

export const authService = {
  async register(payload: RegisterRequest): Promise<ApiResponse<void>> {
    const response = await http.post<ApiResponse<void>>("/api/v1/auth/register", payload);
    return response.data;
  },

  async login(payload: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await http.post<ApiResponse<AuthResponse>>(
      "/api/v1/auth/login",
      payload,
    );
    return response.data;
  },

  async refresh(payload: RefreshTokenRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await http.post<ApiResponse<AuthResponse>>(
      "/api/v1/auth/refresh",
      payload,
    );
    return response.data;
  },

  async logout(payload: RefreshTokenRequest): Promise<ApiResponse<void>> {
    const response = await http.post<ApiResponse<void>>("/api/v1/auth/logout", payload);
    return response.data;
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<ApiResponse<void>> {
    const response = await http.post<ApiResponse<void>>(
      "/api/v1/auth/forgot-password",
      payload,
    );
    return response.data;
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<ApiResponse<void>> {
    const response = await http.post<ApiResponse<void>>(
      "/api/v1/auth/reset-password",
      payload,
    );
    return response.data;
  },
};
