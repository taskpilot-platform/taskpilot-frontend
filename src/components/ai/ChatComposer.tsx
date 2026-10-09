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
          className="min-h-[96px] flex-1 resize-none rounded-xl border border-border/80 pr-14 text-sm bg-background/80 focus:bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-colors shadow-sm"
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
      <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground font-medium px-1">
        {/* Model badge – bottom-left of composer */}
        {modelName && modelName !== "TaskPilot AI" ? (
          <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground select-none">
            <Bot className="w-3 h-3 shrink-0 text-primary" />
            <span className="truncate max-w-[160px]">{modelName}</span>
          </div>
        ) : (
          <div />
        )}
        <div className="font-mono text-[11px]">
          {value.length}/{maxChars}
        </div>
      </div>
    </>
  );
});

