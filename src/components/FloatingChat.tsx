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
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const githubToken = import.meta.env.VITE_GITHUB_TOKEN;

// Khởi tạo client gọi lên GitHub Models
const openai = githubToken
  ? new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: githubToken,
      dangerouslyAllowBrowser: true,
    })
  : null;

const gemini = import.meta.env.VITE_GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
  : null;

type Provider = "github" | "gemini";

type ModelConfig = {
  provider: Provider;
  model: string;
  // Ngưỡng input an toàn ước lượng theo token để tránh gọi model chắc chắn fail.
  safeInputTokens: number;
  intelligenceRank: number;
};

const MODEL_CATALOG: ModelConfig[] = [
  // Ưu tiên model miễn phí thực tế đang ổn định trên API trước, tránh 404 do model chưa mở cho key.
  { provider: "gemini", model: "gemini-2.5-flash", safeInputTokens: 1_000_000, intelligenceRank: 1460 },
  { provider: "gemini", model: "gemini-2.0-flash", safeInputTokens: 1_000_000, intelligenceRank: 1418 },
  { provider: "gemini", model: "gemini-2.0-flash-lite", safeInputTokens: 1_000_000, intelligenceRank: 1395 },
  { provider: "github", model: "DeepSeek-R1", safeInputTokens: 4000, intelligenceRank: 1426 },
  { provider: "github", model: "o3-mini", safeInputTokens: 4000, intelligenceRank: 1424 },
  { provider: "github", model: "gpt-4o-mini", safeInputTokens: 8000, intelligenceRank: 1420 },
  { provider: "github", model: "Llama-4-Maverick", safeInputTokens: 8000, intelligenceRank: 1410 },
  // Nhóm 3.x để cuối làm fallback vì nhiều key v1beta chưa được bật nên dễ 404.
  { provider: "gemini", model: "gemini-3.1-pro", safeInputTokens: 1_000_000, intelligenceRank: 1200 },
  { provider: "gemini", model: "gemini-3-flash", safeInputTokens: 1_000_000, intelligenceRank: 1190 },
  { provider: "gemini", model: "gemini-3.1-flash-lite", safeInputTokens: 1_000_000, intelligenceRank: 1180 },
];

const LARGE_INPUT_THRESHOLD_TOKENS = 3200;
const TOKEN_ESTIMATE_DIVISOR = 4;

const estimateInputTokens = (text: string) =>
  Math.ceil(text.length / TOKEN_ESTIMATE_DIVISOR);

const getTextFromResponse = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          "text" in part &&
          (part as { type?: string }).type === "text"
        ) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
};

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
    // Định dạng lại tin nhắn cho đúng chuẩn OpenAI
    const formattedMessages: ChatCompletionMessageParam[] = messages.map((m) => {
      const textContent = m.content
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ");

      return {
        role: m.role === "user" ? "user" : "assistant",
        content: textContent,
      };
    });

    const githubErrors: unknown[] = [];
    const fullInputText = formattedMessages.map((m) => m.content).join("\n");
    const estimatedInputTokens = estimateInputTokens(fullInputText);

    const sortedCandidates = [...MODEL_CATALOG]
      .filter((candidate) => {
        if (candidate.provider === "github") return !!openai;
        return !!gemini;
      })
      .filter((candidate) => estimatedInputTokens <= candidate.safeInputTokens)
      .sort((a, b) => b.intelligenceRank - a.intelligenceRank);

    // Input dài thì ưu tiên model chịu tải lớn trước để tránh timeout/fail rồi mới fallback.
    const routeCandidates =
      estimatedInputTokens > LARGE_INPUT_THRESHOLD_TOKENS
        ? sortedCandidates.sort((a, b) => {
            const byProvider =
              a.provider === b.provider ? 0 : a.provider === "gemini" ? -1 : 1;
            if (byProvider !== 0) return byProvider;
            return b.intelligenceRank - a.intelligenceRank;
          })
        : sortedCandidates;

    if (routeCandidates.length === 0) {
      githubErrors.push({
        error: "No available model for current payload",
        estimatedInputTokens,
      });
    }

    const conversationHistory = messages.map((msg) => {
      const textContent = msg.content
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ");

      return {
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: textContent }],
      };
    });

    for (const candidate of routeCandidates) {
      try {
        if (candidate.provider === "github" && openai) {
          const response = await openai.chat.completions.create({
            model: candidate.model,
            messages: formattedMessages,
          });

          const responseText = getTextFromResponse(response.choices[0]?.message?.content);
          if (responseText) {
            return {
              content: [{ type: "text" as const, text: responseText }],
            };
          }
        }

        if (candidate.provider === "gemini" && gemini) {
          const response = await gemini.models.generateContent({
            model: candidate.model,
            contents: conversationHistory,
          });

          const responseText = (response.text ?? "").trim();
          if (responseText) {
            return {
              content: [{ type: "text" as const, text: responseText }],
            };
          }
        }
      } catch (error) {
        githubErrors.push({ provider: candidate.provider, model: candidate.model, error });
      }
    }

    if (!openai) {
      githubErrors.push("missing VITE_GITHUB_TOKEN");
    }
    if (!gemini) {
      githubErrors.push("missing VITE_GEMINI_API_KEY");
    }

    console.error("🔥 ALL MODEL FALLBACKS FAILED:", githubErrors);
    return {
      content: [
        {
          type: "text" as const,
          text: "Xin lỗi, em đang lỗi kết nối ở tất cả model dự phòng. Sếp check F12 và token giúp em nhé 😢",
        },
      ],
    };
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
