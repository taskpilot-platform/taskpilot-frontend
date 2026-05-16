import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  BacklogResponse,
  BoardResponse,
  CreateSprintRequest,
  SprintDto,
  UpdateSprintRequest,
} from "@/types/sprint";
import type { TimelineResponse } from "@/types/timeline";

export const sprintService = {
  async createSprint(projectId: number, payload: CreateSprintRequest): Promise<ApiResponse<SprintDto>> {
    const response = await http.post<ApiResponse<SprintDto>>(`/v1/projects/${projectId}/sprints`, payload);
    return response.data;
  },

  async listSprints(projectId: number): Promise<ApiResponse<SprintDto[]>> {
    const response = await http.get<ApiResponse<SprintDto[]>>(`/v1/projects/${projectId}/sprints`);
    return response.data;
  },

  async updateSprint(projectId: number, sprintId: number, payload: UpdateSprintRequest): Promise<ApiResponse<SprintDto>> {
    const response = await http.put<ApiResponse<SprintDto>>(`/v1/projects/${projectId}/sprints/${sprintId}`, payload);
    return response.data;
  },

  async deleteSprint(projectId: number, sprintId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/projects/${projectId}/sprints/${sprintId}`);
    return response.data;
  },

  async startSprint(projectId: number, sprintId: number): Promise<ApiResponse<SprintDto>> {
    const response = await http.post<ApiResponse<SprintDto>>(`/v1/projects/${projectId}/sprints/${sprintId}/start`);
    return response.data;
  },

  async completeSprint(projectId: number, sprintId: number): Promise<ApiResponse<SprintDto>> {
    const response = await http.post<ApiResponse<SprintDto>>(`/v1/projects/${projectId}/sprints/${sprintId}/complete`);
    return response.data;
  },

  async getBacklog(projectId: number): Promise<ApiResponse<BacklogResponse>> {
    const response = await http.get<ApiResponse<BacklogResponse>>(`/v1/projects/${projectId}/backlog`);
    return response.data;
  },

  async getBoard(projectId: number): Promise<ApiResponse<BoardResponse>> {
    const response = await http.get<ApiResponse<BoardResponse>>(`/v1/projects/${projectId}/board`);
    return response.data;
  },

  async getTimeline(projectId: number): Promise<ApiResponse<TimelineResponse>> {
    const response = await http.get<ApiResponse<TimelineResponse>>(`/v1/projects/${projectId}/timeline`);
    return response.data;
  },
};
