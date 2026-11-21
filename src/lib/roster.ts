import { cityById, cityForZone, type City } from "./cities";
import { DEFAULT_HOURS, hhmmCompact, parseHHMM, type WorkHours } from "./hours";
import { offsetMin } from "./time";

/** One city on the board. hours: undefined means the default, null means none. */
export interface Entry {
  id: string;
  hours?: WorkHours | null;
}

export interface Settings {
  entries: Entry[];
  /** Personal labels by city id. Kept in localStorage; in the link only when labelsInLink. */
  labels: Record<string, string>;
  /** A city id chosen as home instead of the browser's zone. */
  home?: string;
  labelsInLink: boolean;
}

/** First visit: the home zone plus these. Pending Stephan's decision (spec, open question 4). */
export const DEFAULT_ROSTER = ["london-gb", "new-york-us", "sydney-au"];

export const MAX_LABEL = 40;

/** A row as the board draws it: home first, then the roster in order. */
export interface Row {
  key: string;
  /** The roster entry behind the row, or null for a home row made from the browser's zone. */
  entry: Entry | null;
  name: string;
  label: string;
  zone: string;
  lat: number | null;
  lon: number | null;
  cc?: string;
  hours: WorkHours | null;
  home: boolean;
}

const cleanLabel = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL);

/** Sorts ids by their zone's offset at instant at, west to east, keeping list order on ties. */
export function byOffset(ids: string[], at: number): string[] {
  return ids
    .map((id, i) => ({ id, i, off: offsetMin(cityById(id)!.zone, at) }))
    .sort((a, b) => a.off - b.off || a.i - b.i)
    .map((x) => x.id);
}

export function defaultSettings(at: number): Settings {
  return { entries: byOffset(DEFAULT_ROSTER, at).map((id) => ({ id })), labels: {}, labelsInLink: false };
}

const isUTC = (zone: string) => /^(UTC|GMT|Etc\/.*|Universal|Zulu)$/.test(zone);

/**
 * The board's rows. Home is the chosen city, else the first city in the browser's zone, else
 * a row made from the browser's zone. A browser that reports only UTC gets no UTC row: the
 * first city on the board stands in as home.
 */
export function resolveRows(s: Settings, browserZone: string): Row[] {
  const fromEntry = (e: Entry): Row => {
    const c = cityById(e.id)!;
    return {
      key: e.id,
      entry: e,
      name: c.name,
      label: cleanLabel(s.labels[e.id] ?? ""),
      zone: c.zone,
      lat: c.lat,
      lon: c.lon,
      cc: c.cc,
      hours: e.hours === undefined ? DEFAULT_HOURS : e.hours,
      home: false,
    };
  };
  const rows = s.entries.filter((e) => cityById(e.id)).map(fromEntry);
  let home = (s.home && rows.find((r) => r.key === s.home)) || rows.find((r) => r.zone === browserZone);
  if (!home && isUTC(browserZone)) home = rows[0];
  if (!home) {
    const c: City | undefined = cityForZone(browserZone);
    const name = c?.name ?? browserZone.split("/").pop()!.replace(/_/g, " ");
    home = { key: `zone:${browserZone}`, entry: null, name, label: "", zone: browserZone, lat: c?.lat ?? null, lon: c?.lon ?? null, cc: c?.cc, hours: DEFAULT_HOURS, home: true };
    return [home, ...rows];
  }
  home.home = true;
  return [home, ...rows.filter((r) => r !== home)];
}

// ---------- Link format ----------
// #cities=london-gb,sydney-au@0800-1630,chicago-us@off~Office&home=london-gb
// An entry is an id, then @HHMM-HHMM or @off for non-default hours, then ~label when labels go
// in the link. Labels are percent-encoded, and the hash never reaches a server.

function encodeEntry(e: Entry, label: string | undefined): string {
  let out = e.id;
  if (e.hours === null) out += "@off";
  else if (e.hours && (e.hours.start !== DEFAULT_HOURS.start || e.hours.end !== DEFAULT_HOURS.end)) out += `@${hhmmCompact(e.hours.start)}-${hhmmCompact(e.hours.end)}`;
  const clean = label ? cleanLabel(label) : "";
  if (clean) out += "~" + encodeURIComponent(clean);
  return out;
}

export function encodeHash(s: Settings): string {
  const parts = [`cities=${s.entries.map((e) => encodeEntry(e, s.labelsInLink ? s.labels[e.id] : undefined)).join(",")}`];
  if (s.home && s.entries.some((e) => e.id === s.home)) parts.push(`home=${s.home}`);
  return "#" + parts.join("&");
}

/** Reads a link's hash. Returns null when it holds no board; unknown cities are dropped. */
export function decodeHash(hash: string): { entries: Entry[]; labels: Record<string, string>; home?: string } | null {
  const fields = new Map<string, string>();
  for (const part of hash.replace(/^#/, "").split("&")) {
    const i = part.indexOf("=");
    if (i > 0) fields.set(part.slice(0, i), part.slice(i + 1));
  }
  const raw = fields.get("cities");
  if (raw === undefined) return null;
  const entries: Entry[] = [];
  const labels: Record<string, string> = {};
  for (const item of raw.split(",")) {
    const tilde = item.indexOf("~");
    const head = tilde >= 0 ? item.slice(0, tilde) : item;
    const [id, hoursPart] = head.split("@");
    if (!cityById(id) || entries.some((e) => e.id === id)) continue;
    const entry: Entry = { id };
    if (hoursPart === "off") entry.hours = null;
    else if (hoursPart) {
      const [a, b] = hoursPart.split("-").map((x) => parseHHMM(x ?? ""));
      if (a !== null && b !== null && a !== undefined && b !== undefined && a !== b) entry.hours = { start: a, end: b };
    }
    entries.push(entry);
    if (tilde >= 0) {
      try {
        const label = cleanLabel(decodeURIComponent(item.slice(tilde + 1)));
        if (label) labels[id] = label;
      } catch {
        // a malformed label is dropped, not the city
      }
    }
  }
  const home = fields.get("home");
  return { entries, labels, home: home && entries.some((e) => e.id === home) ? home : undefined };
}

// ---------- localStorage ----------

const KEY = "sundial:v1";

interface Stored {
  entries: Entry[];
  labels: Record<string, string>;
  home?: string;
  labelsInLink?: boolean;
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    if (!Array.isArray(v.entries)) return null;
    return {
      entries: v.entries.filter((e) => e && typeof e.id === "string" && cityById(e.id)),
      labels: v.labels && typeof v.labels === "object" ? v.labels : {},
      home: typeof v.home === "string" ? v.home : undefined,
      labelsInLink: !!v.labelsInLink,
    };
  } catch {
    return null;
  }
}

export function writeStored(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ entries: s.entries, labels: s.labels, home: s.home, labelsInLink: s.labelsInLink } satisfies Stored));
  } catch {
    // private mode or storage blocked: the link still holds the board
  }
}

/**
 * The board to show: the link's if it has one (labels it lacks come from this browser),
 * else this browser's saved board, else the default.
 */
export function loadSettings(hash: string, at: number): Settings {
  const stored = readStored();
  const fromLink = decodeHash(hash);
  if (fromLink) {
    const linkHasLabels = Object.keys(fromLink.labels).length > 0;
    return {
      entries: fromLink.entries,
      labels: { ...(stored?.labels ?? {}), ...fromLink.labels },
      home: fromLink.home,
      labelsInLink: linkHasLabels || !!stored?.labelsInLink,
    };
  }
  if (stored) return { entries: stored.entries, labels: stored.labels, home: stored.home, labelsInLink: !!stored.labelsInLink };
  return defaultSettings(at);
}

// ---------- Edits ----------

/** Adds a city where its offset puts it, west to east, unless it is already on the board. */
export function addCity(s: Settings, id: string, at: number): Settings {
  const c = cityById(id);
  if (!c || s.entries.some((e) => e.id === id)) return s;
  const off = offsetMin(c.zone, at);
  const i = s.entries.findIndex((e) => offsetMin(cityById(e.id)!.zone, at) > off);
  const entries = [...s.entries];
  entries.splice(i < 0 ? entries.length : i, 0, { id });
  return { ...s, entries };
}

export function removeCity(s: Settings, id: string): Settings {
  return { ...s, entries: s.entries.filter((e) => e.id !== id), home: s.home === id ? undefined : s.home };
}

/** Moves a city one place up (-1) or down (+1) among the rows below home. */
export function moveCity(s: Settings, id: string, dir: -1 | 1, homeId: string | null): Settings {
  const others = s.entries.filter((e) => e.id !== homeId);
  const i = others.findIndex((e) => e.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= others.length) return s;
  [others[i], others[j]] = [others[j], others[i]];
  const homeEntry = s.entries.find((e) => e.id === homeId);
  return { ...s, entries: homeEntry ? [homeEntry, ...others] : others };
}

export function setLabel(s: Settings, id: string, label: string): Settings {
  // Kept as typed (so a space can be typed mid-label) and tidied wherever it is shown or encoded.
  const labels = { ...s.labels };
  const v = label.slice(0, MAX_LABEL);
  if (v.trim()) labels[id] = v;
  else delete labels[id];
  return { ...s, labels };
}

export function setHours(s: Settings, id: string, hours: WorkHours | null | undefined): Settings {
  return { ...s, entries: s.entries.map((e) => (e.id === id ? { id: e.id, ...(hours === undefined ? {} : { hours }) } : e)) };
}
