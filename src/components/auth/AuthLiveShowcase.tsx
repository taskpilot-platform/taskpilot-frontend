import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bot, 
  Video, 
  Kanban, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders,
  ArrowRight,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ShowcaseTab = "copilot" | "meeting" | "kanban";

export function AuthLiveShowcase() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("copilot");
  const [blurActive, setBlurActive] = useState(true);
  const [kanbanStage, setKanbanStage] = useState<number>(1); // 0: To Do, 1: Doing, 2: Done
  const [isGliding, setIsGliding] = useState(false);

  // Auto-cycle tabs every 7 seconds if user is idle
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "copilot") return "meeting";
        if (prev === "meeting") return "kanban";
        return "copilot";
      });
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvanceTask = () => {
    setIsGliding(true);
    setTimeout(() => {
      setKanbanStage((prev) => (prev + 1) % 3);
      setIsGliding(false);
    }, 320);
  };

  return (
    <div className="space-y-6">
      {/* Title & Tag */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300/80 bg-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900/60 px-2.5 py-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t("auth.workspace_tag")}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          {t("auth.hero_title")}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          {t("auth.hero_desc")}
        </p>
      </div>

      {/* Dynamic Interactive Card with Kinetic Depth */}
      <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4 shadow-sm backdrop-blur-md space-y-3 transition-all duration-300">
        {/* Top Control Bar with 3 Tab Switchers */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800/80">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            {t("auth.live_showcase.badge")}
          </span>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("copilot")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                activeTab === "copilot"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold scale-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                {t("auth.live_showcase.tab_copilot")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("meeting")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                activeTab === "meeting"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold scale-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {t("auth.live_showcase.tab_meeting")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("kanban")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                activeTab === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold scale-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-1">
                <Kanban className="h-3 w-3" />
                {t("auth.live_showcase.tab_kanban")}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Copilot Triage */}
        {activeTab === "copilot" && (
          <div className="space-y-2.5 pt-1 animate-forward-thrust">
            <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono flex items-center justify-between">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">&gt;</span> {t("auth.live_showcase.copilot_query")}
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            </div>

            <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 animate-spring-settle" />
                  {t("auth.live_showcase.copilot_agent")}
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono">
                  <Zap className="h-2.5 w-2.5 text-amber-500" />
                  96% Fit
                </Badge>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans">
                {t("auth.live_showcase.copilot_result")}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: LiveKit Meeting */}
        {activeTab === "meeting" && (
          <div className="space-y-2.5 pt-1 animate-forward-thrust">
            <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between text-white relative overflow-hidden">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  blurActive ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40" : "bg-blue-500/20 text-blue-400"
                }`}>
                  TP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">{t("auth.live_showcase.meeting_host")}</span>
                    {/* Kinetic Audio Frequency Equalizer */}
                    <div className="flex items-end gap-0.5 h-3 px-1">
                      <span className="w-0.5 bg-emerald-400 h-full animate-audio-bounce-1 rounded-full" />
                      <span className="w-0.5 bg-emerald-400 h-full animate-audio-bounce-2 rounded-full" />
                      <span className="w-0.5 bg-emerald-400 h-full animate-audio-bounce-3 rounded-full" />
                      <span className="w-0.5 bg-emerald-400 h-full animate-audio-bounce-4 rounded-full" />
                      <span className="w-0.5 bg-emerald-400 h-full animate-audio-bounce-5 rounded-full" />
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">{t("auth.live_showcase.meeting_status")}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBlurActive(!blurActive)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 cursor-pointer active:scale-95 transition-transform relative z-10"
                title="Toggle MediaPipe Blur"
              >
                <Sliders className="h-2.5 w-2.5" />
                <span>{blurActive ? "Blur 0.5px" : "Blur OFF"}</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              {t("auth.live_showcase.meeting_blur")}
            </p>
          </div>
        )}

        {/* Tab 3: Kanban Pulse with Physics-Based Kinetic Trajectory */}
        {activeTab === "kanban" && (
          <div className="space-y-2.5 pt-1 animate-forward-thrust">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200 font-mono">
                {t("auth.live_showcase.kanban_sprint")}
              </span>
              <button
                type="button"
                onClick={handleAdvanceTask}
                className="text-[10px] font-mono text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Glide Task</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>

            {/* Elastic Progress Bar */}
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" 
                style={{ width: kanbanStage === 2 ? "85%" : kanbanStage === 1 ? "68%" : "50%" }} 
              />
            </div>

            {/* Kinetic Flight Lane */}
            <div className="space-y-1.5 pt-1">
              {/* Task 1: Physically moving between states */}
              <div 
                onClick={handleAdvanceTask}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all duration-300 flex items-center justify-between ${
                  isGliding
                    ? "scale-102 -rotate-1 shadow-md bg-zinc-100 dark:bg-zinc-800 border-primary/50"
                    : kanbanStage === 2
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 animate-spring-settle"
                    : kanbanStage === 1
                    ? "bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                    kanbanStage === 0 ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" :
                    kanbanStage === 1 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {kanbanStage === 0 ? "TO-DO" : kanbanStage === 1 ? "IN PROGRESS" : "DONE"}
                  </span>
                  <span className="truncate font-medium">{t("auth.live_showcase.kanban_item_1")}</span>
                </div>

                <div className="shrink-0 pl-2">
                  {kanbanStage === 2 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 animate-spring-settle" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  )}
                </div>
              </div>

              {/* Task 2: Stable anchor task */}
              <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    IN PROGRESS
                  </span>
                  <span className="truncate">{t("auth.live_showcase.kanban_item_2")}</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Subtle Live Ticker */}
        <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          {activeTab === "copilot" && t("auth.live_showcase.ticker_1")}
          {activeTab === "meeting" && t("auth.live_showcase.ticker_2")}
          {activeTab === "kanban" && t("auth.live_showcase.ticker_3")}
        </div>
      </div>
    </div>
  );
}