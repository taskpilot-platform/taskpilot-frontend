import fixWebmDuration from "fix-webm-duration";
import { meetingRecordingStore, type MeetingRecordingRecord } from "./meetingRecordingStore";

export const clipDurationMs = 5 * 60_000;
const warnRecordingBytes = 40 * 1024 * 1024;
const stopRecordingBytes = 45 * 1024 * 1024;

export function createMeetingCapture(
  source: MediaStream,
  ownsSource: boolean,
  micTrack: MediaStreamTrack | undefined
) {
  const video = source.getVideoTracks()[0];
  if (!video || video.readyState === "ended") throw new Error("Screen capture ended");

  const sourceAudio = source.getAudioTracks().filter((track) => track.readyState === "live");
  const mic = micTrack?.readyState === "live" && micTrack.enabled ? micTrack.clone() : undefined;
  let audioContext: AudioContext | undefined;
  let mixed: MediaStream | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    mic?.stop();
    mixed?.getTracks().forEach((track) => track.stop());
    if (ownsSource) source.getTracks().forEach((track) => track.stop());
    if (audioContext) void audioContext.close().catch(() => undefined);
  };

  try {
    if (mic && sourceAudio.length) {
      audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      for (const track of [...sourceAudio, mic]) {
        audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
      }
      mixed = destination.stream;
      const context = audioContext;
      const ready = context.resume();
      return {
        video,
        stream: new MediaStream([video, ...mixed.getAudioTracks()]),
        coverage: "SCREEN_SOURCE_AUDIO_LOCAL_MIC",
        ready,
        dispose,
        setMicEnabled: (enabled: boolean) => { mic.enabled = enabled; },
      };
    }
    return {
      video,
      stream: new MediaStream([video, ...sourceAudio, ...(mic ? [mic] : [])]),
      coverage: mic ? "SCREEN_LOCAL_MIC" : sourceAudio.length ? "SCREEN_SOURCE_AUDIO" : "SCREEN_ONLY",
      ready: Promise.resolve(),
      dispose,
      setMicEnabled: (enabled: boolean) => { if (mic) mic.enabled = enabled; },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

export function startMeetingCapture(
  input: ReturnType<typeof createMeetingCapture>,
  draft: MeetingRecordingRecord,
  callbacks: { onFinalizing: () => void; onSizeWarning: () => void; onStorageError: () => void }
) {
  const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    .find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("No supported video recording format");

  const recorder = new MediaRecorder(input.stream, {
    mimeType,
    videoBitsPerSecond: 1_000_000,
    audioBitsPerSecond: 128_000,
  });
  draft.mimeType = (recorder.mimeType || mimeType).split(";", 1)[0];
  const startedAt = Date.now();
  const chunks: Blob[] = [];
  let writes: Promise<unknown> = meetingRecordingStore.save(draft);
  let bytes = 0;
  let storageFailed = false;
  let recorderFailed = false;
  let stopRequested = false;
  let stopTimestamp: number | undefined;
  let resolve: (value: { record: MeetingRecordingRecord; durable: boolean; interrupted: boolean }) => void;
  const finished = new Promise<{
    record: MeetingRecordingRecord;
    durable: boolean;
    interrupted: boolean;
  }>((done) => { resolve = done; });

  const reportStorageError = () => {
    if (!storageFailed) callbacks.onStorageError();
    storageFailed = true;
  };
  void writes.catch(reportStorageError);

  function requestStop() {
    if (stopRequested) return;
    stopRequested = true;
    stopTimestamp = Date.now();
    callbacks.onFinalizing();
    if (recorder.state !== "inactive") recorder.stop();
  }

  recorder.ondataavailable = ({ data }) => {
    if (!data.size) return;
    const index = chunks.length;
    chunks.push(data);
    const previousBytes = bytes;
    bytes += data.size;
    writes = writes.then(() => meetingRecordingStore.appendChunk(draft, index, data)).catch(reportStorageError);
    if (previousBytes < warnRecordingBytes && bytes >= warnRecordingBytes) callbacks.onSizeWarning();
    if (bytes >= stopRecordingBytes) requestStop();
  };

  recorder.onerror = () => {
    recorderFailed = true;
    requestStop();
  };
  recorder.onstop = async () => {
    clearTimeout(limit);
    input.video.removeEventListener("ended", requestStop);
    input.dispose();
    const durationMs = Math.max(1, (stopTimestamp ?? Date.now()) - startedAt);
    let blob = new Blob(chunks, { type: draft.mimeType });
    if (blob.size && draft.mimeType.startsWith("video/webm")) {
      blob = await fixWebmDuration(blob, durationMs, { logger: false }).catch(() => blob);
    }
    const record: MeetingRecordingRecord = { ...draft, blob, durationMs, uploadState: "LOCAL_ONLY" };
    await writes.catch(reportStorageError);
    let durable = false;
    try {
      await meetingRecordingStore.save(record);
      durable = true;
      // A completed record is visible even if cleanup needs to be retried.
      await meetingRecordingStore.clearChunks(record).catch(() => undefined);
    } catch {
      reportStorageError();
    }
    resolve({ record, durable, interrupted: recorderFailed });
  };

  recorder.start(1_000);
  const limit = setTimeout(requestStop, clipDurationMs);
  input.video.addEventListener("ended", requestStop, { once: true });

  return {
    finished,
    stop: () => {
      requestStop();
      return finished;
    },
    setMicEnabled: input.setMicEnabled,
  };
}
