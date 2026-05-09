export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface UserProfileDto {
  id: number;
  fullName: string;
  email: string;
  status: string;
  currentWorkload: number;
}

export interface TaskDto {
  id: number;
  projectId: number;
  parentId?: number;
  sprintId?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  tags?: string[];
  difficultyLevel: number;
  requiredSkills?: string[];
  assigneeId?: number;
  reporterId?: number;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetailDto {
  task: TaskDto;
  assignee: UserProfileDto | null;
  reporter: UserProfileDto | null;
  subtasks: TaskDto[];
}

export interface CreateTaskRequest {
  projectId: number;
  parentId?: number;
  sprintId?: number;
  title: string;
  description?: string;
  priority?: TaskPriority;
  position?: number;
  tags?: string[];
  difficultyLevel?: number;
  requiredSkills?: string[];
  assigneeId?: number;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  tags?: string[];
  difficultyLevel?: number;
  requiredSkills?: string[];
  assigneeId?: number;
  startDate?: string;
  dueDate?: string;
}

export interface KanbanMoveRequest {
  status: TaskStatus;
  position: number;
}
