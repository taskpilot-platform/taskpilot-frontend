import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskPriority, TaskStatus, LabelDto, SkillDto } from "@/types/task";
import type { ProjectMember } from "@/types/project";
import { LabelSelector } from "./LabelSelector";
import { SkillSelector } from "./SkillSelector";

interface Props {
  projectId: number;
  assigneeId?: number;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  projectMembers: ProjectMember[];
  labels: LabelDto[];
  requiredSkills: SkillDto[];
  isManager: boolean;
  onUpdate: (payload: { assigneeId?: number; status?: TaskStatus; priority?: TaskPriority; startDate?: string; dueDate?: string; labelIds?: number[]; requiredSkillIds?: number[] }) => Promise<void>;
}

export function TaskMetadataSidebar({ projectId, assigneeId, status, priority, startDate, dueDate, projectMembers, labels, requiredSkills, isManager, onUpdate }: Props) {
  
  const handleAssigneeChange = async (val: string) => {
    const newAssignee = val === "unassigned" ? undefined : Number(val);
    try {
      await onUpdate({ assigneeId: newAssignee });
    } catch (error) {
      console.error("Failed to update assignee", error);
    }
  };

  const handleStatusChange = async (val: TaskStatus) => {
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
    const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
    try {
      await onUpdate({ startDate: val });
    } catch (error) {
      console.error("Failed to update start date", error);
    }
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
    try {
      await onUpdate({ dueDate: val });
    } catch (error) {
      console.error("Failed to update due date", error);
    }
  };

  const triggerClass = "flex-1 max-w-[140px] h-8 text-xs border-transparent hover:border-input bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 shadow-sm transition-colors focus:ring-1 text-right justify-between";
  const inputClass = "flex-1 max-w-[140px] h-8 text-xs rounded-md border-transparent hover:border-input bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right";

  return (
    <div className="space-y-4 bg-muted/5 p-5 rounded-xl border border-border/40">
      
      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assignee</label>
        <Select onValueChange={handleAssigneeChange} value={assigneeId ? assigneeId.toString() : "unassigned"}>
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
                   User {m.userId}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
        <Select onValueChange={handleStatusChange} value={status}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="REVIEW">Review</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
        <Select onValueChange={handlePriorityChange} value={priority}>
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
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
        <input 
            type="date" 
            className={inputClass}
            value={startDate ? startDate.split("T")[0] : ""} 
            onChange={handleStartDateChange} 
        />
      </div>
      
      <div className="flex items-center justify-between group gap-4">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due Date</label>
        <input 
            type="date" 
            className={inputClass}
            value={dueDate ? dueDate.split("T")[0] : ""} 
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
