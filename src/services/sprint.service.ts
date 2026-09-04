import { api } from "@/lib/http";
import type {
  BacklogResponse,
  BoardResponse,
  CreateSprintRequest,
  SprintDto,
  UpdateSprintRequest,
} from "@/types/sprint";
import type { TimelineResponse } from "@/types/timeline";

export const sprintService = {
  createSprint: (projectId: number, payload: CreateSprintRequest) =>
    api.post<SprintDto>(`/v1/projects/${projectId}/sprints`, payload),
  listSprints: (projectId: number) =>
    api.get<SprintDto[]>(`/v1/projects/${projectId}/sprints`),
  updateSprint: (projectId: number, sprintId: number, payload: UpdateSprintRequest) =>
    api.put<SprintDto>(`/v1/projects/${projectId}/sprints/${sprintId}`, payload),
  deleteSprint: (projectId: number, sprintId: number) =>
    api.del<null>(`/v1/projects/${projectId}/sprints/${sprintId}`),
  startSprint: (projectId: number, sprintId: number) =>
    api.post<SprintDto>(`/v1/projects/${projectId}/sprints/${sprintId}/start`),
  completeSprint: (projectId: number, sprintId: number) =>
    api.post<SprintDto>(`/v1/projects/${projectId}/sprints/${sprintId}/complete`),
  getBacklog: (projectId: number) =>
    api.get<BacklogResponse>(`/v1/projects/${projectId}/backlog`),
  getBoard: (projectId: number) =>
    api.get<BoardResponse>(`/v1/projects/${projectId}/board`),
  getTimeline: (projectId: number) =>
    api.get<TimelineResponse>(`/v1/projects/${projectId}/timeline`),
};
