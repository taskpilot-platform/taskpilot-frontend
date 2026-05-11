import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TaskHeader } from "./TaskHeader";
import { TaskTitleSection } from "./TaskTitleSection";
import { TaskDescriptionSection } from "./TaskDescriptionSection";
import { SubtaskTreeSection } from "./SubtaskTreeSection";
import { TaskMetadataSidebar } from "./TaskMetadataSidebar";
import { ActivityTimeline } from "./ActivityTimeline";
import type { TaskDetailDto, TaskPriority, TaskStatus } from "@/types/task";
import type { ProjectMember } from "@/types/project";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  taskDetail: TaskDetailDto | null;
  projectMembers: ProjectMember[];
  onDeleteTask: () => void;
  onUpdateTask: (payload: { title?: string; description?: string; assigneeId?: number; status?: TaskStatus; priority?: TaskPriority; startDate?: string; dueDate?: string; labelIds?: number[]; requiredSkillIds?: number[] }) => Promise<void>;
  onCreateSubtask: (title: string) => Promise<void>;
  onOpenTaskDetail: (taskId: number) => void;
  isManager: boolean;
}

export function TaskDetailSheet({
  isOpen,
  onOpenChange,
  taskDetail,
  projectMembers,
  onDeleteTask,
  onUpdateTask,
  onCreateSubtask,
  onOpenTaskDetail,
  isManager
}: Props) {
  if (!taskDetail) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto sm:border-l sm:shadow-2xl bg-card p-0">
           {/* Empty state while loading/null */}
        </SheetContent>
      </Sheet>
    );
  }

  const { task, reporter, subtasks } = taskDetail;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto sm:border-l sm:shadow-2xl bg-card p-6 md:p-8 flex flex-col gap-0 border-l border-border/40">
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">Task details for {task.title}</SheetDescription>
        
        <TaskHeader 
          taskId={task.id} 
          status={task.status} 
          reporterName={reporter?.fullName || `User ${task.reporterId}`} 
          onDelete={onDeleteTask} 
        />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area (70%) */}
          <div className="lg:col-span-2 space-y-2">
            
            <TaskTitleSection 
              title={task.title} 
              onSave={async (val) => onUpdateTask({ title: val })} 
            />

            <TaskDescriptionSection 
              description={task.description || ""} 
              onSave={async (val) => onUpdateTask({ description: val })} 
            />

            <SubtaskTreeSection 
              subtasks={subtasks} 
              onOpenTask={onOpenTaskDetail} 
              onCreateSubtask={onCreateSubtask} 
            />

            <ActivityTimeline />

          </div>

          {/* Sidebar Area (30%) */}
          <div className="space-y-6">
            <TaskMetadataSidebar 
              projectId={task.projectId}
              assigneeId={task.assigneeId}
              status={task.status}
              priority={task.priority}
              startDate={task.startDate}
              dueDate={task.dueDate}
              projectMembers={projectMembers}
              labels={task.labels || []}
              requiredSkills={taskDetail.requiredSkills || []}
              isManager={isManager}
              onUpdate={onUpdateTask}
            />
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
