import { api } from "@/lib/http";
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
  getMyProjects: (page = 0, size = 10, keyword?: string) =>
    api.get<PageResult<MyProject>>("/v1/projects/my", {
      page,
      size,
      ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    }),
  getProjectDetail: (projectId: number) =>
    api.get<Project>(`/v1/projects/${projectId}`),
  createProject: (payload: CreateProjectRequest) =>
    api.post<Project>("/v1/projects", payload),
  updateProject: (projectId: number, payload: UpdateProjectRequest) =>
    api.put<Project>(`/v1/projects/${projectId}`, payload),
  joinProject: (payload: JoinProjectRequest) =>
    api.post<ProjectMember>("/v1/projects/join", payload),
  leaveProject: (projectId: number) =>
    api.del<null>(`/v1/projects/${projectId}/leave`),
  getProjectSummary: (projectId: number) =>
    api.get<ProjectSummary>(`/v1/projects/${projectId}/summary`),
  getProjectMembers: (projectId: number) =>
    api.get<ProjectMember[]>(`/v1/projects/${projectId}/members`),
  updateMemberRole: (projectId: number, userId: number, role: string) =>
    api.put<null>(`/v1/projects/${projectId}/members/${userId}/role`, { role }),
  removeMember: (projectId: number, userId: number) =>
    api.del<null>(`/v1/projects/${projectId}/members/${userId}`),
  archiveProject: (projectId: number) =>
    api.post<null>(`/v1/projects/${projectId}/archive`),
  restoreProject: (projectId: number) =>
    api.post<null>(`/v1/projects/${projectId}/restore`),
  deleteProject: (projectId: number) =>
    api.del<null>(`/v1/projects/${projectId}`),
};
