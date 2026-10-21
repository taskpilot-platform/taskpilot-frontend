import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  onExploreClick: () => void;
}

export function LandingHero({ onExploreClick }: LandingHeroProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
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

        {/* Trust row */}
        <div className="pt-10">
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
