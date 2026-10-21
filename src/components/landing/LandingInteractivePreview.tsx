import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bot, 
  Kanban, 
  Video, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Search,
  Sliders,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PreviewTab = "copilot" | "kanban" | "meetings" | "rag";

export function LandingInteractivePreview() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PreviewTab>("copilot");
  const [blurActive, setBlurActive] = useState(true);
  const [isSimulatingAgent, setIsSimulatingAgent] = useState(false);
  const [kanbanStage, setKanbanStage] = useState<number>(0);
  const [selectedRagQuery, setSelectedRagQuery] = useState<number>(0);

  const triggerAgentSimulation = () => {
    setIsSimulatingAgent(true);
    setTimeout(() => {
      setIsSimulatingAgent(false);
    }, 600);
  };

  const advanceKanbanTask = () => {
    setKanbanStage((prev) => (prev + 1) % 3);
  };

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
              <span>{t("landing.preview.tab_copilot")}</span>
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
              <span>{t("landing.preview.tab_kanban")}</span>
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
              <span>{t("landing.preview.tab_meetings")}</span>
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
              <span>{t("landing.preview.tab_rag")}</span>
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
                    <h3 className="text-sm font-semibold text-foreground">{t("landing.preview.copilot_title")}</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">{t("landing.preview.copilot_model")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={triggerAgentSimulation}
                    className="h-7 text-[11px] font-mono gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSimulatingAgent ? "animate-spin text-primary" : ""}`} />
                    <span className="hidden sm:inline">Simulate</span>
                  </Button>
                  <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("landing.preview.copilot_streaming")}
                  </Badge>
                </div>
              </div>

              {/* User Prompt Bubble */}
              <div className="flex justify-end">
                <div className="rounded-xl rounded-tr-xs bg-primary text-primary-foreground px-4 py-2.5 text-xs sm:text-sm max-w-lg shadow-2xs">
                  {t("landing.preview.copilot_user_prompt")}
                </div>
              </div>

              {/* AI Agent Answer Box */}
              <div className={`rounded-xl rounded-tl-xs border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-2xs transition-opacity ${
                isSimulatingAgent ? "opacity-40" : "opacity-100"
              }`}>
                <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t("landing.preview.copilot_analysis_title")}</span>
                </div>

                {/* Reasoning Steps Accordion */}
                <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1.5 font-mono text-muted-foreground">
                  <p className="text-foreground font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {t("landing.preview.copilot_reasoning_1")}
                  </p>
                  <p className="pl-4">{t("landing.preview.copilot_reasoning_2")}</p>
                  <p className="pl-4">{t("landing.preview.copilot_reasoning_3")}</p>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-foreground">
                  {t("landing.preview.copilot_heuristic_desc")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-lg border border-border/70 bg-background/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold block text-foreground">{t("landing.preview.copilot_task_1_title")}</span>
                      <span className="text-[11px] text-muted-foreground">{t("landing.preview.copilot_task_1_assignee")}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      {t("landing.preview.copilot_task_1_match")}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border border-border/70 bg-background/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold block text-foreground">{t("landing.preview.copilot_task_2_title")}</span>
                      <span className="text-[11px] text-muted-foreground">{t("landing.preview.copilot_task_2_assignee")}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      {t("landing.preview.copilot_task_2_match")}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KANBAN SPRINT PREVIEW */}
          {activeTab === "kanban" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  {t("landing.preview.kanban_header")}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={advanceKanbanTask}
                    className="h-6 text-[11px] font-mono gap-1"
                  >
                    <span>Move Task</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Button>
                  <Badge variant="outline" className="text-[10px]">{t("landing.preview.kanban_sync")}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Column: To Do */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{t("landing.preview.kanban_col_todo")}</span>
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      {kanbanStage === 0 ? 2 : 1}
                    </span>
                  </div>
                  {kanbanStage === 0 && (
                    <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5 transition-all">
                      <span className="text-xs font-medium block text-foreground">{t("landing.preview.kanban_task_1")}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">SEO</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 2h</span>
                      </div>
                    </div>
                  )}
                  <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5">
                    <span className="text-xs font-medium block text-foreground">Analytics Event Triggers</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 3h</span>
                  </div>
                </div>

                {/* Column: In Progress */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{t("landing.preview.kanban_col_in_progress")}</span>
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      {kanbanStage === 1 ? 2 : 1}
                    </span>
                  </div>
                  {kanbanStage === 1 && (
                    <div className="p-2.5 rounded-md bg-card border-2 border-primary/50 shadow-2xs space-y-1.5 transition-all">
                      <span className="text-xs font-medium block text-foreground">{t("landing.preview.kanban_task_1")}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">SEO</span>
                        <span className="text-[10px] text-emerald-500 font-mono">Active</span>
                      </div>
                    </div>
                  )}
                  <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5">
                    <span className="text-xs font-medium block text-foreground">{t("landing.preview.kanban_task_2")}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">Meetings</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 4h</span>
                    </div>
                  </div>
                </div>

                {/* Column: Done */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{t("landing.preview.kanban_col_done")}</span>
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                      {kanbanStage === 2 ? 8 : 7}
                    </span>
                  </div>
                  {kanbanStage === 2 && (
                    <div className="p-2.5 rounded-md bg-card border border-emerald-500/40 shadow-2xs space-y-1.5 transition-all">
                      <span className="text-xs font-medium block text-foreground">{t("landing.preview.kanban_task_1")}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">Done</span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      </div>
                    </div>
                  )}
                  <div className="p-2.5 rounded-md bg-card border border-border/80 shadow-2xs space-y-1.5">
                    <span className="text-xs font-medium block text-foreground">{t("landing.preview.kanban_task_3")}</span>
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
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-semibold text-foreground">{t("landing.preview.meeting_title")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBlurActive(!blurActive)}
                    className="h-6 text-[11px] font-mono gap-1 cursor-pointer"
                  >
                    <Sliders className="h-3 w-3" />
                    <span>{t("landing.preview.meeting_toggle_blur")}</span>
                  </Button>
                  <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                    {t("landing.preview.meeting_rec")}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Host Tile with Virtual Background */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-border/70 flex items-center justify-center transition-all">
                  <div className="text-center space-y-1.5 relative z-10">
                    <div className={`h-12 w-12 rounded-full mx-auto flex items-center justify-center font-bold text-sm transition-all ${
                      blurActive ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40" : "bg-zinc-800 text-zinc-300"
                    }`}>
                      Admin
                    </div>
                    <span className="text-xs text-zinc-200 block font-medium">{t("landing.preview.meeting_host")}</span>
                  </div>

                  {/* Simulated Bokeh Blur background */}
                  <div className={`absolute inset-0 transition-all duration-300 pointer-events-none ${
                    blurActive 
                      ? "bg-[radial-gradient(circle_at_center,#10b98118_0%,#09090b_70%)] backdrop-blur-md" 
                      : "bg-zinc-900"
                  }`} />

                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30 z-20">
                    {blurActive ? t("landing.preview.meeting_blur_on") : t("landing.preview.meeting_blur_off")}
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-mono z-20">
                    {t("landing.preview.meeting_specs")}
                  </div>
                </div>

                {/* Screen Share Tile */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-border/70 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{t("landing.preview.meeting_share_title")}</Badge>
                    <span className="text-[10px] font-mono text-zinc-400">WebRTC LiveKit</span>
                  </div>
                  <div className="bg-zinc-950/90 rounded border border-zinc-800 p-2.5 font-mono text-[11px] text-emerald-400">
                    <code>git commit -m "fix(meetings): enhance background blur matting"</code>
                  </div>
                  <span className="text-[10px] text-zinc-400">{t("landing.preview.meeting_share_by")}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RAG KNOWLEDGE PREVIEW */}
          {activeTab === "rag" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Search Bar Simulator with Clickable Prompts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-xs text-foreground">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono">
                    {selectedRagQuery === 0 && t("landing.preview.rag_search_placeholder")}
                    {selectedRagQuery === 1 && "Tìm kiếm: 'Cấu hình bảo mật JWT và CORS trong Spring Security?'"}
                    {selectedRagQuery === 2 && "Tìm kiếm: 'Đặc tả giao thức WebRTC kết nối LiveKit SFU Server?'"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedRagQuery(0)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      selectedRagQuery === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    Query: pgvector HNSW
                  </button>
                  <button
                    onClick={() => setSelectedRagQuery(1)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      selectedRagQuery === 1 ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    Query: Spring Security
                  </button>
                  <button
                    onClick={() => setSelectedRagQuery(2)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      selectedRagQuery === 2 ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    Query: LiveKit SFU
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    {selectedRagQuery === 0 && t("landing.preview.rag_citation")}
                    {selectedRagQuery === 1 && "Trích dẫn: security_specification_v2.pdf (Trang 8)"}
                    {selectedRagQuery === 2 && "Trích dẫn: webrtc_livekit_architecture.md (Dòng 142)"}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    {selectedRagQuery === 0 ? t("landing.preview.rag_similarity") : "Similarity 96.8%"}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  {selectedRagQuery === 0 && t("landing.preview.rag_excerpt")}
                  {selectedRagQuery === 1 && "Hệ thống áp dụng JWT Stateless với thuật toán RSA-256 (RS256), token hết hạn sau 60 phút và refresh token bảo vệ qua HttpOnly cookie với cờ SameSite=Strict."}
                  {selectedRagQuery === 2 && "Kết nối video sử dụng Selective Forwarding Unit (SFU) qua LiveKit Protocol. Luồng media được giải mã và đồng bộ trực tiếp qua WebRTC DataChannel và RTCPeerConnection."}
                </p>

                <div className="pt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span>{t("landing.preview.rag_chunk")}</span>
                  <span>•</span>
                  <span>{t("landing.preview.rag_latency")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}