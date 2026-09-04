import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  AdminUserResponse,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  AdminSkillResponse,
  AdminSkillRequest,
  SystemSettingResponse,
  SystemSettingUpdateRequest,
} from "@/types/admin";

export const adminUserService = {
  getAllUsers: (page: number = 0, size: number = 10, keyword?: string) =>
    api.get<PaginatedResponse<AdminUserResponse>>("/v1/admin/users", {
      page,
      size,
      ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    }),
  getUserDetail: (id: number) =>
    api.get<AdminUserResponse>(`/v1/admin/users/${id}`),
  createUser: (payload: AdminCreateUserRequest) =>
    api.post<AdminUserResponse>("/v1/admin/users", payload),
  updateUser: (id: number, payload: AdminUpdateUserRequest) =>
    api.put<AdminUserResponse>(`/v1/admin/users/${id}`, payload),
  deactivateUser: (id: number) =>
    api.del<null>(`/v1/admin/users/${id}`),
  resetPassword: (id: number) =>
    api.put<null>(`/v1/admin/users/${id}/reset-password`),
};

export const adminSkillService = {
  getAllSkills: (keyword?: string, page: number = 0, size: number = 10) =>
    api.get<PaginatedResponse<AdminSkillResponse>>("/v1/admin/skills", {
      keyword,
      page,
      size,
    }),
  getSkillDetail: (id: number) =>
    api.get<AdminSkillResponse>(`/v1/admin/skills/${id}`),
  createSkill: (payload: AdminSkillRequest) =>
    api.post<AdminSkillResponse>("/v1/admin/skills", payload),
  updateSkill: (id: number, payload: AdminSkillRequest) =>
    api.put<AdminSkillResponse>(`/v1/admin/skills/${id}`, payload),
  deleteSkill: (id: number) =>
    api.del<null>(`/v1/admin/skills/${id}`),
};

export const adminSettingsService = {
  getAllSettings: (keyword?: string) =>
    api.get<SystemSettingResponse[]>(
      "/v1/admin/settings",
      keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    ),
  updateSetting: (payload: SystemSettingUpdateRequest) =>
    api.put<SystemSettingResponse>("/v1/admin/settings", payload),
};
