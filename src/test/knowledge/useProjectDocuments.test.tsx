import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectDocuments } from "@/hooks/useProjectDocuments";
import { knowledgeService } from "@/services/knowledge.service";
import type { ProjectDocument } from "@/types/knowledge";

vi.mock("@/services/knowledge.service", () => ({
  knowledgeService: {
    getDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    retryIngestion: vi.fn(),
  },
}));

describe("useProjectDocuments Hook Polling Lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const baseDoc: ProjectDocument = {
    id: 42,
    projectId: 1,
    originalFilename: "doc.pdf",
    contentType: "application/pdf",
    fileSize: 1024 * 1024,
    status: "QUEUED",
    errorMessage: null,
    chunkCount: 0,
    createdBy: 1,
    createdAt: "2026-09-07T00:00:00Z",
    updatedAt: "2026-09-07T00:00:00Z",
  };

  it("polls repeatedly when document is QUEUED or PROCESSING, and stops when READY", async () => {
    // 1st call: returns QUEUED
    vi.mocked(knowledgeService.getDocuments).mockResolvedValueOnce({
      success: true,
      message: "OK",
      data: [{ ...baseDoc, status: "QUEUED" }],
    });

    const { result } = renderHook(() => useProjectDocuments(1));

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.documents[0].status).toBe("QUEUED");
    expect(result.current.isPolling).toBe(true);

    // 2nd call: returns PROCESSING
    vi.mocked(knowledgeService.getDocuments).mockResolvedValueOnce({
      success: true,
      message: "OK",
      data: [{ ...baseDoc, status: "PROCESSING" }],
    });

    // Advance timer by 2500ms
    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(result.current.documents[0].status).toBe("PROCESSING");
    expect(result.current.isPolling).toBe(true);

    // 3rd call: returns READY (terminal status)
    vi.mocked(knowledgeService.getDocuments).mockResolvedValueOnce({
      success: true,
      message: "OK",
      data: [{ ...baseDoc, status: "READY", chunkCount: 8 }],
    });

    // Advance timer by 2500ms
    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(result.current.documents[0].status).toBe("READY");
    expect(result.current.isPolling).toBe(false);

    // Ensure no further polling occurs
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(knowledgeService.getDocuments).toHaveBeenCalledTimes(3);
  });

  it("continues polling on RETRY_WAIT and stops when FAILED", async () => {
    // 1st call: returns RETRY_WAIT
    vi.mocked(knowledgeService.getDocuments).mockResolvedValueOnce({
      success: true,
      message: "OK",
      data: [{ ...baseDoc, status: "RETRY_WAIT" }],
    });

    const { result } = renderHook(() => useProjectDocuments(1));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.documents[0].status).toBe("RETRY_WAIT");
    expect(result.current.isPolling).toBe(true);

    // 2nd call: returns FAILED
    vi.mocked(knowledgeService.getDocuments).mockResolvedValueOnce({
      success: true,
      message: "OK",
      data: [{ ...baseDoc, status: "FAILED", errorMessage: "Quota exceeded" }],
    });

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(result.current.documents[0].status).toBe("FAILED");
    expect(result.current.isPolling).toBe(false);
  });
});
