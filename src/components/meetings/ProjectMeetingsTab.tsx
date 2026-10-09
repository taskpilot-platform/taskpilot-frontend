import React, { useEffect, useState } from "react";
import {
  Video,
  PlusCircle,
  RefreshCw,
  Clock,
  Users,
  History,
  Loader2,
  Play,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { meetingService } from "@/services/meeting.service";
import { LiveMeetingRoom } from "./LiveMeetingRoom";
import { MeetingRecordingModal } from "./MeetingRecordingModal";
import type { CreateMeetingRequest, ProjectMeetingDto } from "@/types/meeting";

interface ProjectMeetingsTabProps {
  projectId: number;
  isArchived: boolean;
  currentUserId: number | null;
  initialJoinMeetingId?: number | null;
}

export function ProjectMeetingsTab({
  projectId,
  isArchived,
  currentUserId,
  initialJoinMeetingId,
}: ProjectMeetingsTabProps) {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<ProjectMeetingDto[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<ProjectMeetingDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "ENDED">("ALL");
  const [selectedRecordingMeeting, setSelectedRecordingMeeting] = useState<ProjectMeetingDto | null>(null);

  // Active room view state
  const [joinedMeetingId, setJoinedMeetingId] = useState<number | null>(initialJoinMeetingId || null);

  // Create meeting dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await meetingService.getMeetings(projectId);
      setMeetings(data);
      const active = data.find((m: ProjectMeetingDto) => m.status === "ACTIVE") || null;
      setActiveMeeting(active);
    } catch (err: any) {
      console.warn("Failed to load meetings", err);
      toast.error("Không thể tải danh sách cuộc họp");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [projectId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề cuộc họp");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateMeetingRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        recordingEnabled,
      };
      const created = await meetingService.createMeeting(projectId, payload);
      toast.success("Đã tạo cuộc họp thành công!");
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      await loadMeetings();
      // Automatically join the newly created meeting
      const targetId = (created as any)?.id || (created as any)?.data?.id;
      if (targetId) {
        setJoinedMeetingId(targetId);
      }
    } catch (err: any) {
      console.error("Create meeting error:", err);
      toast.error(err?.response?.data?.message || "Không thể tạo cuộc họp");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedMeetingId(null);
    loadMeetings();
  };

  const handleEndRoom = () => {
    setJoinedMeetingId(null);
    loadMeetings();
  };

  const formatDuration = (secs?: number | null) => {
    if (!secs || secs <= 0) return "< 1 phút";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} giây`;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h} giờ ${m % 60} phút`;
    }
    return `${m} phút`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // If currently inside an active meeting room, render the LiveMeetingRoom view
  if (joinedMeetingId) {
    return (
      <LiveMeetingRoom
        projectId={projectId}
        meetingId={joinedMeetingId}
        currentUserId={currentUserId ?? 0}
        onLeave={handleLeaveRoom}
        onEndMeeting={handleEndRoom}
      />
    );
  }

  const filteredMeetings = meetings.filter((m) => {
    if (filter === "ACTIVE") return m.status === "ACTIVE";
    if (filter === "ENDED") return m.status === "ENDED";
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10" data-testid="project-meetings-tab">
      {/* 1. Active Meeting Alert Banner */}
      {activeMeeting && (
        <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-950/30 via-background to-background shadow-lg shadow-emerald-950/10 overflow-hidden relative" data-testid="active-meeting-banner">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <CardHeader className="pb-3 flex flex-row items-start justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 px-2.5 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Đang diễn ra
                </Badge>
                <h3 className="text-xl font-bold tracking-tight text-foreground" data-testid="active-banner-title">
                  {activeMeeting.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tạo bởi <span className="font-medium text-foreground">{activeMeeting.hostName}</span> lúc {formatDate(activeMeeting.startedAt)}
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => setJoinedMeetingId(activeMeeting.id)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md gap-2 font-medium"
              data-testid="join-active-meeting-btn"
            >
              <Video className="w-5 h-5" />
              Tham gia ngay
            </Button>
          </CardHeader>

          {activeMeeting.description && (
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {activeMeeting.description}
            </CardContent>
          )}
        </Card>
      )}

      {/* 2. Controls & Actions Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Họp trực tuyến</h2>
          <p className="text-sm text-muted-foreground">
            Tổ chức phòng họp video & audio thời gian thực với các thành viên dự án
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMeetings}
            disabled={isLoading}
            className="h-9 gap-1.5"
            data-testid="refresh-meetings-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={isArchived}
                className="h-9 gap-2 bg-primary hover:bg-primary/90"
                data-testid="create-meeting-btn"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Bắt đầu cuộc họp mới</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" data-testid="create-meeting-dialog">
              <form onSubmit={handleCreateMeeting}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-emerald-500" />
                    Bắt đầu cuộc họp mới
                  </DialogTitle>
                  <DialogDescription>
                    Tạo phòng họp trực tuyến tức thì và mời các thành viên tham gia.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-title" className="text-xs font-semibold">
                      Tiêu đề cuộc họp <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="meeting-title"
                      placeholder="Ví dụ: Daily Scrum, Sprint Review, Thảo luận kiến trúc..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      data-testid="meeting-title-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-desc" className="text-xs font-semibold">
                      Mô tả / Mục tiêu cuộc họp
                    </Label>
                    <Textarea
                      id="meeting-desc"
                      placeholder="Ghi chú nội dung chính cần bàn trong buổi họp..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      data-testid="meeting-desc-input"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="meeting-rec"
                      checked={recordingEnabled}
                      onCheckedChange={(c) => setRecordingEnabled(c as boolean)}
                      data-testid="meeting-rec-checkbox"
                    />
                    <Label htmlFor="meeting-rec" className="text-xs cursor-pointer font-medium">
                      Bật ghi hình cuộc họp (Lưu trữ vào kho tệp dự án)
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isSubmitting}
                    data-testid="cancel-create-dialog-btn"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                    data-testid="submit-create-meeting-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        Tạo & Tham gia ngay
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 3. Filter Navigation Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          size="sm"
          variant={filter === "ALL" ? "secondary" : "ghost"}
          onClick={() => setFilter("ALL")}
          className="text-xs h-8"
        >
          Tất cả ({meetings.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "ACTIVE" ? "secondary" : "ghost"}
          onClick={() => setFilter("ACTIVE")}
          className="text-xs h-8 gap-1"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Đang diễn ra ({meetings.filter((m) => m.status === "ACTIVE").length})
        </Button>
        <Button
          size="sm"
          variant={filter === "ENDED" ? "secondary" : "ghost"}
          onClick={() => setFilter("ENDED")}
          className="text-xs h-8 gap-1"
        >
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          Lịch sử đã họp ({meetings.filter((m) => m.status === "ENDED").length})
        </Button>
      </div>

      {/* 4. Meetings Grid List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">Đang tải danh sách cuộc họp...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/20" data-testid="empty-meetings-view">
          <Video className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg mb-1">Chưa có cuộc họp nào</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Bắt đầu cuộc họp video/audio trực tuyến để thảo luận công việc thời gian thực với đồng đội.
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            disabled={isArchived}
            className="gap-2"
            data-testid="empty-start-meeting-btn"
          >
            <PlusCircle className="w-4 h-4" />
            Bắt đầu cuộc họp đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="meetings-list-grid">
          {filteredMeetings.map((m) => {
            const isActive = m.status === "ACTIVE";

            return (
              <Card
                key={m.id}
                className={`transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                  isActive ? "border-emerald-500/40 bg-card shadow-sm" : "border-border/60 bg-card/60"
                }`}
                data-testid={`meeting-card-${m.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Đang diễn ra
                        </>
                      ) : (
                        "Đã kết thúc"
                      )}
                    </Badge>

                    {m.recordingEnabled && (
                      <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                        REC
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-semibold mt-2 line-clamp-1" title={m.title}>
                    {m.title}
                  </CardTitle>

                  {m.description && (
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {m.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 pb-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDate(m.startedAt)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {m.hostName?.slice(0, 2).toUpperCase() || "H"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[120px]">{m.hostName}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{isActive ? `${m.activeParticipantsCount} đang họp` : formatDuration(m.durationSeconds)}</span>
                    </div>
                  </div>
                </CardContent>

                <div className="p-4 pt-0 mt-auto">
                  {isActive ? (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium"
                      onClick={() => setJoinedMeetingId(m.id)}
                      data-testid={`join-meeting-btn-${m.id}`}
                    >
                      <Video className="w-4 h-4" />
                      {t("meetings.join_room", { defaultValue: "Tham gia phòng họp" })}
                    </Button>
                  ) : (
                    <div className="space-y-1.5">
                      <Button
                        variant="outline"
                        className={`w-full gap-2 text-xs font-semibold transition-all ${
                          m.recordingEnabled
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "border-border hover:bg-accent text-foreground"
                        }`}
                        onClick={() => setSelectedRecordingMeeting(m)}
                        data-testid={`watch-recording-btn-${m.id}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-emerald-500" />
                        <span>{t("meetings.watch_recording", { defaultValue: "Xem video ghi hình" })}</span>
                      </Button>
                      <div className="text-center text-[11px] text-muted-foreground/70">
                        {t("meetings.duration_label", { defaultValue: "Thời lượng" })}: {formatDuration(m.durationSeconds)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Meeting Recording Playback Modal */}
      <MeetingRecordingModal
        isOpen={Boolean(selectedRecordingMeeting)}
        onClose={() => setSelectedRecordingMeeting(null)}
        meeting={selectedRecordingMeeting}
      />
    </div>
  );
}
