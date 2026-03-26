import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type { UserSkill } from "@/types/user";

export const skillService = {
  async getMySkills(): Promise<ApiResponse<UserSkill[]>> {
    const response = await http.get<ApiResponse<UserSkill[]>>("/api/v1/users/me/skills");
    return response.data;
  },
};
