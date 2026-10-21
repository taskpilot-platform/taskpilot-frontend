import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  ArrowRight, 
  ChevronRight, 
  Play, 
  Sparkles, 
  Bot, 
  CheckCircle2, 
  Zap 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LandingHeroProps {
  onExploreClick: () => void;
}

export function LandingHero({ onExploreClick }: LandingHeroProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPrompt, setSelectedPrompt] = useState<number>(0);

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Subtle Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e760_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e760_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#3f3f4615_1px,transparent_1px),linear-gradient(to_bottom,#3f3f4615_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
        {/* Release Pill Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1 text-xs font-mono text-muted-foreground backdrop-blur-xs shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t("landing.hero.badge")}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
          {t("landing.hero.title_prefix")}{" "}
          <span className="text-[#0394B1] dark:text-[#38bdf8] underline decoration-[#0394B1]/30 dark:decoration-[#38bdf8]/30 decoration-wavy underline-offset-8">
            {t("landing.hero.title_highlight")}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
          {t("landing.hero.description")}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={() => navigate("/register")}
            className="w-full sm:w-auto h-11 px-7 text-sm font-semibold gap-2 shadow-sm"
          >
            <span>{t("landing.hero.cta_primary")}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={onExploreClick}
            className="w-full sm:w-auto h-11 px-6 text-sm font-medium gap-2 border-border/80 bg-background/50 hover:bg-muted/80"
          >
            <Play className="h-3.5 w-3.5 fill-current opacity-70" />
            <span>{t("landing.hero.cta_secondary")}</span>
          </Button>
        </div>

        {/* Interactive Prompt & Workflow Playground */}
        <div className="pt-6 max-w-3xl mx-auto text-left">
          <div className="rounded-xl border border-border/80 bg-card/70 p-4 sm:p-5 shadow-lg backdrop-blur-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-foreground font-mono">
                  {t("landing.hero_playground.badge")}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("landing.hero_playground.model_label")}
              </Badge>
            </div>

            {/* Prompt Selector Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground block font-mono">
                {t("landing.hero_playground.hint")}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPrompt(0)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedPrompt === 0
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/70"
                  }`}
                >
                  {t("landing.hero_playground.prompt_1_label")}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPrompt(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedPrompt === 1
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/70"
                  }`}
                >
                  {t("landing.hero_playground.prompt_2_label")}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPrompt(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedPrompt === 2
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/70"
                  }`}
                >
                  {t("landing.hero_playground.prompt_3_label")}
                </button>
              </div>
            </div>

            {/* Simulated Live Output Panel */}
            <div className="rounded-lg border border-border/70 bg-background/90 p-3.5 space-y-2.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px]">
                  &gt; {selectedPrompt === 0 && t("landing.hero_playground.prompt_1_text")}
                  {selectedPrompt === 1 && t("landing.hero_playground.prompt_2_text")}
                  {selectedPrompt === 2 && t("landing.hero_playground.prompt_3_text")}
                </span>
              </div>

              <div className="p-3 rounded-md bg-muted/30 border border-border/50 space-y-1.5 text-foreground">
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedPrompt === 0 && t("landing.hero_playground.prompt_1_res_title")}
                    {selectedPrompt === 1 && t("landing.hero_playground.prompt_2_res_title")}
                    {selectedPrompt === 2 && t("landing.hero_playground.prompt_3_res_title")}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5 text-amber-500" /> 180ms
                  </span>
                </div>

                <div className="text-[11px] space-y-1 text-muted-foreground leading-relaxed pl-1">
                  {selectedPrompt === 0 && (
                    <>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_1_res_1")}</p>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_1_res_2")}</p>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_1_res_3")}</p>
                    </>
                  )}
                  {selectedPrompt === 1 && (
                    <>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_2_res_1")}</p>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_2_res_2")}</p>
                      <p className="text-amber-600 dark:text-amber-400">{t("landing.hero_playground.prompt_2_res_3")}</p>
                    </>
                  )}
                  {selectedPrompt === 2 && (
                    <>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_3_res_1")}</p>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_3_res_2")}</p>
                      <p className="text-foreground">{t("landing.hero_playground.prompt_3_res_3")}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div className="pt-8">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground/80">
            {t("landing.hero.trusted_by")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-60 grayscale hover:grayscale-0 transition-all text-xs font-mono">
            <span className="font-semibold tracking-wider">NEXTECH CORP</span>
            <span>•</span>
            <span className="font-semibold tracking-wider">V-AGILE LABS</span>
            <span>•</span>
            <span className="font-semibold tracking-wider">DEVOPS CLOUD</span>
            <span>•</span>
            <span className="font-semibold tracking-wider">SCALEUP AI</span>
          </div>
        </div>
      </div>
    </section>
  );
}