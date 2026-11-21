import type { Wall } from "./time";

/** Working hours in minutes after local midnight, Monday to Friday; null means none. */
export interface WorkHours {
  start: number;
  end: number;
}

export const DEFAULT_HOURS: WorkHours = { start: 9 * 60, end: 17 * 60 + 30 };
/** Shared waking hours, the overlap finder's fallback. */
export const WAKING_HOURS: WorkHours = { start: 7 * 60, end: 22 * 60 };

export const isWeekend = (w: Wall) => w.weekday === 0 || w.weekday === 6;
const minutes = (w: Wall) => w.hour * 60 + w.minute;
const within = (m: number, h: WorkHours) => (h.start <= h.end ? m >= h.start && m < h.end : m >= h.start || m < h.end);

/** Inside working hours at this wall time: a weekday, between start (inclusive) and end (exclusive). */
export function isWorking(w: Wall, hours: WorkHours | null): boolean {
  if (!hours || isWeekend(w)) return false;
  return within(minutes(w), hours);
}

/** Inside waking hours, any day of the week. */
export function isAwake(w: Wall, hours: WorkHours = WAKING_HOURS): boolean {
  return within(minutes(w), hours);
}

export type WorkStatus = "working hours" | "off work" | "weekend";

export function workStatus(w: Wall, hours: WorkHours | null): WorkStatus {
  if (isWeekend(w)) return "weekend";
  return isWorking(w, hours) ? "working hours" : "off work";
}

/** "0900" style, for links. */
export const hhmmCompact = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
/** "09:00" style, for inputs and labels. */
export const hhmmColon = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function parseHHMM(s: string): number | null {
  const m = /^([01]\d|2[0-3]):?([0-5]\d)$/.exec(s);
  return m ? +m[1] * 60 + +m[2] : null;
}
