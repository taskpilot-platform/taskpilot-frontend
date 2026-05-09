import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListChecks, Plus } from "lucide-react";
import type { TaskDto } from "@/types/task";

interface Props {
  subtasks: TaskDto[];
  onOpenTask: (taskId: number) => void;
  onCreateSubtask: (title: string) => Promise<void>;
}

export function SubtaskTreeSection({ subtasks, onOpenTask, onCreateSubtask }: Props) {
  const [val, setVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateSubtask(val);
      setVal("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-6 mt-6 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <ListChecks className="h-4 w-4" /> Subtasks
        </h3>
        <Badge variant="secondary" className="font-mono text-[10px]">{subtasks.length}</Badge>
      </div>
      
      <div className="space-y-1.5">
        {subtasks.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-2 pl-2 border-l-2 border-muted">
            No subtasks yet.
          </div>
        )}
        {subtasks.map((sub) => (
          <div 
            key={sub.id} 
            className="group flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={() => onOpenTask(sub.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <Badge 
                variant={sub.status === "DONE" ? "default" : "secondary"} 
                className={`text-[10px] px-1.5 shrink-0 ${sub.status === "DONE" ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted/50 text-muted-foreground"}`}
              >
                {sub.status.replace("_", " ")}
              </Badge>
              <span className={`text-sm truncate group-hover:text-primary transition-colors ${sub.status === "DONE" ? "line-through text-muted-foreground" : "font-medium text-foreground/90"}`}>
                {sub.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2 group relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Plus className="h-4 w-4" />
        </div>
        <Input 
          className="h-9 pl-9 bg-muted/10 border-transparent hover:border-input focus-visible:bg-background transition-colors placeholder:text-muted-foreground/60 shadow-none" 
          placeholder="Add a subtask..." 
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={isSubmitting}
        />
      </form>
    </div>
  );
}
