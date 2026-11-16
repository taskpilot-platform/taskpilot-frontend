import { api } from "@/lib/http";
import type {
  AcceptProjectInvitationRequest,
  CreateProjectInvitationRequest,
  CreateProjectInvitationResponse,
  CreateProjectRequest,
  JoinProjectRequest,
  MyProject,
  PageResult,
  Project,
  ProjectInvitation,
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
  listInvitations: (projectId: number) =>
    api.get<ProjectInvitation[]>(`/v1/projects/${projectId}/invitations`),
  createInvitation: (projectId: number, payload: CreateProjectInvitationRequest) =>
    api.post<CreateProjectInvitationResponse>(`/v1/projects/${projectId}/invitations`, payload),
  revokeInvitation: (projectId: number, invitationId: number) =>
    api.del<null>(`/v1/projects/${projectId}/invitations/${invitationId}`),
  acceptInvitation: (payload: AcceptProjectInvitationRequest) =>
    api.post<ProjectMember>("/v1/projects/invitations/accept", payload),
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
