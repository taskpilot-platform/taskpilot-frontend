import { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MessagesSquare,
  Search,
  FolderKanban,
  Hash,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectChatTab } from "@/components/chat/ProjectChatTab";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import { projectStorage } from "@/lib/storage";
import type { MyProject } from "@/types/project";

export default function GlobalChatPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<MyProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileChannelListOpen, setIsMobileChannelListOpen] = useState(false);

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
        const queryId = searchParams.get("project") || routeProjectId;
        const storedId = projectStorage.getLastProjectId();
        const initialId = queryId
          ? parseInt(queryId, 10)
          : storedId || projectList[0]?.id || null;

        if (initialId && projectList.some((p) => p.id === initialId)) {
          setSelectedProjectId(initialId);
        } else if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].id);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selected project with URL query param
  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    projectStorage.setLastProjectId(id);
    setSearchParams({ project: String(id) }, { replace: true });
    setIsMobileChannelListOpen(false);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center p-6" data-testid="global-chat-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải danh sách kênh trò chuyện...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center p-6 text-center" data-testid="global-chat-empty">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border/80 text-muted-foreground">
          <MessagesSquare className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">{t("chat.no_channels_title", { defaultValue: "Chưa có kênh trò chuyện nào" })}</h2>
        <p className="max-w-md text-sm text-muted-foreground mb-6">
          {t("chat.no_channels_desc", { defaultValue: "Bạn cần tham gia hoặc tạo một dự án để bắt đầu trò chuyện thời gian thực với đồng nghiệp." })}
        </p>
        <Button onClick={() => navigate("/projects")} className="gap-2">
          <FolderKanban className="h-4 w-4" />
          <span>{t("chat.go_to_projects", { defaultValue: "Đi đến trang Dự án" })}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-[calc(100vh-16px)] w-full flex-col overflow-hidden bg-background" data-testid="global-chat-page">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground md:text-lg">{t("chat.title", { defaultValue: "Kênh Trò Chuyện Nhóm" })}</h1>
              <Badge variant="outline" className="hidden sm:inline-flex border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                {t("chat.badge", { defaultValue: "Real-time STOMP" })}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t("chat.subtitle", { defaultValue: "Trao đổi tức thời và đính kèm tài liệu theo từng dự án" })}
            </p>
          </div>
        </div>

        {/* Mobile toggle channel list button */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileChannelListOpen(!isMobileChannelListOpen)}
            className="text-xs gap-1.5"
            data-testid="toggle-mobile-channel-list-btn"
          >
            <Hash className="h-3.5 w-3.5 text-primary" />
            <span>{t("chat.channel_btn", { count: projects.length, defaultValue: `Kênh (${projects.length})` })}</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Body Split: Left Channel List & Right Chat Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Projects / Channels */}
        <div
          className={`absolute inset-y-0 left-0 z-20 w-72 md:w-80 flex flex-col border-r bg-card transition-transform duration-300 md:static md:translate-x-0 ${
            isMobileChannelListOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
          data-testid="global-chat-sidebar"
        >
          {/* Channel search input */}
          <div className="p-3 border-b bg-card/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("chat.search_placeholder", { defaultValue: "Tìm kiếm kênh..." })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
                data-testid="project-search-input"
              />
            </div>
          </div>

          {/* Channel items list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Danh sách dự án</span>
              <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-md font-normal">{filteredProjects.length}</span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Không tìm thấy dự án phù hợp
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProject(p.id)}
                    className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-xs transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm font-medium"
                        : "hover:bg-accent text-foreground"
                    }`}
                    data-testid={`channel-item-${p.id}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Hash className="h-4 w-4" />
                    </div>
                    <div className="flex-1 truncate">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        #{p.id} • {p.myRole === "MANAGER" ? t("projects.role_manager", { defaultValue: "Quản lý" }) : t("projects.role_member", { defaultValue: "Thành viên" })}
                      </div>
                    </div>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile backdrop for channel drawer */}
        {isMobileChannelListOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/40 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileChannelListOpen(false)}
          />
        )}

        {/* Right Main Content: Active Project Chat */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background" data-testid="global-chat-content">
          {selectedProject ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 mb-2 border-b border-border/60 text-xs text-muted-foreground font-medium">
                <span>{t("calendar.project_label", { defaultValue: "Dự án:" })}</span>
                <span className="font-semibold text-foreground" data-testid="active-channel-name">
                  {selectedProject.name}
                </span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  #{selectedProject.id}
                </Badge>
              </div>
              <ProjectChatTab
                projectId={selectedProject.id}
                isArchived={selectedProject.status === "ARCHIVED"}
                currentUserId={currentUserId}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
              {t("chat.select_channel_prompt", { defaultValue: "Vui lòng chọn một kênh dự án để bắt đầu trò chuyện." })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
