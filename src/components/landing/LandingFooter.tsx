import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.svg";

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/70 bg-card/60 backdrop-blur-xs py-12 text-muted-foreground text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="TaskPilot Logo" className="h-6 w-6 object-contain" />
              <span className="text-base font-bold tracking-tight">
                <span className="text-[#103E6A] dark:text-zinc-100">task</span>
                <span className="text-[#0394B1]">pilot</span>
              </span>
            </Link>
            <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
              {t("landing.footer.tagline")}
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono">
              {t("landing.footer.product")}
            </h4>
            <ul className="space-y-2">
              <li><a href="#copilot" className="hover:text-foreground transition-colors">AI Copilot</a></li>
              <li><a href="#meetings" className="hover:text-foreground transition-colors">HD Video Meetings</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">RAG Knowledge</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono">
              {t("landing.footer.resources")}
            </h4>
            <ul className="space-y-2">
              <li><Link to="/login" className="hover:text-foreground transition-colors">Web App Login</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition-colors">Create Account</Link></li>
              <li><a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Sitemap XML</a></li>
              <li><a href="/robots.txt" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Robots.txt</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono">
              {t("landing.footer.company")}
            </h4>
            <ul className="space-y-2">
              <li><span className="cursor-default">{t("landing.footer.privacy")}</span></li>
              <li><span className="cursor-default">{t("landing.footer.terms")}</span></li>
              <li><span className="text-emerald-500 font-mono">All Systems Operational</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>{t("landing.footer.copyright")}</p>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Netlify Edge CDN</span>
            <span>•</span>
            <span>Zero-Retention AI</span>
            <span>•</span>
            <span>AES-256</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
