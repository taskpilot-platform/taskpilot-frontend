import { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MessagesSquare,
  Search,
  FolderKanban,
  Hash,
  ArrowRight,
  Plus,
  Users,
  Video,
  Calendar,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectChatTab } from "@/components/chat/ProjectChatTab";
import { CustomGroupChatView } from "@/components/chat/CustomGroupChatView";
import { CreateGroupChatModal } from "@/components/chat/CreateGroupChatModal";
import { ProjectFilesTab } from "@/components/files/ProjectFilesTab";
import { ProjectMeetingsTab } from "@/components/meetings/ProjectMeetingsTab";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import { projectStorage } from "@/lib/storage";
import {
  customChatStorage,
  type CustomGroupChat,
} from "@/lib/custom-chat-storage";
import type { MyProject } from "@/types/project";
import type { UserProfile } from "@/types/user";

type ConversationType = "PROJECT" | "GROUP";
type ChatViewTab = "chat" | "files" | "meetings";
type FilterType = "ALL" | "CHANNELS" | "GROUPS";

export default function GlobalChatPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  // User state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Projects & Custom Groups state
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroupChat[]>([]);

  // Active Selection State
  const [activeType, setActiveType] = useState<ConversationType>("PROJECT");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChatViewTab>("chat");

  // Filters & Modals
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileChannelListOpen, setIsMobileChannelListOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // 1. Fetch User Profile, Projects & Custom Groups
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

        let uId: number | null = null;
        if (profileRes?.data?.id) {
          uId = profileRes.data.id;
          setCurrentUserId(uId);
          setProfile(profileRes.data);
        }

        const projectList: MyProject[] =
          (projectsRes as any)?.data?.content ||
          (projectsRes as any)?.data ||
          [];

        setProjects(projectList);

        // Load custom group chats
        const groups = customChatStorage.getGroups(uId);
        setCustomGroups(groups);

        // Determine initially selected conversation
        const queryProject = searchParams.get("project") || routeProjectId;
        const queryGroup = searchParams.get("group");

        if (queryGroup && groups.some((g) => g.id === queryGroup)) {
          setActiveType("GROUP");
          setSelectedGroupId(queryGroup);
        } else {
          const storedId = projectStorage.getLastProjectId();
          const initialId = queryProject
            ? parseInt(queryProject, 10)
            : storedId || projectList[0]?.id || null;

          if (initialId && projectList.some((p) => p.id === initialId)) {
            setActiveType("PROJECT");
            setSelectedProjectId(initialId);
          } else if (projectList.length > 0) {
            setActiveType("PROJECT");
            setSelectedProjectId(projectList[0].id);
          } else if (groups.length > 0) {
            setActiveType("GROUP");
            setSelectedGroupId(groups[0].id);
          }
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

  // Sync selection
  const handleSelectProject = (id: number) => {
    setActiveType("PROJECT");
    setSelectedProjectId(id);
    projectStorage.setLastProjectId(id);
    setSearchParams({ project: String(id) }, { replace: true });
    setIsMobileChannelListOpen(false);
  };

  const handleSelectGroup = (id: string) => {
    setActiveType("GROUP");
    setSelectedGroupId(id);
    setSearchParams({ group: id }, { replace: true });
    setIsMobileChannelListOpen(false);
  };

  const handleGroupCreated = (newGroup: CustomGroupChat) => {
    setCustomGroups((prev) => [newGroup, ...prev]);
    setActiveType("GROUP");
    setSelectedGroupId(newGroup.id);
    setSearchParams({ group: newGroup.id }, { replace: true });
  };

  // Selected entities
  const selectedProject =
    activeType === "PROJECT"
      ? projects.find((p) => p.id === selectedProjectId) || null
      : null;

  const selectedGroup =
    activeType === "GROUP"
      ? customGroups.find((g) => g.id === selectedGroupId) || null
      : null;

  // Filtering
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = customGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col flex-1 h-[calc(100vh-56px)] md:h-screen min-h-0" data-testid="global-chat-loading">
        <div className="flex flex-1 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md shadow-sm overflow-hidden animate-pulse">
          <div className="w-80 border-r border-border p-4 space-y-4 shrink-0">
            <div className="h-9 bg-muted rounded-md" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted/60 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="flex-1 bg-muted/20 rounded-lg p-4 space-y-3">
              <div className="h-10 w-2/3 bg-muted/40 rounded" />
              <div className="h-10 w-1/2 bg-muted/40 rounded ml-auto" />
              <div className="h-10 w-3/5 bg-muted/40 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0 && customGroups.length === 0) {
    return (
      <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-[500px]" data-testid="global-chat-empty">
        <div className="flex flex-col flex-1 items-center justify-center p-8 text-center rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border/80 text-muted-foreground">
            <MessagesSquare className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">
            {t("chat.no_channels_title", { defaultValue: "Chưa có kênh trò chuyện nào" })}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground mb-6">
            {t("chat.no_channels_desc", { defaultValue: "Bạn có thể tạo nhóm chat riêng hoặc tham gia dự án để bắt đầu trao đổi." })}
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsCreateGroupOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>{t("chat.new_group_btn", { defaultValue: "Tạo nhóm mới" })}</span>
            </Button>
            <Button variant="outline" onClick={() => navigate("/projects")} className="gap-2">
              <FolderKanban className="h-4 w-4" />
              <span>{t("chat.go_to_projects", { defaultValue: "Đi đến trang Dự án" })}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col flex-1 h-[calc(100vh-56px)] md:h-screen min-h-0" data-testid="global-chat-page">
      {/* MS Teams Shell Window Container */}
      <div className="flex flex-col flex-1 min-h-0 w-full rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md shadow-sm overflow-hidden">
        {/* 1. Shell Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/95 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessagesSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {t("chat.title", { defaultValue: "Kênh Trò Chuyện & Hội Thoại" })}
                </span>
                <Badge variant="outline" className="hidden sm:inline-flex border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0">
                  {t("chat.badge", { defaultValue: "Real-time STOMP" })}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Header: Create Group & Filter */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsCreateGroupOpen(true)}
              className="h-8 text-xs gap-1.5 font-medium shadow-xs"
              data-testid="btn-open-create-group"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("chat.new_group_btn", { defaultValue: "Tạo nhóm mới" })}</span>
            </Button>

            {/* Mobile drawer toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileChannelListOpen(!isMobileChannelListOpen)}
              className="h-8 text-xs gap-1.5 md:hidden"
              data-testid="toggle-mobile-channel-list-btn"
            >
              <Hash className="h-3.5 w-3.5 text-primary" />
              <span>{projects.length + customGroups.length}</span>
            </Button>
          </div>
        </div>

        {/* 2. Main Body Split: Left Sidebar & Right Unified Workspace */}
        <div className="flex flex-1 overflow-hidden relative min-h-0">
          {/* Left Sidebar: Conversations & Channels */}
          <div
            className={`absolute inset-y-0 left-0 z-20 w-72 md:w-80 flex flex-col border-r border-border/60 bg-card/95 backdrop-blur-md transition-transform duration-300 md:static md:translate-x-0 ${
              isMobileChannelListOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            }`}
            data-testid="global-chat-sidebar"
          >
            {/* Search Input */}
            <div className="p-2.5 border-b border-border/60 bg-card/50 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("chat.search_placeholder", { defaultValue: "Tìm kiếm kênh, nhóm..." })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8 bg-background border-border/70"
                  data-testid="project-search-input"
                />
              </div>

              {/* Segmented Filter Buttons */}
              <div className="flex rounded-lg bg-muted/50 p-0.5 text-[11px] font-medium border border-border/40">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`flex-1 py-1 rounded-md transition-colors text-center ${
                    filterType === "ALL"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("chat.filter_all", { defaultValue: "Tất cả" })}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("CHANNELS")}
                  className={`flex-1 py-1 rounded-md transition-colors text-center ${
                    filterType === "CHANNELS"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("chat.filter_channels", { defaultValue: "Kênh" })}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("GROUPS")}
                  className={`flex-1 py-1 rounded-md transition-colors text-center ${
                    filterType === "GROUPS"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("chat.filter_groups", { defaultValue: "Nhóm" })}
                </button>
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* SECTION 1: NHÓM TRÒ CHUYỆN (CUSTOM GROUP CHATS) */}
              {(filterType === "ALL" || filterType === "GROUPS") && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-primary" />
                      {t("chat.group_chats_title", { defaultValue: "Nhóm trò chuyện" })}
                    </span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-md font-normal">
                      {filteredGroups.length}
                    </span>
                  </div>

                  {filteredGroups.length === 0 && filterType === "GROUPS" && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      {t("chat.no_conversations_found", { defaultValue: "Không có nhóm trò chuyện nào" })}
                    </div>
                  )}

                  {filteredGroups.map((grp) => {
                    const isSelected = activeType === "GROUP" && grp.id === selectedGroupId;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => handleSelectGroup(grp.id)}
                        className={`w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-xs transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm font-medium"
                            : "hover:bg-accent text-foreground"
                        }`}
                        data-testid={`group-item-${grp.id}`}
                      >
                        <Avatar className="h-7 w-7 shrink-0 border border-current/20">
                          <AvatarImage src={grp.avatarUrl} />
                          <AvatarFallback
                            className={`text-[10px] font-bold ${
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {grp.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                          <div className="truncate font-semibold">{grp.name}</div>
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            {grp.lastMessage || `${grp.members.length} thành viên`}
                          </div>
                        </div>
                        {isSelected && <ArrowRight className="h-3 w-3 shrink-0 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: KÊNH DỰ ÁN (PROJECT CHANNELS) */}
              {(filterType === "ALL" || filterType === "CHANNELS") && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-emerald-500" />
                      {t("chat.project_channels_title", { defaultValue: "Kênh dự án" })}
                    </span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-md font-normal">
                      {filteredProjects.length}
                    </span>
                  </div>

                  {filteredProjects.length === 0 && filterType === "CHANNELS" && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      {t("chat.no_projects_found", { defaultValue: "Không tìm thấy dự án phù hợp" })}
                    </div>
                  )}

                  {filteredProjects.map((p) => {
                    const isSelected = activeType === "PROJECT" && p.id === selectedProjectId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProject(p.id)}
                        className={`w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-xs transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm font-medium"
                            : "hover:bg-accent text-foreground"
                        }`}
                        data-testid={`channel-item-${p.id}`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Hash className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 truncate">
                          <div className="truncate font-semibold">{p.name}</div>
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            #{p.id} • {p.myRole === "MANAGER" ? t("projects.role_manager", { defaultValue: "Quản lý" }) : t("projects.role_member", { defaultValue: "Thành viên" })}
                          </div>
                        </div>
                        {isSelected && <ArrowRight className="h-3 w-3 shrink-0 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Backdrop */}
          {isMobileChannelListOpen && (
            <div
              className="fixed inset-0 z-10 bg-black/40 backdrop-blur-xs md:hidden"
              onClick={() => setIsMobileChannelListOpen(false)}
            />
          )}

          {/* Right Main Content: MS Teams Unified Active Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background/50 min-h-0" data-testid="global-chat-content">
            {selectedProject || selectedGroup ? (
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                {/* 1. MS Teams Single Clean Header Bar (Zero Russian-Doll Nesting!) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-card/60 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 rounded-xl border border-border/60 shrink-0">
                      <AvatarFallback className="rounded-xl text-xs font-bold bg-primary/10 text-primary">
                        {activeType === "PROJECT"
                          ? selectedProject?.name.charAt(0).toUpperCase()
                          : selectedGroup?.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <h2
                          className="text-sm sm:text-base font-bold text-foreground truncate"
                          data-testid="active-channel-name"
                        >
                          {activeType === "PROJECT" ? selectedProject?.name : selectedGroup?.name}
                        </h2>
                        {activeType === "PROJECT" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            #{selectedProject?.id}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                        <span>
                          {activeType === "PROJECT"
                            ? selectedProject?.myRole === "MANAGER"
                              ? t("projects.role_manager", { defaultValue: "Quản lý" })
                              : t("projects.role_member", { defaultValue: "Thành viên" })
                            : `${selectedGroup?.members.length} ${t("chat.members_count", { count: selectedGroup?.members.length || 0 })}`}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t("chat.connected", { defaultValue: "Đã kết nối" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MS Teams Top Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Meet Now Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (activeType === "PROJECT" && selectedProject) {
                          navigate(`/meetings?project=${selectedProject.id}`);
                        } else {
                          navigate("/meetings");
                        }
                      }}
                      className="h-8 text-xs gap-1.5 border-border/70 hover:bg-primary/5 hover:text-primary"
                      data-testid="btn-meet-now"
                    >
                      <Video className="h-3.5 w-3.5 text-primary" />
                      <span>{t("chat.meet_now", { defaultValue: "Họp ngay" })}</span>
                    </Button>

                    {/* Schedule Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (activeType === "PROJECT" && selectedProject) {
                          navigate(`/calendar?project=${selectedProject.id}`);
                        } else {
                          navigate("/calendar");
                        }
                      }}
                      className="h-8 text-xs gap-1.5 border-border/70 hidden sm:inline-flex"
                    >
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t("chat.schedule_meeting", { defaultValue: "Lên lịch" })}</span>
                    </Button>

                    {/* View Members Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsMembersModalOpen(true)}
                      className="h-8 text-xs gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {activeType === "GROUP"
                          ? selectedGroup?.members.length
                          : t("chat.members_drawer", { defaultValue: "Thành viên" })}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* 2. MS Teams 3 Pillars Tabs Header */}
                <div className="flex items-center gap-2 px-4 border-b border-border/60 bg-muted/20 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === "chat"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-chat-btn"
                  >
                    <MessagesSquare className="h-3.5 w-3.5" />
                    <span>{t("chat.tab_chat", { defaultValue: "Trò chuyện" })}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("files")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === "files"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-files-btn"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t("chat.tab_files", { defaultValue: "Tài liệu" })}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("meetings")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === "meetings"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-meetings-btn"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>{t("chat.tab_meetings", { defaultValue: "Cuộc họp & Bản ghi" })}</span>
                  </button>
                </div>

                {/* 3. Tab Body Container */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* TAB 1: TRÒ CHUYỆN (CHAT) */}
                  {activeTab === "chat" && (
                    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                      {activeType === "PROJECT" && selectedProject && (
                        <ProjectChatTab
                          projectId={selectedProject.id}
                          isArchived={selectedProject.status === "ARCHIVED"}
                          currentUserId={currentUserId}
                          hideHeader={true}
                          embedded={true}
                        />
                      )}
                      {activeType === "GROUP" && selectedGroup && (
                        <CustomGroupChatView
                          group={selectedGroup}
                          currentUserId={currentUserId}
                          currentUserName={profile?.fullName || "Tôi"}
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 2: TÀI LIỆU (FILES) */}
                  {activeTab === "files" && (
                    <div className="flex-1 p-4 overflow-y-auto">
                      {activeType === "PROJECT" && selectedProject ? (
                        <ProjectFilesTab
                          projectId={selectedProject.id}
                          isManager={selectedProject.myRole === "MANAGER"}
                          currentUserId={currentUserId}
                          isArchived={selectedProject.status === "ARCHIVED"}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium">
                            {t("chat.no_files_shared", { defaultValue: "Chưa có tài liệu nào được gửi trong nhóm này." })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            {t("chat.files_tab_hint", { defaultValue: "Tất cả file đính kèm trong tin nhắn sẽ tự động xuất hiện tại đây." })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: CUỘC HỌP & BẢN GHI (MEETINGS) */}
                  {activeTab === "meetings" && (
                    <div className="flex-1 p-4 overflow-y-auto">
                      {activeType === "PROJECT" && selectedProject ? (
                        <ProjectMeetingsTab
                          projectId={selectedProject.id}
                          isArchived={selectedProject.status === "ARCHIVED"}
                          currentUserId={currentUserId}
                          hideHeader={true}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                          <Video className="h-10 w-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium">
                            {t("chat.no_group_meetings", { defaultValue: "Chưa có cuộc họp nào được tổ chức trong nhóm này." })}
                          </p>
                          <Button
                            onClick={() => navigate("/meetings")}
                            size="sm"
                            className="mt-4 gap-1.5 text-xs"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>{t("chat.meet_now", { defaultValue: "Bắt đầu họp ngay" })}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
                {t("chat.select_channel_prompt", { defaultValue: "Vui lòng chọn một kênh dự án hoặc nhóm trò chuyện để bắt đầu." })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Modal Tạo Nhóm Chat Mới (MS Teams Custom Group Chat) */}
      <CreateGroupChatModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreated={handleGroupCreated}
        currentUserId={currentUserId}
        currentUserName={profile?.fullName || "Tôi"}
      />

      {/* 4. Modal Danh Sách Thành Viên (Members Drawer / Dialog) */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border/80 p-0 overflow-hidden shadow-xl">
          <DialogHeader className="p-4 border-b border-border/60 bg-muted/20">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>
                {activeType === "PROJECT"
                  ? `${t("chat.channels_title", { defaultValue: "Kênh dự án" })}: ${selectedProject?.name}`
                  : `${t("chat.group_chats_title", { defaultValue: "Nhóm" })}: ${selectedGroup?.name}`}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {activeType === "PROJECT"
                ? t("chat.project_members_desc", { defaultValue: "Thành viên dự án được phân quyền quản lý tự động." })
                : `${selectedGroup?.members.length} ${t("chat.members_count", { count: selectedGroup?.members.length || 0 })}`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 max-h-72 overflow-y-auto divide-y divide-border/40">
            {activeType === "GROUP" && selectedGroup ? (
              selectedGroup.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 border border-border/60">
                      <AvatarImage src={m.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                        {m.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                  <Badge variant={m.role === "OWNER" ? "default" : "secondary"} className="text-[10px]">
                    {m.role === "OWNER" ? "Trưởng nhóm" : "Thành viên"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {t("chat.project_managed_members", {
                  defaultValue: "Thành viên tham gia theo bảng phân quyền dự án.",
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
