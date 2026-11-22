import { describe, expect, it } from "vitest";
import data from "@/data/cities.json";
import { CITIES, cityForZone, isAbbreviation, searchCities } from "./cities";
import { canonicalZone } from "./time";

describe("city list", () => {
  it("has unique, link-safe ids and zones this runtime knows", () => {
    const ids = data.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(CITIES.length).toBe(data.length);
  });

  it("knows every city's zone by whatever name this runtime reports for it", () => {
    // V8 says Asia/Calcutta for Asia/Kolkata; a browser in that zone must still find its city.
    for (const c of CITIES) {
      const reported = new Intl.DateTimeFormat("en-US", { timeZone: c.zone }).resolvedOptions().timeZone;
      expect(canonicalZone(reported), `${c.zone} reported as ${reported}`).toBe(c.zone);
    }
  });

  it("has plausible coordinates", () => {
    for (const c of CITIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
  });
});

describe("city search", () => {
  it("finds by name, other name, country and zone, ignoring accents", () => {
    expect(searchCities("syd")[0].id).toBe("sydney-au");
    expect(searchCities("bombay")[0].id).toBe("mumbai-in");
    expect(searchCities("sao paulo")[0].id).toBe("sao-paulo-br");
    expect(searchCities("Europe/London").map((c) => c.id)).toContain("london-gb");
    expect(searchCities("japan").map((c) => c.id)).toEqual(["osaka-jp", "tokyo-jp"]);
  });

  it("finds a country by any of its words or its short name, and a city by several words", () => {
    const countries = (q: string) => [...new Set(searchCities(q).map((c) => c.cc))];
    expect(countries("zealand")).toEqual(["NZ"]);
    expect(countries("kingdom")).toEqual(["GB"]);
    // Ukraine starts with "uk" too, so it is found, but after the country called UK.
    expect(countries("UK")).toEqual(["GB", "UA"]);
    expect(countries("USA")).toEqual(["US"]);
    expect(countries("uae")).toEqual(["AE"]);
    expect(searchCities("UK").map((c) => c.id)).toContain("london-gb");
    expect(searchCities("London UK")[0].id).toBe("london-gb");
    expect(searchCities("new york usa")[0].id).toBe("new-york-us");
    expect(searchCities("sydney australia").map((c) => c.id)).toEqual(["sydney-au"]);
    expect(searchCities("london japan")).toEqual([]);
  });

  it("never accepts zone abbreviations, which are ambiguous", () => {
    for (const abbr of ["AEDT", "AEST", "CST", "IST", "BST", "EST", "PST", "GMT", "UTC"]) {
      expect(isAbbreviation(abbr), abbr).toBe(true);
      expect(searchCities(abbr), abbr).toEqual([]);
    }
    // Typed in lower case, the same letters are the start of a name.
    expect(searchCities("ist")[0].id).toBe("istanbul-tr");
  });

  it("maps a zone to the city it is named after", () => {
    expect(cityForZone("America/Chicago")?.name).toBe("Chicago");
    expect(cityForZone("Asia/Kolkata")?.name).toBe("Kolkata");
    expect(cityForZone("Etc/UTC")).toBeUndefined();
  });
});
