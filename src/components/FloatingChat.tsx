import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const MyUserMessage = () => (
  <div className="flex justify-end mb-3">
    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-sm max-w-[80%] text-sm">
      <MessagePrimitive.Content />
    </div>
  </div>
);

const MyAssistantMessage = () => (
  <div className="flex justify-start mb-3">
    <div className="flex items-start gap-2 max-w-[85%]">
      <span className="text-lg mt-0.5">🤖</span>
      <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-sm text-sm">
        <MessagePrimitive.Content />
      </div>
    </div>
  </div>
);

const chatModelAdapter: ChatModelAdapter = {
  async run({ messages }) {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    const userText =
      lastUserMessage?.content
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: userText,
      });

      return {
        content: [{ type: "text" as const, text: response.text ?? "" }],
      };
    } catch (error) {
      console.error("🔥 LỖI GEMINI CHI TIẾT:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: "Xin lỗi, em đang bị lỗi kết nối. Sếp check lại F12 nhé 😢",
          },
        ],
      };
    }
  },
};

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const runtime = useLocalRuntime(chatModelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isOpen && (
          <div className="mb-4 w-[400px] h-[600px] bg-background border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold">TaskPilot Copilot</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-red-400 hover:bg-slate-800 rounded-full h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ThreadPrimitive.Root className="flex-1 flex flex-col overflow-hidden">
              <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
                <ThreadPrimitive.Empty>
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <span className="text-4xl">🤖</span>
                    <p className="text-sm font-medium">TaskPilot Copilot</p>
                    <p className="text-xs">Hỏi mình bất cứ điều gì!</p>
                  </div>
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages
                  components={{
                    UserMessage: MyUserMessage,
                    AssistantMessage: MyAssistantMessage,
                  }}
                />
              </ThreadPrimitive.Viewport>

              <div className="border-t p-3">
                <ComposerPrimitive.Root className="flex items-end gap-2">
                  <ComposerPrimitive.Input
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <ComposerPrimitive.Send asChild>
                    <Button size="icon" className="rounded-lg h-9 w-9 shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
              </div>
            </ThreadPrimitive.Root>
          </div>
        )}

        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-14 h-14 shadow-[0_0_20px_rgba(37,99,235,0.4)] bg-blue-600 hover:bg-blue-700 hover:scale-110 transition-all duration-300"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        )}
      </div>
    </AssistantRuntimeProvider>
  );
}
