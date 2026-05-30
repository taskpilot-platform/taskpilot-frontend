import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  Settings,
  Users,
  Tags,
  AlertTriangle,
  Save,
  Loader2,
  Trash2,
  Archive,
  RefreshCw,
  Plus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { getApiErrorMessage } from "@/lib/http";
import { projectService } from "@/services/project.service";
import { labelService } from "@/services/label.service";
import { profileService } from "@/services/profile.service";
import type { Project, ProjectMember } from "@/types/project";
import type { LabelDto } from "@/types/task";

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]),
  heuristicMode: z.enum(["BALANCED", "URGENT", "TRAINING"]).optional(),
  workflowMode: z.enum(["KANBAN", "SCRUM"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentProjectId = Number(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [labels, setLabels] = useState<LabelDto[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Label Form
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366F1");
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", description: "", status: "ACTIVE", workflowMode: "KANBAN" },
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projRes, membersRes, labelsRes, profileRes] = await Promise.all([
        projectService.getProjectDetail(currentProjectId),
        projectService.getProjectMembers(currentProjectId),
        labelService.getProjectLabels(currentProjectId),
        profileService.getMe()
      ]);
      setProject(projRes.data);
      setProjectMembers(membersRes.data);
      setLabels(labelsRes.data || []);
      setMyUserId(profileRes.data.id);

      form.reset({
        name: projRes.data.name,
        description: projRes.data.description || "",
        status: projRes.data.status as "PLANNING" | "ACTIVE" | "COMPLETED",
        heuristicMode: projRes.data.heuristicMode || "BALANCED",
        workflowMode: projRes.data.workflowMode || "KANBAN",
        startDate: projRes.data.startDate ? projRes.data.startDate.split("T")[0] : "",
        endDate: projRes.data.endDate ? projRes.data.endDate.split("T")[0] : "",
      });

      const me = membersRes.data.find(m => m.userId === profileRes.data.id);
      if (!me || me.role !== "MANAGER") {
        toast.error("You don't have permission to access project settings");
        navigate(`/projects/${currentProjectId}/overview`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      navigate(`/projects/${currentProjectId}/overview`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      void loadData();
    }
  }, [currentProjectId]);

  const onSubmitGeneral = async (values: z.infer<typeof projectFormSchema>) => {
    try {
      await projectService.updateProject(currentProjectId, {
        name: values.name,
        description: values.description,
        status: values.status,
        heuristicMode: values.heuristicMode,
        workflowMode: values.workflowMode,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      });
      toast.success("Project settings updated");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      await projectService.updateMemberRole(currentProjectId, userId, role);
      toast.success("Member role updated");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleRemoveMember = async (userId: number) => {
    const member = projectMembers.find(m => m.userId === userId);
    const memberName = member?.fullName || `User ${userId}`;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await projectService.removeMember(currentProjectId, userId);
      toast.success("Member removed");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      setIsCreatingLabel(true);
      await labelService.createLabel(currentProjectId, {
        name: newLabelName.trim(),
        color: newLabelColor
      });
      toast.success("Label created");
      setNewLabelName("");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!window.confirm("Delete this label?")) return;
    try {
      await labelService.deleteLabel(currentProjectId, labelId);
      toast.success("Label deleted");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Archive this project? It will become read-only.")) return;
    try {
      await projectService.archiveProject(currentProjectId);
      toast.success("Project archived");
      navigate(`/projects/${currentProjectId}/overview`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleRestoreProject = async () => {
    try {
      await projectService.restoreProject(currentProjectId);
      toast.success("Project restored");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleDeleteProject = async () => {
    if (!window.prompt("DANGER: Type the project ID to confirm deletion:")?.includes(currentProjectId.toString())) {
      toast.error("Deletion cancelled");
      return;
    }
    try {
      await projectService.deleteProject(currentProjectId);
      toast.success("Project deleted permanently");
      navigate("/projects");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isArchived = project?.status === "ARCHIVED";

  return (
    <div className="flex-1 overflow-y-auto bg-muted/5">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${currentProjectId}/overview`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" /> Settings
            </h1>
            <p className="text-muted-foreground">{project?.name}</p>
          </div>
        </div>

        {isArchived && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-lg flex items-start gap-3">
            <Archive className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Project is Archived</h4>
              <p className="text-sm mt-1 opacity-90">This project is in read-only mode. Most settings cannot be modified until you restore the project from the Danger Zone.</p>
            </div>
          </div>
        )}

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Update your project's main details and workflow configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitGeneral)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} disabled={isArchived} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} disabled={isArchived} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isArchived}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="PLANNING">Planning</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="heuristicMode" render={({ field }) => (
                    <FormItem><FormLabel>Heuristic Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isArchived}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="BALANCED">Balanced</SelectItem>
                          <SelectItem value="URGENT">Urgent First</SelectItem>
                          <SelectItem value="TRAINING">Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="workflowMode" render={({ field }) => (
                  <FormItem><FormLabel>Workflow Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isArchived}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="KANBAN">Kanban - Board shows all project tasks</SelectItem>
                        <SelectItem value="SCRUM">Scrum - Board shows only active sprint tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel>
                      <FormControl><Input type="date" {...field} disabled={isArchived} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>End Date</FormLabel>
                      <FormControl><Input type="date" {...field} disabled={isArchived} /></FormControl></FormItem>
                  )} />
                </div>
                {!isArchived && (
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Members Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Members ({projectMembers.length})</CardTitle>
            <CardDescription>Manage who has access to this project and their roles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invite Code */}
            {!isArchived && (
              <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Invite Code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Share this code so others can join the project</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono font-semibold">PRJ-{currentProjectId}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`PRJ-${currentProjectId}`);
                      toast.success("Invite code copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {/* Member List */}
            <div className="divide-y border rounded-md">
              {projectMembers.map(m => {
                const displayName = m.fullName || `User ${m.userId}`;
                const initials = m.fullName
                  ? m.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : `U${m.userId}`;
                const isCurrentUser = m.userId === myUserId;

                return (
                  <div key={m.userId} className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-sm font-bold text-blue-600 border border-blue-500/20">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium">
                          {displayName}
                          {isCurrentUser && <span className="text-muted-foreground font-normal ml-1">(You)</span>}
                        </p>
                        {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={m.role}
                        onValueChange={(val) => handleUpdateRole(m.userId, val)}
                        disabled={isArchived || isCurrentUser}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      {!isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          disabled={isArchived}
                          onClick={() => handleRemoveMember(m.userId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {projectMembers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No members found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Labels Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tags className="w-5 h-5 text-emerald-500" /> Labels</CardTitle>
            <CardDescription>Create and manage labels for tasks in this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isArchived && (
              <form onSubmit={handleCreateLabel} className="flex items-center gap-3">
                <Input placeholder="Label name" value={newLabelName} onChange={e => setNewLabelName(e.target.value)} className="max-w-[200px]" required />
                <div className="flex items-center gap-2 border rounded-md p-1 px-2 h-10">
                  <input type="color" value={newLabelColor} onChange={e => setNewLabelColor(e.target.value)} className="w-6 h-6 border-0 p-0 cursor-pointer rounded-sm" />
                  <span className="text-xs text-muted-foreground uppercase">{newLabelColor}</span>
                </div>
                <Button type="submit" disabled={isCreatingLabel}>
                  {isCreatingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Create Label
                </Button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              {labels.map(l => (
                <div key={l.id} className="flex items-center gap-2 bg-muted/30 border rounded-md px-3 py-1.5 pr-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-sm font-medium mr-2">{l.name}</span>
                  {!isArchived && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteLabel(l.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {labels.length === 0 && <span className="text-sm text-muted-foreground italic">No labels created yet.</span>}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/30 overflow-hidden">
          <div className="h-1 w-full bg-red-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertTriangle className="w-5 h-5" /> Danger Zone</CardTitle>
            <CardDescription>Destructive actions that cannot be easily undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-red-500/5">
              <div>
                <h4 className="font-semibold text-sm">Archive Project</h4>
                <p className="text-sm text-muted-foreground">Mark the project as archived. It will become read-only.</p>
              </div>
              <Button variant="secondary" onClick={isArchived ? handleRestoreProject : handleArchiveProject} className={isArchived ? "" : "text-red-600 hover:text-red-700 hover:bg-red-100"}>
                {isArchived ? <RefreshCw className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                {isArchived ? "Restore Project" : "Archive Project"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-500/30 rounded-lg bg-red-500/10">
              <div>
                <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">Delete Project</h4>
                <p className="text-sm text-muted-foreground">Permanently delete this project and all its data. This action is irreversible.</p>
              </div>
              <Button variant="destructive" onClick={handleDeleteProject}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
