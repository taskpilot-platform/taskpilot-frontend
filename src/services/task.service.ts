import { api } from "@/lib/http";
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
  getTasksByProject: (projectId: number) =>
    api.get<TaskDto[]>("/v1/tasks", { projectId }),
  getTaskById: (taskId: number) =>
    api.get<TaskDetailDto>(`/v1/tasks/${taskId}`),
  getSubtasks: (taskId: number) =>
    api.get<TaskDto[]>(`/v1/tasks/${taskId}/subtasks`),
  createTask: (payload: CreateTaskRequest) =>
    api.post<TaskDto>("/v1/tasks", payload),
  updateTask: (taskId: number, payload: UpdateTaskRequest) =>
    api.put<TaskDto>(`/v1/tasks/${taskId}`, payload),
  deleteTask: (taskId: number) =>
    api.del<null>(`/v1/tasks/${taskId}`),
  moveTaskKanban: (taskId: number, payload: KanbanMoveRequest) =>
    api.patch<TaskDto>(`/v1/tasks/${taskId}/kanban`, payload),
  updateTaskSprint: (taskId: number, sprintId: number | null) =>
    api.patch<TaskDto>(`/v1/tasks/${taskId}/sprint`, { sprintId }),
  getTaskComments: (taskId: number) =>
    api.get<TaskCommentDto[]>(`/v1/tasks/${taskId}/comments`),
  createTaskComment: (taskId: number, payload: CreateTaskCommentRequest) =>
    api.post<TaskCommentDto>(`/v1/tasks/${taskId}/comments`, payload),
  updateTaskComment: (
    taskId: number,
    commentId: number,
    payload: UpdateTaskCommentRequest,
  ) =>
    api.put<TaskCommentDto>(
      `/v1/tasks/${taskId}/comments/${commentId}`,
      payload,
    ),
  deleteTaskComment: (taskId: number, commentId: number) =>
    api.del<TaskCommentDto>(`/v1/tasks/${taskId}/comments/${commentId}`),
  getCommentMentionCandidates: (taskId: number, keyword?: string) =>
    api.get<UserProfileLiteDto[]>(
      `/v1/tasks/${taskId}/comments/mention-candidates`,
      keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    ),
};
