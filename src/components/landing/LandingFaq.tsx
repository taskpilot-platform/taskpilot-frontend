import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LandingFaq() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: t("landing.faq.q1"),
      a: t("landing.faq.a1"),
    },
    {
      q: t("landing.faq.q2"),
      a: t("landing.faq.a2"),
    },
    {
      q: t("landing.faq.q3"),
      a: t("landing.faq.a3"),
    },
    {
      q: t("landing.faq.q4"),
      a: t("landing.faq.a4"),
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
            {t("landing.faq.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {t("landing.faq.title")}
          </h2>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-foreground cursor-pointer hover:bg-muted/30 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
