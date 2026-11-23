/// <reference types="node" />
import "fake-indexeddb/auto";
import { Blob as NativeBlob, File as NativeFile } from "node:buffer";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { meetingRecordingStore, type MeetingRecordingRecord } from "@/services/meetingRecordingStore";
import { MeetingRecordingModal } from "@/components/meetings/MeetingRecordingModal";
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { Room, RoomEvent } from "livekit-client";
import { meetingService } from "@/services/meeting.service";
import { projectFilesService } from "@/services/project-files.service";
import type { ProjectMeetingDto } from "@/types/meeting";

vi.mock("livekit-client", () => import("../../../e2e/helpers/livekit-sdk-stub"));

// Mock services
vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    joinMeeting: vi.fn(),
    confirmAttendance: vi.fn().mockResolvedValue({}),
    getRecordings: vi.fn().mockResolvedValue([]),
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

const localRecord = (blob?: Blob): MeetingRecordingRecord => ({
  userId: 1, projectId: 4, meetingId: 234, recordingId: "fixture-clip",
  recordedAt: new Date().toISOString(), title: "Sprint Review Session",
  origin: "BROWSER", coverage: "SCREEN_SOURCE_AUDIO", uploadState: "LOCAL_ONLY", uploadTarget: "B2",
  mimeType: "video/webm", durationMs: 45000, blob,
});

describe("Meeting Recording and Screen Sharing Features", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("Blob", NativeBlob);
    vi.stubGlobal("File", NativeFile);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-video");
    globalThis.URL.revokeObjectURL = vi.fn();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("taskpilot_recordings_db");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    vi.stubGlobal("MediaStream", class {
      tracks: { kind: string }[];
      constructor(tracks: { kind: string }[] = []) { this.tracks = tracks; }
      getTracks() { return this.tracks; }
      getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
      getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
    });
  });

  describe("meetingRecordingStore", () => {
    it("stores multiple clips with account, project, and meeting isolation", async () => {
      const record = localRecord(new Blob(["mock video data"], { type: "video/webm" }));
      await meetingRecordingStore.save(record);
      await meetingRecordingStore.save({ ...record, recordingId: "another-clip" });
      expect(await meetingRecordingStore.list({ userId: 1, projectId: 4, meetingId: 234 })).toHaveLength(2);
      expect(await meetingRecordingStore.list({ userId: 2, projectId: 4, meetingId: 234 })).toEqual([]);
      expect(await meetingRecordingStore.list({ userId: 1, projectId: 5, meetingId: 234 })).toEqual([]);
      expect(await meetingRecordingStore.list({ userId: 1, projectId: 4, meetingId: 888 })).toEqual([]);
    });

    it("recovers ordered durable chunks without exposing another account's chunks", async () => {
      const record = localRecord();
      await meetingRecordingStore.save(record);
      await meetingRecordingStore.appendChunk(record, 1, new Blob(["second"]));
      await meetingRecordingStore.appendChunk(record, 0, new Blob(["first"]));
      expect((await meetingRecordingStore.recoverChunks(record)).size).toBe(11);
      expect((await meetingRecordingStore.recoverChunks({ ...record, userId: 2 })).size).toBe(0);
      await meetingRecordingStore.clearChunks(record);
      expect((await meetingRecordingStore.recoverChunks(record)).size).toBe(0);
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
            currentUserId={1}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Sprint Review Session")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(
          screen.queryByTestId("recording-video-player") || screen.queryByTestId("recording-unavailable")
        ).toBeInTheDocument();
      });
    });

    it("renders video player when local recording exists", async () => {
      const dummyBlob = new Blob(["mock video data"], { type: "video/webm" });
      await meetingRecordingStore.save(localRecord(dummyBlob));

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
            currentUserId={1}
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
            currentUserId={1}
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
            currentUserId={1}
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
            currentUserId={1}
          />
        </ConfirmProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recording-backup-storage-alert")).toBeInTheDocument();
        expect(screen.getByText(/kho lưu trữ dự phòng.*LiveKit/i)).toBeInTheDocument();
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
            currentUserId={1}
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
            currentUserId={1}
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
      await meetingRecordingStore.save(localRecord(fallbackBlob));

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
            currentUserId={1}
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
          screen.queryByTestId("recording-video-player") || screen.queryByTestId("recording-unavailable")
        ).toBeInTheDocument();
      });
    });
  });

  describe("LiveMeetingRoom Toolbar & Custom Confirm", () => {
    const arrangeLiveRoom = () => vi.mocked(meetingService.joinMeeting).mockResolvedValue({
      token: "isolated-sdk-fixture-edges", livekitUrl: "wss://livekit.invalid", roomName: "fixture",
      identity: "user_1", participantName: "Admin", isHost: true,
      meeting: { ...mockEndedMeeting, status: "ACTIVE", recordingStatus: "IDLE" },
    });
    const liveRoom = (onEndMeeting = vi.fn()) => render(<ConfirmProvider>
      <LiveMeetingRoom projectId={4} meetingId={234} currentUserId={1} onLeave={vi.fn()} onEndMeeting={onEndMeeting} />
    </ConfirmProvider>);

    it("does not confirm attendance or show live controls after an SDK connection failure", async () => {
      arrangeLiveRoom();
      vi.spyOn(Room.prototype, "connect").mockRejectedValueOnce(new Error("connection refused"));
      liveRoom();
      expect(await screen.findByTestId("meeting-connection-error")).toBeInTheDocument();
      expect(meetingService.confirmAttendance).not.toHaveBeenCalled();
      expect(screen.queryByTestId("toggle-recording-btn")).not.toBeInTheDocument();
    });

    it("reconfirms the connected participant SID after reconnect", async () => {
      arrangeLiveRoom();
      const events = vi.spyOn(Room.prototype, "on");
      liveRoom();
      await screen.findByTestId("toggle-recording-btn");
      expect(meetingService.confirmAttendance).toHaveBeenCalledWith(4, 234, "PA_fixture");
      const reconnect = events.mock.calls.find(([event]) => event === RoomEvent.Reconnected)?.[1] as (() => void);
      await act(async () => { reconnect(); });
      await waitFor(() => expect(meetingService.confirmAttendance).toHaveBeenCalledTimes(2));
    });

    it.each([401, 403])("never requests browser capture when Egress rejects with %s", async (status) => {
      arrangeLiveRoom();
      const display = vi.fn();
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, writable: true, value: { getDisplayMedia: display } });
      vi.mocked(meetingService.startRecording).mockRejectedValueOnce({ response: { status } });
      liveRoom();
      fireEvent.click(await screen.findByTestId("toggle-recording-btn"));
      await waitFor(() => expect(meetingService.startRecording).toHaveBeenCalledOnce());
      expect(display).not.toHaveBeenCalled();
    });

    it("honors ENDING while keeping a rejected end request in the room", async () => {
      arrangeLiveRoom();
      vi.mocked(meetingService.endMeeting).mockRejectedValueOnce(new Error("closure unavailable"));
      const onEnd = vi.fn();
      liveRoom(onEnd);
      fireEvent.click(await screen.findByTestId("end-meeting-btn"));
      fireEvent.click(await screen.findByTestId("confirm-action-btn"));
      await waitFor(() => expect(meetingService.endMeeting).toHaveBeenCalledOnce());
      expect(onEnd).not.toHaveBeenCalled();
      expect(screen.getByTestId("toggle-recording-btn")).toBeInTheDocument();
      vi.mocked(meetingService.endMeeting).mockResolvedValueOnce({ ...mockEndedMeeting, status: "ENDING" });
      fireEvent.click(screen.getByTestId("end-meeting-btn"));
      fireEvent.click(await screen.findByTestId("confirm-action-btn"));
      await waitFor(() => expect(onEnd).toHaveBeenCalledOnce());
    });

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
        token: "isolated-sdk-fixture-recording",
        livekitUrl: "wss://livekit.invalid",
        roomName: "tp-proj-4-m-234",
        identity: "user_1",
        participantName: "Admin",
        isHost: true,
        meeting: { ...mockEndedMeeting, status: "ACTIVE" },
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
        token: "isolated-sdk-fixture-recording",
        livekitUrl: "wss://livekit.invalid",
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
            getVideoTracks: () => [{ kind: "video", readyState: "live", addEventListener: vi.fn(), removeEventListener: vi.fn(), stop: stopTrack }],
            getAudioTracks: () => [{ kind: "audio", readyState: "live", stop: stopTrack }],
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
      vi.stubGlobal("MediaRecorder", MockMediaRecorder);

      vi.mocked(meetingService.startRecording).mockRejectedValueOnce(new Error("LiveKit Egress unavailable"));
      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "isolated-sdk-fixture-recording",
        livekitUrl: "wss://livekit.invalid",
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
        token: "isolated-sdk-fixture-recording",
        livekitUrl: "wss://livekit.invalid",
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
        token: "isolated-sdk-fixture-recording",
        livekitUrl: "wss://livekit.invalid",
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
            getVideoTracks: () => [{ kind: "video", readyState: "live", addEventListener: vi.fn(), removeEventListener: vi.fn(), stop: stopTrack }],
            getAudioTracks: () => [{ kind: "audio", readyState: "live", stop: stopTrack }],
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
      vi.stubGlobal("MediaRecorder", AsyncMockMediaRecorder);

      let resolveUpload!: (v: any) => void;
      const uploadPromise = new Promise<any>((res) => {
        resolveUpload = res;
      });
      vi.mocked(meetingService.startRecording).mockRejectedValueOnce(new Error("Egress down"));
      vi.mocked(meetingService.uploadFallbackRecordingToB2).mockReturnValueOnce(uploadPromise);
      vi.mocked(meetingService.leaveMeeting).mockResolvedValueOnce(undefined);
      vi.mocked(meetingService.joinMeeting).mockResolvedValue({
        token: "isolated-sdk-fixture-recording",
        livekitUrl: "wss://livekit.invalid",
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
