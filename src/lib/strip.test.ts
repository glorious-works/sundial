import { describe, expect, it } from "vitest";
import { stripLayout } from "./strip";
import { dayLabel, HOUR, Q, wallOf } from "./time";

const ZONES = ["Europe/London", "Australia/Sydney", "America/Chicago", "Asia/Kolkata", "Asia/Kathmandu", "Pacific/Auckland", "America/St_Johns"];
const WIDTHS = [343, 640, 980];

describe("strip layout", () => {
  it("the everytimezone regression: at Sat 21 Nov 2026 13:18 GMT each cursor sits on its own row's day", () => {
    const at = Date.UTC(2026, 10, 21, 13, 18);
    for (const w of WIDTHS) {
      expect(stripLayout("Europe/London", at, w).cursorDay.label).toBe("Sat 21 Nov");
      expect(stripLayout("Australia/Sydney", at, w).cursorDay.label).toBe("Sun 22 Nov");
      expect(stripLayout("America/Chicago", at, w).cursorDay.label).toBe("Sat 21 Nov");
    }
  });

  it("labels the day under the cursor with the row's own date at every quarter hour of a week", () => {
    const start = Date.UTC(2027, 3, 1);
    for (const zone of ZONES) {
      for (let t = start; t < start + 7 * 24 * HOUR; t += Q) {
        for (const w of WIDTHS) {
          const drawn = stripLayout(zone, t, w).cursorDay.label;
          if (drawn !== dayLabel(wallOf(zone, t))) throw new Error(`${zone} at ${new Date(t).toISOString()} width ${w}: ${drawn}`);
        }
      }
    }
  });

  it("marks each local date where it starts, and draws 25- and 23-hour days at their true length", () => {
    // Sun 4 Apr 2027 in Sydney: 25 hours. Centre the strip on that day.
    let s = stripLayout("Australia/Sydney", Date.UTC(2027, 3, 3, 13) + 12.5 * HOUR, 980);
    let a = s.days.find((d) => d.label === "Sun 4 Apr")!;
    let b = s.days.find((d) => d.label === "Mon 5 Apr")!;
    expect((b.t - a.t) / HOUR).toBe(25);
    expect(b.x - a.x).toBeCloseTo(25 * s.pph, 6);
    expect(s.cursorDay.hours).toBe(25);

    // Sun 3 Oct 2027 in Sydney: 23 hours.
    s = stripLayout("Australia/Sydney", Date.UTC(2027, 9, 2, 14) + 11.5 * HOUR, 980);
    a = s.days.find((d) => d.label === "Sun 3 Oct")!;
    b = s.days.find((d) => d.label === "Mon 4 Oct")!;
    expect((b.t - a.t) / HOUR).toBe(23);
    expect(s.cursorDay.hours).toBe(23);
  });

  it("labels no midnight past the right edge", () => {
    // London's Sun 22 Nov starts ten minutes past the right edge of a 24-hour phone strip.
    const s = stripLayout("Europe/London", Date.UTC(2026, 10, 21, 11, 50), 375);
    expect(s.t1).toBe(Date.UTC(2026, 10, 21, 23, 50));
    expect(s.days.map((d) => d.label)).toEqual(["Sat 21 Nov"]);
    for (const w of WIDTHS)
      for (let t = Date.UTC(2026, 10, 21); t < Date.UTC(2026, 10, 22); t += Q) {
        for (const d of stripLayout("Europe/London", t, w).days) expect(d.x).toBeLessThanOrEqual(w);
      }
  });

  it("shows 24, 30 or 36 hours depending on width", () => {
    expect(stripLayout("Europe/London", 0, 343).t1 - stripLayout("Europe/London", 0, 343).t0).toBe(24 * HOUR);
    expect(stripLayout("Europe/London", 0, 640).t1 - stripLayout("Europe/London", 0, 640).t0).toBe(30 * HOUR);
    expect(stripLayout("Europe/London", 0, 980).t1 - stripLayout("Europe/London", 0, 980).t0).toBe(36 * HOUR);
  });
});
