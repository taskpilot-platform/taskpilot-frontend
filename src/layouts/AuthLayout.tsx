import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLayout() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-foreground">
      <div className="absolute right-4 top-4 z-50">
        <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Change Language" className="text-slate-300 hover:text-white">
          <img 
            src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"} 
            alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
            className="h-3.5 w-5 object-cover rounded-sm shadow-sm select-none"
          />
        </Button>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#082f49_100%)]" />
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-2">
          <section className="hidden text-slate-100 lg:block">
            <p className="mb-3 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wider">
              {t("auth.workspace_tag")}
            </p>
            <h2 className="max-w-md text-4xl font-bold leading-tight">
              {t("auth.hero_title")}
            </h2>
            <p className="mt-4 max-w-lg text-slate-300">
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
