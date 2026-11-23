import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useAiChatStream } from "@/hooks/useAiChatStream";
import { AiMessageContent } from "@/components/ai/AiMessageItem";
import { aiService, type ChatMessage } from "@/services/ai.service";
import viLocale from "@/locales/vi.json";
import enLocale from "@/locales/en.json";

vi.mock("@/services/ai.service", () => ({
  aiService: {
    confirmAction: vi.fn(),
    cancelAction: vi.fn(),
    getStreamStatus: vi.fn(),
    createSession: vi.fn(),
  },
}));
vi.mock("@microsoft/fetch-event-source", () => ({ fetchEventSource: vi.fn() }));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function makeT(dict: Record<string, unknown>) {
  return (key: string, opts?: Record<string, unknown>) => {
    const parts = key.split(".");
    let cur: unknown = dict;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    if (typeof cur !== "string") return key;
    return cur.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k] ?? ""));
  };
}

const tVi = makeT(viLocale as unknown as Record<string, unknown>);
const tEn = makeT(enLocale as unknown as Record<string, unknown>);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Copilot SSE error handling, unclosed <think>, confirmation preservation & i18n", () => {
  it("shows localized error toast and exits streaming when unclosed <think> is followed by status-code SSE error (vi & en)", async () => {
    vi.mocked(aiService.getStreamStatus).mockResolvedValue(null);
    vi.mocked(fetchEventSource).mockImplementation(async (_url, opts) => {
      opts?.onmessage?.({
        id: "",
        event: "token",
        data: JSON.stringify({ token: "<think>\nChuẩn bị thực hiện yêu cầu...\n\n" }),
        retry: undefined,
      });
      opts?.onmessage?.({
        id: "",
        event: "error",
        data: JSON.stringify({ code: "COPILOT_MODELS_EXHAUSTED", params: { attempted: 5 } }),
        retry: undefined,
      });
    });

    for (const [tFn, expectedSubstring] of [
      [tVi, "đã thử lần lượt 5 mô hình AI"],
      [tEn, "tried 5 available AI model(s)"],
    ] as const) {
      vi.mocked(toast.error).mockClear();
      const { result, unmount } = renderHook(() =>
        useAiChatStream({
          activeSession: { id: 10, title: "test", createdAt: "", messageCount: 0 },
          setActiveSession: vi.fn(),
          sessions: [],
          setSessions: vi.fn(),
          setMessages: vi.fn(),
          loadMessages: vi.fn().mockResolvedValue(undefined),
          loadSessions: vi.fn().mockResolvedValue(undefined),
          accessToken: "jwt",
          t: tFn,
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Xin chào");
      });

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(vi.mocked(toast.error).mock.calls[0][0]).toContain(expectedSubstring);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.isThinking).toBe(false);
      expect(result.current.streamPhase).toBeNull();
      unmount();
    }
  });

  it("preserves confirmation card and exits streaming when error occurs during answer writing even if loadMessages rejects", async () => {
    vi.mocked(aiService.getStreamStatus).mockResolvedValue(null);
    vi.mocked(fetchEventSource).mockImplementation(async (_url, opts) => {
      opts?.onmessage?.({
        id: "",
        event: "token",
        data: JSON.stringify({ token: "<think>\nĐang chuẩn bị giao việc...\n\n" }),
        retry: undefined,
      });
      opts?.onmessage?.({
        id: "",
        event: "tool",
        data: JSON.stringify({
          name: "recommendAndAssignTask",
          confirmation: {
            actionId: "action-keep-1",
            toolName: "recommendAndAssignTask",
            payloadHash: "hash-keep-1",
            confirmationRequired: true,
            arguments: { taskId: 6, projectId: 3 },
          },
        }),
        retry: undefined,
      });
      opts?.onmessage?.({
        id: "",
        event: "error",
        data: "Legacy plain-text error after tool",
        retry: undefined,
      });
    });

    let messagesState: ChatMessage[] = [];
    const setMessages = vi.fn((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      messagesState = typeof updater === "function" ? updater(messagesState) : updater;
    });

    const { result } = renderHook(() =>
      useAiChatStream({
        activeSession: { id: 11, title: "assign", createdAt: "", messageCount: 0 },
        setActiveSession: vi.fn(),
        sessions: [],
        setSessions: vi.fn(),
        setMessages,
        loadMessages: vi.fn().mockRejectedValue(new Error("reload network failure")),
        loadSessions: vi.fn().mockResolvedValue(undefined),
        accessToken: "jwt",
        t: tEn,
      }),
    );

    await act(async () => {
      await result.current.sendMessage("Assign task 6");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.streamPhase).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe("Legacy plain-text error after tool");

    const assistantMsgs = messagesState.filter((m) => m.sender === "ASSISTANT");
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toContain("confirmation card below");
    expect(assistantMsgs[0].content).toContain("```taskpilot-confirm");
    expect(assistantMsgs[0].content).toContain("action-keep-1");
    expect(assistantMsgs[0].content).toContain("hash-keep-1");
  });

  it("handles polling FAILED with structured status code when only unclosed <think> was received", async () => {
    vi.mocked(aiService.getStreamStatus).mockResolvedValue({
      sessionId: 12,
      clientMessageId: "poll-1",
      phase: "FAILED",
      modelUsed: "gemini-3.5-flash",
      errorMessage: JSON.stringify({ code: "COPILOT_TURN_DEADLINE_EXCEEDED", params: { deadlineSeconds: 60 } }),
      updatedAt: "2026-11-23T00:00:00Z",
    });
    vi.mocked(fetchEventSource).mockImplementation(async (_url, opts) => {
      opts?.onmessage?.({
        id: "",
        event: "token",
        data: JSON.stringify({ token: "<think>\nĐang xử lý..." }),
        retry: undefined,
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const { result } = renderHook(() =>
      useAiChatStream({
        activeSession: { id: 12, title: "poll", createdAt: "", messageCount: 0 },
        setActiveSession: vi.fn(),
        sessions: [],
        setSessions: vi.fn(),
        setMessages: vi.fn(),
        loadMessages: vi.fn().mockResolvedValue(undefined),
        loadSessions: vi.fn().mockResolvedValue(undefined),
        accessToken: "jwt",
        t: tVi,
      }),
    );

    await act(async () => {
      await result.current.sendMessage("Kiểm tra polling");
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain("60 giây");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.streamPhase).toBeNull();
  });

  it("renders COPILOT_CONFIRMATION_EXPLANATION_INCOMPLETE status code localized in AiMessageContent", () => {
    const content = `COPILOT_CONFIRMATION_EXPLANATION_INCOMPLETE\n\n\`\`\`taskpilot-confirm\n{"confirmationRequired":true,"actionId":"a1"}\n\`\`\``;
    const { rerender } = render(
      <AiMessageContent
        content={content}
        collapseWhenComplete={true}
        t={tVi}
        confirmPendingAction={vi.fn()}
        cancelPendingAction={vi.fn()}
      />,
    );
    expect(screen.getByText(/thẻ xác nhận bên dưới/i)).toBeInTheDocument();

    rerender(
      <AiMessageContent
        content={content}
        collapseWhenComplete={true}
        t={tEn}
        confirmPendingAction={vi.fn()}
        cancelPendingAction={vi.fn()}
      />,
    );
    expect(screen.getByText(/confirmation card below/i)).toBeInTheDocument();
  });

  it("discards partial text from failed model on mid-turn model switch while preserving confirmation card", async () => {
    vi.mocked(aiService.getStreamStatus).mockResolvedValue(null);
    let capturedOnMessage: ((ev: { id: string; event: string; data: string; retry?: number }) => void) | undefined;
    let releaseStream: (() => void) | undefined;
    vi.mocked(fetchEventSource).mockImplementation(async (_url, opts) => {
      capturedOnMessage = opts?.onmessage;
      await new Promise<void>((resolve) => {
        releaseStream = resolve;
      });
    });

    const { result } = renderHook(() =>
      useAiChatStream({
        activeSession: { id: 13, title: "failover", createdAt: "", messageCount: 0 },
        setActiveSession: vi.fn(),
        sessions: [],
        setSessions: vi.fn(),
        setMessages: vi.fn(),
        loadMessages: vi.fn().mockResolvedValue(undefined),
        loadSessions: vi.fn().mockResolvedValue(undefined),
        accessToken: "jwt",
        t: tVi,
      }),
    );

    let sendPromise!: Promise<void>;
    await act(async () => {
      sendPromise = result.current.sendMessage("Giao việc cho An");
      await Promise.resolve();
    });

    await act(async () => {
      capturedOnMessage?.({ id: "", event: "model", data: "openai/gpt-oss-120b" });
      capturedOnMessage?.({ id: "", event: "token", data: JSON.stringify({ token: "<think>\nĐang xử lý...\n\n" }) });
      capturedOnMessage?.({
        id: "",
        event: "tool",
        data: JSON.stringify({
          name: "recommendAndAssignTask",
          confirmation: {
            actionId: "action-switch-1",
            toolName: "recommendAndAssignTask",
            payloadHash: "hash-switch-1",
            confirmationRequired: true,
            arguments: { taskId: 8, projectId: 5 },
          },
        }),
      });
      capturedOnMessage?.({ id: "", event: "token", data: JSON.stringify({ token: "</think>\n\n" }) });
      capturedOnMessage?.({ id: "", event: "token", data: JSON.stringify({ token: "Nháp dở từ Groq..." }) });
      // Model fails mid-stream -> backend sends reset_stream + switches to Gemini
      capturedOnMessage?.({ id: "", event: "reset_stream", data: JSON.stringify({ reason: "model_error" }) });
      capturedOnMessage?.({ id: "", event: "model", data: "gemini-3.5-flash" });
      capturedOnMessage?.({ id: "", event: "phase", data: "THINKING" });
      capturedOnMessage?.({ id: "", event: "token", data: JSON.stringify({ token: "Đề xuất hoàn chỉnh từ Gemini." }) });
    });

    await waitFor(() => {
      expect(result.current.currentStreamMsg).toContain("Đề xuất hoàn chỉnh từ Gemini.");
    });
    expect(result.current.streamModel).toBe("gemini-3.5-flash");
    expect(result.current.currentStreamMsg).not.toContain("Nháp dở từ Groq...");
    expect(result.current.toolEvents).toHaveLength(1);
    expect(result.current.toolEvents[0].confirmation?.actionId).toBe("action-switch-1");

    await act(async () => {
      capturedOnMessage?.({ id: "", event: "done", data: "Đề xuất hoàn chỉnh từ Gemini." });
      releaseStream?.();
      await sendPromise;
    });
  });

  it("shows localized error toast even when partial visible text arrived before server deadline error", async () => {
    vi.mocked(aiService.getStreamStatus).mockResolvedValue(null);
    vi.mocked(fetchEventSource).mockImplementation(async (_url, opts) => {
      opts?.onmessage?.({ id: "", event: "model", data: "openai/gpt-oss-120b", retry: undefined });
      opts?.onmessage?.({ id: "", event: "token", data: JSON.stringify({ token: "Xin chào..." }), retry: undefined });
      opts?.onmessage?.({ id: "", event: "reset_stream", data: JSON.stringify({ reason: "turn_deadline" }), retry: undefined });
      opts?.onmessage?.({
        id: "",
        event: "error",
        data: JSON.stringify({ code: "COPILOT_TURN_DEADLINE_EXCEEDED", params: { deadlineSeconds: 60 } }),
        retry: undefined,
      });
    });

    const { result } = renderHook(() =>
      useAiChatStream({
        activeSession: { id: 14, title: "deadline", createdAt: "", messageCount: 0 },
        setActiveSession: vi.fn(),
        sessions: [],
        setSessions: vi.fn(),
        setMessages: vi.fn(),
        loadMessages: vi.fn().mockResolvedValue(undefined),
        loadSessions: vi.fn().mockResolvedValue(undefined),
        accessToken: "jwt",
        t: tVi,
      }),
    );

    await act(async () => {
      await result.current.sendMessage("Xin chào");
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain("60 giây");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.currentStreamMsg).toBe("");
  });
});
