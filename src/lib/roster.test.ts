import { beforeEach, describe, expect, it } from "vitest";
import {
  addCity,
  decodeHash,
  defaultSettings,
  encodeHash,
  loadSettings,
  moveCity,
  removeCity,
  resolveRows,
  setHours,
  setLabel,
  writeStored,
  type Settings,
} from "./roster";

const NOV = Date.UTC(2026, 10, 21, 13, 18);

// A minimal localStorage for the node test environment.
beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
});

const board = (ids: string[], extra: Partial<Settings> = {}): Settings => ({ entries: ids.map((id) => ({ id })), labels: {}, labelsInLink: false, ...extra });
const names = (s: Settings, zone: string) => resolveRows(s, zone).map((r) => r.name + (r.home ? "*" : ""));

describe("rows", () => {
  it("default roster is in offset order, and the browser's zone is home", () => {
    const s = defaultSettings(NOV);
    expect(s.entries.map((e) => e.id)).toEqual(["new-york-us", "london-gb", "sydney-au"]);
    expect(names(s, "Europe/London")).toEqual(["London*", "New York", "Sydney"]);
    expect(names(s, "Australia/Sydney")).toEqual(["Sydney*", "New York", "London"]);
    expect(names(s, "America/Chicago")).toEqual(["Chicago*", "New York", "London", "Sydney"]);
  });

  it("a manual home overrides the browser's zone", () => {
    expect(names(board(["london-gb", "sydney-au"], { home: "sydney-au" }), "Europe/London")).toEqual(["Sydney*", "London"]);
  });

  it("makes no UTC row: a UTC-only browser takes the first city as home", () => {
    expect(names(board(["london-gb", "sydney-au"]), "UTC")).toEqual(["London*", "Sydney"]);
    expect(names(board(["london-gb", "sydney-au"]), "Etc/UTC")).toEqual(["London*", "Sydney"]);
  });

  it("names a home zone the list lacks after the zone", () => {
    const rows = resolveRows(board(["london-gb"]), "America/Indiana/Indianapolis");
    expect(rows[0]).toMatchObject({ name: "Indianapolis", home: true, lat: null, entry: null });
  });
});

describe("editing", () => {
  it("adds a city by offset, once", () => {
    let s = board(["chicago-us", "london-gb", "sydney-au"]);
    s = addCity(s, "delhi-in", NOV);
    s = addCity(s, "delhi-in", NOV);
    s = addCity(s, "los-angeles-us", NOV);
    expect(s.entries.map((e) => e.id)).toEqual(["los-angeles-us", "chicago-us", "london-gb", "delhi-in", "sydney-au"]);
  });

  it("removes, reorders, labels and sets hours", () => {
    let s = board(["london-gb", "chicago-us", "sydney-au", "delhi-in"]);
    s = moveCity(s, "sydney-au", -1, "london-gb");
    expect(s.entries.map((e) => e.id)).toEqual(["london-gb", "sydney-au", "chicago-us", "delhi-in"]);
    s = moveCity(s, "sydney-au", -1, "london-gb"); // already first below home
    expect(s.entries.map((e) => e.id)).toEqual(["london-gb", "sydney-au", "chicago-us", "delhi-in"]);
    s = removeCity(s, "delhi-in");
    s = setLabel(s, "sydney-au", "Office ");
    s = setHours(s, "chicago-us", { start: 480, end: 990 });
    s = setHours(s, "sydney-au", null);
    const rows = resolveRows(s, "Europe/London");
    expect(rows.map((r) => [r.name, r.label, r.hours])).toEqual([
      ["London", "", { start: 540, end: 1050 }],
      ["Sydney", "Office", null],
      ["Chicago", "", { start: 480, end: 990 }],
    ]);
  });
});

describe("link", () => {
  it("round-trips the roster, hours and home, and keeps labels out unless asked", () => {
    let s = board(["london-gb", "sydney-au", "chicago-us"], { home: "london-gb" });
    s = setHours(s, "chicago-us", { start: 480, end: 990 });
    s = setHours(s, "sydney-au", null);
    s = setLabel(s, "sydney-au", "Team, A&B ~ 1");
    expect(encodeHash(s)).toBe("#cities=london-gb,sydney-au@off,chicago-us@0800-1630&home=london-gb");
    const withLabels = encodeHash({ ...s, labelsInLink: true });
    expect(withLabels).toBe("#cities=london-gb,sydney-au@off~Team%2C%20A%26B%20~%201,chicago-us@0800-1630&home=london-gb");
    expect(decodeHash(withLabels)).toEqual({
      entries: [{ id: "london-gb" }, { id: "sydney-au", hours: null }, { id: "chicago-us", hours: { start: 480, end: 990 } }],
      labels: { "sydney-au": "Team, A&B ~ 1" },
      home: "london-gb",
    });
  });

  it("drops unknown or repeated cities and bad hours, and ignores a hash without a board", () => {
    expect(decodeHash("#cities=london-gb,atlantis-xx,london-gb,paris-fr@9999-0000")).toEqual({
      entries: [{ id: "london-gb" }, { id: "paris-fr" }],
      labels: {},
      home: undefined,
    });
    expect(decodeHash("")).toBeNull();
    expect(decodeHash("#top")).toBeNull();
  });

  it("prefers the link to this browser's board, filling in labels from the browser", () => {
    writeStored(board(["tokyo-jp"], { labels: { "sydney-au": "Office" } }));
    const s = loadSettings("#cities=london-gb,sydney-au", NOV);
    expect(s.entries.map((e) => e.id)).toEqual(["london-gb", "sydney-au"]);
    expect(s.labels["sydney-au"]).toBe("Office");
    expect(loadSettings("", NOV).entries.map((e) => e.id)).toEqual(["tokyo-jp"]);
  });

  it("falls back to the default board with nothing stored", () => {
    expect(loadSettings("", NOV)).toEqual(defaultSettings(NOV));
  });
});
