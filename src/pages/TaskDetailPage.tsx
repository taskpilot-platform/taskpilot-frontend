import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/lib/http";
import { taskService } from "@/services/task.service";
import { projectService } from "@/services/project.service";
import { profileService } from "@/services/profile.service";
import type { TaskDetailDto, TaskPriority, TaskStatus } from "@/types/task";
import type { ProjectMember } from "@/types/project";

import { TaskHeader } from "@/components/tasks/TaskHeader";
import { TaskTitleSection } from "@/components/tasks/TaskTitleSection";
import { TaskDescriptionSection } from "@/components/tasks/TaskDescriptionSection";
import { SubtaskTreeSection } from "@/components/tasks/SubtaskTreeSection";
import { TaskMetadataSidebar } from "@/components/tasks/TaskMetadataSidebar";
import { ActivityTimeline } from "@/components/tasks/ActivityTimeline";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [taskDetail, setTaskDetail] = useState<TaskDetailDto | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentProjectId = Number(projectId);
  const currentTaskId = Number(taskId);

  useEffect(() => {
    const hasValidParams =
      Number.isInteger(currentProjectId) &&
      currentProjectId > 0 &&
      Number.isInteger(currentTaskId) &&
      currentTaskId > 0;

    if (!hasValidParams) {
      setIsLoading(false);
      toast.error("Invalid task URL");
      navigate("/projects", { replace: true });
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [taskRes, membersRes, profileRes, projectRes] = await Promise.all([
          taskService.getTaskById(currentTaskId),
          projectService.getProjectMembers(currentProjectId),
          profileService.getMe(),
          projectService.getProjectDetail(currentProjectId)
        ]);
        setTaskDetail(taskRes.data);
        setProjectMembers(membersRes.data);
        setMyUserId(profileRes.data?.id);
        setIsReadOnly(projectRes.data.status === "ARCHIVED");
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [currentProjectId, currentTaskId, navigate]);

  const onUpdateTask = async (payload: { title?: string; description?: string; assigneeId?: number; status?: TaskStatus; priority?: TaskPriority; startDate?: string; dueDate?: string; labelIds?: number[]; requiredSkillIds?: number[] }) => {
    if (!taskDetail) return;
    try {
      await taskService.updateTask(taskDetail.task.id, payload);
      toast.success("Task updated successfully");
      const res = await taskService.getTaskById(taskDetail.task.id);
      setTaskDetail(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const onDeleteTask = async () => {
    if (!taskDetail) return;
    if (!window.confirm("Are you sure you want to delete this task? This will also delete all subtasks.")) return;
    
    try {
      await taskService.deleteTask(taskDetail.task.id);
      toast.success("Task deleted successfully");
      navigate(`/projects/${currentProjectId}/board`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onCreateSubtask = async (title: string) => {
    if (!taskDetail) return;
    try {
      await taskService.createTask({
        projectId: currentProjectId,
        parentId: taskDetail.task.id,
        title,
        position: 0,
      });
      toast.success("Subtask created");
      const res = await taskService.getTaskById(taskDetail.task.id);
      setTaskDetail(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onOpenTaskDetail = (id: number) => {
    navigate(`/projects/${currentProjectId}/tasks/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!taskDetail) {
    return (
      <div className="flex-1 p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Task not found</h2>
        <Button onClick={() => navigate(`/projects/${currentProjectId}/board`)}>
          Back to Project
        </Button>
      </div>
    );
  }

  const { task, reporter, subtasks } = taskDetail;
  
  const myMemberInfo = projectMembers.find(m => m.userId === myUserId);
  const isManager = myMemberInfo?.role === "MANAGER";

  return (
    <div className="flex-1 bg-card overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        <Button variant="ghost" className="mb-4 pl-0 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/projects/${currentProjectId}/board`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>

        <TaskHeader 
          taskId={task.id} 
          status={task.status} 
          reporterName={reporter?.fullName || `User ${task.reporterId}`} 
          onDelete={onDeleteTask} 
          hideFullPageBtn={true}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-6">
          {/* Main Content Area (70%) */}
          <div className="lg:col-span-2 space-y-6">
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

            <ActivityTimeline
              taskId={task.id}
              currentUserId={myUserId}
              isManager={isManager}
              isReadOnly={isReadOnly}
            />
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
      </div>
    </div>
  );
}
