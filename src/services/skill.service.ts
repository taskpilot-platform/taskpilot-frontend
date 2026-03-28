import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type { AddSkillRequest, UpdateSkillRequest, UserSkill } from "@/types/user";

export const skillService = {
  async getMySkills(): Promise<ApiResponse<UserSkill[]>> {
    const response = await http.get<ApiResponse<UserSkill[]>>("/v1/users/me/skills");
    return response.data;
  },

  async getMySkillDetail(skillId: number): Promise<ApiResponse<UserSkill>> {
    const response = await http.get<ApiResponse<UserSkill>>(`/v1/users/me/skills/${skillId}`);
    return response.data;
  },

  async addMySkill(payload: AddSkillRequest): Promise<ApiResponse<null>> {
    const response = await http.post<ApiResponse<null>>("/v1/users/me/skills", payload);
    return response.data;
  },

  async updateMySkill(skillId: number, payload: UpdateSkillRequest): Promise<ApiResponse<null>> {
    const response = await http.put<ApiResponse<null>>(`/v1/users/me/skills/${skillId}`, payload);
    return response.data;
  },

  async deleteMySkill(skillId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/users/me/skills/${skillId}`);
    return response.data;
  },
};
