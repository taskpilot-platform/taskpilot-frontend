import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Loader2, FileText } from "lucide-react";

interface Props {
  description: string;
  onSave: (newDescription: string) => Promise<void>;
}

export function TaskDescriptionSection({ description, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(description);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVal(description);
  }, [description]);

  const handleSave = async () => {
    if (val === description) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await onSave(val);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3 mb-8 bg-muted/10 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
           <FileText className="h-4 w-4" /> Edit Description
        </div>
        <Textarea 
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
          className="min-h-[150px] resize-y bg-background font-mono text-sm"
          placeholder="Add a detailed description..."
          disabled={isLoading}
        />
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setVal(description); setIsEditing(false); }} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const hasContent = description && description.trim().length > 0;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <FileText className="h-4 w-4" /> Description
        </h3>
      </div>
      
      <div 
        className={`group relative p-4 -mx-4 rounded-lg transition-colors cursor-text border border-transparent hover:border-border/30 hover:bg-muted/10 ${!hasContent ? "bg-muted/5 border-dashed border-border/40" : ""}`}
        onClick={() => setIsEditing(true)}
      >
        <Button 
          variant="secondary" 
          size="sm" 
          className={`absolute top-2 right-2 h-8 opacity-0 group-hover:opacity-100 transition-opacity ${!hasContent ? "opacity-100" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Edit2 className="h-3.5 w-3.5 mr-2" /> {hasContent ? "Edit" : "Add description"}
        </Button>
        
        {hasContent ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed pr-16">
            {description}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic py-2">
            No description provided. Click to add one.
          </div>
        )}
      </div>
    </div>
  );
}
