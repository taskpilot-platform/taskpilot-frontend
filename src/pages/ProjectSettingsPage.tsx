import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Plus,
  LogOut,
  Copy,
  MailPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLeaveProject } from "@/hooks/useLeaveProject";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { createRequestId, getApiErrorMessage } from "@/lib/http";
import { isSupportedProjectTimezone } from "@/lib/projectTaskDate";
import { projectService } from "@/services/project.service";
import { labelService } from "@/services/label.service";
import { profileService } from "@/services/profile.service";
import type {
  CreateProjectInvitationResponse,
  Project,
  ProjectInvitation,
  ProjectMember,
} from "@/types/project";
import type { LabelDto } from "@/types/task";

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]),
  heuristicMode: z.enum(["BALANCED", "URGENT", "TRAINING"]).optional(),
  workflowMode: z.enum(["KANBAN", "SCRUM"]),
  timezoneId: z
    .string()
    .min(1, "Timezone is required")
    .refine(
      (val) => isSupportedProjectTimezone(val),
      "Timezone must be \"UTC\" or a canonical IANA region ID (e.g. Asia/Ho_Chi_Minh)",
    ),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const COMMON_PROJECT_TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "UTC",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export default function ProjectSettingsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentProjectId = Number(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<CreateProjectInvitationResponse | null>(null);
  const [labels, setLabels] = useState<LabelDto[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Label Form
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366F1");
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const deleteRequestIdRef = useRef<string>(createRequestId());
  const { isLeaving, handleLeaveProject } = useLeaveProject(currentProjectId, projectMembers, myUserId);

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", description: "", status: "ACTIVE", workflowMode: "KANBAN", timezoneId: "Asia/Ho_Chi_Minh" },
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
        timezoneId: projRes.data.timezoneId || "Asia/Ho_Chi_Minh",
        startDate: projRes.data.startDate ? projRes.data.startDate.split("T")[0] : "",
        endDate: projRes.data.endDate ? projRes.data.endDate.split("T")[0] : "",
      });

      const me = membersRes.data.find(m => m.userId === profileRes.data.id);
      if (!me || me.role !== "MANAGER") {
        toast.error("You don't have permission to access project settings");
        navigate(`/projects/${currentProjectId}/overview`);
      } else {
        try {
          const invRes = await projectService.listInvitations(currentProjectId);
          setInvitations(invRes.data || []);
        } catch {
          setInvitations([]);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const onSubmitGeneral = async (values: z.infer<typeof projectFormSchema>) => {
    try {
      await projectService.updateProject(currentProjectId, {
        name: values.name,
        description: values.description,
        status: values.status,
        heuristicMode: values.heuristicMode,
        workflowMode: values.workflowMode,
        timezoneId: values.timezoneId,
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

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsCreatingInvite(true);
    try {
      const res = await projectService.createInvitation(currentProjectId, {
        email: inviteEmail.trim(),
      });
      setCreatedInvite(res.data);
      setInviteEmail("");
      toast.success(
        t("projects.p2.invite_created", {
          defaultValue: "Invitation created! Copy the link below to share it once.",
        }),
      );
      const invRes = await projectService.listInvitations(currentProjectId);
      setInvitations(invRes.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    try {
      await projectService.revokeInvitation(currentProjectId, invitationId);
      toast.success(t("projects.p2.invite_revoked", { defaultValue: "Invitation revoked." }));
      const invRes = await projectService.listInvitations(currentProjectId);
      setInvitations(invRes.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleRemoveMember = async (userId: number) => {
    const member = projectMembers.find(m => m.userId === userId);
    const memberName = member?.fullName || `User ${userId}`;
    const isConfirm = await confirm({
      title: t("project.settings.remove_member_title", { defaultValue: "Xóa thành viên" }),
      message: t("project.settings.remove_member_confirm", { defaultValue: `Are you sure you want to remove ${memberName} from this project?` }),
      variant: "destructive",
    });
    if (!isConfirm) return;
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
    const isConfirm = await confirm({
      title: t("project.settings.delete_label_title", { defaultValue: "Xóa nhãn" }),
      message: t("project.settings.delete_label_confirm", { defaultValue: "Delete this label?" }),
      variant: "destructive",
    });
    if (!isConfirm) return;
    try {
      await labelService.deleteLabel(currentProjectId, labelId);
      toast.success("Label deleted");
      void loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleArchiveProject = async () => {
    const isConfirm = await confirm({
      title: t("project.settings.archive_project_title", { defaultValue: "Lưu trữ dự án" }),
      message: t("project.settings.archive_project_confirm", { defaultValue: "Archive this project? It will become read-only." }),
      variant: "warning",
    });
    if (!isConfirm) return;
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

  const openDeleteProjectDialog = () => {
    deleteRequestIdRef.current = createRequestId();
    setDeleteConfirmText("");
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    const trimmed = deleteConfirmText.trim();
    const idText = currentProjectId.toString();
    if (trimmed !== idText && trimmed.toUpperCase() !== `DELETE ${idText}`) {
      toast.error(`Type "${idText}" or "DELETE ${idText}" to confirm permanent deletion.`);
      return;
    }
    setIsDeletingProject(true);
    try {
      await projectService.deleteProject(currentProjectId, trimmed, deleteRequestIdRef.current);
      toast.success("Project deleted permanently");
      setIsDeleteDialogOpen(false);
      navigate("/projects");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsDeletingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-muted/5">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-md bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-72 bg-muted/60 rounded" />
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-10 w-full bg-muted/40 rounded" />
            <div className="h-20 w-full bg-muted/40 rounded" />
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-12 w-full bg-muted/40 rounded" />
            <div className="h-12 w-full bg-muted/40 rounded" />
          </div>
        </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <FormField control={form.control} name="timezoneId" render={({ field }) => {
                    const zoneOptions = COMMON_PROJECT_TIMEZONES.includes(field.value)
                      ? COMMON_PROJECT_TIMEZONES
                      : [field.value, ...COMMON_PROJECT_TIMEZONES].filter(Boolean);
                    return (
                      <FormItem><FormLabel>Project Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isArchived}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {zoneOptions.map((tz) => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    );
                  }} />
                </div>
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
            {/* Private Invitations */}
            {!isArchived && (
              <div className="space-y-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <MailPlus className="h-4 w-4" />
                    {t("projects.p2.invitations_title", { defaultValue: "Private Email-Bound Invitations" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("projects.p2.invitations_desc", {
                      defaultValue:
                        "Create a single-use 7-day invite bound to the recipient's verified email, then copy and share the link manually.",
                    })}
                  </p>
                </div>

                <form onSubmit={handleCreateInvitation} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={isCreatingInvite || !inviteEmail.trim()}>
                    {isCreatingInvite && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {t("projects.p2.create_invite_btn", { defaultValue: "Create Invite Link" })}
                  </Button>
                </form>

                {createdInvite && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {t("projects.p2.copy_once_notice", {
                        defaultValue: "One-time shareable invitation link for {{email}} (copy now — hidden after reload):",
                        email: createdInvite.inviteeEmail,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs font-mono">
                        {createdInvite.inviteUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(createdInvite.inviteUrl);
                          toast.success(t("projects.p2.invite_copied", { defaultValue: "Invitation link copied!" }));
                        }}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                {invitations.length > 0 && (
                  <div className="divide-y rounded-md border bg-background/80">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium">{inv.inviteeEmail}</span>
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                            {inv.status}
                          </span>
                        </div>
                        {inv.status === "PENDING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-destructive hover:text-destructive"
                            onClick={() => void handleRevokeInvitation(inv.id)}
                          >
                            {t("projects.p2.revoke_invite_btn", { defaultValue: "Revoke" })}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  <div key={m.userId} className="flex flex-col gap-3 p-4 bg-card hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted border border-border/80 flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium">
                          {displayName}
                          {isCurrentUser && <span className="text-muted-foreground font-normal ml-1">(You)</span>}
                        </p>
                        {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("en-GB") : 'Unknown'}
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
            <div className="flex flex-col gap-3 p-4 border border-red-500/20 rounded-lg bg-red-500/5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">{t("projects.leave_title", { defaultValue: "Rời dự án" })}</h4>
                <p className="text-sm text-muted-foreground">{t("projects.leave_desc", { defaultValue: "Leave this project. You will lose access to all its boards, tasks, and history." })}</p>
              </div>
              <Button variant="destructive" onClick={handleLeaveProject} disabled={isLeaving}>
                {isLeaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                {t("projects.leave_title", { defaultValue: "Rời dự án" })}
              </Button>
            </div>

            <div className="flex flex-col gap-3 p-4 border border-red-500/20 rounded-lg bg-red-500/5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-sm">Archive Project</h4>
                <p className="text-sm text-muted-foreground">Mark the project as archived. It will become read-only.</p>
              </div>
              <Button variant="secondary" onClick={isArchived ? handleRestoreProject : handleArchiveProject} className={isArchived ? "" : "text-red-600 hover:text-red-700 hover:bg-red-100"}>
                {isArchived ? <RefreshCw className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                {isArchived ? "Restore Project" : "Archive Project"}
              </Button>
            </div>

            <div className="flex flex-col gap-3 p-4 border border-red-500/30 rounded-lg bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">Delete Project</h4>
                <p className="text-sm text-muted-foreground">Permanently delete this project and all its data. This action is irreversible.</p>
              </div>
              <Button variant="destructive" onClick={openDeleteProjectDialog}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete Project
            </DialogTitle>
            <DialogDescription>
              This permanently purges all sprints, tasks, submissions, evaluations, AI snapshots/outcomes, and
              schedules durable storage cleanup. Only a deletion audit record survives.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-project-confirm-input">
              Type <span className="font-mono font-semibold">{currentProjectId}</span> or{" "}
              <span className="font-mono font-semibold">DELETE {currentProjectId}</span> to confirm:
            </Label>
            <Input
              id="delete-project-confirm-input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`DELETE ${currentProjectId}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingProject}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeletingProject}>
              {isDeletingProject ? "Deleting..." : "Confirm Permanent Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
