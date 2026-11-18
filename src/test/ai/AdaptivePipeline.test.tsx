import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { RecommendationCard } from "@/components/ai/RecommendationCard";
import type { RecommendationView } from "@/components/ai/aiChatTypes";
import AdminAdaptiveReportPage from "@/pages/AdminAdaptiveReportPage";
import { aiService } from "@/services/ai.service";
import { adminAdaptiveService } from "@/services/admin.service";
import type { AdaptiveDatasetQualityReport } from "@/types/admin";

describe("P8 Adaptive frontend components", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.restoreAllMocks();
  });

  it("preserves baseline RecommendationCard when snapshotId/taskId are absent", () => {
    const view: RecommendationView = {
      heuristicMode: "BALANCED",
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Nguyen Van A",
          memberStatus: "ACTIVE",
          fitStatus: "MEASURED",
          workloadStatus: "MEASURED",
          performanceStatus: "MEASURED",
          presentationFitValue: 88,
          storedWorkloadValue: 2,
          workloadUnit: "ACTIVE_TASK_COUNT",
          performanceSampleCount: 5,
          evidenceWeight: 0.7,
          observedQualityMean: 0.9,
        },
      ],
    };

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <RecommendationCard view={view} />
      </I18nextProvider>,
    );

    expect(screen.queryByTestId("recommendation-decision-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("decision-action-1")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("101");
  });

  it.each([
    { rank: 1, candidateId: 101, requestType: "ACCEPT", responseType: "ACCEPTED", banner: /accepted recommendation/i },
    { rank: 2, candidateId: 202, requestType: "OVERRIDE", responseType: "OVERRIDDEN", banner: /assigned selected candidate/i },
  ] as const)("commits a versioned $requestType decision without displaying raw IDs", async ({
    rank, candidateId, requestType, responseType, banner,
  }) => {
    const spy = vi.spyOn(aiService, "recordRecommendationDecision").mockResolvedValue({
      decisionId: "dec-1",
      snapshotId: "snap-abc",
      projectId: 10,
      taskId: 55,
      decisionType: responseType,
      selectedCandidateId: candidateId,
      recommendedCandidateId: 101,
      taskVersion: 2,
      assignmentVersion: 1,
      createdAt: "2026-11-19T00:00:00Z",
    });

    const boundView: RecommendationView = {
      snapshotId: "snap-abc",
      taskId: 55,
      taskVersion: 0,
      projectId: 10,
      heuristicMode: "BALANCED",
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Nguyen Van A",
          fitStatus: "MEASURED",
          workloadStatus: "MEASURED",
          performanceStatus: "MEASURED",
        },
        {
          rank: 2,
          candidateId: 202,
          displayName: "Tran Thi B",
          fitStatus: "MEASURED",
          workloadStatus: "MEASURED",
          performanceStatus: "MEASURED",
        },
      ],
    };

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <RecommendationCard view={boundView} />
      </I18nextProvider>,
    );

    expect(container.textContent).not.toContain("snap-abc");
    expect(container.textContent).not.toContain("101");
    expect(container.textContent).not.toContain("202");

    fireEvent.click(screen.getByTestId(`decision-action-${rank}`));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("snap-abc", {
        decisionType: requestType,
        selectedCandidateId: candidateId,
        taskId: 55,
        expectedTaskVersion: 0,
      });
      expect(screen.getByTestId("decision-recorded-banner")).toHaveTextContent(banner);
    });
  });

  it("submits REJECT without selectedCandidateId", async () => {
    const spy = vi.spyOn(aiService, "recordRecommendationDecision").mockResolvedValue({
      decisionId: "dec-2",
      snapshotId: "snap-xyz",
      projectId: 10,
      taskId: 77,
      decisionType: "REJECTED",
      selectedCandidateId: null,
      recommendedCandidateId: 101,
      taskVersion: 1,
      assignmentVersion: 0,
      createdAt: "2026-11-19T00:00:00Z",
    });

    const boundView: RecommendationView = {
      snapshotId: "snap-xyz",
      taskId: 77,
      taskVersion: 1,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Nguyen Van A",
          fitStatus: "MEASURED",
          workloadStatus: "MEASURED",
          performanceStatus: "MEASURED",
        },
      ],
    };

    render(
      <I18nextProvider i18n={i18n}>
        <RecommendationCard view={boundView} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByTestId("decision-reject-btn"));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("snap-xyz", {
        decisionType: "REJECT",
        selectedCandidateId: undefined,
        taskId: 77,
        expectedTaskVersion: 1,
      });
      expect(screen.getByTestId("decision-recorded-banner")).toHaveTextContent(/rejected without assignment/i);
    });
  });

  it("renders AdminAdaptiveReportPage insufficient data warning, hash, counts, and exclusions", async () => {
    const sampleReport: AdaptiveDatasetQualityReport = {
      datasetVersion: "dataset-v2",
      scope: { projectId: 12, managerId: null, heuristicMode: "BALANCED", page: 0, limit: 50 },
      totalOutcomesEvaluated: 5,
      eligibleSamplesCount: 2,
      excludedSamplesCount: 3,
      manualEvidenceCount: 1,
      selfAttestedEvidenceCount: 1,
      rejectedFeedbackCount: 1,
      invalidatedOutcomesCount: 0,
      legacyOutcomeCount: 0,
      syntheticRowsCount: 0,
      pendingJournalCount: 0,
      failedJournalCount: 0,
      exclusionBreakdown: { MANUAL_ASSIGNMENT_NO_DECISION: 1, SELF_ATTESTED_SEPARATED: 1, REJECTED_FEEDBACK_NO_PAIR: 1 },
      canonicalDatasetSha256: "deadbeef1234567890",
      sufficientEvidenceForProposal: false,
      minimumRequiredSamples: 20,
      readinessStatus: "INSUFFICIENT_EVIDENCE",
      readinessMessage: "Only 2 verified samples available; minimum 20 required.",
      generatedAt: "2026-11-19T00:00:00Z",
      sampleRows: [
        {
          rowId: "v2:10",
          snapshotId: "snap-1",
          decisionId: "dec-1",
          taskId: 90,
          projectId: 12,
          managerId: 3,
          heuristicMode: "BALANCED",
          scoringModelVersion: "project-ranking-v1",
          presentationContractVersion: "allowlisted-view-v3",
          weightVersion: "baseline-v1",
          selectedCandidateId: 44,
          recommendedCandidateId: 44,
          decisionType: "ACCEPTED",
          selectedCandidateFit: 0.9,
          selectedCandidateLoad: 1,
          selectedCandidatePerformance: 0.85,
          selectedCandidatePerformanceStatus: "MEASURED",
          candidates: [
            {
              candidateId: 44,
              fit: 0.9,
              load: 1,
              performanceInput: 0.85,
              performanceStatus: "MEASURED",
              recommended: true,
              selected: true,
            },
          ],
          outcomeDiagnostics: {
            outcomeId: "rev-out-10-v1",
            evaluationId: 10,
            evaluationVersion: 1,
            evidenceStatus: "INDEPENDENT_ACCEPTED",
            qualityRating: 4,
            rubricVersion: "quality-v1",
            onTime: true,
            timelinessStatus: "ON_TIME",
            acceptedSubmittedAt: "2026-11-18T10:00:00Z",
            reviewedAt: "2026-11-18T12:00:00Z",
            commitmentDueAt: "2026-11-19T00:00:00Z",
          },
        },
      ],
    };

    const getSpy = vi
      .spyOn(adminAdaptiveService, "getDatasetReport")
      .mockResolvedValue({ data: sampleReport } as never);

    render(
      <I18nextProvider i18n={i18n}>
        <AdminAdaptiveReportPage />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalled();
      expect(screen.getByTestId("adaptive-readiness-banner")).toHaveTextContent(/2 \/ 20/);
      expect(screen.getByTestId("adaptive-dataset-hash")).toHaveTextContent("deadbeef1234567890");
      expect(screen.getByTestId("stat-eligible")).toHaveTextContent("2");
      expect(screen.getByTestId("stat-excluded")).toHaveTextContent("3");
      expect(screen.getByTestId("adaptive-exclusions-list")).toHaveTextContent("MANUAL_ASSIGNMENT_NO_DECISION: 1");
    });

    fireEvent.change(screen.getByTestId("adaptive-project-filter"), { target: { value: "12" } });
    fireEvent.click(screen.getByTestId("adaptive-apply-filters-btn"));

    await waitFor(() => {
      expect(getSpy).toHaveBeenLastCalledWith({
        projectId: 12,
        managerId: undefined,
        mode: undefined,
        page: 0,
        limit: 50,
      });
    });
  });
});
