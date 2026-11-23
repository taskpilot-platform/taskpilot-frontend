import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskWorkflowPanel } from "@/components/tasks/TaskWorkflowPanel";
import { TaskWorkflowDialogs } from "@/components/tasks/TaskWorkflowDialogs";
import { api } from "@/lib/http";
import { projectFilesService } from "@/services/project-files.service";
import { taskService } from "@/services/task.service";
import { QUALITY_V1_ANCHORS, type TaskDto, type TaskWorkflowHistory } from "@/types/task";

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 77,
    projectId: 100,
    parentId: null,
    sprintId: null,
    title: "Implement review workflow",
    description: "Verify immutable submissions",
    status: "REVIEW",
    priority: "HIGH",
    position: 10,
    labels: [],
    tags: [],
    difficultyLevel: 3,
    requiredSkills: [],
    assigneeId: 2,
    reporterId: 1,
    startDate: "2026-11-10T00:00:00Z",
    dueDate: "2026-11-20T16:59:59Z",
    createdAt: "2026-11-10T01:00:00Z",
    updatedAt: "2026-11-18T01:00:00Z",
    completedAt: null,
    version: 5,
    assignmentVersion: 2,
    projectTimezoneId: "Asia/Ho_Chi_Minh",
    currentSubmissionId: 901,
    currentEvaluationId: null,
    completionEvidenceStatus: null,
    legacyReviewMissingSubmission: false,
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<TaskWorkflowHistory> = {}): TaskWorkflowHistory {
  return {
    taskId: 77,
    projectId: 100,
    taskVersion: 5,
    assignmentVersion: 2,
    criteriaRevision: 1,
    dueCommitmentRevision: 1,
    status: "REVIEW",
    completionEvidenceStatus: null,
    completedAt: null,
    currentSubmissionId: 901,
    currentEvaluationId: null,
    legacyReviewMissingSubmission: false,
    otherActiveManagersExist: true,
    canSubmit: false,
    canWithdraw: false,
    canReview: true,
    canSelfAttest: false,
    canReopen: false,
    canSupersede: false,
    canRecoverLegacyReview: false,
    rubricVersion: "quality-v1",
    rubric: QUALITY_V1_ANCHORS,
    submissions: [
      {
        id: 901,
        cycleNo: 1,
        assignmentVersion: 2,
        submitterId: 2,
        submitterName: "Sarah Connor",
        summary: "Added immutable snapshots and integration coverage.",
        submittedAt: "2026-11-18T02:00:00Z",
        commitmentDueAt: "2026-11-20T16:59:59Z",
        dueCommitmentRevision: 1,
        criteriaRevision: 1,
        projectTimezoneId: "Asia/Ho_Chi_Minh",
        status: "PENDING",
        withdrawnAt: null,
        withdrawalReason: null,
        withdrawnByUserId: null,
        invalidatedAt: null,
        invalidationReason: null,
        evidenceFiles: [
          {
            evidenceRefId: 11,
            liveSourceFileId: 501,
            originalFileId: 501,
            originalName: "coverage-report.pdf",
            contentType: "application/pdf",
            fileSize: 20480,
            contentIdentity: "abc123",
            capturedAt: "2026-11-18T02:00:00Z",
            available: true,
            unavailableReason: null,
            availabilityEvents: [],
          },
          {
            evidenceRefId: 12,
            liveSourceFileId: null,
            originalFileId: 502,
            originalName: "deleted-screenshot.png",
            contentType: "image/png",
            fileSize: 4096,
            contentIdentity: "def456",
            capturedAt: "2026-11-18T02:00:00Z",
            available: false,
            unavailableReason: "DELETED",
            availabilityEvents: [],
          },
        ],
      },
    ],
    reviews: [],
    evaluations: [],
    deadlineRevisions: [],
    ...overrides,
  };
}

describe("P5.2 Task Workflow UI & Contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches matching requestId and Idempotency-Key across all workflow mutations", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {} as never,
    });

    await taskService.submitTask(77, { expectedTaskVersion: 3, summary: "Ready", evidenceProjectFileIds: [10] });
    await taskService.withdrawSubmission(77, { submissionId: 901, expectedTaskVersion: 4, reason: "Edit" });
    await taskService.reviewTask(77, {
      submissionId: 901,
      expectedTaskVersion: 4,
      decision: "ACCEPT",
      qualityRating: 5,
      feedback: "Great",
      evidenceSummary: "Edge cases verified",
    });
    await taskService.reopenTask(77, { expectedTaskVersion: 5, reason: "Bug found" });
    await taskService.supersedeEvaluation(77, {
      submissionId: 901,
      expectedEvaluationId: 300,
      expectedEvaluationVersion: 1,
      expectedTaskVersion: 5,
      qualityRating: 4,
      reason: "Recheck",
      evidenceSummary: "Updated audit",
    });
    await taskService.recoverLegacyReview(77, { expectedTaskVersion: 2, reason: "Migrate" });

    expect(postSpy).toHaveBeenCalledTimes(6);
    for (const [url, body, config] of postSpy.mock.calls) {
      expect(url).toContain("/v1/tasks/77/workflow/");
      const payload = body as { requestId?: string };
      const headers = (config as { headers?: Record<string, string> })?.headers ?? {};
      expect(payload.requestId).toBeTruthy();
      expect(headers["Idempotency-Key"]).toBe(payload.requestId);
    }
  });

  it("renders immutable evaluation, evidence availability/download, and self-attested non-measured badge", async () => {
    const workflow = makeWorkflow({
      status: "DONE",
      completionEvidenceStatus: "INDEPENDENT_ACCEPTED",
      canReview: false,
      evaluations: [
        {
          id: 801,
          submissionId: 901,
          reviewId: 701,
          assigneeId: 2,
          assigneeName: "Sarah Connor",
          reviewerId: 1,
          reviewerName: "Alex Rivera",
          assignmentVersion: 2,
          qualityRating: 4,
          evidenceStatus: "INDEPENDENT_ACCEPTED",
          rubricVersion: "quality-v1",
          acceptedSubmittedAt: "2026-11-18T02:00:00Z",
          reviewedAt: "2026-11-18T03:00:00Z",
          originalCompletedAt: "2026-11-18T03:00:00Z",
          commitmentDueAt: "2026-11-20T16:59:59Z",
          onTime: true,
          timelinessStatus: "ON_TIME",
          evaluationVersion: 1,
          supersedesEvaluationId: null,
          invalidated: false,
          invalidationReason: null,
          invalidationDetailReason: null,
          invalidatedAt: null,
          invalidatedByUserId: null,
          evidenceRevision: 1,
        },
      ],
    });
    vi.spyOn(taskService, "getTaskWorkflow").mockResolvedValue({
      status: 200,
      message: "OK",
      data: workflow,
    });
    const downloadSpy = vi
      .spyOn(projectFilesService, "downloadFileBlob")
      .mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const { rerender } = render(
      <TaskWorkflowPanel
        task={makeTask({ status: "DONE", completionEvidenceStatus: "INDEPENDENT_ACCEPTED", currentQualityRating: 4 })}
        onWorkflowChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Evaluated 4\/5/i)).toBeInTheDocument();
    expect(screen.getAllByText(/On Time/i).length).toBeGreaterThan(0);
    expect(screen.getByText("coverage-report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Evidence file unavailable \(DELETED\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Download/i }));
    await waitFor(() => expect(downloadSpy).toHaveBeenCalledWith(100, 501));

    // Self-attested state never shows a numeric score
    vi.spyOn(taskService, "getTaskWorkflow").mockResolvedValue({
      status: 200,
      message: "OK",
      data: makeWorkflow({
        status: "DONE",
        completionEvidenceStatus: "SELF_ATTESTED",
        canReview: false,
        canSupersede: true,
        evaluations: [
          {
            ...workflow.evaluations[0],
            qualityRating: null,
            evidenceStatus: "SELF_ATTESTED",
          },
        ],
      }),
    });

    rerender(
      <TaskWorkflowPanel
        task={makeTask({
          id: 77,
          version: 6,
          status: "DONE",
          completionEvidenceStatus: "SELF_ATTESTED",
          currentQualityRating: null,
        })}
        onWorkflowChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Self-Attested \(Not measured\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record Independent Review/i })).toBeInTheDocument();

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it("shows legacy REVIEW recovery banner and blocks submit when observed task version is missing", async () => {
    vi.spyOn(taskService, "getTaskWorkflow").mockResolvedValue({
      status: 200,
      message: "OK",
      data: makeWorkflow({
        currentSubmissionId: null,
        legacyReviewMissingSubmission: true,
        canReview: false,
        canRecoverLegacyReview: true,
        submissions: [],
      }),
    });

    render(
      <TaskWorkflowPanel
        task={makeTask({ currentSubmissionId: null, legacyReviewMissingSubmission: true })}
        onWorkflowChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Legacy REVIEW state has no recorded submission/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Recover$/i })).toBeInTheDocument();

    // Missing observed version must never substitute 0
    const submitSpy = vi.spyOn(taskService, "submitTask");
    const conflictSpy = vi.fn();
    vi.spyOn(projectFilesService, "getFiles").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0 },
    });

    const badTask = makeTask({ status: "IN_PROGRESS", version: Number.NaN });
    render(
      <TaskWorkflowDialogs
        openKind="submit"
        onClose={vi.fn()}
        task={badTask}
        workflow={makeWorkflow({ canSubmit: true })}
        onSuccess={vi.fn()}
        onVersionConflict={conflictSpy}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Submission Summary/i), { target: { value: "Completed" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit for Review/i }));
    await waitFor(() => expect(conflictSpy).toHaveBeenCalledTimes(1));
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("supports quality-v1 rubric, self-attestation without numeric score, and 409 refresh recovery", async () => {
    const workflow = makeWorkflow({ canReview: true, canSelfAttest: true });
    const reviewSpy = vi
      .spyOn(taskService, "reviewTask")
      .mockRejectedValueOnce({ response: { status: 409, data: { message: "Stale task" } } })
      .mockResolvedValue({
        status: 200,
        message: "OK",
        data: { taskId: 77, taskVersion: 6, state: "DONE" },
      });
    const onConflict = vi.fn();
    const onSuccess = vi.fn();

    const { rerender } = render(
      <TaskWorkflowDialogs
        openKind="review"
        onClose={vi.fn()}
        task={makeTask()}
        workflow={workflow}
        onSuccess={onSuccess}
        onVersionConflict={onConflict}
      />,
    );

    // Selecting rating 5 reveals level 5 edge-case rubric anchor
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(screen.getByText(/5 - Verified edge cases/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Anchor & Evidence Verification Summary/i), {
      target: { value: "Edge case integration suite passed" },
    });
    fireEvent.change(screen.getByLabelText(/Acceptance Rationale/i), {
      target: { value: "All agreed criteria met cleanly" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Accept & Save Evaluation/i }));

    await waitFor(() => expect(reviewSpy).toHaveBeenCalledTimes(1));
    expect(reviewSpy.mock.calls[0][1]).toMatchObject({
      submissionId: 901,
      expectedTaskVersion: 5,
      decision: "ACCEPT",
      qualityRating: 5,
    });
    expect(onConflict).toHaveBeenCalledTimes(1);

    // Self-attest mode hides numeric ratings and sends qualityRating: null
    rerender(
      <TaskWorkflowDialogs
        openKind="self_attest"
        onClose={vi.fn()}
        task={makeTask()}
        workflow={workflow}
        onSuccess={onSuccess}
        onVersionConflict={onConflict}
      />,
    );
    expect(screen.getByText(/Marked as/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "5" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Self-Attestation Reason/i), {
      target: { value: "Sole active manager delivering hotfix" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Self-Attestation/i }));

    await waitFor(() => expect(reviewSpy).toHaveBeenCalledTimes(2));
    expect(reviewSpy.mock.calls[1][1]).toMatchObject({
      decision: "SELF_ATTEST",
      qualityRating: null,
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
