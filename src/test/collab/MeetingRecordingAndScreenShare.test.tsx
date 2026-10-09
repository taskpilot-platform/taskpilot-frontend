import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import { MeetingRecordingModal } from "@/components/meetings/MeetingRecordingModal";
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { meetingService } from "@/services/meeting.service";
import type { ProjectMeetingDto } from "@/types/meeting";

// Mock services
vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    joinMeeting: vi.fn(),
    leaveMeeting: vi.fn(),
    endMeeting: vi.fn(),
  },
}));

vi.mock("@/services/project-files.service", () => ({
  projectFilesService: {
    uploadFile: vi.fn().mockResolvedValue({ data: { id: 999 } }),
    downloadFileUrl: vi.fn().mockReturnValue("/api/v1/projects/1/files/999/download"),
  },
}));

const mockEndedMeeting: ProjectMeetingDto = {
  id: 234,
  projectId: 4,
  hostId: 1,
  hostName: "Admin",
  title: "Sprint Review Session",
  roomName: "tp-proj-4-m-234",
  status: "ENDED",
  recordingEnabled: true,
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  endedAt: new Date().toISOString(),
  durationSeconds: 120,
  activeParticipantsCount: 0,
  totalParticipantsCount: 3,
  isHost: true,
};

describe("Meeting Recording and Screen Sharing Features", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await meetingRecordingStore.deleteRecording(234);
    await meetingRecordingStore.deleteRecording(888);
  });

  describe("meetingRecordingStore", () => {
    it("saves, retrieves, and checks recordings", async () => {
      const dummyBlob = new Blob(["mock video data"], { type: "video/webm" });
      await meetingRecordingStore.saveRecording(234, dummyBlob, {
        title: "Test Recording",
        durationSeconds: 45,
        projectId: 4,
      });

      const has = await meetingRecordingStore.hasRecording(234);
      expect(has).toBe(true);

      const rec = await meetingRecordingStore.getRecording(234);
      expect(rec).not.toBeNull();
      expect(rec?.title).toBe("Test Recording");
      expect(rec?.durationSeconds).toBe(45);

      await meetingRecordingStore.deleteRecording(234);
      const afterDelete = await meetingRecordingStore.getRecording(234);
      expect(afterDelete).toBeNull();
    });
  });

  describe("MeetingRecordingModal Component", () => {
    it("renders modal header and fallback view when recording is not in local store", async () => {
      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={mockEndedMeeting}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Sprint Review Session")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(
          screen.queryByTestId("recording-video-player") || screen.queryByTestId("play-sample-recording-btn")
        ).toBeInTheDocument();
      });
    });

    it("renders video player when local recording exists", async () => {
      const dummyBlob = new Blob(["mock video data"], { type: "video/webm" });
      await meetingRecordingStore.saveRecording(234, dummyBlob, {
        title: "Sprint Review Session",
        durationSeconds: 120,
      });

      // Mock URL.createObjectURL
      const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/mock-video");
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={mockEndedMeeting}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recording-video-player")).toBeInTheDocument();
        expect(screen.getByTestId("download-recording-btn")).toBeInTheDocument();
      });
    });
  });

  describe("ProjectMeetingsTab Integration", () => {
    it("renders Watch Recording button on ended meetings with recording enabled", async () => {
      vi.mocked(meetingService.getMeetings).mockResolvedValue([mockEndedMeeting]);

      render(
        <ConfirmProvider>
          <ProjectMeetingsTab
            projectId={4}
            isArchived={false}
            currentUserId={1}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        const watchBtn = screen.getByTestId("watch-recording-btn-234");
        expect(watchBtn).toBeInTheDocument();
        expect(watchBtn).toHaveTextContent("Xem video ghi hình");
      });

      // Clicking button opens modal
      const watchBtn = screen.getByTestId("watch-recording-btn-234");
      fireEvent.click(watchBtn);

      await waitFor(() => {
        expect(screen.getAllByText("Sprint Review Session").length).toBeGreaterThanOrEqual(1);
        expect(
          screen.queryByTestId("recording-video-player") || screen.queryByTestId("play-sample-recording-btn")
        ).toBeInTheDocument();
      });
    });
  });

  describe("LiveMeetingRoom Toolbar & Custom Confirm", () => {
    it("renders Screen Share and Recording buttons and uses Custom Confirm for End Meeting", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
          getDisplayMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
            getVideoTracks: () => [{ onended: null, stop: vi.fn() }],
          }),
        },
      });

      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "mock-token",
        livekitUrl: "wss://mock.livekit.cloud",
        roomName: "tp-proj-4-m-234",
        identity: "user_1",
        participantName: "Admin",
        isHost: true,
        meeting: mockEndedMeeting,
      });

      render(
        <ConfirmProvider>
          <LiveMeetingRoom
            projectId={4}
            meetingId={234}
            currentUserId={1}
            onLeave={vi.fn()}
            onEndMeeting={vi.fn()}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("toggle-screen-share-btn")).toBeInTheDocument();
        expect(screen.getByTestId("toggle-recording-btn")).toBeInTheDocument();
        expect(screen.getByTestId("end-meeting-btn")).toBeInTheDocument();
      });

      // Window.confirm should NOT be called when clicking End Meeting
      const windowConfirmSpy = vi.spyOn(window, "confirm");
      const endBtn = screen.getByTestId("end-meeting-btn");
      fireEvent.click(endBtn);

      // Confirm dialog from ConfirmProvider appears instead of browser native confirm
      expect(windowConfirmSpy).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("Kết thúc cuộc họp")).toBeInTheDocument();
        expect(screen.getByText("Bạn có chắc chắn muốn kết thúc cuộc họp này cho tất cả thành viên?")).toBeInTheDocument();
      });
    });
  });
});
