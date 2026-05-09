import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  Search,
  Users,
  PlusCircle,
  Loader2,
  Trash2,
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { getApiErrorMessage } from "@/lib/http";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import type { MyProject, ProjectMember } from "@/types/project";
import type { TaskDetailDto, TaskDto, TaskPriority, TaskStatus } from "@/types/task";

type ViewMode = "overview" | "kanban" | "timeline" | "sprints";

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

const editFormSchema = formSchema.extend({
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
});

const subtaskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
});

export default function TaskSprintPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchInput, setSearchInput] = useState("");

  const [projects, setProjects] = useState<MyProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetailDto | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      assigneeId: "unassigned",
    },
  });

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "TODO",
      assigneeId: "unassigned",
    },
  });

  const subtaskForm = useForm<z.infer<typeof subtaskFormSchema>>({
    resolver: zodResolver(subtaskFormSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectService.getMyProjects(0, 100);
        setProjects(res.data.content);
        if (res.data.content.length > 0) {
          setSelectedProjectId(res.data.content[0].id);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
    };
    void loadProjects();
  }, []);

  const loadProjectMembers = async (projectId: number) => {
    try {
      const res = await projectService.getProjectMembers(projectId);
      setProjectMembers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadTasks = async (projectId: number) => {
    setIsLoadingTasks(true);
    try {
      const res = await taskService.getTasksByProject(projectId);
      // Only show root tasks in Kanban
      setTasks(res.data.filter(t => t.parentId == null));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId !== "") {
      void loadTasks(Number(selectedProjectId));
      void loadProjectMembers(Number(selectedProjectId));
    } else {
      setTasks([]);
      setProjectMembers([]);
    }
  }, [selectedProjectId]);

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

  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const inProgress = filteredTasks.filter((task) => task.status === "IN_PROGRESS").length;
    const done = filteredTasks.filter((task) => task.status === "DONE").length;
    const todo = filteredTasks.filter((task) => task.status === "TODO").length;
    const review = filteredTasks.filter((task) => task.status === "REVIEW").length;
    
    return { total, inProgress, done, todo, review };
  }, [filteredTasks]);

  const groupedKanban = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      tasks: filteredTasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position),
    }));
  }, [filteredTasks]);

  const onSubmitCreate = async (values: z.infer<typeof formSchema>) => {
    if (selectedProjectId === "") return;
    try {
      await taskService.createTask({
        projectId: Number(selectedProjectId),
        title: values.title,
        description: values.description,
        priority: values.priority,
        position: 0,
        assigneeId: values.assigneeId && values.assigneeId !== "unassigned" ? Number(values.assigneeId) : undefined,
      });
      toast.success("Task created successfully");
      setIsCreateModalOpen(false);
      form.reset();
      void loadTasks(Number(selectedProjectId));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const openTaskDetail = async (taskId: number) => {
    try {
      const res = await taskService.getTaskById(taskId);
      setSelectedTaskDetail(res.data);
      editForm.reset({
        title: res.data.task.title,
        description: res.data.task.description || "",
        priority: res.data.task.priority,
        status: res.data.task.status,
        assigneeId: res.data.task.assigneeId ? res.data.task.assigneeId.toString() : "unassigned",
      });
      setIsTaskDetailOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onSubmitEdit = async (values: z.infer<typeof editFormSchema>) => {
    if (!selectedTaskDetail) return;
    try {
      await taskService.updateTask(selectedTaskDetail.task.id, {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        assigneeId: values.assigneeId && values.assigneeId !== "unassigned" ? Number(values.assigneeId) : undefined,
      });
      toast.success("Task updated successfully");
      // Refresh local detail and list
      void loadTasks(Number(selectedProjectId));
      const res = await taskService.getTaskById(selectedTaskDetail.task.id);
      setSelectedTaskDetail(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskDetail) return;
    if (!window.confirm("Are you sure you want to delete this task? This will also delete all subtasks.")) return;
    
    try {
      await taskService.deleteTask(selectedTaskDetail.task.id);
      toast.success("Task deleted successfully");
      setIsTaskDetailOpen(false);
      void loadTasks(Number(selectedProjectId));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onCreateSubtask = async (values: z.infer<typeof subtaskFormSchema>) => {
    if (!selectedTaskDetail || selectedProjectId === "") return;
    try {
      await taskService.createTask({
        projectId: Number(selectedProjectId),
        parentId: selectedTaskDetail.task.id,
        title: values.title,
        position: 0,
      });
      toast.success("Subtask created");
      subtaskForm.reset();
      // Reload task detail
      const res = await taskService.getTaskById(selectedTaskDetail.task.id);
      setSelectedTaskDetail(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
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
      if (selectedProjectId !== "") {
        void loadTasks(Number(selectedProjectId));
      }
    }
  };

  const getAssigneeName = (assigneeId?: number) => {
    if (!assigneeId) return "Unassigned";
    const member = projectMembers.find(m => m.userId === assigneeId);
    return member ? `User ${member.userId}` : "Unknown"; // Ideally we have user names, but PM member only has userId
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8 flex flex-col h-screen overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("tasks.title", "Tasks")}</h1>
          <p className="text-muted-foreground">{t("tasks.desc", "Manage tasks and subtasks.")}</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <Select 
              value={selectedProjectId.toString()} 
              onValueChange={(val) => setSelectedProjectId(Number(val))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button disabled={selectedProjectId === ""} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Add a new task to the selected project.</DialogDescription>
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

          <Button type="button" variant="secondary" className="gap-2" onClick={() => selectedProjectId && loadTasks(Number(selectedProjectId))}>
            <RefreshCw className={`h-4 w-4 ${isLoadingTasks ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 shrink-0">
        <Card><CardHeader className="pb-2"><CardDescription>Total Tasks</CardDescription><CardTitle>{summary.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>In Progress</CardDescription><CardTitle>{summary.inProgress}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Done</CardDescription><CardTitle>{summary.done}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>To Do</CardDescription><CardTitle>{summary.todo}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>In Review</CardDescription><CardTitle>{summary.review}</CardTitle></CardHeader></Card>
      </div>

      {/* CONTROLS */}
      <Card className="shrink-0">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant={viewMode === "overview" ? "default" : "outline"} className="gap-2" onClick={() => setViewMode("overview")}>
              <LayoutDashboard className="h-4 w-4" /> {t("tasks.tab_overview", "Overview")}
            </Button>
            <Button type="button" variant={viewMode === "kanban" ? "default" : "outline"} className="gap-2" onClick={() => setViewMode("kanban")}>
              <FolderKanban className="h-4 w-4" /> {t("tasks.tab_kanban", "Kanban")}
            </Button>
            <Button type="button" variant={viewMode === "timeline" ? "default" : "outline"} className="gap-2" onClick={() => setViewMode("timeline")}>
              <CalendarDays className="h-4 w-4" /> {t("tasks.tab_timeline", "Timeline")}
            </Button>
            <Button type="button" variant={viewMode === "sprints" ? "default" : "outline"} className="gap-2" onClick={() => setViewMode("sprints")}>
              <ListChecks className="h-4 w-4" /> {t("tasks.tab_sprints", "Sprints")}
            </Button>
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("tasks.search_placeholder", "Search...")} />
          </div>
        </CardContent>
      </Card>

      {/* VIEW MODES */}
      <div className="flex-1 overflow-hidden min-h-0">
        {isLoadingTasks ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading tasks...
          </div>
        ) : (
          <>
            {viewMode === "kanban" && (
              <div className="h-full overflow-x-auto pb-4">
                <div className="flex min-w-[1000px] gap-4 h-full">
                  {groupedKanban.map((column) => (
                    <div 
                      key={column.status} 
                      className="flex-1 flex flex-col rounded-lg border bg-muted/20 p-3 min-w-[250px]"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.status)}
                    >
                      <div className="flex items-center justify-between mb-3 shrink-0">
                        <h3 className="text-sm font-semibold">{t(`tasks.col_${column.status.toLowerCase()}`, column.status)}</h3>
                        <Badge variant="secondary">{column.tasks.length}</Badge>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {column.tasks.length === 0 && (
                          <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                            {t("tasks.kanban_empty", "Drop here")}
                          </p>
                        )}
                        {column.tasks.map((task) => (
                          <div 
                            key={task.id} 
                            className="space-y-2 rounded-md border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => openTaskDetail(task.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground font-mono">TP-{task.id}</span>
                              <Badge variant="outline" className={priorityBadgeClass[task.priority]}>
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                            <div className="flex items-center text-xs text-muted-foreground mt-2">
                              <Users className="mr-1 h-3 w-3" /> {getAssigneeName(task.assigneeId)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === "overview" && <Card><CardHeader><CardTitle>Overview Placeholder</CardTitle></CardHeader></Card>}
            {viewMode === "timeline" && <Card><CardHeader><CardTitle>Timeline Placeholder</CardTitle></CardHeader></Card>}
            {viewMode === "sprints" && <Card><CardHeader><CardTitle>Sprints Placeholder</CardTitle></CardHeader></Card>}
          </>
        )}
      </div>

      {/* TASK DETAIL SHEET */}
      <Sheet open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between mt-4">
              <SheetTitle>Task TP-{selectedTaskDetail?.task.id}</SheetTitle>
              <Button variant="destructive" size="sm" onClick={handleDeleteTask}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
            <SheetDescription>
              Created by {selectedTaskDetail?.reporter?.fullName || "Unknown"}
            </SheetDescription>
          </SheetHeader>

          {selectedTaskDetail && (
            <div className="mt-6 space-y-8">
              {/* EDIT FORM */}
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
                  <FormField control={editForm.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={editForm.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="TODO">TODO</SelectItem><SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                            <SelectItem value="REVIEW">REVIEW</SelectItem><SelectItem value="DONE">DONE</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="priority" render={({ field }) => (
                      <FormItem><FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem><SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={editForm.control} name="assigneeId" render={({ field }) => (
                    <FormItem><FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {projectMembers.map((m) => (
                            <SelectItem key={m.userId} value={m.userId.toString()}>User {m.userId}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={editForm.formState.isSubmitting} className="w-full">
                    {editForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                  </Button>
                </form>
              </Form>

              {/* SUBTASKS SECTION */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center">
                  <ListChecks className="mr-2 h-5 w-5" /> Subtasks
                </h3>
                
                {selectedTaskDetail.subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTaskDetail.subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={sub.status === "DONE" ? "bg-emerald-500/10 text-emerald-500" : ""}>
                            {sub.status}
                          </Badge>
                          <span className={sub.status === "DONE" ? "line-through text-muted-foreground" : "font-medium"}>
                            {sub.title}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openTaskDetail(sub.id)}>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subtasks yet.</p>
                )}

                <Form {...subtaskForm}>
                  <form onSubmit={subtaskForm.handleSubmit(onCreateSubtask)} className="flex items-center gap-2 mt-2">
                    <FormField control={subtaskForm.control} name="title" render={({ field }) => (
                      <FormItem className="flex-1"><FormControl><Input placeholder="Add new subtask..." {...field} /></FormControl></FormItem>
                    )} />
                    <Button type="submit" variant="secondary" disabled={subtaskForm.formState.isSubmitting}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
