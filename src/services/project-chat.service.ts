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
    // Resolve WebSocket URL:
    // 1. Explicit VITE_WS_URL if set
    // 2. Derive from VITE_API_BASE_URL (http -> ws, https -> wss)
    // 3. Fallback to current window.location with proxy
    let brokerURL: string;
    const configuredWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

    if (configuredWsUrl) {
      brokerURL = configuredWsUrl.endsWith("/ws/chat")
        ? configuredWsUrl
        : `${configuredWsUrl.replace(/\/+$/, "")}/ws/chat`;
    } else if (apiBaseUrl && (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://"))) {
      try {
        const url = new URL(apiBaseUrl);
        const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
        brokerURL = `${wsProto}//${url.host}/ws/chat`;
      } catch {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        brokerURL = `${protocol}//${window.location.host}/ws/chat`;
      }
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      brokerURL = `${protocol}//${window.location.host}/ws/chat`;
    }

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
