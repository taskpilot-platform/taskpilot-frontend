export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp?: string;
}

export interface ApiErrorResponse {
  status: number;
  message: string;
  data?: unknown;
  timestamp?: string;
}
