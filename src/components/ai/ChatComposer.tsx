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
          rows={2}
          className="min-h-[68px] sm:min-h-[80px] max-h-[200px] flex-1 resize-none rounded-2xl border border-border/80 pr-14 pl-4 py-3 text-sm bg-background/90 focus:bg-background text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 transition-all shadow-2xs leading-relaxed"
        />
        {isStreaming ? (
          <div className="group absolute bottom-2 right-2">
            <Button
              type="button"
              onClick={onStop}
              aria-label={stopTooltip}
              className="h-8 w-8 rounded-xl bg-destructive/90 hover:bg-destructive text-destructive-foreground flex items-center justify-center p-0 transition-all shadow-xs z-10"
            >
              <span className="h-3 w-3 rounded-xs bg-destructive-foreground animate-pulse" />
            </Button>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 max-w-[220px] whitespace-nowrap rounded-lg bg-neutral-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-neutral-950">
              {stopTooltip}
            </div>
          </div>
        ) : (
          <Button
            type="submit"
            disabled={!trimmedValue}
            className="absolute bottom-2 right-2 h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center p-0 transition-all shadow-xs disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </form>
      <div className="mt-1.5 flex justify-between items-center text-xs text-muted-foreground font-medium px-1">
        {/* Model badge – bottom-left of composer */}
        {modelName && modelName !== "TaskPilot AI" ? (
          <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground select-none">
            <Bot className="w-3 h-3 shrink-0 text-primary" />
            <span className="truncate max-w-[180px]">{modelName}</span>
          </div>
        ) : (
          <div />
        )}
        <div className="font-mono text-[10px]">
          {value.length}/{maxChars}
        </div>
      </div>
    </>
  );
});

