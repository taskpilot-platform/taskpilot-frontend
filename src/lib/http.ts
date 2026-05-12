import axios from "axios";
import type { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";
import { authStorage } from "@/lib/storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
