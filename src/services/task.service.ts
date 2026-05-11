import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  CreateTaskRequest,
  KanbanMoveRequest,
  TaskDetailDto,
  TaskDto,
  UpdateTaskRequest,
} from "@/types/task";

export const taskService = {
  async getTasksByProject(projectId: number): Promise<ApiResponse<TaskDto[]>> {
    const response = await http.get<ApiResponse<TaskDto[]>>("/v1/tasks", {
      params: { projectId },
    });
    return response.data;
  },

  async getTaskById(taskId: number): Promise<ApiResponse<TaskDetailDto>> {
    const response = await http.get<ApiResponse<TaskDetailDto>>(`/v1/tasks/${taskId}`);
    return response.data;
  },

  async getSubtasks(taskId: number): Promise<ApiResponse<TaskDto[]>> {
    const response = await http.get<ApiResponse<TaskDto[]>>(`/v1/tasks/${taskId}/subtasks`);
    return response.data;
  },

  async createTask(payload: CreateTaskRequest): Promise<ApiResponse<TaskDto>> {
    const response = await http.post<ApiResponse<TaskDto>>("/v1/tasks", payload);
    return response.data;
  },

  async updateTask(taskId: number, payload: UpdateTaskRequest): Promise<ApiResponse<TaskDto>> {
    const response = await http.put<ApiResponse<TaskDto>>(`/v1/tasks/${taskId}`, payload);
    return response.data;
  },

  async deleteTask(taskId: number): Promise<ApiResponse<null>> {
    const response = await http.delete<ApiResponse<null>>(`/v1/tasks/${taskId}`);
    return response.data;
  },

  async moveTaskKanban(taskId: number, payload: KanbanMoveRequest): Promise<ApiResponse<TaskDto>> {
    const response = await http.patch<ApiResponse<TaskDto>>(`/v1/tasks/${taskId}/kanban`, payload);
    return response.data;
  },
};
