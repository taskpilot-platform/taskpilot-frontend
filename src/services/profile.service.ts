import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type { UserProfile } from "@/types/user";

export const profileService = {
  async getMe(): Promise<ApiResponse<UserProfile>> {
    const response = await http.get<ApiResponse<UserProfile>>("/api/v1/users/me");
    return response.data;
  },
};
