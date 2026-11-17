import type { TaskDto, TaskStatus } from "@/types/task";
import type { WorkflowMode } from "@/types/project";

export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";
export type SprintCarryoverDestination = "BACKLOG" | "SPRINT";

export interface SprintClosureSnapshotDto {
  id: number;
  sprintId: number;
  projectId: number;
  sprintName: string;
  sprintVersionAtClose: number;
  carryoverDestination: SprintCarryoverDestination | "NONE";
  targetSprintId?: number | null;
  totalTasksAtClose: number;
  doneTasksRetained: number;
  carriedOverTotal: number;
  carriedOverTodo: number;
  carriedOverInProgress: number;
  carriedOverReview: number;
  snapshotPayloadJson: string;
  closedByUserId: number;
  closedAt: string;
  requestId?: string | null;
}

export interface SprintDto {
  id: number;
  projectId: number;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  version?: number;
  completedAt?: string | null;
  completedByUserId?: number | null;
  closureSnapshot?: SprintClosureSnapshotDto | null;
}

export interface SprintCompletePreviewResponse {
  sprintId: number;
  sprintName: string;
  sprintVersion: number;
  totalTasks: number;
  doneTasksRetained: number;
  unfinishedTotal: number;
  todoCount: number;
  inProgressCount: number;
  reviewCount: number;
  unfinishedTaskIds: number[];
  unfinishedTasks: Array<{
    id: number;
    title: string;
    status: TaskStatus;
    assigneeId?: number | null;
    version: number;
    hasPendingSubmission: boolean;
  }>;
  availableTargetSprints: Array<{
    id: number;
    name: string;
    status: SprintStatus;
    version: number;
    startDate: string | null;
    endDate: string | null;
  }>;
}

export interface CompleteSprintRequest {
  expectedSprintVersion: number;
  requestId?: string;
  carryover: {
    destination: SprintCarryoverDestination;
    targetSprintId?: number | null;
  };
  expectedUnfinishedTaskIds?: number[];
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface SprintBacklogSection {
  sprint: SprintDto;
  tasks: TaskDto[];
}

export interface BacklogResponse {
  unscheduledTasks: TaskDto[];
  sprints: SprintBacklogSection[];
}

export interface BoardResponse {
  workflowMode: WorkflowMode;
  activeSprint: SprintDto | null;
  tasks: TaskDto[];
}
