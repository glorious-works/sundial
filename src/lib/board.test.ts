import { describe, expect, it } from "vitest";
import { bestText, copyLine, findOverlap, gapNote, intervalText, type BoardRow } from "./board";
import { DEFAULT_HOURS, isWorking, workStatus } from "./hours";
import { DAY, localToInstant, nextGapChange, wallOf } from "./time";

const london: BoardRow = { name: "London", zone: "Europe/London", hours: DEFAULT_HOURS };
const sydney: BoardRow = { name: "Sydney", zone: "Australia/Sydney", hours: DEFAULT_HOURS };
const chicago: BoardRow = { name: "Chicago", zone: "America/Chicago", hours: DEFAULT_HOURS };
const paris: BoardRow = { name: "Paris", zone: "Europe/Paris", hours: DEFAULT_HOURS };

describe("copy line", () => {
  it("spec row 2: Mon 23 Nov 2026 07:00 GMT", () => {
    expect(copyLine([london, sydney, chicago], Date.UTC(2026, 10, 23, 7))).toBe("Mon 23 Nov, 07:00 London / 18:00 Sydney / 01:00 Chicago");
  });

  it("adds the year when asked", () => {
    expect(copyLine([london, sydney], Date.UTC(2027, 2, 10, 12), true)).toBe("Wed 10 Mar 2027, 12:00 London / 23:00 Sydney");
    expect(copyLine([london, sydney], Date.UTC(2027, 2, 10, 14), true)).toBe("Wed 10 Mar 2027, 14:00 London / 01:00 Sydney (Thu 11 Mar 2027)");
  });

  it("brackets the date of rows whose date differs from home's", () => {
    expect(copyLine([london, sydney, chicago], Date.UTC(2026, 10, 27, 22))).toBe(
      "Fri 27 Nov, 22:00 London / 09:00 Sydney (Sat 28 Nov) / 16:00 Chicago",
    );
    expect(copyLine([sydney, london, chicago], Date.UTC(2026, 10, 21, 13, 13))).toBe(
      "Sun 22 Nov, 00:13 Sydney / 13:13 London (Sat 21 Nov) / 07:13 Chicago (Sat 21 Nov)",
    );
  });
});

describe("working hours", () => {
  it("spec row 3: Sydney's Saturday morning is the weekend, with no working bar", () => {
    const at = Date.UTC(2026, 10, 27, 22);
    expect(workStatus(wallOf(sydney.zone, at), DEFAULT_HOURS)).toBe("weekend");
    expect(isWorking(wallOf(sydney.zone, at), DEFAULT_HOURS)).toBe(false);
    expect(workStatus(wallOf(london.zone, at), DEFAULT_HOURS)).toBe("off work");
    expect(workStatus(wallOf(chicago.zone, at), DEFAULT_HOURS)).toBe("working hours");
  });

  it("runs 09:00 to 17:30, end exclusive", () => {
    const w = (h: number, m: number) => wallOf(london.zone, Date.UTC(2026, 10, 23, h, m));
    expect(isWorking(w(8, 59), DEFAULT_HOURS)).toBe(false);
    expect(isWorking(w(9, 0), DEFAULT_HOURS)).toBe(true);
    expect(isWorking(w(17, 29), DEFAULT_HOURS)).toBe(true);
    expect(isWorking(w(17, 30), DEFAULT_HOURS)).toBe(false);
    expect(isWorking(w(12, 0), null)).toBe(false);
  });
});

describe("overlap", () => {
  const londonDay = (y: number, m: number, d: number) => [localToInstant("Europe/London", y, m, d), localToInstant("Europe/London", y, m, d + 1)] as const;

  it("London, Chicago and Sydney in November: no shared working hours, so shared waking hours", () => {
    const [from, to] = londonDay(2026, 11, 23);
    const o = findOverlap([london, chicago, sydney], from, to);
    expect(o.kind).toBe("waking");
    expect(o.intervals).toEqual([{ start: Date.UTC(2026, 10, 23, 20), end: Date.UTC(2026, 10, 23, 22) }]);
    const home = wallOf(london.zone, from);
    expect([london, sydney, chicago].map((r) => intervalText(o.intervals[0], r, home)).join(" / ")).toBe(
      "20:00–22:00 London / 07:00–09:00 Sydney (Tue 24 Nov) / 14:00–16:00 Chicago",
    );
  });

  it("finds shared working hours when there are some", () => {
    const [from, to] = londonDay(2026, 11, 23);
    const o = findOverlap([london, paris], from, to);
    expect(o.kind).toBe("work");
    expect(o.intervals).toEqual([{ start: Date.UTC(2026, 10, 23, 9), end: Date.UTC(2026, 10, 23, 16, 30) }]);
  });

  it("with no shared waking hours, suggests the time that leaves everyone least far outside them", () => {
    const [from, to] = londonDay(2026, 11, 21);
    const row = (name: string, zone: string): BoardRow => ({ name, zone, hours: DEFAULT_HOURS });
    const rows = [london, row("New York", "America/New_York"), row("Delhi", "Asia/Kolkata"), row("Tokyo", "Asia/Tokyo"), sydney];
    const o = findOverlap(rows, from, to);
    expect(o.kind).toBe("best");
    // 10:45 to 12:15 London all leave 75 minutes outside in total; 11:30 is the middle.
    expect(o.intervals).toEqual([{ start: Date.UTC(2026, 10, 21, 10, 45), end: Date.UTC(2026, 10, 21, 12, 15) }]);
    expect(bestText(o, rows)).toBe("Best: 11:30 London, with New York up early (06:30) and Sydney up late (22:30).");
  });

  it("counts a row just past midnight as up late, not as long before morning", () => {
    // Midnight is 2h 15m past 22:00 (as a quarter hour), not 7h before 07:00, so the best run
    // does not break off when New York's clock passes midnight.
    const [from, to] = londonDay(2026, 11, 21);
    const row = (name: string, zone: string): BoardRow => ({ name, zone, hours: DEFAULT_HOURS });
    const rows = [london, row("Los Angeles", "America/Los_Angeles"), row("New York", "America/New_York"), row("Dubai", "Asia/Dubai"), row("Singapore", "Asia/Singapore"), row("Auckland", "Pacific/Auckland")];
    const o = findOverlap(rows, from, to);
    expect(o.kind).toBe("best");
    expect(o.intervals).toEqual([{ start: Date.UTC(2026, 10, 21, 3), end: Date.UTC(2026, 10, 21, 6) }]);
    expect(bestText(o, rows)).toBe("Best: 04:30 London, with London asleep (04:30) and New York up late (23:30).");
  });

  it("calls a row more than two hours outside waking hours asleep", () => {
    // With waking hours of 09:00 to 12:00, London and Sydney cannot both be awake: every quarter
    // hour from 00:45 to 09:15 London leaves them 495 minutes outside in total; 05:00 is the middle.
    const [from, to] = londonDay(2026, 11, 23);
    const o = findOverlap([london, sydney], from, to, { start: 9 * 60, end: 12 * 60 });
    expect(o.intervals).toEqual([{ start: Date.UTC(2026, 10, 23, 0, 45), end: Date.UTC(2026, 10, 23, 9, 15) }]);
    expect(bestText(o, [london, sydney])).toBe("Best: 05:00 London, with London asleep (05:00) and Sydney asleep (16:00).");
  });

  it("compares nothing for a single row", () => {
    const [from, to] = londonDay(2026, 11, 21);
    expect(findOverlap([london], from, to).kind).toBe("none");
  });

  it("has no working overlap at the weekend", () => {
    const [from, to] = londonDay(2026, 11, 21);
    expect(findOverlap([london, paris], from, to).kind).toBe("waking");
  });
});

describe("gap note", () => {
  it("says when and to what, in home time", () => {
    const ch = nextGapChange(sydney.zone, london.zone, Date.UTC(2027, 2, 20));
    expect(ch).not.toBeNull();
    // 28 Mar comes first (London springs forward), then 3 Apr.
    expect(gapNote(ch!, london)).toBe("Gap becomes +10h on Sun 28 Mar at 02:00 London time");
    const next = nextGapChange(sydney.zone, london.zone, ch!.at);
    expect(gapNote(next!, london)).toBe("Gap becomes +9h on Sat 3 Apr at 17:00 London time");
  });

  it("is silent when nothing changes within four weeks", () => {
    expect(nextGapChange(sydney.zone, london.zone, Date.UTC(2026, 10, 21))).toBeNull();
    expect(nextGapChange(sydney.zone, london.zone, Date.UTC(2027, 2, 1), 28 * DAY)).not.toBeNull();
  });
});
