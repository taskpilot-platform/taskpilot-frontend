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
    void onUpdate({ startDate: e.target.value || undefined });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void onUpdate({ dueDate: e.target.value || undefined });
  };

  return (
    <div className="space-y-6 bg-muted/10 p-5 rounded-xl border border-border/40">
      
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</label>
        <Select onValueChange={handleAssigneeChange} value={assigneeId ? assigneeId.toString() : "unassigned"}>
          <SelectTrigger className="h-9 border-transparent hover:border-input bg-card shadow-sm transition-colors focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
               <span className="text-muted-foreground italic">Unassigned</span>
            </SelectItem>
            {projectMembers.map((m) => (
              <SelectItem key={m.userId} value={m.userId.toString()}>
                <div className="flex items-center gap-2">
                   <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {m.userId}
                   </div>
                   User {m.userId}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
        <Select onValueChange={handleStatusChange} value={status}>
          <SelectTrigger className="h-9 border-transparent hover:border-input bg-card shadow-sm transition-colors focus:ring-1">
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

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
        <Select onValueChange={handlePriorityChange} value={priority}>
          <SelectTrigger className="h-9 border-transparent hover:border-input bg-card shadow-sm transition-colors focus:ring-1">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
          <input 
             type="date" 
             className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
             value={startDate ? startDate.split("T")[0] : ""} 
             onChange={handleStartDateChange} 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</label>
          <input 
             type="date" 
             className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
             value={dueDate ? dueDate.split("T")[0] : ""} 
             onChange={handleDueDateChange} 
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border/40 space-y-3">
         <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sprint</label>
            <div className="text-sm px-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
               None
            </div>
         </div>
         <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</label>
            <div className="text-sm px-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
               None
            </div>
         </div>
      </div>

    </div>
  );
}
