import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { MeetingRecordingModal } from "@/components/meetings/MeetingRecordingModal";
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { meetingService } from "@/services/meeting.service";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import { projectFilesService } from "@/services/project-files.service";
import type { ProjectMeetingDto } from "@/types/meeting";

vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    getRecordings: vi.fn(),
    getRecordingPlaybackUrl: vi.fn(),
    uploadFallbackRecordingToB2: vi.fn(),
    syncRecording: vi.fn(),
    joinMeeting: vi.fn(),
    leaveMeeting: vi.fn(),
    endMeeting: vi.fn(),
    updateRecordingFile: vi.fn(),
  },
}));

vi.mock("@/services/project-files.service", () => ({
  projectFilesService: {
    getFiles: vi.fn().mockResolvedValue({ data: { content: [] } }),
    uploadFile: vi.fn(),
    downloadFileBlob: vi.fn(),
  },
}));

vi.mock("@/services/meetingRecordingStore", () => ({
  meetingRecordingStore: {
    list: vi.fn(),
    save: vi.fn(),
    recoverChunks: vi.fn(),
    appendChunk: vi.fn(),
    clearChunks: vi.fn(),
  },
}));

const activeMeeting: ProjectMeetingDto = {
  id: 234,
  projectId: 4,
  hostId: 1,
  hostName: "Host User",
  title: "Architecture Review",
  roomName: "tp-proj-4-m-234",
  status: "ACTIVE",
  recordingEnabled: true,
  recordingFileId: null,
  recordingStatus: "IDLE",
  startedAt: new Date(Date.now() - 120_000).toISOString(),
  activeParticipantsCount: 2,
  totalParticipantsCount: 2,
  isHost: true,
};

const endedMeeting: ProjectMeetingDto = {
  ...activeMeeting,
  status: "ENDED",
  recordingFileId: 702,
  recordingStatus: "COMPLETED",
  endedAt: new Date().toISOString(),
  durationSeconds: 180,
};

describe("R3 & R7 — Multi-clip history and active meeting recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/r3-local");
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.mocked(meetingRecordingStore.list).mockResolvedValue([]);
    vi.mocked(meetingRecordingStore.save).mockResolvedValue("ok" as IDBValidKey);
  });

  it("R3-1: shows cloud + multiple fallback/import clips to a second account without duplicating the latest clip and streams each via proxy", async () => {
    vi.mocked(meetingService.getRecordingPlaybackUrl).mockImplementation(async (_projectId, _meetingId, fileId?: number) => {
      const targetId = fileId ?? 702;
      return {
        url: `/api/v1/projects/4/files/${targetId}/stream?token=tok-${targetId}`,
        provider: "b2",
        requiresAuthHeader: false,
        contentType: targetId === 700 ? "video/mp4" : "video/webm",
        recordingFileId: targetId,
        recordingStatus: "COMPLETED",
        backupStorageUsed: false,
      };
    });
    vi.mocked(meetingService.getRecordings).mockResolvedValue([
      {
        id: "clip-fallback-2",
        state: "READY",
        version: 1,
        fileId: 702,
        durationMs: 45_000,
        mimeType: "video/webm",
        createdAt: "2026-11-23T10:15:00Z",
        origin: "IMPORT",
        coverage: "IMPORTED_FILE",
      },
      {
        id: "clip-fallback-1",
        state: "READY",
        version: 1,
        fileId: 701,
        durationMs: 30_000,
        mimeType: "video/webm",
        createdAt: "2026-11-23T10:10:00Z",
        origin: "BROWSER",
        coverage: "SCREEN_ONLY",
      },
      {
        id: "clip-cloud-1",
        state: "READY",
        version: 1,
        fileId: 700,
        durationMs: 60_000,
        mimeType: "video/mp4",
        createdAt: "2026-11-23T10:00:00Z",
        origin: "CLOUD_EGRESS",
        coverage: "CLOUD_COMPOSITE",
      },
    ]);

    render(
      <ConfirmProvider>
        <MeetingRecordingModal
          isOpen
          onClose={vi.fn()}
          meeting={{ ...endedMeeting, isHost: false }}
          currentUserId={2}
        />
      </ConfirmProvider>
    );

    const selector = await screen.findByRole("combobox", { name: /Chọn bản ghi|Choose recording/i });
    const options = Array.from(selector.querySelectorAll("option"));
    // Exactly 3 clips (latest fileId 702 must NOT be duplicated as both "cloud" and "clip-fallback-2").
    expect(options).toHaveLength(3);

    const player = await screen.findByTestId("recording-video-player");
    expect(player).toHaveAttribute("src", "/api/v1/projects/4/files/702/stream?token=tok-702");

    // Account 2 switches to older cloud clip (fileId 700) -> plays through proxy without full-blob download.
    fireEvent.change(selector, { target: { value: "clip-cloud-1" } });
    await waitFor(() => {
      expect(meetingService.getRecordingPlaybackUrl).toHaveBeenCalledWith(4, 234, 700);
      expect(screen.getByTestId("recording-video-player")).toHaveAttribute(
        "src",
        "/api/v1/projects/4/files/700/stream?token=tok-700"
      );
    });
    expect(projectFilesService.downloadFileBlob).not.toHaveBeenCalled();
    // Cross-account scope: only account 2's IndexedDB scope was queried.
    expect(meetingRecordingStore.list).toHaveBeenCalledWith({ userId: 2, projectId: 4, meetingId: 234 });
  });

  it("R3-2: does not hide a local READY clip until a matching server entry exists, then deduplicates by fileId", async () => {
    const localReadyClip = {
      userId: 1,
      projectId: 4,
      meetingId: 234,
      recordingId: "local-b2-1",
      title: "Architecture Review",
      mimeType: "video/webm",
      recordedAt: "2026-11-23T10:05:00Z",
      origin: "BROWSER" as const,
      coverage: "SCREEN_ONLY",
      uploadState: "READY" as const,
      uploadTarget: "B2" as const,
      fileId: 811,
      blob: new Blob(["local fallback bytes"], { type: "video/webm" }),
    };
    vi.mocked(meetingRecordingStore.list).mockResolvedValue([localReadyClip]);
    // Server has a newer clip 812, but does NOT yet list 811 in getRecordings.
    vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValue({
      url: "/api/v1/projects/4/files/812/stream?token=tok-812",
      provider: "b2",
      requiresAuthHeader: false,
      contentType: "video/mp4",
      recordingFileId: 812,
      recordingStatus: "COMPLETED",
      backupStorageUsed: false,
    });
    vi.mocked(meetingService.getRecordings).mockResolvedValue([
      {
        id: "server-812",
        state: "READY",
        version: 1,
        fileId: 812,
        mimeType: "video/mp4",
        createdAt: "2026-11-23T10:10:00Z",
        origin: "CLOUD_EGRESS",
        coverage: "CLOUD_COMPOSITE",
      },
    ]);

    render(
      <ConfirmProvider>
        <MeetingRecordingModal isOpen onClose={vi.fn()} meeting={{ ...endedMeeting, recordingFileId: 812 }} currentUserId={1} />
      </ConfirmProvider>
    );

    const selector = await screen.findByRole("combobox", { name: /Chọn bản ghi|Choose recording/i });
    const optionValues = Array.from(selector.querySelectorAll("option")).map((opt) => (opt as HTMLOptionElement).value);
    expect(optionValues).toEqual(["server-812", "local-b2-1"]);
  });

  it("R7: allows opening recovery and retrying a failed upload while the meeting is still ACTIVE", async () => {
    const failedLocalClip = {
      userId: 1,
      projectId: 4,
      meetingId: 234,
      recordingId: "failed-active-1",
      title: "Architecture Review",
      mimeType: "video/webm",
      recordedAt: "2026-11-23T10:05:00Z",
      origin: "BROWSER" as const,
      coverage: "SCREEN_ONLY",
      uploadState: "LOCAL_ONLY" as const,
      uploadTarget: "B2" as const,
      durationMs: 12_000,
      blob: new Blob(["failed upload bytes"], { type: "video/webm" }),
    };

    vi.mocked(meetingService.getMeetings).mockResolvedValue([activeMeeting]);
    vi.mocked(meetingRecordingStore.list).mockResolvedValue([failedLocalClip]);
    vi.mocked(meetingService.getRecordingPlaybackUrl).mockResolvedValue({
      url: null,
      provider: null,
      requiresAuthHeader: false,
      recordingFileId: null,
      recordingStatus: "IDLE",
      backupStorageUsed: false,
    });
    vi.mocked(meetingService.getRecordings).mockResolvedValue([]);
    vi.mocked(meetingService.uploadFallbackRecordingToB2).mockResolvedValue({
      ...activeMeeting,
      recordingFileId: 901,
      recordingStatus: "COMPLETED",
    });

    render(
      <ConfirmProvider>
        <ProjectMeetingsTab projectId={4} isArchived={false} currentUserId={1} />
      </ConfirmProvider>
    );

    // Join button remains intact on the ACTIVE meeting card.
    expect(await screen.findByTestId("join-meeting-btn-234")).toBeInTheDocument();
    // Recovery / recordings button is also accessible on the ACTIVE meeting card without ending the meeting.
    const recoveryBtn = await screen.findByTestId("active-meeting-recordings-btn-234");
    fireEvent.click(recoveryBtn);

    expect(await screen.findByTestId("recording-video-player")).toBeInTheDocument();
    expect(screen.getByTestId("download-recording-btn")).toBeInTheDocument();
    const retryBtn = screen.getByTestId("retry-local-b2-upload-btn");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(meetingService.uploadFallbackRecordingToB2).toHaveBeenCalledTimes(1);
    });
  });
});
