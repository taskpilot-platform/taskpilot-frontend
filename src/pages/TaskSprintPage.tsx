import { useMemo, useState } from "react";
import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ViewMode = "overview" | "kanban" | "timeline" | "sprints";
type TaskStatus = "BACKLOG" | "TODO" | "DOING" | "DONE";
type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

type TaskCard = {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
  sprint: string;
  dueDate: string;
  overdue: boolean;
};

const taskCards: TaskCard[] = [
  {
    id: "TP-241",
    title: "Refactor task modal for sprint planning",
    assignee: "Linh",
    status: "DOING",
    priority: "HIGH",
    points: 5,
    sprint: "Sprint 19",
    dueDate: "09/05",
    overdue: false,
  },
  {
    id: "TP-243",
    title: "Implement drag and drop in Kanban lane",
    assignee: "An",
    status: "TODO",
    priority: "MEDIUM",
    points: 8,
    sprint: "Sprint 19",
    dueDate: "12/05",
    overdue: false,
  },
  {
    id: "TP-245",
    title: "Fix timeline bar overlap on tablet",
    assignee: "Quang",
    status: "BACKLOG",
    priority: "LOW",
    points: 3,
    sprint: "Backlog",
    dueDate: "14/05",
    overdue: false,
  },
  {
    id: "TP-238",
    title: "Create sprint burndown summary widget",
    assignee: "Trang",
    status: "DONE",
    priority: "MEDIUM",
    points: 5,
    sprint: "Sprint 18",
    dueDate: "03/05",
    overdue: false,
  },
  {
    id: "TP-230",
    title: "Review acceptance criteria for onboarding flow",
    assignee: "Minh",
    status: "DOING",
    priority: "HIGH",
    points: 2,
    sprint: "Sprint 18",
    dueDate: "01/05",
    overdue: true,
  },
  {
    id: "TP-248",
    title: "Add sprint template for release planning",
    assignee: "Vy",
    status: "TODO",
    priority: "LOW",
    points: 3,
    sprint: "Sprint 19",
    dueDate: "16/05",
    overdue: false,
  },
];

const timelineMilestones = [
  { key: "planning", owner: "PM", start: "06/05", end: "07/05", progress: 100 },
  { key: "design", owner: "UI/UX", start: "07/05", end: "10/05", progress: 75 },
  { key: "implementation", owner: "Frontend", start: "08/05", end: "15/05", progress: 45 },
  { key: "qa", owner: "QA", start: "13/05", end: "17/05", progress: 10 },
];

const sprintCapacity = [
  { key: "design", percent: 70 },
  { key: "frontend", percent: 82 },
  { key: "backend", percent: 64 },
  { key: "qa", percent: 35 },
];

const sprintOptions = ["all", "Sprint 19", "Sprint 18", "Backlog"] as const;

const statusOrder: TaskStatus[] = ["BACKLOG", "TODO", "DOING", "DONE"];

const priorityBadgeClass: Record<TaskPriority, string> = {
  HIGH: "border-red-500/40 text-red-600 dark:text-red-300",
  MEDIUM: "border-amber-500/40 text-amber-600 dark:text-amber-300",
  LOW: "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
};

export default function TaskSprintPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [searchInput, setSearchInput] = useState("");
  const [selectedSprint, setSelectedSprint] = useState<(typeof sprintOptions)[number]>("all");

  const filteredTasks = useMemo(() => {
    return taskCards.filter((task) => {
      const matchedSprint = selectedSprint === "all" || task.sprint === selectedSprint;
      const query = searchInput.trim().toLowerCase();
      const matchedQuery =
        query.length === 0 ||
        task.id.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query);

      return matchedSprint && matchedQuery;
    });
  }, [searchInput, selectedSprint]);

  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const inProgress = filteredTasks.filter((task) => task.status === "DOING").length;
    const done = filteredTasks.filter((task) => task.status === "DONE").length;
    const overdue = filteredTasks.filter((task) => task.overdue).length;
    const velocityPoints = filteredTasks
      .filter((task) => task.status === "DONE")
      .reduce((totalPoints, task) => totalPoints + task.points, 0);

    return {
      total,
      inProgress,
      done,
      overdue,
      velocity: velocityPoints,
    };
  }, [filteredTasks]);

  const groupedKanban = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      tasks: filteredTasks.filter((task) => task.status === status),
    }));
  }, [filteredTasks]);

  const backlogRows = useMemo(() => {
    return filteredTasks
      .filter((task) => task.status !== "DONE")
      .sort((a, b) => b.points - a.points);
  }, [filteredTasks]);

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("tasks.title")}</h1>
          <p className="text-muted-foreground">{t("tasks.desc")}</p>
        </div>
        <Button type="button" variant="secondary" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t("tasks.refresh_btn")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("tasks.summary_total_tasks")}</CardDescription>
            <CardTitle>{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("tasks.summary_in_progress")}</CardDescription>
            <CardTitle>{summary.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("tasks.summary_done")}</CardDescription>
            <CardTitle>{summary.done}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("tasks.summary_overdue")}</CardDescription>
            <CardTitle>{summary.overdue}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("tasks.summary_velocity")}</CardDescription>
            <CardTitle>{summary.velocity} SP</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={viewMode === "overview" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setViewMode("overview")}
            >
              <LayoutDashboard className="h-4 w-4" />
              {t("tasks.tab_overview")}
            </Button>
            <Button
              type="button"
              variant={viewMode === "kanban" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setViewMode("kanban")}
            >
              <FolderKanban className="h-4 w-4" />
              {t("tasks.tab_kanban")}
            </Button>
            <Button
              type="button"
              variant={viewMode === "timeline" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setViewMode("timeline")}
            >
              <CalendarDays className="h-4 w-4" />
              {t("tasks.tab_timeline")}
            </Button>
            <Button
              type="button"
              variant={viewMode === "sprints" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setViewMode("sprints")}
            >
              <ListChecks className="h-4 w-4" />
              {t("tasks.tab_sprints")}
            </Button>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 md:w-72"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("tasks.search_placeholder")}
              />
            </div>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={selectedSprint}
              onChange={(event) => setSelectedSprint(event.target.value as (typeof sprintOptions)[number])}
            >
              <option value="all">{t("tasks.sprint_all")}</option>
              <option value="Sprint 19">Sprint 19</option>
              <option value="Sprint 18">Sprint 18</option>
              <option value="Backlog">{t("tasks.sprint_backlog")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {viewMode === "overview" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.overview_objective_title")}</CardTitle>
              <CardDescription>{t("tasks.overview_objective_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{t("tasks.overview_objective_value")}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("tasks.overview_completion")}</span>
                  <span className="font-semibold">63%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 w-[63%] rounded-full bg-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.overview_risks_title")}</CardTitle>
              <CardDescription>{t("tasks.overview_risks_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                {t("tasks.overview_risk_1")}
              </div>
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
                {t("tasks.overview_risk_2")}
              </div>
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                {t("tasks.overview_risk_3")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.overview_workload_title")}</CardTitle>
              <CardDescription>{t("tasks.overview_workload_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sprintCapacity.map((cap) => (
                <div key={cap.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t(`tasks.capacity_${cap.key}`)}</span>
                    <span className="font-medium">{cap.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${cap.percent}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "kanban" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tasks.kanban_title")}</CardTitle>
            <CardDescription>{t("tasks.kanban_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid min-w-[980px] gap-4 md:grid-cols-4">
              {groupedKanban.map((column) => (
                <div key={column.status} className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t(`tasks.col_${column.status.toLowerCase()}`)}</h3>
                    <Badge variant="secondary">{column.tasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {column.tasks.length === 0 && (
                      <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                        {t("tasks.kanban_empty")}
                      </p>
                    )}
                    {column.tasks.map((task) => (
                      <div key={task.id} className="space-y-2 rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{task.id}</span>
                          <Badge variant="outline" className={priorityBadgeClass[task.priority]}>
                            {t(`tasks.priority_${task.priority.toLowerCase()}`)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t("tasks.assignee_label", { name: task.assignee })}</span>
                          <span>{task.points} SP</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("tasks.due_label", { date: task.dueDate })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tasks.timeline_title")}</CardTitle>
            <CardDescription>{t("tasks.timeline_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineMilestones.map((item) => (
                <div key={item.key} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="font-medium">{t(`tasks.timeline_${item.key}`)}</div>
                    <Badge variant="outline">
                      {t("tasks.owner_label", { owner: item.owner })}
                    </Badge>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("tasks.timeline_start", { date: item.start })}</span>
                    <span>{t("tasks.timeline_end", { date: item.end })}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "sprints" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.sprints_active_title")}</CardTitle>
              <CardDescription>{t("tasks.sprints_active_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("tasks.sprints_capacity")}</span>
                <span className="font-semibold">40 SP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("tasks.sprints_completed")}</span>
                <span className="font-semibold">25 SP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("tasks.sprints_remaining")}</span>
                <span className="font-semibold">15 SP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("tasks.sprints_velocity")}</span>
                <span className="font-semibold">5 SP / week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.sprints_team_title")}</CardTitle>
              <CardDescription>{t("tasks.sprints_team_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4" />
                  Team A
                </div>
                <p className="text-muted-foreground">{t("tasks.sprints_team_a")}</p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4" />
                  Team B
                </div>
                <p className="text-muted-foreground">{t("tasks.sprints_team_b")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>{t("tasks.sprints_backlog_title")}</CardTitle>
              <CardDescription>{t("tasks.sprints_backlog_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tasks.col_task")}</TableHead>
                    <TableHead>{t("tasks.col_priority")}</TableHead>
                    <TableHead>{t("tasks.col_estimate")}</TableHead>
                    <TableHead>{t("tasks.col_owner")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlogRows.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityBadgeClass[task.priority]}>
                          {t(`tasks.priority_${task.priority.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.points} SP</TableCell>
                      <TableCell>{task.assignee}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
