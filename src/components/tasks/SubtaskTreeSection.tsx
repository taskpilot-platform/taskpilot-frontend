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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSubmit();
    } else if (e.key === "Escape") {
      setVal("");
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
        {subtasks.length === 0 && !val && (
          <div className="text-[13px] text-muted-foreground/70 italic py-1 px-1">
            No subtasks yet.
          </div>
        )}
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer group"
            onClick={() => onOpenTask(sub.id)}
          >
            {sub.status === "DONE" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            )}
            <span className={`text-sm truncate ${sub.status === "DONE" ? "line-through text-muted-foreground" : "font-medium text-foreground/90"}`}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>

      <div className={`mt-2 p-2 -mx-2 rounded-lg transition-all duration-200 border ${val ? 'bg-muted/20 border-border/60 shadow-sm' : 'border-transparent hover:bg-muted/30'}`}>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 flex items-center justify-center shrink-0">
            {isSubmitting ? <Plus className="h-3 w-3 animate-spin text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
          </div>
          <input
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground/90 placeholder:text-muted-foreground/50 py-0.5"
            placeholder="Add a subtask..."
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </div>
        {val && (
          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border/20 animate-in fade-in slide-in-from-top-1">
            <span className="text-[10px] text-muted-foreground mr-auto ml-7">Press <kbd className="bg-muted px-1 rounded">Enter</kbd> to add</span>
            <button 
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setVal("")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !val.trim()}
            >
              Add Subtask
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
