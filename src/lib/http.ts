import axios from "axios";
import type { AxiosError } from "axios";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";
import { authStorage } from "@/lib/storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Prevent redirect loop if the auth endpoint itself returns 401
      const isAuthRequest = error.config?.url?.includes("/v1/auth/");
      if (!isAuthRequest) {
        authStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
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
  const fallbackMessage = "Có lỗi xảy ra. Vui lòng thử lại.";

  if (!error) {
    return fallbackMessage;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.message || axiosError.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
