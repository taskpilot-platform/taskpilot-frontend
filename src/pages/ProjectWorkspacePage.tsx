import React, { forwardRef, useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  RefreshCw,
  Search,
  Users,
  PlusCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Edit2,
  Clock,
  Activity,
  CheckCircle2,
  CircleDashed,
  UserPlus,
  FileText,
  Settings,
  Archive,
  ArrowLeftRight,
  ArrowLeft,
  CalendarDays,
  MoreHorizontal,
  Play,
  SquareCheckBig,
  Trash2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getApiErrorMessage } from "@/lib/http";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { sprintService } from "@/services/sprint.service";
import { profileService } from "@/services/profile.service";
import { projectStorage } from "@/lib/storage";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import type { MyProject, Project, ProjectMember, ProjectSummary } from "@/types/project";
import type { TaskDetailDto, TaskDto, TaskPriority, TaskStatus } from "@/types/task";
import type { BacklogResponse, BoardResponse, SprintDto } from "@/types/sprint";
import type { TimelineResponse, TimelineTaskDto } from "@/types/timeline";

const VALID_TABS = ["overview", "board", "backlog", "timeline"] as const;
type ViewMode = (typeof VALID_TABS)[number];
type BacklogSortMode = "position" | "createdAt" | "priority";
const VALID_TAB_SET = new Set<string>(VALID_TABS);
const isViewMode = (value: string | undefined): value is ViewMode =>
  value ? VALID_TAB_SET.has(value) : false;

const statusOrder: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const priorityBadgeClass: Record<TaskPriority, string> = {
  URGENT: "border-red-600 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HIGH: "border-orange-500/40 text-orange-600 dark:text-orange-300",
  MEDIUM: "border-amber-500/40 text-amber-600 dark:text-amber-300",
  LOW: "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
};

const priorityScore: Record<TaskPriority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const timelineDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timelineTickFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
});

const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

const timelineTaskTone: Record<TaskStatus, string> = {
  TODO: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
  IN_PROGRESS: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  REVIEW: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  DONE: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

function parseTimelineDate(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function formatTimelineDate(value?: string | null) {
  const time = parseTimelineDate(value);
  return time === null ? "No date" : timelineDateFormatter.format(new Date(time));
}

function formatTimelineRange(start?: string | null, end?: string | null) {
  const hasStart = parseTimelineDate(start) !== null;
  const hasEnd = parseTimelineDate(end) !== null;

  if (hasStart && hasEnd) return `${formatTimelineDate(start)} - ${formatTimelineDate(end)}`;
  if (hasStart) return `From ${formatTimelineDate(start)}`;
  if (hasEnd) return `Until ${formatTimelineDate(end)}`;
  return "No dates";
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

const DateInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className, onChange, value, defaultValue, ...props }, ref) => {
    const [uncontrolledEmpty, setUncontrolledEmpty] = useState(() => !defaultValue);
    const isControlled = value !== undefined;
    const isEmpty = isControlled ? !value : uncontrolledEmpty;

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="date"
          lang="en-GB"
          value={value}
          defaultValue={defaultValue}
          className={`date-input-ddmmyyyy ${isEmpty ? "date-input-empty" : ""} ${className ?? ""}`}
          onChange={(event) => {
            if (!isControlled) {
              setUncontrolledEmpty(!event.currentTarget.value);
            }
            onChange?.(event);
          }}
          {...props}
        />
        {isEmpty && (
          <span className="date-input-placeholder pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground md:text-sm">
            dd/mm/yyyy
          </span>
        )}
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export default function ProjectWorkspacePage() {
  const { t } = useTranslation();
  const { projectId, tabId, taskId } = useParams();
  const navigate = useNavigate();
  const activeTab: ViewMode = isViewMode(tabId) ? tabId : "board";

  const currentProjectId = Number(projectId);
  const currentTaskId = taskId ? Number(taskId) : null;

  const [searchInput, setSearchInput] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [boardData, setBoardData] = useState<BoardResponse | null>(null);
  const [backlogData, setBacklogData] = useState<BacklogResponse | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [sprints, setSprints] = useState<SprintDto[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<number | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTaskSprintId, setCreateTaskSprintId] = useState<number | null>(null);
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetailDto | null>(null);

  // Backlog state
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<BacklogSortMode>("position");

  // Overview edit state removed since Settings is canonical

  const myMemberInfo = useMemo(() => projectMembers.find(m => m.userId === myUserId), [projectMembers, myUserId]);
  const isManager = myMemberInfo?.role === "MANAGER";
  const isArchived = project?.status === "ARCHIVED";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", priority: "MEDIUM", assigneeId: "unassigned", sprintId: "none" },
  });

  const sprintForm = useForm({
    defaultValues: { name: "", goal: "", startDate: "", endDate: "" },
  });

  // Removed projectForm since it's no longer needed (Settings page is canonical)

  const mergeTasks = (nextTasks: TaskDto[]) => {
    setTasks(prev => Array.from(new Map([...prev, ...nextTasks].map(task => [task.id, task])).values()));
  };

  const updateTaskInAllStates = (taskId: number, payload: Partial<TaskDto>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...payload } as TaskDto : t));
    setBoardData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...payload } as TaskDto : t),
      };
    });

    const getSprintSectionId = (section: unknown) => {
      const byNestedSprint = section as { sprint?: { id?: number } };
      const byId = section as { id?: number };
      return byNestedSprint.sprint?.id ?? byId.id;
    };

    const processSprintGroups = <
      TTask extends { id: number },
      TSprint extends { tasks: TTask[] },
      TGroup extends { unscheduledTasks: TTask[]; sprints: TSprint[] }
    >(prev: TGroup): TGroup => {
      const hasSprintIdChange = Object.prototype.hasOwnProperty.call(payload, "sprintId");
      if (!hasSprintIdChange) {
        return {
          ...prev,
          unscheduledTasks: prev.unscheduledTasks.map((task) => task.id === taskId ? { ...task, ...payload } as TTask : task),
          sprints: prev.sprints.map((section) => ({
            ...section,
            tasks: section.tasks.map((task) => task.id === taskId ? { ...task, ...payload } as TTask : task),
          })),
        };
      }

      let targetTask: TTask | null = null;
      const newUnscheduled = prev.unscheduledTasks.filter((task) => {
        if (task.id === taskId) {
          targetTask = { ...task, ...payload } as TTask;
          return false;
        }
        return true;
      });
      const newSprints = prev.sprints.map((section) => ({
        ...section,
        tasks: section.tasks.filter((task) => {
          if (task.id === taskId) {
            targetTask = { ...task, ...payload } as TTask;
            return false;
          }
          return true;
        })
      }));

      if (targetTask) {
        if (payload.sprintId === null || payload.sprintId === undefined) {
          newUnscheduled.push(targetTask);
        } else {
          const targetSprint = newSprints.find(section => getSprintSectionId(section) === payload.sprintId);
          if (targetSprint) targetSprint.tasks.push(targetTask);
          else newUnscheduled.push(targetTask);
        }
      }

      return { ...prev, unscheduledTasks: newUnscheduled, sprints: newSprints };
    };

    setBacklogData(prev => prev ? processSprintGroups(prev) : null);
    setTimelineData(prev => prev ? processSprintGroups(prev) : null);
  };

  const loadBaseData = async (pid: number) => {
    const [projRes, membersRes, sprintRes, summaryRes, profileRes, myProjectsRes] = await Promise.all([
      projectService.getProjectDetail(pid),
      projectService.getProjectMembers(pid),
      sprintService.listSprints(pid),
      projectService.getProjectSummary(pid),
      profileService.getMe(),
      projectService.getMyProjects(0, 100)
    ]);

    setProject(projRes.data);
    setProjectMembers(membersRes.data);
    setSprints(sprintRes.data);
    setProjectSummary(summaryRes.data);
    setMyUserId(profileRes.data.id);
    setMyProjects(myProjectsRes.data.content);
  };

  const loadTabData = async (pid: number, tab: ViewMode, force = false) => {
    if (tab === "board" || tab === "overview") {
      if (!force && boardData) return;
      const boardRes = await sprintService.getBoard(pid);
      setBoardData(boardRes.data);
      mergeTasks(boardRes.data.tasks);
      return;
    }

    if (tab === "backlog") {
      if (!force && backlogData) return;
      const backlogRes = await sprintService.getBacklog(pid);
      setBacklogData(backlogRes.data);
      mergeTasks([
        ...backlogRes.data.unscheduledTasks,
        ...backlogRes.data.sprints.flatMap(section => section.tasks),
      ]);
      return;
    }

    if (tab === "timeline") {
      if (!force && timelineData) return;
      const timelineRes = await sprintService.getTimeline(pid);
      setTimelineData(timelineRes.data);
    }
  };

  const loadData = async (pid: number) => {
    setIsLoadingTasks(true);
    try {
      setTasks([]);
      setBoardData(null);
      setBacklogData(null);
      setTimelineData(null);
      setLoadedProjectId(null);
      await loadBaseData(pid);
      await loadTabData(pid, activeTab, true);
      setLoadedProjectId(pid);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      void loadData(currentProjectId);
      projectStorage.setLastProjectId(currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId || loadedProjectId !== currentProjectId) {
      return;
    }

    setIsLoadingTasks(true);
    loadTabData(currentProjectId, activeTab)
      .catch(error => toast.error(getApiErrorMessage(error)))
      .finally(() => setIsLoadingTasks(false));
  }, [activeTab, currentProjectId, loadedProjectId]);

  useEffect(() => {
    if (tabId && !isViewMode(tabId) && currentProjectId) {
      navigate(`/projects/${currentProjectId}/board`, { replace: true });
    }
  }, [tabId, currentProjectId, navigate]);

  useEffect(() => {
    if (currentTaskId && !isTaskDetailOpen) {
      openTaskDetail(currentTaskId);
    }
  }, [currentTaskId, isTaskDetailOpen]);

  const groupedKanban = useMemo(() => {
    const visibleTasks = boardData?.tasks ?? tasks;
    const filteredVisibleTasks = visibleTasks.filter((task) => {
      const query = searchInput.trim().toLowerCase();
      return query.length === 0 || task.id.toString().includes(query) || task.title.toLowerCase().includes(query);
    });
    return statusOrder.map((status) => ({
      status,
      tasks: filteredVisibleTasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position),
    }));
  }, [boardData, searchInput, tasks]);

  const openCreateTask = (sprintId: number | null) => {
    setCreateTaskSprintId(sprintId);
    form.setValue("sprintId", sprintId ? String(sprintId) : "none");
    setIsCreateModalOpen(true);
  };

  const onSubmitCreate = async (values: z.infer<typeof formSchema>) => {
    try {
      const selectedSprintId = values.sprintId && values.sprintId !== "none"
        ? Number(values.sprintId)
        : createTaskSprintId;
      await taskService.createTask({
        projectId: currentProjectId,
        sprintId: selectedSprintId ?? undefined,
        title: values.title,
        description: values.description,
        priority: values.priority,
        position: 0,
        assigneeId: values.assigneeId && values.assigneeId !== "unassigned" ? Number(values.assigneeId) : undefined,
        startDate: values.startDate ? `${values.startDate}T00:00:00Z` : undefined,
        dueDate: values.dueDate ? `${values.dueDate}T23:59:59Z` : undefined,
      });
      toast.success("Task created successfully");
      setIsCreateModalOpen(false);
      form.reset();
      setCreateTaskSprintId(null);
      void loadData(currentProjectId);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onSubmitSprint = async (values: { name: string; goal: string; startDate: string; endDate: string }) => {
    try {
      await sprintService.createSprint(currentProjectId, {
        name: values.name,
        goal: values.goal || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      });
      toast.success("Sprint created");
      setIsSprintDialogOpen(false);
      sprintForm.reset();
      void loadData(currentProjectId);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleSprintAction = async (action: "start" | "complete" | "delete", sprint: SprintDto) => {
    try {
      if (action === "start") await sprintService.startSprint(currentProjectId, sprint.id);
      if (action === "complete") await sprintService.completeSprint(currentProjectId, sprint.id);
      if (action === "delete") {
        if (!window.confirm("Delete this planning sprint? Tasks will return to Backlog / Unscheduled.")) return;
        await sprintService.deleteSprint(currentProjectId, sprint.id);
      }
      toast.success("Sprint updated");
      void loadData(currentProjectId);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const openTaskDetail = async (taskId: number) => {
    try {
      const res = await taskService.getTaskById(taskId);
      setSelectedTaskDetail(res.data);
      setIsTaskDetailOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onUpdateTask = async (payload: { title?: string; description?: string; assigneeId?: number; status?: TaskStatus; priority?: TaskPriority; startDate?: string; dueDate?: string }) => {
    if (!selectedTaskDetail) return;
    try {
      await taskService.updateTask(selectedTaskDetail.task.id, payload);
      toast.success("Task updated successfully");

      updateTaskInAllStates(selectedTaskDetail.task.id, payload);

      const res = await taskService.getTaskById(selectedTaskDetail.task.id);
      setSelectedTaskDetail(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error; // Let the component handle loading states
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskDetail) return;
    if (!window.confirm("Are you sure you want to delete this task? This will also delete all subtasks.")) return;

    try {
      await taskService.deleteTask(selectedTaskDetail.task.id);
      toast.success("Task deleted successfully");
      setIsTaskDetailOpen(false);
      void loadData(currentProjectId);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onCreateSubtask = async (title: string) => {
    if (!selectedTaskDetail) return;
    try {
      await taskService.createTask({
        projectId: currentProjectId,
        parentId: selectedTaskDetail.task.id,
        title,
        position: 0,
      });
      toast.success("Subtask created");

      const res = await taskService.getTaskById(selectedTaskDetail.task.id);
      setSelectedTaskDetail(res.data);
      void loadData(currentProjectId);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  // --- NATIVE HTML5 DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    if (isArchived) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("taskId", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isArchived) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    if (isArchived) return;
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData("taskId");
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    updateTaskInAllStates(taskId, { status });

    try {
      await taskService.moveTaskKanban(taskId, { status, position: task.position });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      void loadTabData(currentProjectId, activeTab, true);
    }
  };

  const handleDropToSprint = async (e: React.DragEvent, sprintId: number | null) => {
    if (isArchived) return;
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData("taskId");
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.sprintId === sprintId) return;

    updateTaskInAllStates(taskId, { sprintId: sprintId ?? undefined });
    try {
      await taskService.updateTaskSprint(taskId, sprintId);
      void loadTabData(currentProjectId, activeTab, true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      void loadTabData(currentProjectId, activeTab, true);
    }
  };

  const getAssigneeName = (assigneeId?: number) => {
    if (!assigneeId) return "Unassigned";
    const member = projectMembers.find(m => m.userId === assigneeId);
    return member ? `User ${member.userId}` : "Unknown";
  };

  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const tasksByParentId = useMemo(() => {
    const grouped = new Map<number | undefined, TaskDto[]>();

    tasks.forEach(task => {
      const siblings = grouped.get(task.parentId) ?? [];
      siblings.push(task);
      grouped.set(task.parentId, siblings);
    });

    grouped.forEach(siblings => {
      siblings.sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks]);

  const timelineBounds = useMemo(() => {
    const dates: number[] = [];
    const addDate = (value?: string | null) => {
      const time = parseTimelineDate(value);
      if (time !== null) {
        dates.push(time);
      }
    };
    addDate(timelineData?.project.startDate);
    addDate(timelineData?.project.endDate);
    timelineData?.sprints.forEach(sprint => {
      addDate(sprint.startDate);
      addDate(sprint.endDate);
      sprint.tasks.forEach(task => {
        addDate(task.startDate);
        addDate(task.dueDate);
      });
    });
    timelineData?.unscheduledTasks.forEach(task => {
      addDate(task.startDate);
      addDate(task.dueDate);
    });
    const now = Date.now();
    if (dates.length === 0) {
      return { min: now - DAY_MS, max: now + DAY_MS * 14 };
    }

    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return { min: min - DAY_MS, max: Math.max(max + DAY_MS, min + DAY_MS * 2) };
  }, [timelineData]);

  const timelineTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, index) => {
      const ratio = index / steps;
      const time = timelineBounds.min + (timelineBounds.max - timelineBounds.min) * ratio;
      return {
        left: `${ratio * 100}%`,
        label: timelineTickFormatter.format(new Date(time)),
      };
    });
  }, [timelineBounds]);

  const getTimelinePosition = (start?: string | null, end?: string | null) => {
    const startTime = parseTimelineDate(start);
    const endTime = parseTimelineDate(end);
    if (startTime === null || endTime === null) return null;
    const span = timelineBounds.max - timelineBounds.min;
    if (!span || Number.isNaN(span)) return null;
    const safeEndTime = Math.max(endTime, startTime + DAY_MS);
    const left = Math.max(0, Math.min(100, ((startTime - timelineBounds.min) / span) * 100));
    const width = Math.min(Math.max(1.5, 100 - left), Math.max(3, ((safeEndTime - startTime) / span) * 100));
    return { left: `${left}%`, width: `${width}%` };
  };

  const splitTimelineTasks = (items: TimelineTaskDto[]) => {
    const isValidDate = (d?: string | null) => {
      return parseTimelineDate(d) !== null;
    };

    const scheduled = items.filter(task => isValidDate(task.startDate) && isValidDate(task.dueDate))
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());

    return {
      scheduled,
      noDates: items.filter(task => !isValidDate(task.startDate) || !isValidDate(task.dueDate))
    };
  };

  const renderTimelineScale = () => (
    <div className="grid gap-2 px-2 text-[11px] text-muted-foreground md:grid-cols-[minmax(180px,260px)_1fr]">
      <div className="hidden font-medium uppercase tracking-wider md:block">Task</div>
      <div className="relative h-8">
        {timelineTicks.map((tick, index) => (
          <div
            key={tick.left}
            className={`absolute top-0 flex flex-col gap-1 ${
              index === 0
                ? "translate-x-0 items-start"
                : index === timelineTicks.length - 1
                  ? "-translate-x-full items-end"
                  : "-translate-x-1/2 items-center"
            }`}
            style={{ left: tick.left }}
          >
            <span className="whitespace-nowrap text-[10px] sm:text-[11px]">{tick.label}</span>
            <span className="h-3 w-px bg-border" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderTaskTimelineRow = (task: TimelineTaskDto) => {
    const position = getTimelinePosition(task.startDate, task.dueDate);
    if (!position) return null;
    const overdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate).getTime() < Date.now();
    const toneClass = overdue
      ? "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
      : timelineTaskTone[task.status];

    return (
      <button
        key={task.id}
        type="button"
        className="group grid w-full gap-2 rounded-md border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(180px,260px)_1fr] md:items-center"
        onClick={() => openTaskDetail(task.id)}
        title={`${task.title} - ${formatTimelineRange(task.startDate, task.dueDate)}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">TP-{task.id}</span>
            <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px] font-medium">
              {taskStatusLabel[task.status]}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{task.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatTimelineRange(task.startDate, task.dueDate)}</p>
        </div>
        <div className="relative h-9 overflow-hidden rounded-md border border-border/60 bg-muted/20">
          {timelineTicks.map((tick) => (
            <span key={tick.left} className="absolute inset-y-0 w-px bg-border/70" style={{ left: tick.left }} />
          ))}
          <span
            className={`absolute top-1/2 h-5 -translate-y-1/2 rounded border shadow-sm ${toneClass}`}
            style={position}
          />
        </div>
      </button>
    );
  };

  const renderBacklogTask = (task: TaskDto, level = 0) => {
    const subtasks = tasksByParentId.get(task.id) ?? [];
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = showSubtasks || expandedTasks.has(task.id);

    return (
      <div key={task.id} className="flex flex-col">
        <div
          draggable={!isArchived}
          onDragStart={(e) => handleDragStart(e, task.id)}
          className={`group flex items-center justify-between p-3 rounded-md border bg-card hover:border-primary/40 cursor-pointer transition-colors ${level > 0 ? "ml-6 mt-1 border-dashed bg-muted/10 hover:bg-muted/30" : "mt-2 shadow-sm"}`}
          onClick={() => openTaskDetail(task.id)}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            {hasSubtasks ? (
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 z-10" onClick={(e) => { e.stopPropagation(); toggleTaskExpansion(task.id); }}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <div className="w-6 shrink-0" />
            )}
            <span className="text-xs text-muted-foreground font-mono w-14 shrink-0">TP-{task.id}</span>
            {level > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0 bg-muted-foreground/10 text-muted-foreground border-none font-medium uppercase tracking-wider shrink-0">Subtask</Badge>}
            <span className={`font-medium truncate group-hover:text-primary transition-colors ${level > 0 ? "text-sm text-foreground/80" : ""}`}>{task.title}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {task.labels && task.labels.length > 0 && (
              <div className="flex items-center gap-1 mr-2">
                {task.labels.slice(0, 2).map((label) => (
                  <span key={label.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} title={label.name} />
                ))}
                {task.labels.length > 2 && <span className="text-[10px] text-muted-foreground">+{task.labels.length - 2}</span>}
              </div>
            )}
            <div className="flex -space-x-2 mr-2">
              {task.assigneeId && <div title={getAssigneeName(task.assigneeId)} className="h-6 w-6 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[9px] font-bold text-primary shadow-sm">{getAssigneeName(task.assigneeId).substring(0, 2).toUpperCase()}</div>}
            </div>
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${priorityBadgeClass[task.priority]}`}>{task.priority}</Badge>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{task.status}</Badge>
          </div>
        </div>
        {isExpanded && hasSubtasks && (
          <div className="border-l-2 border-muted/50 ml-6 pl-2 mt-1 space-y-1">
            {subtasks.map(sub => renderBacklogTask(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8 flex flex-col">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{project?.name || t("tasks.title", "Workspace")}</h1>

            {/* Project Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted transition-colors">
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Switch Project
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {myProjects.length > 0 ? (
                  myProjects.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}/${activeTab}`)}
                      className={`flex items-center gap-2 py-2.5 ${p.id === currentProjectId ? "bg-primary/10 font-semibold text-primary" : ""}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <span className="truncate flex-1">{p.name}</span>
                      {p.id === currentProjectId && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground italic">No other projects found</div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/projects")} className="py-2.5 text-primary focus:text-primary focus:bg-primary/5 font-medium">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  See All Projects
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isArchived && (
              <Badge variant="destructive" className="ml-2 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">
                <Archive className="w-3 h-3 mr-1" /> Archived
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground line-clamp-1">{project?.description || t("tasks.desc", "Manage tasks and subtasks.")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* All Projects Navigation */}
          <Button variant="outline" className="gap-2 shadow-sm border-primary/20 hover:bg-primary/5 text-primary group transition-all" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">All Projects</span>
            <span className="sm:hidden">All</span>
          </Button>

          {isManager && (
            <Button variant="outline" className="gap-2 shadow-sm" onClick={() => navigate(`/projects/${currentProjectId}/settings`)}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          )}

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2 shadow-sm"
                disabled={isArchived || (activeTab === "board" && boardData?.workflowMode === "SCRUM" && !boardData.activeSprint)}
                onClick={() => openCreateTask(activeTab === "board" && boardData?.workflowMode === "SCRUM" ? boardData.activeSprint?.id ?? null : null)}
              >
                <PlusCircle className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Add a new task to {project?.name}.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="E.g. Setup database schema" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Details about this task..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem><FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem><SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="assigneeId" render={({ field }) => (
                      <FormItem><FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {projectMembers.map((m) => (
                              <SelectItem key={m.userId} value={m.userId.toString()}>User {m.userId}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sprintId" render={({ field }) => (
                      <FormItem><FormLabel>Sprint</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Backlog / Unscheduled" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="none">Backlog / Unscheduled</SelectItem>
                            {sprints.filter(sprint => sprint.status !== "COMPLETED").map((sprint) => (
                              <SelectItem key={sprint.id} value={String(sprint.id)}>{sprint.name} - {sprint.status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem><FormLabel>Start Date</FormLabel>
                        <FormControl><DateInput {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                      <FormItem><FormLabel>Due Date</FormLabel>
                        <FormControl><DateInput {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isSprintDialogOpen} onOpenChange={setIsSprintDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm shrink-0" disabled={isArchived}>
                <CalendarDays className="h-4 w-4" />
                Create Sprint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Sprint</DialogTitle>
                <DialogDescription>Add a planning sprint to the backlog.</DialogDescription>
              </DialogHeader>
              <form onSubmit={sprintForm.handleSubmit(onSubmitSprint)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sprint-name">Sprint name</Label>
                  <Input id="sprint-name" {...sprintForm.register("name", { required: true })} placeholder="Sprint 1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sprint-goal">Goal</Label>
                  <Textarea id="sprint-goal" {...sprintForm.register("goal")} placeholder="Build the next focused increment" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="sprint-start">Start date</Label>
                    <DateInput id="sprint-start" {...sprintForm.register("startDate")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sprint-end">End date</Label>
                    <DateInput id="sprint-end" {...sprintForm.register("endDate")} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsSprintDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Sprint</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button type="button" variant="outline" className="gap-2 shadow-sm" onClick={() => void loadData(currentProjectId)}>
            <RefreshCw className={`h-4 w-4 ${isLoadingTasks ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* TABS (View Mode) */}
      <Card className="shrink-0 shadow-sm border-muted/60">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 border-b w-full md:w-auto pb-2 md:pb-0 md:border-b-0">
            <Button type="button" variant={activeTab === "overview" ? "secondary" : "ghost"} className={`gap-2 ${activeTab === "overview" ? "bg-muted" : "hover:bg-muted/50"}`} onClick={() => navigate(`/projects/${currentProjectId}/overview`)}>
              <LayoutDashboard className="h-4 w-4" /> Overview
            </Button>
            <Button type="button" variant={activeTab === "board" ? "secondary" : "ghost"} className={`gap-2 ${activeTab === "board" ? "bg-muted" : "hover:bg-muted/50"}`} onClick={() => navigate(`/projects/${currentProjectId}/board`)}>
              <FolderKanban className="h-4 w-4" /> Board
            </Button>
            <Button type="button" variant={activeTab === "backlog" ? "secondary" : "ghost"} className={`gap-2 ${activeTab === "backlog" ? "bg-muted" : "hover:bg-muted/50"}`} onClick={() => navigate(`/projects/${currentProjectId}/backlog`)}>
              <ListChecks className="h-4 w-4" /> Backlog
            </Button>
            <Button type="button" variant={activeTab === "timeline" ? "secondary" : "ghost"} className={`gap-2 ${activeTab === "timeline" ? "bg-muted" : "hover:bg-muted/50"}`} onClick={() => navigate(`/projects/${currentProjectId}/timeline`)}>
              <CalendarDays className="h-4 w-4" /> Timeline
            </Button>
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 bg-muted/20 border-muted/60 focus-visible:bg-background transition-colors" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search tasks..." />
          </div>
        </CardContent>
      </Card>

      {/* VIEW MODES */}
      <div className="flex-1 bg-transparent relative">
        {isLoadingTasks && !project ? (
          <div className="absolute inset-0 z-10 bg-card backdrop-blur-xl flex flex-col items-center justify-center text-muted-foreground transition-all duration-300">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium animate-pulse">Loading workspace...</p>
          </div>
        ) : (
          <>
            {activeTab === "board" && (
              <div className="overflow-x-auto pb-4 bg-transparent">
                {boardData?.workflowMode === "SCRUM" && !boardData.activeSprint ? (
                  <Card className="max-w-xl mx-auto mt-20 border-dashed">
                    <CardContent className="p-10 text-center text-muted-foreground">
                      <CircleDashed className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-foreground">No active sprint.</p>
                      <p className="text-sm mt-1">Start a sprint from Backlog to view work on the board.</p>
                    </CardContent>
                  </Card>
                ) : (
                <div className="flex min-w-[1000px] gap-5 h-[900px]">
                  {groupedKanban.map((column) => (
                    <div
                      key={column.status}
                      className="flex-1 flex flex-col rounded-xl border bg-card p-3.5 min-w-[300px] shadow-sm border-white/10"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.status)}
                    >
                      <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-semibold tracking-wide">{t(`tasks.col_${column.status.toLowerCase()}`, column.status.replace("_", " "))}</h3>
                          <Badge variant="secondary" className="text-xs bg-background/60">{column.tasks.length}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" disabled={isArchived} onClick={() => setIsCreateModalOpen(true)}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pb-2">
                        {column.tasks.length === 0 && (
                          <div className="rounded-lg border-2 border-dashed border-muted/60 px-3 py-10 flex flex-col items-center justify-center text-xs text-muted-foreground bg-background/30">
                            <FolderKanban className="h-8 w-8 mb-2 opacity-20" />
                            Drop tasks here
                          </div>
                        )}
                        {column.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`project-task-card space-y-3 rounded-lg border border-border/60 bg-card p-3.5 shadow-sm transition-all group ${!isArchived ? "cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md" : ""}`}
                            draggable={!isArchived}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => openTaskDetail(task.id)}
                          >
                            <div className="flex flex-col gap-1.5">
                              {task.parentId && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                  <span className="opacity-70">Subtask of</span>
                                  <span className="text-primary/70">TP-{task.parentId}</span>
                                </div>
                              )}
                              <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">{task.title}</p>
                            </div>
                            {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>}
                            {task.labels && task.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.labels.map(label => (
                                  <span key={label.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-white shadow-sm" style={{ backgroundColor: label.color }}>
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/40">
                              <span className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded font-medium">TP-{task.id}</span>
                              <div className="flex items-center gap-2">
                                {task.assigneeId && <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">{getAssigneeName(task.assigneeId).substring(0, 1).toUpperCase()}</div></div>}
                                <Badge variant="outline" className={`text-[9px] border-none px-1.5 py-0 h-4 ${priorityBadgeClass[task.priority]}`}>
                                  {task.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="pt-2 space-y-6 bg-transparent">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Left Column (Main Info) */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Project Header & Information */}
                    <Card className="shadow-sm border-muted/60 overflow-hidden">
                      <div className="h-2 bg-primary"></div>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-6 mb-6 gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <h2 className="text-3xl font-bold tracking-tight text-foreground">{project?.name}</h2>
                              <Badge variant="secondary" className="text-sm px-2 py-0.5">{project?.status}</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm mt-4">
                              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
                                <span className="font-mono text-xs font-medium text-foreground">PRJ-{project?.id}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
                                <span className="font-medium text-foreground">{projectMembers.length}</span> Members
                              </div>
                              {project?.heuristicMode && project.heuristicMode !== 'BALANCED' && (
                                <div className="flex items-center gap-1.5 text-primary bg-primary/5 px-2.5 py-1 rounded-md border border-primary/20">
                                  <span className="font-semibold text-xs tracking-wider uppercase">{project.heuristicMode} MODE</span>
                                </div>
                              )}
                              {project?.startDate && (
                                <div className="flex items-center gap-1.5 text-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
                                  <span className="text-muted-foreground">Timeline:</span>
                                  <span className="font-medium">{new Date(project.startDate).toLocaleDateString()}</span>
                                  <span className="text-muted-foreground mx-0.5">→</span>
                                  <span className="font-medium">{project?.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {isManager && !isArchived && (
                            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${currentProjectId}/settings`)}>
                              <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit Project
                            </Button>
                          )}
                        </div>

                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground uppercase tracking-wider"><FileText className="h-4 w-4" /> Description</h3>
                            <div className="bg-muted/10 p-5 rounded-lg border border-border/50 min-h-[120px] text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                              {project?.description || <span className="text-muted-foreground italic">No description provided. Add one to help your team understand the project goals.</span>}
                            </div>
                          </div>
                      </CardContent>
                    </Card>

                    {/* Current Sprint Placeholder */}
                    <Card className="shadow-sm border-muted/60">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Current Sprint</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-background/50">
                          <CircleDashed className="h-10 w-10 text-muted-foreground mb-3 opacity-40 animate-spin-slow" />
                          <p className="text-base font-medium">No Active Sprint</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">Sprints feature is coming in the next update. Plan in Backlog for now.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity Placeholder */}
                    <Card className="shadow-sm border-muted/60">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-muted before:to-transparent">
                          <div className="relative flex items-start gap-4">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-background bg-primary shadow shrink-0 mt-1"></div>
                            <div className="bg-muted/20 p-3 rounded-lg border border-border/50 shadow-sm flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-sm">Project Workspace Initialized</div>
                                <time className="text-xs text-muted-foreground font-mono">{project ? new Date(project.createdAt).toLocaleDateString() : ""}</time>
                              </div>
                              <div className="text-xs text-muted-foreground">The project environment is ready for collaboration.</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column (Side Info) */}
                  <div className="space-y-6">
                    {/* Progress Snapshot */}
                    <Card className="shadow-sm border-muted/60">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Progress Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-5">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Completion</p>
                            <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{projectSummary?.completionRate || 0}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${projectSummary?.completionRate || 0}%` }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="bg-muted/30 p-3 rounded-lg border border-border/40 text-center">
                            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Total</p>
                            <p className="text-xl font-semibold">{projectSummary?.totalTasks || 0}</p>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-center">
                            <p className="text-xs uppercase font-medium mb-1 opacity-80">Done</p>
                            <p className="text-xl font-semibold">{projectSummary?.completedTasks || 0}</p>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-center">
                            <p className="text-xs uppercase font-medium mb-1 opacity-80">In Progress</p>
                            <p className="text-xl font-semibold">{projectSummary?.inProgressTasks || 0}</p>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-3 rounded-lg text-center">
                            <p className="text-xs uppercase font-medium mb-1 opacity-80">To Do</p>
                            <p className="text-xl font-semibold">{projectSummary?.pendingTasks || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Team Members */}
                    <Card className="shadow-sm border-muted/60">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> Team Members</CardTitle>
                        {isManager && <Button variant="ghost" size="icon" className="h-6 w-6"><UserPlus className="h-4 w-4 text-muted-foreground hover:text-primary" /></Button>}
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
                          {projectMembers.map(m => (
                            <div key={m.userId} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                                  U{m.userId}
                                </div>
                                <div>
                                  <p className="text-sm font-medium leading-none">User {m.userId} {m.userId === myUserId && <span className="text-muted-foreground font-normal">(You)</span>}</p>
                                  <Badge variant={m.role === "MANAGER" ? "default" : "secondary"} className="mt-1.5 text-[9px] h-4 px-1.5">{m.role}</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions Placeholder */}
                    <Card className="shadow-sm border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-semibold mb-3 text-primary">Quick Actions</h3>
                        <div className="space-y-2">
                          <Button className="w-full justify-start bg-background hover:bg-muted text-foreground border shadow-sm" variant="outline" disabled={isArchived} onClick={() => openCreateTask(null)}>
                            <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Create Task
                          </Button>
                          <Button className="w-full justify-start bg-background hover:bg-muted text-foreground border shadow-sm" variant="outline" onClick={() => navigate(`/projects/${currentProjectId}/board`)}>
                            <FolderKanban className="mr-2 h-4 w-4 text-primary" /> Open Board
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="pt-2 bg-transparent">
                <Card className="max-w-6xl mx-auto shadow-sm border-muted/60">
                  <CardHeader className="border-b border-border/40 bg-muted/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <CalendarDays className="h-5 w-5 text-primary" /> Timeline
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Tasks arranged by start date and due date.
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimelineRange(timelineData?.project.startDate, timelineData?.project.endDate)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-5">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded bg-sky-300/70" /> Active</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded bg-emerald-300/70" /> Done</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded bg-red-500/30" /> Overdue</span>
                    </div>
                    {timelineData?.sprints.map(sprint => {
                      const sprintPosition = getTimelinePosition(sprint.startDate, sprint.endDate);
                      const { scheduled, noDates } = splitTimelineTasks(sprint.tasks);
                      return (
                        <section key={sprint.id} className="rounded-lg border bg-background/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{sprint.name}</h3>
                              <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"}>{sprint.status}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatTimelineRange(sprint.startDate, sprint.endDate)}</span>
                          </div>
                          <div className="mt-4 space-y-2">
                            {renderTimelineScale()}
                            {sprintPosition && (
                              <div className="grid gap-2 px-2 md:grid-cols-[minmax(180px,260px)_1fr] md:items-center">
                                <div className="text-xs font-medium text-muted-foreground">Sprint dates</div>
                                <div className="relative h-7 overflow-hidden rounded-md border border-border/60 bg-muted/20">
                                  {timelineTicks.map((tick) => (
                                    <span key={tick.left} className="absolute inset-y-0 w-px bg-border/70" style={{ left: tick.left }} />
                                  ))}
                                  <span className="absolute top-1/2 h-4 -translate-y-1/2 rounded border border-border bg-foreground/10" style={sprintPosition} />
                                </div>
                              </div>
                            )}
                            {scheduled.map(renderTaskTimelineRow)}
                            {scheduled.length === 0 && (
                              <p className="px-2 py-3 text-sm text-muted-foreground">No tasks with both start and due dates.</p>
                            )}
                          </div>
                          {noDates.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-xs text-muted-foreground">No dates:</span>
                              {noDates.map(task => (
                                <Button key={task.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => openTaskDetail(task.id)}>
                                  TP-{task.id} {task.title}
                                </Button>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                    {timelineData && (() => {
                      const { scheduled, noDates } = splitTimelineTasks(timelineData.unscheduledTasks);
                      return (
                        <section className="rounded-lg border bg-background/70 p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Unscheduled / Backlog</h3>
                            <Badge variant="outline">{timelineData.unscheduledTasks.length} tasks</Badge>
                          </div>
                          <div className="mt-3 space-y-2">
                            {scheduled.length > 0 && renderTimelineScale()}
                            {scheduled.map(renderTaskTimelineRow)}
                            {scheduled.length === 0 && <p className="text-sm text-muted-foreground">No scheduled backlog tasks.</p>}
                          </div>
                          {noDates.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-xs text-muted-foreground">No dates:</span>
                              {noDates.map(task => (
                                <Button key={task.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => openTaskDetail(task.id)}>
                                  TP-{task.id} {task.title}
                                </Button>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "backlog" && (
              <div className="pt-2 bg-transparent">
                <Card className="max-w-5xl mx-auto shadow-sm border-muted/60">
                  <CardHeader className="pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="text-xl">Backlog</CardTitle>
                      <CardDescription className="mt-1">Plan your sprints and view all tasks.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as BacklogSortMode)}>
                        <SelectTrigger className="w-[180px] h-9 bg-background border shadow-sm">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="position">Custom Order</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="createdAt">Newest First</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center space-x-2 bg-background px-3 py-1.5 h-9 rounded-md border shadow-sm">
                        <Checkbox id="show-subtasks" checked={showSubtasks} onCheckedChange={(c) => setShowSubtasks(c as boolean)} />
                        <Label htmlFor="show-subtasks" className="text-sm cursor-pointer select-none">Show Subtasks</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {!backlogData || (backlogData.unscheduledTasks.length === 0 && backlogData.sprints.length === 0) ? (
                        <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                          <ListChecks className="mx-auto h-8 w-8 mb-3 opacity-20" />
                          <p>Backlog is empty. Create tasks to start planning.</p>
                        </div>
                      ) : (
                        <>
                          <section 
                            className="rounded-lg border bg-background/60"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToSprint(e, null)}
                          >
                            <div className="flex items-center justify-between border-b px-4 py-3">
                              <div>
                                <h3 className="font-semibold">Backlog / Unscheduled</h3>
                                <p className="text-xs text-muted-foreground">{backlogData.unscheduledTasks.length} tasks</p>
                              </div>
                              <Button size="sm" variant="outline" className="shrink-0" disabled={isArchived} onClick={() => openCreateTask(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create Task
                              </Button>
                            </div>
                            <div className="p-3">
                              {backlogData.unscheduledTasks.filter(t => t.parentId == null).length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">No unscheduled tasks.</p>
                              ) : (
                                backlogData.unscheduledTasks.filter(t => t.parentId == null).sort((a, b) => {
                                  if (sortBy === "priority") return priorityScore[b.priority] - priorityScore[a.priority];
                                  if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                  return a.position - b.position;
                                }).map(task => renderBacklogTask(task, 0))
                              )}
                            </div>
                          </section>

                          {backlogData.sprints.map(section => (
                            <section 
                              key={section.sprint.id} 
                              className="rounded-lg border bg-background/60"
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDropToSprint(e, section.sprint.id)}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{section.sprint.name}</h3>
                                    <Badge variant={section.sprint.status === "ACTIVE" ? "default" : "secondary"}>{section.sprint.status}</Badge>
                                    <Badge variant="outline">{section.tasks.length} tasks</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {section.sprint.startDate || "No start"} &rarr; {section.sprint.endDate || "No end"}
                                    {section.sprint.goal ? ` · ${section.sprint.goal}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {section.sprint.status !== "COMPLETED" && (
                                      <Button size="sm" variant="outline" className="shrink-0" disabled={isArchived} onClick={() => openCreateTask(section.sprint.id)}>
                                      <PlusCircle className="mr-2 h-4 w-4" /> Create Task
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="icon" variant="ghost" disabled={isArchived || section.sprint.status === "COMPLETED"}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {section.sprint.status === "PLANNING" && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleSprintAction("start", section.sprint)}>
                                            <Play className="mr-2 h-4 w-4" /> Start Sprint
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-red-600" onClick={() => handleSprintAction("delete", section.sprint)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Sprint
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {section.sprint.status === "ACTIVE" && (
                                        <DropdownMenuItem onClick={() => handleSprintAction("complete", section.sprint)}>
                                          <SquareCheckBig className="mr-2 h-4 w-4" /> Complete Sprint
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <div className="p-3">
                                {section.tasks.filter(t => t.parentId == null).length === 0 ? (
                                  <p className="p-4 text-sm text-muted-foreground">No tasks in this sprint.</p>
                                ) : (
                                  section.tasks.filter(t => t.parentId == null).sort((a, b) => a.position - b.position).map(task => renderBacklogTask(task, 0))
                                )}
                              </div>
                            </section>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* TASK DETAIL SHEET (GitHub Issue / Linear Panel Style) */}
      <TaskDetailSheet
        isOpen={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        taskDetail={selectedTaskDetail}
        projectMembers={projectMembers}
        onDeleteTask={isArchived ? () => { } : handleDeleteTask}
        onUpdateTask={isArchived ? async () => { } : onUpdateTask}
        onCreateSubtask={isArchived ? async () => { } : onCreateSubtask}
        onOpenTaskDetail={openTaskDetail}
        isManager={isManager}
        currentUserId={myUserId}
        isReadOnly={isArchived}
      />
    </div>
  );
}
