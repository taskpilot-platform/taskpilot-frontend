export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface UserProfileDto {
  id: number;
  fullName: string;
  email: string;
  status: string;
  currentWorkload: number;
}

export interface UserProfileLiteDto {
  id: number;
  fullName: string;
}

export interface LabelDto {
  id: number;
  name: string;
  color: string;
}

export interface SkillDto {
  id: number;
  name: string;
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
  labels?: LabelDto[];
  tags?: string[]; // Deprecated, use labels
  difficultyLevel: number;
  requiredSkills?: string[]; // Deprecated, fetched fully via TaskDetailDto
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
  requiredSkills: SkillDto[];
}

export interface CreateTaskRequest {
  projectId: number;
  parentId?: number;
  sprintId?: number;
  title: string;
  description?: string;
  priority?: TaskPriority;
  position?: number;
  labelIds?: number[];
  tags?: string[]; // Deprecated
  difficultyLevel?: number;
  requiredSkillIds?: number[];
  requiredSkills?: string[]; // Deprecated
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
  labelIds?: number[];
  tags?: string[]; // Deprecated
  difficultyLevel?: number;
  requiredSkillIds?: number[];
  requiredSkills?: string[]; // Deprecated
  assigneeId?: number;
  startDate?: string;
  dueDate?: string;
}

export interface KanbanMoveRequest {
  status: TaskStatus;
  position: number;
}

export interface TaskCommentDto {
  id: number;
  taskId: number;
  parentCommentId: number | null;
  author: UserProfileLiteDto;
  content: string | null;
  mentions: UserProfileLiteDto[];
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskCommentRequest {
  content: string;
  parentCommentId?: number | null;
  mentionedUserIds: number[];
}

export interface UpdateTaskCommentRequest {
  content: string;
  mentionedUserIds: number[];
}

export interface TaskCommentDeletedEvent {
  taskId: number;
  commentId: number;
  parentCommentId: number | null;
  deleted: boolean;
}
