import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LandingPricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
            {t("landing.pricing.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            {t("landing.pricing.title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Starter */}
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {t("landing.pricing.tier_starter_name")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("landing.pricing.tier_starter_desc")}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                  {t("landing.pricing.tier_starter_price")}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {t("landing.pricing.tier_starter_period")}
                </span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_starter_f1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_starter_f2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_starter_f3")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_starter_f4")}</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/register")}
              className="w-full text-xs font-semibold"
            >
              {t("landing.pricing.tier_starter_btn")}
            </Button>
          </div>

          {/* Tier 2: Pro Team (Featured Card) */}
          <div className="relative rounded-xl border-2 border-primary bg-card p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-[10px] font-mono font-bold tracking-wide uppercase shadow-sm">
                {t("landing.pricing.tier_pro_badge")}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {t("landing.pricing.tier_pro_name")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("landing.pricing.tier_pro_desc")}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                  {t("landing.pricing.tier_pro_price")}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {t("landing.pricing.tier_pro_period")}
                </span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border/60 text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_pro_f1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold">{t("landing.pricing.tier_pro_f2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_pro_f3")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_pro_f4")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_pro_f5")}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate("/register")}
              className="w-full text-xs font-semibold gap-1.5 shadow-sm"
            >
              <span>{t("landing.pricing.tier_pro_btn")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {t("landing.pricing.tier_enterprise_name")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("landing.pricing.tier_enterprise_desc")}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                  {t("landing.pricing.tier_enterprise_price")}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {t("landing.pricing.tier_enterprise_period")}
                </span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_enterprise_f1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_enterprise_f2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_enterprise_f3")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{t("landing.pricing.tier_enterprise_f4")}</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/register")}
              className="w-full text-xs font-semibold"
            >
              {t("landing.pricing.tier_enterprise_btn")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
