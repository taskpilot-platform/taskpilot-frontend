import { Briefcase, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export type NavigationContext = "WORKSPACE" | "ADMIN_SYSTEM";

interface NavContextSwitcherProps {
  currentContext: NavigationContext;
  onContextChange: (ctx: NavigationContext) => void;
  isCollapsed?: boolean;
  isMobile?: boolean;
  userRole?: string | null;
}

export function NavContextSwitcher({
  currentContext,
  onContextChange,
  isCollapsed = false,
  isMobile = false,
  userRole,
}: NavContextSwitcherProps) {
  const { t } = useTranslation();

  // Only users with multiple privilege scopes (e.g. system ADMIN) see the context switcher
  if (userRole !== "ADMIN") {
    return null;
  }

  // Collapsed sidebar mode: compact icon button with toggle action
  if (isCollapsed && !isMobile) {
    const isWorkspace = currentContext === "WORKSPACE";
    const nextContext: NavigationContext = isWorkspace ? "ADMIN_SYSTEM" : "WORKSPACE";
    const titleText = isWorkspace
      ? `${t("layout.context_switcher", { defaultValue: "Chuyển ngữ cảnh" })}: ${t("layout.context_admin", { defaultValue: "Quản trị hệ thống" })}`
      : `${t("layout.context_switcher", { defaultValue: "Chuyển ngữ cảnh" })}: ${t("layout.context_workspace", { defaultValue: "Không gian làm việc" })}`;

    return (
      <div className="mb-3 w-full flex justify-center">
        <button
          type="button"
          onClick={() => onContextChange(nextContext)}
          className={`h-9 w-9 rounded-md flex items-center justify-center border transition-all ${
            isWorkspace
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
          }`}
          title={titleText}
          aria-label={titleText}
          data-testid="nav-context-switcher-collapsed"
        >
          {isWorkspace ? (
            <Briefcase className="h-4 w-4 shrink-0" />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    );
  }

  // Expanded desktop & mobile sheet mode: segmented tactile pill control
  return (
    <div
      className={`mb-3 ${isMobile ? "w-full" : "w-full"}`}
      data-testid="nav-context-switcher"
    >
      <div
        role="tablist"
        aria-label={t("layout.context_switcher", { defaultValue: "Chuyển ngữ cảnh" })}
        className="grid grid-cols-2 p-0.5 bg-muted/70 rounded-lg border border-border/70 text-xs font-medium"
      >
        <button
          type="button"
          role="tab"
          aria-selected={currentContext === "WORKSPACE"}
          onClick={() => onContextChange("WORKSPACE")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all select-none ${
            currentContext === "WORKSPACE"
              ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
          title={t("layout.context_workspace_desc", { defaultValue: "Dự án, họp nhóm & xử lý công việc" })}
          data-testid="context-btn-workspace"
        >
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t("layout.context_workspace", { defaultValue: "Không gian làm việc" })}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentContext === "ADMIN_SYSTEM"}
          onClick={() => onContextChange("ADMIN_SYSTEM")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all select-none ${
            currentContext === "ADMIN_SYSTEM"
              ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
          title={t("layout.context_admin_desc", { defaultValue: "Người dùng, kỹ năng & cấu hình hệ thống" })}
          data-testid="context-btn-admin"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t("layout.context_admin", { defaultValue: "Quản trị hệ thống" })}
          </span>
        </button>
      </div>
    </div>
  );
}
