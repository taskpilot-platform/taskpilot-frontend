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
