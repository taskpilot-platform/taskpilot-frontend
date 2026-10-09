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
          setIsLoading(false);
          return;
        }

        // 3. No recording found
        setVideoUrl(null);
      } catch {
        setVideoUrl(null);
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
    // Generate a lightweight canvas animation video stream for instant demonstration
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, 640, 360);

      // Title & watermark
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(meeting?.title || "TaskPilot Meeting Recording", 40, 60);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Recorded Session #${meeting?.id || "Demo"}`, 40, 90);

      // Simulated timeline / waveform
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < 640; x += 10) {
        const y = 180 + Math.sin((x + frame * 4) * 0.05) * 40;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(40, 300, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "13px sans-serif";
      ctx.fillText(`Playing live captured session - ${Math.floor(frame / 30)}s`, 60, 305);
    };

    const interval = setInterval(draw, 1000 / 30);
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      clearInterval(interval);
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsDemoMode(true);
      if (meeting) {
        void meetingRecordingStore.saveRecording(meeting.id, blob, {
          title: meeting.title,
          projectId: meeting.projectId,
          durationSeconds: meeting.durationSeconds || 15,
        });
      }
    };

    recorder.start();
    setTimeout(() => {
      recorder.stop();
    }, 1500);
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
                <div className="absolute top-3 left-3 bg-background/90 px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-500 border border-border shadow-xs">
                  {t("meetings.demo_recording_badge", { defaultValue: "Bản ghi demo vừa khởi tạo" })}
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
