import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TaskMetadataSidebar } from "@/components/tasks/TaskMetadataSidebar";
import { ProjectCalendarTab } from "@/components/calendar/ProjectCalendarTab";
import GlobalCalendarPage from "@/pages/GlobalCalendarPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import { meetingService } from "@/services/meeting.service";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import { taskService } from "@/services/task.service";
import { http } from "@/lib/http";
import {
  formatInstantToProjectDateInput,
  formatTaskDateDisplay,
  isSupportedProjectTimezone,
  isValidTaskDateRange,
} from "@/lib/projectTaskDate";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/tasks/LabelSelector", () => ({
  LabelSelector: () => <div data-testid="label-selector" />,
}));

vi.mock("@/components/tasks/SkillSelector", () => ({
  SkillSelector: () => <div data-testid="skill-selector" />,
}));

vi.mock("@/components/tasks/ActivityTimeline", () => ({
  ActivityTimeline: () => <div data-testid="activity-timeline" />,
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

function getZoneParts(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ms));
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    weekday: weekdayMap[map.weekday] ?? 0,
  };
}

function zonedMidnightUtcMs(year: number, monthIndex: number, day: number, timeZone: string): number {
  const guess = Date.UTC(year, monthIndex, day, 12, 0, 0);
  const parts = getZoneParts(guess, timeZone);
  const dayDiff = day - parts.day;
  const approx = Date.UTC(year, monthIndex, day + dayDiff, 0, 0, 0);
  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = approx + offsetHours * 3600_000;
    const cp = getZoneParts(candidate, timeZone);
    if (cp.year === year && cp.month === monthIndex && cp.day === day) {
      let first = candidate;
      while (true) {
        const prev = first - 3600_000;
        const pp = getZoneParts(prev, timeZone);
        if (pp.year === year && pp.month === monthIndex && pp.day === day) {
          first = prev;
        } else {
          break;
        }
      }
      return first;
    }
  }
  return Date.UTC(year, monthIndex, day, 0, 0, 0);
}

async function withSimulatedZone<T>(tz: string, fakeNowIso: string, fn: () => Promise<T> | T): Promise<T> {
  const OrigDate = globalThis.Date;
  const fixedNowMs = new OrigDate(fakeNowIso).getTime();

  class ZonedDate extends OrigDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(fixedNowMs);
      else if (args.length === 1) super(args[0] as string | number | Date);
      else {
        const [y, m, d = 1] = args as number[];
        super(zonedMidnightUtcMs(y, m, d, tz));
      }
    }
    static now(): number {
      return fixedNowMs;
    }
    getFullYear(): number {
      return getZoneParts(this.getTime(), tz).year;
    }
    getMonth(): number {
      return getZoneParts(this.getTime(), tz).month;
    }
    getDate(): number {
      return getZoneParts(this.getTime(), tz).day;
    }
    getDay(): number {
      return getZoneParts(this.getTime(), tz).weekday;
    }
  }

  vi.stubGlobal("Date", ZonedDate);
  try {
    return await fn();
  } finally {
    vi.stubGlobal("Date", OrigDate);
  }
}

describe("P5 task contracts & review regressions (R4/R5/R6/R7)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("R7: formats project-zone dates, rejects Z and UTC+07:00 explicitly, and surfaces invalid timezone in sidebar", () => {
    expect(isSupportedProjectTimezone("UTC")).toBe(true);
    expect(isSupportedProjectTimezone("Asia/Ho_Chi_Minh")).toBe(true);
    expect(isSupportedProjectTimezone("America/New_York")).toBe(true);
    expect(isSupportedProjectTimezone("Z")).toBe(false);
    expect(isSupportedProjectTimezone("UTC+07:00")).toBe(false);
    expect(isSupportedProjectTimezone("+07:00")).toBe(false);
    expect(isSupportedProjectTimezone("Invalid/Zone")).toBe(false);

    expect(formatInstantToProjectDateInput("2026-11-14T17:00:00Z", "Asia/Ho_Chi_Minh")).toBe("2026-11-15");
    expect(formatInstantToProjectDateInput("2026-11-15T16:59:59.999999Z", "Asia/Ho_Chi_Minh")).toBe("2026-11-15");
    expect(formatInstantToProjectDateInput("2026-11-14T17:00:00Z", "America/New_York")).toBe("2026-11-14");
    expect(formatTaskDateDisplay("2026-11-14T17:00:00Z", "Asia/Ho_Chi_Minh")).toContain("15");

    expect(() => formatInstantToProjectDateInput("2026-11-15T12:00:00Z", "Z")).toThrow();
    expect(() => formatInstantToProjectDateInput("2026-11-15T12:00:00Z", "UTC+07:00")).toThrow();
    expect(() => formatTaskDateDisplay("2026-11-15T12:00:00Z", "UTC+07:00")).toThrow();

    render(
      <TaskMetadataSidebar
        projectId={100}
        projectTimezoneId="UTC+07:00"
        assigneeId={null}
        status="TODO"
        priority="MEDIUM"
        startDate="2026-11-14T17:00:00Z"
        dueDate="2026-11-15T16:59:59.999999Z"
        projectMembers={[]}
        labels={[]}
        requiredSkills={[]}
        isManager={true}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/UTC\+07:00/i);
  });

  it("allows same-day task ranges and emits explicit null clears", async () => {
    expect(isValidTaskDateRange("2026-11-15", "2026-11-15")).toBe(true);
    expect(isValidTaskDateRange("2026-11-16", "2026-11-15")).toBe(false);

    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskMetadataSidebar
        projectId={100}
        projectTimezoneId="Asia/Ho_Chi_Minh"
        assigneeId={2}
        status="TODO"
        priority="MEDIUM"
        startDate="2026-11-14T17:00:00Z"
        dueDate="2026-11-15T16:59:59.999999Z"
        projectMembers={[
          {
            projectId: 100,
            userId: 2,
            fullName: "Sarah Connor",
            email: "sarah@example.com",
            avatarUrl: null,
            role: "MEMBER",
            joinedAt: null,
          },
        ]}
        labels={[]}
        requiredSkills={[]}
        isManager={true}
        onUpdate={onUpdate}
      />,
    );

    const startInput = screen.getByLabelText("Start Date") as HTMLInputElement;
    const dueInput = screen.getByLabelText("Due Date") as HTMLInputElement;
    expect(startInput.value).toBe("2026-11-15");
    expect(dueInput.value).toBe("2026-11-15");

    fireEvent.change(dueInput, { target: { value: "2026-11-16" } });
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ dueDate: "2026-11-16" }));

    fireEvent.change(dueInput, { target: { value: "" } });
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ dueDate: null }));
    const clearCall = onUpdate.mock.calls[1][0];
    expect(Object.prototype.hasOwnProperty.call(clearCall, "dueDate")).toBe(true);
    expect(clearCall.dueDate).toBeNull();
  });

  it("R4: groups tasks in project timezone across Agenda & Month in multiple viewer TZs while keeping meetings viewer-local", async () => {
    const meetingUtc = {
      id: 701,
      projectId: 100,
      title: "Viewer Local Sync",
      description: "",
      status: "SCHEDULED" as const,
      recordingEnabled: false,
      hostId: 1,
      hostName: "Alex",
      roomName: "room-701",
      scheduledStartTime: "2026-11-15T12:00:00Z", // Nov 15 19:00 Bangkok (+07), Nov 16 02:00 Kiritimati (+14)
      startedAt: "",
      endedAt: null,
      durationSeconds: 0,
      activeParticipantsCount: 0,
      totalParticipantsCount: 1,
      isHost: true,
    };

    const utcProjectTask = {
      id: 501,
      projectId: 100,
      title: "UTC Nov 15 Task",
      status: "TODO" as const,
      priority: "HIGH" as const,
      position: 0,
      difficultyLevel: 2,
      dueDate: "2026-11-15T23:59:59.999999Z",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
      version: 0,
      projectTimezoneId: "UTC",
    };

    // Viewer = Asia/Bangkok (today Nov 15): UTC task MUST group under Nov 15 (not Nov 16!)
    await withSimulatedZone("Asia/Bangkok", "2026-11-15T10:00:00+07:00", async () => {
      vi.spyOn(meetingService, "getMeetings").mockResolvedValue([meetingUtc]);
      const { unmount } = render(
        <ProjectCalendarTab projectId={100} projectTimezoneId="UTC" tasks={[utcProjectTask]} />,
      );

      await waitFor(() => expect(screen.getByTestId("calendar-task-card-501")).toBeInTheDocument());
      expect(screen.getByTestId("calendar-meeting-card-701")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("calendar-month-view-btn"));
      expect(screen.getByTestId("calendar-cell-2026-11-15")).toHaveTextContent("UTC Nov 15 Task");
      expect(screen.getByTestId("calendar-cell-2026-11-16")).not.toHaveTextContent("UTC Nov 15 Task");
      unmount();
    });

    // Viewer = Pacific/Kiritimati (+14, Nov 16) viewing Asia/Ho_Chi_Minh project in GlobalCalendarPage:
    // HCM task due 2026-11-15T16:59:59.999999Z stays on Nov 15 while meeting 2026-11-15T12:00:00Z is viewer-local Nov 16!
    const hcmTask = {
      id: 502,
      projectId: 200,
      title: "HCM Nov 15 Task",
      status: "TODO" as const,
      priority: "MEDIUM" as const,
      position: 0,
      difficultyLevel: 1,
      dueDate: "2026-11-15T16:59:59.999999Z",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
      version: 0,
    };

    await withSimulatedZone("Pacific/Kiritimati", "2026-11-16T02:00:00+14:00", async () => {
      vi.spyOn(profileService, "getMe").mockResolvedValue({ data: { id: 1 } } as never);
      vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
        data: [
          {
            id: 200,
            name: "HCM Global Cal",
            description: null,
            status: "ACTIVE",
            myRole: "MANAGER",
            startDate: null,
            endDate: null,
            timezoneId: "Asia/Ho_Chi_Minh",
            joinedAt: "2026-11-01T00:00:00Z",
          },
        ],
      } as never);
      vi.spyOn(projectService, "getProjectMembers").mockResolvedValue({ data: [] } as never);
      vi.spyOn(taskService, "getTasksByProject").mockResolvedValue({ data: [hcmTask] } as never);
      vi.spyOn(meetingService, "getMeetings").mockResolvedValue([meetingUtc]);

      render(
        <MemoryRouter initialEntries={["/calendar/200"]}>
          <Routes>
            <Route path="/calendar/:projectId" element={<GlobalCalendarPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => expect(screen.getByTestId("calendar-meeting-card-701")).toBeInTheDocument());
      // Meeting 2026-11-15T12:00:00Z is viewer-local Nov 16 in Kiritimati
      fireEvent.click(screen.getByTestId("calendar-month-view-btn"));
      expect(screen.getByTestId("calendar-cell-2026-11-16")).toHaveTextContent("Viewer Local Sync");
      // HCM task 2026-11-15T16:59:59.999999Z stays Nov 15 in Asia/Ho_Chi_Minh
      expect(screen.getByTestId("calendar-cell-2026-11-15")).toHaveTextContent("HCM Nov 15 Task");
      expect(screen.getByTestId("calendar-cell-2026-11-16")).not.toHaveTextContent("HCM Nov 15 Task");
    });
  });

  it("R5: sends stable Idempotency-Key & requestId on all task writes and preserves same key on retry", async () => {
    const postSpy = vi.spyOn(http, "post").mockResolvedValue({ data: { status: 201, data: { id: 1 } } } as never);
    const patchSpy = vi.spyOn(http, "patch").mockResolvedValue({ data: { status: 200, data: { id: 1 } } } as never);
    const delSpy = vi.spyOn(http, "delete").mockResolvedValue({ data: { status: 200, data: null } } as never);

    await taskService.createTask({ projectId: 10, title: "Create A" });
    const createHeaders = postSpy.mock.calls[0][2]?.headers as Record<string, string>;
    expect(createHeaders?.["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/i);

    await taskService.createTask({ projectId: 10, title: "Create A" }, "11111111-1111-4111-8111-111111111111");
    expect((postSpy.mock.calls[1][2]?.headers as Record<string, string>)?.["Idempotency-Key"]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );

    await taskService.patchTask(5, { expectedTaskVersion: 0, title: "B" });
    const patchBody = patchSpy.mock.calls[0][1] as { requestId?: string };
    const patchHeaders = patchSpy.mock.calls[0][2]?.headers as Record<string, string>;
    expect(patchBody.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(patchHeaders?.["Idempotency-Key"]).toBe(patchBody.requestId);

    await taskService.moveTaskKanban(5, { status: "IN_PROGRESS", position: 1, expectedTaskVersion: 0 });
    expect((patchSpy.mock.calls[1][2]?.headers as Record<string, string>)?.["Idempotency-Key"]).toBe(
      (patchSpy.mock.calls[1][1] as { requestId?: string }).requestId,
    );

    await taskService.deleteTask(5, 0);
    const delConfig = delSpy.mock.calls[0][1] as { params?: Record<string, unknown>; headers?: Record<string, string> };
    expect(delConfig.params?.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(delConfig.headers?.["Idempotency-Key"]).toBe(delConfig.params?.requestId);
  });

  it("R6: preserves valid observed version 0 and blocks missing version without fabricating 0", async () => {
    const patchMock = vi.spyOn(taskService, "patchTask").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { id: 75, version: 1 } as never,
    });
    const getTaskSpy = vi.spyOn(taskService, "getTaskById");
    vi.spyOn(projectService, "getProjectMembers").mockResolvedValue({ data: [] } as never);
    vi.spyOn(profileService, "getMe").mockResolvedValue({ data: { id: 1 } } as never);
    vi.spyOn(projectService, "getProjectDetail").mockResolvedValue({
      data: { id: 100, status: "ACTIVE", timezoneId: "Asia/Ho_Chi_Minh" },
    } as never);

    // 1. Observed version 0 succeeds and passes expectedTaskVersion: 0
    getTaskSpy.mockResolvedValue({
      data: {
        task: {
          id: 75,
          projectId: 100,
          title: "Version Zero Task",
          description: "",
          status: "TODO",
          priority: "MEDIUM",
          position: 0,
          difficultyLevel: 1,
          createdAt: "2026-11-15T00:00:00Z",
          updatedAt: "2026-11-15T00:00:00Z",
          version: 0,
        },
        assignee: null,
        reporter: null,
        subtasks: [],
        requiredSkills: [],
      },
    } as never);

    const view1 = render(
      <MemoryRouter initialEntries={["/projects/100/tasks/75"]}>
        <Routes>
          <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText("Due Date")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Due Date"), { target: { value: "2026-11-20" } });
    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));
    expect(patchMock.mock.calls[0][1].expectedTaskVersion).toBe(0);
    view1.unmount();

    // 2. Missing version (undefined) MUST block submit, NEVER fabricate 0, and trigger reload
    patchMock.mockClear();
    getTaskSpy.mockClear();
    getTaskSpy.mockResolvedValue({
      data: {
        task: {
          id: 75,
          projectId: 100,
          title: "Missing Version Task",
          description: "",
          status: "TODO",
          priority: "MEDIUM",
          position: 0,
          difficultyLevel: 1,
          createdAt: "2026-11-15T00:00:00Z",
          updatedAt: "2026-11-15T00:00:00Z",
          // version omitted at runtime!
        },
        assignee: null,
        reporter: null,
        subtasks: [],
        requiredSkills: [],
      },
    } as never);

    render(
      <MemoryRouter initialEntries={["/projects/100/tasks/75"]}>
        <Routes>
          <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText("Due Date")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Due Date"), { target: { value: "2026-11-21" } });

    await waitFor(() => expect(getTaskSpy).toHaveBeenCalledTimes(2));
    expect(patchMock).not.toHaveBeenCalled();
  });
});
