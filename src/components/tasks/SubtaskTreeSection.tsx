import { useState } from "react";
import { Badge } from "@/components/ui/badge";

import { ListChecks, Plus, Circle, CheckCircle2 } from "lucide-react";
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
    } catch (error) {
      console.error("Failed to create subtask", error);
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
          <div className="text-[13px] text-muted-foreground/70 italic py-1 px-1">
            No subtasks yet.
          </div>
        )}
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onOpenTask(sub.id)}
          >
            {sub.status === "DONE" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={`text-sm truncate ${sub.status === "DONE" ? "line-through text-muted-foreground" : "font-medium text-foreground/90"}`}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-3 py-2 px-2 -mx-2 mt-1 rounded-md hover:bg-muted/30 transition-all group cursor-text border border-transparent hover:border-border/40 focus-within:bg-muted/30 focus-within:border-border/40">
        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary group-focus-within:text-primary shrink-0 transition-colors" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground/90 placeholder:text-muted-foreground/50"
          placeholder="Add a subtask..."
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={isSubmitting}
        />
      </form>
    </div>
  );
}
