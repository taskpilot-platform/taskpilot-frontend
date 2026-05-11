import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type { LabelDto } from "@/types/task";

export interface CreateLabelRequest {
  name: string;
  color?: string;
}

export const labelService = {
  async getProjectLabels(projectId: number): Promise<ApiResponse<LabelDto[]>> {
    const response = await http.get<ApiResponse<LabelDto[]>>(`/v1/projects/${projectId}/labels`);
    return response.data;
  },

  async createLabel(projectId: number, payload: CreateLabelRequest): Promise<ApiResponse<LabelDto>> {
    const response = await http.post<ApiResponse<LabelDto>>(`/v1/projects/${projectId}/labels`, payload);
    return response.data;
  },

  async deleteLabel(projectId: number, labelId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/projects/${projectId}/labels/${labelId}`);
    return response.data;
  }
};
