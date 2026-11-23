import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  AdminUserResponse,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  AdminSkillResponse,
  AdminSkillRequest,
  ProjectAttentionItem,
  SystemSettingResponse,
  SystemSettingUpdateRequest,
  TransferProjectManagerRequest,
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
  suspendUser: (id: number, reason?: string) =>
    api.post<AdminUserResponse>(
      reason?.trim()
        ? `/v1/admin/users/${id}/suspend?reason=${encodeURIComponent(reason.trim())}`
        : `/v1/admin/users/${id}/suspend`,
    ),
  reactivateUser: (id: number, reason?: string) =>
    api.post<AdminUserResponse>(
      reason?.trim()
        ? `/v1/admin/users/${id}/reactivate?reason=${encodeURIComponent(reason.trim())}`
        : `/v1/admin/users/${id}/reactivate`,
    ),
  deactivateUser: (id: number) =>
    api.del<null>(`/v1/admin/users/${id}`),
  resetPassword: (id: number) =>
    api.put<null>(`/v1/admin/users/${id}/reset-password`),
};

export const adminProjectRecoveryService = {
  listAttentionRequired: () =>
    api.get<ProjectAttentionItem[]>("/v1/admin/projects/attention-required"),
  transferManager: (projectId: number, payload: TransferProjectManagerRequest) =>
    api.post<null>(`/v1/admin/projects/${projectId}/transfer-manager`, payload),
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

export const adminAdaptiveService = {
  getDatasetReport: (params?: {
    projectId?: number;
    managerId?: number;
    mode?: string;
    page?: number;
    limit?: number;
  }) => {
    const query: Record<string, string | number> = {};
    if (params?.projectId != null) query.projectId = params.projectId;
    if (params?.managerId != null) query.managerId = params.managerId;
    if (params?.mode?.trim()) query.mode = params.mode.trim();
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.limit = params.limit;
    return api.get<import("@/types/admin").AdaptiveDatasetQualityReport>(
      "/v1/admin/ai/adaptive/dataset-report",
      Object.keys(query).length > 0 ? query : undefined,
    );
  },
  replayDueJournalEntries: (limit = 50) =>
    api.post<import("@/types/admin").AdaptiveJournalReplayResult>(
      `/v1/admin/ai/adaptive/journal/replay?limit=${encodeURIComponent(String(limit))}`,
    ),
};
