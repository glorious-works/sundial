"use client";

import { useState, useSyncExternalStore } from "react";
import { Board, type HomeInfo } from "./Board";

const noop = () => () => {};

/**
 * The page. Everything that depends on the clock, the browser's zone or the link renders only
 * after hydration, so the static HTML carries no time at all and nothing can be frozen at build.
 */
export function Sundial() {
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [today, setToday] = useState<HomeInfo | null>(null);

  // The static page ships with the slim bar, which is what returning visitors see; a first visit,
  // with only home on the board, opens it out with the lede.
  return (
    <>
      <header className={today && !today.compact ? "band" : "band compact"}>
        <div className="wrap">
          <div>
            <h1 className="mark">
              Sundial<span className="stop">.</span>
            </h1>
            <p className="lede">Every row keeps its own date, and every strip is coloured by the real sun over that city.</p>
          </div>
          <p className="today" data-testid="today">
            {today ? today.label : " "}
            <strong>{today ? today.date : " "}</strong>
          </p>
        </div>
      </header>

      <main className="wrap">
        {hydrated ? (
          <Board onHome={setToday} />
        ) : (
          <noscript>
            <p className="help pt-6">Sundial works out every time in your browser, so it needs JavaScript.</p>
          </noscript>
        )}

        <ul className="legend" aria-label="Key">
          <li>
            <i style={{ background: "#142A7A" }} />
            Night
          </li>
          <li>
            <i style={{ background: "#3A62D0" }} />
            Twilight
          </li>
          <li>
            <i style={{ background: "linear-gradient(90deg,#E0607E,#F2895A)" }} />
            Sunrise
          </li>
          <li>
            <i style={{ background: "linear-gradient(90deg,#FEC94E,#FFE3A0)" }} />
            Day
          </li>
          <li>
            <i style={{ background: "linear-gradient(90deg,#E4672E,#C83C25)" }} />
            Sunset
          </li>
          <li>
            <i className="bar" />
            Working hours, 09:00 to 17:30 weekdays unless edited
          </li>
          <li>
            <i className="both" />
            Hours every row shares, or the best hour when none are
          </li>
          <li>
            <i className="mid" />
            Local midnight
          </li>
        </ul>
        <p className="help">
          Drag or swipe any strip, scroll sideways, click a moment to centre it, or use the arrow keys: Shift moves an hour and Home comes back to now. Colours
          come from the sun&rsquo;s height over each city at that moment, so short winter days and long summer ones are both real. Your board lives in this
          page&rsquo;s link and in this browser, and nowhere else.
        </p>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <a href="https://glorious.works/colophon/">Made with AI: colophon</a>
        </div>
      </footer>
    </>
  );
}
