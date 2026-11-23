import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import GlobalChatPage from "@/pages/GlobalChatPage";
import GlobalCalendarPage from "@/pages/GlobalCalendarPage";
import { ProjectChatTab } from "@/components/chat/ProjectChatTab";
import { useAuthStore } from "@/stores/auth.store";
import { profileService } from "@/services/profile.service";
import { projectService } from "@/services/project.service";
import { projectChatService } from "@/services/project-chat.service";
import { taskService } from "@/services/task.service";
import { meetingService } from "@/services/meeting.service";
import { isSupportedProjectTimezone } from "@/lib/projectTaskDate";
import type { ProjectChatMessage } from "@/types/collab";

const runtimeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const testProjectTimezone = isSupportedProjectTimezone(runtimeTimezone) ? runtimeTimezone : "UTC";

const PROJECTS = [
  { id: 100, name: "Project Alpha", status: "ACTIVE", myRole: "MANAGER" },
  { id: 200, name: "Project Beta", status: "ACTIVE", myRole: "MEMBER" },
];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function RouterHarness({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div>
      <button
        type="button"
        data-testid="nav-to-200-query"
        onClick={() => navigate("/chat?project=200")}
      />
      <button
        type="button"
        data-testid="nav-to-100-param"
        onClick={() => navigate("/chat/100")}
      />
      <button
        type="button"
        data-testid="nav-back"
        onClick={() => navigate(-1)}
      />
      <button
        type="button"
        data-testid="nav-forward"
        onClick={() => navigate(1)}
      />
      <button
        type="button"
        data-testid="cal-to-200"
        onClick={() => navigate("/calendar?project=200")}
      />
      {children}
    </div>
  );
}

describe("P4.3 Mounted Route & Project Switch Synchronization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      accessToken: "jwt-1",
      refreshToken: "ref-1",
      isAuthenticated: true,
      role: "USER",
      user: {
        id: 1,
        email: "alex@taskpilot.local",
        fullName: "Alex Rivera",
        avatarUrl: null,
        role: "USER",
        status: "AVAILABLE",
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });

    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { id: 1, email: "alex@taskpilot.local", fullName: "Alex Rivera", role: "USER" },
    } as never);

    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { content: PROJECTS },
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("GlobalChatPage handles A -> B -> param -> back/forward on same mounted instance, deactivates old STOMP, and ignores late callbacks", async () => {
    const stompByProject = new Map<
      number,
      {
        onMessage: (msg: ProjectChatMessage) => void;
        deactivate: ReturnType<typeof vi.fn>;
      }
    >();

    vi.spyOn(projectChatService, "createStompClient").mockImplementation(
      (projectId, _token, onMessage) => {
        const client = {
          activate: vi.fn(),
          deactivate: vi.fn().mockResolvedValue(undefined),
        };
        stompByProject.set(projectId, {
          onMessage,
          deactivate: client.deactivate,
        });
        return client as never;
      },
    );

    const deferred100 = createDeferred<unknown>();
    const getMessagesSpy = vi
      .spyOn(projectChatService, "getMessages")
      .mockImplementation((projectId: number) => {
        if (projectId === 100 && !stompByProject.has(200)) {
          return deferred100.promise as never;
        }
        return Promise.resolve({
          status: 200,
          message: "OK",
          data: {
            content: [
              {
                id: projectId * 10,
                projectId,
                senderId: 2,
                senderName: `User-${projectId}`,
                messageType: "TEXT",
                content: `Fresh message for ${projectId}`,
                createdAt: "2026-11-17T00:00:00Z",
              },
            ],
          },
        }) as never;
      });

    render(
      <MemoryRouter initialEntries={["/chat?project=100"]}>
        <RouterHarness>
          <Routes>
            <Route path="/chat" element={<GlobalChatPage />} />
            <Route path="/chat/:projectId" element={<GlobalChatPage />} />
          </Routes>
        </RouterHarness>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-channel-name")).toHaveTextContent("Project Alpha");
      expect(stompByProject.has(100)).toBe(true);
    });

    const stomp100 = stompByProject.get(100)!;

    // Switch to project 200 while project 100 history is still pending
    act(() => {
      screen.getByTestId("nav-to-200-query").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("active-channel-name")).toHaveTextContent("Project Beta");
      expect(screen.getByText("Fresh message for 200")).toBeInTheDocument();
      expect(stomp100.deactivate).toHaveBeenCalled();
    });

    // Late response & late STOMP frame from project 100 must be ignored
    await act(async () => {
      deferred100.resolve({
        status: 200,
        message: "OK",
        data: {
          content: [
            {
              id: 9991,
              projectId: 100,
              senderId: 9,
              senderName: "Stale",
              messageType: "TEXT",
              content: "STALE_PROJECT_100_PAYLOAD",
              createdAt: "2026-11-17T00:00:00Z",
            },
          ],
        },
      });
      await Promise.resolve();
    });

    act(() => {
      stomp100.onMessage({
        id: 9992,
        projectId: 100,
        senderId: 9,
        senderName: "Stale",
        messageType: "TEXT",
        content: "LATE_WS_100_FRAME",
        createdAt: "2026-11-17T00:01:00Z",
      });
    });

    expect(screen.queryByText("STALE_PROJECT_100_PAYLOAD")).not.toBeInTheDocument();
    expect(screen.queryByText("LATE_WS_100_FRAME")).not.toBeInTheDocument();

    // Navigate via /chat/100 route param, then browser Back -> 200, Forward -> 100
    act(() => {
      screen.getByTestId("nav-to-100-param").click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("active-channel-name")).toHaveTextContent("Project Alpha");
      expect(screen.getByText("Fresh message for 100")).toBeInTheDocument();
    });

    act(() => {
      screen.getByTestId("nav-back").click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("active-channel-name")).toHaveTextContent("Project Beta");
    });

    act(() => {
      screen.getByTestId("nav-forward").click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("active-channel-name")).toHaveTextContent("Project Alpha");
    });

    expect(getMessagesSpy).toHaveBeenCalled();
  });

  it("ProjectChatTab clears stale content and ignores late history on direct projectId prop change", async () => {
    const stompClients: Array<{
      onMessage: (msg: ProjectChatMessage) => void;
      deactivate: ReturnType<typeof vi.fn>;
    }> = [];
    vi.spyOn(projectChatService, "createStompClient").mockImplementation(
      (_projectId, _token, onMessage) => {
        const client = {
          activate: vi.fn(),
          deactivate: vi.fn().mockResolvedValue(undefined),
        };
        stompClients.push({ onMessage, deactivate: client.deactivate });
        return client as never;
      },
    );

    const deferred100 = createDeferred<unknown>();
    vi.spyOn(projectChatService, "getMessages").mockImplementation((projectId: number) => {
      if (projectId === 100) {
        return deferred100.promise as never;
      }
      return Promise.resolve({
        status: 200,
        message: "OK",
        data: {
          content: [
            {
              id: 201,
              projectId: 200,
              senderId: 2,
              senderName: "Beta Member",
              messageType: "TEXT",
              content: "Beta clean history",
              createdAt: "2026-11-17T00:00:00Z",
            },
          ],
        },
      }) as never;
    });

    const { rerender } = render(<ProjectChatTab projectId={100} currentUserId={1} />);
    await waitFor(() => {
      expect(stompClients).toHaveLength(1);
    });

    rerender(<ProjectChatTab projectId={200} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Beta clean history")).toBeInTheDocument();
      expect(stompClients[0].deactivate).toHaveBeenCalled();
    });

    await act(async () => {
      deferred100.resolve({
        status: 200,
        message: "OK",
        data: {
          content: [
            {
              id: 101,
              projectId: 100,
              senderId: 3,
              senderName: "Old",
              messageType: "TEXT",
              content: "Stale 100 history",
              createdAt: "2026-11-17T00:00:00Z",
            },
          ],
        },
      });
      await Promise.resolve();
    });

    expect(screen.queryByText("Stale 100 history")).not.toBeInTheDocument();
  });

  it("GlobalCalendarPage clears stale project tasks/meetings and ignores late responses across route changes and back", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-23T17:24:00Z"));
    const deferredTasks100 = createDeferred<unknown>();
    vi.spyOn(projectService, "getProjectMembers").mockResolvedValue({
      status: 200,
      message: "OK",
      data: [],
    } as never);

    vi.spyOn(meetingService, "getMeetings").mockResolvedValue([]);

    vi.spyOn(taskService, "getTasksByProject").mockImplementation((projectId: number) => {
      if (projectId === 100) {
        return deferredTasks100.promise as never;
      }
      return Promise.resolve({
        status: 200,
        message: "OK",
        data: [
          {
            id: 222,
            title: "Project 200 Task Due Today",
            priority: "HIGH",
            status: "TODO",
            dueDate: new Date().toISOString(),
            projectTimezoneId: testProjectTimezone,
          },
        ],
      }) as never;
    });

    render(
      <MemoryRouter initialEntries={["/calendar?project=100"]}>
        <RouterHarness>
          <Routes>
            <Route path="/calendar" element={<GlobalCalendarPage />} />
            <Route path="/calendar/:projectId" element={<GlobalCalendarPage />} />
          </Routes>
        </RouterHarness>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("global-calendar-page")).toBeInTheDocument();
    });

    act(() => {
      screen.getByTestId("cal-to-200").click();
    });

    await waitFor(() => {
      expect(screen.getByText("Project 200 Task Due Today")).toBeInTheDocument();
    });

    // Late task payload from project 100 must not overwrite project 200 calendar
    await act(async () => {
      deferredTasks100.resolve({
        status: 200,
        message: "OK",
        data: [
          {
            id: 111,
            title: "Stale Project 100 Task",
            priority: "LOW",
            status: "TODO",
            dueDate: new Date().toISOString(),
            projectTimezoneId: testProjectTimezone,
          },
        ],
      });
      await Promise.resolve();
    });

    expect(screen.queryByText("Stale Project 100 Task")).not.toBeInTheDocument();
    expect(screen.getByText("Project 200 Task Due Today")).toBeInTheDocument();

    // Browser back returns to project 100 and clears project 200 task immediately
    act(() => {
      screen.getByTestId("nav-back").click();
    });

    await waitFor(() => {
      expect(screen.queryByText("Project 200 Task Due Today")).not.toBeInTheDocument();
    });
  });
});
