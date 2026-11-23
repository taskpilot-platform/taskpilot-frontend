export interface AdminUserResponse {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  currentWorkload: number | null;
  createdAt: string;
  updatedAt: string;
  accountState?: string;
  availability?: string;
  emailVerified?: boolean;
  legacyReviewRequired?: boolean;
}

export interface ProjectAttentionEligibleMember {
  userId: number;
  email: string;
  fullName: string;
  currentRole: string;
}

export interface ProjectAttentionItem {
  projectId: number;
  projectName: string;
  projectStatus: string;
  reason: string;
  since: string;
  attentionEventId: string;
  eligibleActiveMembers: ProjectAttentionEligibleMember[];
}

export interface TransferProjectManagerRequest {
  targetUserId: number;
  reason?: string;
}

export interface AdminCreateUserRequest {
  email: string;
  fullName: string;
  role: string;
}

export interface AdminUpdateUserRequest {
  role?: string;
  status?: string;
  currentWorkload?: number;
}

export interface AdminSkillResponse {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AdminSkillRequest {
  name: string;
  description?: string;
}

export interface SystemSettingResponse {
  keyName: string;
  valueJson: unknown;
  description: string | null;
}

export interface SystemSettingUpdateRequest {
  keyName: string;
  valueJson: unknown;
  description?: string;
}

export type AdaptiveExclusionReason =
  | "NONE"
  | "NO_SNAPSHOT_OR_DECISION"
  | "REJECTED_NO_SELECTION"
  | "MANUAL_ASSIGNMENT"
  | "SELF_ATTESTED_REVIEW"
  | "LEGACY_OUTCOME_V1"
  | "SYNTHETIC_ROW"
  | "INVALIDATED_OUTCOME"
  | "MISSING_COMPARISON_POOL"
  | "CHOSEN_CANDIDATE_NOT_IN_SNAPSHOT";

export interface AdaptiveCandidateFeatureRow {
  candidateId: number;
  fit: number;
  load: number;
  performanceInput: number;
  performanceStatus: string | null;
  recommended: boolean;
  selected: boolean;
}

export interface AdaptiveChosenOutcomeDiagnostics {
  outcomeId: string;
  evaluationId: number;
  evaluationVersion: number;
  evidenceStatus: string | null;
  qualityRating: number | null;
  rubricVersion: string | null;
  onTime: boolean | null;
  timelinessStatus: string | null;
  acceptedSubmittedAt: string | null;
  reviewedAt: string | null;
  commitmentDueAt: string | null;
}

export interface AdaptiveDatasetRow {
  rowId: string;
  snapshotId: string | null;
  decisionId: string | null;
  taskId: number | null;
  projectId: number | null;
  managerId: number | null;
  heuristicMode: string | null;
  scoringModelVersion: string | null;
  presentationContractVersion: string | null;
  weightVersion: string | null;
  selectedCandidateId: number | null;
  recommendedCandidateId: number | null;
  decisionType: string | null;
  selectedCandidateFit: number;
  selectedCandidateLoad: number;
  selectedCandidatePerformance: number;
  selectedCandidatePerformanceStatus: string | null;
  candidates: AdaptiveCandidateFeatureRow[];
  outcomeDiagnostics: AdaptiveChosenOutcomeDiagnostics | null;
}

export interface AdaptiveDatasetQualityReport {
  datasetVersion: string;
  scope: {
    projectId: number | null;
    managerId: number | null;
    heuristicMode: string | null;
    page: number;
    limit: number;
  };
  totalOutcomesEvaluated: number;
  eligibleSamplesCount: number;
  excludedSamplesCount: number;
  manualEvidenceCount: number;
  selfAttestedEvidenceCount: number;
  rejectedFeedbackCount: number;
  invalidatedOutcomesCount: number;
  legacyOutcomeCount: number;
  syntheticRowsCount: number;
  pendingJournalCount: number;
  failedJournalCount: number;
  exclusionBreakdown: Record<string, number>;
  canonicalDatasetSha256: string | null;
  sufficientEvidenceForProposal: boolean;
  minimumRequiredSamples: number;
  readinessStatus: string;
  readinessMessage: string;
  generatedAt: string;
  sampleRows: AdaptiveDatasetRow[];
}

export interface AdaptiveJournalReplayResult {
  replayedCount: number;
  pendingCount: number;
  failedCount: number;
}
