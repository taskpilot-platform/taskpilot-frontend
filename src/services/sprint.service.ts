import { api, createRequestId } from "@/lib/http";
import type {
  BacklogResponse,
  BoardResponse,
  CompleteSprintRequest,
  CreateSprintRequest,
  SprintClosureSnapshotDto,
  SprintCompletePreviewResponse,
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
  getCompletePreview: (projectId: number, sprintId: number) =>
    api.get<SprintCompletePreviewResponse>(`/v1/projects/${projectId}/sprints/${sprintId}/complete-preview`),
  completeSprint: (projectId: number, sprintId: number, payload: CompleteSprintRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<SprintDto>(
      `/v1/projects/${projectId}/sprints/${sprintId}/complete`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  getClosureSnapshot: (projectId: number, sprintId: number) =>
    api.get<SprintClosureSnapshotDto>(`/v1/projects/${projectId}/sprints/${sprintId}/closure-snapshot`),
  getBacklog: (projectId: number) =>
    api.get<BacklogResponse>(`/v1/projects/${projectId}/backlog`),
  getBoard: (projectId: number) =>
    api.get<BoardResponse>(`/v1/projects/${projectId}/board`),
  getTimeline: (projectId: number) =>
    api.get<TimelineResponse>(`/v1/projects/${projectId}/timeline`),
};
