import type { TaskDto } from "@/types/task";
import type { WorkflowMode } from "@/types/project";

export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

export interface SprintDto {
  id: number;
  projectId: number;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
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
