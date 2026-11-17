import { test, expect } from "./helpers/isolated-test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER, TEAMMATE_USER } from "./helpers/mock-setup";

test.describe("P5-02 Task Workflow & Evaluation Lifecycle (Mocked E2E)", () => {
  test("board drag-to-REVIEW opens submit modal, independent review saves quality-v1 + timeliness, deleted file shows unavailable, and reopen clears evaluation", async ({
    page,
  }) => {
    await setupWorkspaceMocks(page, {
      language: "en",
      user: TEAMMATE_USER,
      isManager: false,
      initialFiles: [
        {
          id: 501,
          projectId: 100,
          uploaderId: TEAMMATE_USER.id,
          uploaderName: TEAMMATE_USER.fullName,
          fileName: "proof.pdf",
          originalName: "proof.pdf",
          contentType: "application/pdf",
          fileSize: 15360,
          createdAt: "2026-11-18T01:00:00Z",
        },
      ],
    });

    await page.route("**/v1/projects/100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            id: 100,
            name: "Workflow Project",
            status: "ACTIVE",
            workflowMode: "KANBAN",
            timezoneId: "Asia/Ho_Chi_Minh",
            createdAt: "2026-11-01T00:00:00Z",
          },
        }),
      });
    });

    let currentRoleAsManager = false;
    let taskState: Record<string, unknown> = {
      id: 80,
      projectId: 100,
      title: "Build Review Gate",
      description: "Require immutable submission",
      status: "IN_PROGRESS",
      priority: "HIGH",
      position: 0,
      labels: [],
      difficultyLevel: 3,
      assigneeId: TEAMMATE_USER.id,
      reporterId: DEFAULT_MOCK_USER.id,
      dueDate: "2026-11-25T16:59:59Z",
      createdAt: "2026-11-10T01:00:00Z",
      updatedAt: "2026-11-18T01:00:00Z",
      completedAt: null,
      version: 2,
      assignmentVersion: 1,
      projectTimezoneId: "Asia/Ho_Chi_Minh",
      currentSubmissionId: null,
      currentEvaluationId: null,
      completionEvidenceStatus: null,
      legacyReviewMissingSubmission: false,
    };

    let workflowState: {
      taskId: number;
      projectId: number;
      taskVersion: number;
      assignmentVersion: number;
      criteriaRevision: number;
      dueCommitmentRevision: number;
      status: string;
      completionEvidenceStatus: string | null;
      completedAt: string | null;
      currentSubmissionId: number | null;
      currentEvaluationId: number | null;
      legacyReviewMissingSubmission: boolean;
      otherActiveManagersExist: boolean;
      canSubmit: boolean;
      canWithdraw: boolean;
      canReview: boolean;
      canSelfAttest: boolean;
      canReopen: boolean;
      canSupersede: boolean;
      canRecoverLegacyReview: boolean;
      rubricVersion: string;
      rubric: unknown[];
      submissions: Record<string, unknown>[];
      reviews: Record<string, unknown>[];
      evaluations: Record<string, unknown>[];
      deadlineRevisions: unknown[];
    } = {
      taskId: 80,
      projectId: 100,
      taskVersion: 2,
      assignmentVersion: 1,
      criteriaRevision: 0,
      dueCommitmentRevision: 1,
      status: "IN_PROGRESS",
      completionEvidenceStatus: null,
      completedAt: null,
      currentSubmissionId: null,
      currentEvaluationId: null,
      legacyReviewMissingSubmission: false,
      otherActiveManagersExist: true,
      canSubmit: true,
      canWithdraw: false,
      canReview: false,
      canSelfAttest: false,
      canReopen: false,
      canSupersede: false,
      canRecoverLegacyReview: false,
      rubricVersion: "quality-v1",
      rubric: [],
      submissions: [],
      reviews: [],
      evaluations: [],
      deadlineRevisions: [],
    };

    let directMoveCalled = false;
    await page.route("**/v1/tasks/80/move", async (route) => {
      directMoveCalled = true;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ status: 400, message: "Direct workflow status change is forbidden" }),
      });
    });

    await page.route("**/v1/projects/100/board**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            projectId: 100,
            workflowMode: "KANBAN",
            columns: [],
            tasks: [taskState],
            activeSprint: null,
          },
        }),
      });
    });

    await page.route("**/v1/tasks/80", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            task: taskState,
            subtasks: [],
            attachments: [],
            labels: [],
            skills: [],
          },
        }),
      });
    });

    await page.route("**/v1/tasks/80/comments**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "Success", data: [] }),
      });
    });

    await page.route("**/v1/tasks/80/workflow", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "Success", data: workflowState }),
      });
    });

    const submittedBodies: Array<{ body: Record<string, unknown>; idempotencyKey?: string }> = [];
    await page.route("**/v1/tasks/80/workflow/submit", async (route) => {
      const req = route.request();
      const body = req.postDataJSON();
      submittedBodies.push({ body, idempotencyKey: req.headers()["idempotency-key"] });

      taskState = {
        ...taskState,
        status: "REVIEW",
        version: 3,
        currentSubmissionId: 901,
      };
      workflowState = {
        ...workflowState,
        taskVersion: 3,
        status: "REVIEW",
        currentSubmissionId: 901,
        canSubmit: false,
        canWithdraw: !currentRoleAsManager,
        canReview: currentRoleAsManager,
        submissions: [
          {
            id: 901,
            cycleNo: 1,
            assignmentVersion: 1,
            submitterId: TEAMMATE_USER.id,
            submitterName: TEAMMATE_USER.fullName,
            summary: body.summary,
            submittedAt: "2026-11-18T04:00:00Z",
            dueCommitmentRevision: 1,
            criteriaRevision: 0,
            projectTimezoneId: "Asia/Ho_Chi_Minh",
            status: "PENDING",
            evidenceFiles: [
              {
                evidenceRefId: 1,
                liveSourceFileId: null,
                originalFileId: 501,
                originalName: "proof.pdf",
                contentType: "application/pdf",
                fileSize: 15360,
                capturedAt: "2026-11-18T04:00:00Z",
                available: false,
                unavailableReason: "DELETED",
                availabilityEvents: [],
              },
            ],
          },
        ],
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Submitted",
          data: { taskId: 80, taskVersion: 3, state: "REVIEW", submissionId: 901 },
        }),
      });
    });

    const reviewBodies: Array<{ body: Record<string, unknown>; idempotencyKey?: string }> = [];
    await page.route("**/v1/tasks/80/workflow/review", async (route) => {
      const req = route.request();
      const body = req.postDataJSON();
      reviewBodies.push({ body, idempotencyKey: req.headers()["idempotency-key"] });

      taskState = {
        ...taskState,
        status: "DONE",
        version: 4,
        currentSubmissionId: 901,
        currentEvaluationId: 701,
        completionEvidenceStatus: "INDEPENDENT_ACCEPTED",
        completedAt: "2026-11-18T05:00:00Z",
        currentQualityRating: body.qualityRating,
        currentOnTime: true,
      };
      workflowState = {
        ...workflowState,
        taskVersion: 4,
        status: "DONE",
        completionEvidenceStatus: "INDEPENDENT_ACCEPTED",
        completedAt: "2026-11-18T05:00:00Z",
        currentEvaluationId: 701,
        canSubmit: false,
        canWithdraw: false,
        canReview: false,
        canReopen: true,
        canSupersede: true,
        submissions: [{ ...workflowState.submissions[0], status: "ACCEPTED" }],
        reviews: [
          {
            id: 601,
            submissionId: 901,
            reviewerId: DEFAULT_MOCK_USER.id,
            reviewerName: DEFAULT_MOCK_USER.fullName,
            decision: "ACCEPT",
            qualityRating: body.qualityRating,
            rubricVersion: "quality-v1",
            feedback: body.feedback,
            evidenceSummary: body.evidenceSummary,
            selfAttested: false,
            reviewedAt: "2026-11-18T05:00:00Z",
          },
        ],
        evaluations: [
          {
            id: 701,
            submissionId: 901,
            reviewId: 601,
            assigneeId: TEAMMATE_USER.id,
            assigneeName: TEAMMATE_USER.fullName,
            reviewerId: DEFAULT_MOCK_USER.id,
            reviewerName: DEFAULT_MOCK_USER.fullName,
            assignmentVersion: 1,
            qualityRating: body.qualityRating,
            evidenceStatus: "INDEPENDENT_ACCEPTED",
            rubricVersion: "quality-v1",
            acceptedSubmittedAt: "2026-11-18T04:00:00Z",
            reviewedAt: "2026-11-18T05:00:00Z",
            originalCompletedAt: "2026-11-18T05:00:00Z",
            onTime: true,
            timelinessStatus: "ON_TIME",
            evaluationVersion: 1,
            invalidated: false,
            evidenceRevision: 1,
          },
        ],
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Reviewed",
          data: {
            taskId: 80,
            taskVersion: 4,
            state: "DONE",
            submissionId: 901,
            reviewId: 601,
            evaluationId: 701,
            evidenceStatus: "INDEPENDENT_ACCEPTED",
            timelinessStatus: "ON_TIME",
          },
        }),
      });
    });

    await page.route("**/v1/tasks/80/workflow/reopen", async (route) => {
      const body = route.request().postDataJSON();
      taskState = {
        ...taskState,
        status: "IN_PROGRESS",
        version: 5,
        assignmentVersion: 2,
        currentSubmissionId: null,
        currentEvaluationId: null,
        completionEvidenceStatus: null,
        completedAt: null,
      };
      workflowState = {
        ...workflowState,
        taskVersion: 5,
        assignmentVersion: 2,
        status: "IN_PROGRESS",
        completionEvidenceStatus: null,
        completedAt: null,
        currentSubmissionId: null,
        currentEvaluationId: null,
        canReopen: false,
        canSupersede: false,
        evaluations: [
          {
            ...workflowState.evaluations[0],
            invalidated: true,
            invalidationReason: "REOPENED",
            invalidationDetailReason: body.reason,
          },
        ],
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Reopened",
          data: { taskId: 80, taskVersion: 5, state: "IN_PROGRESS" },
        }),
      });
    });

    // 1. Open Kanban board as assignee and drag IN_PROGRESS card into REVIEW column -> opens Submit modal
    await page.goto("/projects/100/board");
    const taskCard = page.locator(".project-task-card", { hasText: "Build Review Gate" });
    await expect(taskCard).toBeVisible();

    const reviewColumn = page
      .locator("div.flex-1.flex.flex-col.rounded-xl")
      .filter({ has: page.locator("h3", { hasText: /review/i }) })
      .first();

    const reviewDropTarget = reviewColumn.getByText("Drop tasks here");
    await reviewDropTarget.scrollIntoViewIfNeeded();
    await taskCard.dragTo(reviewDropTarget);
    await expect(page.getByRole("heading", { name: "Submit Task for Review" })).toBeVisible();
    expect(directMoveCalled).toBe(false);

    await page.getByLabel(/Submission Summary/i).fill("Completed review workflow and integration tests.");
    await page.getByText("proof.pdf").click();
    await page.getByRole("button", { name: "Submit for Review" }).click();

    await expect.poll(() => submittedBodies.length).toBe(1);
    expect(submittedBodies[0].body.expectedTaskVersion).toBe(2);
    expect(submittedBodies[0].body.evidenceProjectFileIds).toEqual([501]);
    expect(submittedBodies[0].body.requestId).toBe(submittedBodies[0].idempotencyKey);

    // 2. Switch workflow permission perspective to independent manager reviewing on task detail page
    currentRoleAsManager = true;
    workflowState = {
      ...workflowState,
      canWithdraw: false,
      canReview: true,
    };

    await page.goto("/projects/100/tasks/80");
    await expect(page.getByText("Evidence file unavailable (DELETED)")).toBeVisible();
    await page.getByRole("button", { name: "Review Submission" }).click();

    await page.getByRole("button", { name: "5", exact: true }).click();
    await expect(page.getByText("5 - Verified edge cases")).toBeVisible();
    await page.getByLabel(/Anchor & Evidence Verification Summary/i).fill("Checked immutable proof snapshot");
    await page.getByLabel(/Acceptance Rationale/i).fill("Independent acceptance verified");
    await page.getByRole("button", { name: "Accept & Save Evaluation" }).click();

    await expect.poll(() => reviewBodies.length).toBe(1);
    expect(reviewBodies[0].body).toMatchObject({
      submissionId: 901,
      expectedTaskVersion: 3,
      decision: "ACCEPT",
      qualityRating: 5,
    });

    await expect(page.getByText(/Evaluated 5\/5/i)).toBeVisible();
    await expect(page.getByText(/On Time/i).first()).toBeVisible();

    // 3. Reopen task and verify evaluation becomes invalidated while remaining in immutable history
    await page.getByRole("button", { name: "Reopen Task" }).click();
    await page.getByLabel(/Reopen Reason/i).fill("Follow-up edge case regression found");
    await page.getByRole("button", { name: "Confirm Reopen" }).click();

    await expect(page.getByText("Invalidated: REOPENED")).toBeVisible();
  });
});
