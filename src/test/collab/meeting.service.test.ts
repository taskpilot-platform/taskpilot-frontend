import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/http";
import { meetingService } from "@/services/meeting.service";

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("meetingService.uploadFallbackRecordingToB2", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uploads directly to B2 with exact presigned Content-Type header and never sends bucket key on complete", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        status: 200,
        message: "OK",
        data: {
          uploadUrl: "https://s3.us-east-005.backblazeb2.com/taskpilot-recordings-2026/recordings/4/234/uuid.webm?X-Amz-Signature=sig",
          uploadToken: "signed-upload-token-123",
          contentType: "video/webm",
          fileName: "meeting_234_fallback.webm",
          maxFileSizeBytes: 50 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 1200_000).toISOString(),
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        message: "OK",
        data: {
          id: 234,
          projectId: 4,
          recordingFileId: 901,
          recordingStatus: "COMPLETED",
          recordingEnabled: true,
        },
      });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as any;

    const blob = new Blob(["webm-binary-content"], { type: "video/webm;codecs=vp8,opus" });
    const result = await meetingService.uploadFallbackRecordingToB2(4, 234, blob, {
      fileName: "meeting_234_fallback.webm",
      durationSeconds: 45,
    });

    expect(result.recordingFileId).toBe(901);

    // Verify PUT sends ONLY normalized Content-Type matching S3 signature
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [putUrl, putInit] = fetchMock.mock.calls[0];
    expect(putUrl).toContain("backblazeb2.com");
    expect(putInit.method).toBe("PUT");
    expect(putInit.headers).toEqual({ "Content-Type": "video/webm" });
    expect(putInit.body).toBe(blob);

    // Verify complete-upload payload ONLY contains uploadToken & durationSeconds (no client-supplied objectKey)
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/v1/projects/4/meetings/234/recording/complete-upload",
      {
        uploadToken: "signed-upload-token-123",
        durationSeconds: 45,
      }
    );
  });

  it("rejects oversize blobs client-side before sending PUT to Backblaze B2", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      status: 200,
      message: "OK",
      data: {
        uploadUrl: "https://s3.us-east-005.backblazeb2.com/taskpilot-recordings-2026/recordings/4/234/uuid.webm",
        uploadToken: "signed-token",
        contentType: "video/webm",
        fileName: "big.webm",
        maxFileSizeBytes: 10, // tiny 10-byte cap
        expiresAt: new Date(Date.now() + 1200_000).toISOString(),
      },
    });

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    const oversizeBlob = new Blob(["0123456789abcdef"], { type: "video/webm" });
    await expect(
      meetingService.uploadFallbackRecordingToB2(4, 234, oversizeBlob)
    ).rejects.toThrow(/maximum allowed size/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
