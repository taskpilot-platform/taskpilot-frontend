import { useState } from "react";
import { Sparkles, AlertCircle, Info, ChevronDown, ChevronUp, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RecommendationView, RecommendedCandidateView } from "./aiChatTypes";

export function RecommendationCard({ view }: { view: RecommendationView }) {
  const { t } = useTranslation();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const isTied = view.differentiationStatus === "INSUFFICIENT_TO_DIFFERENTIATE";

  return (
    <div
      data-testid="recommendation-card"
      className="my-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden text-neutral-800 dark:text-neutral-200 font-sans"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t("copilot.recommendation.title")}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {view.heuristicMode && (
            <span
              data-testid="heuristic-mode-badge"
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50"
            >
              {t("copilot.recommendation.heuristic_mode", { mode: view.heuristicMode })}
            </span>
          )}
          {view.requiredSkills && view.requiredSkills.length > 0 && (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {t("copilot.recommendation.required_skills", { skills: view.requiredSkills.join(", ") })}
            </span>
          )}
        </div>
      </div>

      {/* Differentiation Status Notice */}
      {isTied && (
        <div
          data-testid="differentiation-alert"
          className="mx-4 mt-3 px-3 py-2.5 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 leading-relaxed"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <span>
            <strong>{t("copilot.recommendation.differentiation_alert_title")}</strong>{" "}
            {t("copilot.recommendation.differentiation_alert_desc")}
          </span>
        </div>
      )}

      {/* AI Explanation Banner */}
      {view.aiExplanation && (
        <div
          data-testid="ai-explanation"
          className="mx-4 mt-3 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed"
        >
          <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-300 mb-1">
            <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {t("copilot.recommendation.ai_explanation_label")}
          </div>
          <p className="whitespace-pre-line">{view.aiExplanation}</p>
        </div>
      )}

      {/* Candidates List */}
      <div className="p-4 space-y-3">
        {view.candidates && view.candidates.length > 0 ? (
          view.candidates.map((candidate) => (
            <CandidateRow key={candidate.rank} candidate={candidate} />
          ))
        ) : (
          <div className="text-center py-4 text-xs text-neutral-500">
            {t("copilot.recommendation.empty")}
          </div>
        )}
      </div>

      {/* Technical Details (Collapsible) */}
      {(view.presentationContractVersion || view.scoringModelVersion) && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2 bg-neutral-50/30 dark:bg-neutral-900/30 text-[11px] text-neutral-500">
          <button
            type="button"
            data-testid="technical-details-toggle"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            <span>{t("copilot.recommendation.technical_details_toggle")}</span>
            {showTechnicalDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {showTechnicalDetails && (
            <div data-testid="technical-details-content" className="mt-2 space-y-1 font-mono text-[10px]">
              {view.presentationContractVersion && (
                <div>{t("copilot.recommendation.technical_contract_version", { version: view.presentationContractVersion })}</div>
              )}
              {view.scoringModelVersion && (
                <div>{t("copilot.recommendation.technical_scoring_version", { version: view.scoringModelVersion })}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: RecommendedCandidateView }) {
  const { t } = useTranslation();
  const rankColors: Record<number, string> = {
    1: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    2: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    3: "bg-amber-700/10 text-amber-800 dark:text-amber-500 border-amber-700/30",
  };
  const rankBadgeStyle = rankColors[candidate.rank] ?? "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";

  return (
    <div
      data-testid={`candidate-row-${candidate.rank}`}
      className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors bg-white dark:bg-neutral-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      {/* Candidate identity & status */}
      <div className="flex items-center gap-3">
        <span
          data-testid="candidate-rank"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${rankBadgeStyle}`}
        >
          #{candidate.rank}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-neutral-400" />
            <span data-testid="candidate-name" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {candidate.displayName}
            </span>
            {candidate.memberStatus && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-mono">
                {candidate.memberStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {/* Skill Fit */}
        <div data-testid="metric-fit" className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-medium">{t("copilot.recommendation.skill_fit_label")}</span>
          {candidate.fitStatus === "MEASURED" && candidate.presentationFitValue !== null && candidate.presentationFitValue !== undefined ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {t("copilot.recommendation.skill_fit_measured", { percent: Math.round(candidate.presentationFitValue * 100) })}
            </span>
          ) : (
            <span className="font-medium text-neutral-500 dark:text-neutral-400">
              {t("copilot.recommendation.skill_fit_insufficient")}
            </span>
          )}
        </div>

        {/* Workload */}
        <div data-testid="metric-workload" className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-medium">{t("copilot.recommendation.workload_label")}</span>
          {candidate.workloadStatus === "MEASURED" && candidate.workloadUnit === "ACTIVE_TASK_COUNT" ? (
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {t("copilot.recommendation.active_task_count", { count: candidate.storedWorkloadValue ?? 0 })}
            </span>
          ) : (
            <span className="font-medium text-neutral-600 dark:text-neutral-300">
              {t("copilot.recommendation.unverified_workload_value", { value: candidate.storedWorkloadValue ?? "—" })}{" "}
              <span className="text-[10px] text-neutral-400 block sm:inline">
                {t("copilot.recommendation.unverified_workload_explanation")}
              </span>
            </span>
          )}
        </div>

        {/* Performance */}
        <div data-testid="metric-performance" className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-medium">{t("copilot.recommendation.performance_label")}</span>
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            <span className="text-[10px] text-neutral-400">
              {t("copilot.recommendation.performance_unavailable")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
