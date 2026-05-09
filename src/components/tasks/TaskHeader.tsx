import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
import type { TaskStatus } from "@/types/task";
import { useParams } from "react-router-dom";

interface Props {
  taskId: number;
  status: TaskStatus;
  reporterName: string;
  onDelete: () => void;
  hideFullPageBtn?: boolean;
}

export function TaskHeader({ taskId, status, reporterName, onDelete, hideFullPageBtn }: Props) {
  const { projectId } = useParams();
  
  return (
    <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6 mt-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded border border-border/50 shadow-sm">
          TP-{taskId}
        </span>
        <Badge 
          variant={status === "DONE" ? "default" : status === "IN_PROGRESS" ? "secondary" : "outline"} 
          className={`text-xs uppercase tracking-wider font-medium ${status === "TODO" ? "bg-muted/30 text-muted-foreground border-border/50" : ""}`}
        >
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${status === "DONE" ? "bg-emerald-400" : status === "IN_PROGRESS" ? "bg-amber-500" : status === "REVIEW" ? "bg-blue-500" : "bg-muted-foreground"}`} />
          {status.replace("_", " ")}
        </Badge>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
         <span className="text-xs text-muted-foreground hidden sm:inline-block mr-2">
            Opened by {reporterName}
         </span>
         {!hideFullPageBtn && (
           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Open in full page" onClick={() => window.open(`/projects/${projectId}/tasks/${taskId}`, '_blank')}>
              <ExternalLink className="h-4 w-4" />
           </Button>
         )}
         <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8" onClick={onDelete} title="Delete Task">
            <Trash2 className="h-4 w-4" />
         </Button>
      </div>
    </div>
  );
}
