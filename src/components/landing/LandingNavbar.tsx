import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Sun, Moon, Sparkles, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { themeStorage } from "@/lib/storage";
import logo from "@/assets/logo.svg";

export function LandingNavbar() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
  };

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "glass"> = ["light", "dark", "glass"];
    const current = (theme as "light" | "dark" | "glass") || "light";
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    const nextTheme = order[nextIndex];
    themeStorage.setUserTheme(nextTheme);
    setTheme(nextTheme);
  };

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <img src={logo} alt="TaskPilot Logo" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-[#103E6A] dark:text-zinc-100">task</span>
            <span className="text-[#0394B1]">pilot</span>
          </span>
          <span className="hidden sm:inline-flex items-center rounded-sm border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
            v2.0
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <button
            onClick={() => scrollToSection("features")}
            className="transition-colors hover:text-foreground cursor-pointer"
          >
            {t("landing.nav.features")}
          </button>
          <button
            onClick={() => scrollToSection("copilot")}
            className="transition-colors hover:text-foreground cursor-pointer"
          >
            {t("landing.nav.copilot")}
          </button>
          <button
            onClick={() => scrollToSection("meetings")}
            className="transition-colors hover:text-foreground cursor-pointer"
          >
            {t("landing.nav.meetings")}
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="transition-colors hover:text-foreground cursor-pointer"
          >
            {t("landing.nav.pricing")}
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="transition-colors hover:text-foreground cursor-pointer"
          >
            {t("landing.nav.faq")}
          </button>
        </nav>

        {/* Actions & Utilities */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            title={i18n.language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <img
              src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"}
              alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
              className="h-3.5 w-5 rounded-xs object-cover select-none"
            />
          </Button>

          {/* Theme Cycler (Light -> Dark -> Glass) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            title={`Current theme: ${theme || "light"}. Click to toggle.`}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : theme === "glass" ? (
              <Sparkles className="h-4 w-4 text-emerald-500" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Auth State CTAs */}
          {isAuthenticated ? (
            <Button
              size="sm"
              onClick={() => navigate("/projects")}
              className="hidden sm:inline-flex gap-1.5 text-xs font-medium"
            >
              <span>{t("landing.nav.dashboard")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {t("landing.nav.login")}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/register")}
                className="hidden sm:inline-flex gap-1.5 text-xs font-medium"
              >
                <span>{t("landing.nav.get_started")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {/* Mobile & Tablet Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-8 w-8 lg:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <button
              onClick={() => scrollToSection("features")}
              className="text-left py-2 px-3 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {t("landing.nav.features")}
            </button>
            <button
              onClick={() => scrollToSection("copilot")}
              className="text-left py-2 px-3 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {t("landing.nav.copilot")}
            </button>
            <button
              onClick={() => scrollToSection("meetings")}
              className="text-left py-2 px-3 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {t("landing.nav.meetings")}
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-left py-2 px-3 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {t("landing.nav.pricing")}
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-left py-2 px-3 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {t("landing.nav.faq")}
            </button>
          </nav>

          <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/projects")} className="w-full justify-center text-xs">
                {t("landing.nav.dashboard")}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/login")} className="w-full justify-center text-xs">
                  {t("landing.nav.login")}
                </Button>
                <Button onClick={() => navigate("/register")} className="w-full justify-center text-xs">
                  {t("landing.nav.get_started")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
