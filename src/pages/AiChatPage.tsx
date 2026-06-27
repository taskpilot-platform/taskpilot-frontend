// @ts-nocheck
import { memo, useCallback, useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Trash2, Plus, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Search, BrainCircuit, Database, PencilLine, ListChecks, Wand2, X, Check, Menu } from "lucide-react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";

import logo from "@/assets/logo.svg";
import { useAuthStore } from "@/stores/auth.store";
import { aiService, type ChatSession, type ChatMessage } from "@/services/ai.service";
import { projectService } from "../services/project.service";
import { skillService } from "@/services/skill.service";
import type { ChatStreamPhase } from "@/types/chat-stream";
import type { SkillDirectoryItem } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getApiErrorMessage } from "@/lib/http";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const MAX_PROMPT_CHARS = 1500;
const STREAM_STATUS_NULL_RETRY_LIMIT = 5;
const STREAM_STATUS_ERROR_RETRY_LIMIT = 8;
const AI_STREAM_ERROR_TOAST_ID = "ai-stream-error";
const AI_LOAD_SESSIONS_ERROR_TOAST_ID = "ai-load-sessions-error";
const AI_LOAD_MESSAGES_ERROR_TOAST_ID = "ai-load-messages-error";

type ToolAccess = "read" | "write";

type ToolEvent = {
  name: string;
  arguments?: string;
  result?: string;
  confirmation?: PendingActionConfirmation;
};

type ChatComposerProps = {
  placeholder: string;
  modelName: string;
  maxChars: number;
  getLastPrompt: () => string;
  onSubmit: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  stopTooltip: string;
};

const ChatComposer = memo(function ChatComposer({ placeholder, modelName, maxChars, getLastPrompt, onSubmit, isStreaming, onStop, stopTooltip }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const trimmedValue = value.trim();

  const submitCurrentValue = () => {
    if (!trimmedValue) {
      return;
    }
    const message = trimmedValue;
    setValue("");
    onSubmit(message);
  };

  const restoreLastPrompt = () => {
    const lastPrompt = getLastPrompt().trim();
    if (!lastPrompt) {
      return;
    }
    setValue(lastPrompt);
    window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      input.focus();
      input.setSelectionRange(lastPrompt.length, lastPrompt.length);
    }, 0);
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitCurrentValue();
        }}
        className="relative flex max-w-4xl mx-auto"
      >
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !trimmedValue) {
              e.preventDefault();
              restoreLastPrompt();
              return;
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submitCurrentValue();
            }
          }}
          placeholder={placeholder}
          className="min-h-[96px] flex-1 resize-none rounded-2xl border border-white/20 dark:border-white/10 pr-14 text-base bg-white/10 dark:bg-black/10 backdrop-blur-xl backdrop-saturate-150 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 focus:bg-white/20 dark:focus:bg-black/20 transition-all shadow-sm"
        />
        {isStreaming ? (
          <div className="group absolute bottom-1.5 right-1.5">
            {/* Spinning ring around stop button */}
            <div className="relative h-10 w-10">
              <span
                className="absolute inset-[-3px] rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #10b981, #34d399, transparent 60%)',
                  animation: 'spin 1.1s linear infinite',
                }}
              />
              <span className="absolute inset-[-3px] rounded-full" style={{ background: 'transparent', boxShadow: 'inset 0 0 0 2px transparent' }} />
              <Button
                type="button"
                onClick={onStop}
                aria-label={stopTooltip}
                className="relative h-10 w-10 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 flex items-center justify-center p-0 transition-colors shadow-sm z-10"
              >
                <span className="h-3.5 w-3.5 rounded-[3px] bg-white dark:bg-neutral-950" />
              </Button>
            </div>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 max-w-[220px] whitespace-nowrap rounded-lg bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-neutral-950">
              {stopTooltip}
            </div>
          </div>
        ) : (
          <Button
            type="submit"
            disabled={!trimmedValue}
            className="absolute bottom-1.5 right-1.5 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center p-0 transition-colors"
          >
            <Send className="h-4 w-4 translate-x-px" />
          </Button>
        )}
      </form>
      <div className="mt-2 flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-300 font-semibold px-1">
        {/* Model badge – bottom-left of composer */}
        {modelName && modelName !== "TaskPilot AI" ? (
          <div className="flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 select-none">
            <Bot className="w-3 h-3 shrink-0 text-primary/70" />
            <span className="truncate max-w-[160px]">{modelName}</span>
          </div>
        ) : (
          <div />
        )}
        <div>
          {value.length}/{maxChars}
        </div>
      </div>
    </>
  );
});

type PendingActionConfirmation = {
  actionId: string;
  toolName?: string;
  summary?: string;
  arguments?: Record<string, unknown>;
  preview?: unknown;
  expiresAt?: string;
};

type ConfirmedTaskMutation = {
  actionId: string;
  toolName?: string;
  taskId?: number;
  projectId?: number;
  summary?: string;
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
  type?: "text" | "number" | "textarea" | "select" | "multiselect" | "date" | "checkbox";
  required?: boolean;
  placeholder?: string;
  value?: string | number | boolean | null;
  defaultValue?: string | number | boolean | null;
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

const WRITE_TOOL_NAMES = new Set(["assignTaskToMember", "assignTaskToMemberByName", "recommendAndAssignTask", "updateTaskRequiredSkills", "updateTaskStatus", "patchTask", "patchProject", "patchSprint", "patchTaskComment", "createSystemSkill", "patchSystemSkill", "deleteSystemSkill", "addMySkill", "patchMySkill", "deleteMySkill", "markNotificationRead", "markAllNotificationsRead", "createTask", "createSprint", "startSprint", "completeSprint", "assignTaskToSprint"]);

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
  if (content.match(/```taskpilot-form/i)) {
    return null;
  }

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

function stripDynamicFormBlocks(content: string, isComplete = true) {
  const endPattern = isComplete ? "(?:```|$)" : "```";
  
  const formRegex = new RegExp(`\`\`\`taskpilot-form\\s*[\\s\\S]*?${endPattern}`, "gi");
  const confirmRegex = new RegExp(`\`\`\`taskpilot-confirm\\s*[\\s\\S]*?${endPattern}`, "gi");
  const jsonRegex = new RegExp(`\`\`\`json\\s*([\\s\\S]*?)${endPattern}`, "gi");

  let stripped = content
    .replace(formRegex, "")
    .replace(confirmRegex, "");

  // Also strip ```json blocks if they look like our forms
  stripped = stripped.replace(jsonRegex, (match, inner) => {
    if (inner.includes('"intent"') || inner.includes('"fields"') || inner.includes('"actionId"')) {
      return "";
    }
    return match;
  });

  // Strip MISSING_TOOL lines — these are internal AI fallback signals, not user-facing
  stripped = stripped.replace(/^MISSING_TOOL:[^\n]*/gm, "").trim();

  return stripped.trim();
}

function extractDynamicFormSpec(content: string): DynamicFormSpec | null {
  const match = content.match(/```(?:taskpilot-form|json)\s*([\s\S]*?)(?:```|$)/i);
  if (!match) {
    return null;
  }

  try {
    let jsonString = match[1].trim();
    // remove trailing commas
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
    // remove JS-style comments that AI sometimes adds (// ... and /* ... */)
    jsonString = jsonString.replace(/\/\/[^\n]*/g, '');
    jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(jsonString) as DynamicFormSpec;
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
      return parsed as PendingActionConfirmation;
    }
  } catch {
    const actionMatch = value.match(/confirmationRequired\s*=\s*true[\s\S]*?actionId\s*=\s*([^,\]\s]+)/i);
    if (!actionMatch) {
      return null;
    }
    const toolMatch = value.match(/toolName\s*=\s*([^,\]\s]+)/i);
    const summaryMatch = value.match(/summary\s*=\s*([\s\S]*?)(?:,\s*arguments=|,\s*preview=|,\s*expiresAt=|\])/i);
    return {
      actionId: actionMatch[1],
      toolName: toolMatch?.[1],
      summary: summaryMatch?.[1]?.trim(),
    };
  }
  return null;
}

function extractConfirmationSpecs(content: string): PendingActionConfirmation[] {
  const specs: PendingActionConfirmation[] = [];
  const pattern = /```taskpilot-confirm\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
      if (parsed.confirmationRequired === true && typeof parsed.actionId === "string") {
        specs.push(parsed as PendingActionConfirmation);
      }
    } catch {
      // Ignore malformed confirmation metadata.
    }
  }

  return specs;
}

function isSkillFieldName(name: string) {
  const normalized = name.toLowerCase();
  return normalized === "skills" || normalized === "requiredskills" || normalized === "required_skills" || normalized === "requiredskillids";
}

function taskIdFromFormIntent(intent?: string) {
  if (!intent) return null;
  const match = intent.match(/(?:task|assign_task|reassign_task)[_-]?(\d+)/i);
  return match?.[1] ?? null;
}

function isTaskAssignmentForm(spec: DynamicFormSpec) {
  const intent = spec.intent?.toLowerCase() ?? "";
  const hasSkillField = spec.fields.some((field) => isSkillFieldName(field.name));
  return hasSkillField && (intent.includes("assign") || intent.includes("reassign") || intent.includes("task"));
}

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function mutationFromConfirmation(confirmation: PendingActionConfirmation): ConfirmedTaskMutation {
  const args = getRecord(confirmation.arguments);
  const preview = getRecord(confirmation.preview);
  return {
    actionId: confirmation.actionId,
    toolName: confirmation.toolName,
    taskId: numberFromUnknown(args?.taskId) ?? numberFromUnknown(preview?.taskId),
    projectId: numberFromUnknown(args?.projectId) ?? numberFromUnknown(preview?.projectId),
    summary: confirmation.summary,
  };
}

function confirmationDedupeKey(confirmation: PendingActionConfirmation) {
  const mutation = mutationFromConfirmation(confirmation);
  return [
    mutation.toolName || confirmation.toolName || "pendingAction",
    mutation.taskId ? `task:${mutation.taskId}` : "",
    mutation.projectId ? `project:${mutation.projectId}` : "",
  ].filter(Boolean).join("|") || confirmation.actionId;
}

function dedupeConfirmations(confirmations: PendingActionConfirmation[]) {
  const byKey = new Map<string, PendingActionConfirmation>();
  for (const confirmation of confirmations) {
    byKey.set(confirmationDedupeKey(confirmation), confirmation);
  }
  return Array.from(byKey.values());
}

function dedupeToolEvents(events: ToolEvent[]) {
  const byKey = new Map<string, ToolEvent>();
  const passthrough: ToolEvent[] = [];
  for (const event of events) {
    const confirmation = event.confirmation ?? parseConfirmationResult(event.result);
    if (!confirmation) {
      passthrough.push(event);
      continue;
    }
    byKey.set(confirmationDedupeKey(confirmation), event);
  }
  return [...passthrough, ...byKey.values()];
}

function notifyTaskMutation(mutation: ConfirmedTaskMutation) {
  window.dispatchEvent(new CustomEvent("taskpilot:task-updated", { detail: mutation }));
  try {
    localStorage.setItem("taskpilot_task_updated", JSON.stringify({ ...mutation, at: Date.now() }));
  } catch {
    // Best-effort cross-tab refresh signal.
  }
}

function stripThinkArtifacts(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/<\s*(?:d?think|thought)\b[^>]*>[\s\S]*?<\s*\/\s*(?:d?think|thought)\s*>/gi, " ")
    .replace(/<\/?\s*(?:d?think|thought)\b[^>]*>/gi, " ")
    .replace(/```taskpilot-(?:form|confirm)\s*[\s\S]*?```/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cấu hình render Markdown dùng chung cho toàn trang
const markdownComponents = {
  table: ({ children }: any) => (
    <div className="w-full overflow-x-auto my-4 border border-black/10 dark:border-white/10 rounded-xl bg-white/30 dark:bg-black/25 shadow-sm scrollbar-thin">
      <table className="min-w-full divide-y divide-black/10 dark:divide-white/10 text-sm text-left">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-black/[0.04] dark:bg-white/[0.04]">{children}</thead>,
  th: ({ children }: any) => <th className="px-4 py-2.5 font-bold border-r border-black/5 dark:border-white/5 last:border-r-0 text-neutral-900 dark:text-neutral-50">{children}</th>,
  td: ({ children }: any) => <td className="px-4 py-2.5 border-r border-t border-black/5 dark:border-white/5 last:border-r-0 text-neutral-800 dark:text-neutral-200">{children}</td>,
  tr: ({ children }: any) => <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors odd:bg-black/[0.01] dark:odd:bg-white/[0.01]">{children}</tr>,
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    if (language === "taskpilot-confirm" || language === "taskpilot-form") {
      return (
        <div className="my-2 animate-pulse rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Đang chuẩn bị biểu mẫu...
        </div>
      );
    }
    return <code className={className} {...props}>{children}</code>;
  }
};

// Component tạo hiệu ứng Typewriter kết hợp render Markdown
const TypewriterMarkdown = ({ text, speed = 15 }: { text: string, speed?: number }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }
    
    if (!text.startsWith(displayedText)) {
      setDisplayedText("");
      return;
    }
    
    if (displayedText.length < text.length) {
      const timer = setTimeout(() => {
        const diff = text.length - displayedText.length;
        const chunkSize = diff > 100 ? 10 : diff > 30 ? 4 : 1;
        setDisplayedText(text.slice(0, displayedText.length + chunkSize));
        window.dispatchEvent(new CustomEvent("taskpilot:ai-typewriter-tick"));
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [text, displayedText, speed]);

  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{displayedText}</ReactMarkdown>;
};

function getToolAccess(name: string): ToolAccess {
  return WRITE_TOOL_NAMES.has(name) ? "write" : "read";
}

// Danh sách key kỹ thuật cần ẩn khỏi output
const ID_KEY_PATTERN = /^id$|id$/i;

// Helper: format 1 object thành dòng markdown (lọc ID)
function formatObjectLine(item: Record<string, unknown>): string {
  const fields = Object.entries(item)
    .filter(([k]) => !ID_KEY_PATTERN.test(k))
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `**${label}**: ${v ?? '—'}`;
    })
    .join(" | ");
  return fields || '(không có dữ liệu)';
}

// Helper: thử sửa JSON bị cắt cụt
function tryRepairTruncatedJson(raw: string): unknown | null {
  let fixed = raw.replace(/\.{3}$/, ''); // bỏ "..."
  // Cắt bỏ entry cuối chưa hoàn chỉnh
  const lastCloseBrace = fixed.lastIndexOf('}');
  if (lastCloseBrace > 0) {
    fixed = fixed.slice(0, lastCloseBrace + 1);
    // Đóng các ngoặc mở còn lại
    const openB = (fixed.match(/\[/g) || []).length;
    const closeB = (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < openB - closeB; i++) fixed += ']';
    try { return JSON.parse(fixed); } catch { /* ignore */ }
  }
  return null;
}

function formatFriendlyToolPayload(value?: string) {
  if (!value) return null;

  // Bước 1: Thử parse JSON trực tiếp
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Bước 2: Thử sửa JSON bị cắt cụt (do backend truncate)
    parsed = tryRepairTruncatedJson(value);
  }

  // Bước 3: Nếu vẫn parse thất bại, làm sạch raw text (xóa ID, xóa JSON syntax)
  if (parsed === null) {
    return value
      .replace(/"[^"]*[Ii]d"\s*:\s*[^,}\]]+,?\s*/g, '') // xóa các cặp key:value chứa id
      .replace(/[{}\[\]"]/g, '') // xóa dấu JSON
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2)
      .map(l => `- ${l.replace(/^,\s*/, '').replace(/,\s*$/, '').replace(/\s*,\s*/g, ' | ')}`)
      .join('\n');
  }

  // Format parsed data
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return "Danh sách trống.";
    return parsed.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return `- ${formatObjectLine(item as Record<string, unknown>)}`;
      }
      return `- ${item}`;
    }).join("\n");
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([k]) => !ID_KEY_PATTERN.test(k))
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        return `- **${label}**: ${typeof v === 'object' ? JSON.stringify(v) : v ?? '—'}`;
      })
      .join("\n");
  }

  return String(parsed);
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

const TOOL_NAME_MAPPING: Record<string, string> = {
  getMyProjects: "Danh sách dự án của tôi",
  getProjectMembers: "Thành viên dự án",
  getTasksByProject: "Danh sách task",
  getTaskById: "Chi tiết task",
  createTask: "Tạo task mới",
  updateTask: "Cập nhật task",
  deleteTask: "Xóa task",
  searchTasks: "Tìm kiếm task",
  getTaskComments: "Bình luận",
  addTaskComment: "Thêm bình luận",
};

function ToolEventCard({
  tool,
  compact = false,
  onConfirmAction,
  onCancelAction,
}: {
  tool: ToolEvent;
  compact?: boolean;
  onConfirmAction?: (confirmation: PendingActionConfirmation) => void;
  onCancelAction?: (actionId: string) => void;
}) {
  const access = getToolAccess(tool.name);
  // Arguments: hiển thị friendly, ẩn ID
  const formattedArgs = formatFriendlyToolPayload(tool.arguments);
  // Result: hiển thị friendly, ẩn ID
  const formattedResult = formatFriendlyToolPayload(tool.result);
  const confirmation = tool.confirmation ?? parseConfirmationResult(tool.result);

  return (
    <div className="font-mono text-[13px] my-1 group">
      <div className="flex items-start gap-2 text-neutral-800 dark:text-neutral-200">
        <span className="text-emerald-600 dark:text-emerald-500 select-none font-bold mt-[2px] opacity-80">{">"}</span>
        <div className="flex-1 break-words">
          <span className="font-bold text-blue-700 dark:text-blue-400">{tool.name}</span>
          {formattedArgs && (
            <span className="ml-2 text-neutral-500 dark:text-neutral-400 opacity-80">
              <TypewriterMarkdown text={formattedArgs.split('\n').map(l => l.replace(/^- /, '').replace(/\*\*/g, '')).join('  ')} speed={1} />
            </span>
          )}
        </div>
      </div>
      
      {/* Result: Terminal style */}
      {formattedResult && !compact && (
        <div className="mt-1.5 pl-[18px] text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-full opacity-90 prose prose-sm dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-li:my-0 border-l-[2px] border-neutral-100 dark:border-neutral-800 ml-[5px]">
          <TypewriterMarkdown text={formattedResult} speed={1} />
        </div>
      )}

      {/* Box Xác nhận vẫn giữ UI rõ ràng để user dễ click */}
      {confirmation && (
        <div className="mt-3 ml-[18px] rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden max-w-md">
          <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black animate-pulse">!</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80">Yêu cầu xác nhận</span>
          </div>
          <div className="px-3 pb-2.5 text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-300">
            {confirmation.summary || "Bạn có muốn thực hiện thao tác ghi dữ liệu này không?"}
          </div>
          <div className="grid grid-cols-2 border-t border-amber-500/20">
            <button
              type="button"
              onClick={() => onConfirmAction?.(confirmation)}
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-r border-amber-500/20 transition-colors"
            >
              <Check className="h-3 w-3" />
              Xác nhận
            </button>
            <button
              type="button"
              onClick={() => onCancelAction?.(confirmation.actionId)}
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <X className="h-3 w-3" />
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Processing step indicator shown after each tool result while AI is still working
const PROCESSING_STEPS = [
  "Đang phân tích kết quả truy vấn...",
  "Lọc dữ liệu phù hợp yêu cầu...",
  "Đang xử lý thông tin...",
  "Tổng hợp dữ liệu...",
  "Chuẩn bị câu trả lời...",
  "Đối chiếu điều kiện...",
  "Xác thực kết quả...",
];

function PostToolProcessingRow({ toolName, isComplete }: { toolName: string; isComplete: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  // Pick a deterministic step based on tool name so different tools show different labels
  const baseStep = useMemo(() => {
    const hash = toolName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return hash % PROCESSING_STEPS.length;
  }, [toolName]);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (isComplete) return;
    setStepIdx(baseStep);
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % PROCESSING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isComplete, baseStep]);

  if (isComplete || !visible) return null;

  return (
    <div
      className="flex items-center gap-2 ml-[5px] pl-4 py-1.5 border-l-[2px] border-emerald-400/30"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      }}
    >
      <span className="flex gap-[3px] items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 transition-all duration-500">
        {PROCESSING_STEPS[stepIdx]}
      </span>
    </div>
  );
}

// Wrapper hiển thị tuần tự từng tool card với delay
function StaggeredToolCard({
  tool,
  delayMs = 0,
  onConfirmAction,
  onCancelAction,
}: {
  tool: ToolEvent;
  delayMs?: number;
  onConfirmAction?: (confirmation: PendingActionConfirmation) => void;
  onCancelAction?: (actionId: string) => void;
}) {
  const [visible, setVisible] = useState(delayMs === 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      // Cho phép CSS transition chạy sau khi mount
      requestAnimationFrame(() => setMounted(true));
      return;
    }
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <div
      className="relative mb-2"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
      }}
    >
      <ToolEventCard
        tool={tool}
        onConfirmAction={onConfirmAction}
        onCancelAction={onCancelAction}
      />
    </div>
  );
}

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW: { label: "Thấp", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300/50 dark:border-slate-600/50" },
  MEDIUM: { label: "Trung bình", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300/50 dark:border-blue-600/50" },
  HIGH: { label: "Cao", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300/50 dark:border-amber-600/50" },
  URGENT: { label: "Khẩn cấp", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300/50 dark:border-red-600/50" },
};

function CreateTaskConfirmCard({
  confirmation,
  onConfirmAction,
  onCancelAction,
}: {
  confirmation: PendingActionConfirmation;
  onConfirmAction: (c: PendingActionConfirmation) => void;
  onCancelAction: (id: string) => void;
}) {
  const args = (confirmation.arguments ?? {}) as Record<string, unknown>;
  const title = args.title ? String(args.title) : "";
  const priority = args.priority ? String(args.priority).toUpperCase() : "MEDIUM";
  const description = args.description ? String(args.description) : null;
  const difficulty = args.difficultyLevel != null ? Number(args.difficultyLevel) : null;
  const startDate = args.startDate ? String(args.startDate) : null;
  const dueDate = args.dueDate ? String(args.dueDate) : null;
  const projectId = args.projectId != null ? String(args.projectId) : null;
  const sprintId = args.sprintId != null ? String(args.sprintId) : null;
  const assigneeId = args.assigneeId != null ? String(args.assigneeId) : null;

  const pCfg = PRIORITY_CONFIG[priority] ?? { label: priority, cls: "bg-muted text-muted-foreground border-border" };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300/30 dark:border-emerald-500/30">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tạo task mới · chờ xác nhận</div>
          <div className="text-[15px] font-bold text-foreground leading-tight mt-0.5 line-clamp-2">{title || "Chưa có tiêu đề"}</div>
        </div>
        <span className={`shrink-0 self-start text-[11px] font-bold px-2 py-0.5 rounded-lg border ${pCfg.cls}`}>{pCfg.label}</span>
      </div>

      {/* Fields grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-border/30 pt-3">
        {projectId && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Dự án</div>
            <div className="font-semibold text-foreground">Project #{projectId}</div>
          </div>
        )}
        {sprintId && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Sprint</div>
            <div className="font-semibold text-foreground">Sprint #{sprintId}</div>
          </div>
        )}
        {difficulty != null && (
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Độ khó</div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={`h-2 w-3.5 rounded-sm transition-colors ${i < difficulty ? "bg-amber-500" : "bg-border/60"}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-foreground">{difficulty}/10</span>
            </div>
          </div>
        )}
        {startDate && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Bắt đầu</div>
            <div className="font-semibold text-foreground">{formatDate(startDate)}</div>
          </div>
        )}
        {dueDate && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Hạn chót</div>
            <div className="font-semibold text-foreground">{formatDate(dueDate)}</div>
          </div>
        )}
        {assigneeId && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Người nhận</div>
            <div className="font-semibold text-foreground">User #{assigneeId}</div>
          </div>
        )}
      </div>

      {description && (
        <div className="px-4 pb-3 border-t border-border/30 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Mô tả</div>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{description}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 border-t border-border/40">
        <button
          type="button"
          onClick={() => onConfirmAction(confirmation)}
          className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-r border-border/40 transition-all duration-150 active:scale-[0.97]"
        >
          <Check className="h-4 w-4" />
          Phê duyệt
        </button>
        <button
          type="button"
          onClick={() => onCancelAction(confirmation.actionId)}
          className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 active:scale-[0.97]"
        >
          <X className="h-4 w-4" />
          Từ chối
        </button>
      </div>
    </div>
  );
}

const parseThinkingToSteps = (thinking: string, stepTitlePrefix: string) => {
  if (thinking.includes("Step 1:")) {
    const rawSteps = thinking.split(/(?=Step \d+:)/g).filter(s => s.trim().length > 0);
    const steps: Array<{ type: 'thought' | 'tool', content: string, title?: string, toolData?: unknown }> = [];

    rawSteps.forEach((s, idx) => {
      const titleMatch = s.match(/Step \d+:\s*(.*)/);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      const content = title ? s.replace(/Step \d+:\s*(.*)/, '').trim() : s.trim();

      steps.push({
        type: 'thought',
        content: content || title || stepTitlePrefix,
        title: title || `${stepTitlePrefix} ${idx + 1}`
      });
    });

    if (steps.length === 0 && thinking.trim()) {
      steps.push({ type: 'thought', content: thinking.trim(), title: 'Analysis' });
    }

    return steps;
  }

  // Otherwise split by paragraphs
  const paragraphs = thinking.split(/\n\n+/).filter(s => s.trim().length > 0);
  return paragraphs.map((content, idx) => ({
    type: 'thought',
    content: content.trim(),
    title: `${stepTitlePrefix} ${idx + 1}`
  }));
};

const ThinkingAccordion = memo(function ThinkingAccordion({
  thinkingText,
  tools,
  isThinkingComplete,
  hasVisibleResponse,
  collapseWhenComplete,
  forceOpen,
  isStreamingMessage,
  t,
  confirmPendingAction,
  cancelPendingAction,
}: {
  thinkingText: string;
  tools: ToolEvent[];
  isThinkingComplete: boolean;
  hasVisibleResponse: boolean;
  collapseWhenComplete: boolean;
  forceOpen: boolean;
  isStreamingMessage?: boolean;
  t: (key: string) => string;
  confirmPendingAction: (confirmation: PendingActionConfirmation) => void;
  cancelPendingAction: (actionId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(!isThinkingComplete);
  const wasThinkingRef = useRef(!isThinkingComplete);

  // --- Freeze logic ---
  // Once thinking is done AND response text has appeared, lock the displayed
  // content so DOM doesn't change on every subsequent streaming token re-render.
  const frozenRef = useRef<{ text: string; tools: ToolEvent[] } | null>(null);
  const shouldFreeze = isThinkingComplete && hasVisibleResponse;
  if (shouldFreeze && !frozenRef.current) {
    frozenRef.current = { text: thinkingText, tools };
  }
  const effectiveText = frozenRef.current?.text ?? thinkingText;
  const effectiveTools = frozenRef.current?.tools ?? tools;
  const effectiveComplete = frozenRef.current ? true : isThinkingComplete;
  const effectiveHasResponse = frozenRef.current ? true : hasVisibleResponse;
  // --- End freeze logic ---

  const mergedItems = useMemo(() => {
    const items: Array<{ id: string; type: 'text' | 'tool'; content?: string; tool?: ToolEvent }> = [];
    if (!effectiveText) {
      effectiveTools.forEach((t, idx) => {
        items.push({ id: `tool-${t.name}-${idx}`, type: 'tool', tool: t });
      });
      return items;
    }

    const sections = effectiveText.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);

    let toolIdx = 0;
    sections.forEach((section, sIdx) => {
      items.push({ id: `text-${sIdx}`, type: 'text', content: section });

      const isEndMsg = section.startsWith("Kết quả:");
      if (isEndMsg && toolIdx < effectiveTools.length) {
        items.push({ id: `tool-call-${toolIdx}`, type: 'tool', tool: effectiveTools[toolIdx] });
        toolIdx++;
      }
    });

    while (toolIdx < effectiveTools.length) {
      items.push({ id: `tool-call-extra-${toolIdx}`, type: 'tool', tool: effectiveTools[toolIdx] });
      toolIdx++;
    }

    return items;
  }, [effectiveText, effectiveTools]);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      wasThinkingRef.current = true;
      return;
    }
    if (wasThinkingRef.current && effectiveComplete) {
      if (collapseWhenComplete) {
        setIsOpen(false);
      }
      wasThinkingRef.current = false;
    }
  }, [forceOpen, effectiveComplete, collapseWhenComplete]);

  if (!effectiveText && effectiveTools.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col text-neutral-800 dark:text-neutral-200">
      {/* Chỉ hiện nút xem/đóng khi đã nghĩ xong */}
      {effectiveComplete && (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-[13px] font-bold text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer select-none transition-colors w-fit mb-2"
        >
          <BrainCircuit className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t("copilot.thinking_accordion_label")}</span>
          <span className="ml-1 text-[10px] font-extrabold uppercase bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg border border-black/10 dark:border-white/10 transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700 shadow-sm">
            {isOpen ? t("copilot.thinking_collapse_btn") : t("copilot.thinking_expand_btn")}
          </span>
        </div>
      )}

      {/* Nội dung nghĩ & tools: hiện khi đang nghĩ hoặc đã bấm mở */}
      {(!effectiveComplete || isOpen) && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-300 mb-2">
          
          {/* Header trạng thái lúc chưa nghĩ xong */}
          {!effectiveComplete && (
            <div className="flex items-center gap-2 mb-1 font-bold text-emerald-600 dark:text-emerald-400 select-none">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="uppercase tracking-widest text-[11px] font-black">{t("copilot.thinking_step_title")}</span>
            </div>
          )}

          {/* Nội dung nghĩ & tools trộn lẫn */}
          <div className="flex flex-col gap-2 border-l-[3px] border-emerald-500/40 pl-4 py-2 bg-gradient-to-r from-emerald-50/20 to-transparent dark:from-emerald-950/10 rounded-r-xl relative">
             {mergedItems.map((item) => {
               if (item.type === 'text') {
                 return (
                   <div key={item.id} className="text-[13px] leading-relaxed opacity-95 font-medium text-neutral-600 dark:text-neutral-400">
                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                       {item.content || ""}
                     </ReactMarkdown>
                   </div>
                 );
               } else if (item.type === 'tool' && item.tool) {
                 return (
                   <div key={item.id} className="my-1 max-w-full">
                     <StaggeredToolCard
                       tool={item.tool}
                       delayMs={0}
                       onConfirmAction={confirmPendingAction}
                       onCancelAction={cancelPendingAction}
                     />
                   </div>
                 );
               }
               return null;
             })}

             {/* Show processing indicator: only when AI is idle after tool calls, before response text appears */}
             {effectiveComplete && !effectiveHasResponse && effectiveTools.length > 0 && (
               (() => {
                 const lastTool = effectiveTools[effectiveTools.length - 1];
                 const isExecuting = !lastTool.result && !lastTool.isConfirmed;
                 if (isExecuting) return null;
                 return (
                   <PostToolProcessingRow
                     toolName={lastTool.name}
                     isComplete={effectiveHasResponse}
                   />
                 );
               })()
             )}
          </div>
        </div>
      )}
    </div>
  );
});

export default function AiChatPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStreamMsg, setCurrentStreamMsg] = useState("");
  const [streamingSessionId, setStreamingSessionId] = useState<number | null>(null);
  const [streamPhase, setStreamPhase] = useState<ChatStreamPhase | null>(null);
  const [streamModel, setStreamModel] = useState<string>("");
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const toolEventsRef = useRef<ToolEvent[]>([]);
  const localMessageToolsRef = useRef<Record<number, ToolEvent[]>>({});
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [lastModelName, setLastModelName] = useState("");
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, Record<string, string>>>({});
  const [skillDirectory, setSkillDirectory] = useState<SkillDirectoryItem[]>([]);
  const [myProjects, setMyProjects] = useState<{ id: number; name: string }[]>([]);
  const [sprintsByProject, setSprintsByProject] = useState<Record<number, { id: number; name: string }[]>>({});
  const [membersByProject, setMembersByProject] = useState<Record<number, { id: number; name: string }[]>>({});
  const [labelsByProject, setLabelsByProject] = useState<Record<number, { id: number; name: string }[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const lastPromptRef = useRef("");
  const activeStreamControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isStreamingRef = useRef(false);
  const activeSessionIdRef = useRef<number | null>(null);
  const streamingSessionIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const targetStreamTextRef = useRef("");
  const typewriterTimerRef = useRef<number | null>(null);
  const lastTypewriterPaintRef = useRef(0);
  const streamCompletedRef = useRef(false);
  const isFinalizingRef = useRef(false);
  const sendMessageRef = useRef<(message: string) => void>(() => {});
  const pendingConfirmedMutationRef = useRef<ConfirmedTaskMutation | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadSessions();
    loadSkillDirectory();
    loadMyProjects();
    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (typewriterTimerRef.current) {
        window.cancelAnimationFrame(typewriterTimerRef.current);
      }
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
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
      aiService.warmupSession(activeSession.id).catch(err => {
        console.warn("[Cache Warming] Failed to trigger session warmup:", err);
      });
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

    // Dừng 500ms để người dùng đọc thinking hoàn chỉnh trước khi thu gọn
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

  const restorePendingRequest = (sessionId: number) => {
    const pendingId = getPendingRequest(sessionId);
    if (!pendingId) {
      return;
    }

    setIsStreaming(true);
    setIsThinking(true);
    isStreamingRef.current = true;
    streamingSessionIdRef.current = sessionId;
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
        if (status.modelUsed) {
          setStreamModel(status.modelUsed);
          setLastModelName(status.modelUsed);
        }

        if (status.phase === "THINKING" || status.phase === "ROUTING" || status.phase === "QUEUED") {
          setIsThinking(true);
        }

        if (status.phase === "FINALIZED") {
          clearPendingRequest(sessionId);
          stopPolling();
          resetStreamingUi();
          if (activeSessionIdRef.current === sessionId) {
            await loadMessages(sessionId, true);
            await loadSessions();
          }
          handleConfirmedMutationFinalized();
          return;
        }

        if (status.phase === "FAILED") {
          clearPendingRequest(sessionId);
          stopPolling();
          resetStreamingUi();
          const hasVisibleResult = targetStreamTextRef.current.trim().length > 0 || currentStreamMsg.trim().length > 0;
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
  };

  // ==== AUTO-SCROLL LOGIC ====
  // shouldAutoScrollRef = true  → tự động cuộn xuống theo nội dung mới
  // shouldAutoScrollRef = false → user đã chủ động cuộn lên, không can thiệp

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

  // Khi user cuộn: cập nhật cờ auto-scroll
  const handleMessagesScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearMessageBottom();
  }, [isNearMessageBottom]);

  // Khi messages hoặc stream thay đổi: cuộn xuống nếu đang ở chế độ auto
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollToBottom(!isStreamingRef.current);
      scrollRafRef.current = null;
    });
  }, [messages, currentStreamMsg, scrollToBottom]);

  // Typewriter tick: cuộn xuống mỗi nhịp nếu auto-scroll đang bật
  useEffect(() => {
    const handleTypewriterTick = () => {
      if (!shouldAutoScrollRef.current) return;
      scrollToBottom(false);
    };
    window.addEventListener("taskpilot:ai-typewriter-tick", handleTypewriterTick);
    return () => window.removeEventListener("taskpilot:ai-typewriter-tick", handleTypewriterTick);
  }, [scrollToBottom]);

  async function loadSessions() {
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
  }

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
      const { sprintService } = await import("../services/sprint.service");
      const response = await sprintService.listSprints(projectId);
      if (!isMountedRef.current) return;
      setSprintsByProject(prev => ({
        ...prev,
        [projectId]: response.data.map((s: any) => ({ id: s.id, name: s.name }))
      }));
    } catch {}
  };

  const loadMembersForProject = async (projectId: number) => {
    if (membersByProject[projectId]) return;
    try {
      const response = await projectService.getProjectMembers(projectId);
      if (!isMountedRef.current) return;
      setMembersByProject(prev => ({
        ...prev,
        [projectId]: response.data.map((m: any) => ({ id: m.userId, name: m.fullName || `User ${m.userId}` }))
      }));
    } catch {}
  };

  const loadLabelsForProject = async (projectId: number) => {
    if (labelsByProject[projectId]) return;
    try {
      const { labelService } = await import("../services/label.service");
      const response = await labelService.getProjectLabels(projectId);
      if (!isMountedRef.current) return;
      setLabelsByProject(prev => ({
        ...prev,
        [projectId]: response.data.map((l: any) => ({ id: l.id, name: l.name }))
      }));
    } catch {}
  };

  async function loadSkillDirectory() {
    try {
      const response = await skillService.getSkillDirectory();
      if (!isMountedRef.current) return;
      setSkillDirectory(response.data);
    } catch {
      // Skill dropdowns gracefully fall back to text inputs when the directory is unavailable.
    }
  }

  async function loadMessages(sessionId: number, force = false) {
    try {
      const data = await aiService.getMessages(sessionId, 0, 100);
      if (!isMountedRef.current) return;

      // Avoid overriding UI with a different session when user switches tabs quickly.
      if (activeSessionIdRef.current !== sessionId) return;
      if (!force && isStreamingRef.current && streamingSessionIdRef.current === sessionId) {
        return;
      }
      const orderedMessages = [...data.content].reverse(); // Assume BE returns DESC, we show ASC
      
      // Khôi phục toolEvents cho tin nhắn cuối cùng nếu vừa stream xong
      if (force && sessionId === streamingSessionIdRef.current && toolEventsRef.current.length > 0) {
        const lastMsg = orderedMessages[orderedMessages.length - 1];
        if (lastMsg && lastMsg.sender === "ASSISTANT") {
          localMessageToolsRef.current[lastMsg.id] = [...toolEventsRef.current];
        }
      }
      
      // Gắn lại toolEvents từ bộ nhớ tạm vào mảng messages để không bị mất khi load lại
      orderedMessages.forEach(msg => {
        if (localMessageToolsRef.current[msg.id]) {
          (msg as any).toolEvents = localMessageToolsRef.current[msg.id];
        }
      });
      
      setMessages(orderedMessages);
      const latestUserMessage = [...orderedMessages].reverse().find((message) => message.sender === "USER");
      lastPromptRef.current = latestUserMessage?.content ?? "";
    } catch (error) {
      console.error("[AiChat] Failed to load messages", { sessionId, error });
      toast.error(`${t("copilot.error_load_messages")} ${getApiErrorMessage(error)}`, {
        toastId: AI_LOAD_MESSAGES_ERROR_TOAST_ID,
      });
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

  async function handleSaveTitle(sessionId: number) {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      toast.error("Tên cuộc hội thoại không được để trống");
      return;
    }

    try {
      await aiService.updateSessionTitle(sessionId, trimmedTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: trimmedTitle } : s))
      );
      if (activeSession?.id === sessionId) {
        setActiveSession((prev) => (prev ? { ...prev, title: trimmedTitle } : null));
      }
      setEditingSessionId(null);
      toast.success("Đổi tên cuộc hội thoại thành công!");
    } catch {
      toast.error("Không thể đổi tên cuộc hội thoại");
    }
  }

  async function sendMessage(messageOverride: string) {
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
      createdAt: new Date().toISOString()
    };

    lastPromptRef.current = outgoingText;
    shouldAutoScrollRef.current = true;
    setMessages(prev => [...prev, userMessage]);
    const messageText = outgoingText;
    isStreamingRef.current = true;
    streamingSessionIdRef.current = targetSession.id;
    setIsStreaming(true);
    setIsThinking(true);
    setStreamPhase("QUEUED");
    setStreamModel("");
    setStreamingSessionId(targetSession.id);

    // Setup typewriter refs
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
            responseBuffer += tokenChunk;
            if (isMountedRef.current) {
              const parsedThink = extractThinkPayload(responseBuffer);
              const isStillThinking = parsedThink.hasThinkTag && parsedThink.hasUnclosedThink;
              
              setIsThinking((prev) => {
                if (prev !== isStillThinking) return isStillThinking;
                return prev;
              });

              setStreamPhase((prev) => {
                const nextPhase = isStillThinking ? "THINKING" : "GENERATING";
                if (prev !== nextPhase) return nextPhase;
                return prev;
              });

              targetStreamTextRef.current = responseBuffer;
              startTypewriter(targetSession);
            }
          } else if (ev.event === "model") {
            if (ev.data && isMountedRef.current) {
              setStreamModel(ev.data);
              setLastModelName(ev.data);
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
                setToolEvents(prev => {
                  const updated = dedupeToolEvents([...prev, toolEvent]);
                  toolEventsRef.current = updated;
                  return updated;
                });
              }
            } catch {
              // Ignore malformed tool events.
            }
          } else if (ev.event === "thought_expanded") {
            // thought_expanded is intentionally ignored — we always display raw <think> content
            // from the streaming buffer so the collapsed view stays consistent with live steps.
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
          // Throw to stop fetch-event-source retry loop.
          throw err;
        },
        onclose() {
          // If closed unexpectedly, throw to avoid silent retries/re-entrance.
          if (!streamCompletedRef.current && !controller.signal.aborted) {
            throw new Error("SSE connection closed unexpectedly");
          }
        }
      });

      streamCompletedRef.current = true;
      if (isMountedRef.current && activeSessionIdRef.current === targetSession.id) {
        // If typewriter already caught up, finalize immediately
        if (targetStreamTextRef.current.length === 0 || currentStreamMsg.length >= targetStreamTextRef.current.length) {
          await finalizeSessionStream(targetSession);
        }
      }

      // Refresh sessions to update auto-title
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
      // If we didn't stream any text at all (error or immediately closed), clean up UI
      if (!targetStreamTextRef.current && isMountedRef.current) {
        resetStreamingUi();
      }
    }
  }

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
  }, [activeSession]);

  sendMessageRef.current = (message: string) => {
    void sendMessage(message);
  };

  const handleComposerSubmit = useCallback((message: string) => {
    sendMessageRef.current(message);
  }, []);

  const getLastPrompt = useCallback(() => lastPromptRef.current, []);

  const confirmPendingAction = (confirmation: PendingActionConfirmation) => {
    pendingConfirmedMutationRef.current = mutationFromConfirmation(confirmation);
    void sendMessage(`CONFIRM_ACTION ${confirmation.actionId} xác nhận đồng ý thực hiện`);
  };

  const cancelPendingAction = (actionId: string) => {
    void sendMessage(`CANCEL_ACTION ${actionId} hủy từ chối thao tác`);
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

  const renderSkillSelect = (
    value: string,
    onChange: (value: string) => void,
    placeholder = "Chọn skill",
    className = "bg-background/70",
  ) => {
    if (skillDirectory.length === 0) {
      return (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Skills: React, Spring Boot"
          className={className}
        />
      );
    }

    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-full rounded-md border border-input px-3 text-sm text-foreground ${className}`}
      >
        <option value="">{placeholder}</option>
        {skillDirectory.map((skill) => (
          <option key={skill.id} value={skill.name}>
            {skill.name}
          </option>
        ))}
      </select>
    );
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
              {renderSkillSelect(
                row.skills,
                (value) => updateAssignmentRow(formKey, request, row.id, "skills", value),
                "Chọn skill",
              )}
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

  const getDynamicFieldDefault = (field: DynamicFormField) => {
    const rawValue = field.value ?? field.defaultValue ?? "";
    if (rawValue === null || rawValue === undefined) return "";
    return String(rawValue);
  };

  const getDynamicFieldValue = (values: Record<string, string>, field: DynamicFormField) =>
    values[field.name] ?? getDynamicFieldDefault(field);

  const submitDynamicForm = async (formKey: string, spec: DynamicFormSpec) => {
    const values = dynamicFormValues[formKey] ?? {};
    const missing = spec.fields.find((field) => field.required && !getDynamicFieldValue(values, field).trim());
    if (missing) {
      toast.error(`Vui lòng nhập ${missing.label}.`);
      return;
    }

    const taskId = taskIdFromFormIntent(spec.intent);
    const assignmentForm = isTaskAssignmentForm(spec);
    const fieldLines = spec.fields
      .map((field) => `- ${field.name}: ${getDynamicFieldValue(values, field)}`)
      .join("\n");
    const promptParts = [
      "Structured form response",
      spec.title ? `Form Title: ${spec.title}` : "",
      `Intent: ${spec.intent || "additional_information"}`,
      "Use this information to continue the previous user request.",
      taskId ? `Task ID: ${taskId}` : "",
      "Fields:",
      fieldLines,
    ];
    if (assignmentForm) {
      promptParts.push(
        "Important TaskPilot instruction:",
        "- The provided skill value comes from the system skill directory.",
        "- If the previous request only asked for recommendations or alternatives, call recommendTaskAssignmentCandidates with taskId, skills, and difficulty; do not create a write confirmation.",
        "- Only call recommendAndAssignTask if the user explicitly asked to assign immediately after recommending.",
        "- Do not only use these skills as temporary chat context.",
      );
    }
    const prompt = promptParts.filter(Boolean).join("\n");

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
            const value = getDynamicFieldValue(values, field);
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
            if (isSkillFieldName(field.name)) {
              if (field.name.toLowerCase().endsWith("ids") || field.type === "multiselect") {
                field.type = "multiselect";
                field.options = skillDirectory.map(s => ({ label: s.name, value: String(s.id) }));
              } else {
                return (
                  <label key={field.name} className="block">
                    {fieldLabel}
                    {renderSkillSelect(
                      value,
                      (nextValue) => updateDynamicFormValue(formKey, field.name, nextValue),
                      field.placeholder || "Chọn skill từ hệ thống",
                    )}
                  </label>
                );
              }
            }
            if (field.name === "projectId" && field.type === "number") {
              field.type = "select";
              field.options = myProjects.map(p => ({ label: `${p.name} (ID: ${p.id})`, value: String(p.id) }));
              if (value) {
                const projectId = parseInt(value, 10);
                if (!isNaN(projectId)) {
                  loadSprintsForProject(projectId);
                  loadMembersForProject(projectId);
                  loadLabelsForProject(projectId);
                }
              }
            }
            if (field.name === "labelIds" || (field.name.toLowerCase().includes("label") && field.name.toLowerCase().endsWith("ids"))) {
              field.type = "multiselect";
              const projectIdStr = values["projectId"];
              if (projectIdStr) {
                const projectId = parseInt(projectIdStr, 10);
                const labels = labelsByProject[projectId] || [];
                field.options = labels.map(l => ({ label: l.name, value: String(l.id) }));
              } else {
                field.options = [];
              }
            }
            if ((field.name === "difficultyLevel" || field.name === "difficulty") && field.type !== "number") {
              field.type = "number";
              field.min = 1;
              field.max = 10;
            }
            const fieldNameLower = field.name.toLowerCase();
            const isSprintField = fieldNameLower.includes("sprint");
            const isAssigneeField = fieldNameLower.includes("assignee") || fieldNameLower.includes("member");

            if ((isSprintField || isAssigneeField) && field.name !== "projectId") {
              field.type = "select";
              const projectIdStr = values["projectId"];
              if (projectIdStr) {
                const projectId = parseInt(projectIdStr, 10);
                if (isSprintField) {
                  const sprints = sprintsByProject[projectId] || [];
                  field.options = sprints.map(s => ({ label: `${s.name} (ID: ${s.id})`, value: String(s.id) }));
                } else if (isAssigneeField) {
                  const members = membersByProject[projectId] || [];
                  field.options = members.map(m => ({ label: `${m.name} (ID: ${m.id})`, value: String(m.id) }));
                }
              } else {
                field.options = [];
              }
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
            if (field.type === "multiselect") {
              const options = field.options ?? [];
              if (options.length === 0) {
                return (
                  <label key={field.name} className="block">
                    {fieldLabel}
                    <Input
                      value={value}
                      onChange={(event) => updateDynamicFormValue(formKey, field.name, event.target.value)}
                      placeholder={field.placeholder || "Các ID cách nhau bằng dấu phẩy, ví dụ: 3,5"}
                      className="bg-background/70"
                    />
                  </label>
                );
              }
              const selectedValues = (typeof value === "string" ? value.split(",").filter(Boolean) : []) as string[];
              return (
                <div key={field.name} className="block">
                  <div className="mb-1 text-sm font-medium text-foreground">{fieldLabel}</div>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const label = typeof option === "string" ? option : option.label;
                      const optionValue = typeof option === "string" ? String(option) : String(option.value);
                      const isChecked = selectedValues.includes(optionValue);
                      return (
                        <label key={optionValue} className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${isChecked ? "bg-primary/20 border-primary text-primary font-semibold" : "bg-background/50 border-input text-foreground hover:bg-muted"}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            className="hidden"
                            onChange={(e) => {
                              const newValues = e.target.checked 
                                ? [...selectedValues, optionValue]
                                : selectedValues.filter(v => v !== optionValue);
                              updateDynamicFormValue(formKey, field.name, newValues.join(","));
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
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

  const renderConfirmationCards = (confirmations: PendingActionConfirmation[]) => (
    <div className="mt-3 grid gap-3">
      {confirmations.map((confirmation) =>
        confirmation.toolName === "createTask" ? (
          <CreateTaskConfirmCard
            key={confirmation.actionId}
            confirmation={confirmation}
            onConfirmAction={confirmPendingAction}
            onCancelAction={cancelPendingAction}
          />
        ) : (
          <ToolEventCard
            key={confirmation.actionId}
            tool={{
              name: confirmation.toolName || "pendingAction",
              confirmation,
              result: JSON.stringify({ confirmationRequired: true, ...confirmation }),
            }}
            onConfirmAction={confirmPendingAction}
            onCancelAction={cancelPendingAction}
          />
        )
      )}
    </div>
  );


  const renderMessageExtras = (msg: ChatMessage, idx: number) => {
    if (msg.sender !== "ASSISTANT") {
      return null;
    }

    const formKey = `message-${msg.id || idx}`;
    const confirmations = dedupeConfirmations(extractConfirmationSpecs(msg.content));
    if (confirmations.length > 0) {
      return renderConfirmationCards(confirmations);
    }

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



  const extractThinkPayload = (content: string) => {
    const blockPattern = /<\s*(?:d?think|thought)\b[^>]*>([\s\S]*?)<\s*\/\s*(?:d?think|thought)\s*>/gi;
    const tagPattern = /<\/?\s*(?:d?think|thought)\b[^>]*>/gi;
    const openTagPattern = /<\s*(?:d?think|thought)\b[^>]*>/i;

    const thinkBlocks: string[] = [];
    let beforeThink = content;
    let afterThink = "";
    let firstStart = -1;
    let lastEnd = -1;
    let match: RegExpExecArray | null;

    while ((match = blockPattern.exec(content)) !== null) {
      if (firstStart === -1) {
        firstStart = match.index;
      }
      lastEnd = match.index + match[0].length;
      thinkBlocks.push(match[1]);
    }

    const unclosedOpen = firstStart === -1 ? content.search(openTagPattern) : -1;
    const hasThinkTag = firstStart !== -1 || unclosedOpen !== -1 || tagPattern.test(content);
    const hasUnclosedThink = unclosedOpen !== -1;

    if (firstStart !== -1) {
      beforeThink = content.slice(0, firstStart);
      afterThink = content.slice(lastEnd);
    } else if (unclosedOpen !== -1) {
      beforeThink = content.slice(0, unclosedOpen);
      afterThink = "";
      const openMatch = content.slice(unclosedOpen).match(openTagPattern);
      if (openMatch) {
        thinkBlocks.push(content.slice(unclosedOpen + openMatch[0].length));
      }
    }

    const sanitizeAnswerText = (text: string) =>
      text.replace(blockPattern, " ").replace(tagPattern, " ").trim();

    const thinkingText = thinkBlocks
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .join("\n\n");

    return {
      hasThinkTag,
      hasUnclosedThink,
      beforeThink: sanitizeAnswerText(beforeThink),
      afterThink: sanitizeAnswerText(afterThink),
      thinkingText,
    };
  };


  const renderAiMessage = (
    content: string,
    tools: ToolEvent[] = [],
    expanded?: string | null,
    collapseWhenComplete = false,
    forceThinkingOpen = false,
    isStreamingMessage = false,
  ) => {
    const displayContent = stripDynamicFormBlocks(content, collapseWhenComplete);
    const parsed = extractThinkPayload(displayContent);

    // Chỉ hiển thị hộp thinking nếu AI thực sự có thẻ <think> hoặc force = true
    const hasThinking = parsed.hasThinkTag || forceThinkingOpen;
    const isThinkingComplete = !parsed.hasUnclosedThink;
    
    // Nếu force mở mà không có text, hiện dòng mặc định
    const displayThinking = parsed.thinkingText || expanded || "Đang phân tích yêu cầu...";

    // hasVisibleResponse = true khi AI đã bắt đầu generate text (có response text ngoài thinking)
    const responseText = hasThinking
      ? [parsed.afterThink, parsed.beforeThink].filter(Boolean).join("\n\n")
      : displayContent;
    const hasVisibleResponse = responseText.trim().length > 0;

    return (
      <div className="flex flex-col gap-2 text-neutral-900 dark:text-neutral-100">

        {/* 1. Thinking block & Tools (bọc trong Accordion gọn gàng) */}
        {(hasThinking || (tools && tools.length > 0)) && (
          <ThinkingAccordion
            thinkingText={displayThinking}
            tools={tools}
            isThinkingComplete={isThinkingComplete}
            hasVisibleResponse={hasVisibleResponse}
            collapseWhenComplete={collapseWhenComplete}
            forceOpen={isStreamingMessage && !isThinkingComplete}
            t={t}
            confirmPendingAction={confirmPendingAction}
            cancelPendingAction={cancelPendingAction}
          />
        )}

        {/* Stuck indicator: thinking done, tools called, no response yet.
            Shows OUTSIDE accordion (which collapses when thinking is complete)
            during the gap between last tool result and first response token. */}
        {isStreamingMessage && isThinkingComplete && !hasVisibleResponse && tools && tools.length > 0 && (
          <PostToolProcessingRow
            toolName={tools[tools.length - 1].name}
            isComplete={hasVisibleResponse}
          />
        )}

        {/* 3. Response cuối cùng */}
        <div className="max-w-full prose prose-sm dark:prose-invert pt-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {hasThinking 
              ? [parsed.afterThink, parsed.beforeThink].filter(Boolean).join("\n\n")
              : displayContent}
          </ReactMarkdown>
        </div>
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
        return t("copilot.phase_queued");
      case "ROUTING":
        return t("copilot.phase_routing");
      case "THINKING":
        return t("copilot.phase_thinking");
      case "GENERATING":
        return t("copilot.phase_generating");
      case "FINALIZED":
        return t("copilot.phase_finalized");
      case "FAILED":
        return t("copilot.phase_failed");
      default:
        return t("copilot.phase_processing");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Sidebar: Session List */}
      <div className={`hidden md:flex border-r border-border/40 flex-col bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 transition-all duration-300 ${isSidebarCollapsed ? "w-16 items-center" : "w-64"}`}>
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
          {!isSidebarCollapsed && sessions.map(s => {
            const isEditing = editingSessionId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => !isEditing && setActiveSession(s)}
                className={`p-3 px-4 cursor-pointer flex justify-between items-center group transition-colors ${activeSession?.id === s.id
                    ? "bg-primary/15 text-primary dark:text-neutral-50 font-semibold"
                    : "hover:bg-white/20 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium"
                  }`}
              >
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void handleSaveTitle(s.id);
                        } else if (e.key === "Escape") {
                          setEditingSessionId(null);
                        }
                      }}
                      className="flex-1 text-sm bg-white/80 dark:bg-black/40 border border-black/20 dark:border-white/20 rounded px-1.5 py-0.5 text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shrink-0"
                      onClick={() => void handleSaveTitle(s.id)}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
                      onClick={() => setEditingSessionId(null)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100"
                      title={stripThinkArtifacts(s.title) || t("copilot.new_chat")}
                    >
                      {stripThinkArtifacts(s.title) || t("copilot.new_chat")}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/10"
                        onClick={() => {
                          setEditingSessionId(s.id);
                          setEditingTitle(stripThinkArtifacts(s.title) || t("copilot.new_chat"));
                        }}
                        title="Đổi tên"
                      >
                        <PencilLine className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-neutral-500 dark:text-neutral-400 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Xóa"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {!isSidebarCollapsed && sessions.length === 0 && (
            <div className="text-center text-neutral-500 dark:text-neutral-400 text-sm mt-4 font-medium">
              {t("copilot.no_sessions")}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-transparent relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 relative z-20">
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-background/95 backdrop-blur-xl border-r border-border/40">
              <SheetTitle className="sr-only">Chat Sessions</SheetTitle>
              <SheetDescription className="sr-only">List of your TaskPilot chat sessions</SheetDescription>
              {/* Session list inside drawer */}
              <div className="flex flex-col h-full bg-transparent">
                <div className="p-4 border-b border-border/40 flex items-center justify-between bg-transparent">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary shrink-0" /> {t("copilot.title")}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => { setActiveSession(null); setIsMobileSidebarOpen(false); }} className="h-8 w-8 hover:bg-primary/10 shrink-0" title="New Chat">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-border/20">
                  {sessions.map(s => {
                    const isEditing = editingSessionId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (!isEditing) {
                            setActiveSession(s);
                            setIsMobileSidebarOpen(false);
                          }
                        }}
                        className={`p-3 px-4 cursor-pointer flex justify-between items-center group transition-colors ${activeSession?.id === s.id
                            ? "bg-primary/15 text-primary dark:text-neutral-50 font-semibold"
                            : "hover:bg-white/20 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium"
                          }`}
                      >
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  void handleSaveTitle(s.id);
                                } else if (e.key === "Escape") {
                                  setEditingSessionId(null);
                                }
                              }}
                              className="flex-1 text-sm bg-white/80 dark:bg-black/40 border border-black/20 dark:border-white/20 rounded px-1.5 py-0.5 text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shrink-0"
                              onClick={() => void handleSaveTitle(s.id)}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
                              onClick={() => setEditingSessionId(null)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div
                              className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100"
                              title={stripThinkArtifacts(s.title) || t("copilot.new_chat")}
                            >
                              {stripThinkArtifacts(s.title) || t("copilot.new_chat")}
                            </div>
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setEditingSessionId(s.id);
                                  setEditingTitle(stripThinkArtifacts(s.title) || t("copilot.new_chat"));
                                }}
                                title="Đổi tên"
                              >
                                <PencilLine className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-neutral-500 dark:text-neutral-400 hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => handleDeleteSession(e, s.id)}
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
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

          <Button variant="ghost" size="icon" onClick={() => setActiveSession(null)} className="h-8 w-8 hover:bg-primary/10 shrink-0" title="New Chat">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {/* Messages */}
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
                <h3 className="text-xl font-bold text-foreground drop-shadow-sm sm:text-2xl">{t("copilot.welcome_title")}</h3>
                <p className="text-foreground/90 font-medium mt-3 leading-relaxed drop-shadow-sm text-xs sm:text-sm">
                  {t("copilot.welcome_desc")}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const extras = renderMessageExtras(msg, idx);
            if (msg.sender === "USER") {
              return (
                <div key={msg.id || idx} className="flex gap-3 justify-end w-full">
                  <div className="max-w-[85%] md:max-w-[70%]">
                    <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground rounded-br-none shadow-sm">
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground"><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                </div>
              );
            }

            // AI (ASSISTANT) Message - Gemini Style (No bubble background, full-width)
            return (
              <div key={msg.id || idx} className="flex gap-4 justify-start w-full border-b border-border/10 pb-6 mb-2">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5 flex items-center gap-1.5">
                    <span>TaskPilot AI</span>
                  </div>
                  <div className="text-neutral-900 dark:text-neutral-100">
                    {renderAiMessage(msg.content, (msg as any).toolEvents || [], null, true, false, false)}
                  </div>
                  {extras && <div className="mt-4">{extras}</div>}
                </div>
              </div>
            );
          })}

          {/* Streaming Message Placeholder */}
          {isStreaming && activeSession?.id === streamingSessionId && (isThinking || currentStreamMsg) && (
            <div className="flex gap-4 justify-start w-full pb-6">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5 flex items-center gap-1.5">
                  <span>TaskPilot AI</span>
                </div>
                <div className="text-neutral-900 dark:text-neutral-100">
                  {renderAiMessage(currentStreamMsg, toolEvents, expandedThinking, true, isThinking, true)}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/40 bg-background/10 backdrop-blur-[40px] backdrop-saturate-150 relative z-10">
          <ChatComposer
            placeholder={t("copilot.input_placeholder") + (!isMobile ? " (Enter để gửi, Shift+Enter để xuống dòng)" : "")}
            modelName={streamModel || "TaskPilot AI"}
            maxChars={MAX_PROMPT_CHARS}
            getLastPrompt={getLastPrompt}
            onSubmit={handleComposerSubmit}
            isStreaming={isStreaming}
            onStop={stopGenerating}
            stopTooltip={t("copilot.stop_generating")}
          />
        </div>
      </div>
    </div>
  );
}
