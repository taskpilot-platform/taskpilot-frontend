import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCalendarTab } from "@/components/calendar/ProjectCalendarTab";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import { taskService } from "@/services/task.service";
import { projectStorage } from "@/lib/storage";
import type { MyProject, ProjectMember } from "@/types/project";
import type { TaskDto } from "@/types/task";

export default function GlobalCalendarPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<MyProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch User & Projects
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [profileRes, projectsRes] = await Promise.all([
          profileService.getMe().catch(() => null),
          projectService.getMyProjects(0, 50).catch(() => ({ data: { content: [] } })),
        ]);

        if (!isMounted) return;

        if (profileRes?.data?.id) {
          setCurrentUserId(profileRes.data.id);
        }

        const projectList: MyProject[] =
          (projectsRes as any)?.data?.content ||
          (projectsRes as any)?.data ||
          [];

        setProjects(projectList);

        // Determine initially selected project
        const paramId = searchParams.get("project");
        let initialId: number | null = null;

        if (paramId) {
          const parsed = parseInt(paramId, 10);
          if (projectList.some((p) => p.id === parsed)) {
            initialId = parsed;
          }
        }

        if (!initialId) {
          const stored = projectStorage.getLastProjectId();
          if (stored && projectList.some((p) => p.id === stored)) {
            initialId = stored;
          } else if (projectList.length > 0) {
            initialId = projectList[0].id;
          }
        }

        setSelectedProjectId(initialId);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Project Members & Tasks when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;

    let isMounted = true;
    async function loadProjectDetails() {
      try {
        const [membersRes, tasksRes] = await Promise.all([
          projectService.getProjectMembers(selectedProjectId!).catch(() => ({ data: [] })),
          taskService.getTasksByProject(selectedProjectId!).catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        setProjectMembers((membersRes as any)?.data || []);
        const rawTasks = (tasksRes as any)?.data?.content || (tasksRes as any)?.data || [];
        setTasks(rawTasks);
      } catch (err) {
        console.warn("Failed to load project details for calendar", err);
      }
    }

    void loadProjectDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    projectStorage.setLastProjectId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("project", id.toString());
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-6 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col flex-1 animate-pulse" data-testid="calendar-loading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-muted rounded" />
            <div className="h-4 w-80 bg-muted/60 rounded" />
          </div>
          <div className="h-9 w-52 bg-muted rounded" />
        </div>
        <div className="flex-1 min-h-[400px] rounded-xl border border-border/40 p-6 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted/60 rounded" />
          </div>
          <div className="grid grid-cols-7 gap-2 pt-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/20 rounded-md border border-border/20 p-1.5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        className="min-h-screen p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col items-center justify-center text-center"
        data-testid="no-projects-calendar-empty"
      >
        <div className="w-12 h-12 rounded-xl bg-muted border border-border/80 flex items-center justify-center mb-4 text-muted-foreground">
          <CalendarDays className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">{t("calendar.no_projects_title", { defaultValue: "Chưa có dự án nào" })}</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t("calendar.no_projects_desc", { defaultValue: "Bạn cần tham gia hoặc tạo ít nhất một dự án để xem lịch trình các công việc và cuộc họp." })}
        </p>
        <Button onClick={() => navigate("/projects")} className="gap-2">
          <FolderKanban className="w-4 h-4" />
          {t("calendar.go_to_projects", { defaultValue: "Đi đến Danh sách Dự án" })}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col flex-1" data-testid="global-calendar-page">
      {/* Top Banner / Project Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {t("calendar.title", { defaultValue: "Lịch & Điều phối lịch trình" })}
                <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary bg-primary/5">
                  {t("calendar.badge", { defaultValue: "Teams & Outlook" })}
                </Badge>
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("calendar.subtitle", { defaultValue: "Lịch trình hôm nay, các phiên họp video và hạn chót công việc tổng hợp." })}
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
            {t("calendar.project_label", { defaultValue: "Dự án:" })}
          </span>
          <Select
            value={selectedProjectId ? String(selectedProjectId) : ""}
            onValueChange={(val) => handleSelectProject(parseInt(val, 10))}
          >
            <SelectTrigger
              className="w-full sm:w-[260px] h-9 bg-card border-border/80 shadow-xs font-medium text-xs sm:text-sm"
              data-testid="global-calendar-project-select"
            >
              <SelectValue placeholder={t("calendar.select_project", { defaultValue: "Chọn dự án..." })} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-primary font-mono">
                      #{p.id}
                    </span>
                    <span className="truncate max-w-[170px]">{p.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedProjectId && (
        <div className="flex-1 min-h-0">
          <ProjectCalendarTab
            key={`calendar-project-${selectedProjectId}`}
            projectId={selectedProjectId}
            projectMembers={projectMembers}
            tasks={tasks}
            currentUserId={currentUserId}
            onOpenTaskDetail={(taskId) => navigate(`/projects/${selectedProjectId}/tasks/${taskId}`)}
            hideTitle={true}
          />
        </div>
      )}
    </div>
  );
}
