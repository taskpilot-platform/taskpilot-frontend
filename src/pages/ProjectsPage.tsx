import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  Loader2,
  LogOut,
  PlusCircle,
  RefreshCw,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/http";
import { projectService } from "@/services/project.service";
import type {
  HeuristicMode,
  MyProject,
  Project,
  ProjectMember,
  ProjectStatus,
  ProjectSummary,
} from "@/types/project";

const heuristicModes: HeuristicMode[] = [
  "BALANCED",
  "URGENT",
  "TRAINING",
];

const projectStatuses: ProjectStatus[] = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"];

export default function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(8);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createHeuristicMode, setCreateHeuristicMode] = useState<HeuristicMode>("BALANCED");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");

  const [joinCode, setJoinCode] = useState("");

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("ACTIVE");
  const [editHeuristicMode, setEditHeuristicMode] = useState<HeuristicMode>("BALANCED");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const selectedProjectMeta = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const isSelectedProjectManager = selectedProjectMeta?.myRole === "MANAGER";

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalElements / pageSize)), [totalElements, pageSize]);

  const loadMyProjects = async (targetPage = currentPage) => {
    setIsLoading(true);
    try {
      const response = await projectService.getMyProjects(targetPage, pageSize);
      setProjects(response.data.content);
      setTotalElements(response.data.totalElements);
      setCurrentPage(response.data.number);

      if (response.data.content.length === 0) {
        setSelectedProjectId(null);
        setProjectDetail(null);
        setProjectSummary(null);
        setProjectMembers([]);
      } else if (!response.data.content.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(response.data.content[0].id);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectedProjectData = async (projectId: number) => {
    try {
      const [detailResponse, summaryResponse, membersResponse] = await Promise.all([
        projectService.getProjectDetail(projectId),
        projectService.getProjectSummary(projectId),
        projectService.getProjectMembers(projectId),
      ]);

      setProjectDetail(detailResponse.data);
      setProjectSummary(summaryResponse.data);
      setProjectMembers(membersResponse.data);

      setEditName(detailResponse.data.name || "");
      setEditDescription(detailResponse.data.description || "");
      setEditStatus(detailResponse.data.status);
      setEditHeuristicMode(detailResponse.data.heuristicMode);
      setEditStartDate(detailResponse.data.startDate || "");
      setEditEndDate(detailResponse.data.endDate || "");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadMyProjects(0);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      void loadSelectedProjectData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsMutating(true);
    try {
      await projectService.createProject({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        heuristicMode: createHeuristicMode,
        startDate: createStartDate || undefined,
        endDate: createEndDate || undefined,
      });

      toast.success("Tạo dự án thành công");
      setCreateName("");
      setCreateDescription("");
      setCreateHeuristicMode("BALANCED");
      setCreateStartDate("");
      setCreateEndDate("");
      await loadMyProjects(0);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleJoinProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!joinCode.trim()) {
      toast.error("Vui lòng nhập mã dự án");
      return;
    }

    setIsMutating(true);
    try {
      await projectService.joinProject({ projectCode: joinCode.trim() });
      toast.success("Tham gia dự án thành công");
      setJoinCode("");
      await loadMyProjects(0);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProjectId) {
      toast.error("Vui lòng chọn dự án cần cập nhật");
      return;
    }

    setIsMutating(true);
    try {
      await projectService.updateProject(selectedProjectId, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
        status: editStatus,
        heuristicMode: editHeuristicMode,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      });

      toast.success("Cập nhật dự án thành công");
      await Promise.all([loadMyProjects(currentPage), loadSelectedProjectData(selectedProjectId)]);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleLeaveProject = async (projectId: number) => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn rời dự án này?");
    if (!confirmed) {
      return;
    }

    setIsMutating(true);
    try {
      await projectService.leaveProject(projectId);
      toast.success("Đã rời dự án");
      await loadMyProjects(0);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("projects.title")}</h1>
          <p className="text-muted-foreground">Theo dõi dự án đã tham gia, tạo dự án mới và quản trị thông tin dự án.</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => void loadMyProjects(currentPage)}
          disabled={isMutating || isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("projects.title")}</CardTitle>
            <CardDescription>
              {t("projects.total", { total: totalElements })} {t("projects.page", { page: currentPage + 1, totalPages })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("projects.loading")}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projects.col_project")}</TableHead>
                      <TableHead>{t("projects.col_role")}</TableHead>
                      <TableHead>{t("projects.col_status")}</TableHead>
                      <TableHead>{t("projects.col_joined")}</TableHead>
                      <TableHead className="w-[160px]">{t("projects.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          {t("projects.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.map((project) => (
                        <TableRow
                          key={project.id}
                          className={selectedProjectId === project.id ? "bg-accent/40" : ""}
                        >
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setSelectedProjectId(project.id)}
                              className="text-left hover:underline"
                            >
                              <div className="font-medium">{project.name}</div>
                              <div className="text-xs text-muted-foreground">ID: {project.id}</div>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={project.myRole === "MANAGER" ? "default" : "secondary"}>
                              {project.myRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{project.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(project.joinedAt).toLocaleDateString("vi-VN")}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => void handleLeaveProject(project.id)}
                              disabled={isMutating}
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Rời
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadMyProjects(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0 || isMutating || isLoading}
                  >
                    {t("projects.btn_prev")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadMyProjects(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1 || isMutating || isLoading}
                  >
                    {t("projects.btn_next")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PlusCircle className="h-4 w-4" />
                {t("projects.create_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleCreateProject}>
                <div className="space-y-1.5">
                  <Label htmlFor="projectName">{t("projects.name")}</Label>
                  <Input
                    id="projectName"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder={t("projects.name_placeholder")}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="projectDescription">{t("projects.desc")}</Label>
                  <textarea
                    id="projectDescription"
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={t("projects.desc_placeholder")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="heuristicMode">{t("projects.mode")}</Label>
                  <select
                    id="heuristicMode"
                    value={createHeuristicMode}
                    onChange={(event) => setCreateHeuristicMode(event.target.value as HeuristicMode)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {heuristicModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">{t("projects.start_date")}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={createStartDate}
                      onChange={(event) => setCreateStartDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">{t("projects.end_date")}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={createEndDate}
                      onChange={(event) => setCreateEndDate(event.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isMutating}>
                  <PlusCircle className="h-4 w-4" />
                  {isMutating ? t("projects.creating_btn") : t("projects.create_btn")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                {t("projects.join_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleJoinProject}>
                <div className="space-y-1.5">
                  <Label htmlFor="joinCode">{t("projects.join_code")}</Label>
                  <Input
                    id="joinCode"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    placeholder={t("projects.join_code_placeholder")}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isMutating}>
                  {t("projects.join_btn")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {t("projects.detail_title")}
            </CardTitle>
            <CardDescription>
              {selectedProjectMeta
                ? t("projects.detail_desc_selected", { name: selectedProjectMeta.name, role: selectedProjectMeta.myRole })
                : t("projects.detail_desc_unselected")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!projectDetail ? (
              <p className="text-sm text-muted-foreground">{t("projects.detail_empty")}</p>
            ) : (
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleUpdateProject}>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="editName">Tên dự án</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    disabled={!isSelectedProjectManager}
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="editDescription">Mô tả</Label>
                  <textarea
                    id="editDescription"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={!isSelectedProjectManager}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editStatus">Trạng thái</Label>
                  <select
                    id="editStatus"
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value as ProjectStatus)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={!isSelectedProjectManager}
                  >
                    {projectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editMode">Heuristic mode</Label>
                  <select
                    id="editMode"
                    value={editHeuristicMode}
                    onChange={(event) => setEditHeuristicMode(event.target.value as HeuristicMode)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={!isSelectedProjectManager}
                  >
                    {heuristicModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editStartDate">Ngày bắt đầu</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={editStartDate}
                    onChange={(event) => setEditStartDate(event.target.value)}
                    disabled={!isSelectedProjectManager}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editEndDate">Ngày kết thúc</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={editEndDate}
                    onChange={(event) => setEditEndDate(event.target.value)}
                    disabled={!isSelectedProjectManager}
                  />
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" className="gap-2" disabled={isMutating || !isSelectedProjectManager}>
                    <Wrench className="h-4 w-4" />
                    {t("projects.update_btn")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                {t("projects.overview_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("projects.member_count")}</span>
                <strong>{projectSummary?.totalMembers ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("projects.task_count")}</span>
                <strong>{projectSummary?.totalTasks ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("projects.task_done")}</span>
                <strong>{projectSummary?.completedTasks ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("projects.task_wip")}</span>
                <strong>{projectSummary?.inProgressTasks ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("projects.task_todo")}</span>
                <strong>{projectSummary?.pendingTasks ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("projects.progress")}</span>
                <strong>{Number(projectSummary?.completionRate ?? 0).toFixed(1)}%</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                {t("projects.members_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("projects.members_empty")}</p>
              ) : (
                <div className="space-y-2">
                  {projectMembers.slice(0, 8).map((member) => (
                    <div key={`${member.projectId}-${member.userId}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{t("projects.member_id", { id: member.userId })}</span>
                      <Badge variant={member.role === "MANAGER" ? "default" : "outline"}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
