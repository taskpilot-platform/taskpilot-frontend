import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { themeStorage } from "@/lib/storage";

export default function AuthLayout() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // 1. Preserve user-chosen custom theme before switching auth pages to system theme
    const activeTheme = theme || localStorage.getItem("theme");
    if (activeTheme && activeTheme !== "system") {
      themeStorage.setUserTheme(activeTheme);
    }
    // 2. Auth layout strictly mirrors system / browser preference
    setTheme("system");
  }, [setTheme]);

  const toggleLanguage = () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-foreground selection:bg-primary/20 transition-colors duration-200">
      <div className="absolute right-4 top-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLanguage}
          title="Change Language"
          className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <img 
            src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"} 
            alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
            className="h-3.5 w-5 object-cover rounded-sm shadow-sm select-none"
          />
        </Button>
      </div>

      {/* Clean architectural grid texture - Adapts to Light and Dark mode without AI cosmic glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e780_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e780_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#3f3f4618_1px,transparent_1px),linear-gradient(to_bottom,#3f3f4618_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <section className="hidden lg:block space-y-6">
            <div className="inline-flex items-center rounded-md border border-zinc-300/80 bg-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900/60 px-3 py-1 text-xs font-mono font-medium tracking-wide text-zinc-700 dark:text-zinc-300 shadow-2xs">
              {t("auth.workspace_tag")}
            </div>
            <h2 className="max-w-md text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.15]">
              {t("auth.hero_title")}
            </h2>
            <p className="max-w-md text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
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
