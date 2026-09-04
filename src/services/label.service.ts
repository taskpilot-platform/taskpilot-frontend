import { api } from "@/lib/http";
import type { LabelDto } from "@/types/task";

export interface CreateLabelRequest {
  name: string;
  color?: string;
}

export const labelService = {
  getProjectLabels: (projectId: number) =>
    api.get<LabelDto[]>(`/v1/projects/${projectId}/labels`),
  createLabel: (projectId: number, payload: CreateLabelRequest) =>
    api.post<LabelDto>(`/v1/projects/${projectId}/labels`, payload),
  deleteLabel: (projectId: number, labelId: number) =>
    api.del<null>(`/v1/projects/${projectId}/labels/${labelId}`),
};
