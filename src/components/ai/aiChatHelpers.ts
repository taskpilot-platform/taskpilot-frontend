import type {
  ToolAccess,
  ToolEvent,
  AssignmentRequirementRow,
  AssignmentRequest,
  AssignmentDraft,
  DynamicFormSpec,
  PendingActionConfirmation,
  ConfirmedTaskMutation,
} from "./aiChatTypes";

export const WRITE_TOOL_NAMES = new Set(["assignTaskToMember", "assignTaskToMemberByName", "recommendAndAssignTask", "updateTaskRequiredSkills", "updateTaskStatus", "patchTask", "patchProject", "patchSprint", "patchTaskComment", "createSystemSkill", "patchSystemSkill", "deleteSystemSkill", "addMySkill", "patchMySkill", "deleteMySkill", "markNotificationRead", "markAllNotificationsRead", "createTask", "createSprint", "startSprint", "completeSprint", "assignTaskToSprint"]);

export function createAssignmentRow(taskId = "", id?: string): AssignmentRequirementRow {
  return {
    id: id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    taskId,
    skills: "",
    difficulty: "5",
  };
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u00c4\u2018/g, "d");
}

export function extractAssignmentRequest(content: string): AssignmentRequest | null {
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

export function createAssignmentDraft(formKey: string, request: AssignmentRequest): AssignmentDraft {
  const taskIds = request.taskIds.length > 0 ? request.taskIds : [""];
  return {
    projectId: request.projectId,
    mode: "recommend",
    rows: taskIds.map((taskId, index) => createAssignmentRow(taskId, `${formKey}-${taskId || index}`)),
  };
}

export function stripDynamicFormBlocks(content: string, isComplete = true) {
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

export function extractDynamicFormSpec(content: string): DynamicFormSpec | null {
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

export function parseConfirmationResult(value?: string) {
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

export function extractConfirmationSpecs(content: string): PendingActionConfirmation[] {
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

export function isSkillFieldName(name: string) {
  const normalized = name.toLowerCase();
  return normalized === "skills" || normalized === "requiredskills" || normalized === "required_skills" || normalized === "requiredskillids";
}

export function taskIdFromFormIntent(intent?: string) {
  if (!intent) return null;
  const match = intent.match(/(?:task|assign_task|reassign_task)[_-]?(\d+)/i);
  return match?.[1] ?? null;
}

export function isTaskAssignmentForm(spec: DynamicFormSpec) {
  const intent = spec.intent?.toLowerCase() ?? "";
  const hasSkillField = spec.fields.some((field) => isSkillFieldName(field.name));
  return hasSkillField && (intent.includes("assign") || intent.includes("reassign") || intent.includes("task"));
}

export function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function mutationFromConfirmation(confirmation: PendingActionConfirmation): ConfirmedTaskMutation {
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

export function confirmationDedupeKey(confirmation: PendingActionConfirmation) {
  const mutation = mutationFromConfirmation(confirmation);
  return [
    mutation.toolName || confirmation.toolName || "pendingAction",
    mutation.taskId ? `task:${mutation.taskId}` : "",
    mutation.projectId ? `project:${mutation.projectId}` : "",
  ].filter(Boolean).join("|") || confirmation.actionId;
}

export function dedupeConfirmations(confirmations: PendingActionConfirmation[]) {
  const byKey = new Map<string, PendingActionConfirmation>();
  for (const confirmation of confirmations) {
    byKey.set(confirmationDedupeKey(confirmation), confirmation);
  }
  return Array.from(byKey.values());
}

export function dedupeToolEvents(events: ToolEvent[]) {
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

export function notifyTaskMutation(mutation: ConfirmedTaskMutation) {
  window.dispatchEvent(new CustomEvent("taskpilot:task-updated", { detail: mutation }));
  try {
    localStorage.setItem("taskpilot_task_updated", JSON.stringify({ ...mutation, at: Date.now() }));
  } catch {
    // Best-effort cross-tab refresh signal.
  }
}

export function stripThinkArtifacts(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/<\s*(?:d?think|thought)\b[^>]*>[\s\S]*?<\s*\/\s*(?:d?think|thought)\s*>/gi, " ")
    .replace(/<\/?\s*(?:d?think|thought)\b[^>]*>/gi, " ")
    .replace(/```taskpilot-(?:form|confirm)\s*[\s\S]*?```/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}



export function getToolAccess(name: string): ToolAccess {
  return WRITE_TOOL_NAMES.has(name) ? "write" : "read";
}

// Danh sách key kỹ thuật cần ẩn khỏi output
export const ID_KEY_PATTERN = /^id$|id$/i;

// Helper: format 1 object thành dòng markdown (lọc ID)
export function formatObjectLine(item: Record<string, unknown>): string {
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
export function tryRepairTruncatedJson(raw: string): unknown | null {
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

export function formatFriendlyToolPayload(value?: string) {
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

export function formatToolPayload(value?: string) {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function summarizeToolResult(value?: string) {
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

export const TOOL_NAME_MAPPING: Record<string, string> = {
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



export const parseThinkingToSteps = (thinking: string, stepTitlePrefix: string) => {
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



  export const parseInterleavedContent = (content: string) => {
    interface Segment {
      type: 'think' | 'response';
      content: string;
      isUnclosed?: boolean;
    }
    const segments: Segment[] = [];
    let currentIndex = 0;

    while (currentIndex < content.length) {
      const openMatch = content.slice(currentIndex).match(/<(d?think|thought)\b[^>]*>/i);
      if (!openMatch) {
        const remaining = content.slice(currentIndex).trim();
        if (remaining) {
          segments.push({ type: 'response', content: remaining });
        }
        break;
      }

      const openTagIndex = currentIndex + openMatch.index!;
      const beforeText = content.slice(currentIndex, openTagIndex).trim();
      if (beforeText) {
        segments.push({ type: 'response', content: beforeText });
      }

      const openTagLength = openMatch[0].length;
      const tagName = openMatch[1];
      const closeTagRegex = new RegExp(`</\\s*${tagName}\\s*>`, 'i');
      const closeMatch = content.slice(openTagIndex + openTagLength).match(closeTagRegex);

      if (!closeMatch) {
        const thinkContent = content.slice(openTagIndex + openTagLength);
        segments.push({ type: 'think', content: thinkContent, isUnclosed: true });
        break;
      }

      const closeTagIndex = openTagIndex + openTagLength + closeMatch.index!;
      const thinkContent = content.slice(openTagIndex + openTagLength, closeTagIndex);
      segments.push({ type: 'think', content: thinkContent, isUnclosed: false });

      currentIndex = closeTagIndex + closeMatch[0].length;
    }

    return segments;
  };

  export const extractThinkPayload = (content: string) => {
    const segments = parseInterleavedContent(content);
    const hasThinkTag = segments.some(s => s.type === 'think');
    const lastSegment = segments[segments.length - 1];
    const hasUnclosedThink = lastSegment ? (lastSegment.type === 'think' && !!lastSegment.isUnclosed) : false;

    const responseText = segments
      .filter(s => s.type === 'response')
      .map(s => s.content)
      .join("\n\n");

    const thinkingText = segments
      .filter(s => s.type === 'think')
      .map(s => s.content.trim())
      .filter(Boolean)
      .join("\n\n");

    return {
      hasThinkTag,
      hasUnclosedThink,
      beforeThink: responseText,
      afterThink: "",
      thinkingText,
    };
  };
