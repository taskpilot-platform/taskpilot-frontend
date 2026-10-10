import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders dedicated card with candidate names, ranks, and heuristic mode", () => {
    render(<RecommendationCard view={sampleView} />);

    expect(screen.getByText("Đề xuất phân công ứng viên")).toBeInTheDocument();
    expect(screen.getByTestId("heuristic-mode-badge")).toHaveTextContent("BALANCED");
    expect(screen.getByText("Alice Developer")).toBeInTheDocument();
    expect(screen.getByText("Bob Engineer")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("strictly hides internal IDs (candidateId, userId, projectId) from user-facing text", () => {
    const { container } = render(<RecommendationCard view={sampleView} />);

    // 101, 102, 42 should not appear as visible identifiers in text
    expect(container.textContent).not.toMatch(/\b101\b/);
    expect(container.textContent).not.toMatch(/\b102\b/);
    expect(container.textContent).not.toMatch(/\bcandidateId\b/i);
    expect(container.textContent).not.toMatch(/\buserId\b/i);
    expect(container.textContent).not.toMatch(/\bprojectId\b/i);
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

  it("renders canonical backend cross-repo fixture phase1-recommendation-view.json cleanly", async () => {
    const fixture = await import("../fixtures/phase1-recommendation-view.json");
    const canonicalView = fixture.default as unknown as RecommendationView;

    expect(canonicalView.presentationContractVersion).toBe("allowlisted-view-v1");
    expect(canonicalView.scoringModelVersion).toBe("relative-neutral-fixed-point-v2");
    expect(canonicalView.differentiationStatus).toBe("DIFFERENTIATED");

    render(<RecommendationCard view={canonicalView} />);

    expect(screen.getByText("Alice Engineer")).toBeInTheDocument();
    expect(screen.getByText("Bob Developer")).toBeInTheDocument();
    expect(screen.getByText(/Giá trị workload đã lưu: 20/)).toBeInTheDocument();
    expect(screen.getByText(/Giá trị workload đã lưu: 45/)).toBeInTheDocument();
  });
});
