import { useTranslation } from "react-i18next";
import { 
  Bot, 
  Video, 
  FileSearch, 
  Kanban, 
  Activity, 
  CalendarDays,
  Sparkles,
  Zap,
  Shield,
  Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LandingFeaturesBento() {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-20 border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
            {t("landing.features.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            {t("landing.features.title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("landing.features.subtitle")}
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Bento Item 1: Multi-Model AI Copilot (Col-span 2) */}
          <div id="copilot" className="md:col-span-2 rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 inline-flex">
                  <Bot className="h-5 w-5" />
                </span>
                <Badge variant="secondary" className="font-mono text-[11px] gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  Dynamic Routing
                </Badge>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {t("landing.features.item_copilot_title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                {t("landing.features.item_copilot_desc")}
              </p>
            </div>

            {/* Model Architecture Pills */}
            <div className="pt-6 mt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-md bg-muted/60 border border-border/60">
                <span className="font-semibold block text-foreground">Gemma 4</span>
                <span className="text-[10px] text-muted-foreground">On-device Speed</span>
              </div>
              <div className="p-2 rounded-md bg-muted/60 border border-border/60">
                <span className="font-semibold block text-foreground">DeepSeek R1</span>
                <span className="text-[10px] text-muted-foreground">Deep Reasoning</span>
              </div>
              <div className="p-2 rounded-md bg-muted/60 border border-border/60">
                <span className="font-semibold block text-foreground">GPT-4o</span>
                <span className="text-[10px] text-muted-foreground">General Intelligence</span>
              </div>
              <div className="p-2 rounded-md bg-muted/60 border border-border/60">
                <span className="font-semibold block text-foreground">Gemini 2.5</span>
                <span className="text-[10px] text-muted-foreground">Multimodal Search</span>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Real-time HD Meetings & AI Blur (Col-span 1) */}
          <div id="meetings" className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex">
                <Video className="h-5 w-5" />
              </span>

              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {t("landing.features.item_meetings_title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.features.item_meetings_desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>WebRTC LiveKit</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">1080p 30 FPS</span>
            </div>
          </div>

          {/* Bento Item 3: RAG Knowledge Base (Col-span 1) */}
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-flex">
                <FileSearch className="h-5 w-5" />
              </span>

              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {t("landing.features.item_rag_title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.features.item_rag_desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>PostgreSQL pgvector</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">HNSW Index</span>
            </div>
          </div>

          {/* Bento Item 4: Kanban & Sprint Planning (Col-span 2) */}
          <div className="md:col-span-2 rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 inline-flex">
                  <Kanban className="h-5 w-5" />
                </span>
                <span className="text-xs font-mono text-muted-foreground">Fluid Drag & Drop</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {t("landing.features.item_kanban_title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                {t("landing.features.item_kanban_desc")}
              </p>
            </div>

            {/* Micro workflow snapshot */}
            <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Epics & Subtasks</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Instant Push Sync</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-500" /> RBAC Permissions</span>
            </div>
          </div>

          {/* Bento Item 5: Skills Matrix & Heuristic Engine (Col-span 1) */}
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex">
                <Activity className="h-5 w-5" />
              </span>

              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {t("landing.features.item_skills_title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.features.item_skills_desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 text-xs font-mono text-muted-foreground flex items-center justify-between">
              <span>Weights Balancing</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Fit • Load • Perf</span>
            </div>
          </div>

          {/* Bento Item 6: Calendar & Team Integration (Col-span 2) */}
          <div className="md:col-span-2 rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <span className="text-xs font-mono text-muted-foreground">Teams / Outlook Ready</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {t("landing.features.item_calendar_title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                {t("landing.features.item_calendar_desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Central Schedule Hub</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">Auto Keep-Alive Tabs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
