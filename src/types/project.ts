export type ProjectStatus = "PLANNING" | "ACTIVE" | "ARCHIVED" | "COMPLETED";

export type HeuristicMode =
  | "BALANCED"
  | "URGENT"
  | "TRAINING";

export type WorkflowMode = "KANBAN" | "SCRUM";

export type MemberRole = "MANAGER" | "MEMBER";

export interface ProjectSummary {
  projectId: number;
  projectName: string;
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
}

export interface MyProject {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  myRole: MemberRole;
  startDate: string | null;
  endDate: string | null;
  joinedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  heuristicMode: HeuristicMode;
  workflowMode: WorkflowMode;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface ProjectMember {
  projectId: number;
  userId: number;
  role: MemberRole;
  joinedAt: string | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  heuristicMode?: HeuristicMode;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  heuristicMode?: HeuristicMode;
  workflowMode?: WorkflowMode;
  startDate?: string;
  endDate?: string;
}

export interface JoinProjectRequest {
  projectCode: string;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
