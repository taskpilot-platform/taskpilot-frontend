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
