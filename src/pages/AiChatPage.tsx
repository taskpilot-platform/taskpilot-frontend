import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Trash2, Plus, Loader2, Info } from "lucide-react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/auth.store";
import { aiService, type ChatSession, type ChatMessage } from "@/services/ai.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [currentStreamMsg, setCurrentStreamMsg] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    } else {
      setMessages([]);
    }
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamMsg]);

  async function loadSessions() {
    try {
      const data = await aiService.getSessions(0, 50);
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
    if (!inputVal.trim() || isStreaming) return;

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
    setCurrentStreamMsg("");

    let responseBuffer = "";
    
    try {
      await fetchEventSource(`${API_BASE_URL}/v1/ai/sessions/${targetSession.id}/stream?message=${encodeURIComponent(messageText)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "text/event-stream",
        },
        onmessage(ev) {
          if (ev.event === "token") {
            responseBuffer += ev.data;
            setCurrentStreamMsg(responseBuffer);
          } else if (ev.event === "error") {
             toast.error(ev.data);
          }
        },
        onerror(err) {
          console.error("SSE Error:", err);
          throw err;
        },
        onclose() {
          // SSE closed
        }
      });
      
      // Request finished, save assistant message
      if (responseBuffer) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: "ASSISTANT",
          content: responseBuffer,
          createdAt: new Date().toISOString()
        }]);
      }
      
      // Refresh sessions to update auto-title
      loadSessions();
      
    } catch (err) {
      toast.error(t("copilot.error_ai_connection"));
    } finally {
      setIsStreaming(false);
      setCurrentStreamMsg("");
    }
  }

  // Helper to render AI message with <think> tag support
  const renderAiMessage = (content: string) => {
    // If it contains <think>, split it
    const thinkStart = content.indexOf("<think>");
    const thinkEnd = content.indexOf("</think>");

    if (thinkStart !== -1 && thinkEnd > thinkStart) {
      const beforeThink = content.substring(0, thinkStart);
      const thinking = content.substring(thinkStart + 7, thinkEnd);
      const afterThink = content.substring(thinkEnd + 8);

      return (
        <div className="flex flex-col gap-2">
          {beforeThink && <ReactMarkdown remarkPlugins={[remarkGfm]}>{beforeThink}</ReactMarkdown>}
          <details className="cursor-pointer text-sm text-gray-500 bg-gray-100 p-2 rounded border border-gray-200">
            <summary className="font-semibold flex items-center gap-2">
              <Info className="w-4 h-4" /> {t("copilot.thinking_accordion_label")}
            </summary>
            <div className="mt-2 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
              {thinking}
            </div>
          </details>
          {afterThink && (
            <div className="prose prose-sm mt-2 max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{afterThink}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    } else if (thinkStart !== -1 && thinkEnd === -1) {
      // Still thinking...
      const thinking = content.substring(thinkStart + 7);
      return (
        <div className="flex flex-col gap-2">
           <details open className="cursor-pointer text-sm text-gray-500 bg-gray-100 p-2 rounded border border-gray-200">
            <summary className="font-semibold animate-pulse flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("copilot.thinking_spinner_label")}
            </summary>
            <div className="mt-2 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
              {thinking}
            </div>
          </details>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-full text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Sidebar: Session List */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" /> {t("copilot.title")}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNewSession} className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`p-3 rounded-md cursor-pointer flex justify-between items-center group transition-colors ${
                activeSession?.id === s.id ? "bg-indigo-50 text-indigo-700 font-medium" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex-1 truncate text-sm">
                {s.title || t("copilot.new_chat")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={(e) => handleDeleteSession(e, s.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-4">
              {t("copilot.no_sessions")}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pt-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.length === 0 && !currentStreamMsg && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{t("copilot.welcome_title")}</h3>
                <p className="text-gray-500 mt-2 max-w-md">
                  {t("copilot.welcome_desc")}
                </p>
              </div>
            </div>
          )}
          
          {messages.map((msg, idx) => (
             <div key={msg.id || idx} className={`flex gap-3 ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}>
                {msg.sender !== "USER" && (
                   <Avatar className="w-8 h-8">
                     <AvatarFallback className="bg-indigo-100 text-indigo-600"><Bot className="w-4 h-4"/></AvatarFallback>
                   </Avatar>
                )}
                
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.sender === "USER" 
                    ? "bg-indigo-600 text-white rounded-br-none" 
                    : "bg-gray-100 border border-gray-200 rounded-bl-none"
                }`}>
                  {msg.sender === "USER" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    renderAiMessage(msg.content)
                  )}
                </div>

                {msg.sender === "USER" && (
                   <Avatar className="w-8 h-8">
                     <AvatarFallback className="bg-gray-200 text-gray-600"><User className="w-4 h-4"/></AvatarFallback>
                   </Avatar>
                )}
             </div>
          ))}

          {/* Streaming Message Placeholder */}
          {currentStreamMsg && (
             <div className="flex gap-3 justify-start">
               <Avatar className="w-8 h-8">
                 <AvatarFallback className="bg-indigo-100 text-indigo-600">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                 </AvatarFallback>
               </Avatar>
               <div className="max-w-[80%] rounded-2xl p-4 bg-gray-50 border border-indigo-100 rounded-bl-none shadow-sm">
                  {renderAiMessage(currentStreamMsg)}
               </div>
             </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-center gap-2 max-w-4xl mx-auto relative"
          >
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={t("copilot.input_placeholder")}
              className="flex-1 py-6 pl-4 pr-12 rounded-full border-gray-300 focus-visible:ring-indigo-500 text-base"
              disabled={isStreaming}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!inputVal.trim() || isStreaming}
              className="absolute right-1.5 h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center p-0"
            >
              <Send className="w-4 h-4 ml-1" />
            </Button>
          </form>
          <div className="text-center text-xs text-gray-400 mt-2">
            {t("copilot.disclaimer")}
          </div>
        </div>
      </div>
    </div>
  );
}
