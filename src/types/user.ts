export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  currentWorkload: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  skillId: number;
  name: string;
  level: number;
}

export interface SkillDirectoryItem {
  id: number;
  name: string;
  description: string | null;
}

export interface UpdateProfileRequest {
  fullName: string;
  avatarUrl: string | null;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AddSkillRequest {
  skillId: number;
  level: number;
}

export interface UpdateSkillRequest {
  level: number;
}
