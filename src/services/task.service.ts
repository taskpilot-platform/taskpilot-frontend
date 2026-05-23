import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  CreateTaskCommentRequest,
  CreateTaskRequest,
  KanbanMoveRequest,
  TaskCommentDto,
  TaskDetailDto,
  TaskDto,
  UpdateTaskCommentRequest,
  UpdateTaskRequest,
  UserProfileLiteDto,
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

  async updateTaskSprint(taskId: number, sprintId: number | null): Promise<ApiResponse<TaskDto>> {
    const response = await http.patch<ApiResponse<TaskDto>>(`/v1/tasks/${taskId}/sprint`, { sprintId });
    return response.data;
  },

  async getTaskComments(taskId: number): Promise<ApiResponse<TaskCommentDto[]>> {
    const response = await http.get<ApiResponse<TaskCommentDto[]>>(`/v1/tasks/${taskId}/comments`);
    return response.data;
  },

  async createTaskComment(
    taskId: number,
    payload: CreateTaskCommentRequest,
  ): Promise<ApiResponse<TaskCommentDto>> {
    const response = await http.post<ApiResponse<TaskCommentDto>>(`/v1/tasks/${taskId}/comments`, payload);
    return response.data;
  },

  async updateTaskComment(
    taskId: number,
    commentId: number,
    payload: UpdateTaskCommentRequest,
  ): Promise<ApiResponse<TaskCommentDto>> {
    const response = await http.put<ApiResponse<TaskCommentDto>>(
      `/v1/tasks/${taskId}/comments/${commentId}`,
      payload,
    );
    return response.data;
  },

  async deleteTaskComment(taskId: number, commentId: number): Promise<ApiResponse<TaskCommentDto>> {
    const response = await http.delete<ApiResponse<TaskCommentDto>>(`/v1/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  },

  async getCommentMentionCandidates(
    taskId: number,
    keyword?: string,
  ): Promise<ApiResponse<UserProfileLiteDto[]>> {
    const response = await http.get<ApiResponse<UserProfileLiteDto[]>>(
      `/v1/tasks/${taskId}/comments/mention-candidates`,
      { params: keyword?.trim() ? { keyword: keyword.trim() } : undefined },
    );
    return response.data;
  },
};
