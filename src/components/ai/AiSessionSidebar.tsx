import React, { useMemo } from "react";
import { Bot, Plus, ChevronLeft, ChevronRight, Menu, PencilLine, Trash2, Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { ChatSession } from "@/services/ai.service";
import { cleanSessionTitle } from "./aiChatHelpers";

interface SessionListItemProps {
  session: ChatSession;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onChangeTitle: (title: string) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  newChatLabel: string;
}

function SessionListItem({
  session,
  isActive,
  isEditing,
  editingTitle,
  onSelect,
  onStartEdit,
  onChangeTitle,
  onSaveTitle,
  onCancelEdit,
  onDelete,
  newChatLabel,
}: SessionListItemProps) {
  const displayTitle = cleanSessionTitle(session.title, newChatLabel);

  return (
    <div
      onClick={() => !isEditing && onSelect()}
      className={`mx-2 my-0.5 px-2.5 py-2 rounded-lg cursor-pointer flex items-center justify-between group transition-colors text-xs font-medium ${
        isActive
          ? "bg-accent text-accent-foreground font-semibold shadow-2xs border border-border/60"
          : "hover:bg-accent/60 text-muted-foreground hover:text-foreground border border-transparent"
      }`}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveTitle();
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            className="flex-1 text-xs bg-background border border-input rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shrink-0"
            onClick={onSaveTitle}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            onClick={onCancelEdit}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} />
            <span className="truncate text-foreground/90 leading-tight" title={displayTitle}>
              {displayTitle}
            </span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={onStartEdit}
              title="Đổi tên"
            >
              <PencilLine className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              title="Xóa"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function groupSessionsByTimeline(sessions: ChatSession[], t: (key: string, opts?: any) => string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const today: ChatSession[] = [];
  const past7Days: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const session of sessions) {
    const rawTime = (session as any).updatedAt || (session as any).createdAt;
    const time = rawTime ? new Date(rawTime).getTime() : 0;
    if (time >= startOfToday) {
      today.push(session);
    } else if (time >= sevenDaysAgo) {
      past7Days.push(session);
    } else {
      older.push(session);
    }
  }

  const groups: Array<{ label: string; items: ChatSession[] }> = [];
  if (today.length > 0) {
    groups.push({ label: t("copilot.group_today", { defaultValue: "Hôm nay" }), items: today });
  }
  if (past7Days.length > 0) {
    groups.push({ label: t("copilot.group_past_7_days", { defaultValue: "7 ngày qua" }), items: past7Days });
  }
  if (older.length > 0) {
    groups.push({ label: t("copilot.group_older", { defaultValue: "Cũ hơn" }), items: older });
  }

  // Fallback if no dates exist on sessions
  if (groups.length === 0 && sessions.length > 0) {
    groups.push({ label: t("copilot.title", { defaultValue: "Copilot" }), items: sessions });
  }

  return groups;
}

export interface AiSessionSidebarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onSelectSession: (s: ChatSession | null) => void;
  editingSessionId: number | null;
  editingTitle: string;
  onStartEditing: (id: number, title: string) => void;
  onChangeEditingTitle: (title: string) => void;
  onCancelEditing: () => void;
  onSaveEditingTitle: (sessionId: number) => Promise<void>;
  onDeleteSession: (e: React.MouseEvent, sessionId: number) => void;
  t: (key: string, opts?: any) => string;
}

export function AiSessionSidebar({
  isSidebarCollapsed,
  onToggleSidebar,
  sessions,
  activeSession,
  onSelectSession,
  editingSessionId,
  editingTitle,
  onStartEditing,
  onChangeEditingTitle,
  onCancelEditing,
  onSaveEditingTitle,
  onDeleteSession,
  t,
}: AiSessionSidebarProps) {
  const groupedSessions = useMemo(() => groupSessionsByTimeline(sessions, t), [sessions, t]);

  return (
    <div
      className={`hidden md:flex border-r border-border/80 flex-col bg-card/75 backdrop-blur-md transition-all duration-300 min-h-0 h-full ${
        isSidebarCollapsed ? "w-16 items-center" : "w-64"
      }`}
    >
      {/* Top Header */}
      <div
        className={`p-3 border-b border-border/60 flex items-center bg-transparent w-full ${
          isSidebarCollapsed ? "flex-col gap-2 px-0 justify-center" : "justify-between"
        }`}
      >
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="w-4 h-4" />
            </span>
            <span className="font-semibold text-sm tracking-tight text-foreground">
              {t("copilot.title", { defaultValue: "Copilot" })}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            title="Toggle Sidebar"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* New Chat Primary Action */}
      <div className={`p-2 border-b border-border/40 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
        {!isSidebarCollapsed ? (
          <Button
            onClick={() => onSelectSession(null)}
            className="w-full justify-start gap-2 h-8 text-xs font-semibold shadow-2xs"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("copilot.new_chat", { defaultValue: "Cuộc trò chuyện mới" })}</span>
          </Button>
        ) : (
          <Button
            onClick={() => onSelectSession(null)}
            size="icon"
            className="h-8 w-8"
            title={t("copilot.new_chat", { defaultValue: "Cuộc trò chuyện mới" })}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Sessions Grouped List */}
      <div className="flex-1 overflow-y-auto w-full py-2 space-y-4">
        {!isSidebarCollapsed &&
          groupedSessions.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70 select-none">
                {group.label}
              </div>
              {group.items.map((s) => (
                <SessionListItem
                  key={s.id}
                  session={s}
                  isActive={activeSession?.id === s.id}
                  isEditing={editingSessionId === s.id}
                  editingTitle={editingTitle}
                  onSelect={() => onSelectSession(s)}
                  onStartEdit={() => onStartEditing(s.id, cleanSessionTitle(s.title, t("copilot.new_chat")))}
                  onChangeTitle={onChangeEditingTitle}
                  onSaveTitle={() => void onSaveEditingTitle(s.id)}
                  onCancelEdit={onCancelEditing}
                  onDelete={(e) => onDeleteSession(e, s.id)}
                  newChatLabel={t("copilot.new_chat", { defaultValue: "Cuộc trò chuyện mới" })}
                />
              ))}
            </div>
          ))}

        {!isSidebarCollapsed && sessions.length === 0 && (
          <div className="text-center text-muted-foreground text-xs mt-6 px-4">
            {t("copilot.no_sessions", { defaultValue: "Chưa có cuộc trò chuyện nào." })}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AiMobileHeaderProps {
  isMobileSidebarOpen: boolean;
  onOpenChangeMobileSidebar: (open: boolean) => void;
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onSelectSession: (s: ChatSession | null) => void;
  editingSessionId: number | null;
  editingTitle: string;
  onStartEditing: (id: number, title: string) => void;
  onChangeEditingTitle: (title: string) => void;
  onCancelEditing: () => void;
  onSaveEditingTitle: (sessionId: number) => Promise<void>;
  onDeleteSession: (e: React.MouseEvent, sessionId: number) => void;
  t: (key: string, opts?: any) => string;
}

export function AiMobileHeader({
  isMobileSidebarOpen,
  onOpenChangeMobileSidebar,
  sessions,
  activeSession,
  onSelectSession,
  editingSessionId,
  editingTitle,
  onStartEditing,
  onChangeEditingTitle,
  onCancelEditing,
  onSaveEditingTitle,
  onDeleteSession,
  t,
}: AiMobileHeaderProps) {
  const groupedSessions = useMemo(() => groupSessionsByTimeline(sessions, t), [sessions, t]);

  return (
    <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border/80 bg-card/85 backdrop-blur-md relative z-20 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Sheet open={isMobileSidebarOpen} onOpenChange={onOpenChangeMobileSidebar}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent shrink-0">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card border-r border-border/80 flex flex-col h-full">
            <SheetTitle className="sr-only">Chat Sessions</SheetTitle>
            <SheetDescription className="sr-only">List of your TaskPilot chat sessions</SheetDescription>
            
            <div className="p-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="w-4 h-4" />
                </span>
                <span className="font-semibold text-sm text-foreground">
                  {t("copilot.title", { defaultValue: "Copilot" })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSelectSession(null);
                  onOpenChangeMobileSidebar(false);
                }}
                className="h-7 w-7 hover:bg-accent shrink-0"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-2 border-b border-border/40">
              <Button
                onClick={() => {
                  onSelectSession(null);
                  onOpenChangeMobileSidebar(false);
                }}
                className="w-full justify-start gap-2 h-8 text-xs font-semibold shadow-2xs"
                size="sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("copilot.new_chat", { defaultValue: "Cuộc trò chuyện mới" })}</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto w-full py-2 space-y-4">
              {groupedSessions.map((group) => (
                <div key={group.label} className="space-y-0.5">
                  <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70 select-none">
                    {group.label}
                  </div>
                  {group.items.map((s) => (
                    <SessionListItem
                      key={s.id}
                      session={s}
                      isActive={activeSession?.id === s.id}
                      isEditing={editingSessionId === s.id}
                      editingTitle={editingTitle}
                      onSelect={() => {
                        onSelectSession(s);
                        onOpenChangeMobileSidebar(false);
                      }}
                      onStartEdit={() => onStartEditing(s.id, cleanSessionTitle(s.title, t("copilot.new_chat")))}
                      onChangeTitle={onChangeEditingTitle}
                      onSaveTitle={() => void onSaveEditingTitle(s.id)}
                      onCancelEdit={onCancelEditing}
                      onDelete={(e) => onDeleteSession(e, s.id)}
                      newChatLabel={t("copilot.new_chat", { defaultValue: "Cuộc trò chuyện mới" })}
                    />
                  ))}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center text-muted-foreground text-xs mt-6 px-4">
                  {t("copilot.no_sessions", { defaultValue: "Chưa có cuộc trò chuyện nào." })}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <span className="font-semibold text-xs truncate max-w-[200px]">
          {activeSession ? cleanSessionTitle(activeSession.title, t("copilot.new_chat")) : t("copilot.title")}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSelectSession(null)}
        className="h-8 w-8 hover:bg-accent shrink-0"
        title="New Chat"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
