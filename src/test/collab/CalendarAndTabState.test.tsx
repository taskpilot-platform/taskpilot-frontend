import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GlobalCalendarPage from "@/pages/GlobalCalendarPage";
import { ProjectCalendarTab } from "@/components/calendar/ProjectCalendarTab";
import { ScheduleMeetingDialog } from "@/components/calendar/ScheduleMeetingDialog";
import { projectService } from "@/services/project.service";
import { meetingService } from "@/services/meeting.service";
import ProjectWorkspacePage from "@/pages/ProjectWorkspacePage";
import { Routes, Route } from "react-router-dom";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

// Mocks
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/services/project.service", () => ({
  projectService: {
    getMyProjects: vi.fn(),
    getProjectMembers: vi.fn().mockResolvedValue({ data: [] }),
    getProjectDetail: vi.fn().mockResolvedValue({
      data: {
        id: 100,
        name: "Web App Core",
        description: "Core project",
        isArchived: false,
        myRole: "MANAGER",
      },
    }),
    getProjectSummary: vi.fn().mockResolvedValue({
      data: {
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 3,
        todoTasks: 2,
      },
    }),
  },
}));

vi.mock("@/services/task.service", () => ({
  taskService: {
    getTasksByProject: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("@/services/sprint.service", () => ({
  sprintService: {
    listSprints: vi.fn().mockResolvedValue({ data: [] }),
    getBoard: vi.fn().mockResolvedValue({ data: { tasks: [], workflowMode: "KANBAN" } }),
    getBacklog: vi.fn().mockResolvedValue({ data: { unscheduledTasks: [], sprints: [] } }),
    getTimeline: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
  },
}));

vi.mock("@/services/profile.service", () => ({
  profileService: {
    getMe: vi.fn().mockResolvedValue({
      data: { id: 1, email: "test@example.com", fullName: "Test User" },
    }),
  },
}));

vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    createMeeting: vi.fn(),
  },
}));

const mockMeetings: any[] = [
  {
    id: 1,
    title: "Sprint Planning & Outlook Sync",
    description: "Discuss upcoming sprint",
    status: "SCHEDULED",
    hostId: 1,
    hostEmail: "host@example.com",
    hostName: "Alice Lead",
    participantCount: 3,
    maxParticipants: 50,
    isRecording: false,
    startedAt: "",
    scheduledStartTime: new Date().toISOString().split("T")[0] + "T10:00:00Z",
    scheduledEndTime: new Date().toISOString().split("T")[0] + "T11:00:00Z",
    createdAt: new Date().toISOString(),
    isHost: false,
  },
  {
    id: 2,
    title: "Daily Standup",
    description: "Daily standup meeting",
    status: "ACTIVE",
    hostId: 1,
    hostEmail: "host@example.com",
    hostName: "Alice Lead",
    participantCount: 4,
    maxParticipants: 50,
    isRecording: false,
    startedAt: new Date().toISOString(),
    scheduledStartTime: new Date().toISOString().split("T")[0] + "T09:00:00Z",
    scheduledEndTime: new Date().toISOString().split("T")[0] + "T09:30:00Z",
    createdAt: new Date().toISOString(),
    isHost: false,
  },
];

const mockTasks: any[] = [
  {
    id: 101,
    title: "Integrate Teams Calendar API",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: new Date().toISOString().split("T")[0] + "T18:00:00Z",
    assigneeId: 1,
    position: 1,
  },
];

describe("Calendar & Teams/Outlook Scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectService.getMyProjects).mockResolvedValue({
      data: {
        content: [
          { id: 100, name: "Web App Core", description: "Core web app" } as any,
          { id: 200, name: "Mobile App Flutter", description: "Mobile client" } as any,
        ],
        totalPages: 1,
        totalElements: 2,
        number: 0,
        size: 10,
        first: true,
        last: true,
      } as any,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any);
    vi.mocked(meetingService.getMeetings).mockResolvedValue(mockMeetings as any);
  });

  describe("GlobalCalendarPage", () => {
    it("renders page header and project dropdown", async () => {
      render(
        <MemoryRouter initialEntries={["/calendar?project=100"]}>
          <GlobalCalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("global-calendar-page")).toBeInTheDocument();
      });

      expect(screen.getByTestId("global-calendar-project-select")).toBeInTheDocument();
      expect(screen.getByTestId("project-calendar-tab")).toBeInTheDocument();
    });
  });

  describe("ProjectCalendarTab", () => {
    it("renders Agenda view with both meetings and tasks due today", async () => {
      render(
        <ProjectCalendarTab
          projectId={100}
          tasks={mockTasks}
          currentUserId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("project-calendar-tab")).toBeInTheDocument();
      });

      // Meeting check
      expect(screen.getByText("Sprint Planning & Outlook Sync")).toBeInTheDocument();
      // Task check
      expect(screen.getByText("Integrate Teams Calendar API")).toBeInTheDocument();

      // Switch to Month view
      const monthBtn = screen.getByTestId("calendar-month-view-btn");
      fireEvent.click(monthBtn);
      expect(screen.getByTestId("calendar-month-view-btn")).toHaveClass("font-semibold");
    });
  });

  describe("ScheduleMeetingDialog", () => {
    it("allows scheduling a future meeting with date/time", async () => {
      vi.mocked(meetingService.createMeeting).mockResolvedValue({
        id: 3,
        title: "Sprint Review",
        description: "Review sprint deliverables",
        status: "SCHEDULED",
        hostUserId: 1,
        hostEmail: "host@example.com",
        hostName: "Alice Lead",
        participantCount: 1,
        maxParticipants: 50,
        isRecording: false,
        startedAt: null,
        scheduledStartTime: "2026-10-10T10:00:00Z",
        scheduledEndTime: "2026-10-10T11:00:00Z",
        createdAt: new Date().toISOString(),
        isHost: true,
      } as any);

      const onCreated = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ScheduleMeetingDialog
          projectId={100}
          isOpen={true}
          onOpenChange={onOpenChange}
          onMeetingCreated={onCreated}
        />
      );

      expect(screen.getByTestId("schedule-meeting-title-input")).toBeInTheDocument();
      expect(screen.getByTestId("submit-schedule-meeting-btn")).toBeInTheDocument();

      // Enter title
      fireEvent.change(screen.getByTestId("schedule-meeting-title-input"), {
        target: { value: "Sprint Review" },
      });

      fireEvent.click(screen.getByTestId("submit-schedule-meeting-btn"));

      await waitFor(() => {
        expect(meetingService.createMeeting).toHaveBeenCalledWith(
          100,
          expect.objectContaining({
            title: "Sprint Review",
          })
        );
      });
    });
  });

  describe("ProjectWorkspacePage Tab Keep-Alive & Calendar", () => {
    it("renders workspace tabs, switches to Calendar, and preserves visited tabs", async () => {
      render(
        <ConfirmProvider>
          <MemoryRouter initialEntries={["/projects/100/overview"]}>
            <Routes>
              <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
              <Route path="/projects/:projectId/:tabId" element={<ProjectWorkspacePage />} />
            </Routes>
          </MemoryRouter>
        </ConfirmProvider>
      );

      // Verify workspace loaded
      await waitFor(() => {
        expect(screen.getAllByText("Web App Core")[0]).toBeInTheDocument();
      });

      // Verify Calendar tab button exists
      const calendarTabBtn = screen.getByTestId("tab-calendar");
      expect(calendarTabBtn).toBeInTheDocument();

      // Click Calendar tab
      fireEvent.click(calendarTabBtn);

      await waitFor(() => {
        expect(screen.getByTestId("project-calendar-tab")).toBeInTheDocument();
      });

      // Switch to Meetings tab
      const meetingsTabBtn = screen.getByTestId("tab-meetings");
      fireEvent.click(meetingsTabBtn);

      await waitFor(() => {
        expect(screen.getByTestId("project-meetings-tab")).toBeInTheDocument();
      });

      // Verify Calendar tab was not unmounted (Keep-Alive), it is kept in DOM
      expect(screen.getByTestId("project-calendar-tab")).toBeInTheDocument();
    });
  });
});
