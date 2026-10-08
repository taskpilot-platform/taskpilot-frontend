import { api } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  ProjectChatMessage,
  SendChatMessagePayload,
} from "@/types/collab";
import type { PaginatedResult } from "@/services/project-files.service";
import { Client } from "@stomp/stompjs";

export const projectChatService = {
  /**
   * Fetch chat history for project.
   */
  getMessages: (
    projectId: number,
    page: number = 0,
    size: number = 50
  ): Promise<ApiResponse<PaginatedResult<ProjectChatMessage>>> =>
    api.get<PaginatedResult<ProjectChatMessage>>(
      `/v1/projects/${projectId}/chat/messages`,
      { page, size }
    ),

  /**
   * Send a chat message via REST.
   */
  sendMessage: (
    projectId: number,
    payload: SendChatMessagePayload
  ): Promise<ApiResponse<ProjectChatMessage>> =>
    api.post<ProjectChatMessage>(
      `/v1/projects/${projectId}/chat/messages`,
      payload
    ),

  /**
   * Initialize a STOMP WebSocket connection to the project chat topic.
   */
  createStompClient: (
    projectId: number,
    token: string | null,
    onMessage: (message: ProjectChatMessage) => void,
    onStatusChange?: (connected: boolean) => void
  ): Client => {
    // Dynamically derive WebSocket URL based on API proxy or current window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const brokerURL = `${protocol}//${host}/ws/chat`;

    const client = new Client({
      brokerURL,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    client.onConnect = () => {
      onStatusChange?.(true);
      client.subscribe(`/topic/projects/${projectId}/chat`, (frame) => {
        try {
          const parsed: ProjectChatMessage = JSON.parse(frame.body);
          onMessage(parsed);
        } catch (err) {
          console.error("Error parsing chat message from WebSocket", err);
        }
      });
    };

    client.onDisconnect = () => {
      onStatusChange?.(false);
    };

    client.onWebSocketClose = () => {
      onStatusChange?.(false);
    };

    client.onStompError = (frame) => {
      console.warn("STOMP error occurred", frame);
      onStatusChange?.(false);
    };

    client.activate();
    return client;
  },
};
