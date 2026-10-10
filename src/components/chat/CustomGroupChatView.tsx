import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  customChatStorage,
  type CustomGroupChat,
} from "@/lib/custom-chat-storage";
import type { ProjectChatMessage } from "@/types/collab";

interface CustomGroupChatViewProps {
  group: CustomGroupChat;
  currentUserId: number | null;
  currentUserName?: string;
  onMeetNow?: () => void;
}

export const CustomGroupChatView: React.FC<CustomGroupChatViewProps> = ({
  group,
  currentUserId,
  currentUserName = "Tôi",
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView?.({ behavior });
  };

  useEffect(() => {
    const list = customChatStorage.getMessages(group.id);
    setMessages(list);
    setTimeout(() => scrollToBottom("auto"), 50);
  }, [group.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      const newMsg = customChatStorage.sendMessage(
        group.id,
        inputValue.trim(),
        currentUserId || 1,
        currentUserName
      );
      setMessages((prev) => [...prev, newMsg]);
      setInputValue("");
      setTimeout(() => scrollToBottom("smooth"), 50);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/50" data-testid="custom-group-chat-view">
      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium">
              {t("chat.empty_group_messages", {
                defaultValue: "Nhóm chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!",
              })}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.messageType === "SYSTEM") {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <Badge variant="secondary" className="text-xs font-normal py-1 px-3 bg-muted/60 text-muted-foreground border border-border/40">
                    {msg.content}
                  </Badge>
                </div>
              );
            }

            const isMe = currentUserId && msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8 border border-border/60 shrink-0">
                  <AvatarImage src={msg.senderAvatarUrl} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {msg.senderName?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>

                {/* Bubble */}
                <div className={`max-w-[75%] sm:max-w-[65%] space-y-1 ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                    <span className="font-medium text-foreground">{msg.senderName}</span>
                    <span>•</span>
                    <time>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>

                  <div
                    className={`p-3 rounded-xl text-sm leading-relaxed shadow-sm inline-block text-left ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-muted/70 text-foreground border border-border/40 rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Bar */}
      <div className="p-3 border-t border-border/60 bg-card/80 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            placeholder={t("chat.input_placeholder", {
              defaultValue: `Gửi tin nhắn trong nhóm ${group.name}...`,
            })}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
            className="flex-1 text-xs sm:text-sm bg-background border-border/70"
            data-testid="group-chat-input"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isSending || !inputValue.trim()}
            className="gap-1.5 px-3 shrink-0"
            data-testid="group-chat-send-btn"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">{t("chat.send", { defaultValue: "Gửi" })}</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
