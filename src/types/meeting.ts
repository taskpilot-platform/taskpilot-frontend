export type MeetingStatus = "ACTIVE" | "SCHEDULED" | "ENDED";
export type MeetingRole = "HOST" | "PARTICIPANT";

export interface ProjectMeetingDto {
  id: number;
  projectId: number;
  hostId: number;
  hostName: string;
  hostAvatarUrl?: string | null;
  title: string;
  description?: string | null;
  roomName: string;
  status: MeetingStatus;
  recordingEnabled: boolean;
  recordingFileId?: number | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
  activeParticipantsCount: number;
  totalParticipantsCount: number;
  isHost: boolean;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  recordingEnabled?: boolean;
}

export interface MeetingTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  identity: string;
  participantName: string;
  isHost: boolean;
  meeting: ProjectMeetingDto;
}

export interface MeetingParticipantDto {
  id: number;
  meetingId: number;
  userId: number;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: MeetingRole;
  joinedAt: string;
  leftAt?: string | null;
  isActive: boolean;
}
