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

export interface Overlap {
  /** "work": every row in working hours; "waking": none, so shared waking hours instead; "none": neither. */
  kind: "work" | "waking" | "none";
  intervals: Interval[];
}

/** Columns where every row is at work, falling back to shared waking hours (07:00 to 22:00) when there are none. */
export function findOverlap(rows: BoardRow[], from: number, to: number, waking: WorkHours = WAKING_HOURS): Overlap {
  const work = sharedIntervals(rows, from, to, (w, r) => isWorking(w, r.hours));
  if (work.length) return { kind: "work", intervals: work };
  const awake = sharedIntervals(rows, from, to, (w) => isAwake(w, waking));
  return awake.length ? { kind: "waking", intervals: awake } : { kind: "none", intervals: [] };
}

/**
 * The one-line summary of the cursor time, home row first:
 * "Mon 23 Nov, 07:00 London / 18:00 Sydney / 01:00 Chicago".
 * Rows whose date differs from home's carry their date in brackets.
 */
export function copyLine(rows: BoardRow[], at: number): string {
  if (!rows.length) return "";
  const home = wallOf(rows[0].zone, at);
  return rows
    .map((r, i) => {
      if (i === 0) return `${dayLabel(home)}, ${hhmm(home)} ${r.name}`;
      const w = wallOf(r.zone, at);
      return `${hhmm(w)} ${r.name}${sameDate(w, home) ? "" : ` (${dayLabel(w)})`}`;
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
