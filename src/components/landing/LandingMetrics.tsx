import { useTranslation } from "react-i18next";

export function LandingMetrics() {
  const { t } = useTranslation();

  const metrics = [
    {
      value: t("landing.metrics.item_1_val"),
      label: t("landing.metrics.item_1_label"),
    },
    {
      value: t("landing.metrics.item_2_val"),
      label: t("landing.metrics.item_2_label"),
    },
    {
      value: t("landing.metrics.item_3_val"),
      label: t("landing.metrics.item_3_label"),
    },
    {
      value: t("landing.metrics.item_4_val"),
      label: t("landing.metrics.item_4_label"),
    },
  ];

  return (
    <section className="py-16 border-y border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {metrics.map((m, index) => (
            <div key={index} className={`text-center space-y-1.5 ${index > 0 ? "pt-4 sm:pt-0" : ""}`}>
              <span className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground font-mono">
                {m.value}
              </span>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
