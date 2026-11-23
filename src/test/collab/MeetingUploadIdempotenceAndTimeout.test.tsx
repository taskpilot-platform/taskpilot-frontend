import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Room, RoomEvent } from "livekit-client";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { MeetingRecordingModal } from "@/components/meetings/MeetingRecordingModal";
import { bumpSessionGeneration } from "@/lib/http";
import { meetingService } from "@/services/meeting.service";
import { meetingRecordingStore, type MeetingRecordingUploadReceipt } from "@/services/meetingRecordingStore";
import type { ProjectMeetingDto } from "@/types/meeting";

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

  constructor() {
    DeferredMediaRecorder.latest = this;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
  }

  emitFinalAndStop(payload = "recorded bytes") {
    this.ondataavailable?.({ data: new Blob([payload], { type: "video/mp4" }) });
    this.onstop?.();
  }
}

interface StubTrack {
  kind: string;
  readyState: string;
  enabled: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

class StubMediaStream {
  tracks: StubTrack[];
  constructor(tracks: StubTrack[] = []) {
    this.tracks = tracks;
  }
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

const activeMeeting: ProjectMeetingDto = {
  id: 301,
  projectId: 4,
  hostId: 1,
  hostName: "Admin",
  title: "F4/F5 Sync",
  roomName: "tp-proj-4-m-301",
  status: "ACTIVE",
  recordingEnabled: true,
  recordingStatus: "IDLE",
  startedAt: new Date().toISOString(),
  activeParticipantsCount: 1,
  totalParticipantsCount: 1,
  isHost: true,
};

describe("F4 & F5 — Logical-clip upload idempotence and bounded stalled PUT handling", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    DeferredMediaRecorder.latest = null;
    vi.stubGlobal("MediaRecorder", DeferredMediaRecorder);
    vi.stubGlobal("MediaStream", StubMediaStream);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/f4f5");
    globalThis.URL.revokeObjectURL = vi.fn();

    const track: StubTrack = {
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
    vi.mocked(meetingRecordingStore.save).mockResolvedValue("ok" as IDBValidKey);
    vi.mocked(meetingRecordingStore.appendChunk).mockResolvedValue("ok" as IDBValidKey);
    vi.mocked(meetingRecordingStore.clearChunks).mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("F4-1: persists upload receipt after PUT and replays completeFallbackUpload without a second PUT after lost response", async () => {
    const presignSpy = vi.spyOn(meetingService, "presignFallbackUpload").mockResolvedValue({
      uploadUrl: "https://b2.example/put-1",
      uploadToken: "tok-logical-1",
      contentType: "video/webm",
      fileName: "clip.webm",
      maxFileSizeBytes: 50 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const completeSpy = vi
      .spyOn(meetingService, "completeFallbackUpload")
      .mockRejectedValueOnce(new Error("Network dropped after server commit"))
      .mockResolvedValueOnce({ ...activeMeeting, recordingFileId: 901, recordingStatus: "COMPLETED" });

    let savedReceipt: MeetingRecordingUploadReceipt | undefined;
    const blob = new Blob(["clip bytes"], { type: "video/webm" });

    await expect(
      meetingService.uploadFallbackRecordingToB2(4, 301, blob, {
        fileName: "clip.webm",
        durationSeconds: 12,
        origin: "BROWSER",
        coverage: "SCREEN_ONLY",
        clientRecordingId: "logical-rec-1",
        onUploadReceipt: (receipt) => {
          savedReceipt = receipt;
        },
      })
    ).rejects.toThrow("Network dropped");

    expect(savedReceipt?.uploaded).toBe(true);
    expect(savedReceipt?.uploadToken).toBe("tok-logical-1");
    expect(presignSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Retry with persisted receipt must NOT re-presign or perform a second PUT.
    const retried = await meetingService.uploadFallbackRecordingToB2(4, 301, blob, {
      fileName: "clip.webm",
      durationSeconds: 12,
      origin: "BROWSER",
      coverage: "SCREEN_ONLY",
      clientRecordingId: "logical-rec-1",
      pendingUpload: savedReceipt,
      onUploadReceipt: (receipt) => {
        savedReceipt = receipt;
      },
    });

    expect(retried.recordingFileId).toBe(901);
    expect(presignSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledTimes(2);
    expect(completeSpy).toHaveBeenNthCalledWith(
      2,
      4,
      301,
      expect.objectContaining({ uploadToken: "tok-logical-1", clientRecordingId: "logical-rec-1" })
    );
    expect(savedReceipt).toBeUndefined();
  });

  it("F4-2: skips PUT when server presign reports the logical clip was already committed", async () => {
    vi.spyOn(meetingService, "presignFallbackUpload").mockResolvedValue({
      alreadyCompleted: true,
      existingFileId: 944,
      contentType: "video/webm",
      fileName: "clip.webm",
      maxFileSizeBytes: 50 * 1024 * 1024,
    });
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const completeSpy = vi.spyOn(meetingService, "completeFallbackUpload");
    vi.spyOn(meetingService, "getMeetingById").mockResolvedValue({
      ...activeMeeting,
      recordingFileId: 944,
      recordingStatus: "COMPLETED",
    });

    const result = await meetingService.uploadFallbackRecordingToB2(
      4,
      301,
      new Blob(["clip bytes"], { type: "video/webm" }),
      { clientRecordingId: "logical-rec-already-done" }
    );

    expect(result.recordingFileId).toBe(944);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(completeSpy).not.toHaveBeenCalled();
  });

  it("F5-1: aborts never-settling PUT when putTimeoutMs expires or caller signal aborts", async () => {
    vi.spyOn(meetingService, "presignFallbackUpload").mockResolvedValue({
      uploadUrl: "https://b2.example/put-stalled",
      uploadToken: "tok-stalled",
      contentType: "video/webm",
      fileName: "stalled.webm",
      maxFileSizeBytes: 50 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });

    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }) as typeof fetch;

    await expect(
      meetingService.uploadFallbackRecordingToB2(4, 301, new Blob(["bytes"], { type: "video/webm" }), {
        putTimeoutMs: 40,
      })
    ).rejects.toThrow();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("F5-2: unblocks Retry/Leave on a durable clip when B2 PUT stalls, aborts the hung PUT cleanly, and keeps clip LOCAL_ONLY", async () => {
    const joinSpy = vi.spyOn(meetingService, "joinMeeting").mockResolvedValue({
      token: "isolated-sdk-fixture-f5",
      livekitUrl: "wss://livekit.invalid",
      roomName: activeMeeting.roomName,
      identity: "user_1",
      participantName: "Admin",
      isHost: true,
      meeting: activeMeeting,
    });
    vi.spyOn(meetingService, "confirmAttendance").mockResolvedValue({} as never);
    vi.spyOn(meetingService, "startRecording").mockRejectedValue({ response: { status: 503 } });
    vi.spyOn(meetingService, "leaveMeeting").mockResolvedValue(undefined);
    vi.spyOn(meetingService, "presignFallbackUpload").mockResolvedValue({
      uploadUrl: "https://b2.example/put-never-settles",
      uploadToken: "tok-never-settles",
      contentType: "video/mp4",
      fileName: "stalled.mp4",
      maxFileSizeBytes: 50 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });

    let putSignal: AbortSignal | undefined;
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      putSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        putSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }) as typeof fetch;

    const onSpy = vi.spyOn(Room.prototype, "on");
    render(
      <ConfirmProvider>
        <LiveMeetingRoom projectId={4} meetingId={301} currentUserId={1} onLeave={vi.fn()} />
      </ConfirmProvider>
    );

    fireEvent.click(await screen.findByTestId("toggle-recording-btn"));
    fireEvent.click(await screen.findByText("Chỉ ghi hình"));
    await screen.findByTestId("meeting-fallback-recording-badge");

    const disconnectHandler = onSpy.mock.calls.find(([event]) => event === RoomEvent.Disconnected)?.[1] as
      | (() => void)
      | undefined;
    act(() => {
      disconnectHandler!();
    });
    expect(await screen.findByTestId("meeting-connection-error")).toBeInTheDocument();

    // Finalize durably into IndexedDB, then PUT hangs forever.
    await act(async () => {
      DeferredMediaRecorder.latest!.emitFinalAndStop();
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    // Clicking Retry MUST unblock once durable persistence is complete by aborting the hung PUT cleanly.
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/i }));

    await waitFor(
      () => {
        expect(putSignal?.aborted).toBe(true);
        expect(joinSpy).toHaveBeenCalledTimes(2);
      },
      { timeout: 4000 }
    );
    const savedStates = vi.mocked(meetingRecordingStore.save).mock.calls.map(([record]) => record.uploadState);
    expect(savedStates).not.toContain("READY");
    expect(savedStates).toContain("LOCAL_ONLY");
  });

  it("F4-B: A(44) -> B(55) -> retry A via alreadyCompleted returns receipt fileId=44 while keeping meeting latest=55", async () => {
    vi.spyOn(meetingService, "presignFallbackUpload").mockResolvedValue({
      alreadyCompleted: true,
      existingFileId: 44,
      contentType: "video/webm",
      fileName: "clip-a.webm",
      maxFileSizeBytes: 50 * 1024 * 1024,
    });
    vi.spyOn(meetingService, "getMeetingById").mockResolvedValue({
      ...activeMeeting,
      recordingFileId: 55,
      recordingStatus: "COMPLETED",
    });
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await meetingService.uploadFallbackRecordingToB2(
      4,
      301,
      new Blob(["clip A bytes"], { type: "video/webm" }),
      { clientRecordingId: "clip-A-id" }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.recordingFileId).toBe(55);
    expect(result.completedRecordingFileId).toBe(44);

    // Verify MeetingRecordingModal persists local clip A with fileId=44 (NOT latest=55).
    vi.mocked(meetingRecordingStore.list).mockResolvedValue([
      {
        userId: 1,
        projectId: 4,
        meetingId: 301,
        recordingId: "clip-A-id",
        title: "F4/F5 Sync",
        mimeType: "video/webm",
        recordedAt: "2026-11-23T10:00:00Z",
        origin: "BROWSER",
        coverage: "SCREEN_ONLY",
        uploadState: "LOCAL_ONLY",
        uploadTarget: "B2",
        blob: new Blob(["clip A bytes"], { type: "video/webm" }),
      },
    ]);
    vi.spyOn(meetingService, "getRecordings").mockResolvedValue([]);
    vi.spyOn(meetingService, "getRecordingPlaybackUrl").mockResolvedValue({
      url: null,
      provider: null,
      requiresAuthHeader: false,
      recordingFileId: null,
      recordingStatus: "COMPLETED",
      backupStorageUsed: false,
    });

    const onMeetingUpdated = vi.fn();
    render(
      <ConfirmProvider>
        <MeetingRecordingModal
          isOpen
          onClose={vi.fn()}
          meeting={{ ...activeMeeting, recordingFileId: 55, recordingStatus: "COMPLETED" }}
          currentUserId={1}
          onMeetingUpdated={onMeetingUpdated}
        />
      </ConfirmProvider>
    );

    const selector = await screen.findByRole("combobox", { name: /Chọn bản ghi|Choose recording/i });
    fireEvent.change(selector, { target: { value: "clip-A-id" } });
    fireEvent.click(await screen.findByRole("button", { name: /Thử tải lên lại|Retry upload/i }));

    await waitFor(() => {
      expect(meetingRecordingStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recordingId: "clip-A-id",
          uploadState: "READY",
          fileId: 44,
        })
      );
    });
    expect(onMeetingUpdated).toHaveBeenCalledWith(expect.objectContaining({ recordingFileId: 55 }));
  });

  it("F4-C: immediate Retry inside the same open MeetingRecordingModal reuses saved receipt with a single PUT", async () => {
    const localRecord = {
      userId: 1,
      projectId: 4,
      meetingId: 301,
      recordingId: "clip-modal-retry-1",
      title: "F4/F5 Sync",
      mimeType: "video/webm",
      recordedAt: "2026-11-23T10:05:00Z",
      origin: "BROWSER" as const,
      coverage: "SCREEN_ONLY",
      uploadState: "LOCAL_ONLY" as const,
      uploadTarget: "B2" as const,
      blob: new Blob(["modal clip bytes"], { type: "video/webm" }),
    };
    vi.mocked(meetingRecordingStore.list).mockResolvedValue([localRecord]);
    vi.spyOn(meetingService, "getRecordings").mockResolvedValue([]);
    vi.spyOn(meetingService, "getRecordingPlaybackUrl").mockResolvedValue({
      url: null,
      provider: null,
      requiresAuthHeader: false,
      recordingFileId: null,
      recordingStatus: "IDLE",
      backupStorageUsed: false,
    });

    const presignSpy = vi.spyOn(meetingService, "presignFallbackUpload").mockResolvedValue({
      uploadUrl: "https://b2.example/put-modal-1",
      uploadToken: "tok-modal-reuse-1",
      contentType: "video/webm",
      fileName: "modal.webm",
      maxFileSizeBytes: 50 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const completeSpy = vi
      .spyOn(meetingService, "completeFallbackUpload")
      .mockRejectedValueOnce(new Error("Ambiguous network drop after commit"))
      .mockResolvedValueOnce({
        ...activeMeeting,
        recordingFileId: 777,
        completedRecordingFileId: 777,
        recordingStatus: "COMPLETED",
      });

    render(
      <ConfirmProvider>
        <MeetingRecordingModal isOpen onClose={vi.fn()} meeting={activeMeeting} currentUserId={1} />
      </ConfirmProvider>
    );

    const retryButton = await screen.findByRole("button", { name: /Thử tải lên lại|Retry upload/i });
    // Attempt 1: presign + PUT succeed, complete drops response ambiguously.
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(retryButton).not.toBeDisabled();
    });

    // Attempt 2: click Retry IMMEDIATELY in the SAME open modal -> MUST replay tok-modal-reuse-1 with ZERO second PUT.
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledTimes(2);
    });

    expect(presignSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenNthCalledWith(
      2,
      4,
      301,
      expect.objectContaining({ uploadToken: "tok-modal-reuse-1", clientRecordingId: "clip-modal-retry-1" })
    );
  });

  it("F4-P2: delayed receipt read followed by session/account switch aborts cleanly with zero presign/PUT/complete", async () => {
    const creatorARecord = {
      userId: 1,
      projectId: 4,
      meetingId: 301,
      recordingId: "clip-creator-a-only",
      title: "F4/F5 Sync",
      mimeType: "video/webm",
      recordedAt: "2026-11-23T10:05:00Z",
      origin: "BROWSER" as const,
      coverage: "SCREEN_ONLY",
      uploadState: "LOCAL_ONLY" as const,
      uploadTarget: "B2" as const,
      blob: new Blob(["creator A private bytes"], { type: "video/webm" }),
    };

    let resolveDelayedList!: (records: typeof creatorARecord[]) => void;
    vi.mocked(meetingRecordingStore.list)
      .mockResolvedValueOnce([creatorARecord])
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveDelayedList = resolve; })
      )
      .mockResolvedValue([]);
    vi.spyOn(meetingService, "getRecordings").mockResolvedValue([]);
    vi.spyOn(meetingService, "getRecordingPlaybackUrl").mockResolvedValue({
      url: null,
      provider: null,
      requiresAuthHeader: false,
      recordingFileId: null,
      recordingStatus: "IDLE",
      backupStorageUsed: false,
    });

    const presignSpy = vi.spyOn(meetingService, "presignFallbackUpload");
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const completeSpy = vi.spyOn(meetingService, "completeFallbackUpload");

    const { rerender } = render(
      <ConfirmProvider>
        <MeetingRecordingModal isOpen onClose={vi.fn()} meeting={activeMeeting} currentUserId={1} />
      </ConfirmProvider>
    );

    const retryButton = await screen.findByRole("button", { name: /Thử tải lên lại|Retry upload/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(resolveDelayedList).toBeDefined();
    });

    // Session switches to account 2 while creator A's receipt read is still pending.
    bumpSessionGeneration();
    rerender(
      <ConfirmProvider>
        <MeetingRecordingModal isOpen onClose={vi.fn()} meeting={activeMeeting} currentUserId={2} />
      </ConfirmProvider>
    );

    await act(async () => {
      resolveDelayedList([creatorARecord]);
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(presignSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(completeSpy).not.toHaveBeenCalled();
  });
});
