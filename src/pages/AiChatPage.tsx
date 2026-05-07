import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Trash2, Plus, Loader2, Info, ChevronRight, CheckCircle2, Search, BrainCircuit, Zap } from "lucide-react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/auth.store";
import { aiService, type ChatSession, type ChatMessage } from "@/services/ai.service";
import type { ChatStreamPhase } from "@/types/chat-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

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
  const [toolEvents, setToolEvents] = useState<Array<{ name: string; arguments?: string; result?: string }>>([]);
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeStreamControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const activeSessionIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const abortActiveStream = () => {
    if (activeStreamControllerRef.current) {
      activeStreamControllerRef.current.abort();
      activeStreamControllerRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadSessions();
    return () => {
      // Keep in-flight stream alive like Gemini web behavior.
      isMountedRef.current = false;
      stopPolling();
    };
  }, []);

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

    const tick = async () => {
      try {
        const status = await aiService.getStreamStatus(sessionId, clientMessageId);
        if (!status || !isMountedRef.current) {
          return;
        }

        setStreamPhase(status.phase);
        setStreamModel(status.modelUsed ?? "");

        if (status.phase === "THINKING" || status.phase === "ROUTING" || status.phase === "QUEUED") {
          setIsThinking(true);
        }

        if (status.phase === "FINALIZED") {
          clearPendingRequest(sessionId);
          stopPolling();
          setIsStreaming(false);
          setIsThinking(false);
          setCurrentStreamMsg("");
          setStreamingSessionId(null);
          if (activeSessionIdRef.current === sessionId) {
            await loadMessages(sessionId);
            await loadSessions();
          }
          return;
        }

        if (status.phase === "FAILED") {
          clearPendingRequest(sessionId);
          stopPolling();
          setIsStreaming(false);
          setIsThinking(false);
          setCurrentStreamMsg("");
          setStreamingSessionId(null);
          toast.error(status.errorMessage || t("copilot.error_ai_connection"));
        }
      } catch {
        // Ignore polling jitter and retry on next interval tick.
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
      if (data.content.length > 0 && !activeSession) {
        setActiveSession(data.content[0]);
      }
    } catch (error) {
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
    } catch (error) {
      toast.error(t("copilot.error_load_messages"));
    }
  }

  async function handleNewSession() {
    try {
      const newSession = await aiService.createSession();
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession);
      setMessages([]);
    } catch (error) {
      toast.error(t("copilot.error_create_session"));
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
    } catch (error) {
      toast.error(t("copilot.error_delete_session"));
    }
  }

  async function sendMessage() {
    if (!inputVal.trim()) return;

    if (isStreaming) {
      abortActiveStream();
    }

    let targetSession = activeSession;
    if (!targetSession) {
      try {
        targetSession = await aiService.createSession();
        setSessions([targetSession, ...sessions]);
        setActiveSession(targetSession);
      } catch (error) {
        toast.error(t("copilot.error_create_session_short"));
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "USER",
      content: inputVal,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputVal;
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
              if (toolName) {
                const toolEvent: { name: string; arguments?: string; result?: string } = {
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
              if (parsed.expanded) {
                setExpandedThinking(parsed.expanded);
              }
            } catch {
              // Ignore malformed expanded thinking.
            }
          } else if (ev.event === "error") {
            toast.error(ev.data);
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
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) {
        toast.error(t("copilot.error_ai_connection"));
      }
    } finally {
      if (activeStreamControllerRef.current === controller) {
        activeStreamControllerRef.current = null;
      }
      if (isMountedRef.current) {
        if (streamCompleted) {
          setIsStreaming(false);
          setIsThinking(false);
          setCurrentStreamMsg("");
          setStreamingSessionId(null);
          setToolEvents([]);
        }
      }
    }
  }

  // Helper to parse thinking content into steps
  const parseThinkingToSteps = (thinking: string, tools: typeof toolEvents) => {
    // Split by "Step X:" or significant newlines
    const rawSteps = thinking.split(/(?=Step \d+:)/g).filter(s => s.trim().length > 0);
    const steps: Array<{ type: 'thought' | 'tool', content: string, title?: string, toolData?: any }> = [];

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

  // Helper to render AI message with <think> tag support
  const renderAiMessage = (content: string, tools: typeof toolEvents = [], expanded?: string | null) => {
    const thinkStart = content.indexOf("<think>");
    const thinkEnd = content.indexOf("</think>");

    if (thinkStart !== -1) {
      const beforeThink = content.substring(0, thinkStart);
      const isThinkingComplete = thinkEnd > thinkStart;
      
      // Use expanded thinking if available and thinking is complete
      const displayThinking = (isThinkingComplete && expanded) 
        ? expanded 
        : (isThinkingComplete 
            ? content.substring(thinkStart + 7, thinkEnd) 
            : content.substring(thinkStart + 7));
            
      const afterThink = isThinkingComplete ? content.substring(thinkEnd + 8) : "";

      const steps = parseThinkingToSteps(displayThinking, tools);

      return (
        <div className="flex flex-col gap-4">
          {beforeThink && <div className="prose prose-sm dark:prose-invert max-w-full"><ReactMarkdown remarkPlugins={[remarkGfm]}>{beforeThink}</ReactMarkdown></div>}
          
          <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
              <BrainCircuit className="w-4 h-4" />
              <span>{t("copilot.thinking_accordion_label")}</span>
              {!isThinkingComplete && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </div>
            
            <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
              {steps.map((step, idx) => (
                <div key={idx} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center z-10 group-last:bg-primary/10 group-last:border-primary/30 transition-colors">
                    {idx < steps.length - 1 || isThinkingComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{step.title}</span>
                    <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">{step.content}</p>
                  </div>
                </div>
              ))}

              {/* Integrated Tools in the timeline */}
              {tools.map((tool, tIdx) => (
                <div key={`tool-${tIdx}`} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center z-10">
                    <Search className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="flex flex-col bg-background/50 p-2 rounded-lg border border-border/40">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Action: {tool.name}
                    </span>
                    {tool.arguments && (
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded mt-1 text-muted-foreground truncate max-w-full">
                        {tool.arguments}
                      </code>
                    )}
                    {tool.result && (
                      <div className="mt-2 text-xs text-muted-foreground border-l-2 border-blue-200 pl-2 py-1 italic line-clamp-2">
                        {tool.result}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {afterThink && (
            <div className="prose prose-sm dark:prose-invert max-w-full pt-2 border-t border-border/30 mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{afterThink}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-full prose prose-sm dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background border border-border rounded-lg shadow-sm">
      {/* Sidebar: Session List */}
      <div className="w-64 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> {t("copilot.title")}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNewSession} className="h-8 w-8 hover:bg-primary/10">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`p-3 rounded-md cursor-pointer flex justify-between items-center group transition-colors ${activeSession?.id === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
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
          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-4">
              {t("copilot.no_sessions")}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pt-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
            </div>
          )}

          {messages.length === 0 && !currentStreamMsg && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">{t("copilot.welcome_title")}</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {t("copilot.welcome_desc")}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex gap-3 ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}>
              {msg.sender !== "USER" && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-4 h-4" /></AvatarFallback>
                </Avatar>
              )}

              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === "USER"
                ? "bg-primary text-primary-foreground rounded-br-none"
                : "bg-muted border border-border rounded-bl-none text-foreground"
                }`}>
                {msg.sender === "USER" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  renderAiMessage(msg.content)
                )}
              </div>

              {msg.sender === "USER" && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-muted text-muted-foreground"><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

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
        <div className="p-4 border-t border-border bg-background/50">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
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
              className="min-h-[96px] flex-1 resize-none rounded-2xl border-border pr-14 text-base bg-background"
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
          <div className="text-center text-xs text-muted-foreground mt-2">
            {t("copilot.disclaimer")}
          </div>
        </div>
      </div>
    </div>
  );
}
