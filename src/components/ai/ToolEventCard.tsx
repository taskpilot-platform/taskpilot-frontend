import { useState, useEffect, useMemo } from "react";
import { Check, X } from "lucide-react";
import type { ToolEvent, PendingActionConfirmation } from "./aiChatTypes";
import { formatFriendlyToolPayload, parseConfirmationResult } from "./aiChatHelpers";
import { TypewriterMarkdown } from "./TypewriterMarkdown";

export function ToolEventCard({
  tool,
  compact = false,
  hideConfirm = false,
  onConfirmAction,
  onCancelAction,
}: {
  tool: ToolEvent;
  compact?: boolean;
  hideConfirm?: boolean;
  onConfirmAction?: (confirmation: PendingActionConfirmation) => void;
  onCancelAction?: (actionId: string) => void;
}) {
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
      {confirmation && !hideConfirm && (
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
export const PROCESSING_STEPS = [
  "Đang phân tích kết quả truy vấn...",
  "Lọc dữ liệu phù hợp yêu cầu...",
  "Đang xử lý thông tin...",
  "Tổng hợp dữ liệu...",
  "Chuẩn bị câu trả lời...",
  "Đối chiếu điều kiện...",
  "Xác thực kết quả...",
];

export function PostToolProcessingRow({ toolName, isComplete }: { toolName: string; isComplete: boolean }) {
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
export function StaggeredToolCard({
  tool,
  delayMs = 0,
  hideConfirm = false,
  onConfirmAction,
  onCancelAction,
}: {
  tool: ToolEvent;
  delayMs?: number;
  hideConfirm?: boolean;
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
        hideConfirm={hideConfirm}
        onConfirmAction={onConfirmAction}
        onCancelAction={onCancelAction}
      />
    </div>
  );
}

