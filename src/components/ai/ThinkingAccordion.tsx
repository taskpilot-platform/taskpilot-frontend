import { memo, useState, useRef, useMemo, useEffect } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ToolEvent, PendingActionConfirmation } from "./aiChatTypes";
import { markdownComponents } from "./TypewriterMarkdown";
import { PostToolProcessingRow, StaggeredToolCard } from "./ToolEventCard";

export const ThinkingAccordion = memo(function ThinkingAccordion({
  thinkingText,
  tools,
  isThinkingComplete,
  hasVisibleResponse,
  collapseWhenComplete,
  forceOpen,
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
                       hideConfirm={true}
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

