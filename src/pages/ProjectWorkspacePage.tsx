import { useEffect, useMemo, useState } from "react";
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
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  Clock,
  Activity,
  CheckCircle2,
  CircleDashed,
  UserPlus,
  FileText
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

import { getApiErrorMessage } from "@/lib/http";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { profileService } from "@/services/profile.service";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import type { Project, ProjectMember, ProjectSummary } from "@/types/project";
import type { TaskDetailDto, TaskDto, TaskPriority, TaskStatus } from "@/types/task";

type ViewMode = "overview" | "board" | "backlog";

const statusOrder: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const priorityBadgeClass: Record<TaskPriority, string> = {
  URGENT: "border-red-600 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HIGH: "border-orange-500/40 text-orange-600 dark:text-orange-300",
  MEDIUM: "border-amber-500/40 text-amber-600 dark:text-amber-300",
  LOW: "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
};

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
});

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ARCHIVED", "COMPLETED"]),
  heuristicMode: z.enum(["BALANCED", "URGENT", "TRAINING"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export default function ProjectWorkspacePage() {
  const { t } = useTranslation();
  const { projectId, tabId } = useParams();
  const navigate = useNavigate();
  const activeTab = (tabId as ViewMode) || "board";
  
  const currentProjectId = Number(projectId);

  const [searchInput, setSearchInput] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetailDto | null>(null);

  // Backlog state
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"position" | "createdAt" | "priority">("position");

  // Overview edit state
  const [isEditingProject, setIsEditingProject] = useState(false);

  const myMemberInfo = useMemo(() => projectMembers.find(m => m.userId === myUserId), [projectMembers, myUserId]);
  const isManager = myMemberInfo?.role === "MANAGER";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", priority: "MEDIUM", assigneeId: "unassigned" },
  });

  const projectForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", description: "", status: "ACTIVE" },
  });

  const loadData = async (id: number) => {
    setIsLoadingTasks(true);
    try {
      const [projRes, memRes, taskRes, sumRes, meRes] = await Promise.all([
        projectService.getProjectDetail(id),
        projectService.getProjectMembers(id),
        taskService.getTasksByProject(id),
        projectService.getProjectSummary(id),
        profileService.getMe()
      ]);
      setProject(projRes.data);
      setProjectMembers(memRes.data);
      setTasks(taskRes.data);
      setProjectSummary(sumRes.data);
      setMyUserId(meRes.data.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (!isNaN(currentProjectId)) {
      void loadData(currentProjectId);
    }
  }, [currentProjectId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchInput.trim().toLowerCase();
      if (query.length === 0) return true;
      return (
        task.id.toString().includes(query) ||
        task.title.toLowerCase().includes(query)
      );
    });
  }, [searchInput, tasks]);

  // For board: only root tasks
  const groupedKanban = useMemo(() => {
    const rootTasks = filteredTasks.filter(t => t.parentId == null);
    return statusOrder.map((status) => ({
      status,
      tasks: rootTasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position),
    }));
  }, [filteredTasks]);

  const onSubmitCreate = async (values: z.infer<typeof formSchema>) => {
    try {
      await taskService.createTask({
        projectId: currentProjectId,
        title: values.title,
        description: values.description,
        priority: values.priority,
        position: 0,
        assigneeId: values.assigneeId && values.assigneeId !== "unassigned" ? Number(values.assigneeId) : undefined,
      });
      toast.success("Task created successfully");
      setIsCreateModalOpen(false);
      form.reset();
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
      
      setTasks(prev => prev.map(t => t.id === selectedTaskDetail.task.id ? { ...t, ...payload } as TaskDto : t));
      
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

  const onSubmitProjectEdit = async (values: z.infer<typeof projectFormSchema>) => {
    try {
      await projectService.updateProject(currentProjectId, {
        name: values.name,
        description: values.description,
        status: values.status,
        heuristicMode: values.heuristicMode as any,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      });
      toast.success("Project updated successfully");
      setIsEditingProject(false);
      void loadData(currentProjectId);
    } catch(err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  // --- NATIVE HTML5 DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData("taskId");
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);
    
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    try {
      await taskService.moveTaskKanban(taskId, { status, position: task.position });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      void loadData(currentProjectId);
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

  const renderBacklogTask = (task: TaskDto, level = 0) => {
    const subtasks = tasks.filter(t => t.parentId === task.id).sort((a,b) => a.position - b.position);
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = showSubtasks || expandedTasks.has(task.id);

    return (
        <div key={task.id} className="flex flex-col">
            <div 
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
                    <div className="flex -space-x-2 mr-2">
                        {task.assigneeId && <div title={getAssigneeName(task.assigneeId)} className="h-6 w-6 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[9px] font-bold text-primary shadow-sm">{getAssigneeName(task.assigneeId).substring(0,2).toUpperCase()}</div>}
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
    <div className="min-h-screen space-y-6 p-6 md:p-8 flex flex-col h-screen overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{project?.name || t("tasks.title", "Workspace")}</h1>
          <p className="text-muted-foreground line-clamp-1">{project?.description || t("tasks.desc", "Manage tasks and subtasks.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
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
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 bg-muted/20 border-muted/60 focus-visible:bg-background transition-colors" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search tasks..." />
          </div>
        </CardContent>
      </Card>

      {/* VIEW MODES */}
      <div className="flex-1 overflow-hidden min-h-0 bg-background/50 rounded-lg border shadow-sm relative">
        {isLoadingTasks && !project ? (
          <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading workspace...
          </div>
        ) : (
          <>
            {activeTab === "board" && (
              <div className="h-full overflow-x-auto p-4 bg-muted/5">
                <div className="flex min-w-[1000px] gap-5 h-full">
                  {groupedKanban.map((column) => (
                    <div 
                      key={column.status} 
                      className="flex-1 flex flex-col rounded-xl border bg-muted/20 p-3.5 min-w-[300px] shadow-sm"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.status)}
                    >
                      <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-semibold tracking-wide">{t(`tasks.col_${column.status.toLowerCase()}`, column.status.replace("_", " "))}</h3>
                          <Badge variant="secondary" className="text-xs bg-background/60">{column.tasks.length}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsCreateModalOpen(true)}>
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
                            className="space-y-3 rounded-lg border border-border/60 bg-card p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all group"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => openTaskDetail(task.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">{task.title}</p>
                            </div>
                            {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>}
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/40">
                              <span className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded font-medium">TP-{task.id}</span>
                              <div className="flex items-center gap-2">
                                {task.assigneeId && <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">{getAssigneeName(task.assigneeId).substring(0,1).toUpperCase()}</div></div>}
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
              </div>
            )}

            {activeTab === "overview" && (
              <div className="p-6 h-full overflow-auto space-y-6 bg-muted/5">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left Column (Main Info) */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Project Header & Information */}
                    <Card className="shadow-sm border-muted/60 overflow-hidden">
                      <div className="h-2 bg-primary"></div>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-6 mb-6 gap-4">
                          <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                {project?.name}
                                <Badge variant="secondary" className="text-xs font-medium">{project?.status}</Badge>
                            </h2>
                            <p className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-2">
                                <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">PRJ-{project?.id}</span> •
                                <span>{projectMembers.length} Members</span> •
                                <span>Created {project ? new Date(project.createdAt).toLocaleDateString() : ""}</span>
                            </p>
                          </div>
                          {isManager && !isEditingProject && (
                            <Button variant="outline" size="sm" onClick={() => {
                                projectForm.reset({ 
                                    name: project?.name, 
                                    description: project?.description || "", 
                                    status: project?.status,
                                    heuristicMode: project?.heuristicMode || "BALANCED",
                                    startDate: project?.startDate ? project.startDate.split("T")[0] : "",
                                    endDate: project?.endDate ? project.endDate.split("T")[0] : "",
                                });
                                setIsEditingProject(true);
                            }}>
                                <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit Project
                            </Button>
                          )}
                        </div>

                        {isEditingProject ? (
                          <Form {...projectForm}>
                              <form onSubmit={projectForm.handleSubmit(onSubmitProjectEdit)} className="space-y-5 bg-muted/20 p-5 rounded-lg border border-border/50">
                                  <h3 className="text-sm font-semibold flex items-center gap-2"><Edit2 className="h-4 w-4 text-primary"/> Edit Project Details</h3>
                                  <FormField control={projectForm.control} name="name" render={({ field }) => (
                                      <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl></FormItem>
                                  )} />
                                  <FormField control={projectForm.control} name="description" render={({ field }) => (
                                      <FormItem><FormLabel>Description (Markdown supported)</FormLabel><FormControl><Textarea className="bg-background min-h-[120px] resize-y" {...field} /></FormControl></FormItem>
                                  )} />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField control={projectForm.control} name="status" render={({ field }) => (
                                          <FormItem><FormLabel>Status</FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value}>
                                              <FormControl><SelectTrigger className="bg-background"><SelectValue/></SelectTrigger></FormControl>
                                              <SelectContent>
                                                  <SelectItem value="PLANNING">Planning</SelectItem>
                                                  <SelectItem value="ACTIVE">Active</SelectItem>
                                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                                              </SelectContent>
                                          </Select></FormItem>
                                      )} />
                                      <FormField control={projectForm.control} name="heuristicMode" render={({ field }) => (
                                          <FormItem><FormLabel>Heuristic Mode</FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value}>
                                              <FormControl><SelectTrigger className="bg-background"><SelectValue/></SelectTrigger></FormControl>
                                              <SelectContent>
                                                  <SelectItem value="BALANCED">Balanced</SelectItem>
                                                  <SelectItem value="URGENT">Urgent First</SelectItem>
                                                  <SelectItem value="TRAINING">Training</SelectItem>
                                              </SelectContent>
                                          </Select></FormItem>
                                      )} />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField control={projectForm.control} name="startDate" render={({ field }) => (
                                          <FormItem><FormLabel>Start Date</FormLabel>
                                          <FormControl><Input type="date" className="bg-background" {...field} /></FormControl></FormItem>
                                      )} />
                                      <FormField control={projectForm.control} name="endDate" render={({ field }) => (
                                          <FormItem><FormLabel>End Date</FormLabel>
                                          <FormControl><Input type="date" className="bg-background" {...field} /></FormControl></FormItem>
                                      )} />
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                      <Button type="submit" size="sm" className="gap-2"><Save className="h-4 w-4"/> Save Changes</Button>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProject(false)}>Cancel</Button>
                                  </div>
                              </form>
                          </Form>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground uppercase tracking-wider"><FileText className="h-4 w-4"/> Description</h3>
                              <div className="bg-muted/10 p-5 rounded-lg border border-border/50 min-h-[120px] text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                  {project?.description || <span className="text-muted-foreground italic">No description provided. Add one to help your team understand the project goals.</span>}
                              </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Current Sprint Placeholder */}
                    <Card className="shadow-sm border-muted/60">
                        <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/> Current Sprint</CardTitle>
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
                            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/> Recent Activity</CardTitle>
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
                            <CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Progress Snapshot</CardTitle>
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
                            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-blue-500"/> Team Members</CardTitle>
                            {isManager && <Button variant="ghost" size="icon" className="h-6 w-6"><UserPlus className="h-4 w-4 text-muted-foreground hover:text-primary"/></Button>}
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
                    <Card className="shadow-sm border-muted/60 bg-primary/5 border-primary/10">
                        <CardContent className="p-5">
                            <h3 className="text-sm font-semibold mb-3 text-primary">Quick Actions</h3>
                            <div className="space-y-2">
                                <Button className="w-full justify-start bg-background hover:bg-muted text-foreground border shadow-sm" variant="outline" onClick={() => setIsCreateModalOpen(true)}>
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
            
            {activeTab === "backlog" && (
              <div className="p-6 h-full overflow-auto bg-muted/5">
                <Card className="max-w-5xl mx-auto shadow-sm border-muted/60">
                  <CardHeader className="pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="text-xl">Backlog</CardTitle>
                      <CardDescription className="mt-1">Plan your sprints and view all tasks.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="w-[140px] h-9 bg-background border shadow-sm">
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
                    <div className="space-y-1">
                      {tasks.filter(t => t.parentId == null).length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                          <ListChecks className="mx-auto h-8 w-8 mb-3 opacity-20" />
                          <p>Backlog is empty. Create tasks to start planning.</p>
                        </div>
                      ) : (
                        tasks.filter(t => t.parentId == null).sort((a,b) => {
                            if (sortBy === "priority") {
                                const pScore: any = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                                return (pScore[b.priority] || 0) - (pScore[a.priority] || 0);
                            }
                            if (sortBy === "createdAt") {
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            }
                            return a.position - b.position;
                        }).map(task => renderBacklogTask(task, 0))
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
        onDeleteTask={handleDeleteTask}
        onUpdateTask={onUpdateTask}
        onCreateSubtask={onCreateSubtask}
        onOpenTaskDetail={openTaskDetail}
      />
    </div>
  );
}
