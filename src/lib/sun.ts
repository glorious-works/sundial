import { DAY } from "./time";

export interface SunPosition {
  /** Geometric elevation of the sun's centre in degrees, no refraction. */
  alt: number;
  /** Morning side of the sky (hour angle negative), so the colour takes the dawn ramp. */
  rising: boolean;
}

/** Low-precision solar position, good to a fraction of a degree (checked against astronomy-engine in the tests). */
export function sun(ms: number, lat: number, lon: number): SunPosition {
  const rad = Math.PI / 180;
  const d = (ms - 946728000000) / DAY; // days from J2000.0
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = 18.697374558 + 24.06570982441908 * d;
  let H = ((gmst % 24) * 15 + lon) * rad - ra;
  H = Math.atan2(Math.sin(H), Math.cos(H));
  const phi = lat * rad;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / rad;
  return { alt, rising: H < 0 };
}

export type RGB = [number, number, number];

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const stops = (list: [number, string][]): [number, RGB][] => list.map(([a, c]) => [a, hex(c)]);

// Brand palette by sun elevation; the bands also step in brightness so they read without hue.
const DAWN = stops([
  [-90, "#0B1A52"], [-18, "#0F2166"], [-12, "#142A7A"], [-6, "#3A62D0"], [-3, "#8C5CB8"],
  [-0.833, "#E0607E"], [2, "#F2895A"], [6, "#FEC94E"], [30, "#FFD978"], [90, "#FFE3A0"],
]);
const DUSK = stops([
  [-90, "#0B1A52"], [-18, "#0F2166"], [-12, "#142A7A"], [-6, "#3A62D0"], [-3, "#80409F"],
  [-0.833, "#C83C25"], [2, "#E4672E"], [6, "#FEC94E"], [30, "#FFD978"], [90, "#FFE3A0"],
]);

export function skyRGB(alt: number, rising: boolean): RGB {
  const S = rising ? DAWN : DUSK;
  for (let i = 1; i < S.length; i++) {
    if (alt <= S[i][0]) {
      const [a0, c0] = S[i - 1];
      const [a1, c1] = S[i];
      const t = (alt - a0) / (a1 - a0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * t)) as RGB;
    }
  }
  return S[S.length - 1][1];
}

export type SkyState = "Night" | "Twilight" | "Sunrise" | "Sunset" | "Day";

export function skyState(alt: number, rising: boolean): SkyState {
  if (alt < -12) return "Night";
  if (alt < -0.833) return "Twilight";
  if (alt < 6) return rising ? "Sunrise" : "Sunset";
  return "Day";
}

export const rgbCss = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`;
