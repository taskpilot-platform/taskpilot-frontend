import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bot, 
  Kanban, 
  Video, 
  FileSearch, 
  MessageSquare, 
  Activity, 
  Calendar,
  CheckCircle2,
  Sparkles,
  Sliders,
  Layers,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FeatureSuiteTab = 
  | "agents" 
  | "kanban" 
  | "meetings" 
  | "rag" 
  | "chat" 
  | "matrix" 
  | "calendar";

export function LandingFeaturesDeepDive() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FeatureSuiteTab>("agents");
  const [interactiveBlurLevel, setInteractiveBlurLevel] = useState<number>(0.5);
  const [activeModel, setActiveModel] = useState<string>("deepseek");

  return (
    <section id="features-suite" className="py-20 border-t border-border/70 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
            {t("landing.features_suite.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            {t("landing.features_suite.title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("landing.features_suite.subtitle")}
          </p>
        </div>

        {/* 7-Tab Navigation Bar */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/70">
            <button
              onClick={() => setActiveTab("agents")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "agents"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span>{t("landing.features_suite.tab_agents")}</span>
            </button>

            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "kanban"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="h-3.5 w-3.5 text-purple-500" />
              <span>{t("landing.features_suite.tab_kanban")}</span>
            </button>

            <button
              onClick={() => setActiveTab("meetings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "meetings"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t("landing.features_suite.tab_meetings")}</span>
            </button>

            <button
              onClick={() => setActiveTab("rag")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "rag"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSearch className="h-3.5 w-3.5 text-blue-500" />
              <span>{t("landing.features_suite.tab_rag")}</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
              <span>{t("landing.features_suite.tab_chat")}</span>
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-rose-500" />
              <span>{t("landing.features_suite.tab_matrix")}</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "calendar"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-teal-500" />
              <span>{t("landing.features_suite.tab_calendar")}</span>
            </button>
          </div>
        </div>

        {/* Feature Display Stage (2-Column Asymmetrical Grid) */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-lg">
          {/* TAB 1: AI AGENTS & COPILOT */}
          {activeTab === "agents" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Description Column */}
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-mono font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Autonomous Multi-Model</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.agents_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.agents_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.agents_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.agents_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.agents_f3")}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Component Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-4">
                {/* Model switcher bar */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <span className="text-xs font-mono text-muted-foreground">Select Active Intelligence Engine:</span>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      onClick={() => setActiveModel("deepseek")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        activeModel === "deepseek" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      DeepSeek R1
                    </button>
                    <button
                      onClick={() => setActiveModel("gemma")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        activeModel === "gemma" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Gemma 4
                    </button>
                    <button
                      onClick={() => setActiveModel("gpt4o")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        activeModel === "gpt4o" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      GPT-4o
                    </button>
                  </div>
                </div>

                {/* Simulated Reasoning Tree */}
                <div className="rounded-lg border border-border/80 bg-background/90 p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
                    <span>Task: Automated Acceptance Criteria Generation</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                      Tokens: 1,420 • 98.4% Confidence
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-muted-foreground text-[11px]">
                    <p className="text-foreground font-semibold">&gt; Analyzing User Story: Payment Webhook Retry</p>
                    <p className="pl-3">• Criterion 1: Idempotency Key validated within 50ms</p>
                    <p className="pl-3">• Criterion 2: Exponential backoff on 500 error (1s, 2s, 4s, 8s)</p>
                    <p className="pl-3">• Criterion 3: Audit log transaction status preserved in Postgres</p>
                  </div>

                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center justify-between">
                    <span>✓ Ready to export to Jira, GitHub Issues or TaskPilot Sprint Board</span>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      Export (1-click)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KANBAN SPRINT & VELOCITY */}
          {activeTab === "kanban" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-mono font-medium text-purple-600 dark:text-purple-400">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Fluid 60 FPS Board</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.kanban_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.kanban_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.kanban_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.kanban_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.kanban_f3")}</span>
                  </div>
                </div>
              </div>

              {/* Kanban & Burn-Down Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs font-mono">
                  <span className="font-semibold text-foreground">Sprint 14 Velocity Trajectory</span>
                  <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-500/30">
                    Velocity: 48 SP / Sprint
                  </Badge>
                </div>

                {/* Simulated Velocity Bars */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="space-y-1 text-center">
                    <div className="h-24 bg-muted rounded flex items-end justify-center p-1">
                      <div className="w-full bg-purple-500/50 rounded-xs" style={{ height: "65%" }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Sprint 11</span>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="h-24 bg-muted rounded flex items-end justify-center p-1">
                      <div className="w-full bg-purple-500/60 rounded-xs" style={{ height: "80%" }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Sprint 12</span>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="h-24 bg-muted rounded flex items-end justify-center p-1">
                      <div className="w-full bg-purple-500/80 rounded-xs" style={{ height: "92%" }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Sprint 13</span>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="h-24 bg-muted rounded flex items-end justify-center p-1 border border-primary/40">
                      <div className="w-full bg-primary rounded-xs" style={{ height: "98%" }} />
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold">Sprint 14 (Now)</span>
                  </div>
                </div>

                {/* Interactive Micro Card */}
                <div className="p-3 rounded-lg border border-border/70 bg-background/90 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">TASK-1042: Optimizing WebAssembly SIMD Blur</span>
                    <span className="text-[11px] text-muted-foreground font-mono">Assigned to: Minh Dang • Story Points: 5 SP</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    In Review
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HD VIDEO MEETINGS & AI STUDIO */}
          {activeTab === "meetings" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  <Video className="h-3.5 w-3.5" />
                  <span>WebRTC LiveKit Engine</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.meetings_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.meetings_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.meetings_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.meetings_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.meetings_f3")}</span>
                  </div>
                </div>
              </div>

              {/* Video Meeting Studio Controller Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-border/80 flex items-center justify-center">
                  <div className="text-center space-y-2 relative z-10">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold text-base ring-2 ring-emerald-500/40">
                      Host
                    </div>
                    <span className="text-xs text-zinc-300 block font-medium">Daily Engineering Sync</span>
                  </div>

                  {/* Dynamic blur aura adjusted by slider */}
                  <div 
                    className="absolute inset-0 transition-all pointer-events-none" 
                    style={{ 
                      backdropFilter: `blur(${interactiveBlurLevel * 16}px)`,
                      background: `radial-gradient(circle, rgba(16,185,129,${interactiveBlurLevel * 0.15}) 0%, rgba(9,9,11,0.9) 75%)`
                    }} 
                  />

                  <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono z-20">
                    MediaPipe 256x256 • {interactiveBlurLevel}px Subpixel Matting
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-mono z-20">
                    Duration Seekable • WebM Cluster Fixed
                  </div>
                </div>

                {/* Interactive Slider */}
                <div className="p-3 rounded-lg border border-border/70 bg-background/90 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Sliders className="h-3 w-3 text-emerald-500" />
                      Adjust AI Background Blur Strength:
                    </span>
                    <span className="text-emerald-500 font-bold">{interactiveBlurLevel.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.1"
                    value={interactiveBlurLevel}
                    onChange={(e) => setInteractiveBlurLevel(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RAG KNOWLEDGE BASE */}
          {activeTab === "rag" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                  <FileSearch className="h-3.5 w-3.5" />
                  <span>PostgreSQL pgvector</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.rag_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.rag_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.rag_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.rag_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.rag_f3")}</span>
                  </div>
                </div>
              </div>

              {/* RAG Knowledge Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg border border-border/80 bg-background/90 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-foreground font-semibold">Indexed Vectors in Project #12</span>
                    <span className="text-blue-500">4,812 Chunks</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                    <div className="p-2 rounded bg-muted/50 border border-border/60">
                      <span className="font-semibold block text-foreground">architecture.pdf</span>
                      <span className="text-muted-foreground">1,200 Chunks</span>
                    </div>
                    <div className="p-2 rounded bg-muted/50 border border-border/60">
                      <span className="font-semibold block text-foreground">api_specs.json</span>
                      <span className="text-muted-foreground">840 Chunks</span>
                    </div>
                    <div className="p-2 rounded bg-muted/50 border border-border/60">
                      <span className="font-semibold block text-foreground">prd_v2.md</span>
                      <span className="text-muted-foreground">2,772 Chunks</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Semantic Citation Preview
                    </span>
                    <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-500/40">
                      Cosine Match: 0.942
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    "...All vector embeddings are indexed with HNSW parameters m=16, ef_construction=64, yielding sub-50ms query latency across million-record scales..."
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TEAM REAL-TIME CHAT */}
          {activeTab === "chat" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-medium text-amber-600 dark:text-amber-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>WebSocket Channels</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.chat_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.chat_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.chat_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.chat_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.chat_f3")}</span>
                  </div>
                </div>
              </div>

              {/* Chat Thread Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-semibold text-foreground">#release-v2-devs (6 members)</span>
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded bg-background/90 border border-border/70 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">Minh Dang</span>
                      <span className="text-muted-foreground text-[10px]">10:42 AM</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Đã push commit patch duration cho video WebM. Đội QA có thể test lại luồng tải file và xem preview video.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-background/90 border border-border/70 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">Lan Nguyen (QA Lead)</span>
                      <span className="text-muted-foreground text-[10px]">10:44 AM</span>
                    </div>
                    <p className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                      ✓ Verified: Thanh tua video đã căn đúng thời lượng 0:00 - 02:45, tải file về xem trơn tru trên VLC & Chrome!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HEURISTIC SKILL MATRIX */}
          {activeTab === "matrix" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-mono font-medium text-rose-600 dark:text-rose-400">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Workload Balance Heuristic</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.matrix_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.matrix_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.matrix_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.matrix_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.matrix_f3")}</span>
                  </div>
                </div>
              </div>

              {/* Heuristic Matrix Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-semibold text-foreground">Algorithm: Score = w1·Fit + w2·Load + w3·Perf</span>
                  <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30">Auto-Balancing</Badge>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-border/70 bg-background/90 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Minh Dang (Frontend / WebGL)</span>
                      <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">Recommendation: OPTIMAL</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                      <span>Skill Fit: 95%</span>
                      <span>Current Load: 40%</span>
                      <span>Score: 0.92</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/70 bg-background/90 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Tuan Pham (Backend / DB)</span>
                      <Badge variant="secondary" className="text-[10px] text-amber-600 dark:text-amber-400">High Workload</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                      <span>Skill Fit: 88%</span>
                      <span>Current Load: 85%</span>
                      <span>Score: 0.54</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "54%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: TIMELINE & GANTT */}
          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-mono font-medium text-teal-600 dark:text-teal-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Multi-Project Gantt</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.features_suite.calendar_title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("landing.features_suite.calendar_desc")}
                </p>

                <div className="space-y-2.5 pt-2 font-mono text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.calendar_f1")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.calendar_f2")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("landing.features_suite.calendar_f3")}</span>
                  </div>
                </div>
              </div>

              {/* Gantt Timeline Illustration */}
              <div className="lg:col-span-7 rounded-xl border border-border/90 bg-muted/30 p-4 sm:p-6 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-semibold text-foreground">Sprint 14 Milestones Schedule</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Auto Keep-Alive</span>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Track 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground">Phase 1: Architecture & SEO Specs</span>
                      <span className="text-emerald-500">Completed (Oct 18-20)</span>
                    </div>
                    <div className="h-3 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded" style={{ width: "100%" }} />
                    </div>
                  </div>

                  {/* Track 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground">Phase 2: Video Blur Matting & WebM Fix</span>
                      <span className="text-emerald-500">Completed (Oct 21)</span>
                    </div>
                    <div className="h-3 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded" style={{ width: "100%" }} />
                    </div>
                  </div>

                  {/* Track 3 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground">Phase 3: Production Release v2.0 & Netlify Edge</span>
                      <span className="text-primary font-bold">In Progress (85%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: "85%" }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40">
                  <span className="flex items-center gap-1 text-emerald-500"><ShieldCheck className="h-3 w-3" /> Zero Conflict Detected</span>
                  <span>Synced with MS Teams</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}