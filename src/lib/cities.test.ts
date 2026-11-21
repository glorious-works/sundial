import { describe, expect, it } from "vitest";
import data from "@/data/cities.json";
import { CITIES, cityForZone, isAbbreviation, searchCities } from "./cities";

describe("city list", () => {
  it("has unique, link-safe ids and zones this runtime knows", () => {
    const ids = data.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(CITIES.length).toBe(data.length);
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
