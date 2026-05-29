import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/user";

export const profileService = {
  async getMe(): Promise<ApiResponse<UserProfile>> {
    const response = await http.get<ApiResponse<UserProfile>>("/v1/users/me");
    return response.data;
  },

  async updateMe(payload: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    const response = await http.put<ApiResponse<UserProfile>>("/v1/users/me", payload);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<ApiResponse<UserProfile>> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await http.post<ApiResponse<UserProfile>>("/v1/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async changePassword(payload: ChangePasswordRequest): Promise<ApiResponse<null>> {
    const response = await http.put<ApiResponse<null>>("/v1/users/me/password", payload);
    return response.data;
  },

  async deleteMe(): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>("/v1/users/me");
    return response.data;
  },
};
