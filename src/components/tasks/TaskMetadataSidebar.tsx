import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import type { TaskPriority, TaskStatus, LabelDto, SkillDto, PatchTaskRequest } from "@/types/task";
import type { ProjectMember } from "@/types/project";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LabelSelector } from "./LabelSelector";
import { SkillSelector } from "./SkillSelector";
import {
  assertSupportedProjectTimezone,
  formatInstantToProjectDateInput,
  isValidTaskDateRange,
} from "@/lib/projectTaskDate";

export type TaskSidebarPatchPayload = Omit<PatchTaskRequest, "expectedTaskVersion" | "requestId">;

interface Props {
  projectId: number;
  projectTimezoneId?: string;
  assigneeId?: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  projectMembers: ProjectMember[];
  labels: LabelDto[];
  requiredSkills: SkillDto[];
  isManager: boolean;
  onUpdate: (payload: TaskSidebarPatchPayload) => Promise<void>;
}

export function TaskMetadataSidebar({
  projectId,
  projectTimezoneId,
  assigneeId,
  status,
  priority,
  startDate,
  dueDate,
  projectMembers,
  labels,
  requiredSkills,
  isManager,
  onUpdate,
}: Props) {
  const { t } = useTranslation();

  let timezoneError: string | null = null;
  let startDayInput = "";
  let dueDayInput = "";
  try {
    assertSupportedProjectTimezone(projectTimezoneId);
    startDayInput = formatInstantToProjectDateInput(startDate, projectTimezoneId);
    dueDayInput = formatInstantToProjectDateInput(dueDate, projectTimezoneId);
  } catch (err) {
    timezoneError = err instanceof Error ? err.message : "Unsupported project timezone";
  }

  const handleAssigneeChange = async (val: string) => {
    const newAssignee = val === "unassigned" ? null : Number(val);
    try {
      await onUpdate({ assigneeId: newAssignee });
    } catch (error) {
      console.error("Failed to update assignee", error);
    }
  };

  const handleStatusChange = async (val: TaskStatus) => {
    if (val === status) return;
    try {
      await onUpdate({ status: val });
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handlePriorityChange = async (val: TaskPriority) => {
    try {
      await onUpdate({ priority: val });
    } catch (error) {
      console.error("Failed to update priority", error);
    }
  };

  const handleStartDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timezoneError) {
      toast.error(timezoneError);
      return;
    }
    const nextStartDay = e.target.value ? e.target.value : null;
    if (!isValidTaskDateRange(nextStartDay, dueDayInput || null)) {
      toast.error(t("tasks.date_range_error"));
      return;
    }

    try {
      await onUpdate({ startDate: nextStartDay });
    } catch (error) {
      console.error("Failed to update start date", error);
    }
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timezoneError) {
      toast.error(timezoneError);
      return;
    }
    const nextDueDay = e.target.value ? e.target.value : null;
    if (!isValidTaskDateRange(startDayInput || null, nextDueDay)) {
      toast.error(t("tasks.date_range_error"));
      return;
    }

    try {
      await onUpdate({ dueDate: nextDueDay });
    } catch (error) {
      console.error("Failed to update due date", error);
    }
  };

  const workflowLocked = status === "REVIEW" || status === "DONE";
  const triggerClass = "flex-1 max-w-[180px] sm:max-w-[140px] h-8 text-xs border-transparent hover:border-input bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 shadow-sm transition-colors focus:ring-1 text-right justify-between";
  const inputClass = "flex-1 max-w-[180px] sm:max-w-[140px] h-8 text-xs rounded-md border-transparent hover:border-input bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right disabled:opacity-50";

  return (
    <div className="space-y-4 bg-muted/5 p-5 rounded-xl border border-border/40">
      {timezoneError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {timezoneError}
        </div>
      )}

      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assignee</label>
        <Select onValueChange={handleAssigneeChange} value={assigneeId != null ? assigneeId.toString() : "unassigned"} disabled={workflowLocked}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground italic">Unassigned</span>
            </SelectItem>
            {projectMembers.map((m) => (
              <SelectItem key={m.userId} value={m.userId.toString()}>
                <div className="flex items-center gap-2">
                  <UserAvatar name={m.fullName || `User ${m.userId}`} className="h-4 w-4" />
                  {m.fullName || `User ${m.userId}`}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
        <Select onValueChange={handleStatusChange} value={status} disabled={workflowLocked}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODO" disabled={workflowLocked}>To Do</SelectItem>
            <SelectItem value="IN_PROGRESS" disabled={workflowLocked}>In Progress</SelectItem>
            <SelectItem value="REVIEW" disabled>Review (Workflow)</SelectItem>
            <SelectItem value="DONE" disabled>Done (Workflow)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
        <Select onValueChange={handlePriorityChange} value={priority} disabled={workflowLocked}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between group gap-4">
        <label htmlFor="task-start-date" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
        <input
          id="task-start-date"
          aria-label="Start Date"
          type="date"
          className={inputClass}
          value={startDayInput}
          disabled={workflowLocked || Boolean(timezoneError)}
          onChange={handleStartDateChange}
        />
      </div>

      <div className="flex items-center justify-between group gap-4">
        <label htmlFor="task-due-date" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due Date</label>
        <input
          id="task-due-date"
          aria-label="Due Date"
          type="date"
          className={inputClass}
          value={dueDayInput}
          disabled={workflowLocked || Boolean(timezoneError)}
          onChange={handleDueDateChange}
        />
      </div>

      <div className="pt-4 border-t border-border/40 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Labels</label>
          <LabelSelector
            projectId={projectId}
            selectedLabels={labels}
            isManager={isManager}
            onChange={(newLabels) => onUpdate({ labelIds: newLabels.map(l => l.id) })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Required Skills</label>
          <SkillSelector
            selectedSkills={requiredSkills}
            onChange={(newSkills) => onUpdate({ requiredSkillIds: newSkills.map(s => s.id) })}
          />
        </div>
      </div>

    </div>
  );
}
