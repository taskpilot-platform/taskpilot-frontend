import { describe, expect, it } from "vitest";
import vi from "@/locales/vi.json";
import en from "@/locales/en.json";
import {
  discardPartialStreamResponse,
  hasVisibleAssistantText,
  localizeCopilotStatusContent,
  mergeMissingConfirmationMessage,
  resolveStreamErrorMessage,
} from "@/components/ai/aiChatHelpers";
import type { ChatMessage } from "@/services/ai.service";
import type { PendingActionConfirmation } from "@/components/ai/aiChatTypes";

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

describe("aiChatHelpers stream error & i18n helpers", () => {
  const tVi = makeT(vi as unknown as Record<string, unknown>);
  const tEn = makeT(en as unknown as Record<string, unknown>);

  it("hasVisibleAssistantText ignores unclosed or closed think blocks", () => {
    expect(hasVisibleAssistantText("")).toBe(false);
    expect(hasVisibleAssistantText("<think>\nChuẩn bị thực hiện yêu cầu...\n\n")).toBe(false);
    expect(hasVisibleAssistantText("<think>Suy nghĩ xong</think>   ")).toBe(false);
    expect(hasVisibleAssistantText("<think>Suy nghĩ</think>\n\nXin chào")).toBe(true);
    expect(hasVisibleAssistantText("Câu trả lời trực tiếp")).toBe(true);
  });

  it("discardPartialStreamResponse drops partial visible answer while keeping thinking blocks intact", () => {
    expect(discardPartialStreamResponse("")).toBe("");
    expect(discardPartialStreamResponse("Nháp dở từ model 1...")).toBe("");
    expect(discardPartialStreamResponse("<think>\nĐang truy cập...\n\n")).toBe("<think>\nĐang truy cập...\n\n");
    expect(discardPartialStreamResponse("<think>\nĐang truy cập...\n</think>\n\nNháp dở từ model 1...")).toBe(
      "<think>\nĐang truy cập...\n</think>\n\n",
    );
  });

  it("resolveStreamErrorMessage translates structured status codes in vi and en, and preserves legacy SSE errors", () => {
    const exhaustedPayload = JSON.stringify({
      code: "COPILOT_MODELS_EXHAUSTED",
      params: { attempted: 6 },
    });
    expect(resolveStreamErrorMessage(exhaustedPayload, tVi)).toContain("đã thử lần lượt 6 mô hình AI");
    expect(resolveStreamErrorMessage(exhaustedPayload, tEn)).toContain("tried 6 available AI model(s)");

    const deadlinePayload = JSON.stringify({
      code: "COPILOT_TURN_DEADLINE_EXCEEDED",
      params: { deadlineSeconds: 60 },
    });
    expect(resolveStreamErrorMessage(deadlinePayload, tVi)).toContain("60 giây");
    expect(resolveStreamErrorMessage(deadlinePayload, tEn)).toContain("60s");

    // Legacy plain-text SSE error
    expect(resolveStreamErrorMessage("AI service is currently unavailable.", tVi)).toBe(
      "AI service is currently unavailable.",
    );

    // Legacy JSON {error, type} SSE error
    expect(
      resolveStreamErrorMessage(JSON.stringify({ error: "Upstream error", type: "generation_failed" }), tEn),
    ).toBe("Upstream error");
  });

  it("localizeCopilotStatusContent translates COPILOT_CONFIRMATION_EXPLANATION_INCOMPLETE by locale", () => {
    expect(localizeCopilotStatusContent("COPILOT_CONFIRMATION_EXPLANATION_INCOMPLETE", tVi)).toContain(
      "thẻ xác nhận bên dưới",
    );
    expect(localizeCopilotStatusContent("COPILOT_CONFIRMATION_EXPLANATION_INCOMPLETE", tEn)).toContain(
      "confirmation card below",
    );
    expect(localizeCopilotStatusContent("Normal assistant text", tEn)).toBe("Normal assistant text");
  });

  it("mergeMissingConfirmationMessage appends local confirmation message only when missing and preserves payloadHash", () => {
    const conf: PendingActionConfirmation = {
      actionId: "act-1",
      toolName: "recommendAndAssignTask",
      payloadHash: "sha256-abc",
      confirmationRequired: true,
      arguments: { taskId: 6, projectId: 3 },
    };

    const merged = mergeMissingConfirmationMessage(
      [],
      [conf],
      tEn("copilot.status.COPILOT_CONFIRMATION_EXPLANATION_INCOMPLETE"),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].content).toContain("confirmation card below");
    expect(merged[0].content).toContain("```taskpilot-confirm");
    expect(merged[0].content).toContain("sha256-abc");

    // Does not duplicate when backend already persisted a matching confirmation key
    const existing: ChatMessage[] = [
      {
        id: 99,
        sender: "ASSISTANT",
        createdAt: "2026-11-23T00:00:00Z",
        content: `Done\n\n\`\`\`taskpilot-confirm\n${JSON.stringify(conf)}\n\`\`\``,
      },
    ];
    expect(mergeMissingConfirmationMessage(existing, [conf], "Note")).toBe(existing);
  });
});
