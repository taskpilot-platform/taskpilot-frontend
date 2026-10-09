import { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Video,
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
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import { projectStorage } from "@/lib/storage";
import type { MyProject } from "@/types/project";

export default function GlobalMeetingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<MyProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read join parameter if specified (?join=123)
  const initialJoinMeetingId = searchParams.get("join")
    ? parseInt(searchParams.get("join")!, 10)
    : null;

  // 1. Fetch User Profile & Projects
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
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
        const paramProjectId = routeProjectId || searchParams.get("project");
        let initialId: number | null = null;

        if (paramProjectId) {
          const parsed = parseInt(paramProjectId, 10);
          if (projectList.some((p) => p.id === parsed)) {
            initialId = parsed;
          }
        }

        if (!initialId) {
          const lastActiveId = projectStorage.getLastProjectId();
          if (lastActiveId && projectList.some((p) => p.id === lastActiveId)) {
            initialId = lastActiveId;
          } else if (projectList.length > 0) {
            initialId = projectList[0].id;
          }
        }

        setSelectedProjectId(initialId);
      } catch (err) {
        console.error("Failed to load meetings page data", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [routeProjectId]);

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    projectStorage.setLastProjectId(projectId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("project", projectId.toString());
      return next;
    });
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 h-full min-h-0 space-y-6 animate-pulse" data-testid="meetings-loading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted/60 rounded" />
          </div>
          <div className="h-9 w-52 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-muted/30 rounded-xl border border-border/40 p-4 space-y-3">
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted/60 rounded" />
              <div className="h-16 bg-muted/20 rounded mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-md mx-auto"
        data-testid="no-projects-meeting-empty"
      >
        <div className="w-12 h-12 rounded-xl bg-muted border border-border/80 flex items-center justify-center mb-4 text-muted-foreground">
          <Video className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">{t("meetings.no_projects_title", { defaultValue: "Chưa có dự án nào" })}</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t("meetings.no_projects_desc", { defaultValue: "Bạn cần tham gia hoặc tạo ít nhất một dự án để bắt đầu các phiên họp video trực tuyến và cộng tác thời gian thực." })}
        </p>
        <Button onClick={() => navigate("/projects")} className="gap-2">
          <FolderKanban className="w-4 h-4" />
          {t("meetings.go_to_projects", { defaultValue: "Đi đến Danh sách Dự án" })}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-6" data-testid="global-meetings-page">
      {/* Top Banner / Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {t("meetings.title", { defaultValue: "Cuộc họp trực tuyến" })}
                <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary bg-primary/5">
                  {t("meetings.badge", { defaultValue: "Live Video & Audio" })}
                </Badge>
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("meetings.subtitle", { defaultValue: "Họp video HD thời gian thực, chia sẻ màn hình và ghi hình cuộc họp theo từng dự án." })}
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
            {t("meetings.project_label", { defaultValue: "Dự án:" })}
          </span>
          <Select
            value={selectedProjectId ? String(selectedProjectId) : ""}
            onValueChange={(val) => handleSelectProject(parseInt(val, 10))}
          >
            <SelectTrigger
              className="w-full sm:w-[260px] h-9 bg-card border-border/80 shadow-sm font-medium text-xs sm:text-sm"
              data-testid="global-meetings-project-select"
            >
              <SelectValue placeholder={t("meetings.select_project", { defaultValue: "Chọn dự án..." })} />
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
          <ProjectMeetingsTab
            key={`meetings-project-${selectedProjectId}`}
            projectId={selectedProjectId}
            isArchived={selectedProject?.status === "ARCHIVED"}
            currentUserId={currentUserId}
            initialJoinMeetingId={initialJoinMeetingId}
          />
        </div>
      )}
    </div>
  );
}
