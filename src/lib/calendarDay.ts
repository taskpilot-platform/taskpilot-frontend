/**
 * Local calendar day helpers.
 *
 * Invalid input policy:
 * - Null, undefined, non-Date/non-string values, malformed strings, and
 *   impossible calendar dates (such as "2026-02-30" or invalid Date instances)
 *   return `""` rather than throwing or rolling into an unintended day.
 * - Because calendar cells use `"YYYY-MM-DD"` keys, returning `""` safely
 *   excludes invalid records without crashing the calendar UI.
 * - Date-only `"YYYY-MM-DD"` strings remain date-only in every timezone.
 * - Instants/timestamps are grouped by local year/month/day.
 */

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;

function isValidCalendarParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  probe.setUTCFullYear(year);
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function formatDayParts(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localDayKey(input: Date | string | null | undefined): string {
  if (input == null) {
    return "";
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      return "";
    }
    return formatDayParts(
      input.getFullYear(),
      input.getMonth() + 1,
      input.getDate(),
    );
  }

  if (typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const dateOnlyMatch = DATE_ONLY_REGEX.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (!isValidCalendarParts(year, month, day)) {
      return "";
    }
    return formatDayParts(year, month, day);
  }

  const prefixMatch = ISO_DATE_PREFIX_REGEX.exec(trimmed);
  if (prefixMatch) {
    const year = Number(prefixMatch[1]);
    const month = Number(prefixMatch[2]);
    const day = Number(prefixMatch[3]);
    if (!isValidCalendarParts(year, month, day)) {
      return "";
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return formatDayParts(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate(),
  );
}

/**
 * Parse a `"YYYY-MM-DD"` day key into a local-midnight `Date` without UTC shift.
 * Returns `null` for invalid keys.
 */
export function parseLocalDayKey(dayKey: string | null | undefined): Date | null {
  if (typeof dayKey !== "string") {
    return null;
  }
  const match = DATE_ONLY_REGEX.exec(dayKey.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarParts(year, month, day)) {
    return null;
  }
  const d = new Date(year, month - 1, day);
  d.setFullYear(year);
  return d;
}
