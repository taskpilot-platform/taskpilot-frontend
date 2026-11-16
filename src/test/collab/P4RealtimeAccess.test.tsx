import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  classifySseHttpStatus,
  classifyStompClose,
  parseRealtimeAccessLostEvent,
} from "@/lib/realtime-access";

const {
  stompInstances,
  fetchEventSourceMock,
  refreshSingleFlightMock,
  clearSessionStateMock,
  getMessagesMock,
  getTaskCommentsMock,
} = vi.hoisted(() => ({
  stompInstances: [] as Array<{
    brokerURL?: string;
    connectHeaders: Record<string, string>;
    beforeConnect?: () => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onWebSocketClose?: (evt: { code?: number; reason?: string; wasClean?: boolean }) => void;
    onWebSocketError?: () => void;
    onStompError?: (frame: { headers?: Record<string, string>; body?: string }) => void;
    activate: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }>,
  fetchEventSourceMock: vi.fn(),
  refreshSingleFlightMock: vi.fn(),
  clearSessionStateMock: vi.fn(),
  getMessagesMock: vi.fn(),
  getTaskCommentsMock: vi.fn(),
}));

vi.mock("@stomp/stompjs", () => ({
  Client: class MockStompClient {
    brokerURL?: string;
    connectHeaders: Record<string, string>;
    beforeConnect?: () => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onWebSocketClose?: (evt: { code?: number; reason?: string; wasClean?: boolean }) => void;
    onWebSocketError?: () => void;
    onStompError?: (frame: { headers?: Record<string, string>; body?: string }) => void;
    activate = vi.fn(() => {
      this.beforeConnect?.();
    });
    deactivate = vi.fn().mockResolvedValue(undefined);
    subscribe = vi.fn();

    constructor(config: { brokerURL?: string; connectHeaders?: Record<string, string> }) {
      this.brokerURL = config.brokerURL;
      this.connectHeaders = config.connectHeaders ?? {};
      stompInstances.push(this);
    }
  },
}));

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: (...args: unknown[]) => fetchEventSourceMock(...args),
}));

vi.mock("@/lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/http")>();
  return {
    ...actual,
    refreshSessionSingleFlight: (...args: unknown[]) => refreshSingleFlightMock(...args),
    clearSessionState: (...args: unknown[]) => clearSessionStateMock(...args),
  };
});

vi.mock("@/services/task.service", () => ({
  taskService: {
    getTaskComments: (...args: unknown[]) => getTaskCommentsMock(...args),
    createTaskComment: vi.fn(),
    updateTaskComment: vi.fn(),
    deleteTaskComment: vi.fn(),
    getCommentMentionCandidates: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("@/services/notification.service", () => ({
  notificationService: {
    getUnreadCount: vi.fn().mockResolvedValue({ data: 0 }),
  },
}));

describe("P4.2 Realtime Access & Frontend Protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stompInstances.length = 0;
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("classifies SSE HTTP statuses, STOMP close codes/frames, and control events", () => {
    expect(classifySseHttpStatus(401)).toBe("AUTH_EXPIRED");
    expect(classifySseHttpStatus(403)).toBe("PROJECT_ACCESS_REVOKED");
    expect(classifySseHttpStatus(404)).toBe("PROJECT_ACCESS_REVOKED");
    expect(classifySseHttpStatus(503)).toBe("NETWORK");

    expect(parseRealtimeAccessLostEvent('{"reason":"PROJECT_ACCESS_REVOKED"}')).toBe("PROJECT_ACCESS_REVOKED");
    expect(parseRealtimeAccessLostEvent('{"reason":"SESSION_REVOKED"}')).toBe("SESSION_REVOKED");
    expect(parseRealtimeAccessLostEvent("not-json")).toBeNull();

    expect(classifyStompClose({ closeCode: 4403, closeReason: "PROJECT_ACCESS_REVOKED" })).toBe("PROJECT_ACCESS_REVOKED");
    expect(classifyStompClose({ closeCode: 4401, closeReason: "AUTH_EXPIRED" })).toBe("AUTH_EXPIRED");
    expect(classifyStompClose({ stompMessage: "SESSION_REVOKED: logged out" })).toBe("SESSION_REVOKED");
    expect(classifyStompClose({ closeCode: 1006 })).toBe("NETWORK");
  });

  it("STOMP client stops on PROJECT_ACCESS_REVOKED, refreshes on AUTH_EXPIRED without stale token, and refetches on NETWORK reconnect", async () => {
    const { authStorage } = await import("@/lib/storage");
    const { useAuthStore } = await import("@/stores/auth.store");
    const { projectChatService } = await import("@/services/project-chat.service");
    const { ProjectChatTab } = await import("@/components/chat/ProjectChatTab");

    authStorage.setAccessToken("old-token");
    authStorage.setRefreshToken("refresh-1");
    useAuthStore.setState({ accessToken: "old-token", isAuthenticated: true });

    const historySpy = vi.spyOn(projectChatService, "getMessages").mockImplementation((...args) =>
      getMessagesMock(...args),
    );
    getMessagesMock.mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        content: [
          {
            id: 1,
            projectId: 10,
            senderId: 2,
            senderName: "Alice",
            messageType: "TEXT",
            content: "Initial project secret",
            createdAt: "2026-11-17T00:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 50,
      },
    });

    const { unmount } = render(<ProjectChatTab projectId={10} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Initial project secret")).toBeInTheDocument();
      expect(stompInstances.length).toBe(1);
    });

    const client = stompInstances[0];
    expect(client.brokerURL).not.toContain("token=");
    expect(client.connectHeaders.Authorization).toBe("Bearer old-token");

    // Simulate connected, then transient NETWORK drop -> reconnect refetches history with current token
    act(() => {
      client.onConnect?.();
    });
    authStorage.setAccessToken("current-token");
    act(() => {
      client.onWebSocketClose?.({ code: 1006, wasClean: false });
    });
    act(() => {
      client.beforeConnect?.();
      client.onConnect?.();
    });

    expect(client.connectHeaders.Authorization).toBe("Bearer current-token");
    await waitFor(() => {
      expect(getMessagesMock).toHaveBeenCalledTimes(2);
    });

    // Simulate AUTH_EXPIRED -> single-flight refresh -> reconnects with refreshed token
    refreshSingleFlightMock.mockImplementationOnce(async () => {
      authStorage.setAccessToken("refreshed-token");
      return {
        accessToken: "refreshed-token",
        refreshToken: "refresh-2",
      };
    });
    act(() => {
      client.onStompError?.({ headers: { message: "AUTH_EXPIRED: token expired" } });
    });

    await waitFor(() => {
      expect(refreshSingleFlightMock).toHaveBeenCalledTimes(1);
      expect(client.connectHeaders.Authorization).toBe("Bearer refreshed-token");
    });

    // Simulate terminal PROJECT_ACCESS_REVOKED -> clears transient messages, deactivates, no global logout
    act(() => {
      client.onWebSocketClose?.({ code: 4403, reason: "PROJECT_ACCESS_REVOKED", wasClean: false });
    });

    await waitFor(() => {
      expect(screen.queryByText("Initial project secret")).not.toBeInTheDocument();
      expect(client.deactivate).toHaveBeenCalled();
    });
    expect(clearSessionStateMock).not.toHaveBeenCalled();

    historySpy.mockRestore();
    unmount();
  });

  it("ActivityTimeline stops on PROJECT_ACCESS_REVOKED, refreshes on 401 without stale token, and ignores late callbacks after task switch", async () => {
    const { authStorage } = await import("@/lib/storage");
    const { ActivityTimeline } = await import("@/components/tasks/ActivityTimeline");

    authStorage.setAccessToken("tok-1");
    getTaskCommentsMock.mockResolvedValue({
      status: 200,
      message: "OK",
      data: [
        {
          id: 50,
          taskId: 77,
          parentCommentId: null,
          author: { id: 2, fullName: "Bob", avatarUrl: null },
          content: "Confidential comment",
          mentions: [],
          deleted: false,
          deletedAt: null,
          createdAt: "2026-11-17T00:00:00Z",
          updatedAt: "2026-11-17T00:00:00Z",
        },
      ],
    });

    type SseHandlers = {
      signal: AbortSignal;
      headers: Record<string, string>;
      onopen: (res: Response) => Promise<void>;
      onmessage: (ev: { event: string; data: string }) => void;
    };
    const capturedCalls: SseHandlers[] = [];

    fetchEventSourceMock.mockImplementation((_url: string, opts: SseHandlers) => {
      capturedCalls.push(opts);
      return new Promise<void>((resolve) => {
        opts.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    });

    const { rerender, unmount } = render(
      <ActivityTimeline taskId={77} currentUserId={1} isManager={false} isReadOnly={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Confidential comment")).toBeInTheDocument();
      expect(capturedCalls.length).toBe(1);
    });

    // Receive terminal realtime.access_lost PROJECT_ACCESS_REVOKED -> clears comments and aborts without retrying
    act(() => {
      capturedCalls[0].onmessage({
        event: "realtime.access_lost",
        data: JSON.stringify({ reason: "PROJECT_ACCESS_REVOKED" }),
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Confidential comment")).not.toBeInTheDocument();
      expect(capturedCalls[0].signal.aborted).toBe(true);
    });
    expect(fetchEventSourceMock).toHaveBeenCalledTimes(1);
    expect(clearSessionStateMock).not.toHaveBeenCalled();

    // Switch taskId -> opens new SSE; late callback from task 77 must be ignored
    getTaskCommentsMock.mockResolvedValueOnce({ status: 200, message: "OK", data: [] });
    rerender(<ActivityTimeline taskId={88} currentUserId={1} isManager={false} isReadOnly={false} />);

    await waitFor(() => {
      expect(capturedCalls.length).toBe(2);
    });

    act(() => {
      capturedCalls[0].onmessage({
        event: "comment.created",
        data: JSON.stringify({
          id: 999,
          taskId: 77,
          parentCommentId: null,
          author: { id: 2, fullName: "Bob", avatarUrl: null },
          content: "Late stale payload",
          mentions: [],
          deleted: false,
          deletedAt: null,
          createdAt: "2026-11-17T00:01:00Z",
          updatedAt: "2026-11-17T00:01:00Z",
        }),
      });
    });
    expect(screen.queryByText("Late stale payload")).not.toBeInTheDocument();

    unmount();
    expect(capturedCalls[1].signal.aborted).toBe(true);
  });

  it("ActivityTimeline never restores comments from in-flight history or late SSE after access revocation", async () => {
    const { authStorage } = await import("@/lib/storage");
    const { ActivityTimeline } = await import("@/components/tasks/ActivityTimeline");
    authStorage.setAccessToken("review-token");
    let resolveHistory!: (value: unknown) => void;
    getTaskCommentsMock.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve; }));
    let stream!: { signal: AbortSignal; onmessage: (event: { event: string; data: string }) => void };
    fetchEventSourceMock.mockImplementation((_url, options) => {
      stream = options;
      return new Promise<void>((resolve) => options.signal.addEventListener("abort", () => resolve(), { once: true }));
    });
    const comment = {
      id: 99, taskId: 77, parentCommentId: null, author: { id: 2, fullName: "Bob", avatarUrl: null },
      content: "Revoked task secret", mentions: [], deleted: false, deletedAt: null,
      createdAt: "2026-11-17T00:00:00Z", updatedAt: "2026-11-17T00:00:00Z",
    };
    const { unmount } = render(<ActivityTimeline taskId={77} currentUserId={1} isManager={false} isReadOnly={false} />);
    await waitFor(() => expect(stream).toBeDefined());
    await act(async () => {
      stream.onmessage({ event: "realtime.access_lost", data: '{"reason":"PROJECT_ACCESS_REVOKED"}' });
      resolveHistory({ data: [comment] });
    });
    expect(screen.queryByText("Revoked task secret")).not.toBeInTheDocument();
    act(() => stream.onmessage({ event: "comment.created", data: JSON.stringify(comment) }));
    expect(screen.queryByText("Revoked task secret")).not.toBeInTheDocument();
    expect(screen.getByText("You no longer have access to this task's project.")).toBeInTheDocument();
    unmount();
  });

  it("ActivityTimeline waits for refresh before reconnecting an expired SSE with the new token", async () => {
    const { authStorage } = await import("@/lib/storage");
    const { ActivityTimeline } = await import("@/components/tasks/ActivityTimeline");
    authStorage.setAccessToken("expired-review-token");
    getTaskCommentsMock.mockResolvedValue({ data: [] });
    let finishRefresh!: (value: { accessToken: string; refreshToken: string }) => void;
    refreshSingleFlightMock.mockReturnValueOnce(new Promise((resolve) => { finishRefresh = resolve; }));
    const streams: Array<{ signal: AbortSignal; headers: Record<string, string>; onmessage: (event: { event: string; data: string }) => void }> = [];
    fetchEventSourceMock.mockImplementation((_url, options) => {
      streams.push(options);
      return new Promise<void>((resolve) => options.signal.addEventListener("abort", () => resolve(), { once: true }));
    });
    const { unmount } = render(<ActivityTimeline taskId={77} currentUserId={1} isManager={false} isReadOnly={false} />);
    await waitFor(() => expect(streams).toHaveLength(1));
    vi.useFakeTimers();
    await act(async () => {
      streams[0].onmessage({ event: "realtime.access_lost", data: '{"reason":"AUTH_EXPIRED"}' });
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(streams).toHaveLength(1);
    await act(async () => {
      authStorage.setAccessToken("fresh-review-token");
      finishRefresh({ accessToken: "fresh-review-token", refreshToken: "new-refresh" });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(streams).toHaveLength(2);
    expect(streams[1].headers.Authorization).toBe("Bearer fresh-review-token");
    unmount();
    vi.useRealTimers();
  });

  it("ProjectChatTab never restores pending history after project access is revoked", async () => {
    const { authStorage } = await import("@/lib/storage");
    const { useAuthStore } = await import("@/stores/auth.store");
    const { projectChatService } = await import("@/services/project-chat.service");
    const { ProjectChatTab } = await import("@/components/chat/ProjectChatTab");
    authStorage.setAccessToken("review-token");
    useAuthStore.setState({ accessToken: "review-token", isAuthenticated: true });
    let resolveHistory!: (value: Awaited<ReturnType<typeof projectChatService.getMessages>>) => void;
    const historySpy = vi.spyOn(projectChatService, "getMessages").mockImplementationOnce(() =>
      new Promise((resolve) => { resolveHistory = resolve; }));
    const { unmount } = render(<ProjectChatTab projectId={10} currentUserId={1} />);
    await waitFor(() => expect(stompInstances).toHaveLength(1));
    await act(async () => {
      stompInstances[0].onWebSocketClose?.({ code: 4403, reason: "PROJECT_ACCESS_REVOKED", wasClean: false });
      resolveHistory({ status: 200, message: "OK", data: {
        content: [{ id: 91, projectId: 10, senderId: 2, senderName: "Bob", messageType: "TEXT",
          content: "Revoked chat secret", createdAt: "2026-11-17T00:00:00Z" }],
        totalElements: 1, totalPages: 1, number: 0, size: 50,
      } });
    });
    expect(screen.queryByText("Revoked chat secret")).not.toBeInTheDocument();
    expect(stompInstances).toHaveLength(1);
    unmount();
    historySpy.mockRestore();
  });

  it("MainLayout notification SSE stops on SESSION_REVOKED and ignores late callbacks after unmount", async () => {
    const { authStorage } = await import("@/lib/storage");
    const { useAuthStore } = await import("@/stores/auth.store");
    const { default: MainLayout } = await import("@/layouts/MainLayout");

    authStorage.setAccessToken("notif-tok-1");
    authStorage.setRefreshToken("refresh-1");
    useAuthStore.setState({
      accessToken: "notif-tok-1",
      refreshToken: "refresh-1",
      isAuthenticated: true,
      role: "USER",
      user: {
        id: 1,
        email: "user@taskpilot.local",
        fullName: "User",
        avatarUrl: null,
        role: "USER",
        status: "AVAILABLE",
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });

    let capturedOpts: {
      signal: AbortSignal;
      onmessage: (ev: { event: string; data: string }) => void;
    } | null = null;

    fetchEventSourceMock.mockImplementation((_url: string, opts: typeof capturedOpts) => {
      capturedOpts = opts;
      return new Promise<void>((resolve) => {
        opts?.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MainLayout />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(capturedOpts).not.toBeNull();
    });

    act(() => {
      capturedOpts!.onmessage({
        event: "realtime.access_lost",
        data: JSON.stringify({ reason: "SESSION_REVOKED" }),
      });
    });

    await waitFor(() => {
      expect(clearSessionStateMock).toHaveBeenCalledWith({ redirectToLogin: true });
      expect(capturedOpts!.signal.aborted).toBe(true);
    });

    unmount();
  });
});
