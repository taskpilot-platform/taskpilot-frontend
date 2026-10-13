import { RecommendationCard } from "@/components/ai/RecommendationCard";
import type { RecommendationView } from "@/components/ai/aiChatTypes";
import { Sparkles, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DemoRecommendationCardPage() {

  const adaptiveView: RecommendationView = {
    projectId: 100,
    requiredSkills: ["Java 25", "Spring Boot", "LiveKit WebRTC", "Flyway"],
    heuristicMode: "BALANCED",
    presentationContractVersion: "allowlisted-view-v1",
    scoringModelVersion: "adaptive-relative-rounded-v2",
    differentiationStatus: "DIFFERENTIATED",
    aiExplanation:
      "Alice Developer là ứng viên tối ưu nhất cho hạng mục tích hợp WebRTC và Flyway V40. Ứng viên sở hữu độ tương thích kỹ năng 88%, khối lượng công việc hiện tại là 3 tác vụ đang hoạt động (nằm trong ngưỡng tối ưu), đáp ứng trọn vẹn tiêu chí chế độ BALANCED.",
    candidates: [
      {
        rank: 1,
        candidateId: 101,
        displayName: "Alice Developer",
        presentationFitValue: 0.88,
        fitStatus: "MEASURED",
        storedWorkloadValue: 3,
        workloadStatus: "MEASURED",
        workloadUnit: "ACTIVE_TASK_COUNT",
        workloadScope: "PROJECT",
        workloadMeasuredAt: "2026-10-12T14:30:00Z",
        performanceStatus: "DEFAULT",
        memberStatus: "AVAILABLE",
      },
      {
        rank: 2,
        candidateId: 102,
        displayName: "Bob Engineer",
        presentationFitValue: 0.72,
        fitStatus: "MEASURED",
        storedWorkloadValue: 5,
        workloadStatus: "MEASURED",
        workloadUnit: "ACTIVE_TASK_COUNT",
        workloadScope: "PROJECT",
        workloadMeasuredAt: "2026-10-12T14:30:00Z",
        performanceStatus: "DEFAULT",
        memberStatus: "AVAILABLE",
      },
      {
        rank: 3,
        candidateId: 103,
        displayName: "Sarah Connor",
        presentationFitValue: 0.65,
        fitStatus: "MEASURED",
        storedWorkloadValue: 2,
        workloadStatus: "MEASURED",
        workloadUnit: "ACTIVE_TASK_COUNT",
        workloadScope: "PROJECT",
        workloadMeasuredAt: "2026-10-12T14:30:00Z",
        performanceStatus: "DEFAULT",
        memberStatus: "AVAILABLE",
      },
    ],
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6" data-testid="demo-adaptive-card-page">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-md p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Hệ Thống Thích Ứng Trọng Số AI & Đề Xuất Phân Công
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs">
              Phase 2F Offline Weights
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Mô hình Heuristic Scoring kết hợp học máy thích ứng (Adaptive Weight Learning) tự động cân bằng giữa Kỹ năng, Khối lượng công việc và Tốc độ thực hiện.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-primary text-primary-foreground text-xs py-1 px-2.5 gap-1.5 shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Chế độ: BALANCED</span>
          </Badge>
        </div>
      </div>

      {/* Render RecommendationCard with Phase 2C Measured Workload contract */}
      <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-6 shadow-md" data-testid="recommendation-card-container">
        <RecommendationCard view={adaptiveView} />
      </div>
    </div>
  );
}
