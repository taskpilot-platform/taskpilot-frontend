import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import { MeetingRecordingModal } from "@/components/meetings/MeetingRecordingModal";
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { RemoteAudioRenderer } from "@/components/meetings/RemoteAudioRenderer";
import { RoomEvent, Track, type Room } from "livekit-client";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { meetingService } from "@/services/meeting.service";
import { projectFilesService } from "@/services/project-files.service";
import { bumpSessionGeneration } from "@/lib/http";
import { syncMeetingRecording } from "@/services/meetingRecordingSync";
import type { ProjectMeetingDto } from "@/types/meeting";

// Mock services
vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    getRecordings: vi.fn().mockResolvedValue([]),
    joinMeeting: vi.fn(),
    leaveMeeting: vi.fn(),
    endMeeting: vi.fn(),
    updateRecordingFile: vi.fn().mockResolvedValue({}),
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

vi.mock("@/services/meetingRecordingStore", () => ({
  meetingRecordingStore: { list: vi.fn(), recoverChunks: vi.fn(), save: vi.fn() },
}));

vi.mock("@/services/meetingRecordingSync", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/meetingRecordingSync")>(),
  syncMeetingRecording: vi.fn().mockResolvedValue(undefined),
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
    vi.mocked(meetingRecordingStore.list).mockResolvedValue([]);
  });

  describe("MeetingRecordingModal Component", () => {
    it("reports an unavailable recording without showing a sample", async () => {
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
        expect(screen.getByTestId("recording-unavailable")).toBeInTheDocument();
        expect(screen.queryByTestId("recording-video-player")).not.toBeInTheDocument();
        expect(screen.queryByTestId("play-sample-recording-btn")).not.toBeInTheDocument();
      });
    });

    it("uses the account, project, and meeting scope for local-only clips", async () => {
      vi.mocked(meetingRecordingStore.list).mockResolvedValueOnce([{
        userId: 1, projectId: 4, meetingId: 234,
        recordingId: "recording-1", title: "Sprint Review Session", mimeType: "video/webm",
        origin: "BROWSER", coverage: "SCREEN_ONLY", uploadState: "LOCAL_ONLY",
        recordedAt: new Date().toISOString(), blob: new Blob(["local bytes"], { type: "video/webm" }),
      }]);
      render(<MeetingRecordingModal isOpen onClose={vi.fn()} meeting={mockEndedMeeting} currentUserId={1} />);

      expect(await screen.findByTestId("recording-video-player")).toBeInTheDocument();
      expect(meetingRecordingStore.list).toHaveBeenCalledWith({ userId: 1, projectId: 4, meetingId: 234 });
      expect(screen.getByText("Chỉ có trên thiết bị này")).toBeInTheDocument();
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

    it("never uploads a pending local import after an account generation change", async () => {
      let finishWrite!: (key: IDBValidKey) => void;
      vi.mocked(meetingRecordingStore.save).mockImplementationOnce(() =>
        new Promise((resolve) => { finishWrite = resolve; })
      );
      render(<MeetingRecordingModal isOpen onClose={vi.fn()} meeting={mockEndedMeeting} currentUserId={1} />);
      await screen.findByTestId("recording-unavailable");
      const picker = document.querySelector<HTMLInputElement>('input[type="file"]');
      expect(picker).not.toBeNull();
      fireEvent.change(picker!, { target: { files: [new File(["video"], "fixture.webm", { type: "video/webm" })] } });
      await waitFor(() => expect(meetingRecordingStore.save).toHaveBeenCalledOnce());

      bumpSessionGeneration();
      await act(async () => { finishWrite("local-owner-1"); });
      expect(syncMeetingRecording).not.toHaveBeenCalled();
    });

    it("honors denied server access without offering local playback", async () => {
      vi.mocked(projectFilesService.downloadFileBlob).mockRejectedValueOnce({ status: 403 });
      render(<MeetingRecordingModal isOpen onClose={vi.fn()} meeting={{ ...mockEndedMeeting, recordingFileId: 999 }} />);

      expect(await screen.findByTestId("recording-denied")).toBeInTheDocument();
      expect(screen.queryByTestId("recording-video-player")).not.toBeInTheDocument();
    });
  });

  describe("ProjectMeetingsTab Integration", () => {
    it("renders Watch Recording for a genuinely linked file", async () => {
      vi.mocked(meetingService.getMeetings).mockResolvedValue([{ ...mockEndedMeeting, recordingFileId: 999 }]);

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
        expect(screen.getByTestId("recording-video-player")).toBeInTheDocument();
      });
    });
  });

  it("plays a camera-off participant's microphone once and detaches it after unsubscribe", async () => {
    const listeners = new Map<string, () => void>();
    const microphone = { kind: Track.Kind.Audio, attach: vi.fn(), detach: vi.fn() };
    const audioPublications = new Map([["mic-77", {
      trackSid: "mic-77", isSubscribed: true, track: microphone,
    }]]);
    const room = {
      canPlaybackAudio: false,
      remoteParticipants: new Map([["user_77", { audioTrackPublications: audioPublications }]]),
      on: (event: string, listener: () => void) => { listeners.set(event, listener); },
      off: (event: string) => { listeners.delete(event); },
      startAudio: vi.fn(async () => { room.canPlaybackAudio = true; }),
    };
    const { unmount } = render(<RemoteAudioRenderer room={room as unknown as Room} />);
    expect(microphone.attach).toHaveBeenCalledTimes(1);
    listeners.get(RoomEvent.Reconnected)?.();
    expect(microphone.attach).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Bật âm thanh cuộc họp" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Bật âm thanh cuộc họp" })).not.toBeInTheDocument());
    expect(room.startAudio).toHaveBeenCalledOnce();

    audioPublications.clear();
    listeners.get(RoomEvent.TrackUnsubscribed)?.();
    expect(microphone.detach).toHaveBeenCalledWith(microphone.attach.mock.calls[0][0]);
    unmount();
    expect(listeners.size).toBe(0);
  });

  describe("LiveMeetingRoom Toolbar & Custom Confirm", () => {
    it("rejects mock room credentials without showing live tools or success", async () => {
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

      expect(await screen.findByTestId("meeting-connection-error")).toBeInTheDocument();
      expect(screen.queryByTestId("toggle-screen-share-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("toggle-recording-btn")).not.toBeInTheDocument();
    });
  });
});
