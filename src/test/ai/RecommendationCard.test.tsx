import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import i18n from "@/lib/i18n";
import { RecommendationCard } from "@/components/ai/RecommendationCard";
import { formatFriendlyToolPayload, isRecommendationView } from "@/components/ai/aiChatHelpers";
import type { RecommendationView } from "@/components/ai/aiChatTypes";

describe("Phase 1 B3: Frontend Recommendation View Contract", () => {
  const sampleView: RecommendationView = {
    projectId: 42,
    requiredSkills: ["Java", "Spring Boot"],
    heuristicMode: "BALANCED",
    presentationContractVersion: "allowlisted-view-v1",
    scoringModelVersion: "relative-rounded-v1",
    differentiationStatus: "DIFFERENTIATED",
    aiExplanation: "Alice là ứng viên phù hợp nhất dựa trên kỹ năng.",
    candidates: [
      {
        rank: 1,
        candidateId: 101,
        displayName: "Alice Developer",
        presentationFitValue: 0.85,
        fitStatus: "MEASURED",
        storedWorkloadValue: 20,
        workloadStatus: "UNVERIFIED",
        performanceStatus: "DEFAULT",
        memberStatus: "AVAILABLE",
      },
      {
        rank: 2,
        candidateId: 102,
        displayName: "Bob Engineer",
        presentationFitValue: null,
        fitStatus: "INSUFFICIENT_DATA",
        storedWorkloadValue: null,
        workloadStatus: "UNVERIFIED",
        performanceStatus: "DEFAULT",
        memberStatus: "AVAILABLE",
      },
    ],
  };

  beforeEach(async () => {
    await i18n.changeLanguage("vi");
  });

  afterAll(async () => {
    await i18n.changeLanguage("vi");
  });

  it("renders dedicated card with candidate names, ranks, and heuristic mode", () => {
    render(<RecommendationCard view={sampleView} />);

    expect(screen.getByText("Đề xuất phân công ứng viên")).toBeInTheDocument();
    expect(screen.getByTestId("heuristic-mode-badge")).toHaveTextContent("BALANCED");
    expect(screen.getByText("Alice Developer")).toBeInTheDocument();
    expect(screen.getByText("Bob Engineer")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("strictly hides internal IDs (candidateId, userId, projectId) and raw enum codes from user-facing text", () => {
    const { container } = render(<RecommendationCard view={sampleView} />);

    // 101, 102, 42 should not appear as visible identifiers in text
    expect(container.textContent).not.toMatch(/\b101\b/);
    expect(container.textContent).not.toMatch(/\b102\b/);
    expect(container.textContent).not.toMatch(/\bcandidateId\b/i);
    expect(container.textContent).not.toMatch(/\buserId\b/i);
    expect(container.textContent).not.toMatch(/\bprojectId\b/i);
    expect(container.textContent).not.toMatch(/\bACTIVE_TASK_COUNT\b/);
    expect(container.textContent).not.toMatch(/\bINSUFFICIENT_DATA\b/);
    expect(container.textContent).not.toMatch(/\bINSUFFICIENT_TO_DIFFERENTIATE\b/);
  });

  it("strictly omits forbidden fields (email, confidenceScore, totalScore)", () => {
    const { container } = render(<RecommendationCard view={sampleView} />);

    expect(container.textContent).not.toMatch(/totalScore/i);
    expect(container.textContent).not.toMatch(/confidenceScore/i);
    expect(container.textContent).not.toMatch(/email/i);
  });

  it("correctly renders MEASURED fit with percentage and INSUFFICIENT_DATA with warning", () => {
    render(<RecommendationCard view={sampleView} />);

    // Candidate 1: MEASURED 0.85 -> 85% (Đã đo lường)
    expect(screen.getByText(/85%/)).toBeInTheDocument();
    expect(screen.getByText(/\(Đã đo lường\)/)).toBeInTheDocument();

    // Candidate 2: INSUFFICIENT_DATA -> Chưa đủ dữ liệu kỹ năng
    expect(screen.getByText("Chưa đủ dữ liệu kỹ năng")).toBeInTheDocument();
  });

  it("renders approved Vietnamese wording for UNVERIFIED workload and DEFAULT performance", () => {
    render(<RecommendationCard view={sampleView} />);

    // UNVERIFIED workload approved wording
    expect(screen.getAllByText(/\(Chưa có dữ liệu workload đáng tin cậy\)/).length).toBeGreaterThanOrEqual(1);

    // DEFAULT performance approved wording
    expect(screen.getAllByText("Chưa đủ dữ liệu hiệu suất").length).toBeGreaterThanOrEqual(2);
  });

  it("displays differentiation alert banner when INSUFFICIENT_TO_DIFFERENTIATE", () => {
    const tiedView: RecommendationView = {
      ...sampleView,
      differentiationStatus: "INSUFFICIENT_TO_DIFFERENTIATE",
    };

    render(<RecommendationCard view={tiedView} />);

    const alert = screen.getByTestId("differentiation-alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain("Dữ liệu hiện tại không đủ để phân biệt mức độ vượt trội");
  });

  it("provides collapsible technical details with presentationContractVersion and scoringModelVersion", () => {
    render(<RecommendationCard view={sampleView} />);

    const toggle = screen.getByTestId("technical-details-toggle");
    expect(toggle).toBeInTheDocument();
    expect(screen.queryByTestId("technical-details-content")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    const content = screen.getByTestId("technical-details-content");
    expect(content).toBeInTheDocument();
    expect(content.textContent).toContain("allowlisted-view-v1");
    expect(content.textContent).toContain("relative-rounded-v1");
  });

  it("formatFriendlyToolPayload formats RecommendationView cleanly without raw JSON", () => {
    const jsonString = JSON.stringify(sampleView);
    expect(isRecommendationView(JSON.parse(jsonString))).toBe(true);

    const formatted = formatFriendlyToolPayload(jsonString);

    expect(formatted).not.toBeNull();
    // Must contain human-readable sections
    expect(formatted).toContain("### Đề xuất phân công ứng viên");
    expect(formatted).toContain("Alice Developer");
    expect(formatted).toContain("85% (Đã đo lường)");
    expect(formatted).toContain("Chưa có dữ liệu workload đáng tin cậy");
    expect(formatted).toContain("Chưa đủ dữ liệu hiệu suất");
    // Must NOT contain raw JSON syntax
    expect(formatted).not.toContain('{"rank":');
    expect(formatted).not.toContain('"candidateId":');
    expect(formatted).not.toContain('"fitStatus":');
  });

  it("renders canonical backend cross-repo fixture phase1-recommendation-view.json cleanly in both locales", async () => {
    const fixture = await import("../fixtures/phase1-recommendation-view.json");
    const canonicalView = fixture.default as unknown as RecommendationView;

    expect(canonicalView.presentationContractVersion).toBe("allowlisted-view-v2");
    expect(canonicalView.scoringModelVersion).toBe("relative-neutral-fixed-point-v2");
    expect(canonicalView.differentiationStatus).toBe("DIFFERENTIATED");

    // Test Vietnamese locale
    await i18n.changeLanguage("vi");
    const { unmount } = render(<RecommendationCard view={canonicalView} />);

    expect(screen.getByText("Alice Engineer")).toBeInTheDocument();
    expect(screen.getByText("Bob Developer")).toBeInTheDocument();
    expect(screen.getByText(/Số công việc đang hoạt động: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Giá trị workload đã lưu: 45/)).toBeInTheDocument();
    expect(screen.getByText("Đề xuất phân công ứng viên")).toBeInTheDocument();
    unmount();

    // Test English locale
    await i18n.changeLanguage("en");
    render(<RecommendationCard view={canonicalView} />);

    expect(screen.getByText("Alice Engineer")).toBeInTheDocument();
    expect(screen.getByText("Bob Developer")).toBeInTheDocument();
    expect(screen.getByText(/Active assigned tasks: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Stored workload value: 45/)).toBeInTheDocument();
    expect(screen.getByText("Candidate Recommendation")).toBeInTheDocument();
  });

  it("renders measured active task count for MEASURED workload without percent or capacity language", () => {
    const measuredView: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.85,
          fitStatus: "MEASURED",
          storedWorkloadValue: 3,
          workloadStatus: "MEASURED",
          workloadUnit: "ACTIVE_TASK_COUNT",
          workloadScope: "PROJECT",
          workloadMeasuredAt: "2026-10-10T12:00:00Z",
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    render(<RecommendationCard view={measuredView} />);

    const workloadSection = screen.getByTestId("metric-workload");
    expect(workloadSection).toBeInTheDocument();
    expect(workloadSection.textContent).toContain("Số công việc đang hoạt động: 3");
    expect(workloadSection.textContent).not.toContain("%");
    expect(workloadSection.textContent).not.toContain("capacity");
    expect(workloadSection.textContent).not.toContain("công suất");
    expect(workloadSection.textContent).not.toContain("tải");
    expect(workloadSection.textContent).not.toContain("Chưa có dữ liệu workload đáng tin cậy");
  });

  it("resolves active-task label through i18n with proper count interpolation in both locales", async () => {
    const viewWithCount: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.9,
          fitStatus: "MEASURED",
          storedWorkloadValue: 4,
          workloadStatus: "MEASURED",
          workloadUnit: "ACTIVE_TASK_COUNT",
          workloadScope: "PROJECT",
          workloadMeasuredAt: "2026-10-10T12:00:00Z",
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    await i18n.changeLanguage("vi");
    const { unmount } = render(<RecommendationCard view={viewWithCount} />);
    expect(screen.getByText("Số công việc đang hoạt động: 4")).toBeInTheDocument();
    unmount();

    await i18n.changeLanguage("en");
    render(<RecommendationCard view={viewWithCount} />);
    expect(screen.getByText("Active assigned tasks: 4")).toBeInTheDocument();
  });

  it("falls back to unverified workload text if workloadStatus is MEASURED but workloadUnit is missing", () => {
    const missingUnitView: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.85,
          fitStatus: "MEASURED",
          storedWorkloadValue: 5,
          workloadStatus: "MEASURED",
          // workloadUnit is missing / undefined
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    render(<RecommendationCard view={missingUnitView} />);

    const workloadSection = screen.getByTestId("metric-workload");
    expect(workloadSection).toBeInTheDocument();
    expect(workloadSection.textContent).not.toContain("Số công việc đang hoạt động: 5");
    expect(workloadSection.textContent).toContain("Giá trị workload đã lưu: 5");
    expect(workloadSection.textContent).toContain("Chưa có dữ liệu workload đáng tin cậy");
    expect(workloadSection.textContent).not.toContain("điểm");
    expect(workloadSection.textContent).not.toContain("points");

    const formatted = formatFriendlyToolPayload(JSON.stringify(missingUnitView));
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain("Số công việc đang hoạt động: 5");
    expect(formatted).toContain("Giá trị workload đã lưu: 5 (Chưa có dữ liệu workload đáng tin cậy)");
    expect(formatted).not.toContain("điểm");
    expect(formatted).not.toContain("points");
  });

  it("uses translated generic/unverified wording when workloadUnit is unknown", async () => {
    const unknownUnitView: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.85,
          fitStatus: "MEASURED",
          storedWorkloadValue: 7,
          workloadStatus: "MEASURED",
          workloadUnit: "UNKNOWN_CUSTOM_UNIT",
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    // In Vietnamese
    await i18n.changeLanguage("vi");
    const { unmount } = render(<RecommendationCard view={unknownUnitView} />);

    const workloadSectionVi = screen.getByTestId("metric-workload");
    expect(workloadSectionVi).toBeInTheDocument();
    expect(workloadSectionVi.textContent).not.toContain("Số công việc đang hoạt động");
    expect(workloadSectionVi.textContent).not.toContain("Active assigned tasks");
    expect(workloadSectionVi.textContent).toContain("Giá trị workload đã lưu: 7");
    expect(workloadSectionVi.textContent).toContain("Chưa có dữ liệu workload đáng tin cậy");
    expect(workloadSectionVi.textContent).not.toContain("điểm");
    expect(workloadSectionVi.textContent).not.toContain("points");
    unmount();

    // In English
    await i18n.changeLanguage("en");
    render(<RecommendationCard view={unknownUnitView} />);

    const workloadSectionEn = screen.getByTestId("metric-workload");
    expect(workloadSectionEn).toBeInTheDocument();
    expect(workloadSectionEn.textContent).not.toContain("Active assigned tasks");
    expect(workloadSectionEn.textContent).toContain("Stored workload value: 7");
    expect(workloadSectionEn.textContent).toContain("No reliable workload data available");
    expect(workloadSectionEn.textContent).not.toContain("points");
    expect(workloadSectionEn.textContent).not.toContain("điểm");
  });

  it("renders strictly unit-neutral UNVERIFIED workload in both Vietnamese and English without forbidden wording", async () => {
    const unverifiedView: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.85,
          fitStatus: "MEASURED",
          storedWorkloadValue: 15,
          workloadStatus: "UNVERIFIED",
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    // Vietnamese test
    await i18n.changeLanguage("vi");
    const { unmount } = render(<RecommendationCard view={unverifiedView} />);
    const workloadVi = screen.getByTestId("metric-workload");

    // Stored workload value remains visible without a claimed unit
    expect(workloadVi.textContent).toContain("Giá trị workload đã lưu: 15");
    // Explanation remains visible
    expect(workloadVi.textContent).toContain("(Chưa có dữ liệu workload đáng tin cậy)");
    // Forbidden wording checks in Vietnamese
    expect(workloadVi.textContent).not.toContain("điểm");
    expect(workloadVi.textContent).not.toContain("points");
    expect(workloadVi.textContent).not.toContain("tasks");
    expect(workloadVi.textContent).not.toContain("%");
    expect(workloadVi.textContent).not.toContain("capacity");
    expect(workloadVi.textContent).not.toContain("availability");
    expect(workloadVi.textContent).not.toContain("idle");
    expect(workloadVi.textContent).not.toContain("free");
    expect(workloadVi.textContent).not.toContain("công suất");
    expect(workloadVi.textContent).not.toContain("khả dụng");

    // formatFriendlyToolPayload in Vietnamese
    const payloadVi = formatFriendlyToolPayload(JSON.stringify(unverifiedView));
    expect(payloadVi).toContain("Giá trị workload đã lưu: 15 (Chưa có dữ liệu workload đáng tin cậy)");
    expect(payloadVi).not.toContain("điểm");
    expect(payloadVi).not.toContain("points");
    unmount();

    // English test
    await i18n.changeLanguage("en");
    render(<RecommendationCard view={unverifiedView} />);
    const workloadEn = screen.getByTestId("metric-workload");

    // Stored workload value remains visible without a claimed unit
    expect(workloadEn.textContent).toContain("Stored workload value: 15");
    // Explanation remains visible
    expect(workloadEn.textContent).toContain("(No reliable workload data available)");
    // Forbidden wording checks in English
    expect(workloadEn.textContent).not.toContain("points");
    expect(workloadEn.textContent).not.toContain("điểm");
    expect(workloadEn.textContent).not.toContain("tasks");
    expect(workloadEn.textContent).not.toContain("%");
    expect(workloadEn.textContent).not.toContain("capacity");
    expect(workloadEn.textContent).not.toContain("availability");
    expect(workloadEn.textContent).not.toContain("idle");
    expect(workloadEn.textContent).not.toContain("free");

    // formatFriendlyToolPayload in English
    const payloadEn = formatFriendlyToolPayload(JSON.stringify(unverifiedView));
    expect(payloadEn).toContain("Stored workload value: 15 (No reliable workload data available)");
    expect(payloadEn).not.toContain("points");
    expect(payloadEn).not.toContain("điểm");
  });

  it("renders corresponding translations when switching between vi and en locales", async () => {
    const measuredView: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.85,
          fitStatus: "MEASURED",
          storedWorkloadValue: 3,
          workloadStatus: "MEASURED",
          workloadUnit: "ACTIVE_TASK_COUNT",
          workloadScope: "PROJECT",
          workloadMeasuredAt: "2026-10-10T12:00:00Z",
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    // Vietnamese
    await i18n.changeLanguage("vi");
    const { unmount } = render(<RecommendationCard view={measuredView} />);

    expect(screen.getByText("Đề xuất phân công ứng viên")).toBeInTheDocument();
    expect(screen.getByText("Phù hợp kỹ năng")).toBeInTheDocument();
    expect(screen.getByText("Khối lượng công việc")).toBeInTheDocument();
    expect(screen.getByText("Hiệu suất")).toBeInTheDocument();
    expect(screen.getByText("Số công việc đang hoạt động: 3")).toBeInTheDocument();
    expect(screen.getByText("85% (Đã đo lường)")).toBeInTheDocument();
    unmount();

    // English
    await i18n.changeLanguage("en");
    render(<RecommendationCard view={measuredView} />);

    expect(screen.getByText("Candidate Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Skill Fit")).toBeInTheDocument();
    expect(screen.getByText("Workload")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Active assigned tasks: 3")).toBeInTheDocument();
    expect(screen.getByText("85% (Measured)")).toBeInTheDocument();
  });

  it("formatFriendlyToolPayload formats MEASURED workload count correctly in both locales", async () => {
    const measuredView: RecommendationView = {
      ...sampleView,
      candidates: [
        {
          rank: 1,
          candidateId: 101,
          displayName: "Alice Developer",
          presentationFitValue: 0.85,
          fitStatus: "MEASURED",
          storedWorkloadValue: 2,
          workloadStatus: "MEASURED",
          workloadUnit: "ACTIVE_TASK_COUNT",
          workloadScope: "PROJECT",
          workloadMeasuredAt: "2026-10-10T12:00:00Z",
          performanceStatus: "DEFAULT",
          memberStatus: "AVAILABLE",
        },
      ],
    };

    // Vietnamese
    await i18n.changeLanguage("vi");
    const formattedVi = formatFriendlyToolPayload(JSON.stringify(measuredView));
    expect(formattedVi).not.toBeNull();
    expect(formattedVi).toContain("Số công việc đang hoạt động: 2");
    expect(formattedVi).not.toContain("Chưa có dữ liệu workload đáng tin cậy");

    // English
    await i18n.changeLanguage("en");
    const formattedEn = formatFriendlyToolPayload(JSON.stringify(measuredView));
    expect(formattedEn).not.toBeNull();
    expect(formattedEn).toContain("Active assigned tasks: 2");
    expect(formattedEn).not.toContain("No reliable workload data available");
  });
});
