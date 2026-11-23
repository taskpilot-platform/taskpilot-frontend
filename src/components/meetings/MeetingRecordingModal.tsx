import React, { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Download, Play, Clock, User, AlertCircle, Upload, RefreshCw, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import { projectFilesService } from "@/services/project-files.service";
import { meetingService } from "@/services/meeting.service";
import fixWebmDuration from "fix-webm-duration";
import type { MeetingRecordingPlaybackResponse, ProjectMeetingDto } from "@/types/meeting";

async function findLegacyRecordingId(meeting: ProjectMeetingDto): Promise<number | null> {
  if (!meeting.projectId) return null;
  const prefix = `meeting_${meeting.id}_rec_`;
  const res = await projectFilesService.getFiles(meeting.projectId, prefix, 0, 50);
  const hits = (res?.data?.content ?? []).filter((f) => f.originalName?.startsWith(prefix));
  return hits.length ? Math.max(...hits.map((f) => f.id)) : null;
}

function resolvePlaybackUrl(rawUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "";
  if (/^https?:\/\//i.test(apiBase)) {
    const origin = apiBase.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
    return rawUrl.startsWith("/") ? `${origin}${rawUrl}` : `${origin}/${rawUrl}`;
  }
  return rawUrl;
}

interface MeetingRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: ProjectMeetingDto | null;
  onMeetingUpdated?: (meeting: ProjectMeetingDto) => void;
}

export function MeetingRecordingModal({
  isOpen,
  onClose,
  meeting,
  onMeetingUpdated,
}: MeetingRecordingModalProps) {
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<MeetingRecordingPlaybackResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocalFallbackOnly, setIsLocalFallbackOnly] = useState(false);
  const [isRetryingLocalUpload, setIsRetryingLocalUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeCurrentObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const loadRecording = useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!isOpen || !meeting) return;
    setIsLoading(true);
    setIsDemoMode(false);
    setIsLocalFallbackOnly(false);

    const isCancelled = () => Boolean(cancelledRef?.current);

    const showBlob = (blob: Blob, localOnly = false) => {
      if (isCancelled()) return;
      revokeCurrentObjectUrl();
      const nextUrl = URL.createObjectURL(blob);
      objectUrlRef.current = nextUrl;
      setVideoBlob(blob);
      setVideoUrl(nextUrl);
      setIsDemoMode(false);
      setIsLocalFallbackOnly(localOnly);
    };

    const showDirectUrl = (url: string, info: MeetingRecordingPlaybackResponse) => {
      if (isCancelled()) return;
      revokeCurrentObjectUrl();
      setVideoBlob(null);
      setVideoUrl(resolvePlaybackUrl(url));
      setPlaybackInfo(info);
      setIsDemoMode(false);
      setIsLocalFallbackOnly(false);
    };

    const showSample = () => {
      if (isCancelled()) return;
      revokeCurrentObjectUrl();
      setVideoUrl("/sample-meeting-recording.webm");
      setVideoBlob(null);
      setIsDemoMode(true);
      setIsLocalFallbackOnly(false);
    };

    try {
      let playback: MeetingRecordingPlaybackResponse | null = null;
      // 1. Try cloud Egress playback URL endpoint first (direct B2 presigned GET or signed Range proxy)
      if (meeting.projectId && typeof meetingService.getRecordingPlaybackUrl === "function") {
        try {
          playback = await meetingService.getRecordingPlaybackUrl(meeting.projectId, meeting.id);
          if (playback && !isCancelled()) {
            setPlaybackInfo(playback);
            if (playback.url) {
              showDirectUrl(playback.url, playback);
              return;
            }
            if (
              playback.recordingStatus === "STARTING" ||
              playback.recordingStatus === "RECORDING" ||
              playback.recordingStatus === "PROCESSING"
            ) {
              revokeCurrentObjectUrl();
              setVideoBlob(null);
              setVideoUrl(null);
              return;
            }
          }
        } catch {
          // Fall through cleanly to local/legacy lookup
        }
      }

      // 2. Always check local IndexedDB store (preserves Tier 3 fallback recordings even when cloud status is FAILED)
      const record = await meetingRecordingStore.getRecording(meeting.id);
      if (record && record.blob) {
        let playableBlob = record.blob;
        if (playableBlob.type.includes("webm") || !playableBlob.type) {
          const durMs = Math.max(1000, (record.durationSeconds || meeting.durationSeconds || 1) * 1000);
          try {
            playableBlob = await fixWebmDuration(record.blob, durMs);
          } catch {
            playableBlob = record.blob;
          }
        }
        showBlob(playableBlob, true);
        return;
      }

      // 2b. If no local fallback copy exists and cloud status is FAILED or backupStorageUsed, surface status view
      if (playback && (playback.backupStorageUsed || playback.recordingStatus === "FAILED")) {
        revokeCurrentObjectUrl();
        setVideoBlob(null);
        setVideoUrl(null);
        return;
      }

      // 3. Try legacy server-side uploaded recording file
      if (meeting.projectId) {
        const fileId = meeting.recordingFileId ?? (await findLegacyRecordingId(meeting));
        if (fileId) {
          const blob = await projectFilesService.downloadFileBlob(meeting.projectId, fileId);
          showBlob(blob, false);
          return;
        }
      }

      // 4. Fallback to enterprise sample meeting recording video
      showSample();
    } catch {
      showSample();
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, [isOpen, meeting]);

  useEffect(() => {
    const cancelledRef = { current: false };
    setPlaybackInfo(null);

    if (!isOpen || !meeting) {
      revokeCurrentObjectUrl();
      setVideoUrl(null);
      setVideoBlob(null);
      return;
    }

    void loadRecording(cancelledRef);

    return () => {
      cancelledRef.current = true;
      revokeCurrentObjectUrl();
    };
  }, [isOpen, meeting, loadRecording]);

  const handleSyncRecording = async () => {
    if (!meeting?.projectId || isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await meetingService.syncRecording(meeting.projectId, meeting.id);
      if (synced && onMeetingUpdated) {
        onMeetingUpdated(synced);
      } else {
        await loadRecording();
      }
    } catch (err: any) {
      console.warn("Could not synchronize recording status:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("meetings.sync_recording_failed", { defaultValue: "Không thể đồng bộ trạng thái bản ghi" })
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryLocalUploadToB2 = async () => {
    if (!meeting?.projectId || !videoBlob || isRetryingLocalUpload) return;
    setIsRetryingLocalUpload(true);
    try {
      const ext = videoBlob.type.toLowerCase().includes("mp4") ? ".mp4" : ".webm";
      const updated = await meetingService.uploadFallbackRecordingToB2(meeting.projectId, meeting.id, videoBlob, {
        fileName: `meeting_${meeting.id}_fallback_${Date.now()}${ext}`,
        durationSeconds: meeting.durationSeconds || 30,
      });
      toast.success(
        t("meetings.upload_video_success", {
          defaultValue: "Đã tải bản ghi lên Backblaze B2 thành công!",
        })
      );
      if (updated && onMeetingUpdated) {
        onMeetingUpdated(updated);
      } else {
        await loadRecording();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("meetings.upload_video_b2_failed", {
            defaultValue: "Không thể tải bản ghi cục bộ lên Backblaze B2.",
          })
      );
    } finally {
      setIsRetryingLocalUpload(false);
    }
  };

  const handleDownload = () => {
    if (!meeting) return;
    let downloadUrl = videoUrl;
    let tempUrl = false;

    if (videoBlob) {
      downloadUrl = URL.createObjectURL(videoBlob);
      tempUrl = true;
    }

    if (!downloadUrl) return;

    if (!videoBlob && downloadUrl.includes("/stream")) {
      downloadUrl = downloadUrl.includes("?") ? `${downloadUrl}&download=true` : `${downloadUrl}?download=true`;
    }

    const defaultExt = playbackInfo?.contentType?.includes("mp4") ? "mp4" : "webm";
    const downloadName = playbackInfo?.fileName || `meeting_${meeting.id}_recording.${defaultExt}`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = downloadName;
    if (/^https?:\/\//i.test(downloadUrl)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (tempUrl) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl!), 1000);
    }
  };

  const handlePlaySample = () => {
    setVideoUrl("/sample-meeting-recording.webm");
    setIsDemoMode(true);
    if (meeting) {
      fetch("/sample-meeting-recording.webm")
        .then((res) => res.blob())
        .then(async (blob) => {
          let fixed = blob;
          try {
            fixed = await fixWebmDuration(blob, (meeting.durationSeconds || 16) * 1000);
          } catch {}
          setVideoBlob(fixed);
          void meetingRecordingStore.saveRecording(meeting.id, fixed, {
            title: meeting.title,
            projectId: meeting.projectId,
            durationSeconds: meeting.durationSeconds || 16,
          });
        })
        .catch(() => {});
    }
  };

  const handleUploadCustomVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !meeting || meeting.isHost === false) return;

    let patchedFile: Blob = file;
    const durMs = Math.max(1000, (meeting.durationSeconds || 30) * 1000);
    if (file.type.includes("webm") || !file.type) {
      try {
        patchedFile = await fixWebmDuration(file, durMs);
      } catch {}
    }

    revokeCurrentObjectUrl();
    const url = URL.createObjectURL(patchedFile);
    objectUrlRef.current = url;
    setVideoBlob(patchedFile);
    setVideoUrl(url);
    setIsDemoMode(false);

    await meetingRecordingStore.saveRecording(meeting.id, patchedFile, {
      title: meeting.title,
      projectId: meeting.projectId,
      durationSeconds: meeting.durationSeconds || 30,
    });

    if (meeting.projectId) {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".webm";
      const uploadName = `meeting_${meeting.id}_rec_${Date.now()}${ext}`;
      try {
        const updated = await meetingService.uploadFallbackRecordingToB2(meeting.projectId, meeting.id, patchedFile, {
          fileName: uploadName,
          durationSeconds: meeting.durationSeconds || 30,
        });
        toast.success(
          t("meetings.upload_video_success", {
            defaultValue: "Đã tải bản ghi lên Backblaze B2 thành công!",
          })
        );
        if (updated && onMeetingUpdated) {
          onMeetingUpdated(updated);
        } else {
          await loadRecording();
        }
      } catch (b2Err: any) {
        console.warn("Direct B2 presigned upload failed:", b2Err);
        toast.error(
          b2Err?.response?.data?.message ||
            b2Err?.message ||
            t("meetings.upload_video_b2_failed", {
              defaultValue:
                "Không thể tải video lên Backblaze B2 (chỉ hỗ trợ .webm/.mp4/.mkv). Bản sao cục bộ vẫn được giữ để xem tạm.",
            })
        );
      }
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const effectiveStatus = playbackInfo?.recordingStatus ?? meeting?.recordingStatus;
  const isBackupStorageUsed = Boolean(playbackInfo?.backupStorageUsed ?? meeting?.backupStorageUsed);
  const effectiveEgressId = playbackInfo?.egressId ?? meeting?.egressId;
  const effectiveError = playbackInfo?.recordingError ?? meeting?.recordingError;
  const isProcessing =
    effectiveStatus === "STARTING" ||
    effectiveStatus === "RECORDING" ||
    effectiveStatus === "PROCESSING";
  const downloadLabel = playbackInfo?.contentType?.includes("mp4")
    ? t("meetings.download_video_mp4", { defaultValue: "Tải video (.mp4)" })
    : t("meetings.download_video", { defaultValue: "Tải video (.webm)" });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden border border-border/80 shadow-lg bg-card rounded-xl">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{meeting?.title || t("meetings.recording_title", { defaultValue: "Bản ghi hình cuộc họp" })}</span>
                <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                  REC
                </Badge>
                {playbackInfo?.provider === "b2" && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                    {playbackInfo?.contentType?.includes("webm") ? "Cloud B2 (WebM)" : "Cloud B2 (MP4)"}
                  </Badge>
                )}
                {playbackInfo?.provider === "gdrive" && (
                  <Badge variant="outline" className="text-[10px] text-sky-600 border-sky-500/30">
                    Drive Archive
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {meeting?.hostName || "Host"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(meeting?.durationSeconds)}
                </span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Video Player or Status/Fallback View */}
        <div className="p-5 bg-muted/20">
          {isLoading ? (
            <div className="aspect-video w-full rounded-xl bg-slate-950 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">{t("meetings.loading_recording", { defaultValue: "Đang tải video bản ghi..." })}</p>
            </div>
          ) : videoUrl ? (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg border border-border/70">
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                data-testid="recording-video-player"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (!isFinite(v.duration) || v.duration === Infinity) {
                    v.currentTime = 1e101;
                    v.ontimeupdate = () => {
                      v.ontimeupdate = null;
                      v.currentTime = 0;
                    };
                  }
                }}
              />
              {isLocalFallbackOnly && !isDemoMode && (
                <div
                  className="absolute top-3 left-3 bg-amber-500/90 text-slate-950 px-2.5 py-1 rounded-md text-[11px] font-medium shadow-xs flex items-center gap-1.5"
                  data-testid="local-fallback-recording-badge"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                  {t("meetings.local_fallback_badge", {
                    defaultValue: "Bản ghi cục bộ trên trình duyệt (chưa đồng bộ B2)",
                  })}
                </div>
              )}
              {isDemoMode && (
                <div
                  className="absolute top-3 left-3 bg-background/90 px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-500 border border-border shadow-xs flex items-center gap-1.5"
                  data-testid="recording-sample-badge"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t("meetings.sample_recording_badge", { defaultValue: "Bản ghi mẫu chính thức (Enterprise HD)" })}
                </div>
              )}
            </div>
          ) : isBackupStorageUsed ? (
            <div
              className="aspect-video w-full rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col items-center justify-center p-6 text-center"
              data-testid="recording-backup-storage-alert"
            >
              <div className="p-3 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("meetings.backup_storage_title", {
                  defaultValue: "Upload lỗi, bản ghi đang ở kho dự phòng LiveKit",
                })}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                {t("meetings.backup_storage_desc", {
                  defaultValue:
                    "Bản ghi chưa bị mất mà đang được lưu tạm trong kho dự phòng mã hoá của LiveKit Cloud (tối đa ~7 ngày). Hãy kiểm tra LiveKit Cloud Dashboard hoặc liên hệ LiveKit Support để khôi phục.",
                })}
              </p>
              {effectiveEgressId && (
                <p className="text-[11px] font-mono text-amber-700 dark:text-amber-300 mt-2 bg-background/60 px-2.5 py-1 rounded border border-amber-500/30">
                  Egress ID: {effectiveEgressId}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncRecording}
                  disabled={isSyncing}
                  className="gap-1.5 text-xs"
                  data-testid="sync-recording-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {t("meetings.sync_recording_status", { defaultValue: "Đồng bộ trạng thái" })}
                </Button>
              </div>
            </div>
          ) : isProcessing ? (
            <div
              className="aspect-video w-full rounded-xl border border-border/80 bg-background/50 flex flex-col items-center justify-center p-6 text-center"
              data-testid="recording-processing-view"
            >
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <h4 className="text-sm font-semibold text-foreground">
                {t("meetings.recording_processing_title", {
                  defaultValue: "Bản ghi đám mây đang được xử lý",
                })}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1 leading-relaxed">
                {t("meetings.recording_processing_desc", {
                  defaultValue:
                    "LiveKit Cloud Egress đang hoàn tất mã hoá và tải video MP4 lên kho lưu trữ. Bạn có thể bấm Đồng bộ trạng thái để kiểm tra ngay.",
                })}
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncRecording}
                  disabled={isSyncing}
                  className="gap-1.5 text-xs"
                  data-testid="sync-recording-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {t("meetings.sync_recording_status", { defaultValue: "Đồng bộ trạng thái" })}
                </Button>
              </div>
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl border border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {effectiveStatus === "FAILED"
                  ? t("meetings.recording_failed_title", { defaultValue: "Ghi hình đám mây gặp lỗi" })
                  : t("meetings.no_local_recording", { defaultValue: "Chưa tìm thấy bản ghi của phiên họp này" })}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1 leading-relaxed">
                {effectiveError ||
                  t("meetings.no_recording_desc", {
                    defaultValue:
                      "Bản ghi Cloud Recording đang được xử lý trên máy chủ hoặc chưa được tạo. Bạn có thể đồng bộ trạng thái, phát video mẫu hoặc tải lên video thủ công.",
                  })}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {effectiveEgressId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncRecording}
                    disabled={isSyncing}
                    className="gap-1.5 text-xs"
                    data-testid="sync-recording-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {t("meetings.sync_recording_status", { defaultValue: "Đồng bộ trạng thái" })}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="default"
                  onClick={handlePlaySample}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  data-testid="play-sample-recording-btn"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {t("meetings.play_sample", { defaultValue: "Phát video mô phỏng mẫu" })}
                </Button>

                {meeting?.isHost !== false && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 text-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t("meetings.upload_video", { defaultValue: "Tải tệp video lên" })}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="video/webm,video/mp4,video/x-matroska,.webm,.mp4,.mkv"
                      onChange={handleUploadCustomVideo}
                      className="hidden"
                      data-testid="custom-recording-upload-input"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 flex flex-row items-center justify-between gap-2">
          {videoUrl ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="gap-1.5 text-xs"
                data-testid="download-recording-btn"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadLabel}
              </Button>
              {isLocalFallbackOnly && videoBlob && meeting?.isHost !== false && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryLocalUploadToB2}
                  disabled={isRetryingLocalUpload}
                  className="gap-1.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300"
                  data-testid="retry-local-b2-upload-btn"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isRetryingLocalUpload
                    ? t("meetings.recording_uploading_b2", { defaultValue: "Đang tải lên B2..." })
                    : t("meetings.retry_b2_upload", { defaultValue: "Tải lên Backblaze B2" })}
                </Button>
              )}
            </div>
          ) : (
            <div />
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs px-4"
          >
            {t("common.close", { defaultValue: "Đóng" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
