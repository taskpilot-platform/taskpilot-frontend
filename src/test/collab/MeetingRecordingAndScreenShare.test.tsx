import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import { MeetingRecordingModal } from "@/components/meetings/MeetingRecordingModal";
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { meetingService } from "@/services/meeting.service";
import { projectFilesService } from "@/services/project-files.service";
import type { ProjectMeetingDto } from "@/types/meeting";

// Mock services
vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    joinMeeting: vi.fn(),
    leaveMeeting: vi.fn(),
    endMeeting: vi.fn(),
    updateRecordingFile: vi.fn().mockResolvedValue({}),
    startRecording: vi.fn().mockResolvedValue({
      id: 234,
      projectId: 4,
      egressId: "EG_TEST_1",
      recordingStatus: "RECORDING",
      recordingEnabled: true,
    }),
    stopRecording: vi.fn().mockResolvedValue({
      id: 234,
      projectId: 4,
      egressId: "EG_TEST_1",
      recordingStatus: "PROCESSING",
      recordingEnabled: true,
    }),
    syncRecording: vi.fn().mockResolvedValue({
      id: 234,
      projectId: 4,
      egressId: "EG_TEST_1",
      recordingStatus: "COMPLETED",
      recordingFileId: 999,
      recordingEnabled: true,
    }),
    getRecordingPlaybackUrl: vi.fn().mockResolvedValue({
      url: null,
      provider: null,
      requiresAuthHeader: false,
      recordingStatus: "IDLE",
      backupStorageUsed: false,
      recordingError: null,
    }),
    presignFallbackUpload: vi.fn().mockResolvedValue({
      uploadUrl: "https://s3.us-east-005.backblazeb2.com/taskpilot-recordings-2026/recordings/4/234/test.webm",
      uploadToken: "signed-upload-token",
      contentType: "video/webm",
      fileName: "meeting_234_fallback.webm",
      maxFileSizeBytes: 1073741824,
      expiresAt: new Date(Date.now() + 1200_000).toISOString(),
    }),
    completeFallbackUpload: vi.fn().mockResolvedValue({
      id: 234,
      projectId: 4,
      recordingFileId: 1001,
      recordingStatus: "COMPLETED",
      recordingEnabled: true,
    }),
    uploadFallbackRecordingToB2: vi.fn().mockResolvedValue({
      id: 234,
      projectId: 4,
      recordingFileId: 1001,
      recordingStatus: "COMPLETED",
      recordingEnabled: true,
    }),
  },
}));

vi.mock("@/services/project-files.service", () => ({
  projectFilesService: {
    getFiles: vi.fn().mockResolvedValue({
      status: 200,
      message: "Success",
      data: { content: [], totalElements: 0, totalPages: 0, size: 50, number: 0 },
    }),
    uploadFile: vi.fn().mockResolvedValue({ data: { id: 999 } }),
    downloadFileBlob: vi.fn().mockResolvedValue(new Blob(["server video"], { type: "video/webm" })),
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
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-video");
    globalThis.URL.revokeObjectURL = vi.fn();
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

    it("downloads and plays server-side linked recordingFileId when local store is empty", async () => {
      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={{ ...mockEndedMeeting, recordingFileId: 999 }}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(projectFilesService.downloadFileBlob).toHaveBeenCalledWith(4, 999);
        expect(screen.getByTestId("recording-video-player")).toBeInTheDocument();
      });
    });

    it("plays direct Backblaze B2 presigned URL returned by playback-url endpoint", async () => {
      vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValueOnce({
        url: "https://s3.us-east-005.backblazeb2.com/taskpilot-recordings-2026/recordings/meeting.mp4?X-Amz-Signature=abc",
        provider: "b2",
        requiresAuthHeader: false,
        contentType: "video/mp4",
        fileName: "meeting-234.mp4",
        fileSize: 102400,
        recordingFileId: 777,
        egressId: "EG_B2_1",
        recordingStatus: "COMPLETED",
        backupStorageUsed: false,
      });

      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={{ ...mockEndedMeeting, recordingFileId: 777, recordingStatus: "COMPLETED" }}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        const video = screen.getByTestId("recording-video-player") as HTMLVideoElement;
        expect(video).toBeInTheDocument();
        expect(video.getAttribute("src")).toContain("backblazeb2.com");
      });
    });

    it("shows LiveKit backup storage warning clearly when backupStorageUsed is true", async () => {
      vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValueOnce({
        url: null,
        provider: null,
        requiresAuthHeader: false,
        egressId: "EG_BACKUP_99",
        recordingStatus: "FAILED",
        backupStorageUsed: true,
        recordingError: "Primary S3 upload failed",
      });

      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={{ ...mockEndedMeeting, egressId: "EG_BACKUP_99", recordingStatus: "FAILED", backupStorageUsed: true }}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recording-backup-storage-alert")).toBeInTheDocument();
        expect(screen.getByText(/kho dự phòng LiveKit/i)).toBeInTheDocument();
        expect(screen.getByText(/EG_BACKUP_99/)).toBeInTheDocument();
      });
    });

    it("shows processing state with manual sync button when Egress is PROCESSING", async () => {
      vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValueOnce({
        url: null,
        provider: null,
        requiresAuthHeader: false,
        egressId: "EG_PROC_1",
        recordingStatus: "PROCESSING",
        backupStorageUsed: false,
      });

      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={{ ...mockEndedMeeting, egressId: "EG_PROC_1", recordingStatus: "PROCESSING" }}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recording-processing-view")).toBeInTheDocument();
        expect(screen.getByTestId("sync-recording-btn")).toBeInTheDocument();
      });
    });

    it("does NOT silently fall back to 50MB projectFilesService when B2 presigned custom upload fails", async () => {
      vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValueOnce({
        url: null,
        provider: null,
        requiresAuthHeader: false,
        egressId: null,
        recordingStatus: "FAILED",
        backupStorageUsed: false,
        recordingError: "Egress failed",
      });
      vi.mocked(meetingService.uploadFallbackRecordingToB2).mockRejectedValueOnce(new Error("B2 unavailable"));

      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={{ ...mockEndedMeeting, recordingStatus: "FAILED" }}
          />
        </ConfirmProvider>
      );

      const input = await screen.findByTestId("custom-recording-upload-input");
      const file = new File(["video-bytes"], "demo.mp4", { type: "video/mp4" });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalled();
      });
      expect(projectFilesService.uploadFile).not.toHaveBeenCalled();
    });

    it("plays local IndexedDB fallback recording even when server recordingStatus is FAILED", async () => {
      const fallbackBlob = new Blob(["local-fallback-webm-bytes"], { type: "video/webm" });
      await meetingRecordingStore.saveRecording(234, fallbackBlob, {
        title: "Sprint Review Session",
        projectId: 4,
        durationSeconds: 90,
      });

      vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValueOnce({
        url: null,
        provider: null,
        requiresAuthHeader: false,
        egressId: "EG_FAIL_1",
        recordingStatus: "FAILED",
        backupStorageUsed: false,
        recordingError: "Cloud egress failed",
      });

      render(
        <ConfirmProvider>
          <MeetingRecordingModal
            isOpen={true}
            onClose={vi.fn()}
            meeting={{ ...mockEndedMeeting, recordingStatus: "FAILED" }}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recording-video-player")).toBeInTheDocument();
        expect(screen.getByTestId("local-fallback-recording-badge")).toBeInTheDocument();
        expect(screen.getByTestId("retry-local-b2-upload-btn")).toBeInTheDocument();
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

    it("starts and stops cloud Egress recording when toggling the record button", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
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
        meeting: { ...mockEndedMeeting, status: "ACTIVE", recordingStatus: "IDLE" },
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

      const recBtn = await screen.findByTestId("toggle-recording-btn");
      fireEvent.click(recBtn);

      await waitFor(() => {
        expect(meetingService.startRecording).toHaveBeenCalledWith(4, 234);
      });

      fireEvent.click(recBtn);

      await waitFor(() => {
        expect(meetingService.stopRecording).toHaveBeenCalledWith(4, 234);
      });
    });

    it("falls back to browser MediaRecorder with explicit fallback badge and B2 presigned upload when Egress start fails", async () => {
      const stopTrack = vi.fn();
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
          getDisplayMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: stopTrack }],
            getVideoTracks: () => [{ onended: null, stop: stopTrack }],
          }),
        },
      });

      class MockMediaRecorder {
        state = "inactive";
        mimeType = "video/webm";
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        static isTypeSupported = () => true;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          this.ondataavailable?.({ data: new Blob(["fallback-video-bytes"], { type: "video/webm" }) });
          this.onstop?.();
        }
      }
      (globalThis as any).MediaRecorder = MockMediaRecorder;

      vi.mocked(meetingService.startRecording).mockRejectedValueOnce(new Error("LiveKit Egress unavailable"));
      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "mock-token",
        livekitUrl: "wss://mock.livekit.cloud",
        roomName: "tp-proj-4-m-234",
        identity: "user_1",
        participantName: "Admin",
        isHost: true,
        meeting: { ...mockEndedMeeting, status: "ACTIVE", recordingStatus: "IDLE" },
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

      const recBtn = await screen.findByTestId("toggle-recording-btn");
      fireEvent.click(recBtn);

      await waitFor(() => {
        expect(screen.getByTestId("meeting-fallback-recording-badge")).toBeInTheDocument();
        expect(screen.getByText(/chế độ dự phòng/i)).toBeInTheDocument();
      });

      fireEvent.click(recBtn);

      await waitFor(() => {
        expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalledWith(
          4,
          234,
          expect.any(Blob),
          expect.objectContaining({ fileName: expect.stringContaining("meeting_234_fallback_") })
        );
      });
    });

    it("hides recording toggle button for non-host participants", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
        },
      });

      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "mock-token",
        livekitUrl: "wss://mock.livekit.cloud",
        roomName: "tp-proj-4-m-234",
        identity: "user_2",
        participantName: "Member",
        isHost: false,
        meeting: { ...mockEndedMeeting, status: "ACTIVE", isHost: false, recordingStatus: "IDLE" },
      });

      render(
        <ConfirmProvider>
          <LiveMeetingRoom
            projectId={4}
            meetingId={234}
            currentUserId={2}
            onLeave={vi.fn()}
          />
        </ConfirmProvider>
      );

      await screen.findByTestId("toggle-screen-share-btn");
      expect(screen.queryByTestId("toggle-recording-btn")).not.toBeInTheDocument();
    });

    it("does NOT start Tier 3 browser fallback on 409 Conflict (cloud recording already active)", async () => {
      const getDisplayMediaMock = vi.fn();
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
          getDisplayMedia: getDisplayMediaMock,
        },
      });

      vi.mocked(meetingService.startRecording).mockRejectedValueOnce({
        response: { status: 409, data: { message: "Recording already in progress" } },
      });
      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "mock-token",
        livekitUrl: "wss://mock.livekit.cloud",
        roomName: "tp-proj-4-m-234",
        identity: "user_1",
        participantName: "Admin",
        isHost: true,
        meeting: { ...mockEndedMeeting, status: "ACTIVE", recordingStatus: "IDLE" },
      });

      render(
        <ConfirmProvider>
          <LiveMeetingRoom
            projectId={4}
            meetingId={234}
            currentUserId={1}
            onLeave={vi.fn()}
          />
        </ConfirmProvider>
      );

      const recBtn = await screen.findByTestId("toggle-recording-btn");
      fireEvent.click(recBtn);

      await waitFor(() => {
        expect(meetingService.startRecording).toHaveBeenCalledWith(4, 234);
      });
      expect(getDisplayMediaMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId("meeting-fallback-recording-badge")).not.toBeInTheDocument();
    });

    it("awaits async MediaRecorder.stop() -> onstop -> B2 upload before calling onLeave", async () => {
      const stopTrack = vi.fn();
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
          getDisplayMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: stopTrack }],
            getVideoTracks: () => [{ addEventListener: vi.fn(), removeEventListener: vi.fn(), stop: stopTrack }],
          }),
        },
      });

      // Realistic ASYNC MediaRecorder: onstop fires asynchronously after stop() returns
      class AsyncMockMediaRecorder {
        state = "inactive";
        mimeType = "video/webm";
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        static isTypeSupported = () => true;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          setTimeout(() => {
            this.ondataavailable?.({ data: new Blob(["async-fallback-bytes"], { type: "video/webm" }) });
            this.onstop?.();
          }, 30);
        }
      }
      (globalThis as any).MediaRecorder = AsyncMockMediaRecorder;

      let resolveUpload!: (v: any) => void;
      const uploadPromise = new Promise<any>((res) => {
        resolveUpload = res;
      });
      vi.mocked(meetingService.startRecording).mockRejectedValueOnce(new Error("Egress down"));
      vi.mocked(meetingService.uploadFallbackRecordingToB2).mockReturnValueOnce(uploadPromise);
      vi.mocked(meetingService.leaveMeeting).mockResolvedValueOnce(undefined);
      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "mock-token",
        livekitUrl: "wss://mock.livekit.cloud",
        roomName: "tp-proj-4-m-234",
        identity: "user_1",
        participantName: "Admin",
        isHost: true,
        meeting: { ...mockEndedMeeting, status: "ACTIVE", recordingStatus: "IDLE" },
      });

      const onLeave = vi.fn();
      render(
        <ConfirmProvider>
          <LiveMeetingRoom
            projectId={4}
            meetingId={234}
            currentUserId={1}
            onLeave={onLeave}
          />
        </ConfirmProvider>
      );

      const recBtn = await screen.findByTestId("toggle-recording-btn");
      fireEvent.click(recBtn);
      await screen.findByTestId("meeting-fallback-recording-badge");

      // Click Leave while fallback recording is still active
      fireEvent.click(screen.getByTestId("leave-meeting-btn"));

      // Wait until uploadFallbackRecordingToB2 has been invoked asynchronously after onstop
      await waitFor(() => {
        expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalledTimes(1);
      });
      // onLeave MUST NOT have fired yet while upload is still in flight
      expect(onLeave).not.toHaveBeenCalled();

      // Now complete the B2 upload -> onLeave fires right after
      resolveUpload({ ...mockEndedMeeting, recordingFileId: 1002, recordingStatus: "COMPLETED" });
      await waitFor(() => {
        expect(onLeave).toHaveBeenCalledTimes(1);
      });
    });
  });
});
