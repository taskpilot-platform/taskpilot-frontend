import { describe, it, expect, vi, afterEach } from "vitest";
import { localDayKey, parseLocalDayKey } from "@/lib/calendarDay";

function getZoneParts(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date(ms));
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
  };
}

function zonedMidnightUtcMs(year: number, monthIndex: number, day: number, timeZone: string): number {
  const approx = Date.UTC(year, monthIndex, day, 0, 0, 0);
  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = approx + offsetHours * 3600_000;
    const cp = getZoneParts(candidate, timeZone);
    if (cp.year === year && cp.month === monthIndex && cp.day === day) {
      let first = candidate;
      while (true) {
        const prev = first - 3600_000;
        const pp = getZoneParts(prev, timeZone);
        if (pp.year === year && pp.month === monthIndex && pp.day === day) {
          first = prev;
        } else {
          break;
        }
      }
      return first;
    }
  }
  return approx;
}

function withSimulatedTimezone(tz: string, fn: () => void) {
  const OrigDate = globalThis.Date;

  class ZonedDate extends OrigDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super();
      } else if (args.length === 1) {
        super(args[0] as string | number | Date);
      } else {
        const [y, m, d = 1] = args as number[];
        super(zonedMidnightUtcMs(y, m, d, tz));
      }
    }

    getFullYear(): number {
      return getZoneParts(this.getTime(), tz).year;
    }

    getMonth(): number {
      return getZoneParts(this.getTime(), tz).month;
    }

    getDate(): number {
      return getZoneParts(this.getTime(), tz).day;
    }
  }

  vi.stubGlobal("Date", ZonedDate);
  try {
    fn();
  } finally {
    vi.stubGlobal("Date", OrigDate);
  }
}

describe("P4.3 localDayKey calendar helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups 2026-11-14T18:00:00Z as 2026-11-15 in Asia/Bangkok and 2026-11-14 in UTC", () => {
    withSimulatedTimezone("Asia/Bangkok", () => {
      expect(localDayKey("2026-11-14T18:00:00Z")).toBe("2026-11-15");
      expect(localDayKey(new Date("2026-11-14T18:00:00Z"))).toBe("2026-11-15");
    });

    withSimulatedTimezone("UTC", () => {
      expect(localDayKey("2026-11-14T18:00:00Z")).toBe("2026-11-14");
      expect(localDayKey(new Date("2026-11-14T18:00:00Z"))).toBe("2026-11-14");
    });
  });

  it("handles month boundaries and DST zones accurately", () => {
    withSimulatedTimezone("Asia/Bangkok", () => {
      expect(localDayKey("2026-11-30T17:00:00Z")).toBe("2026-12-01");
      expect(localDayKey("2026-11-30T16:59:59Z")).toBe("2026-11-30");
    });

    withSimulatedTimezone("America/New_York", () => {
      expect(localDayKey("2026-03-08T04:30:00Z")).toBe("2026-03-07");
      expect(localDayKey("2026-03-08T05:30:00Z")).toBe("2026-03-08");
      expect(localDayKey("2026-11-01T04:30:00Z")).toBe("2026-11-01");
      expect(localDayKey("2026-11-02T04:30:00Z")).toBe("2026-11-01");
      expect(localDayKey("2026-11-02T05:00:00Z")).toBe("2026-11-02");
    });
  });

  it("keeps date-only inputs date-only across positive and negative UTC offsets", () => {
    for (const tz of ["Asia/Bangkok", "UTC", "America/New_York"]) {
      withSimulatedTimezone(tz, () => {
        expect(localDayKey("2026-11-15")).toBe("2026-11-15");
        expect(localDayKey(parseLocalDayKey("2026-11-15"))).toBe("2026-11-15");
        expect(localDayKey("2026-03-08")).toBe("2026-03-08");
        expect(localDayKey(parseLocalDayKey("2026-03-08"))).toBe("2026-03-08");
      });
    }
  });

  it("handles invalid inputs deliberately by returning empty string without throwing", () => {
    expect(localDayKey(null)).toBe("");
    expect(localDayKey(undefined)).toBe("");
    expect(localDayKey("")).toBe("");
    expect(localDayKey("   ")).toBe("");
    expect(localDayKey("not-a-date")).toBe("");
    expect(localDayKey("2026-02-30")).toBe("");
    expect(localDayKey("2026-13-01")).toBe("");
    expect(localDayKey("2026-02-30T10:00:00Z")).toBe("");
    expect(localDayKey(new Date("invalid"))).toBe("");
    expect(parseLocalDayKey("2026-02-30")).toBeNull();
    expect(parseLocalDayKey("invalid")).toBeNull();
  });
});
