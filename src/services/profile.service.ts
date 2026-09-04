import { api, http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/user";

export const profileService = {
  getMe: () => api.get<UserProfile>("/v1/users/me"),
  updateMe: (payload: UpdateProfileRequest) => api.put<UserProfile>("/v1/users/me", payload),
  uploadAvatar: (file: File): Promise<ApiResponse<UserProfile>> => {
    const formData = new FormData();
    formData.append("file", file);
    return http
      .post<ApiResponse<UserProfile>>("/v1/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  changePassword: (payload: ChangePasswordRequest) => api.put<null>("/v1/users/me/password", payload),
  deleteMe: () => api.del<null>("/v1/users/me"),
};
