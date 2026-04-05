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
  valueJson: any;
  description: string | null;
}

export interface SystemSettingUpdateRequest {
  keyName: string;
  valueJson: any;
  description?: string;
}
