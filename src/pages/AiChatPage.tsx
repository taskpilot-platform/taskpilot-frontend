import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Bot } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { aiService, type ChatSession, type ChatMessage } from "@/services/ai.service";
import { projectService } from "@/services/project.service";
import { skillService } from "@/services/skill.service";
import { getApiErrorMessage } from "@/lib/http";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAiChatStream, MAX_PROMPT_CHARS } from "@/hooks/useAiChatStream";
import type { SkillDirectoryItem } from "@/types/user";
import type { AssignmentDraft } from "@/components/ai/aiChatTypes";
import { ChatComposer } from "@/components/ai/ChatComposer";
import { AiSessionSidebar, AiMobileHeader } from "@/components/ai/AiSessionSidebar";
import { AiMessageItem, AiStreamingPlaceholder } from "@/components/ai/AiMessageItem";

const AI_LOAD_SESSIONS_ERROR_TOAST_ID = "ai-load-sessions-error-toast";
const AI_LOAD_MESSAGES_ERROR_TOAST_ID = "ai-load-messages-error-toast";

export default function AiChatPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const isMobile = useIsMobile();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const activeSessionId = activeSession?.id ?? null;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, Record<string, string>>>({});
  const [planModificationTexts, setPlanModificationTexts] = useState<Record<string, string>>({});
  const [skillDirectory, setSkillDirectory] = useState<SkillDirectoryItem[]>([]);
  const [myProjects, setMyProjects] = useState<{ id: number; name: string }[]>([]);
  const [sprintsByProject, setSprintsByProject] = useState<Record<number, { id: number; name: string }[]>>({});
  const [membersByProject, setMembersByProject] = useState<Record<number, { id: number; name: string }[]>>({});
  const [labelsByProject, setLabelsByProject] = useState<Record<number, { id: number; name: string }[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const activeSessionIdRef = useRef<number | null>(null);
  const lastWarmedSessionIdRef = useRef<number | null>(null);

  activeSessionIdRef.current = activeSessionId;

  const loadSessions = useCallback(async () => {
    try {
      const data = await aiService.getSessions(0, 50);
      if (!isMountedRef.current) return;
      setSessions(data.content);
    } catch (error) {
      console.error("[AiChat] Failed to load chat sessions", error);
      toast.error(`${t("copilot.error_load_sessions")} ${getApiErrorMessage(error)}`, {
        toastId: AI_LOAD_SESSIONS_ERROR_TOAST_ID,
      });
    }
  }, [t]);

  const loadMessages = useCallback(
    async (sessionId: number, force = false) => {
      try {
        const data = await aiService.getMessages(sessionId, 0, 100);
        if (!isMountedRef.current) return;
        if (activeSessionIdRef.current !== sessionId) return;
        if (!force && isStreamingRef.current && streamingSessionIdRef.current === sessionId) {
          return;
        }
        const orderedMessages = [...data.content].reverse();

        if (force && sessionId === streamingSessionIdRef.current && toolEventsRef.current.length > 0) {
          const lastMsg = orderedMessages[orderedMessages.length - 1];
          if (lastMsg && lastMsg.sender === "ASSISTANT") {
            localMessageToolsRef.current[lastMsg.id] = [...toolEventsRef.current];
          }
        }

        orderedMessages.forEach((msg) => {
          if (localMessageToolsRef.current[msg.id]) {
            (msg as any).toolEvents = localMessageToolsRef.current[msg.id];
          }
        });

        setMessages(orderedMessages);
      } catch (error) {
        console.error("[AiChat] Failed to load messages", { sessionId, error });
        toast.error(`${t("copilot.error_load_messages")} ${getApiErrorMessage(error)}`, {
          toastId: AI_LOAD_MESSAGES_ERROR_TOAST_ID,
        });
      }
    },
    [t],
  );

  const {
    isStreaming,
    isThinking,
    currentStreamMsg,
    streamingSessionId,
    streamModel,
    toolEvents,
    expandedThinking,
    sendMessage,
    stopGenerating,
    confirmPendingAction,
    cancelPendingAction,
    restorePendingRequest,
    getLastPrompt,
    toolEventsRef,
    localMessageToolsRef,
    isStreamingRef,
    streamingSessionIdRef,
  } = useAiChatStream({
    activeSession,
    setActiveSession,
    sessions,
    setSessions,
    setMessages,
    loadMessages,
    loadSessions,
    accessToken,
    t,
  });

  useEffect(() => {
    isMountedRef.current = true;
    loadSessions();
    loadSkillDirectory();
    loadMyProjects();
    return () => {
      isMountedRef.current = false;
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [loadSessions]);

  // Effect #1: Load messages when active session ID changes (clears messages on new chat)
  useEffect(() => {
    if (activeSessionId) {
      void loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, loadMessages]);

  // Effect #2: Warmup session cache (only mark as warmed AFTER success, no retry loop)
  useEffect(() => {
    if (!activeSessionId) return;
    if (lastWarmedSessionIdRef.current === activeSessionId) return;

    aiService
      .warmupSession(activeSessionId)
      .then(() => {
        lastWarmedSessionIdRef.current = activeSessionId;
      })
      .catch((err) => {
        console.warn("[Cache Warming] Failed to trigger session warmup:", err);
      });
  }, [activeSessionId]);

  // Effect #3: Restore pending request if page was reloaded during streaming
  useEffect(() => {
    if (!activeSessionId) return;
    restorePendingRequest(activeSessionId);
  }, [activeSessionId, restorePendingRequest]);

  useEffect(() => {
    const pendingConfirmations = messages
      .filter((m) => m.sender === "ASSISTANT" && (m as any).toolEvents)
      .flatMap((m) => (m as any).toolEvents || [])
      .map((item: any) => item.confirmation)
      .filter((c: any) => !!c && c.status === "PENDING");

    for (const c of pendingConfirmations) {
      if (c.arguments && c.arguments.projectId) {
        const projectId = parseInt(String(c.arguments.projectId), 10);
        if (!isNaN(projectId)) {
          void loadSprintsForProject(projectId);
          void loadMembersForProject(projectId);
          void loadLabelsForProject(projectId);
        }
      }
    }
  }, [messages]);

  const scrollToBottom = useCallback((smooth = false) => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const isNearMessageBottom = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return true;
    return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearMessageBottom();
  }, [isNearMessageBottom]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollToBottom(!isStreamingRef.current);
      scrollRafRef.current = null;
    });
  }, [messages, currentStreamMsg, scrollToBottom]);

  useEffect(() => {
    const handleTypewriterTick = () => {
      if (!shouldAutoScrollRef.current) return;
      scrollToBottom(false);
    };
    window.addEventListener("taskpilot:ai-typewriter-tick", handleTypewriterTick);
    return () => window.removeEventListener("taskpilot:ai-typewriter-tick", handleTypewriterTick);
  }, [scrollToBottom]);

  async function loadMyProjects() {
    try {
      const response = await projectService.getMyProjects(0, 100);
      if (!isMountedRef.current) return;
      setMyProjects(response.data.content.map((p: any) => ({ id: p.id, name: p.name })));
    } catch {}
  }

  const loadSprintsForProject = async (projectId: number) => {
    if (sprintsByProject[projectId]) return;
    try {
      const { sprintService } = await import("@/services/sprint.service");
      const response = await sprintService.listSprints(projectId);
      if (!isMountedRef.current) return;
      setSprintsByProject((prev) => ({
        ...prev,
        [projectId]: response.data.map((s: any) => ({ id: s.id, name: s.name })),
      }));
    } catch {}
  };

  const loadMembersForProject = async (projectId: number) => {
    if (membersByProject[projectId]) return;
    try {
      const response = await projectService.getProjectMembers(projectId);
      if (!isMountedRef.current) return;
      setMembersByProject((prev) => ({
        ...prev,
        [projectId]: response.data.map((m: any) => ({ id: m.userId, name: m.fullName || `User ${m.userId}` })),
      }));
    } catch {}
  };

  const loadLabelsForProject = async (projectId: number) => {
    if (labelsByProject[projectId]) return;
    try {
      const { labelService } = await import("@/services/label.service");
      const response = await labelService.getProjectLabels(projectId);
      if (!isMountedRef.current) return;
      setLabelsByProject((prev) => ({
        ...prev,
        [projectId]: response.data.map((l: any) => ({ id: l.id, name: l.name })),
      }));
    } catch {}
  };

  const handleProjectSelected = useCallback((projectId: number) => {
    void loadSprintsForProject(projectId);
    void loadMembersForProject(projectId);
    void loadLabelsForProject(projectId);
  }, []);

  async function loadSkillDirectory() {
    try {
      const response = await skillService.getSkillDirectory();
      if (!isMountedRef.current) return;
      setSkillDirectory(response.data);
    } catch {}
  }

  async function handleDeleteSession(e: React.MouseEvent, sessionId: number) {
    e.stopPropagation();
    try {
      await aiService.deleteSession(sessionId);
      const newSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(newSessions);
      if (activeSession?.id === sessionId) {
        setActiveSession(newSessions[0] || null);
      }
      toast.success(t("copilot.success_delete_session"));
    } catch {
      toast.error(t("copilot.error_delete_session"));
    }
  }

  async function handleSaveTitle(sessionId: number) {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      toast.error("Tên cuộc hội thoại không được để trống");
      return;
    }

    try {
      await aiService.updateSessionTitle(sessionId, trimmedTitle);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: trimmedTitle } : s)));
      if (activeSession?.id === sessionId) {
        setActiveSession((prev: ChatSession | null) => (prev ? { ...prev, title: trimmedTitle } : null));
      }
      setEditingSessionId(null);
      toast.success("Đổi tên cuộc hội thoại thành công!");
    } catch {
      toast.error("Không thể đổi tên cuộc hội thoại");
    }
  }

  const updateDynamicFormValue = useCallback((formKey: string, fieldName: string, value: string) => {
    setDynamicFormValues((forms) => ({
      ...forms,
      [formKey]: {
        ...(forms[formKey] ?? {}),
        [fieldName]: value,
      },
    }));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <AiSessionSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={setActiveSession}
        editingSessionId={editingSessionId}
        editingTitle={editingTitle}
        onStartEditing={(id, title) => {
          setEditingSessionId(id);
          setEditingTitle(title);
        }}
        onChangeEditingTitle={setEditingTitle}
        onCancelEditing={() => setEditingSessionId(null)}
        onSaveEditingTitle={handleSaveTitle}
        onDeleteSession={handleDeleteSession}
        t={t}
      />

      <div className="flex-1 flex flex-col bg-transparent relative">
        <AiMobileHeader
          isMobileSidebarOpen={isMobileSidebarOpen}
          onOpenChangeMobileSidebar={setIsMobileSidebarOpen}
          sessions={sessions}
          activeSession={activeSession}
          onSelectSession={setActiveSession}
          editingSessionId={editingSessionId}
          editingTitle={editingTitle}
          onStartEditing={(id, title) => {
            setEditingSessionId(id);
            setEditingTitle(title);
          }}
          onChangeEditingTitle={setEditingTitle}
          onCancelEditing={() => setEditingSessionId(null)}
          onSaveEditingTitle={handleSaveTitle}
          onDeleteSession={handleDeleteSession}
          t={t}
        />

        <div
          ref={messagesViewportRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative z-10"
        >
          {messages.length === 0 && !currentStreamMsg && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
              <div className="bg-background/20 backdrop-blur-[40px] backdrop-saturate-150 p-4 sm:p-8 rounded-3xl border border-border/30 shadow-xl flex flex-col items-center max-w-lg w-full">
                <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground drop-shadow-sm sm:text-2xl">
                  {t("copilot.welcome_title")}
                </h3>
                <p className="text-foreground/90 font-medium mt-3 leading-relaxed drop-shadow-sm text-xs sm:text-sm">
                  {t("copilot.welcome_desc")}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <AiMessageItem
              key={msg.id || idx}
              msg={msg}
              idx={idx}
              t={t}
              confirmPendingAction={confirmPendingAction}
              cancelPendingAction={cancelPendingAction}
              dynamicFormValues={dynamicFormValues}
              updateDynamicFormValue={updateDynamicFormValue}
              planModificationTexts={planModificationTexts}
              setPlanModificationTexts={setPlanModificationTexts}
              setDynamicFormValues={setDynamicFormValues}
              assignmentDrafts={assignmentDrafts}
              setAssignmentDrafts={setAssignmentDrafts}
              skillDirectory={skillDirectory}
              myProjects={myProjects}
              sprintsByProject={sprintsByProject}
              membersByProject={membersByProject}
              labelsByProject={labelsByProject}
              onProjectSelected={handleProjectSelected}
              onSubmitPrompt={sendMessage}
            />
          ))}

          {isStreaming && activeSession?.id === streamingSessionId && (isThinking || currentStreamMsg) && (
            <AiStreamingPlaceholder
              currentStreamMsg={currentStreamMsg}
              toolEvents={toolEvents}
              expandedThinking={expandedThinking}
              isThinking={isThinking}
              t={t}
              confirmPendingAction={confirmPendingAction}
              cancelPendingAction={cancelPendingAction}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border/40 bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 relative z-10">
          <ChatComposer
            placeholder={
              t("copilot.input_placeholder") + (!isMobile ? " (Enter để gửi, Shift+Enter để xuống dòng)" : "")
            }
            modelName={streamModel || "TaskPilot AI"}
            maxChars={MAX_PROMPT_CHARS}
            getLastPrompt={getLastPrompt}
            onSubmit={sendMessage}
            isStreaming={isStreaming}
            onStop={stopGenerating}
            stopTooltip={t("copilot.stop_generating")}
          />
        </div>
      </div>
    </div>
  );
}
