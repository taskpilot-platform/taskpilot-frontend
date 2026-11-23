import { api } from "@/lib/http";
import type {
  CompleteRecordingUploadRequest,
  CreateMeetingRequest,
  MeetingParticipantDto,
  MeetingRecordingPlaybackResponse,
  MeetingStatus,
  MeetingTokenResponse,
  PresignRecordingUploadRequest,
  PresignRecordingUploadResponse,
  ProjectMeetingDto,
} from "@/types/meeting";

const unwrap = <T>(r: any): T => {
  if (!r) return r;
  if (r.data !== undefined) {
    return unwrap<T>(r.data);
  }
  return r as T;
};

export const meetingService = {
  getMeetings: (projectId: number, status?: MeetingStatus): Promise<ProjectMeetingDto[]> =>
    api
      .get<ProjectMeetingDto[]>(`/v1/projects/${projectId}/meetings`, {
        ...(status ? { status } : {}),
      })
      .then(unwrap<ProjectMeetingDto[]>),

  getActiveMeeting: (projectId: number): Promise<ProjectMeetingDto | null> =>
    api
      .get<ProjectMeetingDto | null>(`/v1/projects/${projectId}/meetings/active`)
      .then(unwrap<ProjectMeetingDto | null>),

  getMeetingById: (projectId: number, meetingId: number): Promise<ProjectMeetingDto> =>
    api
      .get<ProjectMeetingDto>(`/v1/projects/${projectId}/meetings/${meetingId}`)
      .then(unwrap<ProjectMeetingDto>),

  createMeeting: (projectId: number, payload: CreateMeetingRequest): Promise<ProjectMeetingDto> =>
    api
      .post<ProjectMeetingDto>(`/v1/projects/${projectId}/meetings`, payload)
      .then(unwrap<ProjectMeetingDto>),

  joinMeeting: (projectId: number, meetingId: number): Promise<MeetingTokenResponse> =>
    api
      .post<MeetingTokenResponse>(`/v1/projects/${projectId}/meetings/${meetingId}/join`)
      .then(unwrap<MeetingTokenResponse>),

  leaveMeeting: (projectId: number, meetingId: number): Promise<void> =>
    api
      .post<void>(`/v1/projects/${projectId}/meetings/${meetingId}/leave`)
      .then(() => {}),

  endMeeting: (projectId: number, meetingId: number): Promise<ProjectMeetingDto> =>
    api
      .patch<ProjectMeetingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/end`)
      .then(unwrap<ProjectMeetingDto>),

  updateRecordingFile: (
    projectId: number,
    meetingId: number,
    recordingFileId: number
  ): Promise<ProjectMeetingDto> =>
    api
      .patch<ProjectMeetingDto>(
        `/v1/projects/${projectId}/meetings/${meetingId}/recording`,
        { recordingFileId }
      )
      .then(unwrap<ProjectMeetingDto>),

  startRecording: (projectId: number, meetingId: number): Promise<ProjectMeetingDto> =>
    api
      .post<ProjectMeetingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/recording/start`)
      .then(unwrap<ProjectMeetingDto>),

  stopRecording: (projectId: number, meetingId: number): Promise<ProjectMeetingDto> =>
    api
      .post<ProjectMeetingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/recording/stop`)
      .then(unwrap<ProjectMeetingDto>),

  syncRecording: (projectId: number, meetingId: number): Promise<ProjectMeetingDto> =>
    api
      .post<ProjectMeetingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/recording/sync`)
      .then(unwrap<ProjectMeetingDto>),

  getRecordingPlaybackUrl: (
    projectId: number,
    meetingId: number
  ): Promise<MeetingRecordingPlaybackResponse> =>
    api
      .get<MeetingRecordingPlaybackResponse>(
        `/v1/projects/${projectId}/meetings/${meetingId}/recording/playback-url`
      )
      .then(unwrap<MeetingRecordingPlaybackResponse>),

  presignFallbackUpload: (
    projectId: number,
    meetingId: number,
    payload: PresignRecordingUploadRequest
  ): Promise<PresignRecordingUploadResponse> =>
    api
      .post<PresignRecordingUploadResponse>(
        `/v1/projects/${projectId}/meetings/${meetingId}/recording/presign-upload`,
        payload
      )
      .then(unwrap<PresignRecordingUploadResponse>),

  completeFallbackUpload: (
    projectId: number,
    meetingId: number,
    payload: CompleteRecordingUploadRequest
  ): Promise<ProjectMeetingDto> =>
    api
      .post<ProjectMeetingDto>(
        `/v1/projects/${projectId}/meetings/${meetingId}/recording/complete-upload`,
        payload
      )
      .then(unwrap<ProjectMeetingDto>),

  uploadFallbackRecordingToB2: async (
    projectId: number,
    meetingId: number,
    blob: Blob,
    options?: { fileName?: string; durationSeconds?: number }
  ): Promise<ProjectMeetingDto> => {
    const rawContentType = blob.type || "video/webm";
    const presigned = await meetingService.presignFallbackUpload(projectId, meetingId, {
      contentType: rawContentType,
      fileName: options?.fileName,
    });

    if (blob.size > presigned.maxFileSizeBytes) {
      throw new Error(
        `Recording exceeds maximum allowed size (${Math.round(presigned.maxFileSizeBytes / (1024 * 1024))} MB)`
      );
    }

    const putRes = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": presigned.contentType,
      },
      body: blob,
    });

    if (!putRes.ok) {
      throw new Error(`Backblaze B2 direct upload failed (HTTP ${putRes.status})`);
    }

    return meetingService.completeFallbackUpload(projectId, meetingId, {
      uploadToken: presigned.uploadToken,
      durationSeconds: options?.durationSeconds,
    });
  },

  getParticipants: (projectId: number, meetingId: number): Promise<MeetingParticipantDto[]> =>
    api
      .get<MeetingParticipantDto[]>(`/v1/projects/${projectId}/meetings/${meetingId}/participants`)
      .then(unwrap<MeetingParticipantDto[]>),

  getMyMeetings: (): Promise<ProjectMeetingDto[]> =>
    api
      .get<ProjectMeetingDto[]>(`/v1/meetings/my`)
      .then(unwrap<ProjectMeetingDto[]>),
};
