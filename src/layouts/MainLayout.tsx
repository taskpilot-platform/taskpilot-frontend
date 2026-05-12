import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "react-toastify";
import { LayoutDashboard, ShieldCheck, UserRound, LogOut, FolderKanban, Globe, Users, Code, Settings, Menu, ChevronLeft, Bot, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { profileService } from "@/services/profile.service";
import { notificationService } from "@/services/notification.service";
import { projectStorage } from "@/lib/storage";

export default function MainLayout() {
  const NOTIFICATION_BLINK_MS = 3000;

  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem("userRole"));
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationBlinking, setIsNotificationBlinking] = useState(false);

  useEffect(() => {
    // Lấy thông tin user để kiểm tra phân quyền Sidebar
    profileService.getMe()
      .then(res => {
        setUserRole(res.data.role);
        localStorage.setItem("userRole", res.data.role);
      })
      .catch(() => {
        setUserRole("USER");
        localStorage.removeItem("userRole");
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let previousCount = -1;

    const loadUnreadCount = async () => {
      try {
        const response = await notificationService.getUnreadCount();
        if (!isMounted) {
          return;
        }

        const nextCount = response.data;
        setUnreadCount(nextCount);

        if (
          previousCount >= 0 &&
          nextCount > previousCount &&
          !location.pathname.startsWith("/notifications")
        ) {
          setIsNotificationBlinking(true);
          window.setTimeout(() => setIsNotificationBlinking(false), NOTIFICATION_BLINK_MS);
        }

        previousCount = nextCount;
      } catch {
        // Ignore polling errors in sidebar.
      }
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 15000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [location.pathname, NOTIFICATION_BLINK_MS]);

  useEffect(() => {
    if (location.pathname.startsWith("/notifications")) {
      setIsNotificationBlinking(false);
    }
  }, [location.pathname]);

  const toggleLanguage = () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("layout.logout_success"));
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside
        className={`flex flex-col border-r bg-card py-4 text-card-foreground transition-all duration-300 ${isCollapsed ? "w-16 items-center px-2" : "w-64 px-4"
          }`}
      >
        <div className={`mb-4 flex items-center ${isCollapsed ? "flex-col gap-4" : "justify-between"}`}>
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <img src={logo} alt="TaskPilot logo" className="h-8 w-8" />
            )}
            {!isCollapsed && (
              <h2 className="text-lg font-bold tracking-tight">
                <span className="text-[#103E6A]">task</span>
                <span className="text-[#0394B1]">pilot</span>
              </h2>
            )}
          </div>
          <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "gap-1"}`}>
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} title="Toggle Sidebar">
              {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {!isCollapsed && (
              <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t("layout.change_lang", { defaultValue: "Change Language" })}>
                <Globe className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <nav className="space-y-2 w-full">
          {isCollapsed && (
            <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t("layout.change_lang", { defaultValue: "Change Language" })} className="mb-4 w-full">
              <Globe className="h-4 w-4" />
            </Button>
          )}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
              }`
            }
            title={t("layout.dashboard")}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t("layout.dashboard")}</span>}
          </NavLink>
          <NavLink
            to={projectStorage.getLastProjectId() ? `/projects/${projectStorage.getLastProjectId()}` : "/projects"}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
              }`
            }
            title={t("layout.projects")}
          >
            <FolderKanban className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t("layout.projects")}</span>}
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md ${isCollapsed ? "justify-center px-0" : "px-3"} py-2 transition-colors ${isActive
                ? "bg-accent font-medium"
                : isNotificationBlinking
                  ? "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200"
                  : "hover:bg-accent"
              }`
            }
            title={t("layout.notifications")}
          >
            <Bell className={`h-4 w-4 shrink-0 ${isNotificationBlinking ? "animate-pulse" : ""}`} />
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span>{t("layout.notifications")}</span>
                {unreadCount > 0 && (
                  <Badge className={isNotificationBlinking ? "animate-pulse bg-amber-500 text-amber-950" : ""}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </div>
            )}
            {isCollapsed && unreadCount > 0 && (
              <span className={`h-2 w-2 rounded-full bg-amber-500 ${isNotificationBlinking ? "animate-ping" : ""}`} />
            )}
          </NavLink>
          <NavLink
            to="/copilot"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium text-indigo-600" : "hover:bg-accent text-indigo-600/80"
              }`
            }
            title="Copilot AI Chat"
          >
            <Bot className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Copilot</span>}
          </NavLink>
        </nav>

        <div className="mt-auto">
          <div className="mb-3 space-y-2">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
                }`
              }
              title={t("layout.profile")}
            >
              <UserRound className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t("layout.profile")}</span>}
            </NavLink>

            <NavLink
              to="/my-skills"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
                }`
              }
              title={t("layout.my_skills")}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t("layout.my_skills")}</span>}
            </NavLink>

            {userRole === "ADMIN" && (
              <div className="pt-2">
                {!isCollapsed && <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">Admin</p>}
                {isCollapsed && <div className="mx-auto my-2 block h-px w-8 bg-border" />}
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    `mt-2 flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
                    }`
                  }
                  title={t("admin.users_title")}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t("admin.users_title")}</span>}
                </NavLink>
                <NavLink
                  to="/admin/skills"
                  className={({ isActive }) =>
                    `mt-1 flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
                    }`
                  }
                  title={t("admin.global_skills")}
                >
                  <Code className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t("admin.global_skills")}</span>}
                </NavLink>
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) =>
                    `mt-1 flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
                    }`
                  }
                  title={t("admin.system_settings.title", { defaultValue: "Cấu hình AI & Hệ thống" })}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{t("admin.system_settings.title", { defaultValue: "Cấu hình AI & Hệ thống" })}</span>}
                </NavLink>
              </div>
            )}
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full gap-2 ${isCollapsed ? 'px-0 justify-center' : ''}`}
            disabled={isLoading}
            title={isLoading ? t("layout.logging_out") : t("layout.logout")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{isLoading ? t("layout.logging_out") : t("layout.logout")}</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
