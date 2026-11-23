export type RealtimeAccessLossReason =
  | "AUTH_EXPIRED"
  | "SESSION_REVOKED"
  | "PROJECT_ACCESS_REVOKED"
  | "NETWORK";

export interface RealtimeAccessLostPayload {
  reason: Exclude<RealtimeAccessLossReason, "NETWORK">;
  detail?: string;
}

export class TerminalRealtimeError extends Error {
  readonly reason: RealtimeAccessLossReason;

  constructor(reason: RealtimeAccessLossReason, message?: string) {
    super(message || reason);
    this.name = "TerminalRealtimeError";
    this.reason = reason;
  }
}

export function classifySseHttpStatus(status: number): RealtimeAccessLossReason {
  if (status === 401) {
    return "AUTH_EXPIRED";
  }
  if (status === 403 || status === 404) {
    return "PROJECT_ACCESS_REVOKED";
  }
  return "NETWORK";
}

export function parseRealtimeAccessLostEvent(
  rawData: string,
): RealtimeAccessLossReason | null {
  try {
    const parsed = JSON.parse(rawData) as Partial<RealtimeAccessLostPayload>;
    if (
      parsed.reason === "AUTH_EXPIRED" ||
      parsed.reason === "SESSION_REVOKED" ||
      parsed.reason === "PROJECT_ACCESS_REVOKED"
    ) {
      return parsed.reason;
    }
  } catch {
    // Ignore malformed control payload and treat as generic close.
  }
  return null;
}

export function classifyStompClose(params: {
  stompMessage?: string | null;
  closeCode?: number | null;
  closeReason?: string | null;
}): RealtimeAccessLossReason {
  const combined = `${params.stompMessage ?? ""} ${params.closeReason ?? ""}`.toUpperCase();

  if (params.closeCode === 4403 || combined.includes("PROJECT_ACCESS_REVOKED")) {
    return "PROJECT_ACCESS_REVOKED";
  }
  if (
    combined.includes("NOT A MEMBER") ||
    combined.includes("PROJECT NOT FOUND") ||
    combined.includes("SUBSCRIPTION NOT ALLOWED")
  ) {
    return "PROJECT_ACCESS_REVOKED";
  }
  if (combined.includes("SESSION_REVOKED") || combined.includes("SESSION REVOKED") || combined.includes("ACCOUNT")) {
    return "SESSION_REVOKED";
  }
  if (params.closeCode === 4401 || combined.includes("AUTH_EXPIRED") || combined.includes("EXPIRED")) {
    return "AUTH_EXPIRED";
  }
  if (combined.includes("ACCESSDENIED") || combined.includes("ACCESS DENIED") || combined.includes("UNAUTHORIZED")) {
    return "SESSION_REVOKED";
  }
  return "NETWORK";
}

export function isTerminalRealtimeLoss(reason: RealtimeAccessLossReason): boolean {
  return reason !== "NETWORK";
}

export function isTerminalProjectLoss(reason: RealtimeAccessLossReason): boolean {
  return reason === "PROJECT_ACCESS_REVOKED";
}
