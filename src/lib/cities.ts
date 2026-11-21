import data from "@/data/cities.json";
import { isValidZone } from "./time";

export interface City {
  /** Stable id used in links: never change one once shipped. */
  id: string;
  name: string;
  country: string;
  /** ISO 3166 country code. */
  cc: string;
  zone: string;
  lat: number;
  lon: number;
  /** Another name people search by, such as Bombay. */
  aka?: string;
}

/** The curated list, minus any zone this runtime does not know (older browsers lack some newer names). */
export const CITIES: City[] = (data as City[]).filter((c) => isValidZone(c.zone));
const BY_ID = new Map(CITIES.map((c) => [c.id, c]));

export const cityById = (id: string) => BY_ID.get(id);

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** The city a zone is named after (America/Chicago gives Chicago), if the list has it. */
export function cityForZone(zone: string): City | undefined {
  const tail = fold(zone.split("/").pop() ?? "");
  return CITIES.find((c) => c.zone === zone && fold(c.name) === tail) ?? CITIES.find((c) => c.zone === zone);
}

// Common zone abbreviations. IST alone is India, Ireland or Israel, and CST is Chicago or Shanghai.
const ABBREVIATIONS = new Set(
  ("UTC GMT BST IST WET WEST CET CEST EET EEST MSK TRT GST PKT NPT WIB WITA WIT ICT HKT SGT PHT CST JST KST " +
    "AWST ACST ACDT AEST AEDT NZST NZDT HST AKST AKDT PST PDT MST MDT CDT EST EDT AST ADT NST NDT BRT ART CLT CLST " +
    "WAT CAT EAT SAST IRST AFT").split(" "),
);

/** True when the query is a zone abbreviation typed as one (in capitals): shown on the board, never accepted as input. */
export const isAbbreviation = (query: string) => ABBREVIATIONS.has(query.trim()) && query.trim() === query.trim().toUpperCase();

/**
 * Search by city name, other name, country or IANA zone. Zone abbreviations such as AEDT
 * are never matched: they are ambiguous, so they are shown but not accepted as input.
 */
export function searchCities(query: string, limit = 8): City[] {
  const q = fold(query);
  if (!q || isAbbreviation(query)) return [];
  const scored: [number, City][] = [];
  for (const c of CITIES) {
    const name = fold(c.name);
    const aka = c.aka ? fold(c.aka) : "";
    const zone = fold(c.zone.replace(/_/g, " "));
    const country = fold(c.country);
    let score = -1;
    if (name === q || aka === q) score = 0;
    else if (name.startsWith(q) || aka.startsWith(q)) score = 1;
    else if (name.split(" ").some((w) => w.startsWith(q))) score = 2;
    else if (country.startsWith(q)) score = 3;
    else if (zone.startsWith(q) || zone.split(" ").some((w) => w.startsWith(q))) score = 4;
    if (score >= 0) scored.push([score, c]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, c]) => c);
}
