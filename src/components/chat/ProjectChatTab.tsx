import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  FileText,
  Wifi,
  WifiOff,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectChatService } from "@/services/project-chat.service";
import { projectFilesService } from "@/services/project-files.service";
import { useAuthStore } from "@/stores/auth.store";
import { profileService } from "@/services/profile.service";
import type { ProjectChatMessage } from "@/types/collab";

interface ProjectChatTabProps {
  projectId: number;
  isArchived?: boolean;
  currentUserId?: number | null;
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({
  projectId,
  isArchived = false,
  currentUserId: propUserId,
}) => {
  const token = useAuthStore((state) => state.accessToken);
  const [currentUserId, setCurrentUserId] = useState<number | null>(propUserId ?? null);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propUserId) {
      setCurrentUserId(propUserId);
    } else {
      void profileService.getMe()
        .then((res) => {
          if (res.data?.id) {
            setCurrentUserId(res.data.id);
          }
        })
        .catch(() => {
          // ignore profile fetch failure in chat tab
        });
    }
  }, [propUserId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch initial history
  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      setError(null);
      try {
        const res = await projectChatService.getMessages(projectId, 0, 50);
        if (mounted && res.data?.content) {
          // Reverse because history is returned in desc order
          setMessages([...res.data.content].reverse());
          setTimeout(() => scrollToBottom("auto"), 100);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Failed to load chat history";
          setError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    void fetchHistory();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  // Connect WebSocket STOMP
  useEffect(() => {
    const stompClient = projectChatService.createStompClient(
      projectId,
      token,
      (incomingMessage) => {
        setMessages((prev) => {
          // Avoid duplicate messages if already present
          if (prev.some((m) => m.id === incomingMessage.id)) return prev;
          return [...prev, incomingMessage];
        });
        setTimeout(() => scrollToBottom("smooth"), 50);
      },
      (connected) => {
        setIsConnected(connected);
      }
    );

    return () => {
      void stompClient.deactivate();
    };
  }, [projectId, token]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = inputValue.trim();
    if (!content || isSending || isArchived) return;

    setIsSending(true);
    try {
      const res = await projectChatService.sendMessage(projectId, {
        content,
        messageType: "TEXT",
      });
      if (res.data) {
        // If not already received via WebSocket, append
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setInputValue("");
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Project Chat Room
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time team messaging and discussions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
              <Wifi className="h-3.5 w-3.5" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10">
              <WifiOff className="h-3.5 w-3.5" />
              Reconnecting
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Chat Container Card */}
      <Card className="border-muted/60 shadow-sm flex flex-col h-[600px]">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Project Conversation</span>
            <span className="text-xs font-normal text-muted-foreground">
              {messages.length} messages
            </span>
          </CardTitle>
        </CardHeader>

        {/* Messages Stream */}
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
          {isLoadingHistory && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-base font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Say hello to your project teammates to kick off collaboration!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = currentUserId && msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden text-xs font-semibold text-primary">
                    {msg.senderAvatarUrl ? (
                      <img
                        src={msg.senderAvatarUrl}
                        alt={msg.senderName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      msg.senderName?.charAt(0).toUpperCase() || <User className="h-4 w-4" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] sm:max-w-[65%] space-y-1 ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                      <span className="font-medium text-foreground">{msg.senderName}</span>
                      <span>•</span>
                      <time>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm inline-block text-left ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted/60 text-foreground border border-border/40 rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                      {msg.fileId && msg.fileName && (
                        <div className="mt-2 pt-2 border-t border-current/20 flex items-center gap-2 text-xs">
                          <FileText className="h-4 w-4 shrink-0" />
                          <a
                            href={projectFilesService.downloadFileUrl(projectId, msg.fileId)}
                            className="underline truncate hover:opacity-80"
                            download={msg.fileName}
                          >
                            {msg.fileName}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Bar */}
        <div className="p-3 border-t border-border/40 bg-background shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isArchived ? "Project is archived" : "Type a message... (Press Enter to send)"}
              disabled={isArchived || isSending}
              className="flex-1 bg-muted/20 border-muted"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isSending || isArchived}
              className="gap-1.5 shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
