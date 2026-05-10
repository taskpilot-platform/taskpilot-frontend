import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Loader2 } from "lucide-react";

interface Props {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
}

export function TaskTitleSection({ title, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(title);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVal(title);
  }, [title]);

  const handleSave = async () => {
    if (!val.trim() || val === title) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await onSave(val);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save task title", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSave();
    } else if (e.key === "Escape") {
      setVal(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3 mb-6 bg-muted/10 p-4 rounded-lg border border-border/50">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="text-xl font-semibold bg-background"
          placeholder="Task title..."
          disabled={isLoading}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={isLoading || !val.trim()}>
            {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setVal(title); setIsEditing(false); }} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-start justify-between gap-4 mb-6 p-2 -ml-2 rounded-lg hover:bg-muted/30 transition-colors cursor-text"
      onClick={() => setIsEditing(true)}
    >
      <h1 className="text-2xl font-bold leading-tight text-foreground/90">{title}</h1>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
