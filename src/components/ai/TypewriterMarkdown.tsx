import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const markdownComponents = {
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
          className="text-blue-600 dark:text-blue-400 underline font-bold cursor-pointer hover:opacity-85"
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline font-bold hover:opacity-85">
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
