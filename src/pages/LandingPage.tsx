import { useEffect } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingInteractivePreview } from "@/components/landing/LandingInteractivePreview";
import { LandingFeaturesBento } from "@/components/landing/LandingFeaturesBento";
import { LandingFeaturesDeepDive } from "@/components/landing/LandingFeaturesDeepDive";
import { LandingMetrics } from "@/components/landing/LandingMetrics";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Dynamic document title for SEO
    document.title = "TaskPilot • Nền tảng quản lý dự án thế hệ mới & AI Copilot";
  }, []);

  const handleExploreClick = () => {
    const demoSection = document.getElementById("demo");
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <LandingHero onExploreClick={handleExploreClick} />

        {/* 3. Live Interactive UI Preview */}
        <LandingInteractivePreview />

        {/* 4. Performance & Scale Metrics Bar */}
        <LandingMetrics />

        {/* 5. Asymmetrical Bento Features */}
        <LandingFeaturesBento />

        {/* 6. Comprehensive 7-Module Interactive Deep Dive */}
        <LandingFeaturesDeepDive />

        {/* 7. Pricing Matrix */}
        <LandingPricing />

        {/* 8. FAQ Section */}
        <LandingFaq />

        {/* 9. Bottom Full-Bleed Call to Action */}
        <section className="py-20 border-t border-border/80 bg-zinc-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              {t("landing.cta.title")}
            </h2>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-zinc-400">
              {t("landing.cta.subtitle")}
            </p>
            <div className="pt-2">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="h-12 px-8 text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-100 gap-2 shadow-lg"
              >
                <span>{t("landing.cta.btn")}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Semantic Footer */}
      <LandingFooter />
    </div>
  );
}
