import { http } from "@/lib/http";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
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
  async getAllUsers(page: number = 0, size: number = 10): Promise<ApiResponse<PaginatedResponse<AdminUserResponse>>> {
    const response = await http.get<ApiResponse<PaginatedResponse<AdminUserResponse>>>("/v1/admin/users", {
      params: { page, size },
    });
    return response.data;
  },

  async getUserDetail(id: number): Promise<ApiResponse<AdminUserResponse>> {
    const response = await http.get<ApiResponse<AdminUserResponse>>(`/v1/admin/users/${id}`);
    return response.data;
  },

  async createUser(payload: AdminCreateUserRequest): Promise<ApiResponse<AdminUserResponse>> {
    const response = await http.post<ApiResponse<AdminUserResponse>>("/v1/admin/users", payload);
    return response.data;
  },

  async updateUser(id: number, payload: AdminUpdateUserRequest): Promise<ApiResponse<AdminUserResponse>> {
    const response = await http.put<ApiResponse<AdminUserResponse>>(`/v1/admin/users/${id}`, payload);
    return response.data;
  },

  async deactivateUser(id: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/admin/users/${id}`);
    return response.data;
  },

  async resetPassword(id: number): Promise<ApiResponse<null>> {
    const response = await http.put<ApiResponse<null>>(`/v1/admin/users/${id}/reset-password`);
    return response.data;
  },
};

export const adminSkillService = {
  async getAllSkills(keyword?: string, page: number = 0, size: number = 10): Promise<ApiResponse<PaginatedResponse<AdminSkillResponse>>> {
    const response = await http.get<ApiResponse<PaginatedResponse<AdminSkillResponse>>>("/v1/admin/skills", {
      params: { keyword, page, size },
    });
    return response.data;
  },

  async getSkillDetail(id: number): Promise<ApiResponse<AdminSkillResponse>> {
    const response = await http.get<ApiResponse<AdminSkillResponse>>(`/v1/admin/skills/${id}`);
    return response.data;
  },

  async createSkill(payload: AdminSkillRequest): Promise<ApiResponse<AdminSkillResponse>> {
    const response = await http.post<ApiResponse<AdminSkillResponse>>("/v1/admin/skills", payload);
    return response.data;
  },

  async updateSkill(id: number, payload: AdminSkillRequest): Promise<ApiResponse<AdminSkillResponse>> {
    const response = await http.put<ApiResponse<AdminSkillResponse>>(`/v1/admin/skills/${id}`, payload);
    return response.data;
  },

  async deleteSkill(id: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/admin/skills/${id}`);
    return response.data;
  },
};

export const adminSettingsService = {
  async getAllSettings(): Promise<ApiResponse<SystemSettingResponse[]>> {
    const response = await http.get<ApiResponse<SystemSettingResponse[]>>("/v1/admin/settings");
    return response.data;
  },

  async updateSetting(payload: SystemSettingUpdateRequest): Promise<ApiResponse<SystemSettingResponse>> {
    const response = await http.put<ApiResponse<SystemSettingResponse>>("/v1/admin/settings", payload);
    return response.data;
  },
};
