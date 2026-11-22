import { isAwake, isWorking, WAKING_HOURS, type WorkHours } from "./hours";
import { dayLabel, fmtGap, hhmm, offAt, Q, sameDate, segments, wallAt, wallOf, type GapChange, type Wall } from "./time";

/** One row of the board, as the date logic needs it. */
export interface BoardRow {
  name: string;
  zone: string;
  hours: WorkHours | null;
}

export interface Interval {
  start: number;
  end: number;
}

/** Quarter hours in [from, to) where every row passes test, merged into intervals. */
export function sharedIntervals(rows: BoardRow[], from: number, to: number, test: (w: Wall, row: BoardRow) => boolean): Interval[] {
  if (!rows.length) return [];
  const segs = rows.map((r) => segments(r.zone, from, to));
  const out: Interval[] = [];
  for (let t = Math.ceil(from / Q) * Q; t < to; t += Q) {
    const ok = rows.every((r, i) => test(wallAt(t, offAt(segs[i], t)), r));
    if (!ok) continue;
    const last = out[out.length - 1];
    if (last && last.end === t) last.end = t + Q;
    else out.push({ start: t, end: t + Q });
  }
  return out;
}

/** A row outside waking hours at the best time, and how far outside it is. */
export interface Outside {
  row: number;
  /** "early" before waking hours start, "late" after they end, "asleep" when more than two hours out. */
  when: "early" | "late" | "asleep";
  wall: Wall;
}

export interface Overlap {
  /**
   * "work": every row in working hours. "waking": none, so shared waking hours instead.
   * "best": no shared waking hours either, so the time that leaves everyone least far outside them.
   * "none": no rows to compare.
   */
  kind: "work" | "waking" | "best" | "none";
  intervals: Interval[];
  /** For "best": the suggested moment, and who is outside waking hours then. */
  best?: { at: number; outside: Outside[] };
}

const minutesOf = (w: Wall) => w.hour * 60 + w.minute;

/**
 * How far a quarter hour starting at m lies outside h, the shorter way round the clock, and on
 * which side: midnight is 2h 15m after 22:00 (late), not 7h before 07:00. 0 when wholly inside.
 */
function distanceOutside(m: number, h: WorkHours): { by: number; late: boolean } {
  if (m >= h.start && m + 15 <= h.end) return { by: 0, late: false };
  const after = (m + 15 - h.end + 1440) % 1440;
  const before = (h.start - m + 1440) % 1440;
  return after < before ? { by: after, late: true } : { by: before, late: false };
}

/**
 * Columns where every row is at work, falling back to shared waking hours (07:00 to 22:00), and
 * when there are none of those either, to the quarter hours that leave the rows least far outside
 * waking hours in total. Of those, the longest run is washed and its middle suggested.
 */
export function findOverlap(rows: BoardRow[], from: number, to: number, waking: WorkHours = WAKING_HOURS): Overlap {
  if (rows.length < 2) return { kind: "none", intervals: [] };
  const work = sharedIntervals(rows, from, to, (w, r) => isWorking(w, r.hours));
  if (work.length) return { kind: "work", intervals: work };
  const awake = sharedIntervals(rows, from, to, (w) => isAwake(w, waking));
  if (awake.length) return { kind: "waking", intervals: awake };

  const segs = rows.map((r) => segments(r.zone, from, to));
  const slots: { t: number; debt: number }[] = [];
  for (let t = Math.ceil(from / Q) * Q; t < to; t += Q) {
    slots.push({ t, debt: rows.reduce((sum, r, i) => sum + distanceOutside(minutesOf(wallAt(t, offAt(segs[i], t))), waking).by, 0) });
  }
  if (!slots.length) return { kind: "none", intervals: [] };
  const least = Math.min(...slots.map((s) => s.debt));
  let run: Interval | null = null;
  let best: Interval | null = null;
  for (const s of slots) {
    if (s.debt === least) run = run && run.end === s.t ? { start: run.start, end: s.t + Q } : { start: s.t, end: s.t + Q };
    else run = null;
    if (run && (!best || run.end - run.start > best.end - best.start)) best = run;
  }
  const iv = best!;
  const at = Math.floor((iv.start + iv.end) / 2 / Q) * Q;
  const outside: Outside[] = [];
  rows.forEach((r, i) => {
    const wall = wallAt(at, offAt(segs[i], at));
    const { by, late } = distanceOutside(minutesOf(wall), waking);
    if (by > 0) outside.push({ row: i, wall, when: by > 120 ? "asleep" : late ? "late" : "early" });
  });
  return { kind: "best", intervals: [iv], best: { at, outside } };
}

/** "Best: 11:30 London, with New York up early (06:30) and Sydney up late (22:30)." */
export function bestText(o: Overlap, rows: BoardRow[]): string {
  if (o.kind !== "best" || !o.best) return "";
  const home = wallOf(rows[0].zone, o.best.at);
  const who = o.best.outside.map((x) => {
    const what = x.when === "asleep" ? "asleep" : x.when === "late" ? "up late" : "up early";
    return `${rows[x.row].name} ${what} (${hhmm(x.wall)})`;
  });
  const list = who.length > 1 ? `${who.slice(0, -1).join(", ")} and ${who[who.length - 1]}` : who[0];
  return `Best: ${hhmm(home)} ${rows[0].name}, with ${list}.`;
}

/**
 * The one-line summary of the cursor time, home row first:
 * "Mon 23 Nov, 07:00 London / 18:00 Sydney / 01:00 Chicago".
 * Rows whose date differs from home's carry their date in brackets.
 */
export function copyLine(rows: BoardRow[], at: number, withYear = false): string {
  if (!rows.length) return "";
  const home = wallOf(rows[0].zone, at);
  return rows
    .map((r, i) => {
      if (i === 0) return `${dayLabel(home, withYear)}, ${hhmm(home)} ${r.name}`;
      const w = wallOf(r.zone, at);
      return `${hhmm(w)} ${r.name}${sameDate(w, home) ? "" : ` (${dayLabel(w, withYear)})`}`;
    })
    .join(" / ");
}

/** "Gap becomes +9h on Sat 3 Apr at 17:00 London time", in the home row's wall time. */
export function gapNote(change: GapChange, home: BoardRow): string {
  const w = wallOf(home.zone, change.at);
  return `Gap becomes ${fmtGap(change.to)} on ${dayLabel(w)} at ${hhmm(w)} ${home.name} time`;
}

/** An interval as each row reads it: "20:00–22:00 London". */
export function intervalText(iv: Interval, row: BoardRow, home?: Wall): string {
  const a = wallOf(row.zone, iv.start);
  const b = wallOf(row.zone, iv.end);
  const date = home && !sameDate(a, home) ? ` (${dayLabel(a)})` : "";
  return `${hhmm(a)}–${hhmm(b)} ${row.name}${date}`;
}
