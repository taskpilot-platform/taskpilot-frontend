import { Activity, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActivityTimeline() {
  return (
    <div className="space-y-6 pt-8 mt-8 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Activity className="h-4 w-4" /> Activity
        </h3>
      </div>
      
      <div className="rounded-lg border border-border/40 bg-muted/5 p-8 text-center flex flex-col items-center justify-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-foreground/80 font-medium">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Comments and activity history will appear here. This feature is coming soon.
        </p>
        <Button variant="outline" size="sm" className="mt-4" disabled>
          Leave a comment
        </Button>
      </div>
    </div>
  );
}
