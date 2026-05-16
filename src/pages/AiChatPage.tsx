import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Trash2, Plus, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Search, BrainCircuit, Database, PencilLine, ListChecks, Wand2, X } from "lucide-react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/auth.store";
import { aiService, type ChatSession, type ChatMessage } from "@/services/ai.service";
import type { ChatStreamPhase } from "@/types/chat-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getApiErrorMessage } from "@/lib/http";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const MAX_PROMPT_CHARS = 1500;
const STREAM_STATUS_NULL_RETRY_LIMIT = 5;
const STREAM_STATUS_ERROR_RETRY_LIMIT = 8;

type ToolAccess = "read" | "write";

type ToolEvent = {
  name: string;
  arguments?: string;
  result?: string;
};

type AssignmentRequirementRow = {
  id: string;
  taskId: string;
  skills: string;
  difficulty: string;
};

type AssignmentFormMode = "recommend" | "assign";

type AssignmentRequest = {
  projectId: string;
  taskIds: string[];
};

type AssignmentDraft = {
  projectId: string;
  mode: AssignmentFormMode;
  rows: AssignmentRequirementRow[];
};

type DynamicFormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "date" | "checkbox";
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: Array<string | { label: string; value: string }>;
};

type DynamicFormSpec = {
  title?: string;
  description?: string;
  submitLabel?: string;
  intent?: string;
  fields: DynamicFormField[];
};

const WRITE_TOOL_NAMES = new Set(["assignTaskToMember", "recommendAndAssignTask", "updateTaskStatus", "createTask"]);

function createAssignmentRow(taskId = "", id?: string): AssignmentRequirementRow {
  return {
    id: id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    taskId,
    skills: "",
    difficulty: "5",
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u00c4\u2018/g, "d");
}

function extractAssignmentRequest(content: string): AssignmentRequest | null {
  const normalized = normalizeText(content);
  const asksForTaskRequirements =
    (normalized.includes("ky nang") || normalized.includes("skill")) &&
    (normalized.includes("do kho") || normalized.includes("difficulty")) &&
    normalized.includes("task");

  if (!asksForTaskRequirements) {
    return null;
  }

  const ids = new Set<string>();
  const patterns = [
    /\btask(?:\s+id)?\s*[:#]?\s*(\d{1,8})\b/gi,
    /^\s*\|?\s*(\d{1,8})\s*\|/gm,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      ids.add(match[1]);
    }
  }

  const projectMatch = content.match(/\bproject(?:\s+id)?\s*[:#]?\s*(\d{1,8})\b/i);

  return {
    projectId: projectMatch?.[1] ?? "",
    taskIds: Array.from(ids).slice(0, 8),
  };
}

function createAssignmentDraft(formKey: string, request: AssignmentRequest): AssignmentDraft {
  const taskIds = request.taskIds.length > 0 ? request.taskIds : [""];
  return {
    projectId: request.projectId,
    mode: "recommend",
    rows: taskIds.map((taskId, index) => createAssignmentRow(taskId, `${formKey}-${taskId || index}`)),
  };
}

function stripDynamicFormBlocks(content: string) {
  return content.replace(/```taskpilot-form\s*[\s\S]*?```/gi, "").trim();
}

function extractDynamicFormSpec(content: string): DynamicFormSpec | null {
  const match = content.match(/```taskpilot-form\s*([\s\S]*?)```/i);
  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1].trim()) as DynamicFormSpec;
    if (!Array.isArray(parsed.fields) || parsed.fields.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseConfirmationResult(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.confirmationRequired === true && typeof parsed.actionId === "string") {
      return parsed as {
        actionId: string;
        toolName?: string;
        summary?: string;
        arguments?: Record<string, unknown>;
        preview?: unknown;
        expiresAt?: string;
      };
    }
  } catch {
    return null;
  }
  return null;
}

function getToolAccess(name: string): ToolAccess {
  return WRITE_TOOL_NAMES.has(name) ? "write" : "read";
}

function formatToolPayload(value?: string) {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function summarizeToolResult(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const labels = parsed
        .slice(0, 3)
        .map((item) => {
          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>;
            const id = typeof record.id === "number" || typeof record.id === "string" ? `#${record.id}` : "";
            const title = typeof record.title === "string" ? record.title : "";
            return [id, title].filter(Boolean).join(" ");
          }
          return "";
        })
        .filter(Boolean);
      return labels.length > 0
        ? `${parsed.length} item${parsed.length === 1 ? "" : "s"}: ${labels.join(", ")}`
        : `${parsed.length} item${parsed.length === 1 ? "" : "s"}`;
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (typeof record.title === "string" && typeof record.status === "string") {
        return `${record.title} - ${record.status}`;
      }
      if (typeof record.status === "string") {
        return record.status;
      }
      if (typeof record.name === "string") {
        return record.name;
      }
    }
  } catch {
    // Plain text result.
  }
  return value.length > 160 ? `${value.slice(0, 160)}...` : value;
}

function ToolEventCard({
  tool,
  compact = false,
  onConfirmAction,
}: {
  tool: ToolEvent;
  compact?: boolean;
  onConfirmAction?: (actionId: string) => void;
}) {
  const access = getToolAccess(tool.name);
  const Icon = access === "write" ? PencilLine : Database;
  const formattedArgs = formatToolPayload(tool.arguments);
  const formattedResult = formatToolPayload(tool.result);
  const resultSummary = summarizeToolResult(tool.result);
  const confirmation = parseConfirmationResult(tool.result);

  return (
    <div className={`rounded-lg border ${access === "write" ? "border-amber-300/60 bg-amber-50/70 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" : "border-blue-300/50 bg-blue-50/70 text-blue-950 dark:bg-blue-950/20 dark:text-blue-100"} ${compact ? "p-2" : "p-3"}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        <span>{access === "write" ? "Real data action" : "Data lookup"}</span>
        <span className="ml-auto rounded border border-current/20 px-1.5 py-0.5 normal-case tracking-normal">{tool.name}</span>
      </div>
      {formattedArgs && (
        <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] leading-relaxed text-foreground/75">
          {formattedArgs}
        </pre>
      )}
      {resultSummary && !compact && (
        <div className="mt-2 text-xs font-medium text-foreground/80">{resultSummary}</div>
      )}
      {formattedResult && !compact && formattedResult !== resultSummary && (
        <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] leading-relaxed text-foreground/70">
          {formattedResult}
        </pre>
      )}
      {confirmation && !compact && (
        <div className="mt-3 rounded-md border border-amber-400/40 bg-background/70 p-2">
          <div className="text-xs font-semibold">Cần xác nhận trước khi ghi dữ liệu</div>
          <div className="mt-1 text-xs text-foreground/75">
            {confirmation.summary || "Xác nhận thao tác ghi dữ liệu này."}
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            onClick={() => onConfirmAction?.(confirmation.actionId)}
          >
            Xác nhận thực hiện
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AiChatPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [inputVal, setInputVal] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStreamMsg, setCurrentStreamMsg] = useState("");
  const [streamingSessionId, setStreamingSessionId] = useState<number | null>(null);
  const [streamPhase, setStreamPhase] = useState<ChatStreamPhase | null>(null);
  const [streamModel, setStreamModel] = useState<string>("");
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, Record<string, string>>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeStreamControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const activeSessionIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadSessions();
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (accessToken) {
      return;
    }

    if (activeStreamControllerRef.current) {
      activeStreamControllerRef.current.abort();
      activeStreamControllerRef.current = null;
    }
  }, [accessToken]);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.id ?? null;
    if (activeSession) {
      restorePendingRequest(activeSession.id);
      loadMessages(activeSession.id);
    } else {
      setMessages([]);
      stopPolling();
    }
  }, [activeSession]);

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

  const resetStreamingUi = () => {
    setIsStreaming(false);
    setIsThinking(false);
    setCurrentStreamMsg("");
    setStreamingSessionId(null);
    setStreamPhase(null);
    setStreamModel("");
    setToolEvents([]);
    setExpandedThinking(null);
  };

  const restorePendingRequest = (sessionId: number) => {
    const pendingId = getPendingRequest(sessionId);
    if (!pendingId) {
      return;
    }

    setIsStreaming(true);
    setIsThinking(true);
    setStreamingSessionId(sessionId);
    startStatusPolling(sessionId, pendingId);
  };

  const startStatusPolling = (sessionId: number, clientMessageId: string) => {
    stopPolling();
    let nullStatusCount = 0;
    let errorCount = 0;

    const tick = async () => {
      try {
        const status = await aiService.getStreamStatus(sessionId, clientMessageId);
        if (!isMountedRef.current) {
          return;
        }

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
        setStreamModel(status.modelUsed ?? "");

        if (status.phase === "THINKING" || status.phase === "ROUTING" || status.phase === "QUEUED") {
          setIsThinking(true);
        }

        if (status.phase === "FINALIZED") {
          clearPendingRequest(sessionId);
          stopPolling();
          resetStreamingUi();
          if (activeSessionIdRef.current === sessionId) {
            await loadMessages(sessionId);
            await loadSessions();
          }
          return;
        }

        if (status.phase === "FAILED") {
          clearPendingRequest(sessionId);
          stopPolling();
          resetStreamingUi();
          toast.error(status.errorMessage || t("copilot.error_ai_connection"));
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
    }, 1500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamMsg]);

  async function loadSessions() {
    try {
      const data = await aiService.getSessions(0, 50);
      if (!isMountedRef.current) return;
      setSessions(data.content);
    } catch {
      toast.error(t("copilot.error_load_sessions"));
    }
  }

  async function loadMessages(sessionId: number) {
    try {
      const data = await aiService.getMessages(sessionId, 0, 100);
      if (!isMountedRef.current) return;

      // Avoid overriding UI with a different session when user switches tabs quickly.
      if (activeSessionIdRef.current !== sessionId) return;
      setMessages(data.content.reverse()); // Assume BE returns DESC, we show ASC
    } catch {
      toast.error(t("copilot.error_load_messages"));
    }
  }


  async function handleDeleteSession(e: React.MouseEvent, sessionId: number) {
    e.stopPropagation();
    try {
      await aiService.deleteSession(sessionId);
      const newSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(newSessions);
      if (activeSession?.id === sessionId) {
        setActiveSession(newSessions[0] || null);
      }
      toast.success(t("copilot.success_delete_session"));
    } catch {
      toast.error(t("copilot.error_delete_session"));
    }
  }

  async function sendMessage(messageOverride?: string) {
    const outgoingText = (messageOverride ?? inputVal).trim();
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
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = outgoingText;
    setInputVal("");
    setIsStreaming(true);
    setIsThinking(true);
    setStreamPhase("QUEUED");
    setStreamModel("");
    setStreamingSessionId(targetSession.id);
    setCurrentStreamMsg("");
    setToolEvents([]);
    setExpandedThinking(null);

    const controller = new AbortController();
    activeStreamControllerRef.current = controller;
    const clientMessageId = crypto.randomUUID();
    savePendingRequest(targetSession.id, clientMessageId);
    startStatusPolling(targetSession.id, clientMessageId);
    let responseBuffer = "";
    let streamCompleted = false;

    try {
      await fetchEventSource(`${API_BASE_URL}/v1/ai/sessions/${targetSession.id}/stream`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
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
              // Backward compatibility for older plain-text token events.
            }
            if (responseBuffer.length === 0 && isMountedRef.current) {
              setIsThinking(false);
              setStreamPhase("GENERATING");
            }
            responseBuffer += tokenChunk;
            if (isMountedRef.current) {
              setCurrentStreamMsg(responseBuffer);
            }
          } else if (ev.event === "phase") {
            if (!isMountedRef.current) {
              return;
            }
            const phase = ev.data as ChatStreamPhase;
            setStreamPhase(phase);
            if (phase === "THINKING" || phase === "ROUTING" || phase === "QUEUED") {
              setIsThinking(true);
            }
            if (phase === "GENERATING") {
              setIsThinking(false);
            }
          } else if (ev.event === "done") {
            streamCompleted = true;
          } else if (ev.event === "tool") {
            try {
              const parsed = JSON.parse(ev.data) as { name?: string; arguments?: string; result?: string };
              const toolName = parsed.name?.trim();
              if (toolName && isMountedRef.current) {
                const toolEvent: ToolEvent = {
                  name: toolName,
                  arguments: parsed.arguments,
                  result: parsed.result,
                };
                setToolEvents(prev => [...prev, toolEvent]);
              }
            } catch {
              // Ignore malformed tool events.
            }
          } else if (ev.event === "thought_expanded") {
            try {
              const parsed = JSON.parse(ev.data) as { expanded?: string };
              if (parsed.expanded && isMountedRef.current) {
                setExpandedThinking(parsed.expanded);
              }
            } catch {
              // Ignore malformed expanded thinking.
            }
          } else if (ev.event === "error") {
            if (isMountedRef.current) {
              toast.error(ev.data);
            }
            throw new Error(ev.data || "SSE server error");
          }
        },
        onerror(err) {
          console.error("SSE Error:", err);
          // Throw to stop fetch-event-source retry loop.
          throw err;
        },
        onclose() {
          // If closed unexpectedly, throw to avoid silent retries/re-entrance.
          if (!streamCompleted && !controller.signal.aborted) {
            throw new Error("SSE connection closed unexpectedly");
          }
        }
      });

      // Refresh visible message list from DB to avoid optimistic duplication.
      if (streamCompleted && isMountedRef.current && activeSessionIdRef.current === targetSession.id) {
        clearPendingRequest(targetSession.id);
        stopPolling();
        setStreamPhase("FINALIZED");
        await loadMessages(targetSession.id);
      }

      // Refresh sessions to update auto-title
      loadSessions();

    } catch (err) {
      clearPendingRequest(targetSession.id);
      stopPolling();
      if (isMountedRef.current) {
        resetStreamingUi();
      }
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort && isMountedRef.current) {
        toast.error(getApiErrorMessage(err) || t("copilot.error_ai_connection"));
      }
    } finally {
      if (activeStreamControllerRef.current === controller) {
        activeStreamControllerRef.current = null;
      }
      if (isMountedRef.current) {
        if (streamCompleted) {
          resetStreamingUi();
        }
      }
    }
  }

  const confirmPendingAction = (actionId: string) => {
    void sendMessage(`CONFIRM_ACTION ${actionId} - tôi xác nhận thực hiện thao tác ghi dữ liệu này.`);
  };

  const getAssignmentDraft = (formKey: string, request: AssignmentRequest) => {
    return assignmentDrafts[formKey] ?? createAssignmentDraft(formKey, request);
  };

  const updateAssignmentDraft = (
    formKey: string,
    request: AssignmentRequest,
    updater: (draft: AssignmentDraft) => AssignmentDraft,
  ) => {
    setAssignmentDrafts((drafts) => {
      const current = drafts[formKey] ?? createAssignmentDraft(formKey, request);
      return { ...drafts, [formKey]: updater(current) };
    });
  };

  const updateAssignmentRow = (
    formKey: string,
    request: AssignmentRequest,
    rowId: string,
    field: keyof Omit<AssignmentRequirementRow, "id">,
    value: string,
  ) => {
    updateAssignmentDraft(formKey, request, (draft) => ({
      ...draft,
      rows: draft.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addAssignmentRow = (formKey: string, request: AssignmentRequest) => {
    updateAssignmentDraft(formKey, request, (draft) => ({
      ...draft,
      rows: [...draft.rows, createAssignmentRow("", `${formKey}-${draft.rows.length}`)],
    }));
  };

  const removeAssignmentRow = (formKey: string, request: AssignmentRequest, rowId: string) => {
    updateAssignmentDraft(formKey, request, (draft) => ({
      ...draft,
      rows: draft.rows.length === 1 ? [createAssignmentRow("", `${formKey}-0`)] : draft.rows.filter((row) => row.id !== rowId),
    }));
  };

  const submitAssignmentForm = async (formKey: string, request: AssignmentRequest) => {
    const draft = getAssignmentDraft(formKey, request);
    const rows = draft.rows
      .map((row) => ({
        taskId: row.taskId.trim(),
        skills: row.skills.trim(),
        difficulty: row.difficulty.trim(),
      }))
      .filter((row) => row.taskId);

    if (rows.length === 0) {
      toast.error("Nhap it nhat mot task ID.");
      return;
    }

    const invalid = rows.find((row) => {
      const difficulty = Number(row.difficulty);
      return !row.skills || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10;
    });
    if (invalid) {
      toast.error("Moi task can co skills va do kho tu 1 den 10.");
      return;
    }

    const projectLine = draft.projectId.trim()
      ? `Project ID: ${draft.projectId.trim()}`
      : "Project ID: infer from each task if needed";
    const modeLine =
      draft.mode === "assign"
        ? "Mode: recommend suitable assignees and assign each task to the top candidate immediately."
        : "Mode: recommend suitable assignees only; do not assign yet.";
    const taskLines = rows
      .map(
        (row) =>
          `- Task ${row.taskId}: requiredSkills="${row.skills}", difficulty=${row.difficulty}`,
      )
      .join("\n");

    const prompt = [
      "Task assignment requirements form",
      projectLine,
      modeLine,
      "Use real TaskPilot tools and process every task below.",
      "If mode asks assignment, call recommendAndAssignTask for each task.",
      "Tasks:",
      taskLines,
    ].join("\n");

    setAssignmentDrafts((drafts) => {
      const next = { ...drafts };
      delete next[formKey];
      return next;
    });
    await sendMessage(prompt);
  };

  const renderAssignmentRequestForm = (formKey: string, request: AssignmentRequest) => {
    const draft = getAssignmentDraft(formKey, request);

    return (
      <div className="mt-3 rounded-lg border border-border/60 bg-background/55 p-3 shadow-lg backdrop-blur-[28px] backdrop-saturate-150">
        <div className="mb-3 flex items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ListChecks className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Bổ sung thông tin task</div>
            <div className="text-xs leading-relaxed text-foreground/70">
              AI đang cần thêm dữ liệu cho bước này. Điền các trường còn thiếu rồi gửi lại vào cuộc hội thoại.
            </div>
          </div>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-[150px_1fr]">
          <Input
            value={draft.projectId}
            onChange={(event) =>
              updateAssignmentDraft(formKey, request, (current) => ({
                ...current,
                projectId: event.target.value,
              }))
            }
            inputMode="numeric"
            placeholder="Project ID"
            className="bg-background/70"
          />
          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-input bg-background/70">
            <button
              type="button"
              onClick={() =>
                updateAssignmentDraft(formKey, request, (current) => ({
                  ...current,
                  mode: "recommend",
                }))
              }
              className={`h-9 px-3 text-sm font-medium transition-colors ${draft.mode === "recommend" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
            >
              Chỉ gợi ý
            </button>
            <button
              type="button"
              onClick={() =>
                updateAssignmentDraft(formKey, request, (current) => ({
                  ...current,
                  mode: "assign",
                }))
              }
              className={`h-9 px-3 text-sm font-medium transition-colors ${draft.mode === "assign" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
            >
              Gợi ý + gán
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {draft.rows.map((row) => (
            <div key={row.id} className="grid gap-2 md:grid-cols-[92px_1fr_100px_34px]">
              <Input
                value={row.taskId}
                onChange={(event) => updateAssignmentRow(formKey, request, row.id, "taskId", event.target.value)}
                inputMode="numeric"
                placeholder="Task ID"
                className="bg-background/70"
              />
              <Input
                value={row.skills}
                onChange={(event) => updateAssignmentRow(formKey, request, row.id, "skills", event.target.value)}
                placeholder="Skills: React, Spring Boot"
                className="bg-background/70"
              />
              <Input
                value={row.difficulty}
                onChange={(event) => updateAssignmentRow(formKey, request, row.id, "difficulty", event.target.value)}
                type="number"
                min={1}
                max={10}
                placeholder="Độ khó"
                className="bg-background/70"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAssignmentRow(formKey, request, row.id)}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => addAssignmentRow(formKey, request)}>
            <Plus className="h-4 w-4" />
            Thêm task
          </Button>
          <Button type="button" size="sm" onClick={() => void submitAssignmentForm(formKey, request)}>
            <Wand2 className="h-4 w-4" />
            Gửi thông tin
          </Button>
        </div>
      </div>
    );
  };

  const updateDynamicFormValue = (formKey: string, fieldName: string, value: string) => {
    setDynamicFormValues((forms) => ({
      ...forms,
      [formKey]: {
        ...(forms[formKey] ?? {}),
        [fieldName]: value,
      },
    }));
  };

  const submitDynamicForm = async (formKey: string, spec: DynamicFormSpec) => {
    const values = dynamicFormValues[formKey] ?? {};
    const missing = spec.fields.find((field) => field.required && !values[field.name]?.trim());
    if (missing) {
      toast.error(`Vui lòng nhập ${missing.label}.`);
      return;
    }

    const fieldLines = spec.fields
      .map((field) => `- ${field.name}: ${values[field.name] ?? ""}`)
      .join("\n");
    const prompt = [
      "Structured form response",
      `Intent: ${spec.intent || "additional_information"}`,
      "Use this information to continue the previous user request.",
      "Fields:",
      fieldLines,
    ].join("\n");

    setDynamicFormValues((forms) => {
      const next = { ...forms };
      delete next[formKey];
      return next;
    });
    await sendMessage(prompt);
  };

  const renderDynamicForm = (formKey: string, spec: DynamicFormSpec) => {
    const values = dynamicFormValues[formKey] ?? {};

    return (
      <div className="mt-3 rounded-lg border border-border/60 bg-background/55 p-3 shadow-lg backdrop-blur-[28px] backdrop-saturate-150">
        <div className="mb-3">
          <div className="text-sm font-semibold text-foreground">{spec.title || "Bổ sung thông tin"}</div>
          {spec.description && (
            <div className="mt-1 text-xs leading-relaxed text-foreground/70">{spec.description}</div>
          )}
        </div>

        <div className="space-y-2">
          {spec.fields.map((field) => {
            const value = values[field.name] ?? "";
            const fieldLabel = (
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-foreground/80">
                <span>{field.label}</span>
                {field.required && <span className="text-destructive">*</span>}
              </div>
            );
            if (field.type === "checkbox") {
              return (
                <label
                  key={field.name}
                  className="flex items-center gap-2 rounded-md border border-input bg-background/70 px-3 py-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={value === "true"}
                    onChange={(event) => updateDynamicFormValue(formKey, field.name, event.target.checked ? "true" : "false")}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span>{field.label}</span>
                  {field.required && <span className="text-destructive">*</span>}
                </label>
              );
            }
            if (field.type === "textarea") {
              return (
                <label key={field.name} className="block">
                  {fieldLabel}
                  <Textarea
                    value={value}
                    onChange={(event) => updateDynamicFormValue(formKey, field.name, event.target.value)}
                    placeholder={field.placeholder || field.label}
                    className="min-h-20 bg-background/70"
                  />
                </label>
              );
            }
            if (field.type === "select") {
              const options = field.options ?? [];
              return (
                <label key={field.name} className="block">
                  {fieldLabel}
                  <select
                    value={value}
                    onChange={(event) => updateDynamicFormValue(formKey, field.name, event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground"
                  >
                    <option value="">{field.placeholder || field.label}</option>
                    {options.map((option) => {
                      const label = typeof option === "string" ? option : option.label;
                      const optionValue = typeof option === "string" ? option : option.value;
                      return (
                        <option key={optionValue} value={optionValue}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              );
            }
            return (
              <label key={field.name} className="block">
                {fieldLabel}
                <Input
                  value={value}
                  onChange={(event) => updateDynamicFormValue(formKey, field.name, event.target.value)}
                  type={field.type === "number" || field.type === "date" ? field.type : "text"}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder || field.label}
                  className="bg-background/70"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" onClick={() => void submitDynamicForm(formKey, spec)}>
            <Wand2 className="h-4 w-4" />
            {spec.submitLabel || "Gửi thông tin"}
          </Button>
        </div>
      </div>
    );
  };

  const renderMessageExtras = (msg: ChatMessage, idx: number) => {
    if (msg.sender !== "ASSISTANT") {
      return null;
    }

    const formKey = `message-${msg.id || idx}`;
    const dynamicForm = extractDynamicFormSpec(msg.content);
    if (dynamicForm) {
      return renderDynamicForm(formKey, dynamicForm);
    }

    const assignmentRequest = extractAssignmentRequest(msg.content);
    if (assignmentRequest) {
      return renderAssignmentRequestForm(formKey, assignmentRequest);
    }

    return null;
  };

  // Helper to parse thinking content into steps
  const parseThinkingToSteps = (thinking: string) => {
    // Split by "Step X:" or significant newlines
    const rawSteps = thinking.split(/(?=Step \d+:)/g).filter(s => s.trim().length > 0);
    const steps: Array<{ type: 'thought' | 'tool', content: string, title?: string, toolData?: unknown }> = [];

    // Simple heuristic: interleaving tools based on their sequence
    // In a real scenario, we might want the backend to emit "thinking_step" events
    // but for now, we'll map the text steps and then append tool calls.
    rawSteps.forEach((s, idx) => {
      const titleMatch = s.match(/Step \d+:\s*(.*)/);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      const content = title ? s.replace(/Step \d+:\s*(.*)/, '').trim() : s.trim();

      steps.push({
        type: 'thought',
        content: content || title || 'Processing...',
        title: title || `Step ${idx + 1}`
      });
    });

    // If no explicit steps found, treat whole thinking as one step
    if (steps.length === 0 && thinking.trim()) {
      steps.push({ type: 'thought', content: thinking.trim(), title: 'Analysis' });
    }

    return steps;
  };

  const extractThinkPayload = (content: string) => {
    const openTag = "<think>";
    const closeTag = "</think>";

    const beforeFirstThinkParts: string[] = [];
    const afterFirstThinkParts: string[] = [];
    const thinkBlocks: string[] = [];

    let cursor = 0;
    let hasThinkTag = false;
    let hasUnclosedThink = false;

    while (cursor < content.length) {
      const start = content.indexOf(openTag, cursor);

      if (start === -1) {
        if (hasThinkTag) {
          afterFirstThinkParts.push(content.slice(cursor));
        } else {
          beforeFirstThinkParts.push(content.slice(cursor));
        }
        break;
      }

      if (!hasThinkTag) {
        beforeFirstThinkParts.push(content.slice(cursor, start));
        hasThinkTag = true;
      } else {
        afterFirstThinkParts.push(content.slice(cursor, start));
      }

      const end = content.indexOf(closeTag, start + openTag.length);
      if (end === -1) {
        hasUnclosedThink = true;
        thinkBlocks.push(content.slice(start + openTag.length));
        break;
      }

      thinkBlocks.push(content.slice(start + openTag.length, end));
      cursor = end + closeTag.length;
    }

    const sanitizeAnswerText = (text: string) =>
      text.replace(/<\/?think>/gi, "").trim();

    const beforeThink = sanitizeAnswerText(beforeFirstThinkParts.join(""));
    const afterThink = sanitizeAnswerText(afterFirstThinkParts.join(""));
    const thinkingText = thinkBlocks
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .join("\n\n");

    return {
      hasThinkTag,
      hasUnclosedThink,
      beforeThink,
      afterThink,
      thinkingText,
    };
  };

  // Helper to render AI message with <think> tag support
  const renderAiMessage = (
    content: string,
    tools: ToolEvent[] = [],
    expanded?: string | null,
    collapseWhenComplete = false,
  ) => {
    const displayContent = stripDynamicFormBlocks(content);
    const parsed = extractThinkPayload(displayContent);

    if (parsed.hasThinkTag) {
      const isThinkingComplete = !parsed.hasUnclosedThink;

      // Use expanded thinking if available and thinking is complete
      const displayThinking = (isThinkingComplete && expanded)
        ? expanded
        : parsed.thinkingText;

      const steps = parseThinkingToSteps(displayThinking);
      const shouldCollapse = collapseWhenComplete && isThinkingComplete;

      return (
        <div className="flex flex-col gap-4">
          {parsed.beforeThink && <div className="prose prose-sm dark:prose-invert max-w-full"><ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.beforeThink}</ReactMarkdown></div>}

          <details
            className="space-y-3 rounded-xl border border-border/60 bg-background/55 p-4 shadow-lg backdrop-blur-[28px] backdrop-saturate-150"
            open={!shouldCollapse}
          >
            <summary className="list-none cursor-pointer">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <BrainCircuit className="w-4 h-4" />
                <span>{t("copilot.thinking_accordion_label")}</span>
                {!isThinkingComplete && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </div>
            </summary>

            <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/70">
              {steps.map((step, idx) => (
                <div key={idx} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-background/85 border border-border flex items-center justify-center z-10 group-last:bg-primary/10 group-last:border-primary/30 transition-colors">
                    {idx < steps.length - 1 || isThinkingComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider">{step.title}</span>
                    <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{step.content}</p>
                  </div>
                </div>
              ))}

              {/* Integrated Tools in the timeline */}
              {tools.map((tool, tIdx) => (
                <div key={`tool-${tIdx}`} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center z-10">
                    <Search className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <ToolEventCard tool={tool} compact onConfirmAction={confirmPendingAction} />
                </div>
              ))}
            </div>
          </details>

          {parsed.afterThink && (
            <div className="prose prose-sm dark:prose-invert max-w-full pt-2 border-t border-border/30 mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.afterThink}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-full prose prose-sm dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
      </div>
    );
  };

  const phaseToProgress = (phase: ChatStreamPhase | null) => {
    switch (phase) {
      case "QUEUED":
        return 10;
      case "ROUTING":
        return 25;
      case "THINKING":
        return 55;
      case "GENERATING":
        return 80;
      case "FINALIZED":
        return 100;
      case "FAILED":
        return 100;
      default:
        return 0;
    }
  };

  const phaseLabel = (phase: ChatStreamPhase | null) => {
    switch (phase) {
      case "QUEUED":
        return "Queued";
      case "ROUTING":
        return "Routing model";
      case "THINKING":
        return "Thinking";
      case "GENERATING":
        return "Generating";
      case "FINALIZED":
        return "Finalized";
      case "FAILED":
        return "Failed";
      default:
        return "Processing";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Sidebar: Session List */}
      <div className={`border-r border-border/40 flex flex-col bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 transition-all duration-300 ${isSidebarCollapsed ? "w-16 items-center" : "w-64"}`}>
        <div className={`p-4 border-b border-border/40 flex items-center bg-transparent w-full ${isSidebarCollapsed ? "flex-col gap-4 px-0 justify-center" : "justify-between"}`}>
          {!isSidebarCollapsed && (
            <h2 className="font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
              <Bot className="w-5 h-5 text-primary shrink-0" /> {t("copilot.title")}
            </h2>
          )}
          <div className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-2" : "gap-1"}`}>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="h-8 w-8 hover:bg-primary/10 shrink-0" title="Toggle Sidebar">
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveSession(null)} className="h-8 w-8 hover:bg-primary/10 shrink-0" title="New Chat">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col w-full divide-y divide-border/20">
          {!isSidebarCollapsed && sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`p-3 px-4 cursor-pointer flex justify-between items-center group transition-colors ${activeSession?.id === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/30 text-muted-foreground"
                }`}
            >
              <div className="flex-1 truncate text-sm">
                {s.title || t("copilot.new_chat")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => handleDeleteSession(e, s.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {!isSidebarCollapsed && sessions.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-4">
              {t("copilot.no_sessions")}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-transparent relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative z-10">
          {isStreaming && activeSession?.id === streamingSessionId && (
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{phaseLabel(streamPhase)}</span>
                {streamModel && <span>{streamModel}</span>}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${phaseToProgress(streamPhase)}%` }}
                />
              </div>
              {toolEvents.length > 0 && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {toolEvents.map((tool, idx) => (
                    <ToolEventCard key={`${tool.name}-${idx}`} tool={tool} onConfirmAction={confirmPendingAction} />
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.length === 0 && !currentStreamMsg && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
              <div className="bg-background/20 backdrop-blur-[40px] backdrop-saturate-150 p-8 rounded-3xl border border-border/30 shadow-xl flex flex-col items-center max-w-lg">
                <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-foreground drop-shadow-sm">{t("copilot.welcome_title")}</h3>
                <p className="text-foreground/90 font-medium mt-3 leading-relaxed drop-shadow-sm">
                  {t("copilot.welcome_desc")}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const extras = renderMessageExtras(msg, idx);
            return (
              <div key={msg.id || idx} className={`flex gap-3 ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}>
                {msg.sender !== "USER" && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                )}

                <div className="max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-3 ${msg.sender === "USER"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted border border-border rounded-bl-none text-foreground"
                    }`}>
                    {msg.sender === "USER" ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      renderAiMessage(msg.content, [], null, true)
                    )}
                  </div>
                  {extras}
                </div>

                {msg.sender === "USER" && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted text-muted-foreground"><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}

          {/* Streaming Message Placeholder */}
          {isStreaming && activeSession?.id === streamingSessionId && (isThinking || currentStreamMsg) && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[80%] rounded-2xl p-1 bg-transparent border-none text-foreground">
                {renderAiMessage(currentStreamMsg || (isThinking ? "<think>Step 1: Analyzing request...</think>" : ""), toolEvents, expandedThinking)}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/40 bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 relative z-10">
          <form
            onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}
            className="relative flex max-w-4xl mx-auto"
          >
            <Textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={t("copilot.input_placeholder") + " (Enter để gửi, Shift+Enter để xuống dòng)"}
              className="min-h-[96px] flex-1 resize-none rounded-2xl border-border/40 pr-14 text-base bg-background/50 backdrop-blur-md focus:bg-background/80 transition-colors"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputVal.trim()}
              className="absolute bottom-1.5 right-1.5 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center p-0"
            >
              <Send className="w-4 h-4 ml-1" />
            </Button>
          </form>
          <div className="mt-2 text-right text-xs text-muted-foreground">
            {inputVal.length}/{MAX_PROMPT_CHARS}
          </div>
          <div className="text-center text-xs font-medium text-foreground/80 mt-2 drop-shadow-sm">
            {t("copilot.disclaimer")}
          </div>
        </div>
      </div>
    </div>
  );
}
