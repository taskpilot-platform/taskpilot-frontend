import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const markdownComponents = {
  p: ({ children }: any) => <p className="mb-2.5 leading-relaxed last:mb-0 text-foreground/90">{children}</p>,
  ul: ({ children }: any) => <ul className="my-2 ml-4 list-disc space-y-1.5 text-sm marker:text-primary/70">{children}</ul>,
  ol: ({ children }: any) => <ol className="my-2 ml-4 list-decimal space-y-1.5 text-sm marker:text-primary/70">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed text-foreground/90">{children}</li>,
  table: ({ children }: any) => (
    <div className="w-full overflow-x-auto my-3 border border-border/80 rounded-xl bg-card/60 shadow-2xs scrollbar-thin">
      <table className="min-w-full divide-y divide-border/60 text-xs text-left">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-muted/50 text-foreground font-semibold">{children}</thead>,
  th: ({ children }: any) => <th className="px-3.5 py-2 font-semibold border-r border-border/40 last:border-r-0 text-foreground">{children}</th>,
  td: ({ children }: any) => <td className="px-3.5 py-2 border-r border-t border-border/40 last:border-r-0 text-foreground/90">{children}</td>,
  tr: ({ children }: any) => <tr className="hover:bg-muted/30 transition-colors odd:bg-muted/10">{children}</tr>,
  pre: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-zinc-950 p-3 text-xs font-mono text-zinc-100 shadow-2xs">
      <pre className="p-0 m-0">{children}</pre>
    </div>
  ),
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    if (language === "taskpilot-confirm" || language === "taskpilot-form") {
      return (
        <div className="my-2 animate-pulse rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary font-medium">
          Đang chuẩn bị biểu mẫu tương tác...
        </div>
      );
    }
    if (inline) {
      return (
        <code className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground font-medium" {...props}>
          {children}
        </code>
      );
    }
    return <code className={`font-mono text-xs ${className || ""}`} {...props}>{children}</code>;
  },
  a: ({ href, children }: any) => {
    if (href && (href.startsWith("/") || href.includes("localhost:") || href.includes("taskpilot-platform.netlify.app"))) {
      const urlPath = href.startsWith("/") 
        ? href 
        : href.replace(/^https?:\/\/[^/]+/, "");
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            window.open(window.location.origin + urlPath, "_blank");
          }}
          className="text-primary underline font-medium hover:opacity-80 transition-opacity"
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium hover:opacity-80 transition-opacity">
        {children}
      </a>
    );
  }
};

export const TypewriterMarkdown = ({ text, speed = 15 }: { text: string; speed?: number }) => {
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
