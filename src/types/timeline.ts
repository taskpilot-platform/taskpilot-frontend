import type { SprintStatus } from "@/types/sprint";
import type { TaskPriority, TaskStatus } from "@/types/task";

export interface TimelineProjectDto {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export interface TimelineTaskDto {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
}

export interface TimelineSprintDto {
  id: number;
  name: string;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  tasks: TimelineTaskDto[];
}

export interface TimelineResponse {
  project: TimelineProjectDto;
  sprints: TimelineSprintDto[];
  unscheduledTasks: TimelineTaskDto[];
}
