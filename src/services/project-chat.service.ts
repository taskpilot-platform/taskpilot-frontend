import { api, clearSessionState, refreshSessionSingleFlight } from "@/lib/http";
import {
  classifyStompClose,
  type RealtimeAccessLossReason,
} from "@/lib/realtime-access";
import { registerRealtimeCleanup } from "@/lib/realtime";
import { authStorage } from "@/lib/storage";
import type { ApiResponse } from "@/types/api";
import type {
  ProjectChatMessage,
  SendChatMessagePayload,
} from "@/types/collab";
import type { PaginatedResult } from "@/services/project-files.service";
import { Client } from "@stomp/stompjs";

const MAX_STOMP_NETWORK_RETRIES = 8;

export interface CreateStompClientOptions {
  getToken?: () => string | null;
  onReconnect?: () => void;
}

function resolveBrokerUrl(): string {
  const configuredWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  if (configuredWsUrl) {
    return configuredWsUrl.endsWith("/ws/chat")
      ? configuredWsUrl
      : `${configuredWsUrl.replace(/\/+$/, "")}/ws/chat`;
  }
  if (apiBaseUrl && (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://"))) {
    try {
      const url = new URL(apiBaseUrl);
      const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProto}//${url.host}/ws/chat`;
    } catch {
      // Fallback to window.location below.
    }
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat`;
}

export const projectChatService = {
  /**
   * Fetch chat history for project.
   */
  getMessages: (
    projectId: number,
    page: number = 0,
    size: number = 50,
  ): Promise<ApiResponse<PaginatedResult<ProjectChatMessage>>> =>
    api.get<PaginatedResult<ProjectChatMessage>>(
      `/v1/projects/${projectId}/chat/messages`,
      { page, size },
    ),

  /**
   * Send a chat message via REST.
   */
  sendMessage: (
    projectId: number,
    payload: SendChatMessagePayload,
  ): Promise<ApiResponse<ProjectChatMessage>> =>
    api.post<ProjectChatMessage>(
      `/v1/projects/${projectId}/chat/messages`,
      payload,
    ),

  /**
   * Initialize a STOMP WebSocket connection to the project chat topic.
   */
  createStompClient: (
    projectId: number,
    token: string | null,
    onMessage: (message: ProjectChatMessage) => void,
    onStatusChange?: (connected: boolean, reason?: RealtimeAccessLossReason) => void,
    options?: CreateStompClientOptions,
  ): Client => {
    const brokerURL = resolveBrokerUrl();

    let disposed = false;
    let hasConnectedOnce = false;
    let isRefreshingAuth = false;
    let terminalReason: RealtimeAccessLossReason | null = null;
    let networkRetries = 0;
    let activeToken: string | null = token;

    const readCurrentToken = (allowFallbackInitial: boolean): string | null => {
      const fromProvider = options?.getToken?.();
      if (fromProvider) {
        return fromProvider;
      }
      const fromStorage = authStorage.getAccessToken();
      if (fromStorage) {
        return fromStorage;
      }
      return allowFallbackInitial ? activeToken : null;
    };

    const client = new Client({
      brokerURL,
      connectHeaders: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });
    const origDeactivate = client.deactivate;
    const rawDeactivate = origDeactivate.bind(client);

    let unregisterCleanup = () => {};

    const disposeClient = () => {
      disposed = true;
      unregisterCleanup();
    };

    const stopWithTerminalLoss = (reason: RealtimeAccessLossReason) => {
      if (disposed || terminalReason !== null) {
        return;
      }
      terminalReason = reason;
      onStatusChange?.(false, reason);
      void client.deactivate();
    };

    const handleLoss = (reason: RealtimeAccessLossReason) => {
      if (disposed || terminalReason !== null) {
        return;
      }

      if (reason === "PROJECT_ACCESS_REVOKED") {
        stopWithTerminalLoss("PROJECT_ACCESS_REVOKED");
        return;
      }

      if (reason === "SESSION_REVOKED") {
        stopWithTerminalLoss("SESSION_REVOKED");
        clearSessionState({ redirectToLogin: true });
        return;
      }

      if (reason === "AUTH_EXPIRED") {
        if (isRefreshingAuth) {
          return;
        }
        isRefreshingAuth = true;
        onStatusChange?.(false, "AUTH_EXPIRED");
        // Pause automatic STOMP reconnects so the old token is never replayed in a loop.
        void rawDeactivate();

        void refreshSessionSingleFlight({ redirectOnFailure: true })
          .then((tokens) => {
            isRefreshingAuth = false;
            if (disposed || terminalReason !== null) {
              return;
            }
            if (!tokens?.accessToken) {
              terminalReason = "AUTH_EXPIRED";
              onStatusChange?.(false, "AUTH_EXPIRED");
              return;
            }
            activeToken = tokens.accessToken;
            client.connectHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
            client.activate();
          })
          .catch(() => {
            isRefreshingAuth = false;
            if (!disposed && terminalReason === null) {
              terminalReason = "AUTH_EXPIRED";
              onStatusChange?.(false, "AUTH_EXPIRED");
            }
          });
        return;
      }

      networkRetries += 1;
      if (networkRetries > MAX_STOMP_NETWORK_RETRIES) {
        stopWithTerminalLoss("NETWORK");
        return;
      }
      onStatusChange?.(false, "NETWORK");
    };

    client.beforeConnect = () => {
      if (disposed || terminalReason !== null) {
        void client.deactivate();
        return;
      }
      const nextToken = readCurrentToken(!hasConnectedOnce);
      if (!nextToken) {
        stopWithTerminalLoss("SESSION_REVOKED");
        return;
      }
      activeToken = nextToken;
      client.connectHeaders = { Authorization: `Bearer ${nextToken}` };
    };

    client.onConnect = () => {
      if (disposed || terminalReason !== null) {
        void client.deactivate();
        return;
      }
      const isReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      networkRetries = 0;
      onStatusChange?.(true);

      client.subscribe(`/topic/projects/${projectId}/chat`, (frame) => {
        if (disposed || terminalReason !== null) {
          return;
        }
        try {
          const parsed: ProjectChatMessage = JSON.parse(frame.body);
          onMessage(parsed);
        } catch (err) {
          console.error("Error parsing chat message from WebSocket", err);
        }
      });

      if (isReconnect) {
        options?.onReconnect?.();
      }
    };

    client.onDisconnect = () => {
      if (!disposed && terminalReason === null && !isRefreshingAuth) {
        onStatusChange?.(false);
      }
    };

    client.onWebSocketClose = (event) => {
      if (disposed || terminalReason !== null || isRefreshingAuth) {
        return;
      }
      const closeEvent = event as CloseEvent | undefined;
      if (closeEvent?.wasClean && closeEvent?.code === 1000) {
        onStatusChange?.(false);
        return;
      }
      const reason = classifyStompClose({
        closeCode: closeEvent?.code,
        closeReason: closeEvent?.reason,
      });
      handleLoss(reason);
    };

    client.onWebSocketError = () => {
      handleLoss("NETWORK");
    };

    client.onStompError = (frame) => {
      const reason = classifyStompClose({
        stompMessage: frame?.headers?.message || frame?.body,
      });
      handleLoss(reason);
    };

    unregisterCleanup = registerRealtimeCleanup(() => {
      disposed = true;
      void rawDeactivate();
    });

    client.deactivate = new Proxy(origDeactivate, {
      apply(target, thisArg, argArray) {
        disposeClient();
        return Reflect.apply(target, thisArg ?? client, argArray);
      },
    });

    client.activate();
    return client;
  },
};
