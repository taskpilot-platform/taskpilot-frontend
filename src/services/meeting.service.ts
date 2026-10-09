import { api } from "@/lib/http";
import type {
  CreateMeetingRequest,
  MeetingParticipantDto,
  MeetingStatus,
  MeetingTokenResponse,
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

  getParticipants: (projectId: number, meetingId: number): Promise<MeetingParticipantDto[]> =>
    api
      .get<MeetingParticipantDto[]>(`/v1/projects/${projectId}/meetings/${meetingId}/participants`)
      .then(unwrap<MeetingParticipantDto[]>),

  getMyMeetings: (): Promise<ProjectMeetingDto[]> =>
    api
      .get<ProjectMeetingDto[]>(`/v1/meetings/my`)
      .then(unwrap<ProjectMeetingDto[]>),
};
