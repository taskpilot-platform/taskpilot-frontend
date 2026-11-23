import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminAdaptiveService } from "@/services/admin.service";
import { getApiErrorMessage } from "@/lib/http";
import type { AdaptiveDatasetQualityReport } from "@/types/admin";

const MODE_OPTIONS = ["", "BALANCED", "URGENT", "TRAINING"] as const;

export default function AdminAdaptiveReportPage() {
  const { t } = useTranslation();
  const [projectIdInput, setProjectIdInput] = useState("");
  const [managerIdInput, setManagerIdInput] = useState("");
  const [modeInput, setModeInput] = useState("");
  const [limitInput, setLimitInput] = useState("50");
  const [report, setReport] = useState<AdaptiveDatasetQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsedProject = projectIdInput.trim() ? Number(projectIdInput.trim()) : undefined;
      const parsedManager = managerIdInput.trim() ? Number(managerIdInput.trim()) : undefined;
      const parsedLimit = limitInput.trim() ? Math.max(1, Math.min(200, Number(limitInput.trim()) || 50)) : 50;

      const res = await adminAdaptiveService.getDatasetReport({
        projectId: Number.isFinite(parsedProject) ? parsedProject : undefined,
        managerId: Number.isFinite(parsedManager) ? parsedManager : undefined,
        mode: modeInput || undefined,
        page: 0,
        limit: parsedLimit,
      });
      setReport(res.data);
    } catch (err) {
      const msg = getApiErrorMessage(err) || t("admin.adaptive.load_error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectIdInput, managerIdInput, modeInput, limitInput, t]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleReplay = async () => {
    setReplaying(true);
    try {
      const res = await adminAdaptiveService.replayDueJournalEntries(50);
      toast.success(
        t("admin.adaptive.replay_done", {
          replayed: res.data.replayedCount,
          pending: res.data.pendingCount,
          failed: res.data.failedCount,
        }),
      );
      await loadReport();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t("admin.adaptive.load_error"));
    } finally {
      setReplaying(false);
    }
  };

  const exclusionEntries = report ? Object.entries(report.exclusionBreakdown ?? {}) : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>{t("admin.adaptive.title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.adaptive.desc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReplay}
            disabled={replaying}
            data-testid="adaptive-replay-btn"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            {replaying ? t("admin.adaptive.replaying") : t("admin.adaptive.replay_journal")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={loadReport}
            disabled={loading}
            data-testid="adaptive-refresh-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {t("admin.adaptive.refresh")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              loadReport();
            }}
          >
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("admin.adaptive.project_filter")}
              </label>
              <Input
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="e.g. 12"
                data-testid="adaptive-project-filter"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("admin.adaptive.manager_filter")}
              </label>
              <Input
                value={managerIdInput}
                onChange={(e) => setManagerIdInput(e.target.value)}
                placeholder="e.g. 3"
                data-testid="adaptive-manager-filter"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("admin.adaptive.mode_filter")}
              </label>
              <select
                value={modeInput}
                onChange={(e) => setModeInput(e.target.value)}
                data-testid="adaptive-mode-filter"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {MODE_OPTIONS.map((mode) => (
                  <option key={mode || "ALL"} value={mode}>
                    {mode || "ALL"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("admin.adaptive.limit_filter")}
              </label>
              <Input
                type="number"
                min={1}
                max={200}
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                data-testid="adaptive-limit-filter"
              />
            </div>
            <Button type="submit" variant="secondary" data-testid="adaptive-apply-filters-btn">
              {t("admin.adaptive.apply_filters")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div
          data-testid="adaptive-error-banner"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Readiness Banner */}
          <div
            data-testid="adaptive-readiness-banner"
            className={`rounded-lg border px-4 py-3 flex items-start gap-3 text-sm ${
              report.sufficientEvidenceForProposal
                ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            }`}
          >
            {report.sufficientEvidenceForProposal ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            )}
            <div className="space-y-1">
              <div className="font-semibold">
                {t(readinessBannerKey(report), {
                  eligible: report.eligibleSamplesCount,
                  required: report.minimumRequiredSamples,
                })}
              </div>
              {report.readinessMessage && <p className="text-xs opacity-90">{report.readinessMessage}</p>}
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={t("admin.adaptive.stat_evaluated")} value={report.totalOutcomesEvaluated} testId="stat-evaluated" />
            <StatCard label={t("admin.adaptive.stat_eligible")} value={report.eligibleSamplesCount} testId="stat-eligible" />
            <StatCard label={t("admin.adaptive.stat_excluded")} value={report.excludedSamplesCount} testId="stat-excluded" />
            <StatCard label={t("admin.adaptive.stat_manual")} value={report.manualEvidenceCount} testId="stat-manual" />
            <StatCard label={t("admin.adaptive.stat_self_attested")} value={report.selfAttestedEvidenceCount} testId="stat-self-attested" />
            <StatCard label={t("admin.adaptive.stat_rejected")} value={report.rejectedFeedbackCount} testId="stat-rejected" />
            <StatCard label={t("admin.adaptive.stat_invalidated")} value={report.invalidatedOutcomesCount} testId="stat-invalidated" />
            <StatCard
              label={t("admin.adaptive.stat_journal")}
              value={`${report.pendingJournalCount} / ${report.failedJournalCount}`}
              testId="stat-journal"
            />
          </div>

          {/* Dataset Provenance & Exclusion Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("admin.adaptive.dataset_hash")}</CardTitle>
                <CardDescription>
                  {t("admin.adaptive.dataset_version")}: <code>{report.datasetVersion}</code> · {t("admin.adaptive.stat_legacy_synthetic")}:{" "}
                  {report.legacyOutcomeCount} / {report.syntheticRowsCount}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div
                  data-testid="adaptive-dataset-hash"
                  className="font-mono break-all rounded bg-muted p-2.5 text-[11px]"
                >
                  {report.canonicalDatasetSha256 ?? "—"}
                </div>
                <div className="text-muted-foreground">
                  {t("admin.adaptive.scope_summary")}:{" "}
                  <code>
                    project={report.scope.projectId ?? "ALL"}, manager={report.scope.managerId ?? "ALL"}, mode=
                    {report.scope.heuristicMode ?? "ALL"}, limit={report.scope.limit}
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("admin.adaptive.exclusions_title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {exclusionEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("admin.adaptive.no_exclusions")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2" data-testid="adaptive-exclusions-list">
                    {exclusionEntries.map(([reason, count]) => (
                      <Badge key={reason} variant="secondary" className="font-mono text-xs">
                        {reason}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bounded Sample Rows */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("admin.adaptive.rows_title")} ({report.sampleRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.sampleRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("admin.adaptive.no_rows")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3">{t("admin.adaptive.col_decision")}</th>
                        <th className="py-2 pr-3">{t("admin.adaptive.col_mode")}</th>
                        <th className="py-2 pr-3">{t("admin.adaptive.col_outcome")}</th>
                        <th className="py-2 pr-3">{t("admin.adaptive.col_eligibility")}</th>
                        <th className="py-2">{t("admin.adaptive.col_exclusion")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sampleRows.map((row) => (
                        <tr key={row.rowId} className="border-b last:border-b-0">
                          <td className="py-2 pr-3 font-mono">
                            <div>{row.decisionType ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {row.scoringModelVersion ?? "—"} · {row.candidates.length} candidates
                            </div>
                          </td>
                          <td className="py-2 pr-3">{row.heuristicMode ?? "—"}</td>
                          <td className="py-2 pr-3">
                            {row.outcomeDiagnostics ? (
                              <span>
                                {row.outcomeDiagnostics.evidenceStatus ?? "—"} · Q=
                                {row.outcomeDiagnostics.qualityRating ?? "—"}{" "}
                                {row.outcomeDiagnostics.timelinessStatus
                                  ? `(${row.outcomeDiagnostics.timelinessStatus})`
                                  : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="default">ELIGIBLE</Badge>
                          </td>
                          <td className="py-2 font-mono">{row.weightVersion ?? "NONE"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function readinessBannerKey(report: AdaptiveDatasetQualityReport) {
  switch (report.readinessStatus) {
    case "SCOPE_REQUIRED":
      return "admin.adaptive.scope_required_banner";
    case "DATASET_LIMIT_REACHED":
      return "admin.adaptive.dataset_limit_banner";
    case "READY_FOR_PROPOSAL":
      return "admin.adaptive.sufficient_banner";
    default:
      return "admin.adaptive.insufficient_banner";
  }
}

function StatCard({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-xl font-bold mt-1" data-testid={testId}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
