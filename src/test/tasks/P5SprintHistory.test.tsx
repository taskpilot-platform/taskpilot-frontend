import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompleteSprintDialog } from "@/components/sprints/CompleteSprintDialog";
import { TaskWorkflowPanel } from "@/components/tasks/TaskWorkflowPanel";
import { TaskWorkflowDialogs } from "@/components/tasks/TaskWorkflowDialogs";
import { api } from "@/lib/http";
import { projectService } from "@/services/project.service";
import { sprintService } from "@/services/sprint.service";
import { taskService } from "@/services/task.service";
import type { SprintCompletePreviewResponse, SprintDto } from "@/types/sprint";
import { QUALITY_V1_ANCHORS, type TaskDto, type TaskWorkflowHistory } from "@/types/task";

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

function makeSprint(overrides: Partial<SprintDto> = {}): SprintDto {
  return {
    id: 11,
    projectId: 100,
    name: "Sprint 11",
    goal: "Close backlog safely",
    status: "ACTIVE",
    startDate: "2026-11-10",
    endDate: "2026-11-24",
    version: 3,
    completedAt: null,
    completedByUserId: null,
    closureSnapshot: null,
    ...overrides,
  };
}

function makePreview(
  overrides: Partial<SprintCompletePreviewResponse> = {},
): SprintCompletePreviewResponse {
  return {
    sprintId: 11,
    sprintName: "Sprint 11",
    sprintVersion: 3,
    totalTasks: 4,
    doneTasksRetained: 2,
    unfinishedTotal: 2,
    todoCount: 1,
    inProgressCount: 0,
    reviewCount: 1,
    unfinishedTaskIds: [501, 502],
    unfinishedTasks: [
      {
        id: 501,
        title: "Write regression checks",
        status: "TODO",
        assigneeId: 2,
        version: 1,
        hasPendingSubmission: false,
      },
      {
        id: 502,
        title: "Verify review carryover",
        status: "REVIEW",
        assigneeId: 3,
        version: 4,
        hasPendingSubmission: true,
      },
    ],
    availableTargetSprints: [
      {
        id: 12,
        name: "Sprint 12 Planning",
        status: "PLANNING",
        version: 0,
        startDate: "2026-11-25",
        endDate: "2026-12-08",
      },
    ],
    ...overrides,
  };
}

function makeDoneTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 77,
    projectId: 100,
    parentId: null,
    sprintId: 11,
    successorOfTaskId: 55,
    title: "Ship sprint closure API",
    description: "Immutable snapshot on completion",
    status: "DONE",
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
    updatedAt: "2026-11-17T01:00:00Z",
    completedAt: "2026-11-17T01:00:00Z",
    version: 6,
    assignmentVersion: 2,
    projectTimezoneId: "UTC",
    currentSubmissionId: 901,
    currentEvaluationId: 301,
    completionEvidenceStatus: "INDEPENDENT_ACCEPTED",
    legacyReviewMissingSubmission: false,
    ...overrides,
  };
}

function makeDoneWorkflow(overrides: Partial<TaskWorkflowHistory> = {}): TaskWorkflowHistory {
  return {
    taskId: 77,
    projectId: 100,
    taskVersion: 6,
    assignmentVersion: 2,
    criteriaRevision: 1,
    dueCommitmentRevision: 1,
    status: "DONE",
    completionEvidenceStatus: "INDEPENDENT_ACCEPTED",
    completedAt: "2026-11-17T01:00:00Z",
    currentSubmissionId: 901,
    currentEvaluationId: 301,
    legacyReviewMissingSubmission: false,
    otherActiveManagersExist: true,
    canSubmit: false,
    canWithdraw: false,
    canReview: false,
    canSelfAttest: false,
    canReopen: true,
    canSupersede: true,
    canRecoverLegacyReview: false,
    rubricVersion: "quality-v1",
    rubric: QUALITY_V1_ANCHORS,
    submissions: [],
    reviews: [],
    evaluations: [],
    deadlineRevisions: [],
    ...overrides,
  };
}

describe("P5 Sprint History contracts & dialogs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends expectedSprintVersion, requestId, carryover and unfinished ids in completeSprint service", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      status: 200,
      message: "ok",
      data: makeSprint({ status: "COMPLETED" }),
    });

    await sprintService.completeSprint(
      100,
      11,
      {
        expectedSprintVersion: 3,
        carryover: { destination: "SPRINT", targetSprintId: 12 },
        expectedUnfinishedTaskIds: [501, 502],
      },
      "11111111-1111-4111-8111-111111111111",
    );

    expect(postSpy).toHaveBeenCalledWith(
      "/v1/projects/100/sprints/11/complete",
      {
        expectedSprintVersion: 3,
        carryover: { destination: "SPRINT", targetSprintId: 12 },
        expectedUnfinishedTaskIds: [501, 502],
        requestId: "11111111-1111-4111-8111-111111111111",
      },
      { headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" } },
    );
  });

  it("sends successor creation and explicit permanent deleteProject confirmation + requestId", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      status: 201,
      message: "created",
      data: makeDoneTask({ id: 88, successorOfTaskId: 77 }),
    });
    const deleteSpy = vi.spyOn(api, "del").mockResolvedValue({
      status: 200,
      message: "deleted",
      data: { projectId: 100 },
    });

    await taskService.createSuccessorTask(
      77,
      { title: "Follow-up fix", sprintId: 12 },
      "22222222-2222-4222-8222-222222222222",
    );
    expect(postSpy).toHaveBeenCalledWith(
      "/v1/tasks/77/successor",
      expect.objectContaining({
        title: "Follow-up fix",
        sprintId: 12,
        requestId: "22222222-2222-4222-8222-222222222222",
      }),
      { headers: { "Idempotency-Key": "22222222-2222-4222-8222-222222222222" } },
    );

    await projectService.deleteProject(
      100,
      "DELETE 100",
      "33333333-3333-4333-8333-333333333333",
    );
    expect(deleteSpy).toHaveBeenCalledWith(
      "/v1/projects/100",
      {
        confirmationText: "DELETE 100",
        requestId: "33333333-3333-4333-8333-333333333333",
      },
      {
        headers: {
          "Idempotency-Key": "33333333-3333-4333-8333-333333333333",
        },
      },
    );
  });

  it("renders CompleteSprintDialog preview, completes with carryover selection, and surfaces 409 error cleanly", async () => {
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    vi.spyOn(sprintService, "getCompletePreview").mockResolvedValue({
      status: 200,
      message: "ok",
      data: makePreview(),
    } as never);
    const completeSpy = vi
      .spyOn(sprintService, "completeSprint")
      .mockRejectedValueOnce(new Error("409 Sprint version conflict"))
      .mockResolvedValueOnce({
        status: 200,
        message: "ok",
        data: makeSprint({ status: "COMPLETED" }),
      } as never);

    render(
      <CompleteSprintDialog
        open={true}
        projectId={100}
        sprint={makeSprint()}
        onClose={onClose}
        onCompleted={onCompleted}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("#502 Verify review carryover")).toBeInTheDocument();
      expect(screen.getByText("Pending Review")).toBeInTheDocument();
    });

    // Switch carryover destination to existing target sprint
    const sprintRadio = screen.getByDisplayValue("SPRINT") as HTMLInputElement;
    fireEvent.click(sprintRadio);
    expect(sprintRadio.checked).toBe(true);

    // First attempt fails -> error alert displayed, preview refreshed
    fireEvent.click(screen.getByRole("button", { name: "Complete Sprint" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("409 Sprint version conflict");
    });
    expect(onClose).not.toHaveBeenCalled();

    // Second attempt succeeds -> calls onCompleted & closes
    fireEvent.click(screen.getByRole("button", { name: "Complete Sprint" }));
    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledTimes(2);
      expect(onCompleted).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays Successor badge and opens Create Follow-up Task dialog on DONE tasks", async () => {
    vi.spyOn(taskService, "getTaskWorkflow").mockResolvedValue({
      status: 200,
      message: "ok",
      data: makeDoneWorkflow(),
    } as never);
    const createSuccSpy = vi.spyOn(taskService, "createSuccessorTask").mockResolvedValue({
      status: 201,
      message: "created",
      data: makeDoneTask({ id: 99, title: "Follow-up edge case", successorOfTaskId: 77 }),
    } as never);
    const onSuccess = vi.fn().mockResolvedValue(undefined);

    render(
      <div>
        <TaskWorkflowPanel
          task={makeDoneTask()}
          projectTimezoneId="UTC"
          onWorkflowChanged={onSuccess}
        />
        <TaskWorkflowDialogs
          openKind="create_successor"
          task={makeDoneTask()}
          workflow={makeDoneWorkflow()}
          onClose={() => {}}
          onSuccess={onSuccess}
        />
      </div>,
    );

    expect(screen.getByText("Successor of #55")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Follow-up Title *"), {
      target: { value: "Follow-up edge case" },
    });
    fireEvent.change(screen.getByLabelText("Details / Context (Optional)"), {
      target: { value: "QA found corner case after sprint closed" },
    });

    const buttons = screen.getAllByRole("button", { name: "Create Follow-up Task" });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(createSuccSpy).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          title: "Follow-up edge case",
          description: "QA found corner case after sprint closed",
        }),
        expect.any(String),
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
