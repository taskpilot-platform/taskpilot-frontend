import { memo, useState, useRef } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatComposerProps } from "./aiChatTypes";

export const ChatComposer = memo(function ChatComposer({ placeholder, modelName, maxChars, getLastPrompt, onSubmit, isStreaming, onStop, stopTooltip }: ChatComposerProps) {
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

