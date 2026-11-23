import { api, getSessionGeneration } from "@/lib/http";
import type {
  CompleteRecordingUploadRequest,
  CreateMeetingRequest,
  MeetingParticipantDto,
  MeetingRecordingPlaybackResponse,
  MeetingRecordingDto,
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

  confirmAttendance: (projectId: number, meetingId: number, participantSid: string) =>
    api.post(`/v1/projects/${projectId}/meetings/${meetingId}/attendance`, { participantSid }),

  leaveMeeting: (projectId: number, meetingId: number, participantSid?: string): Promise<void> =>
    api
      .post<void>(`/v1/projects/${projectId}/meetings/${meetingId}/leave`, participantSid ? { participantSid } : undefined,
        { timeout: 5_000 })
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
    meetingId: number,
    fileId?: number
  ): Promise<MeetingRecordingPlaybackResponse> =>
    api
      .get<MeetingRecordingPlaybackResponse>(
        `/v1/projects/${projectId}/meetings/${meetingId}/recording/playback-url`,
        fileId != null ? { fileId } : undefined
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
    options?: {
      fileName?: string;
      durationSeconds?: number;
      origin?: "BROWSER" | "IMPORT";
      coverage?: string;
      clientRecordingId?: string;
      pendingUpload?: { uploadToken: string; expiresAt?: string | null; uploaded: boolean };
      onUploadReceipt?: (
        receipt: { uploadToken: string; expiresAt?: string | null; uploaded: boolean } | undefined
      ) => Promise<void> | void;
      signal?: AbortSignal;
      putTimeoutMs?: number;
    }
  ): Promise<ProjectMeetingDto> => {
    const generation = getSessionGeneration();
    const requireSession = () => {
      if (generation !== getSessionGeneration()) throw new Error("Session changed during recording upload");
      if (options?.signal?.aborted) throw new DOMException("Recording upload aborted", "AbortError");
    };
    const completePayload = (uploadToken: string): CompleteRecordingUploadRequest => ({
      uploadToken,
      durationSeconds: options?.durationSeconds,
      ...(options?.origin ? { origin: options.origin } : {}),
      ...(options?.coverage ? { coverage: options.coverage } : {}),
      ...(options?.clientRecordingId ? { clientRecordingId: options.clientRecordingId } : {}),
    });

    if (!blob.size) throw new Error("The recording is empty");
    requireSession();

    // F4: If a previous attempt already uploaded the bytes to B2 and only lost the complete response,
    // replay completeFallbackUpload using the persisted uploadToken instead of performing a second PUT.
    const existingReceipt = options?.pendingUpload;
    if (existingReceipt?.uploaded && existingReceipt.uploadToken) {
      const expiresMs = existingReceipt.expiresAt ? Date.parse(existingReceipt.expiresAt) : Number.NaN;
      const receiptStillValid = Number.isNaN(expiresMs) || expiresMs > Date.now() + 5_000;
      if (receiptStillValid) {
        try {
          const replayed = await meetingService.completeFallbackUpload(
            projectId,
            meetingId,
            completePayload(existingReceipt.uploadToken)
          );
          await options?.onUploadReceipt?.(undefined);
          return replayed;
        } catch (err: unknown) {
          const status =
            (err as { response?: { status?: number }; status?: number })?.response?.status ??
            (err as { status?: number })?.status;
          // Clear receipt only on definitive 4xx rejection (expired token/reservation/invalid object);
          // keep receipt on ambiguous network/5xx errors so the next retry still replays without duplicating PUT.
          if (typeof status === "number" && status >= 400 && status < 500) {
            await options?.onUploadReceipt?.(undefined);
          } else {
            throw err;
          }
        }
      } else {
        await options?.onUploadReceipt?.(undefined);
      }
    }

    requireSession();
    const rawContentType = blob.type || "video/webm";
    const presigned = await meetingService.presignFallbackUpload(projectId, meetingId, {
      contentType: rawContentType,
      fileName: options?.fileName,
      ...(options?.clientRecordingId ? { clientRecordingId: options.clientRecordingId } : {}),
    });

    requireSession();
    if (presigned.alreadyCompleted) {
      await options?.onUploadReceipt?.(undefined);
      const latestMeeting = await meetingService.getMeetingById(projectId, meetingId);
      return {
        ...latestMeeting,
        completedRecordingFileId: presigned.existingFileId ?? latestMeeting.recordingFileId ?? undefined,
      };
    }

    if (!presigned.uploadUrl || !presigned.uploadToken) {
      throw new Error("Server did not return a valid Backblaze B2 upload target");
    }

    if (blob.size > presigned.maxFileSizeBytes) {
      throw new Error(
        `Recording exceeds maximum allowed size (${Math.round(presigned.maxFileSizeBytes / (1024 * 1024))} MB)`
      );
    }

    // F5: Bound direct B2 PUT with an application timeout and optional caller AbortSignal.
    const putTimeoutMs = options?.putTimeoutMs ?? 120_000;
    const putController = new AbortController();
    const onCallerAbort = () => putController.abort();
    options?.signal?.addEventListener("abort", onCallerAbort, { once: true });
    const timeoutId = setTimeout(() => putController.abort(), putTimeoutMs);

    let putRes: Response;
    try {
      putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": presigned.contentType,
        },
        body: blob,
        signal: putController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      options?.signal?.removeEventListener("abort", onCallerAbort);
    }

    if (!putRes.ok) {
      throw new Error(`Backblaze B2 direct upload failed (HTTP ${putRes.status})`);
    }

    // Persist upload receipt immediately after PUT succeeds (even if complete-upload response is later lost).
    const tokenExpiryMs = Math.max(
      presigned.expiresAt ? Date.parse(presigned.expiresAt) || 0 : 0,
      Date.now() + 55 * 60_000
    );
    await options?.onUploadReceipt?.({
      uploadToken: presigned.uploadToken,
      expiresAt: new Date(tokenExpiryMs).toISOString(),
      uploaded: true,
    });

    requireSession();
    const completed = await meetingService.completeFallbackUpload(
      projectId,
      meetingId,
      completePayload(presigned.uploadToken)
    );
    await options?.onUploadReceipt?.(undefined);
    return completed;
  },
  getRecordings: (projectId: number, meetingId: number) =>
    api.get<MeetingRecordingDto[]>(`/v1/projects/${projectId}/meetings/${meetingId}/recordings`)
      .then(unwrap<MeetingRecordingDto[]>),

  beginRecording: (projectId: number, meetingId: number, payload: {
    idempotencyKey: string;
    origin: "BROWSER" | "IMPORT";
    coverage: string;
  }) => api.post<MeetingRecordingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/recordings`, payload,
    { timeout: 10_000 }).then(unwrap<MeetingRecordingDto>),

  markRecording: (projectId: number, meetingId: number, recordingId: string,
    state: "CAPTURING" | "FINALIZING" | "UPLOADING" | "FAILED", version: number) =>
    api.post<MeetingRecordingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/recordings/${recordingId}/state`,
      { state, expectedVersion: version }, { timeout: 10_000 }).then(unwrap<MeetingRecordingDto>),

  finalizeRecording: (projectId: number, meetingId: number, recordingId: string, payload: {
    projectFileId: number;
    durationMs?: number;
    byteLength: number;
    mimeType: string;
    checksum: string;
    expectedVersion: number;
  }) => api.post<MeetingRecordingDto>(`/v1/projects/${projectId}/meetings/${meetingId}/recordings/${recordingId}/finalize`,
    payload, { timeout: 15_000 }).then(unwrap<MeetingRecordingDto>),

  getParticipants: (projectId: number, meetingId: number): Promise<MeetingParticipantDto[]> =>
    api
      .get<MeetingParticipantDto[]>(`/v1/projects/${projectId}/meetings/${meetingId}/participants`)
      .then(unwrap<MeetingParticipantDto[]>),

  getMyMeetings: (): Promise<ProjectMeetingDto[]> =>
    api
      .get<ProjectMeetingDto[]>(`/v1/meetings/my`)
      .then(unwrap<ProjectMeetingDto[]>),
};
