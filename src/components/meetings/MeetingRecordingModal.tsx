import { useEffect, useRef, useState } from "react";
import { Download, Upload, Video, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { meetingService } from "@/services/meeting.service";
import { meetingRecordingStore, type MeetingRecordingRecord } from "@/services/meetingRecordingStore";
import { maxRecordingBytes, recordingChecksum, syncMeetingRecording } from "@/services/meetingRecordingSync";
import { projectFilesService } from "@/services/project-files.service";
import type { MeetingRecordingDto, MeetingRecordingPlaybackResponse, ProjectMeetingDto } from "@/types/meeting";
import { getSessionGeneration } from "@/lib/http";

const sampleChecksum = "560a6e704000aa1035f92419b72b4f59aacd7d307fea059410be4e4eef892cf6";

type PlaybackState = "loading" | "ready" | "local" | "unavailable" | "denied" | "error";

interface Clip {
  key: string;
  fileId?: number;
  local?: MeetingRecordingRecord;
  createdAt: string;
  legacy?: boolean;
  cloud?: MeetingRecordingPlaybackResponse;
}

function resolvePlaybackUrl(rawUrl: string) {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "";
  if (/^https?:\/\//i.test(apiBase)) return `${apiBase.replace(/\/api\/?$/i, "").replace(/\/+$/, "")}/${rawUrl.replace(/^\/+/, "")}`;
  return rawUrl;
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const result = error as { status?: number; response?: { status?: number } };
  return result.response?.status ?? result.status;
}

export function MeetingRecordingModal({
  isOpen, onClose, meeting, currentUserId, onUpdated, onMeetingUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  meeting: ProjectMeetingDto | null;
  currentUserId?: number | null;
  onUpdated?: () => void;
  onMeetingUpdated?: (meeting: ProjectMeetingDto) => void;
}) {
  const { t, i18n } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [chosenKey, setChosenKey] = useState("");
  const [listVersion, setListVersion] = useState(0);
  const [state, setState] = useState<PlaybackState>("loading");
  const [video, setVideo] = useState<{ url: string; type: string; clipKey: string }>();
  const [localPlaybackBlob, setLocalPlaybackBlob] = useState<Blob>();
  const [busy, setBusy] = useState(false);
  const [playbackInfo, setPlaybackInfo] = useState<MeetingRecordingPlaybackResponse>();
  const operation = useRef(0);
  const projectId = meeting?.projectId;
  const meetingId = meeting?.id;
  const legacyFileId = meeting?.recordingFileId;
  const chosen = clips.find((clip) => clip.key === chosenKey);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    operation.current += 1;
    if (!isOpen || !projectId || !meetingId) return;
    let active = true;
    const generation = getSessionGeneration();
    const current = () => active && generation === getSessionGeneration();
    const load = async () => {
      setState("loading");
      setBusy(false);
      setVideo(undefined);
      setClips([]);
      setChosenKey("");
      setPlaybackInfo(undefined);
      let cloud: MeetingRecordingPlaybackResponse | undefined;
      try {
        if (typeof meetingService.getRecordingPlaybackUrl === "function") {
          cloud = await meetingService.getRecordingPlaybackUrl(projectId, meetingId);
          if (!current()) return;
          setPlaybackInfo(cloud);
        }
      } catch (error) {
        if (errorStatus(error) === 403 || errorStatus(error) === 401) {
          if (current()) setState("denied");
          return;
        }
      }
      let remote: MeetingRecordingDto[] = [];
      let listFailed = false;
      try {
        if (typeof meetingService.getRecordings === "function") remote = await meetingService.getRecordings(projectId, meetingId);
      } catch (error) {
        const status = errorStatus(error);
        if (status === 403 || status === 401) {
          if (current()) setState("denied");
          return;
        }
        listFailed = status !== 404;
      }
      if (!current()) return;
      const ready: Clip[] = remote.flatMap((clip) =>
        clip.state === "READY" && clip.fileId
          ? [{ key: clip.id, fileId: clip.fileId, createdAt: clip.createdAt }]
          : []
      );
      if (cloud?.url) ready.unshift({ key: "cloud", createdAt: "", cloud });
      if (legacyFileId && !cloud?.url && !ready.some((clip) => clip.fileId === legacyFileId)) {
        ready.push({ key: `legacy-${legacyFileId}`, fileId: legacyFileId, createdAt: "", legacy: true });
      }

      const recovery = currentUserId
        ? await meetingRecordingStore.list({ projectId, meetingId, userId: currentUserId }).catch(() => [])
        : [];
      if (!current()) return;
      const list = [
        ...ready,
        ...recovery.filter((record) => record.uploadState !== "READY" && !ready.some((clip) => clip.key === record.recordingId))
          .map((local) => ({ key: local.recordingId, local, createdAt: local.recordedAt })),
      ];
      setClips(list);
      setChosenKey(list[0]?.key ?? "");
      if (!list.length) setState(listFailed ? "error" : "unavailable");
    };
    void load();
    return () => { active = false; operation.current += 1; };
  }, [isOpen, projectId, meetingId, legacyFileId, currentUserId, listVersion]);

  useEffect(() => {
    if (!isOpen || !projectId || !chosen) return;
    let active = true;
    const generation = getSessionGeneration();
    const current = () => active && generation === getSessionGeneration();
    let url: string | undefined;
    setState("loading");
    setVideo(undefined);
    setLocalPlaybackBlob(undefined);
    const load = async () => {
      try {
        if (chosen.cloud?.url) {
          if (current()) {
            setVideo({ url: resolvePlaybackUrl(chosen.cloud.url), type: chosen.cloud.contentType || "video/mp4", clipKey: chosen.key });
            setState("ready");
          }
          return;
        }
        const blob = chosen.fileId
          ? await projectFilesService.downloadFileBlob(projectId, chosen.fileId)
          : chosen.local?.blob ?? (chosen.local && await meetingRecordingStore.recoverChunks(chosen.local));
        if (!current()) return;
        const wasDemoFile = chosen.legacy && blob?.size === 2_019_927 && await recordingChecksum(blob) === sampleChecksum;
        if (!current()) return;
        if (!blob?.size || wasDemoFile) {
          setState("unavailable");
          return;
        }
        url = URL.createObjectURL(blob);
        setVideo({ url, type: blob.type, clipKey: chosen.key });
        setLocalPlaybackBlob(chosen.fileId ? undefined : blob);
        setState(chosen.fileId ? "ready" : "local");
      } catch (error) {
        if (!current()) return;
        const status = errorStatus(error);
        setState(status === 403 || status === 401 ? "denied" : status === 404 ? "unavailable" : "error");
      }
    };
    void load();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, projectId, chosen]);

  const synchronize = async (record: MeetingRecordingRecord, generation: number) => {
    const version = operation.current;
    const isCurrent = () => mounted.current && getSessionGeneration() === generation && operation.current === version;
    if (!isCurrent()) return;
    setBusy(true);
    try {
      if (record.uploadTarget === "B2") {
        const updated = await meetingService.uploadFallbackRecordingToB2(record.projectId, record.meetingId, record.blob!, {
          fileName: `meeting_${record.meetingId}_fallback_${record.recordingId}.${record.mimeType.startsWith("video/mp4") ? "mp4" : "webm"}`,
          durationSeconds: record.durationMs ? Math.round(record.durationMs / 1000) : undefined,
        });
        await meetingRecordingStore.save({ ...record, uploadState: "READY", fileId: updated.recordingFileId ?? undefined });
        if (isCurrent()) onMeetingUpdated?.(updated);
      } else {
        await syncMeetingRecording(record, generation);
      }
      if (!isCurrent()) return;
      toast.success(t("meetings.recording_shared", { defaultValue: "Bản ghi đã sẵn sàng cho dự án" }));
      onUpdated?.();
      setListVersion((version) => version + 1);
    } catch {
      if (isCurrent()) toast.warning(t("meetings.recording_recoverable_upload_failure", {
        defaultValue: "Chưa gửi được bản ghi. Bạn có thể thử tải lên lại hoặc tải tệp xuống.",
      }));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  const importRecording = async (file: File | undefined) => {
    if (!file || !meeting?.isHost || !currentUserId || busy) return;
    const generation = getSessionGeneration();
    const version = operation.current;
    if (!/^video\/(webm|mp4)$/.test(file.type) || !file.size || file.size > maxRecordingBytes) {
      toast.warning(t("meetings.import_recording_limit", { defaultValue: "Chọn video WebM hoặc MP4 tối đa 50 MiB." }));
      return;
    }
    const record: MeetingRecordingRecord = {
      userId: currentUserId,
      projectId: meeting.projectId,
      meetingId: meeting.id,
      recordingId: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      title: meeting.title,
      mimeType: file.type,
      origin: "IMPORT",
      uploadTarget: "B2",
      coverage: "IMPORTED_FILE",
      uploadState: "LOCAL_ONLY",
      blob: file,
    };
    try {
      setBusy(true);
      await meetingRecordingStore.save(record);
    } catch {
      if (mounted.current && getSessionGeneration() === generation) {
        setBusy(false);
        toast.error(t("meetings.recording_store_failed", { defaultValue: "Thiết bị không lưu được dữ liệu bản ghi." }));
      }
      return;
    }
    if (!mounted.current || getSessionGeneration() !== generation || operation.current !== version) return;
    await synchronize(record, generation);
    if (mounted.current && getSessionGeneration() === generation) setListVersion((version) => version + 1);
  };

  const syncCloudStatus = async () => {
    if (!meeting || busy) return;
    const generation = getSessionGeneration();
    const version = operation.current;
    setBusy(true);
    try {
      const updated = await meetingService.syncRecording(meeting.projectId, meeting.id);
      if (!mounted.current || generation !== getSessionGeneration() || version !== operation.current) return;
      onMeetingUpdated?.(updated);
      setListVersion((value) => value + 1);
    } catch {
      if (mounted.current && generation === getSessionGeneration() && version === operation.current)
        toast.error(t("meetings.sync_recording_failed", { defaultValue: "Không thể đồng bộ trạng thái bản ghi" }));
    } finally {
      if (mounted.current && generation === getSessionGeneration() && version === operation.current) setBusy(false);
    }
  };
  const cloudStatus = playbackInfo?.recordingStatus ?? meeting?.recordingStatus;
  const processing = ["STARTING", "RECORDING", "PROCESSING"].includes(cloudStatus || "");
  const backupStorageUsed = playbackInfo?.backupStorageUsed ?? meeting?.backupStorageUsed;
  const egressId = playbackInfo?.egressId ?? meeting?.egressId;
  const isPlayerVisible = (state === "ready" || state === "local") && video?.clipKey === chosenKey;
  const unavailableMessages = {
    loading: t("meetings.loading_recording", { defaultValue: "Đang tải bản ghi…" }),
    unavailable: t("meetings.recording_unavailable", { defaultValue: "Chưa có bản ghi để xem." }),
    denied: t("meetings.recording_denied", { defaultValue: "Bạn không có quyền xem bản ghi này." }),
    error: t("meetings.recording_load_error", { defaultValue: "Không thể tải bản ghi. Hãy thử lại." }),
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogTitle className="flex items-center gap-2">
          <Video className="size-5 text-emerald-600" />
          {meeting?.title || t("meetings.recording_title", { defaultValue: "Bản ghi hình cuộc họp" })}
        </DialogTitle>
        <DialogDescription>{meeting?.hostName}</DialogDescription>
        {clips.length > 1 && (
          <select className="w-full rounded-md border bg-background p-2 text-sm" value={chosenKey}
            aria-label={t("meetings.choose_recording", { defaultValue: "Chọn bản ghi" })}
            onChange={(event) => setChosenKey(event.target.value)}>
            {clips.map((clip, index) => (
              <option key={clip.key} value={clip.key}>
                {clip.createdAt ? new Date(clip.createdAt).toLocaleString(i18n.language) : `#${index + 1}`}
                {clip.local ? ` · ${t("meetings.local_copy", { defaultValue: "Chỉ có trên thiết bị này" })}` : ""}
              </option>
            ))}
          </select>
        )}
        {isPlayerVisible && video ? (
          <>
            <video src={video.url} controls playsInline className="aspect-video w-full rounded-lg bg-black"
              data-testid="recording-video-player" onError={() => setState("error")} />
            {state === "local" && (
              <p role="status" className="text-sm text-muted-foreground" data-testid="local-fallback-recording-badge">
                {t("meetings.local_copy", { defaultValue: "Chỉ có trên thiết bị này" })}
              </p>
            )}
          </>
        ) : state === "unavailable" && (processing || backupStorageUsed) ? (
          <div className="flex aspect-video flex-col items-center justify-center rounded-lg border p-6 text-center gap-3"
            role="status" data-testid={backupStorageUsed ? "recording-backup-storage-alert" : "recording-processing-view"}>
            <p>{backupStorageUsed
              ? t("meetings.backup_storage_title", { defaultValue: "Bản ghi nằm trong kho lưu trữ dự phòng của LiveKit Cloud" })
              : t("meetings.recording_processing_title", { defaultValue: "Bản ghi đám mây đang được xử lý" })}</p>
            {egressId && <p className="font-mono text-xs">Egress ID: {egressId}</p>}
            <Button variant="outline" disabled={busy} onClick={() => void syncCloudStatus()} data-testid="sync-recording-btn">
              <RefreshCw className="size-4" />{t("meetings.sync_recording_status", { defaultValue: "Đồng bộ trạng thái" })}
            </Button>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
            role="status" data-testid={`recording-${isPlayerVisible ? "loading" : state}`}>
            {state === "ready" || state === "local" ? unavailableMessages.loading : unavailableMessages[state]}
          </div>
        )}
        <DialogFooter className="gap-2">
          {state === "error" && (
            <Button variant="outline" onClick={() => setListVersion((version) => version + 1)}>
              {t("common.retry", { defaultValue: "Thử lại" })}
            </Button>
          )}
          {isPlayerVisible && video && (
            <Button asChild variant="outline" data-testid="download-recording-btn">
              <a href={video.url} download={`meeting_${meetingId}_recording.${video.type.startsWith("video/mp4") ? "mp4" : "webm"}`}>
                <Download className="size-4" />
                {t("meetings.download_recording", { defaultValue: "Tải video" })}
              </a>
            </Button>
          )}
          {state === "local" && chosen?.local && localPlaybackBlob && meeting?.isHost && (
            <Button disabled={busy} onClick={() => { if (chosen.local && localPlaybackBlob) void synchronize({ ...chosen.local, blob: localPlaybackBlob }, getSessionGeneration()); }} data-testid="retry-local-b2-upload-btn">
              {t("meetings.retry_recording_upload", { defaultValue: "Thử tải lên lại" })}
            </Button>
          )}
          {meeting?.isHost && currentUserId && state !== "denied" && (
            <>
              <Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" />
                {t("meetings.import_recording", { defaultValue: "Nhập tệp ghi hình" })}
              </Button>
              <input data-testid="custom-recording-upload-input" ref={fileInput} type="file" accept="video/webm,video/mp4" className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void importRecording(file);
                }} />
            </>
          )}
          <Button variant="ghost" onClick={onClose}>{t("common.close", { defaultValue: "Đóng" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
