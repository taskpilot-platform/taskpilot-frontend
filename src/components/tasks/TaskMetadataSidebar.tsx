import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskPriority, TaskStatus } from "@/types/task";
import type { ProjectMember } from "@/types/project";

interface Props {
  assigneeId?: number;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  projectMembers: ProjectMember[];
  onUpdate: (payload: { assigneeId?: number; status?: TaskStatus; priority?: TaskPriority; startDate?: string; dueDate?: string }) => Promise<void>;
}

export function TaskMetadataSidebar({ assigneeId, status, priority, startDate, dueDate, projectMembers, onUpdate }: Props) {
  
  const handleAssigneeChange = (val: string) => {
    const newAssignee = val === "unassigned" ? undefined : Number(val);
    void onUpdate({ assigneeId: newAssignee });
  };

  const handleStatusChange = (val: TaskStatus) => {
    void onUpdate({ status: val });
  };

  const handlePriorityChange = (val: TaskPriority) => {
    void onUpdate({ priority: val });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
    void onUpdate({ startDate: val });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
    void onUpdate({ dueDate: val });
  };

  const triggerClass = "w-36 h-8 text-xs border-transparent hover:border-input bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 shadow-sm transition-colors focus:ring-1 text-right justify-end";
  const inputClass = "w-36 h-8 text-xs rounded-md border-transparent hover:border-input bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right";

  return (
    <div className="space-y-4 bg-muted/5 p-5 rounded-xl border border-border/40">
      
      <div className="flex items-center justify-between group">
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

      <div className="flex items-center justify-between group">
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

      <div className="flex items-center justify-between group">
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

      <div className="flex items-center justify-between group">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
        <input 
            type="date" 
            className={inputClass}
            value={startDate ? startDate.split("T")[0] : ""} 
            onChange={handleStartDateChange} 
        />
      </div>
      
      <div className="flex items-center justify-between group">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due Date</label>
        <input 
            type="date" 
            className={inputClass}
            value={dueDate ? dueDate.split("T")[0] : ""} 
            onChange={handleDueDateChange} 
        />
      </div>

      <div className="pt-4 border-t border-border/40 space-y-4">
         <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sprint</label>
            <div className="text-xs px-2 py-1 rounded bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
               None
            </div>
         </div>
         <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Labels</label>
            <div className="text-xs px-2 py-1 rounded bg-muted/30 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
               None
            </div>
         </div>
      </div>

    </div>
  );
}
