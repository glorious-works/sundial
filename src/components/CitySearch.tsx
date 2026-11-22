"use client";

import { useId, useState } from "react";
import { isAbbreviation, searchCities, type City } from "@/lib/cities";
import { fmtGap, offsetMin, zoneAbbr } from "@/lib/time";

interface Props {
  onAdd: (city: City) => void;
  isOnBoard: (id: string) => boolean;
  homeZone: string;
  at: number;
}

/** "Add a city": a combobox over the curated list. Abbreviations are shown in results but never matched. */
export function CitySearch({ onAdd, isOnBoard, homeZone, at }: Props) {
  const [query, setQuery] = useState("");
  // -1 means "the first city not already on the board".
  const [chosen, setChosen] = useState(-1);
  // Leaving the box puts the results away; the query stays, and they come back with focus.
  const [away, setAway] = useState(false);
  const listId = useId();
  const results = searchCities(query);
  const open = query.trim().length > 0 && !away;
  const enabled = results.map((c) => !isOnBoard(c.id));
  const active = chosen >= 0 ? chosen : enabled.indexOf(true);
  const step = (dir: 1 | -1) => {
    for (let i = active + dir; i >= 0 && i < results.length; i += dir) {
      if (enabled[i]) return setChosen(i);
    }
  };
  const pick = (c: City | undefined) => {
    if (!c || isOnBoard(c.id)) return;
    onAdd(c);
    setQuery("");
    setChosen(-1);
  };

  let hint = "";
  if (open && isAbbreviation(query)) hint = `Zone abbreviations such as ${query.trim()} are ambiguous, so search by city or country instead.`;
  else if (open && !results.length) hint = "No city by that name in the list yet. Try the nearest big city in the same time zone.";

  return (
    <div className="search">
      <input
        className="field"
        type="search"
        role="combobox"
        aria-label="Add a city"
        aria-expanded={open && results.length > 0}
        aria-controls={open && results.length > 0 ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        placeholder="Add a city, such as Tokyo"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setChosen(-1);
          setAway(false);
        }}
        onFocus={() => setAway(false)}
        onBlur={() => setAway(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            step(-1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            setQuery("");
          }
        }}
      />
      {open && results.length > 0 && (
        <ul className="results" role="listbox" id={listId} aria-label="Cities">
          {results.map((c, i) => {
            const on = isOnBoard(c.id);
            const abbr = zoneAbbr(c.zone, at, c.cc);
            return (
              <li
                key={c.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={on}
                onMouseEnter={() => on || setChosen(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
              >
                <span>
                  {c.name}, {c.country}
                </span>
                <span className="where">{on ? "On the board" : [abbr, fmtGap(offsetMin(c.zone, at) - offsetMin(homeZone, at))].filter(Boolean).join(" · ")}</span>
              </li>
            );
          })}
        </ul>
      )}
      {hint && (
        <p className="hint mt-1" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
