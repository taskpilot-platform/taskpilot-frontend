import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  FileWarning,
  GitBranch,
  History,
  RotateCcw,
  Send,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/http";
import { formatTaskDateDisplay } from "@/lib/projectTaskDate";
import { projectFilesService } from "@/services/project-files.service";
import { taskService } from "@/services/task.service";
import type { TaskDto, TaskWorkflowHistory } from "@/types/task";
import { TaskWorkflowDialogs, type ActiveWorkflowDialogKind } from "./TaskWorkflowDialogs";

interface Props {
  task: TaskDto;
  projectTimezoneId?: string;
  isReadOnly?: boolean;
  onWorkflowChanged: () => Promise<void> | void;
}

function formatDateTime(iso: string | null | undefined, zone?: string): string {
  if (!iso) return "—";
  try {
    return formatTaskDateDisplay(iso, zone, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TaskWorkflowPanel({
  task,
  projectTimezoneId,
  isReadOnly = false,
  onWorkflowChanged,
}: Props) {
  const [workflow, setWorkflow] = useState<TaskWorkflowHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveWorkflowDialogKind>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await taskService.getTaskWorkflow(task.id);
      setWorkflow(res.data);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow, task.version, task.status, task.currentSubmissionId, task.currentEvaluationId]);

  const handleSuccess = async () => {
    await Promise.all([loadWorkflow(), Promise.resolve(onWorkflowChanged())]);
  };

  const handleDownloadEvidence = async (fileId: number, originalName: string) => {
    setDownloadingFileId(fileId);
    try {
      const blob = await projectFilesService.downloadFileBlob(task.projectId, fileId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingFileId(null);
    }
  };

  const activeEvaluation =
    workflow?.evaluations?.find((e) => !e.invalidated) ?? null;
  const effectiveEvidenceStatus =
    workflow?.completionEvidenceStatus ?? task.completionEvidenceStatus ?? null;
  const effectiveZone = projectTimezoneId || task.projectTimezoneId;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Workflow & Acceptance Evidence</h3>
          <Badge variant="outline" className="text-[11px] font-mono">
            v{task.version}
          </Badge>
          {task.successorOfTaskId != null && (
            <Badge variant="secondary" className="text-[11px]">
              <GitBranch className="h-3 w-3 mr-1" />
              Successor of #{task.successorOfTaskId}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {effectiveEvidenceStatus === "INDEPENDENT_ACCEPTED" && (
            <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              <Award className="h-3 w-3 mr-1" />
              Evaluated {activeEvaluation?.qualityRating ?? task.currentQualityRating ?? "?"}/5
            </Badge>
          )}
          {effectiveEvidenceStatus === "SELF_ATTESTED" && (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Self-Attested (Not measured)
            </Badge>
          )}
          {effectiveEvidenceStatus === "LEGACY_UNVERIFIED" && (
            <Badge variant="secondary">
              Legacy Unverified
            </Badge>
          )}
          {activeEvaluation && (
            <Badge variant="outline" className="text-[11px]">
              <Clock className="h-3 w-3 mr-1" />
              {activeEvaluation.timelinessStatus === "ON_TIME"
                ? "On Time"
                : activeEvaluation.timelinessStatus === "LATE"
                  ? "Late"
                  : "No Due Date"}
            </Badge>
          )}
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      {workflow?.legacyReviewMissingSubmission && (
        <div
          role="alert"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Legacy REVIEW state has no recorded submission. Recover to In Progress before submitting evidence.
            </span>
          </div>
          {!isReadOnly && workflow.canRecoverLegacyReview && (
            <Button size="sm" variant="outline" onClick={() => setActiveDialog("recover_legacy_review")}>
              Recover
            </Button>
          )}
        </div>
      )}

      {!isReadOnly && workflow && (
        <div className="flex flex-wrap gap-2">
          {workflow.canSubmit && (
            <Button size="sm" onClick={() => setActiveDialog("submit")}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Submit for Review
            </Button>
          )}
          {workflow.canWithdraw && (
            <Button size="sm" variant="outline" onClick={() => setActiveDialog("withdraw")}>
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              Withdraw Submission
            </Button>
          )}
          {workflow.canReview && (
            <>
              <Button size="sm" onClick={() => setActiveDialog("review")}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Review Submission
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setActiveDialog("return")}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Return
              </Button>
            </>
          )}
          {workflow.canSelfAttest && (
            <Button size="sm" variant="secondary" onClick={() => setActiveDialog("self_attest")}>
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
              Self-Attest Completion
            </Button>
          )}
          {task.status === "REVIEW" &&
            !workflow.canReview &&
            !workflow.canSelfAttest &&
            workflow.otherActiveManagersExist &&
            !workflow.canWithdraw && (
              <span className="text-xs text-muted-foreground self-center">
                Independent review by another active manager is required.
              </span>
            )}
          {workflow.canReopen && (
            <Button size="sm" variant="outline" onClick={() => setActiveDialog("reopen")}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reopen Task
            </Button>
          )}
          {workflow.canSupersede && (
            <Button size="sm" variant="secondary" onClick={() => setActiveDialog("supersede")}>
              <Award className="h-3.5 w-3.5 mr-1.5" />
              {effectiveEvidenceStatus === "SELF_ATTESTED"
                ? "Record Independent Review"
                : "Supersede Evaluation"}
            </Button>
          )}
          {task.status === "DONE" && (
            <Button size="sm" variant="outline" onClick={() => setActiveDialog("create_successor")}>
              <GitBranch className="h-3.5 w-3.5 mr-1.5" />
              Create Follow-up Task
            </Button>
          )}
        </div>
      )}

      {loading && !workflow ? (
        <p className="text-xs text-muted-foreground">Loading workflow history...</p>
      ) : workflow ? (
        <div className="space-y-3 text-xs">
          {workflow.evaluations.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Evaluations ({workflow.evaluations.length})
              </div>
              {workflow.evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className={`rounded-md border p-2.5 space-y-1 ${
                    ev.invalidated ? "border-border/50 bg-muted/30 opacity-75" : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <span>v{ev.evaluationVersion}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {ev.evidenceStatus}
                      </Badge>
                      {ev.qualityRating != null && (
                        <Badge className="text-[10px]">{ev.qualityRating}/5 ({ev.rubricVersion})</Badge>
                      )}
                      {ev.invalidated && (
                        <Badge variant="destructive" className="text-[10px]">
                          Invalidated: {ev.invalidationReason}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Reviewer: {ev.reviewerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>Submitted: {formatDateTime(ev.acceptedSubmittedAt, effectiveZone)}</span>
                    <span>Reviewed: {formatDateTime(ev.reviewedAt, effectiveZone)}</span>
                    <span>Completed: {formatDateTime(ev.originalCompletedAt, effectiveZone)}</span>
                    <span>
                      Timeliness:{" "}
                      {ev.timelinessStatus === "ON_TIME"
                        ? "On Time"
                        : ev.timelinessStatus === "LATE"
                          ? "Late"
                          : "No Due Date"}
                    </span>
                  </div>
                  {ev.invalidationDetailReason && (
                    <div className="text-[11px] text-muted-foreground">
                      Invalidation note: {ev.invalidationDetailReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {workflow.submissions.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Submissions ({workflow.submissions.length})
              </div>
              {workflow.submissions.map((sub) => (
                <div key={sub.id} className="rounded-md border border-border/70 bg-card p-2.5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Cycle #{sub.cycleNo}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {sub.status}
                      </Badge>
                      <span className="text-muted-foreground">by {sub.submitterName}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(sub.submittedAt, sub.projectTimezoneId || effectiveZone)}
                    </span>
                  </div>
                  <p className="text-foreground/90 whitespace-pre-wrap">{sub.summary}</p>
                  {sub.withdrawalReason && (
                    <p className="text-[11px] text-muted-foreground">
                      Withdrawn: {sub.withdrawalReason}
                    </p>
                  )}
                  {sub.invalidationReason && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Invalidated: {sub.invalidationReason}
                    </p>
                  )}
                  {sub.evidenceFiles.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {sub.evidenceFiles.map((file) => (
                        <div
                          key={file.evidenceRefId}
                          className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!file.available && (
                              <FileWarning className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate font-medium">{file.originalName}</span>
                            <span className="text-muted-foreground">
                              ({Math.max(1, Math.round(file.fileSize / 1024))} KB)
                            </span>
                          </div>
                          {file.available && file.liveSourceFileId != null ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px]"
                              disabled={downloadingFileId === file.liveSourceFileId}
                              onClick={() =>
                                handleDownloadEvidence(file.liveSourceFileId!, file.originalName)
                              }
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Evidence file unavailable ({file.unavailableReason || "DELETED"})
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {workflow.reviews.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Review History ({workflow.reviews.length})
              </div>
              {workflow.reviews.map((rev) => (
                <div key={rev.id} className="rounded-md border border-border/60 bg-card/60 p-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={rev.decision === "RETURN" ? "destructive" : "secondary"} className="text-[10px]">
                        {rev.decision}
                      </Badge>
                      <span className="font-medium">{rev.reviewerName}</span>
                      {rev.qualityRating != null && (
                        <span className="text-muted-foreground">Rating {rev.qualityRating}/5</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(rev.reviewedAt, effectiveZone)}
                    </span>
                  </div>
                  <p className="text-foreground/90">{rev.feedback}</p>
                  {rev.evidenceSummary && (
                    <p className="text-[11px] text-muted-foreground">Evidence: {rev.evidenceSummary}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {workflow.deadlineRevisions.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Deadline Commitment Revisions ({workflow.deadlineRevisions.length})
              </div>
              {workflow.deadlineRevisions.map((rev) => (
                <div key={rev.id} className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                  <span>Rev #{rev.revisionNo}</span>
                  <span>
                    {formatDateTime(rev.previousDueAt, effectiveZone)} → {formatDateTime(rev.newDueAt, effectiveZone)}
                  </span>
                  {rev.reason && <span>({rev.reason})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <TaskWorkflowDialogs
        openKind={activeDialog}
        onClose={() => setActiveDialog(null)}
        task={task}
        workflow={workflow}
        onSuccess={handleSuccess}
        onVersionConflict={handleSuccess}
      />
    </div>
  );
}
