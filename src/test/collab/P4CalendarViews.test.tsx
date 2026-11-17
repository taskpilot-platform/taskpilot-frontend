import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectCalendarTab } from "@/components/calendar/ProjectCalendarTab";
import { ScheduleMeetingDialog } from "@/components/calendar/ScheduleMeetingDialog";
import GlobalCalendarPage from "@/pages/GlobalCalendarPage";
import { meetingService } from "@/services/meeting.service";
import { profileService } from "@/services/profile.service";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";

function getZoneParts(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ms));
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
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
  // Adjust +/- hours to land on local 00:00 in target timezone
  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = approx + offsetHours * 3600_000;
    const cp = getZoneParts(candidate, timeZone);
    if (cp.year === year && cp.month === monthIndex && cp.day === day) {
      // Find earliest hour of that local day
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

/**
 * Simulates an IANA timezone cleanly even inside Vitest worker_threads on Windows,
 * restoring global Date and timers in finally.
 */
async function withSimulatedZone<T>(
  tz: string,
  fakeNowIso: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const OrigDate = globalThis.Date;
  const fixedNowMs = new OrigDate(fakeNowIso).getTime();

  class ZonedDate extends OrigDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(fixedNowMs);
      } else if (args.length === 1) {
        super(args[0] as string | number | Date);
      } else {
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

describe("P4.3 Calendar Views Local Day Grouping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups 2026-11-14T18:00:00Z on Nov 15 in Asia/Bangkok across agenda, mini-month, and month-grid without crashing on invalid inputs", async () => {
    await withSimulatedZone("Asia/Bangkok", "2026-11-15T01:15:00+07:00", async () => {
      vi.spyOn(meetingService, "getMeetings").mockResolvedValue([
        {
          id: 701,
          projectId: 100,
          title: "Bangkok Early AM Sync",
          description: "01:00 ICT sync",
          status: "SCHEDULED",
          recordingEnabled: false,
          hostId: 1,
          hostName: "Alex",
          roomName: "room-701",
          scheduledStartTime: "2026-11-14T18:00:00Z",
          startedAt: "",
          endedAt: null,
          durationSeconds: 0,
          activeParticipantsCount: 0,
          totalParticipantsCount: 1,
          isHost: true,
        },
        {
          id: 702,
          projectId: 100,
          title: "Corrupt Date Meeting",
          description: "",
          status: "SCHEDULED",
          recordingEnabled: false,
          hostId: 1,
          hostName: "Alex",
          roomName: "room-702",
          scheduledStartTime: "not-a-valid-date",
          startedAt: "",
          endedAt: null,
          durationSeconds: 0,
          activeParticipantsCount: 0,
          totalParticipantsCount: 1,
          isHost: true,
        },
      ]);

      render(
        <ProjectCalendarTab
          projectId={100}
          tasks={[
            {
              id: 801,
              title: "Date-only Deadline Nov 15",
              priority: "HIGH",
              status: "TODO",
              dueDate: "2026-11-15",
            } as never,
            {
              id: 802,
              title: "Impossible Feb 30 Task",
              priority: "LOW",
              status: "TODO",
              dueDate: "2026-02-30",
            } as never,
          ]}
          currentUserId={1}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("calendar-meeting-card-701")).toBeInTheDocument();
        expect(screen.getByText("Bangkok Early AM Sync")).toBeInTheDocument();
        expect(screen.getByTestId("calendar-task-card-801")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("calendar-meeting-card-702")).not.toBeInTheDocument();
      expect(screen.queryByTestId("calendar-task-card-802")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("calendar-month-view-btn"));
      const nov15Cell = screen.getByTestId("calendar-cell-2026-11-15");
      const nov14Cell = screen.getByTestId("calendar-cell-2026-11-14");
      expect(nov15Cell).toHaveTextContent("Bangkok Early AM Sync");
      expect(nov15Cell).toHaveTextContent("Date-only Deadline Nov 15");
      expect(nov14Cell).not.toHaveTextContent("Bangkok Early AM Sync");
    });
  });

  it("keeps same instant on Nov 14 in UTC and handles DST day selection in America/New_York", async () => {
    await withSimulatedZone("UTC", "2026-11-14T18:15:00Z", async () => {
      vi.spyOn(meetingService, "getMeetings").mockResolvedValue([
        {
          id: 701,
          projectId: 100,
          title: "UTC Nov 14 Meeting",
          status: "SCHEDULED",
          recordingEnabled: false,
          hostId: 1,
          hostName: "Alex",
          roomName: "room-701",
          scheduledStartTime: "2026-11-14T18:00:00Z",
          startedAt: "",
          endedAt: null,
          durationSeconds: 0,
          activeParticipantsCount: 0,
          totalParticipantsCount: 1,
          isHost: true,
        },
      ]);

      const { unmount } = render(<ProjectCalendarTab projectId={100} currentUserId={1} />);
      await waitFor(() => {
        expect(screen.getByText("UTC Nov 14 Meeting")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("calendar-month-view-btn"));
      expect(screen.getByTestId("calendar-cell-2026-11-14")).toHaveTextContent("UTC Nov 14 Meeting");
      expect(screen.getByTestId("calendar-cell-2026-11-15")).not.toHaveTextContent("UTC Nov 14 Meeting");
      unmount();
    });

    await withSimulatedZone("America/New_York", "2026-03-08T12:00:00-04:00", async () => {
      vi.spyOn(profileService, "getMe").mockResolvedValue({
        status: 200,
        message: "OK",
        data: { id: 1, fullName: "Alex", email: "alex@taskpilot.local", role: "USER" },
      } as never);
      vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
        status: 200,
        message: "OK",
        data: { content: [{ id: 100, name: "DST Project", status: "ACTIVE", myRole: "MANAGER" }] },
      } as never);
      vi.spyOn(projectService, "getProjectMembers").mockResolvedValue({
        status: 200,
        message: "OK",
        data: [],
      } as never);
      vi.spyOn(taskService, "getTasksByProject").mockResolvedValue({
        status: 200,
        message: "OK",
        data: [
          {
            id: 901,
            title: "DST Spring Forward Deadline",
            priority: "MEDIUM",
            status: "TODO",
            dueDate: "2026-03-08T05:30:00Z",
          },
        ],
      } as never);
      vi.spyOn(meetingService, "getMeetings").mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={["/calendar?project=100"]}>
          <GlobalCalendarPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("DST Spring Forward Deadline")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("calendar-month-view-btn"));
      const mar8Cell = screen.getByTestId("calendar-cell-2026-03-08");
      expect(mar8Cell).toHaveTextContent("DST Spring Forward Deadline");
      fireEvent.click(mar8Cell);

      await waitFor(() => {
        expect(screen.getByTestId("calendar-agenda-view")).toBeInTheDocument();
        expect(screen.getByText("DST Spring Forward Deadline")).toBeInTheDocument();
      });
    });
  });

  it("ScheduleMeetingDialog initializes default date locally and serializes scheduled times to UTC ISO", async () => {
    // Exercise native local datetime parsing. The display-only ZonedDate above cannot
    // simulate Date's string constructor and used to silently depend on the host TZ.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 15, 1, 0, 0));
    try {
      const offsetMinutes = new Date(2026, 10, 15, 9, 0, 0).getTimezoneOffset();
      const matrixOffsets: Record<string, number> = { UTC: 0, "Asia/Bangkok": -420, "America/New_York": 300 };
      const expectedZone = import.meta.env.VITE_CALENDAR_TEST_TZ as string | undefined;
      if (expectedZone && expectedZone in matrixOffsets) {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(expectedZone);
        expect(offsetMinutes).toBe(matrixOffsets[expectedZone]);
      }
      const createSpy = vi
        .spyOn(meetingService, "createMeeting")
        .mockResolvedValue({
          id: 99,
          projectId: 100,
          title: "Scheduled Sync",
          status: "SCHEDULED",
        } as never);

      render(
        <ScheduleMeetingDialog
          isOpen={true}
          onOpenChange={vi.fn()}
          projectId={100}
          onMeetingCreated={vi.fn()}
        />,
      );

      const dateInput = screen.getByTestId("schedule-meeting-date-input") as HTMLInputElement;
      expect(dateInput.value).toBe("2026-11-15");

      fireEvent.change(screen.getByTestId("schedule-meeting-title-input"), {
        target: { value: "Scheduled Sync" },
      });
      fireEvent.change(screen.getByTestId("schedule-meeting-start-time"), {
        target: { value: "09:00" },
      });
      fireEvent.change(screen.getByTestId("schedule-meeting-end-time"), {
        target: { value: "10:00" },
      });
      fireEvent.click(screen.getByTestId("submit-schedule-meeting-btn"));

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          100,
          expect.objectContaining({
            title: "Scheduled Sync",
            scheduledStartTime: new Date(Date.UTC(2026, 10, 15, 9) + offsetMinutes * 60_000).toISOString(),
            scheduledEndTime: new Date(Date.UTC(2026, 10, 15, 10) + offsetMinutes * 60_000).toISOString(),
          }),
        );
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
