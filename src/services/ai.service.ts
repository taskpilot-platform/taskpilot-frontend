import { api, http } from "@/lib/http";
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

  warmupSession: (sessionId: number): Promise<void> =>
    api.post<void>(`/v1/ai/sessions/${sessionId}/warmup`).then(() => undefined),
};
