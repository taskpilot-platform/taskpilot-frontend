import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, Layers, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRequestId, getApiErrorMessage } from "@/lib/http";
import { sprintService } from "@/services/sprint.service";
import type {
  SprintCarryoverDestination,
  SprintCompletePreviewResponse,
  SprintDto,
} from "@/types/sprint";

interface Props {
  open: boolean;
  projectId: number;
  sprint: SprintDto | null;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

export function CompleteSprintDialog({
  open,
  projectId,
  sprint,
  onClose,
  onCompleted,
}: Props) {
  const [preview, setPreview] = useState<SprintCompletePreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [destination, setDestination] = useState<SprintCarryoverDestination>("BACKLOG");
  const [targetSprintId, setTargetSprintId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const intentRequestIdRef = useRef<string>(createRequestId());
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !sprint) {
      lastSignatureRef.current = null;
      return;
    }

    const signature = `${projectId}:${sprint.id}`;
    if (lastSignatureRef.current !== signature) {
      intentRequestIdRef.current = createRequestId();
      lastSignatureRef.current = signature;
    }

    setDestination("BACKLOG");
    setTargetSprintId("");
    setErrorMsg(null);
    setLoading(true);
    void sprintService
      .getCompletePreview(projectId, sprint.id)
      .then((res) => {
        setPreview(res.data);
        if (res.data.availableTargetSprints.length > 0) {
          setTargetSprintId(String(res.data.availableTargetSprints[0].id));
        }
      })
      .catch((err) => {
        setPreview(null);
        setErrorMsg(getApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [open, projectId, sprint]);

  const handleConfirmComplete = async () => {
    if (!sprint || !preview) return;
    if (destination === "SPRINT" && !targetSprintId) {
      toast.error("Select a writable target sprint for unfinished tasks.");
      return;
    }
    setSubmitting(true);
    try {
      await sprintService.completeSprint(
        projectId,
        sprint.id,
        {
          expectedSprintVersion: preview.sprintVersion,
          carryover: {
            destination,
            targetSprintId: destination === "SPRINT" ? Number(targetSprintId) : null,
          },
          expectedUnfinishedTaskIds: preview.unfinishedTaskIds,
        },
        intentRequestIdRef.current,
      );
      toast.success("Sprint completed and closure snapshot recorded.");
      await onCompleted();
      onClose();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      toast.error(msg);
      setErrorMsg(msg);
      // Refresh preview on version/state conflict so caller observes latest state
      try {
        const refreshed = await sprintService.getCompletePreview(projectId, sprint.id);
        setPreview(refreshed.data);
        intentRequestIdRef.current = createRequestId();
      } catch {
        // Ignore refresh error if sprint already completed
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Complete Sprint{sprint ? `: ${sprint.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            DONE tasks remain in the completed sprint with an immutable closure snapshot. Unfinished TODO, IN_PROGRESS,
            and REVIEW tasks (preserving pending submissions) must be moved explicitly.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live sprint closure preview...
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!loading && preview && (
          <div className="space-y-4 py-1 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Done (retained):</span>
                <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {preview.doneTasksRetained}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unfinished carryover:</span>
                <Badge variant="outline">{preview.unfinishedTotal}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">To Do:</span>
                <span>{preview.todoCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">In Progress:</span>
                <span>{preview.inProgressCount}</span>
              </div>
              <div className="flex items-center justify-between col-span-2">
                <span className="text-muted-foreground">Review (pending submissions preserved):</span>
                <Badge variant="secondary">{preview.reviewCount}</Badge>
              </div>
            </div>

            {preview.unfinishedTasks.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Unfinished Tasks ({preview.unfinishedTasks.length})
                </Label>
                <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-1 text-xs">
                  {preview.unfinishedTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        #{t.id} {t.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.hasPendingSubmission && (
                          <Badge variant="secondary" className="text-[10px]">
                            Pending Review
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {t.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <Label>Carryover Destination for Unfinished Tasks</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="sprint-carryover-destination"
                    value="BACKLOG"
                    checked={destination === "BACKLOG"}
                    onChange={() => setDestination("BACKLOG")}
                  />
                  <div>
                    <div className="text-sm font-medium">Backlog / Unscheduled</div>
                    <div className="text-xs text-muted-foreground">
                      Move unfinished tasks back to unscheduled project backlog.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 rounded-md border p-2.5 ${
                    preview.availableTargetSprints.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="sprint-carryover-destination"
                    value="SPRINT"
                    disabled={preview.availableTargetSprints.length === 0}
                    checked={destination === "SPRINT"}
                    onChange={() => setDestination("SPRINT")}
                  />
                  <div className="flex-1 space-y-1.5">
                    <div className="text-sm font-medium">Existing Writable Sprint</div>
                    {preview.availableTargetSprints.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No other planning sprint available in this project.
                      </div>
                    ) : (
                      destination === "SPRINT" && (
                        <Select value={targetSprintId} onValueChange={setTargetSprintId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select target sprint" />
                          </SelectTrigger>
                          <SelectContent>
                            {preview.availableTargetSprints.map((ts) => (
                              <SelectItem key={ts.id} value={String(ts.id)}>
                                {ts.name} ({ts.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmComplete}
            disabled={loading || !preview || submitting}
          >
            {submitting ? "Completing..." : "Complete Sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
