import { act, fireEvent, render, renderHook, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiActionButtons } from "@/components/ai/AiActionButtons";
import { useAiChatStream } from "@/hooks/useAiChatStream";
import { aiService } from "@/services/ai.service";
import { fetchEventSource } from "@microsoft/fetch-event-source";

vi.mock("@/services/ai.service", () => ({ aiService: { confirmAction: vi.fn(), cancelAction: vi.fn() } }));
vi.mock("@microsoft/fetch-event-source", () => ({ fetchEventSource: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const confirmation = { actionId: "action-123", payloadHash: "preview-sha256", expiresAt: new Date(Date.now() + 600_000).toISOString() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("explicit AI action UI", () => {
  it("locks duplicate clicks and only reports success after HTTP completion", async () => {
    let resolve!: () => void;
    const confirm = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    render(<AiActionButtons confirmation={confirmation} onConfirm={confirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Xác nhận"));
    expect(screen.getByText("Đang xử lý…")).toBeDisabled();
    fireEvent.click(screen.getByText("Đang xử lý…"));
    expect(confirm).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(screen.getByText("Đã thực hiện")).toBeDisabled();
  });

  it.each([403, 404, 409, 410])("requires a fresh preview on %i without claiming success", async (status) => {
    render(<AiActionButtons confirmation={confirmation} onConfirm={vi.fn().mockRejectedValue({ response: { status } })} />);
    fireEvent.click(screen.getByText("Xác nhận"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("tạo lại"));
    expect(screen.getByText("Cần tạo lại bản xem trước")).toBeDisabled();
    expect(screen.queryByText("Đã thực hiện")).not.toBeInTheDocument();
  });

  it("allows retry on transport failure and cancellation is a separate callback", async () => {
    const confirm = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    const cancel = vi.fn().mockResolvedValue(undefined);
    const view = render(<AiActionButtons confirmation={confirmation} onConfirm={confirm} onCancel={cancel} />);
    fireEvent.click(screen.getByText("Xác nhận"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("Xác nhận"));
    await screen.findByText("Đã thực hiện");
    expect(confirm).toHaveBeenNthCalledWith(2, confirmation);
    view.unmount();
    render(<AiActionButtons confirmation={confirmation} onConfirm={confirm} onCancel={cancel} />);
    fireEvent.click(screen.getByText("Hủy"));
    await screen.findByText("Đã hủy");
    expect(cancel).toHaveBeenCalledWith(confirmation.actionId);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("disables expired and legacy previews missing payload binding", () => {
    const confirm = vi.fn();
    const view = render(<AiActionButtons confirmation={{ ...confirmation, expiresAt: "2020-01-01T00:00:00Z" }} onConfirm={confirm} />);
    expect(screen.getByText("Cần tạo lại bản xem trước")).toBeDisabled();
    view.rerender(<AiActionButtons confirmation={{ actionId: "old" }} onConfirm={confirm} />);
    expect(screen.getByText("Cần tạo lại bản xem trước")).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("uses the explicit API for confirm/cancel without invoking the model stream", async () => {
    vi.mocked(aiService.confirmAction).mockResolvedValue({ title: "done" });
    vi.mocked(aiService.cancelAction).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAiChatStream({
      activeSession: { id: 42, title: "session", createdAt: "", messageCount: 0 },
      setActiveSession: vi.fn(), sessions: [], setSessions: vi.fn(), setMessages: vi.fn(),
      loadMessages: vi.fn(), loadSessions: vi.fn(), accessToken: "test", t: (key) => key,
    }));
    await act(async () => {
      await result.current.confirmPendingAction(confirmation);
      await result.current.cancelPendingAction(confirmation.actionId);
    });
    expect(aiService.confirmAction).toHaveBeenCalledWith(42, confirmation.actionId, confirmation.payloadHash);
    expect(aiService.cancelAction).toHaveBeenCalledWith(42, confirmation.actionId);
    expect(fetchEventSource).not.toHaveBeenCalled();
  });
});
