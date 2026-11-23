import { useEffect, useRef, useState } from "react";
import type { PendingActionConfirmation } from "./aiChatTypes";

type State = "pending" | "running" | "succeeded" | "cancelled" | "expired";

export function AiActionButtons({ confirmation, onConfirm, onCancel }: {
  confirmation: PendingActionConfirmation;
  onConfirm?: (c: PendingActionConfirmation) => void | Promise<void>;
  onCancel?: (id: string) => void | Promise<void>;
}) {
  const [state, setState] = useState<State>("pending");
  const [error, setError] = useState("");
  const running = useRef(false);
  const expires = confirmation.expiresAt ? Date.parse(confirmation.expiresAt) : NaN;
  const expired = !confirmation.payloadHash || (Number.isFinite(expires) && expires <= Date.now());
  useEffect(() => {
    if (!Number.isFinite(expires)) return;
    const timer = window.setTimeout(() => setState((s) => s === "pending" ? "expired" : s), Math.max(0, expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expires]);

  const run = async (cancel: boolean) => {
    if (running.current || state !== "pending" || expired) return;
    running.current = true;
    setState("running");
    setError("");
    try {
      if (cancel) await onCancel?.(confirmation.actionId);
      else await onConfirm?.(confirmation);
      setState(cancel ? "cancelled" : "succeeded");
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const terminal = status === 409 || status === 410 || status === 404 || status === 403;
      setState(terminal ? "expired" : "pending");
      setError(terminal
        ? "Bản xem trước đã hết hạn hoặc dữ liệu/quyền truy cập đã đổi. Hãy yêu cầu AI tạo lại."
        : "Chưa xác nhận được kết quả. Bạn có thể thử lại an toàn với cùng thao tác.");
    } finally { running.current = false; }
  };
  const disabled = state !== "pending" || expired;
  const label = state === "running" ? "Đang xử lý…" : state === "succeeded" ? "Đã thực hiện"
    : state === "cancelled" ? "Đã hủy" : state === "expired" || expired ? "Cần tạo lại bản xem trước" : "Xác nhận";
  return <div className="border-t border-border/40">
    <div className="grid grid-cols-2">
      <button type="button" disabled={disabled || !onConfirm} onClick={() => void run(false)}
        className="p-3 text-sm font-semibold text-emerald-600 disabled:opacity-50">{label}</button>
      <button type="button" disabled={disabled || !onCancel} onClick={() => void run(true)}
        className="p-3 text-sm font-semibold text-rose-600 disabled:opacity-50">Hủy</button>
    </div>
    {error && <p role="alert" className="px-3 pb-3 text-sm text-destructive">{error}</p>}
  </div>;
}
