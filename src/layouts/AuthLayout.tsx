import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function AuthLayout() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-foreground selection:bg-primary/20">
      <div className="absolute right-4 top-4 z-50">
        <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Change Language" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">
          <img 
            src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"} 
            alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
            className="h-3.5 w-5 object-cover rounded-sm shadow-sm select-none"
          />
        </Button>
      </div>

      {/* Clean architectural grid texture - No AI purple/cyan cosmic glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#3f3f4618_1px,transparent_1px),linear-gradient(to_bottom,#3f3f4618_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <section className="hidden text-zinc-100 lg:block space-y-6">
            <div className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-mono font-medium tracking-wide text-zinc-300">
              {t("auth.workspace_tag")}
            </div>
            <h2 className="max-w-md text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-100 leading-[1.15]">
              {t("auth.hero_title")}
            </h2>
            <p className="max-w-md text-base text-zinc-400 leading-relaxed font-normal">
              {t("auth.hero_desc")}
            </p>
          </section>

          <section className="mx-auto w-full max-w-md">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
