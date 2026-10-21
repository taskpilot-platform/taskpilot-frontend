import { useState } from "react";
import { 
  Bot, 
  Kanban, 
  Video, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PreviewTab = "copilot" | "kanban" | "meetings" | "rag";

export function LandingInteractivePreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("copilot");

  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
      {/* Outer Shell Frame */}
      <div className="rounded-xl border border-border/90 bg-card/60 p-2 sm:p-3 shadow-xl backdrop-blur-md">
        {/* Browser Top Window Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 px-2 pt-1">
          {/* Traffic lights + URL */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
              <span className="text-emerald-500 font-bold">https://</span>
              <span>taskpilot-platform.netlify.app/workspace</span>
            </div>
          </div>

          {/* Interactive Tab Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
            <button
              onClick={() => setActiveTab("copilot")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "copilot"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>AI Copilot</span>
            </button>

            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "kanban"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>

            <button
              onClick={() => setActiveTab("meetings")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "meetings"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>HD Meeting</span>
            </button>

            <button
              onClick={() => setActiveTab("rag")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "rag"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>RAG Knowledge</span>
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Stage */}
        <div className="min-h-[420px] rounded-lg bg-background/90 p-4 sm:p-6 border border-border/50 transition-all">
          {/* TAB 1: COPILOT PREVIEW */}
          {activeTab === "copilot" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">TaskPilot Autonomous Agent</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">Model: Gemma 4 / Gemini 2.5 Hybrid</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Streaming Active
                </Badge>
              </div>

              {/* User Prompt Bubble */}
              <div className="flex justify-end">
                <div className="rounded-xl rounded-tr-xs bg-primary text-primary-foreground px-4 py-2.5 text-xs sm:text-sm max-w-lg shadow-2xs">
                  Dự án đang có 2 task frontend bị quá hạn, hãy phân tích ma trận kỹ năng và đề xuất người phụ trách phù hợp nhất?
                </div>
              </div>

              {/* AI Agent Answer Box */}
              <div className="rounded-xl rounded-tl-xs border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Heuristic Analysis Completed</span>
                </div>

                {/* Reasoning Steps Accordion */}
                <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1.5 font-mono text-muted-foreground">
                  <p className="text-foreground font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Đã kiểm tra 4 kỹ sư trong dự án #12 (Frontend Sprint)
                  </p>
                  <p className="pl-4">• Minh Dang: Kỹ năng React/TypeScript (0.92), Tải hiện tại: 40% [TỐI ƯU NHẤT]</p>
                  <p className="pl-4">• Lan Nguyen: Đang chạy 3 task Backend nặng, tải 85%</p>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-foreground">
                  Dựa trên thuật toán Heuristic cân bằng 3 trọng số <strong>Kỹ năng (Fit)</strong>, <strong>Tải công việc (Load)</strong> và <strong>Hiệu suất (Perf)</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-lg border border-border/70 bg-background/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold block text-foreground">Task #142: Refactor UI Chat</span>
                      <span className="text-[11px] text-muted-foreground">Gán cho: Minh Dang</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">Match 95%</Badge>
                  </div>

                  <div className="p-3 rounded-lg border border-border/70 bg-background/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold block text-foreground">Task #145: Video Recording WebM</span>
                      <span className="text-[11px] text-muted-foreground">Gán cho: Minh Dang</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">Match 89%</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KANBAN SPRINT PREVIEW */}
          {activeTab === "kanban" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  Sprint 14: Release v2.0 • 4 Cột • 12 Công việc
                </span>
                <Badge variant="outline" className="text-[10px]">Real-time Sync</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Column: To Do */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>CẦN LÀM (TO DO)</span>
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">2</span>
                  </div>
                  <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5">
                    <span className="text-xs font-medium block text-foreground">Thiết lập SEO Open Graph tags</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">SEO</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 2h</span>
                    </div>
                  </div>
                </div>

                {/* Column: In Progress */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>ĐANG THỰC HIỆN</span>
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">3</span>
                  </div>
                  <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5">
                    <span className="text-xs font-medium block text-foreground">Vá Duration header cho WebM MediaRecorder</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">Meetings</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 4h</span>
                    </div>
                  </div>
                </div>

                {/* Column: Done */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>HOÀN THÀNH</span>
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">7</span>
                  </div>
                  <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5">
                    <span className="text-xs font-medium block text-foreground">Tối ưu hóa viền cắt xóa phông AI MediaPipe</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">AI WebGL</span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HD MEETINGS PREVIEW */}
          {activeTab === "meetings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-semibold text-foreground">Họp Daily Standup - Phòng #234</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">REC ON (Cloud Recording)</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Host Tile with Virtual Background */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-border/70 flex items-center justify-center">
                  <div className="text-center space-y-1.5">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold text-sm">
                      Admin
                    </div>
                    <span className="text-xs text-zinc-300 block font-medium">Admin (Host)</span>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-emerald-400 border border-emerald-500/30">
                    AI Blur Active (0.5px Matting)
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-mono">
                    1080p • 30 FPS
                  </div>
                </div>

                {/* Screen Share Tile */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-border/70 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">Live Screen Share (Code Review)</Badge>
                    <span className="text-[10px] font-mono text-zinc-400">WebRTC LiveKit</span>
                  </div>
                  <div className="bg-zinc-950/90 rounded border border-zinc-800 p-2.5 font-mono text-[11px] text-emerald-400">
                    <code>git commit -m "fix(meetings): enhance background blur matting"</code>
                  </div>
                  <span className="text-[10px] text-zinc-500">Đang chia sẻ bởi: Dev Lead</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RAG KNOWLEDGE PREVIEW */}
          {activeTab === "rag" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                <span>Tìm kiếm: "Kiến trúc pgvector và mô hình embedding được cấu hình thế nào?"</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Trích dẫn từ: architecture_design_phase3.pdf (Trang 14)
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Similarity 94.2%
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  "Hệ thống TaskPilot lưu trữ embedding 768 chiều trên cơ sở dữ liệu PostgreSQL sử dụng extension <code>pgvector</code> với chỉ mục HNSW. Mọi truy vấn của người dùng được mã hóa qua Google Gemini Embedding hoặc OpenAI text-embedding-3 trước khi tìm kiếm cosine similarity."
                </p>

                <div className="pt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span>Chunk ID: #4092</span>
                  <span>•</span>
                  <span>Độ trễ: 42ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
