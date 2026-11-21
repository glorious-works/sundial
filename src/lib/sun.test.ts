import { Body, Equator, Horizon, Observer } from "astronomy-engine";
import { describe, expect, it } from "vitest";
import { HOUR } from "./time";
import { skyRGB, skyState, sun } from "./sun";

const PLACES = [
  [51.5074, -0.1278], // London
  [-33.8688, 151.2093], // Sydney
  [41.8781, -87.6298], // Chicago
  [28.6139, 77.209], // Delhi
  [64.1466, -21.9426], // Reykjavík
  [1.3521, 103.8198], // Singapore
  [-41.2865, 174.7762], // Wellington
];

function reference(ms: number, lat: number, lon: number): number {
  const obs = new Observer(lat, lon, 0);
  const date = new Date(ms);
  const eq = Equator(Body.Sun, date, obs, true, true);
  return Horizon(date, obs, eq.ra, eq.dec).altitude;
}

describe("sun", () => {
  it("stays within a fraction of a degree of astronomy-engine across 2026 to 2028", () => {
    let worst = 0;
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 37 * HOUR) {
      for (const [lat, lon] of PLACES) worst = Math.max(worst, Math.abs(sun(t, lat, lon).alt - reference(t, lat, lon)));
    }
    expect(worst).toBeLessThan(0.1);
  });

  it("puts London's sun near its real midwinter and midsummer noon heights", () => {
    expect(sun(Date.UTC(2026, 11, 21, 12, 5), 51.5074, -0.1278).alt).toBeCloseTo(15.0, 0);
    expect(sun(Date.UTC(2027, 5, 21, 12, 1), 51.5074, -0.1278).alt).toBeCloseTo(61.9, 0);
  });

  it("knows morning from evening", () => {
    expect(sun(Date.UTC(2026, 10, 21, 8), 51.5074, -0.1278).rising).toBe(true);
    expect(sun(Date.UTC(2026, 10, 21, 16), 51.5074, -0.1278).rising).toBe(false);
  });
});

describe("sky colour", () => {
  it("uses the spec's bands", () => {
    expect(skyState(-20, true)).toBe("Night");
    expect(skyState(-12, true)).toBe("Twilight");
    expect(skyState(-0.9, false)).toBe("Twilight");
    expect(skyState(-0.833, true)).toBe("Sunrise");
    expect(skyState(5.9, false)).toBe("Sunset");
    expect(skyState(6, true)).toBe("Day");
  });

  it("hits the brand stops", () => {
    expect(skyRGB(-12, true)).toEqual([0x14, 0x2a, 0x7a]); // cobalt dark
    expect(skyRGB(-6, false)).toEqual([0x3a, 0x62, 0xd0]); // cobalt
    expect(skyRGB(-0.833, true)).toEqual([0xe0, 0x60, 0x7e]); // dawn rose
    expect(skyRGB(-0.833, false)).toEqual([0xc8, 0x3c, 0x25]); // tomato
    expect(skyRGB(6, true)).toEqual([0xfe, 0xc9, 0x4e]); // signal yellow
    expect(skyRGB(90, false)).toEqual([0xff, 0xe3, 0xa0]);
  });

  it("is darkest at night and lightest at high sun", () => {
    const lum = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (const rising of [true, false]) {
      expect(lum(skyRGB(-30, rising))).toBeLessThan(lum(skyRGB(-8, rising)));
      expect(lum(skyRGB(-8, rising))).toBeLessThan(lum(skyRGB(3, rising)));
      expect(lum(skyRGB(3, rising))).toBeLessThan(lum(skyRGB(20, rising)));
    }
  });
});
