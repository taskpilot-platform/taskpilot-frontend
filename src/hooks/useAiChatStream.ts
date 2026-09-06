import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { getApiErrorMessage } from "@/lib/http";
import { aiService, type ChatSession, type ChatMessage } from "@/services/ai.service";
import type { ChatStreamPhase } from "@/types/chat-stream";
import type {
  ToolEvent,
  PendingActionConfirmation,
  ConfirmedTaskMutation,
} from "@/components/ai/aiChatTypes";
import {
  dedupeToolEvents,
  extractThinkPayload,
  mutationFromConfirmation,
  notifyTaskMutation,
} from "@/components/ai/aiChatHelpers";

export const MAX_PROMPT_CHARS = 4000;
const STREAM_STATUS_NULL_RETRY_LIMIT = 3;
const STREAM_STATUS_ERROR_RETRY_LIMIT = 3;
const AI_STREAM_ERROR_TOAST_ID = "ai-stream-error-toast";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const WRITE_TOOL_NAMES = new Set([
  "createTask",
  "updateTask",
  "deleteTask",
  "assignTask",
  "recommendAndAssignTask",
  "createProject",
  "updateProject",
  "deleteProject",
  "createSprint",
  "updateSprint",
  "deleteSprint",
  "addComment",
  "updateComment",
  "deleteComment",
]);

interface UseAiChatStreamOptions {
  activeSession: ChatSession | null;
  setActiveSession: (s: ChatSession | null) => void;
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  loadMessages: (sessionId: number, force?: boolean) => Promise<void>;
  loadSessions: () => Promise<void>;
  accessToken: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function useAiChatStream({
  activeSession,
  setActiveSession,
  sessions,
  setSessions,
  setMessages,
  loadMessages,
  loadSessions,
  accessToken,
  t,
}: UseAiChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStreamMsg, setCurrentStreamMsg] = useState("");
  const [streamingSessionId, setStreamingSessionId] = useState<number | null>(null);
  const [streamPhase, setStreamPhase] = useState<ChatStreamPhase | null>(null);
  const [streamModel, setStreamModel] = useState<string>("");
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null);

  const toolEventsRef = useRef<ToolEvent[]>([]);
  const localMessageToolsRef = useRef<Record<number, ToolEvent[]>>({});
  const lastPromptRef = useRef("");
  const activeStreamControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isStreamingRef = useRef(false);
  const activeSessionIdRef = useRef<number | null>(null);
  const streamingSessionIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;
  const loadSessionsRef = useRef(loadSessions);
  loadSessionsRef.current = loadSessions;
  const currentStreamMsgRef = useRef(currentStreamMsg);
  currentStreamMsgRef.current = currentStreamMsg;

  const targetStreamTextRef = useRef("");
  const typewriterTimerRef = useRef<number | null>(null);
  const lastTypewriterPaintRef = useRef(0);
  const streamCompletedRef = useRef(false);
  const isFinalizingRef = useRef(false);
  const pendingConfirmedMutationRef = useRef<ConfirmedTaskMutation | null>(null);

  activeSessionIdRef.current = activeSession?.id ?? null;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (typewriterTimerRef.current) {
        window.cancelAnimationFrame(typewriterTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.id ?? null;
  }, [activeSession]);

  useEffect(() => {
    if (accessToken) return;
    if (activeStreamControllerRef.current) {
      activeStreamControllerRef.current.abort();
      activeStreamControllerRef.current = null;
    }
  }, [accessToken]);

  const pendingKey = (sessionId: number) => `ai.pending.request.${sessionId}`;

  const savePendingRequest = (sessionId: number, clientMessageId: string) => {
    localStorage.setItem(pendingKey(sessionId), clientMessageId);
  };

  const clearPendingRequest = (sessionId: number) => {
    localStorage.removeItem(pendingKey(sessionId));
  };

  const getPendingRequest = (sessionId: number) => {
    return localStorage.getItem(pendingKey(sessionId));
  };

  const stopPolling = () => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const clearTypewriter = () => {
    if (typewriterTimerRef.current) {
      window.cancelAnimationFrame(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    targetStreamTextRef.current = "";
    lastTypewriterPaintRef.current = 0;
    streamCompletedRef.current = false;
  };

  const resetStreamingUi = () => {
    isStreamingRef.current = false;
    streamingSessionIdRef.current = null;
    setIsStreaming(false);
    setIsThinking(false);
    setCurrentStreamMsg("");
    setStreamingSessionId(null);
    setStreamPhase(null);
    setStreamModel("");
    setToolEvents([]);
    toolEventsRef.current = [];
    setExpandedThinking(null);
    clearTypewriter();
    isFinalizingRef.current = false;
  };

  const handleConfirmedMutationFinalized = () => {
    const confirmedMutation = pendingConfirmedMutationRef.current;
    if (!confirmedMutation) return;
    pendingConfirmedMutationRef.current = null;
    if (confirmedMutation.toolName && WRITE_TOOL_NAMES.has(confirmedMutation.toolName)) {
      toast.success("Thao tác đã được thực hiện thành công.");
    }
    if (confirmedMutation.taskId) {
      notifyTaskMutation(confirmedMutation);
    }
  };

  const finalizeSessionStream = async (targetSession: ChatSession) => {
    if (!isMountedRef.current) return;
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;

    clearPendingRequest(targetSession.id);
    stopPolling();
    setStreamPhase("FINALIZED");

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!isMountedRef.current) return;
    isStreamingRef.current = false;
    streamingSessionIdRef.current = null;
    await loadMessages(targetSession.id, true);
    handleConfirmedMutationFinalized();
    resetStreamingUi();
    loadSessions();
  };

  const startTypewriter = (targetSession: ChatSession) => {
    if (typewriterTimerRef.current) return;

    const tick = (timestamp: number) => {
      typewriterTimerRef.current = null;
      if (timestamp - lastTypewriterPaintRef.current < 33) {
        typewriterTimerRef.current = window.requestAnimationFrame(tick);
        return;
      }
      lastTypewriterPaintRef.current = timestamp;
      const target = targetStreamTextRef.current;
      let shouldContinue = true;
      setCurrentStreamMsg((current) => {
        if (current.length >= target.length) {
          if (streamCompletedRef.current) {
            typewriterTimerRef.current = null;
            void finalizeSessionStream(targetSession);
            shouldContinue = false;
          }
          return current;
        }

        const diff = target.length - current.length;
        let chunkSize = 3;
        if (diff > 1000) chunkSize = 160;
        else if (diff > 500) chunkSize = 100;
        else if (diff > 200) chunkSize = 60;
        else if (diff > 80) chunkSize = 28;
        else if (diff > 30) chunkSize = 12;
        else if (diff > 10) chunkSize = 6;

        return current + target.substring(current.length, current.length + chunkSize);
      });
      if (shouldContinue) {
        typewriterTimerRef.current = window.requestAnimationFrame(tick);
      }
    };

    typewriterTimerRef.current = window.requestAnimationFrame(tick);
  };

  const startStatusPolling = useCallback((sessionId: number, clientMessageId: string) => {
    stopPolling();
    let nullStatusCount = 0;
    let errorCount = 0;

    const tick = async () => {
      try {
        const status = await aiService.getStreamStatus(sessionId, clientMessageId);
        if (!isMountedRef.current) return;

        if (!status) {
          nullStatusCount += 1;
          if (nullStatusCount >= STREAM_STATUS_NULL_RETRY_LIMIT) {
            clearPendingRequest(sessionId);
            stopPolling();
            resetStreamingUi();
          }
          return;
        }

        nullStatusCount = 0;
        errorCount = 0;
        setStreamPhase(status.phase);
        if (status.modelUsed) {
          setStreamModel(status.modelUsed);
        }

        if (status.phase === "THINKING" || status.phase === "ROUTING" || status.phase === "QUEUED") {
          setIsThinking(true);
        }

        if (status.phase === "FINALIZED") {
          clearPendingRequest(sessionId);
          stopPolling();
          resetStreamingUi();
          if (activeSessionIdRef.current === sessionId) {
            await loadMessagesRef.current(sessionId, true);
            await loadSessionsRef.current();
          }
          handleConfirmedMutationFinalized();
          return;
        }

        if (status.phase === "FAILED") {
          clearPendingRequest(sessionId);
          stopPolling();
          resetStreamingUi();
          const hasVisibleResult = targetStreamTextRef.current.trim().length > 0 || currentStreamMsgRef.current.trim().length > 0;
          if (!hasVisibleResult && activeSessionIdRef.current === sessionId) {
            toast.error(status.errorMessage || t("copilot.error_ai_connection"), { toastId: AI_STREAM_ERROR_TOAST_ID });
          }
        }
      } catch {
        errorCount += 1;
        if (errorCount >= STREAM_STATUS_ERROR_RETRY_LIMIT) {
          clearPendingRequest(sessionId);
          stopPolling();
          if (isMountedRef.current) {
            resetStreamingUi();
          }
        }
      }
    };

    void tick();
    pollTimerRef.current = window.setInterval(() => {
      void tick();
    }, 2500);
  }, [t]);

  const restorePendingRequest = useCallback((sessionId: number) => {
    const pendingId = getPendingRequest(sessionId);
    if (!pendingId) return;

    setIsStreaming(true);
    setIsThinking(true);
    isStreamingRef.current = true;
    streamingSessionIdRef.current = sessionId;
    setStreamingSessionId(sessionId);
    startStatusPolling(sessionId, pendingId);
  }, [startStatusPolling]);

  const sendMessage = async (messageOverride: string) => {
    const outgoingText = messageOverride.trim();
    if (!outgoingText) return;
    if (outgoingText.length > MAX_PROMPT_CHARS) {
      toast.error(
        t("copilot.max_prompt_chars_error", {
          defaultValue: `Prompt cannot exceed ${MAX_PROMPT_CHARS} characters.`,
          max: MAX_PROMPT_CHARS,
        }),
      );
      return;
    }

    if (isStreaming) {
      toast.info(
        t("copilot.wait_current_response", {
          defaultValue: "Please wait for the current response to finish before sending a new message.",
        }),
      );
      return;
    }

    let targetSession = activeSession;
    if (!targetSession) {
      try {
        targetSession = await aiService.createSession();
        isStreamingRef.current = true;
        streamingSessionIdRef.current = targetSession.id;
        setSessions([targetSession, ...sessions]);
        setActiveSession(targetSession);
      } catch {
        toast.error(t("copilot.error_create_session_short"));
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "USER",
      content: outgoingText,
      createdAt: new Date().toISOString(),
    };

    lastPromptRef.current = outgoingText;
    setMessages((prev) => [...prev, userMessage]);
    const messageText = outgoingText;
    isStreamingRef.current = true;
    streamingSessionIdRef.current = targetSession.id;
    setIsStreaming(true);
    setIsThinking(true);
    setStreamPhase("QUEUED");
    setStreamModel("");
    setStreamingSessionId(targetSession.id);

    clearTypewriter();
    setCurrentStreamMsg("");
    setToolEvents([]);
    setExpandedThinking(null);

    const controller = new AbortController();
    activeStreamControllerRef.current = controller;
    const clientMessageId = crypto.randomUUID();
    savePendingRequest(targetSession.id, clientMessageId);
    startStatusPolling(targetSession.id, clientMessageId);
    let responseBuffer = "";
    let streamErrorMessage: string | null = null;

    try {
      await fetchEventSource(`${API_BASE_URL}/v1/ai/sessions/${targetSession.id}/stream`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        openWhenHidden: true,
        body: JSON.stringify({ message: messageText, clientMessageId }),
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("text/event-stream")) {
            throw new Error("Invalid SSE response");
          }
        },
        onmessage(ev) {
          if (ev.event === "token") {
            let tokenChunk = ev.data;
            try {
              const parsed = JSON.parse(ev.data) as { token?: string };
              if (typeof parsed.token === "string") {
                tokenChunk = parsed.token;
              }
            } catch {
              // Plain-text token chunk fallback
            }
            responseBuffer += tokenChunk;
            if (isMountedRef.current) {
              const parsedThink = extractThinkPayload(responseBuffer);
              const isStillThinking = parsedThink.hasThinkTag && parsedThink.hasUnclosedThink;

              setIsThinking((prev) => (prev !== isStillThinking ? isStillThinking : prev));
              setStreamPhase((prev: ChatStreamPhase | null) => {
                const nextPhase = isStillThinking ? "THINKING" : "GENERATING";
                return prev !== nextPhase ? nextPhase : prev;
              });

              targetStreamTextRef.current = responseBuffer;
              startTypewriter(targetSession!);
            }
          } else if (ev.event === "model") {
            if (ev.data && isMountedRef.current) {
              setStreamModel(ev.data);
            }
          } else if (ev.event === "phase") {
            if (!isMountedRef.current) return;
            const phase = ev.data as ChatStreamPhase;
            setStreamPhase(phase);
            if (phase === "THINKING" || phase === "ROUTING" || phase === "QUEUED") {
              setIsThinking(true);
            }
            if (phase === "GENERATING") {
              setIsThinking(false);
            }
          } else if (ev.event === "done") {
            streamCompletedRef.current = true;
          } else if (ev.event === "tool") {
            try {
              const parsed = JSON.parse(ev.data) as {
                name?: string;
                arguments?: string;
                result?: string;
                confirmation?: PendingActionConfirmation;
              };
              const toolName = parsed.name?.trim();
              if (toolName && isMountedRef.current) {
                const toolEvent: ToolEvent = {
                  name: toolName,
                  arguments: parsed.arguments,
                  result: parsed.result,
                  confirmation: parsed.confirmation,
                };
                setToolEvents((prev) => {
                  const updated = dedupeToolEvents([...prev, toolEvent]);
                  toolEventsRef.current = updated;
                  return updated;
                });
              }
            } catch {
              // Ignore malformed tool event
            }
          } else if (ev.event === "error") {
            streamErrorMessage = ev.data || "SSE server error";
            const hasResult = responseBuffer.trim().length > 0 || streamCompletedRef.current;
            if (!hasResult && isMountedRef.current) {
              toast.error(streamErrorMessage, { toastId: AI_STREAM_ERROR_TOAST_ID });
            }
            throw new Error(streamErrorMessage);
          }
        },
        onerror(err) {
          console.error("SSE Error:", err);
          throw err;
        },
        onclose() {
          if (!streamCompletedRef.current && !controller.signal.aborted) {
            throw new Error("SSE connection closed unexpectedly");
          }
        },
      });

      streamCompletedRef.current = true;
      if (isMountedRef.current && activeSessionIdRef.current === targetSession.id) {
        if (targetStreamTextRef.current.length === 0 || currentStreamMsg.length >= targetStreamTextRef.current.length) {
          await finalizeSessionStream(targetSession);
        }
      }

      loadSessions();
    } catch (err) {
      clearPendingRequest(targetSession.id);
      stopPolling();
      const hasResult = responseBuffer.trim().length > 0 || streamCompletedRef.current;
      if (hasResult && isMountedRef.current && activeSessionIdRef.current === targetSession.id) {
        await loadMessages(targetSession.id, true);
        await loadSessions();
      }
      if (isMountedRef.current) {
        resetStreamingUi();
      }
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort && !hasResult && isMountedRef.current) {
        toast.error(streamErrorMessage || getApiErrorMessage(err) || t("copilot.error_ai_connection"), {
          toastId: AI_STREAM_ERROR_TOAST_ID,
        });
      }
    } finally {
      if (activeStreamControllerRef.current === controller) {
        activeStreamControllerRef.current = null;
      }
      if (!targetStreamTextRef.current && isMountedRef.current) {
        resetStreamingUi();
      }
    }
  };

  const stopGenerating = useCallback(() => {
    if (activeStreamControllerRef.current) {
      activeStreamControllerRef.current.abort();
      activeStreamControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsThinking(false);
    setStreamPhase(null);
    if (activeSession) {
      clearPendingRequest(activeSession.id);
    }
    stopPolling();
    isStreamingRef.current = false;

    if (activeSession) {
      void loadMessages(activeSession.id, true);
      void loadSessions();
    }
  }, [activeSession, loadMessages, loadSessions]);

  const confirmPendingAction = (confirmation: PendingActionConfirmation) => {
    pendingConfirmedMutationRef.current = mutationFromConfirmation(confirmation);
    void sendMessage(`CONFIRM_ACTION ${confirmation.actionId} xác nhận đồng ý thực hiện`);
  };

  const cancelPendingAction = (actionId: string) => {
    void sendMessage(`CANCEL_ACTION ${actionId} hủy từ chối thao tác`);
  };

  const getLastPrompt = useCallback(() => lastPromptRef.current, []);

  return {
    isStreaming,
    isThinking,
    currentStreamMsg,
    streamingSessionId,
    streamPhase,
    streamModel,
    toolEvents,
    expandedThinking,
    sendMessage,
    stopGenerating,
    confirmPendingAction,
    cancelPendingAction,
    restorePendingRequest,
    resetStreamingUi,
    getLastPrompt,
    toolEventsRef,
    localMessageToolsRef,
    isStreamingRef,
    streamingSessionIdRef,
  };
}
