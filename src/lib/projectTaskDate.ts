const DEFAULT_PROJECT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UNSUPPORTED_OFFSET_PREFIXES = ["UTC+", "UTC-", "GMT+", "GMT-", "UT+", "UT-"];

export function effectiveProjectTimezone(timezoneId?: string | null): string {
  if (!timezoneId || !timezoneId.trim()) {
    return DEFAULT_PROJECT_TIMEZONE;
  }
  return timezoneId.trim();
}

/**
 * Matches backend TaskDatePolicy.validateZoneId contract: allows only "UTC" or
 * canonical IANA region IDs (e.g. "Asia/Ho_Chi_Minh") supported by both Java ZoneId
 * and ECMAScript Intl.DateTimeFormat. Rejects "Z", "UTC+07:00", "+07:00", etc.
 */
export function isSupportedProjectTimezone(timezoneId?: string | null): boolean {
  if (!timezoneId || !timezoneId.trim()) {
    return false;
  }
  const trimmed = timezoneId.trim();
  if (trimmed !== "UTC") {
    if (!trimmed.includes("/")) {
      return false;
    }
    if (UNSUPPORTED_OFFSET_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return false;
    }
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function assertSupportedProjectTimezone(timezoneId?: string | null): string {
  const effective = effectiveProjectTimezone(timezoneId);
  if (!isSupportedProjectTimezone(effective)) {
    throw new Error(`Unsupported project timezone '${effective}'. Expected 'UTC' or a canonical IANA region ID.`);
  }
  return effective;
}

/**
 * Formats an ISO-8601 instant (or YYYY-MM-DD date string) into a YYYY-MM-DD calendar date
 * in the project's canonical IANA timezone. Throws on invalid/unsupported project timezone
 * rather than masking errors as empty dates.
 */
export function formatInstantToProjectDateInput(
  value?: string | null,
  timezoneId?: string | null,
): string {
  const zone = assertSupportedProjectTimezone(timezoneId);
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return "";
  }
  return `${year}-${month}-${day}`;
}

/**
 * Formats a stored task instant for human display in the project's canonical timezone.
 * Throws on invalid/unsupported project timezone rather than masking errors.
 */
export function formatTaskDateDisplay(
  value?: string | null,
  timezoneId?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  const zone = assertSupportedProjectTimezone(timezoneId);
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (DATE_ONLY_PATTERN.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    const utcMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      ...options,
    }).format(utcMidnight);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

/**
 * Validates same-day or ordered date-only bounds (startDay <= dueDay).
 */
export function isValidTaskDateRange(startDay?: string | null, dueDay?: string | null): boolean {
  if (!startDay || !dueDay) {
    return true;
  }
  return startDay <= dueDay;
}

export function hasObservedTaskVersion(version: unknown): version is number {
  return typeof version === "number" && Number.isInteger(version) && version >= 0;
}

export function getErrorHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const err = error as { response?: { status?: number }; status?: number };
  if (typeof err.response?.status === "number") {
    return err.response.status;
  }
  if (typeof err.status === "number") {
    return err.status;
  }
  return undefined;
}

export function isTaskVersionConflictError(error: unknown): boolean {
  const status = getErrorHttpStatus(error);
  return status === 409 || status === 428;
}
