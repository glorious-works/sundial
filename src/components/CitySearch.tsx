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
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = searchCities(query);
  const open = query.trim().length > 0;
  const pick = (c: City | undefined) => {
    if (!c || isOnBoard(c.id)) return;
    onAdd(c);
    setQuery("");
    setActive(0);
  };

  let hint = "";
  if (open && isAbbreviation(query)) hint = `Zone abbreviations such as ${query.trim()} are ambiguous, so search by city or country instead.`;
  else if (open && !results.length) hint = "No city by that name in the list yet.";

  return (
    <div className="search">
      <input
        className="field"
        type="search"
        role="combobox"
        aria-label="Add a city"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && results.length ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        placeholder="Add a city, such as Tokyo"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
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
                onMouseEnter={() => setActive(i)}
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
