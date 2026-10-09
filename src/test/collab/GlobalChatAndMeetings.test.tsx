import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GlobalChatPage from "@/pages/GlobalChatPage";
import GlobalMeetingsPage from "@/pages/GlobalMeetingsPage";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import { meetingService } from "@/services/meeting.service";
import { projectChatService } from "@/services/project-chat.service";

const MOCK_PROJECTS = [
  {
    id: 100,
    name: "TaskPilot Collaboration Workspace",
    description: "Core workspace",
    status: "ACTIVE" as const,
    myRole: "MANAGER" as const,
    startDate: "2026-09-01T00:00:00Z",
    endDate: "2026-12-31T00:00:00Z",
    joinedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: 200,
    name: "Mobile App Initiative",
    description: "Mobile experience",
    status: "ACTIVE" as const,
    myRole: "MEMBER" as const,
    startDate: "2026-10-01T00:00:00Z",
    endDate: "2026-12-31T00:00:00Z",
    joinedAt: "2026-10-01T00:00:00Z",
  },
];

describe("Global Chat & Meetings Components", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        id: 1,
        email: "alex@taskpilot.local",
        fullName: "Alex Rivera",
        avatarUrl: null,
        role: "ADMIN",
        status: "ACTIVE",
        currentWorkload: 2,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    } as any);

    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: MOCK_PROJECTS,
        totalElements: 2,
        totalPages: 1,
        size: 50,
        number: 0,
      },
    } as any);

    vi.spyOn(projectChatService, "createStompClient").mockReturnValue({
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as any);

    vi.spyOn(projectChatService, "getMessages").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 50,
      },
    } as any);

    vi.spyOn(meetingService, "getMeetings").mockResolvedValue([
      {
        id: 501,
        projectId: 100,
        title: "Daily Standup & Tech Sync",
        description: "Live discussion",
        status: "ACTIVE",
        recordingEnabled: true,
        hostId: 1,
        hostName: "Alex Rivera",
        roomName: "meeting-100-501",
        startedAt: "2026-10-08T09:00:00Z",
        endedAt: null,
        durationSeconds: 120,
        activeParticipantsCount: 1,
        totalParticipantsCount: 1,
        isHost: true,
      },
    ]);
  });

  describe("GlobalChatPage", () => {
    it("renders project channels list and switches between channels", async () => {
      render(
        <MemoryRouter initialEntries={["/chat?project=100"]}>
          <GlobalChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("global-chat-page")).toBeInTheDocument();
      });

      expect(screen.getByTestId("channel-item-100")).toBeInTheDocument();
      expect(screen.getByTestId("channel-item-200")).toBeInTheDocument();

      // Filter search
      const searchInput = screen.getByTestId("project-search-input");
      fireEvent.change(searchInput, { target: { value: "Mobile" } });

      expect(screen.queryByTestId("channel-item-100")).not.toBeInTheDocument();
      expect(screen.getByTestId("channel-item-200")).toBeInTheDocument();
    });
  });

  describe("GlobalMeetingsPage", () => {
    it("renders page header and project selector with meetings tab", async () => {
      render(
        <MemoryRouter initialEntries={["/meetings?project=100"]}>
          <GlobalMeetingsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("global-meetings-page")).toBeInTheDocument();
        expect(screen.getByTestId("global-meetings-project-select")).toBeInTheDocument();
        expect(screen.getByTestId("project-meetings-tab")).toBeInTheDocument();
        expect(screen.getByTestId("active-meeting-banner")).toBeInTheDocument();
        expect(screen.getByTestId("active-banner-title")).toHaveTextContent("Daily Standup & Tech Sync");
      });
    });
  });

  describe("LiveMeetingRoom UI & Theme Check", () => {
    it("renders room without pitch-black background and contains media controls", () => {
      // Mock navigator.mediaDevices
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
        },
      });

      render(
        <LiveMeetingRoom
          projectId={100}
          meetingId={501}
          currentUserId={1}
          onLeave={vi.fn()}
          onEndMeeting={vi.fn()}
        />
      );

      const room = screen.getByTestId("live-meeting-room");
      expect(room).toBeInTheDocument();

      // Must not use pitch-black bg-slate-950
      expect(room.className).not.toContain("bg-slate-950");

      // Verify controls
      expect(screen.getByTestId("toggle-cam-btn")).toBeInTheDocument();
      expect(screen.getByTestId("toggle-mic-btn")).toBeInTheDocument();
      expect(screen.getByTestId("leave-meeting-btn")).toBeInTheDocument();
    });
  });
});
