import React from "react";
import { Bot, Plus, ChevronLeft, ChevronRight, Menu, PencilLine, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { ChatSession } from "@/services/ai.service";
import { stripThinkArtifacts } from "./aiChatHelpers";

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
  const displayTitle = stripThinkArtifacts(session.title) || newChatLabel;

  return (
    <div
      onClick={() => !isEditing && onSelect()}
      className={`p-3 px-4 cursor-pointer flex justify-between items-center group transition-colors ${
        isActive
          ? "bg-primary/15 text-primary dark:text-neutral-50 font-semibold"
          : "hover:bg-white/20 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium"
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
            className="flex-1 text-sm bg-white/80 dark:bg-black/40 border border-black/20 dark:border-white/20 rounded px-1.5 py-0.5 text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
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
            className="h-6 w-6 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
            onClick={onCancelEdit}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100" title={displayTitle}>
            {displayTitle}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/10"
              onClick={onStartEdit}
              title="Đổi tên"
            >
              <PencilLine className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-500 dark:text-neutral-400 hover:text-destructive hover:bg-destructive/10"
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
  t: (key: string) => string;
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
  return (
    <div
      className={`hidden md:flex border-r border-border/40 flex-col bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 transition-all duration-300 ${
        isSidebarCollapsed ? "w-16 items-center" : "w-64"
      }`}
    >
      <div
        className={`p-4 border-b border-border/40 flex items-center bg-transparent w-full ${
          isSidebarCollapsed ? "flex-col gap-4 px-0 justify-center" : "justify-between"
        }`}
      >
        {!isSidebarCollapsed && (
          <h2 className="font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
            <Bot className="w-5 h-5 text-primary shrink-0" /> {t("copilot.title")}
          </h2>
        )}
        <div className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-2" : "gap-1"}`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-8 w-8 hover:bg-primary/10 shrink-0"
            title="Toggle Sidebar"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSelectSession(null)}
            className="h-8 w-8 hover:bg-primary/10 shrink-0"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col w-full divide-y divide-border/20">
        {!isSidebarCollapsed &&
          sessions.map((s) => (
            <SessionListItem
              key={s.id}
              session={s}
              isActive={activeSession?.id === s.id}
              isEditing={editingSessionId === s.id}
              editingTitle={editingTitle}
              onSelect={() => onSelectSession(s)}
              onStartEdit={() => onStartEditing(s.id, stripThinkArtifacts(s.title) || t("copilot.new_chat"))}
              onChangeTitle={onChangeEditingTitle}
              onSaveTitle={() => void onSaveEditingTitle(s.id)}
              onCancelEdit={onCancelEditing}
              onDelete={(e) => onDeleteSession(e, s.id)}
              newChatLabel={t("copilot.new_chat")}
            />
          ))}
        {!isSidebarCollapsed && sessions.length === 0 && (
          <div className="text-center text-neutral-500 dark:text-neutral-400 text-sm mt-4 font-medium">
            {t("copilot.no_sessions")}
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
  t: (key: string) => string;
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
  return (
    <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 relative z-20">
      <Sheet open={isMobileSidebarOpen} onOpenChange={onOpenChangeMobileSidebar}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-background/95 backdrop-blur-xl border-r border-border/40">
          <SheetTitle className="sr-only">Chat Sessions</SheetTitle>
          <SheetDescription className="sr-only">List of your TaskPilot chat sessions</SheetDescription>
          <div className="flex flex-col h-full bg-transparent">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-transparent">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary shrink-0" /> {t("copilot.title")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSelectSession(null);
                  onOpenChangeMobileSidebar(false);
                }}
                className="h-8 w-8 hover:bg-primary/10 shrink-0"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-border/20">
              {sessions.map((s) => (
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
                  onStartEdit={() => onStartEditing(s.id, stripThinkArtifacts(s.title) || t("copilot.new_chat"))}
                  onChangeTitle={onChangeEditingTitle}
                  onSaveTitle={() => void onSaveEditingTitle(s.id)}
                  onCancelEdit={onCancelEditing}
                  onDelete={(e) => onDeleteSession(e, s.id)}
                  newChatLabel={t("copilot.new_chat")}
                />
              ))}
              {sessions.length === 0 && (
                <div className="text-center text-neutral-500 dark:text-neutral-400 text-sm mt-4 font-medium">
                  {t("copilot.no_sessions")}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <span className="font-semibold text-sm truncate max-w-[200px]">
        {activeSession ? stripThinkArtifacts(activeSession.title) || t("copilot.new_chat") : t("copilot.title")}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSelectSession(null)}
        className="h-8 w-8 hover:bg-primary/10 shrink-0"
        title="New Chat"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
