import { api, createRequestId } from "@/lib/http";
import type {
  CreateSuccessorTaskRequest,
  CreateTaskCommentRequest,
  CreateTaskRequest,
  KanbanMoveRequest,
  PatchTaskRequest,
  RecoverLegacyReviewWorkflowRequest,
  ReopenTaskWorkflowRequest,
  ReviewTaskWorkflowRequest,
  SubmitTaskWorkflowRequest,
  SupersedeEvaluationWorkflowRequest,
  TaskCommentDto,
  TaskDetailDto,
  TaskDto,
  TaskWorkflowHistory,
  TaskWorkflowResult,
  UpdateTaskCommentRequest,
  UpdateTaskRequest,
  UserProfileLiteDto,
  WithdrawTaskWorkflowRequest,
} from "@/types/task";

export const taskService = {
  getTasksByProject: (projectId: number) =>
    api.get<TaskDto[]>("/v1/tasks", { projectId }),
  getTaskById: (taskId: number) =>
    api.get<TaskDetailDto>(`/v1/tasks/${taskId}`),
  getSubtasks: (taskId: number) =>
    api.get<TaskDto[]>(`/v1/tasks/${taskId}/subtasks`),
  createTask: (payload: CreateTaskRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskDto>(
      "/v1/tasks",
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  createSuccessorTask: (taskId: number, payload: CreateSuccessorTaskRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskDto>(
      `/v1/tasks/${taskId}/successor`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  updateTask: (taskId: number, payload: UpdateTaskRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.put<TaskDto>(
      `/v1/tasks/${taskId}`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  patchTask: (taskId: number, payload: PatchTaskRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.patch<TaskDto>(
      `/v1/tasks/${taskId}`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  deleteTask: (taskId: number, expectedTaskVersion: number, requestId?: string) => {
    const resolvedRequestId = requestId ?? createRequestId();
    return api.del<null>(
      `/v1/tasks/${taskId}`,
      { expectedTaskVersion, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  moveTaskKanban: (taskId: number, payload: KanbanMoveRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.patch<TaskDto>(
      `/v1/tasks/${taskId}/kanban`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  updateTaskSprint: (
    taskId: number,
    sprintId: number | null,
    expectedTaskVersion: number,
    requestId?: string,
  ) => {
    const resolvedRequestId = requestId ?? createRequestId();
    return api.patch<TaskDto>(
      `/v1/tasks/${taskId}/sprint`,
      { sprintId, expectedTaskVersion, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
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
  getTaskWorkflow: (taskId: number) =>
    api.get<TaskWorkflowHistory>(`/v1/tasks/${taskId}/workflow`),
  submitTask: (taskId: number, payload: SubmitTaskWorkflowRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskWorkflowResult>(
      `/v1/tasks/${taskId}/workflow/submit`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  withdrawSubmission: (taskId: number, payload: WithdrawTaskWorkflowRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskWorkflowResult>(
      `/v1/tasks/${taskId}/workflow/withdraw`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  reviewTask: (taskId: number, payload: ReviewTaskWorkflowRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskWorkflowResult>(
      `/v1/tasks/${taskId}/workflow/review`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  reopenTask: (taskId: number, payload: ReopenTaskWorkflowRequest, requestId?: string) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskWorkflowResult>(
      `/v1/tasks/${taskId}/workflow/reopen`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  supersedeEvaluation: (
    taskId: number,
    payload: SupersedeEvaluationWorkflowRequest,
    requestId?: string,
  ) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskWorkflowResult>(
      `/v1/tasks/${taskId}/workflow/supersede`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
  recoverLegacyReview: (
    taskId: number,
    payload: RecoverLegacyReviewWorkflowRequest,
    requestId?: string,
  ) => {
    const resolvedRequestId = requestId ?? payload.requestId ?? createRequestId();
    return api.post<TaskWorkflowResult>(
      `/v1/tasks/${taskId}/workflow/recover-legacy-review`,
      { ...payload, requestId: resolvedRequestId },
      { headers: { "Idempotency-Key": resolvedRequestId } },
    );
  },
};
