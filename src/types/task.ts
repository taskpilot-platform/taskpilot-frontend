export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ReviewDecision = "ACCEPT" | "RETURN" | "SELF_ATTEST";
export type EvidenceStatus = "INDEPENDENT_ACCEPTED" | "SELF_ATTESTED" | "LEGACY_UNVERIFIED";
export type TimelinessStatus = "ON_TIME" | "LATE" | "NO_DUE_DATE";

export interface QualityRubricLevel {
  rating: number;
  label: string;
  description: string;
}

export interface TaskEvidenceAvailabilityEvent {
  id: number;
  evidenceRefId: number;
  originalFileId: number;
  available: boolean;
  reason: string;
  occurredAt: string;
  actorUserId?: number | null;
}

export interface TaskSubmissionEvidenceFile {
  evidenceRefId: number;
  liveSourceFileId?: number | null;
  originalFileId: number;
  originalName: string;
  contentType?: string | null;
  fileSize: number;
  contentIdentity?: string | null;
  capturedAt: string;
  available: boolean;
  unavailableReason?: string | null;
  availabilityEvents: TaskEvidenceAvailabilityEvent[];
}

export interface TaskSubmissionItem {
  id: number;
  cycleNo: number;
  assignmentVersion: number;
  submitterId: number;
  submitterName: string;
  summary: string;
  submittedAt: string;
  commitmentDueAt?: string | null;
  dueCommitmentRevision: number;
  criteriaRevision: number;
  projectTimezoneId: string;
  status: "PENDING" | "WITHDRAWN" | "RETURNED" | "ACCEPTED" | "INVALIDATED";
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
  withdrawnByUserId?: number | null;
  invalidatedAt?: string | null;
  invalidationReason?: string | null;
  evidenceFiles: TaskSubmissionEvidenceFile[];
}

export interface TaskReviewItem {
  id: number;
  submissionId: number;
  reviewerId: number;
  reviewerName: string;
  decision: "ACCEPT" | "RETURN" | "SELF_ATTEST" | "SUPERSEDE_ACCEPT";
  qualityRating?: number | null;
  rubricVersion?: string | null;
  feedback: string;
  evidenceSummary?: string | null;
  selfAttested: boolean;
  supersedesReviewId?: number | null;
  reviewedAt: string;
}

export interface TaskEvaluationItem {
  id: number;
  submissionId: number;
  reviewId: number;
  assigneeId: number;
  assigneeName: string;
  reviewerId: number;
  reviewerName: string;
  assignmentVersion: number;
  assignmentDecisionId?: string | null;
  qualityRating?: number | null;
  evidenceStatus: EvidenceStatus;
  rubricVersion: string;
  acceptedSubmittedAt: string;
  reviewedAt: string;
  originalCompletedAt: string;
  commitmentDueAt?: string | null;
  onTime?: boolean | null;
  timelinessStatus: TimelinessStatus;
  evaluationVersion: number;
  supersedesEvaluationId?: number | null;
  invalidated: boolean;
  invalidationReason?: string | null;
  invalidationDetailReason?: string | null;
  invalidatedAt?: string | null;
  invalidatedByUserId?: number | null;
  evidenceRevision: number;
}

export interface TaskDeadlineRevisionItem {
  id: number;
  revisionNo: number;
  previousDueAt?: string | null;
  newDueAt?: string | null;
  changedByUserId?: number | null;
  reason?: string | null;
  changedAt: string;
}

export interface TaskWorkflowHistory {
  taskId: number;
  projectId: number;
  taskVersion: number;
  assignmentVersion: number;
  criteriaRevision: number;
  dueCommitmentRevision: number;
  status: TaskStatus;
  completionEvidenceStatus?: EvidenceStatus | null;
  completedAt?: string | null;
  currentSubmissionId?: number | null;
  currentEvaluationId?: number | null;
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
  rubric: QualityRubricLevel[];
  submissions: TaskSubmissionItem[];
  reviews: TaskReviewItem[];
  evaluations: TaskEvaluationItem[];
  deadlineRevisions: TaskDeadlineRevisionItem[];
}

export interface TaskWorkflowResult {
  taskId: number;
  taskVersion: number;
  state: TaskStatus;
  submissionId?: number | null;
  reviewId?: number | null;
  evaluationId?: number | null;
  evaluationVersion?: number | null;
  evidenceStatus?: EvidenceStatus | null;
  timelinessStatus?: TimelinessStatus | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  onTime?: boolean | null;
}

export interface SubmitTaskWorkflowRequest {
  expectedTaskVersion: number;
  requestId?: string;
  summary: string;
  evidenceProjectFileIds?: number[];
}

export interface WithdrawTaskWorkflowRequest {
  submissionId: number;
  expectedTaskVersion: number;
  requestId?: string;
  reason?: string;
}

export interface ReviewTaskWorkflowRequest {
  submissionId: number;
  expectedTaskVersion: number;
  requestId?: string;
  decision: ReviewDecision;
  qualityRating?: number | null;
  feedback: string;
  evidenceSummary?: string;
}

export interface ReopenTaskWorkflowRequest {
  expectedTaskVersion: number;
  requestId?: string;
  reason: string;
}

export interface SupersedeEvaluationWorkflowRequest {
  submissionId: number;
  expectedEvaluationId: number;
  expectedEvaluationVersion: number;
  expectedTaskVersion: number;
  requestId?: string;
  qualityRating: number;
  reason: string;
  evidenceSummary: string;
}

export interface RecoverLegacyReviewWorkflowRequest {
  expectedTaskVersion: number;
  requestId?: string;
  reason: string;
}

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
  avatarUrl?: string | null;
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
  parentId?: number | null;
  sprintId?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  labels?: LabelDto[];
  tags?: string[]; // Deprecated, use labels
  difficultyLevel: number;
  requiredSkills?: string[]; // Deprecated, fetched fully via TaskDetailDto
  assigneeId?: number | null;
  reporterId?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  version: number;
  assignmentVersion?: number;
  projectTimezoneId?: string;
  currentSubmissionId?: number | null;
  currentEvaluationId?: number | null;
  completionEvidenceStatus?: EvidenceStatus | null;
  legacyReviewMissingSubmission?: boolean;
  currentQualityRating?: number | null;
  currentSubmittedAt?: string | null;
  currentReviewedAt?: string | null;
  currentOnTime?: boolean | null;
  currentTimelinessStatus?: TimelinessStatus | null;
  successorOfTaskId?: number | null;
}

export interface CreateSuccessorTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  sprintId?: number | null;
  difficultyLevel?: number;
  labelIds?: number[];
  requiredSkillIds?: number[];
  assigneeId?: number | null;
  startDate?: string;
  dueDate?: string;
  requestId?: string;
  successorOfTaskId?: number | null;
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
  requestId?: string;
  successorOfTaskId?: number | null;
}

export interface UpdateTaskRequest {
  expectedTaskVersion: number;
  requestId?: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  labelIds?: number[];
  tags?: string[]; // Deprecated
  difficultyLevel?: number;
  requiredSkillIds?: number[];
  requiredSkills?: string[]; // Deprecated
  assigneeId?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  sprintId?: number | null;
}

export interface PatchTaskRequest {
  expectedTaskVersion: number;
  requestId?: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  labelIds?: number[];
  difficultyLevel?: number;
  requiredSkillIds?: number[];
  assigneeId?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  sprintId?: number | null;
}

export interface KanbanMoveRequest {
  status: TaskStatus;
  position: number;
  expectedTaskVersion: number;
  requestId?: string;
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

export const QUALITY_V1_ANCHORS: QualityRubricLevel[] = [
  {
    rating: 1,
    label: "1 - Major corrections",
    description:
      "Accepted only after major substantive correction or multiple failures of critical agreed criteria; final verification evidence recorded.",
  },
  {
    rating: 2,
    label: "2 - Material corrections",
    description:
      "Accepted after material corrections affecting an agreed core requirement; fewer or less severe issues than level 1, with concrete review references.",
  },
  {
    rating: 3,
    label: "3 - Minor corrections",
    description:
      "Meets all agreed criteria after minor corrections; no material gap remained; standard verification evidence provided.",
  },
  {
    rating: 4,
    label: "4 - First substantive pass",
    description:
      "Meets all agreed criteria on first substantive review, with complete expected verification/documentation; only cosmetic nits if any.",
  },
  {
    rating: 5,
    label: "5 - Verified edge cases",
    description:
      "Level 4 plus explicit evidence that agreed high-risk/edge-case checks were independently verified; those checks were part of the recorded acceptance criteria before submission, not newly invented stretch work.",
  },
];
