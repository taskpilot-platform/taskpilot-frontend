export type MeetingStatus = "ACTIVE" | "SCHEDULED" | "ENDING" | "ENDED";
export type MeetingRole = "HOST" | "PARTICIPANT";
export type MeetingRecordingStatus =
  | "IDLE"
  | "STARTING"
  | "RECORDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

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
  egressId?: string | null;
  recordingStatus?: MeetingRecordingStatus | null;
  recordingError?: string | null;
  backupStorageUsed?: boolean | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
  activeParticipantsCount: number;
  totalParticipantsCount: number;
  isHost: boolean;
}

export interface MeetingRecordingPlaybackResponse {
  url?: string | null;
  provider?: "b2" | "gdrive" | "s3" | string | null;
  requiresAuthHeader: boolean;
  contentType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  expiresAt?: string | null;
  recordingFileId?: number | null;
  egressId?: string | null;
  recordingStatus?: MeetingRecordingStatus | null;
  backupStorageUsed: boolean;
  recordingError?: string | null;
}

export interface PresignRecordingUploadRequest {
  contentType: string;
  fileName?: string;
}

export interface PresignRecordingUploadResponse {
  uploadUrl: string;
  uploadToken: string;
  contentType: string;
  fileName: string;
  maxFileSizeBytes: number;
  expiresAt: string;
}

export interface CompleteRecordingUploadRequest {
  uploadToken: string;
  durationSeconds?: number;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  recordingEnabled?: boolean;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
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

export interface MeetingRecordingDto {
  id: string;
  state: "REQUESTED" | "CAPTURING" | "FINALIZING" | "UPLOADING" | "READY" | "FAILED" | "INTERRUPTED";
  version: number;
  fileId?: number | null;
  durationMs?: number | null;
  mimeType?: string | null;
  createdAt: string;
  origin: "BROWSER" | "IMPORT";
  coverage: string;
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
