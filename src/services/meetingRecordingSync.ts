import { meetingService } from "./meeting.service";
import { meetingRecordingStore, type MeetingRecordingRecord } from "./meetingRecordingStore";
import { projectFilesService } from "./project-files.service";
import { getSessionGeneration } from "@/lib/http";

export const maxRecordingBytes = 50 * 1024 * 1024;

export async function recordingChecksum(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function recordingFilename(record: MeetingRecordingRecord) {
  const extension = record.mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  return `meeting_${record.meetingId}_rec_${record.recordingId}.${extension}`;
}

const pendingUploads = new Map<string, Promise<void>>();

export function syncMeetingRecording(record: MeetingRecordingRecord, generation = getSessionGeneration()): Promise<void> {
  const key = `${record.userId}/${record.projectId}/${record.meetingId}/${record.recordingId}`;
  const pending = pendingUploads.get(key);
  if (pending) return pending;

  const upload = uploadRecording(record, generation).finally(() => pendingUploads.delete(key));
  pendingUploads.set(key, upload);
  return upload;
}

async function uploadRecording(record: MeetingRecordingRecord, generation: number) {
  const requireSession = () => {
    if (getSessionGeneration() !== generation) throw new Error("Session changed during recording upload");
  };
  const { projectId, meetingId, recordingId, blob } = record;
  if (!blob?.size || blob.size > maxRecordingBytes) {
    throw new Error("The recording is empty or exceeds the upload limit");
  }
  requireSession();
  let remote = await meetingService.beginRecording(projectId, meetingId, {
    idempotencyKey: recordingId,
    origin: record.origin,
    coverage: record.coverage,
  });
  if (remote.state === "READY") {
    if (!remote.fileId) throw new Error("The recording file was removed from the project");
    await meetingRecordingStore.save({ ...record, blob: undefined, uploadState: "READY", fileId: remote.fileId })
      .catch(() => undefined);
    return;
  }

  if (remote.state === "CAPTURING") {
    requireSession();
    remote = await meetingService.markRecording(projectId, meetingId, recordingId, "FINALIZING", remote.version);
  }
  if (remote.state !== "UPLOADING") {
    requireSession();
    remote = await meetingService.markRecording(projectId, meetingId, recordingId, "UPLOADING", remote.version);
  }

  let fileId = record.fileId;
  if (!fileId) {
    const filename = recordingFilename(record);
    const findExistingFile = async () => {
      requireSession();
      const existing = await projectFilesService.getFiles(projectId, filename, 0, 20);
      return existing.data.content.find((file) =>
        file.originalName === filename && file.uploaderId === record.userId && file.fileSize === blob.size
      )?.id;
    };
    fileId = await findExistingFile();
    if (!fileId) {
      requireSession();
      try {
        const uploaded = await projectFilesService.uploadFile(
          projectId,
          new File([blob], filename, { type: record.mimeType }),
          `Meeting recording: ${record.title}`,
          AbortSignal.timeout(45_000)
        );
        fileId = uploaded.data?.id;
      } catch (error) {
        fileId = await findExistingFile().catch(() => undefined);
        if (!fileId) throw error;
      }
      if (!fileId) throw new Error("Recording upload did not return a file");
    }
  }

  record.fileId = fileId;
  record.uploadState = "UPLOADING";
  await meetingRecordingStore.save(record);
  const checksum = await recordingChecksum(blob);
  requireSession();
  await meetingService.finalizeRecording(projectId, meetingId, recordingId, {
    projectFileId: fileId,
    durationMs: record.durationMs,
    byteLength: blob.size,
    mimeType: record.mimeType,
    checksum,
    expectedVersion: remote.version,
  });
  record.uploadState = "READY";
  await meetingRecordingStore.save({ ...record, blob: undefined }).catch(() => undefined);
}
