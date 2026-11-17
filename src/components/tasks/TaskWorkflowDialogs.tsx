import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createRequestId, getApiErrorMessage } from "@/lib/http";
import { hasObservedTaskVersion, isTaskVersionConflictError } from "@/lib/projectTaskDate";
import { projectFilesService } from "@/services/project-files.service";
import { taskService } from "@/services/task.service";
import type { ProjectFile } from "@/types/collab";
import {
  QUALITY_V1_ANCHORS,
  type ReviewDecision,
  type TaskDto,
  type TaskWorkflowHistory,
} from "@/types/task";

export type ActiveWorkflowDialogKind =
  | "submit"
  | "withdraw"
  | "review"
  | "return"
  | "self_attest"
  | "reopen"
  | "supersede"
  | "recover_legacy_review"
  | "create_successor"
  | null;

interface WorkflowDialogsProps {
  openKind: ActiveWorkflowDialogKind;
  onClose: () => void;
  task: TaskDto;
  workflow?: TaskWorkflowHistory | null;
  onSuccess: () => Promise<void> | void;
  onVersionConflict?: () => Promise<void> | void;
}

export function TaskWorkflowDialogs({
  openKind,
  onClose,
  task,
  workflow,
  onSuccess,
  onVersionConflict,
}: WorkflowDialogsProps) {
  const [summary, setSummary] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("ACCEPT");
  const [qualityRating, setQualityRating] = useState<number>(4);
  const [feedback, setFeedback] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [reason, setReason] = useState("");
  const [successorTitle, setSuccessorTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Preserve one idempotency key per open dialog intent; reset only when opening/switching intent.
  const intentRequestIdRef = useRef<string>(createRequestId());
  const lastSignatureRef = useRef<string>("");

  const rubric = workflow?.rubric && workflow.rubric.length > 0 ? workflow.rubric : QUALITY_V1_ANCHORS;
  const activeEvaluation =
    workflow?.evaluations?.find((e) => !e.invalidated) ??
    workflow?.evaluations?.[0] ??
    null;

  useEffect(() => {
    if (!openKind) return;
    const signature = `${openKind}:${task.id}:${task.version}`;
    if (lastSignatureRef.current !== signature) {
      intentRequestIdRef.current = createRequestId();
      lastSignatureRef.current = signature;
    }

    setSummary("");
    setSelectedFileIds([]);
    setFeedback("");
    setEvidenceSummary("");
    setReason("");

    if (openKind === "review") {
      setReviewDecision("ACCEPT");
      setQualityRating(4);
    } else if (openKind === "return") {
      setReviewDecision("RETURN");
    } else if (openKind === "self_attest") {
      setReviewDecision("SELF_ATTEST");
    } else if (openKind === "supersede") {
      setQualityRating(activeEvaluation?.qualityRating ?? 4);
    } else if (openKind === "create_successor") {
      setSuccessorTitle(`Follow-up: ${task.title}`);
    }

    if (openKind === "submit") {
      setFilesLoading(true);
      void projectFilesService
        .getFiles(task.projectId, undefined, 0, 50)
        .then((res) => {
          setProjectFiles(res.data?.content ?? []);
        })
        .catch(() => {
          setProjectFiles([]);
        })
        .finally(() => setFilesLoading(false));
    }
  }, [openKind, task.id, task.version, task.projectId, task.title, activeEvaluation?.qualityRating]);

  const ensureObservedVersion = async (): Promise<boolean> => {
    if (hasObservedTaskVersion(task.version)) {
      return true;
    }
    toast.error("Task version is missing or stale. Refreshing latest task details.");
    if (onVersionConflict) {
      await onVersionConflict();
    }
    onClose();
    return false;
  };

  const handleActionError = async (error: unknown) => {
    toast.error(getApiErrorMessage(error));
    if (isTaskVersionConflictError(error) && onVersionConflict) {
      await onVersionConflict();
      onClose();
    }
  };

  const toggleFile = (fileId: number) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId],
    );
  };

  const handleSubmitTask = async () => {
    if (!(await ensureObservedVersion())) return;
    if (!summary.trim()) {
      toast.error("Submission summary is required.");
      return;
    }
    setSubmitting(true);
    try {
      await taskService.submitTask(
        task.id,
        {
          expectedTaskVersion: task.version,
          summary: summary.trim(),
          evidenceProjectFileIds: selectedFileIds,
        },
        intentRequestIdRef.current,
      );
      toast.success("Task submitted for review.");
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!(await ensureObservedVersion())) return;
    const submissionId = workflow?.currentSubmissionId ?? task.currentSubmissionId;
    if (!submissionId) {
      toast.error("No pending submission found to withdraw.");
      return;
    }
    setSubmitting(true);
    try {
      await taskService.withdrawSubmission(
        task.id,
        {
          submissionId,
          expectedTaskVersion: task.version,
          reason: reason.trim() || undefined,
        },
        intentRequestIdRef.current,
      );
      toast.success("Submission withdrawn. Task returned to In Progress.");
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!(await ensureObservedVersion())) return;
    const submissionId = workflow?.currentSubmissionId ?? task.currentSubmissionId;
    if (!submissionId) {
      toast.error("No pending submission found to review.");
      return;
    }
    if (!feedback.trim()) {
      toast.error(
        reviewDecision === "RETURN"
          ? "Actionable return feedback is required."
          : reviewDecision === "SELF_ATTEST"
            ? "Self-attestation reason is required."
            : "Acceptance rationale is required.",
      );
      return;
    }
    if (reviewDecision === "ACCEPT" && !evidenceSummary.trim()) {
      toast.error("Anchor and evidence verification summary are required.");
      return;
    }

    setSubmitting(true);
    try {
      await taskService.reviewTask(
        task.id,
        {
          submissionId,
          expectedTaskVersion: task.version,
          decision: reviewDecision,
          qualityRating: reviewDecision === "ACCEPT" ? qualityRating : null,
          feedback: feedback.trim(),
          evidenceSummary:
            reviewDecision === "ACCEPT"
              ? evidenceSummary.trim()
              : evidenceSummary.trim() || undefined,
        },
        intentRequestIdRef.current,
      );
      toast.success(
        reviewDecision === "RETURN"
          ? "Task returned to assignee."
          : reviewDecision === "SELF_ATTEST"
            ? "Task marked DONE via self-attestation."
            : "Task accepted and evaluated.",
      );
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!(await ensureObservedVersion())) return;
    if (!reason.trim()) {
      toast.error("Reopen reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      await taskService.reopenTask(
        task.id,
        {
          expectedTaskVersion: task.version,
          reason: reason.trim(),
        },
        intentRequestIdRef.current,
      );
      toast.success("Task reopened and current evaluation invalidated.");
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupersede = async () => {
    if (!(await ensureObservedVersion())) return;
    const submissionId = workflow?.currentSubmissionId ?? task.currentSubmissionId;
    const evaluationId = activeEvaluation?.id ?? workflow?.currentEvaluationId ?? task.currentEvaluationId;
    const evaluationVersion = activeEvaluation?.evaluationVersion ?? 1;

    if (!submissionId || !evaluationId) {
      toast.error("No recorded evaluation available to supersede.");
      return;
    }
    if (!reason.trim() || !evidenceSummary.trim()) {
      toast.error("Both reason and anchor/evidence summary are required.");
      return;
    }
    setSubmitting(true);
    try {
      await taskService.supersedeEvaluation(
        task.id,
        {
          submissionId,
          expectedEvaluationId: evaluationId,
          expectedEvaluationVersion: evaluationVersion,
          expectedTaskVersion: task.version,
          qualityRating,
          reason: reason.trim(),
          evidenceSummary: evidenceSummary.trim(),
        },
        intentRequestIdRef.current,
      );
      toast.success("Evaluation superseded with new quality-v1 version.");
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverLegacyReview = async () => {
    if (!(await ensureObservedVersion())) return;
    if (!reason.trim()) {
      toast.error("Recovery reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      await taskService.recoverLegacyReview(
        task.id,
        {
          expectedTaskVersion: task.version,
          reason: reason.trim(),
        },
        intentRequestIdRef.current,
      );
      toast.success("Legacy REVIEW task returned to In Progress for proper submission.");
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSuccessor = async () => {
    if (!successorTitle.trim()) {
      toast.error("Follow-up task title is required.");
      return;
    }
    setSubmitting(true);
    try {
      await taskService.createSuccessorTask(
        task.id,
        {
          title: successorTitle.trim(),
          description: reason.trim() || undefined,
        },
        intentRequestIdRef.current,
      );
      toast.success("Successor follow-up task created in Backlog without altering closed history.");
      await onSuccess();
      onClose();
    } catch (error) {
      await handleActionError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAnchor = rubric.find((a) => a.rating === qualityRating) ?? rubric[3];

  return (
    <Dialog open={openKind !== null} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        {openKind === "submit" && (
          <>
            <DialogHeader>
              <DialogTitle>Submit Task for Review</DialogTitle>
              <DialogDescription>
                Submitting freezes substantive fields while under review and snapshots your deadline commitment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="workflow-submit-summary">Submission Summary & Verification Notes *</Label>
                <Textarea
                  id="workflow-submit-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe completed work, test results, and verification evidence..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Attach Evidence Files (Same Project)</Label>
                {filesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading project files...</p>
                ) : projectFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No uploaded project files found. You can still submit with text verification notes.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1.5">
                    {projectFiles.map((file) => (
                      <label
                        key={file.id}
                        className="flex items-center gap-2 text-xs cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedFileIds.includes(file.id)}
                          onCheckedChange={() => toggleFile(file.id)}
                        />
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{file.originalName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.max(1, Math.round(file.fileSize / 1024))} KB
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitTask} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit for Review"}
              </Button>
            </DialogFooter>
          </>
        )}

        {openKind === "withdraw" && (
          <>
            <DialogHeader>
              <DialogTitle>Withdraw Pending Submission</DialogTitle>
              <DialogDescription>
                Withdraws your pending submission cleanly without recording a manager return or quality penalty.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="workflow-withdraw-reason">Withdrawal Reason (Optional)</Label>
              <Textarea
                id="workflow-withdraw-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Updating test coverage before review"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleWithdraw} disabled={submitting}>
                {submitting ? "Withdrawing..." : "Withdraw Submission"}
              </Button>
            </DialogFooter>
          </>
        )}

        {(openKind === "review" || openKind === "return" || openKind === "self_attest") && (
          <>
            <DialogHeader>
              <DialogTitle>
                {reviewDecision === "SELF_ATTEST"
                  ? "Self-Attest Completion (Sole Active Manager)"
                  : reviewDecision === "RETURN"
                    ? "Return Submission for Revision"
                    : "Independent Task Review (quality-v1)"}
              </DialogTitle>
              <DialogDescription>
                {reviewDecision === "SELF_ATTEST"
                  ? "Self-attestation is allowed only when no other active manager exists. No numeric rating is recorded and this completion is excluded from measured performance."
                  : "Accept with a quality-v1 rubric rating (1–5) and verification rationale, or return to the assignee with actionable feedback."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {openKind !== "self_attest" && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={reviewDecision === "ACCEPT" ? "default" : "outline"}
                    onClick={() => setReviewDecision("ACCEPT")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Accept & Rate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={reviewDecision === "RETURN" ? "destructive" : "outline"}
                    onClick={() => setReviewDecision("RETURN")}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Return to In Progress
                  </Button>
                </div>
              )}

              {reviewDecision === "SELF_ATTEST" && (
                <div
                  role="note"
                  className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Marked as <strong>SELF_ATTESTED</strong>: no numeric quality score can be entered and this envelope
                    is excluded from measured quality metrics.
                  </span>
                </div>
              )}

              {reviewDecision === "ACCEPT" && (
                <>
                  <div className="space-y-2">
                    <Label>Quality Rating (Rubric {workflow?.rubricVersion ?? "quality-v1"}) *</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {rubric.map((item) => (
                        <Button
                          key={item.rating}
                          type="button"
                          size="sm"
                          variant={qualityRating === item.rating ? "default" : "outline"}
                          onClick={() => setQualityRating(item.rating)}
                          aria-pressed={qualityRating === item.rating}
                        >
                          {item.rating}
                        </Button>
                      ))}
                    </div>
                    {selectedAnchor && (
                      <div className="rounded-md bg-muted/50 border border-border/60 p-2.5 text-xs">
                        <div className="font-semibold">{selectedAnchor.label}</div>
                        <p className="text-muted-foreground mt-0.5">{selectedAnchor.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflow-review-evidence">Anchor & Evidence Verification Summary *</Label>
                    <Textarea
                      id="workflow-review-evidence"
                      value={evidenceSummary}
                      onChange={(e) => setEvidenceSummary(e.target.value)}
                      placeholder="Reference verified evidence files, test outputs, or edge-case checks..."
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="workflow-review-feedback">
                  {reviewDecision === "RETURN"
                    ? "Actionable Return Feedback *"
                    : reviewDecision === "SELF_ATTEST"
                      ? "Self-Attestation Reason *"
                      : "Acceptance Rationale *"}
                </Label>
                <Textarea
                  id="workflow-review-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    reviewDecision === "RETURN"
                      ? "Specify what must be corrected before resubmission..."
                      : "Explain why the deliverable meets agreed acceptance criteria..."
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant={reviewDecision === "RETURN" ? "destructive" : "default"}
                onClick={handleReviewSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : reviewDecision === "RETURN"
                    ? "Return Submission"
                    : reviewDecision === "SELF_ATTEST"
                      ? "Confirm Self-Attestation"
                      : "Accept & Save Evaluation"}
              </Button>
            </DialogFooter>
          </>
        )}

        {openKind === "reopen" && (
          <>
            <DialogHeader>
              <DialogTitle>Reopen Completed Task</DialogTitle>
              <DialogDescription>
                Invalidates the current completion evaluation (preserving immutable history), clears completion pointers,
                and revalidates whether the current assignee is still an active project member.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="workflow-reopen-reason">Reopen Reason *</Label>
              <Textarea
                id="workflow-reopen-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this task is being reopened..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReopen} disabled={submitting}>
                {submitting ? "Reopening..." : "Confirm Reopen"}
              </Button>
            </DialogFooter>
          </>
        )}

        {openKind === "supersede" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {activeEvaluation?.evidenceStatus === "SELF_ATTESTED"
                  ? "Record Independent Review (Supersede Self-Attestation)"
                  : "Supersede Quality Evaluation"}
              </DialogTitle>
              <DialogDescription>
                Appends a new evaluation version on the same immutable accepted submission while preserving original
                submitted/due/on-time timestamps and original completion time.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>New Quality Rating (quality-v1) *</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {rubric.map((item) => (
                    <Button
                      key={item.rating}
                      type="button"
                      size="sm"
                      variant={qualityRating === item.rating ? "default" : "outline"}
                      onClick={() => setQualityRating(item.rating)}
                    >
                      {item.rating}
                    </Button>
                  ))}
                </div>
                {selectedAnchor && (
                  <div className="rounded-md bg-muted/50 border border-border/60 p-2.5 text-xs">
                    <div className="font-semibold">{selectedAnchor.label}</div>
                    <p className="text-muted-foreground mt-0.5">{selectedAnchor.description}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-supersede-reason">Correction / Review Reason *</Label>
                <Textarea
                  id="workflow-supersede-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the audited rating correction or independent verification..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-supersede-evidence">Anchor & Evidence Summary *</Label>
                <Textarea
                  id="workflow-supersede-evidence"
                  value={evidenceSummary}
                  onChange={(e) => setEvidenceSummary(e.target.value)}
                  placeholder="Reference the verified evidence supporting the new rating..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSupersede} disabled={submitting}>
                {submitting ? "Superseding..." : "Supersede Evaluation"}
              </Button>
            </DialogFooter>
          </>
        )}

        {openKind === "recover_legacy_review" && (
          <>
            <DialogHeader>
              <DialogTitle>Recover Legacy REVIEW Task</DialogTitle>
              <DialogDescription>
                This task entered REVIEW before workflow submissions were recorded. Recovering returns it to In
                Progress so the assignee can submit genuine evidence without fabricating history.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div
                role="alert"
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>No submission record exists for this legacy REVIEW state.</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-recover-reason">Recovery Reason *</Label>
                <Textarea
                  id="workflow-recover-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Moving legacy REVIEW task to In Progress for verified resubmission"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleRecoverLegacyReview} disabled={submitting}>
                {submitting ? "Recovering..." : "Return to In Progress"}
              </Button>
            </DialogFooter>
          </>
        )}

        {openKind === "create_successor" && (
          <>
            <DialogHeader>
              <DialogTitle>Create Follow-up / Successor Task</DialogTitle>
              <DialogDescription>
                Creates a new linked task in Backlog for later defects or follow-up work while leaving this task&apos;s
                completed evaluation and sprint closure snapshot untouched.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="workflow-successor-title">Follow-up Title *</Label>
                <Input
                  id="workflow-successor-title"
                  value={successorTitle}
                  onChange={(e) => setSuccessorTitle(e.target.value)}
                  placeholder="Follow-up: fix edge case"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-successor-desc">Details / Context (Optional)</Label>
                <Textarea
                  id="workflow-successor-desc"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the defect or follow-up scope..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreateSuccessor} disabled={submitting}>
                {submitting ? "Creating..." : "Create Follow-up Task"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
