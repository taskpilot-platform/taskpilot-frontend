import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Radio,
  Users,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { meetingService } from "@/services/meeting.service";
import type { CreateMeetingRequest, ProjectMeetingDto } from "@/types/meeting";
import type { ProjectMember } from "@/types/project";

interface ScheduleMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectMembers?: ProjectMember[];
  onMeetingCreated: (meeting: ProjectMeetingDto, autoJoin?: boolean) => void;
  defaultDate?: string; // YYYY-MM-DD
}

export function ScheduleMeetingDialog({
  isOpen,
  onOpenChange,
  projectId,
  projectMembers = [],
  onMeetingCreated,
  defaultDate,
}: ScheduleMeetingDialogProps) {
  const [meetingMode, setMeetingMode] = useState<"SCHEDULED" | "INSTANT">("SCHEDULED");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordingEnabled, setRecordingEnabled] = useState(false);

  // Scheduling fields
  const todayStr = defaultDate || new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề cuộc họp");
      return;
    }

    setIsSubmitting(true);
    try {
      let scheduledStart: string | undefined;
      let scheduledEnd: string | undefined;

      if (meetingMode === "SCHEDULED") {
        if (!date || !startTime) {
          toast.error("Vui lòng chọn ngày và giờ bắt đầu");
          setIsSubmitting(false);
          return;
        }
        const startIso = new Date(`${date}T${startTime}:00`).toISOString();
        const endIso = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : undefined;
        scheduledStart = startIso;
        scheduledEnd = endIso;
      }

      const payload: CreateMeetingRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        recordingEnabled,
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
      };

      const created = await meetingService.createMeeting(projectId, payload);
      toast.success(
        meetingMode === "INSTANT"
          ? "Đã tạo cuộc họp tức thì! Đang kết nối..."
          : "Đã lên lịch cuộc họp thành công vào Lịch!"
      );

      onOpenChange(false);
      setTitle("");
      setDescription("");
      onMeetingCreated(created, meetingMode === "INSTANT");
    } catch (err: any) {
      console.error("Create meeting error:", err);
      toast.error(err?.response?.data?.message || "Không thể tạo cuộc họp");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-card border-border" data-testid="schedule-meeting-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg">
              {meetingMode === "SCHEDULED" ? "Lên lịch cuộc họp (Teams / Outlook)" : "Họp ngay (Meet Now)"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Lên lịch họp với các thành viên trong dự án, thiết lập thời gian và đồng bộ tự động vào Calendar.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-muted rounded-lg text-xs font-medium gap-1 mb-2">
          <button
            type="button"
            onClick={() => setMeetingMode("SCHEDULED")}
            className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              meetingMode === "SCHEDULED"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="mode-scheduled-tab"
          >
            <Clock className="w-3.5 h-3.5" />
            Lên lịch cuộc họp
          </button>
          <button
            type="button"
            onClick={() => setMeetingMode("INSTANT")}
            className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              meetingMode === "INSTANT"
                ? "bg-card text-foreground shadow-xs font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="mode-instant-tab"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            Họp tức thì (Meet Now)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-meeting-title" className="text-xs font-semibold">
              Tiêu đề cuộc họp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sched-meeting-title"
              placeholder="VD: Sprint Planning, Daily Standup, Review Architecture..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs sm:text-sm h-9"
              data-testid="schedule-meeting-title-input"
              required
            />
          </div>

          {/* Date & Time (for scheduled mode) */}
          {meetingMode === "SCHEDULED" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
              <div className="space-y-1">
                <Label htmlFor="sched-date" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 text-primary" /> Ngày họp
                </Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs h-8 bg-background"
                  data-testid="schedule-meeting-date-input"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sched-start" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" /> Bắt đầu
                </Label>
                <Input
                  id="sched-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs h-8 bg-background"
                  data-testid="schedule-meeting-start-time"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sched-end" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" /> Kết thúc
                </Label>
                <Input
                  id="sched-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs h-8 bg-background"
                  data-testid="schedule-meeting-end-time"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-meeting-desc" className="text-xs font-semibold">
              Mục tiêu / Agenda (Tùy chọn)
            </Label>
            <Textarea
              id="sched-meeting-desc"
              placeholder="Nội dung thảo luận, tài liệu chuẩn bị, đường link tham khảo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none h-18"
              data-testid="schedule-meeting-desc-input"
            />
          </div>

          {/* Scheduling Assistant preview (Outlook style) */}
          {projectMembers.length > 0 && (
            <div className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Trợ lý điều phối (Scheduling Assistant):
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {projectMembers.length} thành viên sẵn sàng
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {projectMembers.slice(0, 6).map((m) => (
                  <Badge key={m.userId} variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/40 font-normal">
                    {m.fullName || m.email || `User #${m.userId}`}
                  </Badge>
                ))}
                {projectMembers.length > 6 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{projectMembers.length - 6} người khác
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Recording checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="sched-rec"
              checked={recordingEnabled}
              onCheckedChange={(checked) => setRecordingEnabled(checked as boolean)}
              data-testid="schedule-meeting-rec-checkbox"
            />
            <Label htmlFor="sched-rec" className="text-xs cursor-pointer font-normal">
              Bật tính năng ghi âm & lưu trữ cuộc họp (Cloud Recording)
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={meetingMode === "INSTANT" ? "bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" : "gap-1.5"}
              data-testid="submit-schedule-meeting-btn"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {meetingMode === "INSTANT" ? (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Bắt đầu & Tham gia ngay
                </>
              ) : (
                <>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Lên lịch cuộc họp
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
