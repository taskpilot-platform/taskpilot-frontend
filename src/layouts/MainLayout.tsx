import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { UserProfile } from "@/types/user";
import type { NotificationItem } from "@/types/notification";
import { LayoutDashboard, ShieldCheck, UserRound, LogOut, FolderKanban, Users, Code, Settings, Menu, ChevronLeft, Bot, Bell, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { profileService } from "@/services/profile.service";
import { notificationService } from "@/services/notification.service";
import { authStorage, projectStorage } from "@/lib/storage";

const NOTIFICATION_BLINK_MS = 3000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "";
type NotificationUnreadListener = (count: number) => void;

let notificationStreamController: AbortController | null = null;
let notificationStreamToken: string | null = null;
let notificationStreamConsumers = 0;
const notificationUnreadListeners = new Set<NotificationUnreadListener>();

const stopNotificationStream = () => {
  if (notificationStreamController && !notificationStreamController.signal.aborted) {
    notificationStreamController.abort();
  }
  notificationStreamController = null;
  notificationStreamToken = null;
};

const parseNotificationUnreadCount = (raw: string): number | null => {
  try {
    const parsed = Number(JSON.parse(raw));
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
};

const notifyUnreadListeners = (count: number) => {
  notificationUnreadListeners.forEach((listener) => {
    listener(count);
  });
};

const startNotificationStream = (token: string) => {
  const hasActiveStream =
    notificationStreamController !== null &&
    !notificationStreamController.signal.aborted &&
    notificationStreamToken === token;

  if (hasActiveStream) {
    return;
  }

  stopNotificationStream();

  const controller = new AbortController();
  notificationStreamController = controller;
  notificationStreamToken = token;

  void fetchEventSource(`${API_BASE_URL}/v1/notifications/my/stream`, {
    signal: controller.signal,
    openWhenHidden: true,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    async onopen(response) {
      if (response.status === 401) {
        stopNotificationStream();
        authStorage.clear();
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        throw new Error("Invalid notification SSE response");
      }
    },
    onmessage(event) {
      if (event.event === "notification.unread-count") {
        const nextCount = parseNotificationUnreadCount(event.data);
        if (nextCount !== null) {
          notifyUnreadListeners(nextCount);
        }
      } else if (event.event === "notification.created") {
        try {
          const item: NotificationItem = JSON.parse(event.data);
          toast.info(`🔔 ${item.title}: ${item.message}`, {
            onClick: () => {
              window.location.href = `/notifications/${item.id}`;
            },
          });
          window.dispatchEvent(new CustomEvent("notificationCreated", { detail: item }));
        } catch {
          // Ignore JSON parse errors
        }
      }
    },
    onerror(error) {
      throw error;
    },
  }).catch((error) => {
    const isAbortError = error instanceof DOMException && error.name === "AbortError";
    if (!controller.signal.aborted && !isAbortError) {
      console.error("Notification stream disconnected", error);
    }
  });
};

const attachNotificationUnreadListener = (listener: NotificationUnreadListener) => {
  notificationUnreadListeners.add(listener);
  notificationStreamConsumers += 1;

  return () => {
    notificationUnreadListeners.delete(listener);
    notificationStreamConsumers = Math.max(0, notificationStreamConsumers - 1);
    if (notificationStreamConsumers === 0) {
      stopNotificationStream();
    }
  };
};

export default function MainLayout() {
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem("userRole"));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationBlinking, setIsNotificationBlinking] = useState(false);

  useEffect(() => {
    const fetchProfile = () => {
      profileService.getMe()
        .then(res => {
          setProfile(res.data);
          setUserRole(res.data.role);
          localStorage.setItem("userRole", res.data.role);
        })
        .catch(() => {
          setUserRole("USER");
          localStorage.removeItem("userRole");
        });
    };
    
    fetchProfile();
    window.addEventListener('profileUpdated', fetchProfile);
    return () => window.removeEventListener('profileUpdated', fetchProfile);
  }, []);

  const currentPathRef = useRef(location.pathname);
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadUnreadCount = async () => {
      try {
        const response = await notificationService.getUnreadCount();
        if (!isMounted) {
          return;
        }
        setUnreadCount(response.data);
      } catch {
        // Ignore errors in sidebar.
      }
    };

    void loadUnreadCount();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith("/notifications")) {
      return;
    }

    const timeoutId = window.setTimeout(() => setIsNotificationBlinking(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    const token = accessToken ?? authStorage.getAccessToken();
    if (!token) {
      stopNotificationStream();
      return;
    }

    const detachUnreadListener = attachNotificationUnreadListener((nextCount) => {
      setUnreadCount((prev) => {
        if (nextCount > prev && !currentPathRef.current.startsWith("/notifications")) {
          setIsNotificationBlinking(true);
          window.setTimeout(() => setIsNotificationBlinking(false), NOTIFICATION_BLINK_MS);
        }
        return nextCount;
      });
    });
    startNotificationStream(token);

    return () => {
      detachUnreadListener();
    };
  }, [accessToken]);

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
      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col bg-card py-4 px-4 text-card-foreground">
              {/* Logo */}
              <div className="mb-4 flex items-center gap-2">
                <img src={logo} alt="TaskPilot logo" className="h-8 w-8" />
                <h2 className="text-lg font-bold tracking-tight">
                  <span className="text-[#103E6A]">task</span>
                  <span className="text-[#0394B1]">pilot</span>
                </h2>
              </div>

              {/* Navigation - same items as desktop but always expanded */}
              <nav className="space-y-2 w-full flex-1">
                {/* Language toggle */}
                <Button variant="ghost" size="sm" onClick={toggleLanguage} className="mb-2 w-full justify-start gap-2">
                  <img 
                    src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"} 
                    alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
                    className="h-3.5 w-5 object-cover rounded-sm shadow-sm select-none"
                  />
                  <span>{i18n.language === "vi" ? "Tiếng Việt" : "English"}</span>
                </Button>

                {/* All NavLinks - use onClick to close sheet after navigation */}
                <NavLink to="/" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("layout.dashboard")}>
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>{t("layout.dashboard")}</span>
                </NavLink>
                
                <NavLink to={projectStorage.getLastProjectId() ? `/projects/${projectStorage.getLastProjectId()}` : "/projects"} onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("layout.projects")}>
                  <FolderKanban className="h-4 w-4 shrink-0" />
                  <span>{t("layout.projects")}</span>
                </NavLink>

                <NavLink to="/notifications" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : isNotificationBlinking ? "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200" : "hover:bg-accent"}`} title={t("layout.notifications")}>
                  <Bell className={`h-4 w-4 shrink-0 ${isNotificationBlinking ? "animate-pulse" : ""}`} />
                  <div className="flex items-center gap-2">
                    <span>{t("layout.notifications")}</span>
                    {unreadCount > 0 && <Badge className={isNotificationBlinking ? "animate-pulse bg-amber-500 text-amber-950" : ""}>{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
                  </div>
                </NavLink>

                <NavLink to="/comments" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("layout.comments", { defaultValue: "Comments" })}>
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span>{t("layout.comments", { defaultValue: "Comments" })}</span>
                </NavLink>

                <NavLink to="/copilot" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium text-indigo-600" : "hover:bg-accent text-indigo-600/80"}`} title={t("layout.copilot", { defaultValue: "Copilot AI Chat" })}>
                  <Bot className="h-4 w-4 shrink-0" />
                  <span>{t("layout.copilot", { defaultValue: "Copilot" })}</span>
                </NavLink>
              </nav>

              {/* Bottom section */}
              <div className="mt-auto">
                <div className="mb-3 space-y-2">
                  <NavLink to="/profile" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("layout.profile")}>
                    {profile ? <UserAvatar avatarUrl={profile.avatarUrl} name={profile.fullName || `User ${profile.id}`} className="h-5 w-5 shrink-0 bg-transparent" /> : <UserRound className="h-4 w-4 shrink-0" />}
                    <span>{t("layout.profile")}</span>
                  </NavLink>

                  <NavLink to="/my-skills" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("layout.my_skills")}>
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>{t("layout.my_skills")}</span>
                  </NavLink>

                  {userRole === "ADMIN" && (
                    <div className="pt-2">
                      <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">Admin</p>
                      <NavLink to="/admin/users" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `mt-2 flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("admin.users_title")}>
                        <Users className="h-4 w-4 shrink-0" />
                        <span>{t("admin.users_title")}</span>
                      </NavLink>
                      <NavLink to="/admin/skills" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `mt-1 flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("admin.global_skills")}>
                        <Code className="h-4 w-4 shrink-0" />
                        <span>{t("admin.global_skills")}</span>
                      </NavLink>
                      <NavLink to="/admin/settings" onClick={() => setIsMobileNavOpen(false)} className={({isActive}) => `mt-1 flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"}`} title={t("admin.system_settings.title", { defaultValue: "Cấu hình AI & Hệ thống" })}>
                        <Settings className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t("admin.system_settings.title", { defaultValue: "Cấu hình AI & Hệ thống" })}</span>
                      </NavLink>
                    </div>
                  )}
                </div>

                <Button onClick={() => { setIsMobileNavOpen(false); void handleLogout(); }} variant="outline" className="w-full gap-2" disabled={isLoading} title={isLoading ? t("layout.logging_out") : t("layout.logout")}>
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>{isLoading ? t("layout.logging_out") : t("layout.logout")}</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center logo */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="TaskPilot" className="h-6 w-6" />
          <span className="text-sm font-bold">
            <span className="text-[#103E6A]">task</span>
            <span className="text-[#0394B1]">pilot</span>
          </span>
        </div>

        {/* Right side: notification + user avatar */}
        <div className="flex items-center gap-1">
          <NavLink to="/notifications" className="relative p-2">
            <Bell className={`h-5 w-5 ${isNotificationBlinking ? "animate-pulse text-amber-500" : "text-muted-foreground"}`} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile">
            {profile ? <UserAvatar avatarUrl={profile.avatarUrl} name={profile.fullName || ''} className="h-7 w-7 shrink-0" /> : <UserRound className="h-5 w-5 text-muted-foreground" />}
          </NavLink>
        </div>
      </div>

      <aside
        className={`hidden md:flex flex-col border-r bg-card py-4 text-card-foreground transition-all duration-300 ${isCollapsed ? "w-16 items-center px-2" : "w-64 px-4"
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
                <img 
                  src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"} 
                  alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
                  className="h-3.5 w-5 object-cover rounded-sm shadow-sm select-none"
                />
              </Button>
            )}
          </div>
        </div>

        <nav className="space-y-2 w-full">
          {isCollapsed && (
            <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t("layout.change_lang", { defaultValue: "Change Language" })} className="mb-4 w-full flex justify-center">
              <img 
                src={i18n.language === "vi" ? "https://flagcdn.com/w40/vn.png" : "https://flagcdn.com/w40/gb.png"} 
                alt={i18n.language === "vi" ? "Tiếng Việt" : "English"}
                className="h-3.5 w-5 object-cover rounded-sm shadow-sm select-none"
              />
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
            to="/comments"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent"
              }`
            }
            title={t("layout.comments", { defaultValue: "Comments" })}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t("layout.comments", { defaultValue: "Comments" })}</span>}
          </NavLink>
          <NavLink
            to="/copilot"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2 transition-colors ${isActive ? "bg-accent font-medium text-indigo-600" : "hover:bg-accent text-indigo-600/80"
              }`
            }
            title={t("layout.copilot", { defaultValue: "Copilot AI Chat" })}
          >
            <Bot className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t("layout.copilot", { defaultValue: "Copilot" })}</span>}
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
              {profile ? (
                <UserAvatar avatarUrl={profile.avatarUrl} name={profile.fullName || `User ${profile.id}`} className="h-5 w-5 shrink-0 bg-transparent" />
              ) : (
                <UserRound className="h-4 w-4 shrink-0" />
              )}
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

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
