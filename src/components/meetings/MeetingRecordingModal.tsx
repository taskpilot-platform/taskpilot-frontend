import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Download, Play, Clock, User, AlertCircle, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import { projectFilesService } from "@/services/project-files.service";
import type { ProjectMeetingDto } from "@/types/meeting";

interface MeetingRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: ProjectMeetingDto | null;
}

export function MeetingRecordingModal({
  isOpen,
  onClose,
  meeting,
}: MeetingRecordingModalProps) {
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activeUrl: string | null = null;
    setIsDemoMode(false);

    if (!isOpen || !meeting) {
      setVideoUrl(null);
      return;
    }

    const loadRecording = async () => {
      setIsLoading(true);
      try {
        // 1. Try local IndexedDB store
        const record = await meetingRecordingStore.getRecording(meeting.id);
        if (record && record.blob) {
          activeUrl = URL.createObjectURL(record.blob);
          setVideoUrl(activeUrl);
          setIsDemoMode(false);
          setIsLoading(false);
          return;
        }

        // 2. Try server-side uploaded recording file
        if (meeting.recordingFileId && meeting.projectId) {
          const downloadUrl = projectFilesService.downloadFileUrl(
            meeting.projectId,
            meeting.recordingFileId
          );
          setVideoUrl(downloadUrl);
          setIsDemoMode(false);
          setIsLoading(false);
          return;
        }

        // 3. Fallback to enterprise sample meeting recording video
        setVideoUrl("/sample-meeting-recording.webm");
        setIsDemoMode(true);
      } catch {
        setVideoUrl("/sample-meeting-recording.webm");
        setIsDemoMode(true);
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecording();

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, meeting]);

  const handleDownload = () => {
    if (!videoUrl || !meeting) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `meeting_${meeting.id}_recording.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePlaySample = () => {
    setVideoUrl("/sample-meeting-recording.webm");
    setIsDemoMode(true);
    if (meeting) {
      fetch("/sample-meeting-recording.webm")
        .then((res) => res.blob())
        .then((blob) => {
          void meetingRecordingStore.saveRecording(meeting.id, blob, {
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
    if (!file || !meeting) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setIsDemoMode(false);

    // Save to local IndexedDB store
    await meetingRecordingStore.saveRecording(meeting.id, file, {
      title: meeting.title,
      projectId: meeting.projectId,
      durationSeconds: meeting.durationSeconds || 30,
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

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

        {/* Video Player or Fallback View */}
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
              />
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
          ) : (
            <div className="aspect-video w-full rounded-xl border border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("meetings.no_local_recording", { defaultValue: "Chưa tìm thấy bản ghi cục bộ của phiên họp này" })}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1 leading-relaxed">
                {t(
                  "meetings.no_recording_desc",
                  { defaultValue: "Bản ghi Cloud Recording đang được xử lý trên máy chủ hoặc được tạo bởi thiết bị của Host. Bạn có thể phát video mẫu hoặc tải lên video để kiểm thử ngay." }
                )}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
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
                  accept="video/*"
                  onChange={handleUploadCustomVideo}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 flex flex-row items-center justify-between gap-2">
          {videoUrl ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-1.5 text-xs"
              data-testid="download-recording-btn"
            >
              <Download className="w-3.5 h-3.5" />
              {t("meetings.download_video", { defaultValue: "Tải video (.webm)" })}
            </Button>
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
