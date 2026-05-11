import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  CreateProjectRequest,
  JoinProjectRequest,
  MyProject,
  PageResult,
  Project,
  ProjectMember,
  ProjectSummary,
  UpdateProjectRequest,
} from "@/types/project";

export const projectService = {
  async getMyProjects(page = 0, size = 10, keyword?: string): Promise<ApiResponse<PageResult<MyProject>>> {
    const response = await http.get<ApiResponse<PageResult<MyProject>>>("/v1/projects/my", {
      params: { page, size, ...(keyword?.trim() ? { keyword: keyword.trim() } : {}) },
    });
    return response.data;
  },

  async getProjectDetail(projectId: number): Promise<ApiResponse<Project>> {
    const response = await http.get<ApiResponse<Project>>(`/v1/projects/${projectId}`);
    return response.data;
  },

  async createProject(payload: CreateProjectRequest): Promise<ApiResponse<Project>> {
    const response = await http.post<ApiResponse<Project>>("/v1/projects", payload);
    return response.data;
  },

  async updateProject(projectId: number, payload: UpdateProjectRequest): Promise<ApiResponse<Project>> {
    const response = await http.put<ApiResponse<Project>>(`/v1/projects/${projectId}`, payload);
    return response.data;
  },

  async joinProject(payload: JoinProjectRequest): Promise<ApiResponse<ProjectMember>> {
    const response = await http.post<ApiResponse<ProjectMember>>("/v1/projects/join", payload);
    return response.data;
  },

  async leaveProject(projectId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/projects/${projectId}/leave`);
    return response.data;
  },

  async getProjectSummary(projectId: number): Promise<ApiResponse<ProjectSummary>> {
    const response = await http.get<ApiResponse<ProjectSummary>>(`/v1/projects/${projectId}/summary`);
    return response.data;
  },

  async getProjectMembers(projectId: number): Promise<ApiResponse<ProjectMember[]>> {
    const response = await http.get<ApiResponse<ProjectMember[]>>(`/v1/projects/${projectId}/members`);
    return response.data;
  },

  async updateMemberRole(projectId: number, userId: number, role: string): Promise<ApiResponse<null>> {
    const response = await http.put<ApiResponse<null>>(`/v1/projects/${projectId}/members/${userId}/role`, { role });
    return response.data;
  },

  async removeMember(projectId: number, userId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/projects/${projectId}/members/${userId}`);
    return response.data;
  },

  async archiveProject(projectId: number): Promise<ApiResponse<null>> {
    const response = await http.post<ApiResponse<null>>(`/v1/projects/${projectId}/archive`);
    return response.data;
  },

  async restoreProject(projectId: number): Promise<ApiResponse<null>> {
    const response = await http.post<ApiResponse<null>>(`/v1/projects/${projectId}/restore`);
    return response.data;
  },

  async deleteProject(projectId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/projects/${projectId}`);
    return response.data;
  },
};
