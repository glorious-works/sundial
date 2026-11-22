import { dayBounds, dayLabel, HOUR, offAt, Q, sameDate, segments, wallAt, type Segment, type Wall } from "./time";

/** Hours shown across a strip of this many CSS pixels. */
export const visibleHours = (width: number) => (width < 520 ? 24 : width < 900 ? 30 : 36);

export interface Mark {
  t: number;
  x: number;
  wall: Wall;
}

export interface DayMark {
  t: number;
  x: number;
  label: string;
}

export interface StripLayout {
  width: number;
  t0: number;
  t1: number;
  /** Pixels per hour. */
  pph: number;
  segs: Segment[];
  /** A mark every quarter hour across the strip, in the row's own wall time. */
  marks: Mark[];
  /** The first quarter hour of each local date inside the strip (never past either edge): where its label is drawn. */
  days: DayMark[];
  /** The label of the day the strip's left edge is in, kept sticky at the left. */
  edgeLabel: string;
  /** What the strip shows for the day under the cursor at its centre. */
  cursorDay: { label: string; hours: number };
}

/** Everything the strip draws, worked out from the instant and the row's zone. The cursor sits at the centre. */
export function stripLayout(zone: string, cursor: number, width: number): StripLayout {
  const pph = width / visibleHours(width);
  const t0 = cursor - (width / 2 / pph) * HOUR;
  const t1 = cursor + (width / 2 / pph) * HOUR;
  const x = (t: number) => ((t - t0) / HOUR) * pph;
  const segs = segments(zone, t0 - HOUR, t1 + HOUR);

  const marks: Mark[] = [];
  const days: DayMark[] = [];
  let prev = wallAt(Math.floor(t0 / Q) * Q - Q, offAt(segs, Math.floor(t0 / Q) * Q - Q));
  for (let t = Math.floor(t0 / Q) * Q; t <= t1 + Q; t += Q) {
    const wall = wallAt(t, offAt(segs, t));
    marks.push({ t, x: x(t), wall });
    if (!sameDate(wall, prev) && x(t) >= 0 && x(t) <= width) days.push({ t, x: x(t), label: dayLabel(wall) });
    prev = wall;
  }
  const edgeLabel = dayLabel(wallAt(t0, offAt(segs, t0)));
  const centre = width / 2;
  const drawn = days.filter((d) => d.x <= centre).pop()?.label ?? edgeLabel;
  const { start, end } = dayBounds(zone, cursor);
  return { width, t0, t1, pph, segs, marks, days, edgeLabel, cursorDay: { label: drawn, hours: (end - start) / HOUR } };
}
