import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Room, RoomEvent } from "livekit-client";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { bumpSessionGeneration } from "@/lib/http";
import { meetingService } from "@/services/meeting.service";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";

vi.mock("livekit-client", () => import("../../../e2e/helpers/livekit-sdk-stub"));

vi.mock("@/services/meetingRecordingStore", () => ({
  meetingRecordingStore: {
    save: vi.fn(),
    appendChunk: vi.fn(),
    clearChunks: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    recoverChunks: vi.fn(),
  },
}));

vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    joinMeeting: vi.fn(),
    confirmAttendance: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    getMeetingById: vi.fn(),
    uploadFallbackRecordingToB2: vi.fn(),
    leaveMeeting: vi.fn(),
    endMeeting: vi.fn(),
  },
}));

class DeferredMediaRecorder {
  static latest: DeferredMediaRecorder | null = null;
  static isTypeSupported(type: string) {
    return type === "video/mp4";
  }

  mimeType = "video/mp4";
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  stopCalls = 0;

  constructor() {
    DeferredMediaRecorder.latest = this;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.stopCalls += 1;
    this.state = "inactive";
  }

  emitFinalAndStop(payload = "final recorded video bytes") {
    this.ondataavailable?.({ data: new Blob([payload], { type: "video/mp4" }) });
    this.onstop?.();
  }
}

class StubMediaStream {
  constructor(public tracks: any[] = []) {}
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === "video");
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === "audio");
  }
}

const activeMeeting = {
  id: 234,
  projectId: 4,
  hostId: 1,
  hostName: "Admin",
  title: "Sprint Sync",
  roomName: "tp-proj-4-m-234",
  status: "ACTIVE" as const,
  recordingEnabled: true,
  recordingStatus: "IDLE" as const,
  startedAt: new Date().toISOString(),
  activeParticipantsCount: 1,
  totalParticipantsCount: 1,
  isHost: true,
};

function setupFallbackRecordingEnvironment() {
  DeferredMediaRecorder.latest = null;
  vi.stubGlobal("MediaRecorder", DeferredMediaRecorder);
  vi.stubGlobal("MediaStream", StubMediaStream);

  const track = {
    kind: "video",
    readyState: "live",
    enabled: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    stop: vi.fn(),
  };

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getDisplayMedia: vi.fn().mockResolvedValue({
        getVideoTracks: () => [track],
        getAudioTracks: () => [],
        getTracks: () => [track],
      }),
    },
  });

  vi.mocked(meetingService.joinMeeting).mockResolvedValue({
    token: "isolated-sdk-fixture-r1",
    livekitUrl: "wss://livekit.invalid",
    roomName: activeMeeting.roomName,
    identity: "user_1",
    participantName: "Admin",
    isHost: true,
    meeting: activeMeeting,
  });
  vi.mocked(meetingService.confirmAttendance).mockResolvedValue({} as any);
  vi.mocked(meetingService.startRecording).mockRejectedValue({ response: { status: 503 } });
  vi.mocked(meetingService.getMeetingById).mockResolvedValue(activeMeeting);
  vi.mocked(meetingService.leaveMeeting).mockResolvedValue(undefined);
  vi.mocked(meetingRecordingStore.save).mockResolvedValue("ok" as any);
  vi.mocked(meetingRecordingStore.appendChunk).mockResolvedValue("ok" as any);
  vi.mocked(meetingRecordingStore.clearChunks).mockResolvedValue(undefined as any);
}

async function startFallbackAndDisconnect(onLeave = vi.fn()) {
  const onSpy = vi.spyOn(Room.prototype, "on");
  const rendered = render(
    <ConfirmProvider>
      <LiveMeetingRoom projectId={4} meetingId={234} currentUserId={1} onLeave={onLeave} />
    </ConfirmProvider>
  );

  fireEvent.click(await screen.findByTestId("toggle-recording-btn"));
  fireEvent.click(await screen.findByText("Chỉ ghi hình"));
  await screen.findByTestId("meeting-fallback-recording-badge");
  expect(DeferredMediaRecorder.latest).not.toBeNull();

  const disconnectHandler = onSpy.mock.calls.find(([event]) => event === RoomEvent.Disconnected)?.[1] as
    | (() => void)
    | undefined;
  expect(disconnectHandler).toBeDefined();

  act(() => {
    disconnectHandler!();
  });
  expect(await screen.findByTestId("meeting-connection-error")).toBeInTheDocument();
  return { rendered, onSpy };
}

describe("LiveMeetingRoom R1 — Retry & finalization barrier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFallbackRecordingEnvironment();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/r1-export");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("1. keeps export path and does not swap rooms before non-durable capture finishes on Retry", async () => {
    vi.mocked(meetingRecordingStore.save).mockRejectedValue(new Error("QuotaExceededError"));
    vi.mocked(meetingRecordingStore.appendChunk).mockRejectedValue(new Error("QuotaExceededError"));
    vi.mocked(meetingService.uploadFallbackRecordingToB2).mockRejectedValue(new Error("Offline during disconnect"));

    await startFallbackAndDisconnect();

    // User clicks Retry before MediaRecorder finishes emitting final data.
    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    // Must NOT start a second joinMeeting while fallback recording is still finalizing.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(meetingService.joinMeeting).toHaveBeenCalledTimes(1);

    // Now MediaRecorder emits final data while IndexedDB storage fails AND upload fails.
    await act(async () => {
      DeferredMediaRecorder.latest!.emitFinalAndStop();
      await new Promise((r) => setTimeout(r, 50));
    });

    // Because storage was not durable and upload failed, export UI MUST stay visible and Retry must NOT drop the blob.
    expect(await screen.findByText(/Hãy tải video xuống trước khi rời phòng/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tải video/i })).toBeInTheDocument();
    expect(meetingService.joinMeeting).toHaveBeenCalledTimes(1);
  });

  it("2. waits for durable persistence then completes Retry cleanly when storage succeeds", async () => {
    vi.mocked(meetingService.uploadFallbackRecordingToB2).mockResolvedValue({
      ...activeMeeting,
      recordingFileId: 701,
      recordingStatus: "COMPLETED",
    });

    await startFallbackAndDisconnect();

    // Click Retry before final MediaRecorder stop completes.
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(meetingService.joinMeeting).toHaveBeenCalledTimes(1);

    // Finalize completes durably + uploads to B2 -> Retry proceeds cleanly.
    await act(async () => {
      DeferredMediaRecorder.latest!.emitFinalAndStop();
    });

    await waitFor(() => {
      expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalledTimes(1);
      expect(meetingService.joinMeeting).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByTestId("toggle-recording-btn")).toBeInTheDocument();
  });

  it("3. leaves durable clip LOCAL_ONLY (never READY) when B2 upload fails, keeping Retry unblocked after save", async () => {
    vi.mocked(meetingService.uploadFallbackRecordingToB2).mockRejectedValue(new Error("B2 network failure"));

    await startFallbackAndDisconnect();

    await act(async () => {
      DeferredMediaRecorder.latest!.emitFinalAndStop();
    });

    await waitFor(() => {
      expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalledTimes(1);
    });

    // Must never persist READY when upload failed.
    const savedStates = vi.mocked(meetingRecordingStore.save).mock.calls.map(([record]) => record.uploadState);
    expect(savedStates).not.toContain("READY");
    expect(savedStates).toContain("LOCAL_ONLY");
  });

  it("4. prevents duplicate room joins or duplicate uploads on rapid double Retry and concurrent Leave", async () => {
    let resolveUpload!: (value: any) => void;
    vi.mocked(meetingService.uploadFallbackRecordingToB2).mockImplementation(
      () => new Promise((resolve) => { resolveUpload = resolve; })
    );

    const onLeave = vi.fn();
    await startFallbackAndDisconnect(onLeave);

    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    const leaveBtn = screen.getByTestId("back-to-meetings-btn");

    // Rapid double Retry while finalizing, followed by Leave.
    fireEvent.click(retryBtn);
    fireEvent.click(retryBtn);
    fireEvent.click(leaveBtn);

    await act(async () => {
      DeferredMediaRecorder.latest!.emitFinalAndStop();
    });

    await waitFor(() => {
      expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveUpload({ ...activeMeeting, recordingFileId: 702, recordingStatus: "COMPLETED" });
    });

    await waitFor(() => {
      expect(onLeave).toHaveBeenCalledTimes(1);
    });
    // Because Leave won, Retry must NOT spawn a second room join.
    expect(meetingService.joinMeeting).toHaveBeenCalledTimes(1);
  });

  it("5. does not upload or expose temporary export notice to a new account/session after session generation bumps", async () => {
    vi.mocked(meetingRecordingStore.save).mockRejectedValue(new Error("QuotaExceededError"));
    vi.mocked(meetingRecordingStore.appendChunk).mockRejectedValue(new Error("QuotaExceededError"));

    await startFallbackAndDisconnect();

    // Session switches to another account while finalize is still in flight.
    bumpSessionGeneration();

    await act(async () => {
      DeferredMediaRecorder.latest!.emitFinalAndStop();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(meetingService.uploadFallbackRecordingToB2).not.toHaveBeenCalled();
    expect(screen.queryByText(/Hãy tải video xuống trước khi rời phòng/i)).not.toBeInTheDocument();
  });
});
