import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { themeStorage } from "@/lib/storage";
import { AuthLiveShowcase } from "@/components/auth/AuthLiveShowcase";

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
      {/* Top Left: Back to Landing Page / Home */}
      <div className="absolute left-4 top-4 z-50">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white shadow-2xs backdrop-blur-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("auth.back_to_home", { defaultValue: "Quay lại trang chủ" })}</span>
        </Link>
      </div>

      {/* Top Right: Language Switcher */}
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

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          {/* Dynamic Interactive Showcase in Left Column */}
          <section className="hidden lg:block">
            <AuthLiveShowcase />
          </section>

          <section className="mx-auto w-full max-w-md">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
