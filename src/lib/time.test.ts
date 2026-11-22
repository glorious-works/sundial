import { describe, expect, it } from "vitest";
import {
  dayBounds,
  dayDiff,
  dayLabel,
  DAY,
  fmtDayDiff,
  fmtDistance,
  fmtGap,
  hhmm,
  HOUR,
  localToInstant,
  MIN,
  nextGapChange,
  offsetMin,
  wallOf,
  zoneAbbr,
} from "./time";

const LON = "Europe/London";
const SYD = "Australia/Sydney";
const CHI = "America/Chicago";
const DEL = "Asia/Kolkata";
const LAX = "America/Los_Angeles";

const read = (zone: string, ms: number) => {
  const w = wallOf(zone, ms);
  return `${dayLabel(w)} ${hhmm(w)}`;
};
const gap = (zone: string, ms: number) => fmtGap(offsetMin(zone, ms) - offsetMin(LON, ms));

// docs/spec.md, "Date rules and acceptance tests". Instants are written in UTC so the
// expected readings do not depend on the code under test.
describe("spec acceptance table", () => {
  const rows = [
    { at: Date.UTC(2026, 10, 21, 13, 13), lon: "Sat 21 Nov 13:13", syd: "Sun 22 Nov 00:13", chi: "Sat 21 Nov 07:13", abbr: ["GMT", "AEDT", "CST"] },
    { at: Date.UTC(2026, 10, 23, 7, 0), lon: "Mon 23 Nov 07:00", syd: "Mon 23 Nov 18:00", chi: "Mon 23 Nov 01:00", abbr: ["GMT", "AEDT", "CST"] },
    { at: Date.UTC(2026, 10, 27, 22, 0), lon: "Fri 27 Nov 22:00", syd: "Sat 28 Nov 09:00", chi: "Fri 27 Nov 16:00", abbr: ["GMT", "AEDT", "CST"] },
    { at: Date.UTC(2027, 3, 3, 15, 59), lon: "Sat 3 Apr 16:59", syd: "Sun 4 Apr 02:59", chi: "Sat 3 Apr 10:59", abbr: ["BST", "AEDT", "CDT"] },
    { at: Date.UTC(2027, 3, 3, 16, 0), lon: "Sat 3 Apr 17:00", syd: "Sun 4 Apr 02:00", chi: "Sat 3 Apr 11:00", abbr: ["BST", "AEST", "CDT"] },
    { at: Date.UTC(2027, 9, 2, 16, 0), lon: "Sat 2 Oct 17:00", syd: "Sun 3 Oct 03:00", chi: "Sat 2 Oct 11:00", abbr: ["BST", "AEDT", "CDT"] },
  ];

  it.each(rows)("$lon London reads $syd in Sydney and $chi in Chicago", (r) => {
    expect(read(LON, r.at)).toBe(r.lon);
    expect(read(SYD, r.at)).toBe(r.syd);
    expect(read(CHI, r.at)).toBe(r.chi);
    expect([zoneAbbr(LON, r.at, "GB"), zoneAbbr(SYD, r.at, "AU"), zoneAbbr(CHI, r.at, "US")]).toEqual(r.abbr);
  });

  it("row 1: rows disagree on date and weekday", () => {
    const at = rows[0].at;
    expect(dayDiff(wallOf(LON, at), wallOf(SYD, at))).toBe(1);
    expect(dayDiff(wallOf(LON, at), wallOf(CHI, at))).toBe(0);
    expect(fmtDayDiff(1)).toBe("+1 day");
    expect(fmtDayDiff(-1)).toBe("−1 day");
  });

  it("row 4: gap +10 a minute before Sydney's clocks go back", () => {
    expect(gap(SYD, rows[3].at)).toBe("+10h");
  });

  it("row 5: gap +9, and Sydney repeats an hour in a 25-hour day", () => {
    const at = rows[4].at;
    expect(gap(SYD, at)).toBe("+9h");
    expect(hhmm(wallOf(SYD, at - HOUR))).toBe("02:00"); // the first 02:00, AEDT
    expect(hhmm(wallOf(SYD, at))).toBe("02:00"); // the second, AEST
    const { start, end } = dayBounds(SYD, at);
    expect((end - start) / HOUR).toBe(25);
    expect(start).toBe(Date.UTC(2027, 3, 3, 13, 0)); // Sydney midnight, AEDT
  });

  it("row 6: gap +10, and Sydney skips an hour in a 23-hour day", () => {
    const at = rows[5].at;
    expect(gap(SYD, at)).toBe("+10h");
    expect(hhmm(wallOf(SYD, at - MIN))).toBe("01:59");
    expect(hhmm(wallOf(SYD, at))).toBe("03:00");
    const { start, end } = dayBounds(SYD, at);
    expect((end - start) / HOUR).toBe(23);
  });
});

describe("spec gap table (London's gaps for the coming year)", () => {
  const ZONES = [SYD, DEL, CHI, LAX];
  // [label, instant from which the row holds, gaps to Sydney, Delhi, Chicago, Los Angeles]
  const table: [string, number, string[]][] = [
    ["21 Nov 2026", Date.UTC(2026, 10, 21, 12), ["+11h", "+5:30", "−6h", "−8h"]],
    ["Sun 14 Mar 2027", Date.UTC(2027, 2, 14, 12), ["+11h", "+5:30", "−5h", "−7h"]],
    ["Sun 28 Mar 2027", Date.UTC(2027, 2, 28, 11), ["+10h", "+4:30", "−6h", "−8h"]],
    ["Sat 3 Apr 2027, 17:00", Date.UTC(2027, 3, 3, 16), ["+9h", "+4:30", "−6h", "−8h"]],
    ["Sat 2 Oct 2027, 17:00", Date.UTC(2027, 9, 2, 16), ["+10h", "+4:30", "−6h", "−8h"]],
    ["Sun 31 Oct 2027", Date.UTC(2027, 9, 31, 12), ["+11h", "+5:30", "−5h", "−7h"]],
    ["Sun 7 Nov 2027", Date.UTC(2027, 10, 7, 12), ["+11h", "+5:30", "−6h", "−8h"]],
  ];

  it.each(table)("from %s", (_label, at, gaps) => {
    expect(ZONES.map((z) => gap(z, at))).toEqual(gaps);
  });

  it.each(table.slice(0, -1).map((row, i) => [row[0], table[i + 1][1], row[2]] as const))(
    "the %s row still holds on the morning its successor starts",
    (_label, nextAt, gaps) => {
      // Midnight London on the day the next row starts, before any 01:00 or later change.
      const w = wallOf(LON, nextAt);
      const midnight = localToInstant(LON, w.year, w.month, w.day, 0, 0);
      // The two 17:00 rows change mid-afternoon, so their predecessors hold until then.
      const probe = w.hour === 17 ? nextAt - MIN : midnight;
      expect(ZONES.map((z) => gap(z, probe))).toEqual(gaps);
    },
  );

  it("nextGapChange, with the board's four-week horizon, finds exactly the changes the table implies", () => {
    const expected: Record<string, [number, string][]> = {
      [SYD]: [
        [Date.UTC(2027, 2, 28, 1), "+10h"],
        [Date.UTC(2027, 3, 3, 16), "+9h"],
        [Date.UTC(2027, 9, 2, 16), "+10h"],
        [Date.UTC(2027, 9, 31, 1), "+11h"],
      ],
      [DEL]: [
        [Date.UTC(2027, 2, 28, 1), "+4:30"],
        [Date.UTC(2027, 9, 31, 1), "+5:30"],
      ],
      [CHI]: [
        [Date.UTC(2027, 2, 14, 8), "−5h"],
        [Date.UTC(2027, 2, 28, 1), "−6h"],
        [Date.UTC(2027, 9, 31, 1), "−5h"],
        [Date.UTC(2027, 10, 7, 7), "−6h"],
      ],
      [LAX]: [
        [Date.UTC(2027, 2, 14, 10), "−7h"],
        [Date.UTC(2027, 2, 28, 1), "−8h"],
        [Date.UTC(2027, 9, 31, 1), "−7h"],
        [Date.UTC(2027, 10, 7, 9), "−8h"],
      ],
    };
    const end = Date.UTC(2027, 10, 21);
    for (const zone of ZONES) {
      const found: [number, string][] = [];
      let t = Date.UTC(2026, 10, 21, 13, 13);
      while (t < end) {
        const ch = nextGapChange(zone, LON, t);
        if (ch && ch.at < end) {
          found.push([ch.at, fmtGap(ch.to)]);
          t = ch.at;
        } else t += 28 * DAY;
      }
      expect(found, zone).toEqual(expected[zone]);
    }
  });

  it("finds the same change wherever the cursor sits, and skips gaps undone within a day", () => {
    const NYC = "America/New_York";
    // Four weeks before the US changes: every quarter hour of a day, so every phase of the scan.
    const start = Date.UTC(2027, 1, 20);
    for (let t = start; t < start + DAY; t += 15 * MIN) {
      // New York and London: lasting, on 14 Mar (and again on 28 Mar).
      expect(nextGapChange(NYC, LON, t)).toEqual({ at: Date.UTC(2027, 2, 14, 7), from: -300, to: -240 });
      // Chicago and Los Angeles change an hour and three hours after New York, then the gap is back.
      expect(nextGapChange(CHI, NYC, t)).toBeNull();
      expect(nextGapChange(LAX, NYC, t)).toBeNull();
    }
    // Auckland's clocks go back two hours before Sydney's, on the same night.
    const apr = Date.UTC(2027, 2, 10);
    for (let t = apr; t < apr + DAY; t += 15 * MIN) expect(nextGapChange(SYD, "Pacific/Auckland", t)).toBeNull();
  });

  it("looks no further than the horizon, even part way through a step", () => {
    const before = Date.UTC(2027, 3, 3, 16) - 3 * HOUR; // three hours before Sydney's change
    expect(nextGapChange(SYD, LON, before, 2 * HOUR)).toBeNull();
    expect(nextGapChange(SYD, LON, before, 4 * HOUR)?.at).toBe(Date.UTC(2027, 3, 3, 16));
  });

  it("Delhi never changes its clocks, so its gap moves only when London's does", () => {
    for (let t = Date.UTC(2026, 10, 21); t < Date.UTC(2027, 10, 21); t += 6 * HOUR) {
      expect(offsetMin(DEL, t)).toBe(330);
    }
  });
});

describe("time helpers", () => {
  it("formats gaps with a true minus sign and half hours", () => {
    expect(fmtGap(660)).toBe("+11h");
    expect(fmtGap(-360)).toBe("−6h");
    expect(fmtGap(330)).toBe("+5:30");
    expect(fmtGap(345)).toBe("+5:45");
    expect(fmtGap(0)).toBe("±0h");
  });

  it("says how far the cursor is from now", () => {
    expect(fmtDistance(15 * MIN)).toBe("+15 min");
    expect(fmtDistance(-(3 * HOUR + 15 * MIN))).toBe("−3h 15m");
    expect(fmtDistance(2 * HOUR)).toBe("+2h");
    expect(fmtDistance(DAY + 4 * HOUR)).toBe("+1 day 4h");
    expect(fmtDistance(108 * DAY)).toBe("+108 days");
    // Within half a minute of now, as when the clock catches up with a cursor set ahead.
    expect(fmtDistance(20e3)).toBe("0 min");
    expect(fmtDistance(-20e3)).toBe("0 min");
  });

  it("localToInstant round-trips wall times, and lands after a skipped hour", () => {
    expect(localToInstant(LON, 2026, 11, 23, 7, 0)).toBe(Date.UTC(2026, 10, 23, 7));
    expect(localToInstant(SYD, 2026, 11, 23, 18, 0)).toBe(Date.UTC(2026, 10, 23, 7));
    expect(localToInstant(LON, 2027, 7, 1, 9, 0)).toBe(Date.UTC(2027, 6, 1, 8));
    // 02:30 does not exist in Sydney on Sun 3 Oct 2027
    expect(hhmm(wallOf(SYD, localToInstant(SYD, 2027, 10, 3, 2, 30)))).toBe("03:30");
  });

  it("reads days of 24 hours where nothing changes", () => {
    const { start, end } = dayBounds(LON, Date.UTC(2026, 10, 21, 13, 13));
    expect(start).toBe(Date.UTC(2026, 10, 21));
    expect(end - start).toBe(DAY);
  });

  it("finds the start of a day whose midnight is skipped", () => {
    // Chile springs forward at 24:00 on Sat 5 Sep 2026, so Sun 6 Sep starts at 01:00.
    const at = Date.UTC(2026, 8, 6, 12);
    const { start, end } = dayBounds("America/Santiago", at);
    expect(hhmm(wallOf("America/Santiago", start))).toBe("01:00");
    expect((end - start) / HOUR).toBe(23);
  });
});
