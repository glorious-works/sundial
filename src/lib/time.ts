// All arithmetic is on instants (epoch milliseconds). Wall-clock time comes from the
// row's IANA zone at that instant, as the last step. No Date parsing of "YYYY-MM-DD"
// strings and no hand-held offsets.

export const MIN = 60e3;
export const HOUR = 3600e3;
export const DAY = 86400e3;
/** Quarter hour: the step for cursor snapping, strip marks and change times. */
export const Q = 15 * MIN;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WDL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MOL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A wall-clock reading in some zone. month is 1-12, weekday 0 (Sunday) to 6. */
export interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function zoneFmt(zone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    fmtCache.set(zone, f);
  }
  return f;
}

/** True when the runtime knows this IANA zone name. */
export function isValidZone(zone: string): boolean {
  try {
    zoneFmt(zone);
    return true;
  } catch {
    return false;
  }
}

// Chrome and Node (V8) report some zones by their old names, so a browser in India says
// Asia/Calcutta. These are the ones the city list uses under their current names; the unit test
// checks every city's zone against what this runtime reports.
const RENAMED: Record<string, string> = {
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Godthab": "America/Nuuk",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Europe/Kiev": "Europe/Kyiv",
};

/** A zone under the name the city list uses: Asia/Calcutta gives Asia/Kolkata. */
export const canonicalZone = (zone: string) => RENAMED[zone] ?? zone;

/** The zone's offset from UTC in minutes at instant ms. */
export function offsetMin(zone: string, ms: number): number {
  const p: Record<string, string> = {};
  for (const { type, value } of zoneFmt(zone).formatToParts(new Date(ms))) p[type] = value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(ms / 1000) * 1000) / MIN);
}

/** Reads a wall clock from an instant and a known offset. */
export function wallAt(ms: number, offset: number): Wall {
  const d = new Date(ms + offset * MIN);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

export function wallOf(zone: string, ms: number): Wall {
  return wallAt(ms, offsetMin(zone, ms));
}

/** The instant a wall-clock reading names in zone. In a skipped hour it lands after the gap. */
export function localToInstant(zone: string, year: number, month: number, day: number, hour = 0, minute = 0): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const t = guess - offsetMin(zone, guess) * MIN;
  return guess - offsetMin(zone, t) * MIN;
}

/** Days between two wall dates, b minus a, by calendar date only. */
export function dayDiff(a: Wall, b: Wall): number {
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY);
}

export function sameDate(a: Wall, b: Wall): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export interface Segment {
  /** Exclusive end of the segment; the last one runs to Infinity. */
  to: number;
  off: number;
}

/**
 * Offsets across a short window (a strip's width): constant, or one change found by
 * bisection and placed on its quarter hour.
 */
export function segments(zone: string, a: number, b: number): Segment[] {
  const oa = offsetMin(zone, a);
  const ob = offsetMin(zone, b);
  if (oa === ob) return [{ to: Infinity, off: oa }];
  let lo = a;
  let hi = b;
  while (hi - lo > MIN) {
    const mid = Math.floor((lo + hi) / 2);
    if (offsetMin(zone, mid) === oa) lo = mid;
    else hi = mid;
  }
  return [
    { to: Math.floor(hi / Q) * Q, off: oa },
    { to: Infinity, off: ob },
  ];
}

export function offAt(segs: Segment[], t: number): number {
  for (const s of segs) if (t < s.to) return s.off;
  return segs[segs.length - 1].off;
}

export interface GapChange {
  at: number;
  from: number;
  to: number;
}

/**
 * The first lasting change in zone's offset from homeZone after from, within horizon. A change
 * undone within a day is skipped: zones that move their clocks on the same night a few hours
 * apart (New York and Chicago, Sydney and Auckland) differ only for those hours.
 */
export function nextGapChange(zone: string, homeZone: string, from: number, horizon = 28 * DAY): GapChange | null {
  const gapAt = (t: number) => offsetMin(zone, t) - offsetMin(homeZone, t);
  const g0 = gapAt(from);
  const end = from + horizon;
  const step = 6 * HOUR;
  for (let prev = from; prev < end; prev += step) {
    const t = Math.min(prev + step, end);
    if (gapAt(t) === g0) continue;
    let lo = prev;
    let hi = t;
    while (hi - lo > MIN) {
      const mid = Math.floor((lo + hi) / 2);
      if (gapAt(mid) === g0) lo = mid;
      else hi = mid;
    }
    if (gapAt(hi + DAY) !== g0) return { at: Math.floor(hi / Q) * Q, from: g0, to: gapAt(hi) };
  }
  return null;
}

/** First instant of the local date containing ms, to the minute, then on its quarter hour. */
export function dayStart(zone: string, ms: number): number {
  const w = wallOf(zone, ms);
  let lo = ms - 50 * HOUR;
  let hi = ms;
  while (hi - lo > MIN) {
    const mid = Math.floor((lo + hi) / 2);
    if (sameDate(wallOf(zone, mid), w)) hi = mid;
    else lo = mid;
  }
  return Math.floor(hi / Q) * Q;
}

/** Start and end of the local date containing ms; a 23- or 25-hour day shows in the length. */
export function dayBounds(zone: string, ms: number): { start: number; end: number } {
  const start = dayStart(zone, ms);
  return { start, end: dayStart(zone, start + 26 * HOUR) };
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const hhmm = (w: Wall) => `${pad(w.hour)}:${pad(w.minute)}`;
/** "Sun 22 Nov", or "Sun 22 Nov 2027" with the year. */
export const dayLabel = (w: Wall, withYear = false) => `${WD[w.weekday]} ${w.day} ${MO[w.month - 1]}${withYear ? ` ${w.year}` : ""}`;
/** "Sunday 22 November" */
export const longDayLabel = (w: Wall) => `${WDL[w.weekday]} ${w.day} ${MOL[w.month - 1]}`;

/** "+11h", "+5:30", "−6h", "±0h". Minus is U+2212. */
export function fmtGap(min: number): string {
  if (min === 0) return "±0h";
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return (min > 0 ? "+" : "−") + h + (m ? ":" + pad(m) : "h");
}

/** How far the cursor is from now: "+15 min", "−3h 15m", "+2 days 4h", or "0 min" within half a minute. Minus is U+2212. */
export function fmtDistance(ms: number): string {
  const total = Math.round(Math.abs(ms) / MIN);
  if (!total) return "0 min";
  const sign = ms < 0 ? "−" : "+";
  const days = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (days) return `${sign}${days} ${days === 1 ? "day" : "days"}${h ? ` ${h}h` : ""}`;
  if (h) return `${sign}${h}h${m ? ` ${m}m` : ""}`;
  return `${sign}${m} min`;
}

/** "+1 day", "−2 days", or "" when the same date. */
export function fmtDayDiff(n: number): string {
  if (!n) return "";
  const a = Math.abs(n);
  return `${n > 0 ? "+" : "−"}${a} ${a === 1 ? "day" : "days"}`;
}

/** The zone's short name, such as AEDT or CST, for display only, or null when the runtime has only "GMT+11". */
export function zoneAbbr(zone: string, ms: number, country?: string): string | null {
  const locales = country ? [`en-${country}`, "en-US"] : ["en-US"];
  for (const loc of locales) {
    try {
      const part = new Intl.DateTimeFormat(loc, { timeZone: zone, timeZoneName: "short" })
        .formatToParts(new Date(ms))
        .find((p) => p.type === "timeZoneName")?.value;
      if (part && !/^(GMT|UTC)[+−-]/.test(part)) return part;
    } catch {
      // unknown locale or zone: try the next
    }
  }
  return null;
}
