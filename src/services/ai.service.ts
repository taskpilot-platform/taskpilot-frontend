import { api, createRequestId, http } from "@/lib/http";
import type { ChatStreamStatus } from "@/types/chat-stream";
import type { PaginatedResponse } from "@/types/api";

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  messageCount: number;
}

export interface ChatMessage {
  id: number;
  sender: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
}

export const aiService = {
  getSessions: (page = 0, size = 20): Promise<PaginatedResponse<ChatSession>> =>
    api
      .get<PaginatedResponse<ChatSession>>("/v1/ai/sessions", { page, size })
      .then((r) => r.data),

  createSession: (title?: string): Promise<ChatSession> =>
    api.post<ChatSession>("/v1/ai/sessions", { title }).then((r) => r.data),

  deleteSession: (sessionId: number): Promise<void> =>
    api.del<void>(`/v1/ai/sessions/${sessionId}`).then(() => undefined),

  updateSessionTitle: (sessionId: number, title: string): Promise<void> =>
    http
      .patch(`/v1/ai/sessions/${sessionId}/title`, null, { params: { title } })
      .then(() => undefined),

  getMessages: (
    sessionId: number,
    page = 0,
    size = 50,
  ): Promise<PaginatedResponse<ChatMessage>> =>
    api
      .get<PaginatedResponse<ChatMessage>>(
        `/v1/ai/sessions/${sessionId}/messages`,
        { page, size },
      )
      .then((r) => r.data),

  getStreamStatus: (
    sessionId: number,
    clientMessageId?: string,
  ): Promise<ChatStreamStatus | null> =>
    api
      .get<ChatStreamStatus | null>(
        `/v1/ai/sessions/${sessionId}/stream-status`,
        clientMessageId ? { clientMessageId } : undefined,
      )
      .then((r) => r.data),

  confirmAction: (sessionId: number, actionId: string, payloadHash: string): Promise<unknown> =>
    api.post<unknown>(`/v1/ai/sessions/${sessionId}/actions/${encodeURIComponent(actionId)}/confirm`, {
      payloadHash, idempotencyKey: `ui-action-${actionId}`,
    }).then((r) => r.data),

  cancelAction: (sessionId: number, actionId: string): Promise<void> =>
    api.post<void>(`/v1/ai/sessions/${sessionId}/actions/${encodeURIComponent(actionId)}/cancel`).then(() => undefined),

  warmupSession: (sessionId: number): Promise<void> =>
    api.post<void>(`/v1/ai/sessions/${sessionId}/warmup`).then(() => undefined),

  recommendAssignment: (payload: {
    projectId: number;
    taskId?: number;
    requiredSkills?: string[];
    taskDifficulty?: string;
    taskTitle?: string;
  }): Promise<import("@/components/ai/aiChatTypes").RecommendationView> =>
    api.post<import("@/components/ai/aiChatTypes").RecommendationView>("/v1/ai/auto-assign", payload).then((r) => r.data),

  recordRecommendationDecision: (
    snapshotId: string,
    payload: import("@/components/ai/aiChatTypes").RecommendationDecisionRequest,
    idempotencyKey?: string,
  ): Promise<import("@/components/ai/aiChatTypes").RecommendationDecisionResponse> => {
    const key = idempotencyKey ?? createRequestId();
    return api
      .post<import("@/components/ai/aiChatTypes").RecommendationDecisionResponse>(
        `/v1/ai/recommendations/${encodeURIComponent(snapshotId)}/decisions`,
        payload,
        { headers: { "Idempotency-Key": key } },
      )
      .then((r) => r.data);
  },

  getRecommendationDecision: (
    snapshotId: string,
  ): Promise<import("@/components/ai/aiChatTypes").RecommendationDecisionResponse> =>
    api
      .get<import("@/components/ai/aiChatTypes").RecommendationDecisionResponse>(
        `/v1/ai/recommendations/${encodeURIComponent(snapshotId)}/decision`,
      )
      .then((r) => r.data),
};
