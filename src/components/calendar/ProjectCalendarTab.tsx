import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Radio,
  Users,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { meetingService } from "@/services/meeting.service";
import { ScheduleMeetingDialog } from "./ScheduleMeetingDialog";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import type { ProjectMeetingDto } from "@/types/meeting";
import type { TaskDto } from "@/types/task";
import type { ProjectMember } from "@/types/project";

interface ProjectCalendarTabProps {
  projectId: number;
  projectMembers?: ProjectMember[];
  tasks?: TaskDto[];
  currentUserId?: number | null;
  onOpenTaskDetail?: (taskId: number) => void;
  hideTitle?: boolean;
}

type CalendarViewMode = "AGENDA" | "MONTH" | "WEEK";

export function ProjectCalendarTab({
  projectId,
  projectMembers = [],
  tasks = [],
  currentUserId,
  onOpenTaskDetail,
  hideTitle = false,
}: ProjectCalendarTabProps) {
  const { t, i18n } = useTranslation();
  const [meetings, setMeetings] = useState<ProjectMeetingDto[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("AGENDA");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [joinedMeetingId, setJoinedMeetingId] = useState<number | null>(null);

  // Filters
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  // Load meetings
  const loadMeetings = async () => {
    try {
      const data = await meetingService.getMeetings(projectId);
      setMeetings(data);
    } catch (err) {
      console.warn("Failed to load meetings for calendar", err);
    }
  };

  useEffect(() => {
    void loadMeetings();
  }, [projectId]);

  // Date utilities
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const selectedDateStr = useMemo(
    () => selectedDate.toISOString().split("T")[0],
    [selectedDate]
  );

  // Filter items for selected date (Agenda / Day)
  const dayMeetings = useMemo(() => {
    if (!showMeetings) return [];
    return meetings.filter((m) => {
      const targetTime = m.scheduledStartTime || m.startedAt;
      if (!targetTime) return false;
      return targetTime.startsWith(selectedDateStr);
    });
  }, [meetings, selectedDateStr, showMeetings]);

  const dayTasks = useMemo(() => {
    if (!showTasks) return [];
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate.startsWith(selectedDateStr);
    });
  }, [tasks, selectedDateStr, showTasks]);

  // Month grid computation
  const monthData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    const totalDays = lastDay.getDate();

    const days = [];
    // Prev month padding
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, dateStr: "" });
    }
    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({ day: d, dateStr });
    }

    return days;
  }, [selectedDate]);

  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(new Date(dateStr));
    setViewMode("AGENDA");
  };

  const handleMeetingCreated = (newMeeting: ProjectMeetingDto, autoJoin?: boolean) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    if (autoJoin) {
      setJoinedMeetingId(newMeeting.id);
    }
  };

  if (joinedMeetingId) {
    return (
      <LiveMeetingRoom
        projectId={projectId}
        meetingId={joinedMeetingId}
        currentUserId={currentUserId ?? 0}
        onLeave={() => {
          setJoinedMeetingId(null);
          void loadMeetings();
        }}
        onEndMeeting={() => {
          setJoinedMeetingId(null);
          void loadMeetings();
        }}
      />
    );
  }

  const isTodaySelected = selectedDateStr === todayStr;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10" data-testid="project-calendar-tab">
      {/* 1. Header Toolbar (Teams & Outlook layout) */}
      {!hideTitle ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {t("calendar.tab_title", { defaultValue: "Lịch & Điều phối lịch trình" })}
                <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary bg-primary/5">
                  Teams & Outlook Sync
                </Badge>
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("calendar.tab_subtitle", { defaultValue: "Theo dõi toàn diện các cuộc họp, hạn chót công việc và lịch trình của nhóm." })}
            </p>
          </div>

          {/* View Switchers & Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex p-0.5 bg-muted rounded-lg border border-border/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("AGENDA")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "AGENDA"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="calendar-agenda-view-btn"
              >
                {t("calendar.view_agenda", { defaultValue: "Hôm nay / Lịch trình" })}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("MONTH")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "MONTH"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="calendar-month-view-btn"
              >
                {t("calendar.view_month", { defaultValue: "Tháng" })}
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => setIsScheduleOpen(true)}
              className="gap-1.5 shadow-sm bg-primary text-primary-foreground font-medium text-xs h-8"
              data-testid="schedule-meeting-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("calendar.schedule_meeting", { defaultValue: "Lên lịch cuộc họp" })}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end items-center flex-wrap gap-2 pb-2">
          <div className="flex p-0.5 bg-muted rounded-lg border border-border/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("AGENDA")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "AGENDA"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="calendar-agenda-view-btn"
            >
              {t("calendar.view_agenda", { defaultValue: "Hôm nay / Lịch trình" })}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MONTH")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "MONTH"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="calendar-month-view-btn"
            >
              {t("calendar.view_month", { defaultValue: "Tháng" })}
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
            className="gap-1.5 shadow-sm bg-primary text-primary-foreground font-medium text-xs h-8"
            data-testid="schedule-meeting-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("calendar.schedule_meeting", { defaultValue: "Lên lịch cuộc họp" })}
          </Button>
        </div>
      )}

      {/* 2. Filter & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className={`h-7 text-xs px-2.5 ${isTodaySelected ? "border-primary text-primary" : ""}`}
            data-testid="calendar-today-btn"
          >
            {t("calendar.today", { defaultValue: "Hôm nay" })}
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold px-1">
              {selectedDate.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", { month: "long", year: "numeric" })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
            <input
              type="checkbox"
              checked={showMeetings}
              onChange={(e) => setShowMeetings(e.target.checked)}
              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {t("calendar.filter_meetings", { count: meetings.length, defaultValue: `Cuộc họp (${meetings.length})` })}
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
            <input
              type="checkbox"
              checked={showTasks}
              onChange={(e) => setShowTasks(e.target.checked)}
              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              {t("calendar.filter_tasks", { count: tasks.filter((t) => t.dueDate).length, defaultValue: `Hạn chót Tasks (${tasks.filter((t) => t.dueDate).length})` })}
            </span>
          </label>
        </div>
      </div>

      {/* 3. Main Calendar Views */}
      {viewMode === "AGENDA" ? (
        /* Agenda / Today's Schedule View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="calendar-agenda-view">
          {/* Left Column: Day timeline summary */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {t("calendar.agenda_date", {
                  date: selectedDate.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", { dateStyle: "full" }),
                  defaultValue: `Lịch trình ngày ${selectedDate.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", { dateStyle: "full" })}`,
                })}
              </h3>
              {isTodaySelected && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                  {t("calendar.today_badge", { defaultValue: "Hôm nay" })}
                </Badge>
              )}
            </div>

            {/* Empty state for the day */}
            {dayMeetings.length === 0 && dayTasks.length === 0 ? (
              <Card className="border-dashed p-8 text-center bg-card/50">
                <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h4 className="font-semibold text-sm mb-1">
                  {t("calendar.no_events", { defaultValue: "Không có lịch họp hoặc hạn chót nào trong ngày này" })}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                  {t("calendar.no_events_desc", { defaultValue: "Lịch trình rảnh rỗi. Bạn có thể tận dụng thời gian để xử lý backlog hoặc lên lịch cuộc họp mới cùng nhóm." })}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsScheduleOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("calendar.start_meeting_now", { defaultValue: "Lên lịch cuộc họp ngay" })}
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* 1. Day Meetings */}
                {dayMeetings.map((m) => {
                  const isActive = m.status === "ACTIVE";
                  const isScheduled = m.status === "SCHEDULED";
                  const timeDisplay = m.scheduledStartTime
                    ? new Date(m.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : m.startedAt
                    ? new Date(m.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : t("calendar.flexible", { defaultValue: "Linh hoạt" });

                  return (
                    <Card
                      key={`meet-${m.id}`}
                      className={`overflow-hidden border transition-all ${
                        isActive
                          ? "border-emerald-500/60 bg-emerald-500/5 shadow-sm"
                          : "border-border/80 bg-card hover:border-primary/40"
                      }`}
                      data-testid={`calendar-meeting-card-${m.id}`}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium gap-1 px-2 ${
                                isActive
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : isScheduled
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              <Video className="w-3 h-3" />
                              {isActive
                                ? t("calendar.meeting_status_active", { defaultValue: "Đang diễn ra" })
                                : isScheduled
                                ? t("calendar.meeting_status_scheduled", { defaultValue: "Đã lên lịch" })
                                : t("calendar.meeting_status_ended", { defaultValue: "Đã kết thúc" })}
                            </Badge>
                            <span className="text-xs font-mono font-semibold text-muted-foreground">
                              {timeDisplay}
                            </span>
                            {m.recordingEnabled && (
                              <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30 py-0">
                                REC
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-bold text-sm text-foreground truncate">
                            {m.title}
                          </h4>
                          {m.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {m.description}
                            </p>
                          )}
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>{t("calendar.organized_by", { defaultValue: "Tổ chức bởi:" })} <span className="font-medium text-foreground">{m.hostName}</span></span>
                            <span>•</span>
                            <span>{m.activeParticipantsCount || 0} {t("calendar.participants", { defaultValue: "người tham gia" })}</span>
                          </div>
                        </div>

                        <div>
                          <Button
                            size="sm"
                            onClick={() => setJoinedMeetingId(m.id)}
                            className={
                              isActive
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs font-medium"
                                : "gap-1.5 text-xs font-medium"
                            }
                            data-testid={`join-calendar-meeting-${m.id}`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            {isActive
                              ? t("calendar.join_meeting", { defaultValue: "Tham gia ngay" })
                              : t("calendar.start_meeting_now", { defaultValue: "Bắt đầu họp" })}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* 2. Day Tasks */}
                {dayTasks.map((task) => (
                  <Card
                    key={`task-${task.id}`}
                    onClick={() => onOpenTaskDetail?.(task.id)}
                    className="border-border/80 bg-card hover:border-primary/40 cursor-pointer transition-all hover:shadow-xs"
                    data-testid={`calendar-task-card-${task.id}`}
                  >
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded font-medium text-muted-foreground">
                            TP-{task.id}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-normal py-0">
                            {task.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 font-normal">
                            {task.status}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-semibold text-foreground truncate">
                          {task.title}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {t("calendar.due_today", { defaultValue: "Hạn chót hôm nay" })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Outlook Mini Month Picker & Quick Stats */}
          <div className="space-y-4">
            <Card className="bg-card border-border/80">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {i18n.language === "vi"
                    ? `Tổng quan lịch tháng ${selectedDate.getMonth() + 1}`
                    : `Calendar Overview - ${selectedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {/* Mini Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                  {(i18n.language === "vi"
                    ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
                    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                  ).map((dayName) => (
                    <span key={dayName} className="font-medium text-muted-foreground py-1">
                      {dayName}
                    </span>
                  ))}
                  {monthData.map((d, idx) => {
                    if (!d.day) {
                      return <div key={`empty-${idx}`} className="h-7" />;
                    }
                    const isSelected = d.dateStr === selectedDateStr;
                    const isToday = d.dateStr === todayStr;

                    // Has items?
                    const hasMeet = meetings.some((m) =>
                      (m.scheduledStartTime || m.startedAt || "").startsWith(d.dateStr)
                    );
                    const hasTask = tasks.some((t) =>
                      (t.dueDate || "").startsWith(d.dateStr)
                    );

                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(new Date(d.dateStr))}
                        className={`h-7 rounded-md flex flex-col items-center justify-center relative transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : isToday
                            ? "border border-primary text-primary font-semibold"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span>{d.day}</span>
                        <div className="flex gap-0.5 mt-0.5">
                          {hasMeet && (
                            <span
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? "bg-white" : "bg-emerald-500"
                              }`}
                            />
                          )}
                          {hasTask && (
                            <span
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? "bg-white" : "bg-amber-500"
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions / Tips */}
            <Card className="bg-muted/20 border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  {t("calendar.realtime_collab", { defaultValue: "Cộng tác thời gian thực" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-xs text-muted-foreground space-y-2">
                <p>
                  {t("calendar.realtime_collab_desc", { defaultValue: "Mọi cuộc họp được tạo trên TaskPilot đều hỗ trợ gọi thoại HD, chia sẻ màn hình, và phiên âm tự động." })}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsScheduleOpen(true)}
                  className="w-full text-xs h-8 gap-1.5 font-medium"
                >
                  <Radio className="w-3 h-3 text-emerald-500" />
                  {t("calendar.meet_now", { defaultValue: "Họp tức thì (Meet Now)" })}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Month View Grid */
        <Card className="border-border/80 bg-card overflow-hidden shadow-xs" data-testid="calendar-month-view">
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center text-xs font-semibold py-2">
            {(i18n.language === "vi"
              ? ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            ).map((weekday) => (
              <div key={weekday} className="text-muted-foreground py-0.5">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
            {monthData.map((d, index) => {
              if (!d.day) {
                return (
                  <div key={`blank-${index}`} className="min-h-[110px] bg-muted/10 p-2" />
                );
              }

              const isToday = d.dateStr === todayStr;
              const isSelected = d.dateStr === selectedDateStr;

              // Items for this day
              const dayMeets = meetings.filter((m) =>
                (m.scheduledStartTime || m.startedAt || "").startsWith(d.dateStr)
              );
              const dayTs = tasks.filter((t) =>
                (t.dueDate || "").startsWith(d.dateStr)
              );

              return (
                <div
                  key={d.dateStr}
                  onClick={() => handleSelectDay(d.dateStr)}
                  className={`min-h-[110px] p-2 flex flex-col justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/5 ring-1 ring-primary/40 inset-0"
                      : "hover:bg-muted/30 bg-card"
                  }`}
                  data-testid={`calendar-cell-${d.dateStr}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-foreground"
                      }`}
                    >
                      {d.day}
                    </span>
                    {(dayMeets.length > 0 || dayTs.length > 0) && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {dayMeets.length + dayTs.length}
                      </span>
                    )}
                  </div>

                  {/* Badges / Chips */}
                  <div className="space-y-1 overflow-hidden flex-1">
                    {showMeetings &&
                      dayMeets.slice(0, 2).map((m) => (
                        <div
                          key={`m-${m.id}`}
                          className="truncate text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium"
                          title={m.title}
                        >
                          <Video className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </div>
                      ))}

                    {showTasks &&
                      dayTs.slice(0, 2).map((t) => (
                        <div
                          key={`t-${t.id}`}
                          className="truncate text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 font-medium"
                          title={t.title}
                        >
                          <ListTodo className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                      ))}

                    {dayMeets.length + dayTs.length > 2 && (
                      <span className="text-[9px] text-muted-foreground block pl-1">
                        +{dayMeets.length + dayTs.length - 2} mục khác
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Schedule Dialog */}
      <ScheduleMeetingDialog
        isOpen={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        projectId={projectId}
        projectMembers={projectMembers}
        onMeetingCreated={handleMeetingCreated}
        defaultDate={selectedDateStr}
      />
    </div>
  );
}
