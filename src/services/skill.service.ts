import { api } from "@/lib/http";
import type { AddSkillRequest, SkillDirectoryItem, UpdateSkillRequest, UserSkill } from "@/types/user";

export const skillService = {
  getMySkills: () => api.get<UserSkill[]>("/v1/users/me/skills"),
  getMySkillDetail: (skillId: number) => api.get<UserSkill>(`/v1/users/me/skills/${skillId}`),
  getSkillDirectory: () => api.get<SkillDirectoryItem[]>("/v1/users/me/skills/directory"),
  searchSkills: (keyword: string) => api.get<SkillDirectoryItem[]>("/v1/skills/search", { keyword }),
  addMySkill: (payload: AddSkillRequest) => api.post<null>("/v1/users/me/skills", payload),
  updateMySkill: (skillId: number, payload: UpdateSkillRequest) =>
    api.put<null>(`/v1/users/me/skills/${skillId}`, payload),
  deleteMySkill: (skillId: number) => api.del<null>(`/v1/users/me/skills/${skillId}`),
};
