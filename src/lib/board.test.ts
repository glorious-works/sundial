import { describe, expect, it } from "vitest";
import { copyLine, findOverlap, gapNote, intervalText, type BoardRow } from "./board";
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
