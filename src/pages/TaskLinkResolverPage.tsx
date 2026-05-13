import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/http";
import { taskService } from "@/services/task.service";

function getPositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function TaskLinkResolverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = getPositiveInteger(searchParams.get("taskId"));
  const commentId = getPositiveInteger(searchParams.get("commentId"));

  useEffect(() => {
    if (!taskId) {
      toast.error("Invalid task link");
      navigate("/projects", { replace: true });
      return;
    }

    const resolveTaskLink = async () => {
      try {
        const response = await taskService.getTaskById(taskId);
        const projectId = response.data.task.projectId;
        const commentQuery = commentId ? `?commentId=${commentId}` : "";
        navigate(`/projects/${projectId}/tasks/${taskId}${commentQuery}`, { replace: true });
      } catch (error) {
        toast.error(getApiErrorMessage(error));
        navigate("/projects", { replace: true });
      }
    };

    void resolveTaskLink();
  }, [commentId, navigate, taskId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Opening task...</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resolving project workspace.</p>
      </div>
      <Button variant="outline" onClick={() => navigate("/projects")}>
        Back to Projects
      </Button>
    </div>
  );
}
