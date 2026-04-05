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
  X
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
  const [pageSize, setPageSize] = useState(8);
  const [keyword, setKeyword] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "detail">("list");

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

  const filteredProjects = useMemo(() => {
    if (!keyword.trim()) return projects;
    const lowerKeyword = keyword.toLowerCase();
    return projects.filter((p) => p.name?.toLowerCase().includes(lowerKeyword));
  }, [projects, keyword]);

  const loadMyProjects = async (targetPage = currentPage, limit = pageSize) => {
    setIsLoading(true);
    try {
      const response = await projectService.getMyProjects(targetPage, limit);
      setProjects(response.data.content);
      setTotalElements(response.data.totalElements);
      setCurrentPage(response.data.number);

      if (response.data.content.length === 0) {
        setSelectedProjectId(null);
        setProjectDetail(null);
        setProjectSummary(null);
        setProjectMembers([]);
        setMode("list");
      } else if (selectedProjectId && !response.data.content.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(null);
        setMode("list");
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
      setMode("detail");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadMyProjects(0, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      void loadSelectedProjectData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleModeChange = (newMode: "create" | "list" | "detail") => {
    if (newMode === "list" || newMode === "create") {
      setSelectedProjectId(null);
    }
    setMode(newMode);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    void loadMyProjects(0, newSize);
  };

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

      toast.success(t("projects.create_success"));
      setCreateName("");
      setCreateDescription("");
      setCreateHeuristicMode("BALANCED");
      setCreateStartDate("");
      setCreateEndDate("");
      setMode("list");
      await loadMyProjects(0, pageSize);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleJoinProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!joinCode.trim()) {
      toast.error(t("projects.join_error_empty"));
      return;
    }

    setIsMutating(true);
    try {
      await projectService.joinProject({ projectCode: joinCode.trim() });
      toast.success(t("projects.join_success"));
      setJoinCode("");
      setMode("list");
      await loadMyProjects(0, pageSize);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProjectId) {
      toast.error(t("projects.update_error_empty"));
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

      toast.success(t("projects.update_success"));
      await Promise.all([loadMyProjects(currentPage, pageSize), loadSelectedProjectData(selectedProjectId)]);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleLeaveProject = async (projectId: number) => {
    const confirmed = window.confirm(t("projects.leave_confirm"));
    if (!confirmed) {
      return;
    }

    setIsMutating(true);
    try {
      await projectService.leaveProject(projectId);
      toast.success(t("projects.leave_success"));
      if (selectedProjectId === projectId) {
        setMode("list");
      }
      await loadMyProjects(currentPage, pageSize);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8 flex flex-col h-screen overflow-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("projects.title")}</h1>
          <p className="text-muted-foreground">{t("projects.desc")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => handleModeChange(mode === "create" ? "list" : "create")}
            disabled={isMutating || isLoading}
          >
            <PlusCircle className="h-4 w-4" />
            {mode === "create" ? t("projects.cancel_btn") : t("projects.create_title")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => void loadMyProjects(currentPage, pageSize)}
            disabled={isMutating || isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {t("skills.reload_btn")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 flex-1 overflow-hidden min-h-0">
        <Card className={`${mode === "list" ? "xl:col-span-3 transition-all duration-300" : "xl:col-span-2 transition-all duration-300"} flex flex-col overflow-hidden`}>
          <CardHeader className="shrink-0">
            <CardTitle>{t("projects.title")}</CardTitle>
            <CardDescription>
              {t("projects.total", { total: totalElements })} {t("projects.page", { page: currentPage + 1, totalPages })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="mb-4 flex gap-2 shrink-0">
              <Input
                placeholder={t("projects.search")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-sm"
              />
              <Button type="button" variant="secondary" size="icon" disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("projects.loading")}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto rounded-md border min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projects.col_project")}</TableHead>
                      <TableHead>{t("projects.col_role")}</TableHead>
                      <TableHead>{t("projects.col_status")}</TableHead>
                      <TableHead>{t("projects.col_joined")}</TableHead>
                      <TableHead className="w-[100px] text-right">{t("projects.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          {t("projects.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProjects.map((project) => (
                        <TableRow
                          key={project.id}
                          className={selectedProjectId === project.id ? "bg-accent/40 cursor-pointer" : "cursor-pointer"}
                          onClick={() => {
                            if (selectedProjectId === project.id) {
                              handleModeChange("list");
                            } else {
                              setSelectedProjectId(project.id);
                            }
                          }}
                        >
                          <TableCell>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">ID: {project.id}</div>
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
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleLeaveProject(project.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="gap-1 h-7 text-xs"
                              disabled={isMutating}
                            >
                              <LogOut className="h-3 w-3" />
                              Rời
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>

                <div className="mt-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("projects.show")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 py-1 text-sm"
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    >
                      <option value={8}>8</option>
                      <option value={16}>16</option>
                      <option value={40}>40</option>
                    </select>
                    <span>{t("projects.rows")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadMyProjects(Math.max(0, currentPage - 1), pageSize)}
                      disabled={currentPage === 0 || isMutating || isLoading}
                    >
                      {t("projects.btn_prev")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadMyProjects(Math.min(totalPages - 1, currentPage + 1), pageSize)}
                      disabled={currentPage >= totalPages - 1 || isMutating || isLoading}
                    >
                      {t("projects.btn_next")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {mode !== "list" && (
          <div className="space-y-4 overflow-y-auto pr-2 pb-2">
            {mode === "create" && (
              <>
                <Card className="animate-in slide-in-from-right-8 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        {t("projects.create_title")}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                        <X className="h-4 w-4" />
                      </Button>
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
                          {heuristicModes.map((m) => (
                            <option key={m} value={m}>
                              {m}
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

                <Card className="animate-in slide-in-from-right-8 duration-300">
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
                      <Button type="submit" className="w-full gap-2" disabled={isMutating}>
                        <Search className="h-4 w-4" />
                        {t("projects.join_btn")}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            {mode === "detail" && (
              <>
                <Card className="animate-in slide-in-from-right-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        {t("projects.detail_title")}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                        <X className="h-4 w-4" />
                      </Button>
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
                          <Label htmlFor="editName">{t("projects.name")}</Label>
                          <Input
                            id="editName"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            disabled={!isSelectedProjectManager}
                            required
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="editDescription">{t("projects.desc")}</Label>
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
                          <Label htmlFor="editStatus">{t("projects.col_status")}</Label>
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
                            {heuristicModes.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editStartDate">{t("projects.start_date")}</Label>
                          <Input
                            id="editStartDate"
                            type="date"
                            value={editStartDate}
                            onChange={(event) => setEditStartDate(event.target.value)}
                            disabled={!isSelectedProjectManager}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editEndDate">{t("projects.end_date")}</Label>
                          <Input
                            id="editEndDate"
                            type="date"
                            value={editEndDate}
                            onChange={(event) => setEditEndDate(event.target.value)}
                            disabled={!isSelectedProjectManager}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Button type="submit" className="gap-2 w-full" disabled={isMutating || !isSelectedProjectManager}>
                            <Wrench className="h-4 w-4" />
                            {t("projects.update_btn")}
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>

                <Card className="animate-in slide-in-from-right-4 duration-300">
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

                <Card className="animate-in slide-in-from-right-4 duration-300 shrink-0">
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
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {projectMembers.map((member) => (
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
