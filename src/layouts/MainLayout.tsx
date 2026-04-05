import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FloatingChat } from "@/components/FloatingChat";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "react-toastify";
import { LayoutDashboard, ShieldCheck, UserRound, LogOut, FolderKanban, ListChecks, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MainLayout() {
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Đăng xuất thành công");
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r bg-card p-4 text-card-foreground">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="TaskPilot logo" className="h-8 w-8" />
            <h2 className="text-lg font-bold tracking-tight">
              <span className="text-[#103E6A]">task</span>
              <span className="text-[#0394B1]">pilot</span>
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Change Language">
            <Globe className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                isActive ? "bg-accent font-medium" : "hover:bg-accent"
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            {t("layout.dashboard")}
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                isActive ? "bg-accent font-medium" : "hover:bg-accent"
              }`
            }
          >
            <FolderKanban className="h-4 w-4" />
            {t("layout.projects")}
          </NavLink>
          <NavLink
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent"
          >
            <ListChecks className="h-4 w-4" />
            {t("layout.tasks_upcoming")}
          </NavLink>
        </nav>

        <div className="mt-auto">
          <div className="mb-3 space-y-2">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                  isActive ? "bg-accent font-medium" : "hover:bg-accent"
                }`
              }
            >
              <UserRound className="h-4 w-4" />
              {t("layout.profile")}
            </NavLink>

            <NavLink
              to="/my-skills"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                  isActive ? "bg-accent font-medium" : "hover:bg-accent"
                }`
              }
            >
              <ShieldCheck className="h-4 w-4" />
              {t("layout.my_skills")}
            </NavLink>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full gap-2"
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4" />
            {isLoading ? t("layout.logging_out") : t("layout.logout")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <FloatingChat />
    </div>
  );
}
