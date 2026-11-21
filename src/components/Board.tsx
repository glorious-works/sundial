"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { copyLine, findOverlap, gapNote, intervalText, type Overlap } from "@/lib/board";
import { hhmmColon, isWorking, parseHHMM, workStatus, DEFAULT_HOURS } from "@/lib/hours";
import { addCity, encodeHash, loadSettings, moveCity, removeCity, resolveRows, setHours, setLabel, writeStored, type Row, type Settings } from "@/lib/roster";
import { stripLayout, visibleHours, type StripLayout } from "@/lib/strip";
import { rgbCss, skyRGB, skyState, sun } from "@/lib/sun";
import { dayBounds, dayDiff, dayLabel, fmtDayDiff, fmtGap, hhmm, HOUR, longDayLabel, MIN, nextGapChange, offsetMin, Q, wallOf } from "@/lib/time";
import { CitySearch } from "./CitySearch";
import { drawStrip, readPalette } from "./drawStrip";

const snap = (t: number) => Math.round(t / Q) * Q;

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The clock, ticking on each minute boundary and when the tab comes back into view. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, MIN - (Date.now() % MIN) + 50);
    };
    timer = window.setTimeout(tick, MIN - (Date.now() % MIN) + 50);
    const onVisible = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}

/** Redraw when the theme or the fonts change. */
function useRepaintSignal(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const bump = () => setN((x) => x + 1);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(bump);
    return () => {
      mq.removeEventListener("change", bump);
      mo.disconnect();
    };
  }, []);
  return n;
}

export function Board({ onHome }: { onHome: (text: { label: string; date: string }) => void }) {
  const [zone] = useState(browserZone);
  const [settings, setSettings] = useState<Settings>(() => loadSettings(location.hash, Date.now()));
  const now = useNow();
  const repaint = useRepaintSignal();
  const [manual, setManual] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const live = manual === null;
  const cursor = manual ?? now;
  const rows = useMemo(() => resolveRows(settings, zone), [settings, zone]);
  const home = rows[0];

  const boardRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLOutputElement>(null);
  const canvases = useRef(new Map<string, HTMLCanvasElement>());
  const drag = useRef<{ id: number; x: number; moved: number; cv: HTMLCanvasElement } | null>(null);

  // ---------- Persistence: the link and this browser ----------
  useEffect(() => {
    writeStored(settings);
    const h = encodeHash(settings);
    if (location.hash !== h) history.replaceState(null, "", h);
  }, [settings]);
  useEffect(() => {
    const onHash = () => setSettings(loadSettings(location.hash, Date.now()));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // ---------- Size ----------
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cv = el.querySelector("canvas.strip");
      setWidth(cv ? Math.round(cv.clientWidth) : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------- What every row shows ----------
  const layouts: (StripLayout | null)[] = useMemo(() => rows.map((r) => (width > 0 ? stripLayout(r.zone, cursor, width) : null)), [rows, cursor, width]);
  const visibleOverlap: Overlap = useMemo(() => {
    const L = layouts[0];
    if (!L || rows.length < 2) return { kind: "none", intervals: [] };
    return findOverlap(rows, L.t0, L.t1);
  }, [layouts, rows]);
  const dayOverlap = useMemo(() => {
    if (rows.length < 2) return null;
    const { start, end } = dayBounds(home.zone, cursor);
    return { day: dayLabel(wallOf(home.zone, cursor)), ...findOverlap(rows, start, end) };
  }, [rows, home, cursor]);
  const line = useMemo(() => copyLine(rows, cursor), [rows, cursor]);

  useEffect(() => {
    const w = wallOf(home.zone, now);
    onHome({ label: `Today in ${home.name}`, date: longDayLabel(w) });
  }, [home, now, onHome]);

  // Gap changes within four weeks of the cursor, worked out once the cursor settles.
  useEffect(() => {
    const t = setTimeout(() => {
      const next: Record<string, string> = {};
      for (const r of rows.slice(1)) {
        const ch = nextGapChange(r.zone, home.zone, cursor);
        if (ch) next[r.key] = gapNote(ch, home);
      }
      setNotes(next);
    }, 180);
    return () => clearTimeout(t);
  }, [rows, home, cursor]);

  // ---------- Drawing ----------
  useLayoutEffect(() => {
    if (!width) return;
    const palette = readPalette();
    rows.forEach((r, i) => {
      const cv = canvases.current.get(r.key);
      const L = layouts[i];
      if (cv && L) drawStrip(cv, L, r, palette, visibleOverlap);
    });
  }, [rows, layouts, visibleOverlap, width, repaint]);

  // ---------- Moving time ----------
  const moveTo = useCallback((t: number) => setManual(t), []);
  const goLive = useCallback(() => setManual(null), []);
  const pph = width ? width / visibleHours(width) : 1;

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target as Element).closest?.("canvas.strip")) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal && !e.shiftKey) return;
      e.preventDefault();
      const d = horizontal ? e.deltaX : e.deltaY;
      setManual((m) => (m ?? Date.now()) + (d / pph) * HOUR);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [pph]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = { id: e.pointerId, x: e.clientX, moved: 0, cv: e.currentTarget };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    d.moved += Math.abs(dx);
    if (d.moved < 4) return;
    setManual((m) => (m ?? cursor) - (dx / pph) * HOUR);
  };
  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.cv.style.cursor = "";
    if (d.moved < 4 && e.type === "pointerup") {
      const rect = d.cv.getBoundingClientRect();
      moveTo(snap(cursor + ((e.clientX - rect.left - rect.width / 2) / pph) * HOUR));
    } else if (!live) moveTo(snap(cursor));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as Element).closest("input, button, select, textarea")) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.shiftKey ? HOUR : Q;
      moveTo(snap(cursor) + (e.key === "ArrowRight" ? step : -step));
    } else if (e.key === "Home") {
      e.preventDefault();
      goLive();
    }
  };

  // ---------- Copy ----------
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  const copy = () => {
    const select = () => {
      const el = lineRef.current;
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      setToast("Selected. Copy it with your keyboard.");
    };
    try {
      navigator.clipboard.writeText(line).then(() => setToast("Copied"), select);
    } catch {
      select();
    }
  };

  const update = (f: (s: Settings) => Settings) => setSettings((s) => f(s));
  const homeEntryId = home.entry?.id ?? null;
  const others = rows.slice(1);

  return (
    <>
      <div className="controls">
        <button className={`btn${live ? " solid" : ""}`} type="button" onClick={goLive} data-testid="live">
          {live && <span className="dot" />}
          <span>{live ? "Live" : "Back to now"}</span>
        </button>
        <button className="btn" type="button" aria-label="Back one hour" onClick={() => moveTo(snap(cursor) - HOUR)}>
          &minus;1h
        </button>
        <button className="btn" type="button" aria-label="Forward one hour" onClick={() => moveTo(snap(cursor) + HOUR)}>
          +1h
        </button>
        <span className="spacer" />
        <button className={`btn${editing ? " solid" : ""}`} type="button" aria-pressed={editing} onClick={() => setEditing((x) => !x)}>
          {editing ? "Done" : "Edit board"}
        </button>
      </div>

      <div className="summary">
        <output ref={lineRef} data-testid="copy-line">
          {line}
        </output>
        <button className="btn" type="button" onClick={copy}>
          Copy
        </button>
      </div>
      <p className="overlap" data-testid="overlap">
        {dayOverlap ? <OverlapText o={dayOverlap} rows={rows} /> : "Add a city to see the hours you share."}
      </p>

      {editing && (
        <div className="editbar">
          <CitySearch
            homeZone={home.zone}
            at={cursor}
            isOnBoard={(id) => settings.entries.some((e) => e.id === id)}
            onAdd={(c) => update((s) => addCity(s, c.id, cursor))}
          />
          <label className="hint inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.labelsInLink} onChange={(e) => update((s) => ({ ...s, labelsInLink: e.target.checked }))} />
            Put personal labels in the link
          </label>
          {settings.home && (
            <button className="btn small" type="button" onClick={() => update((s) => ({ ...s, home: undefined }))}>
              Make this device&rsquo;s zone home
            </button>
          )}
        </div>
      )}

      <section className="board" ref={boardRef} tabIndex={0} onKeyDown={onKeyDown} aria-label="Time zone board. Drag a strip or use the arrow keys to move the time.">
        {rows.map((r, i) => (
          <RowView
            key={r.key}
            row={r}
            home={home}
            cursor={cursor}
            layout={layouts[i]}
            note={notes[r.key]}
            canvasRef={(el) => {
              if (el) canvases.current.set(r.key, el);
              else canvases.current.delete(r.key);
            }}
            pointer={{ onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }}
            edit={
              editing && r.entry ? (
                <RowEditor
                  row={r}
                  first={i <= 1 || r.home}
                  last={i === rows.length - 1 || r.home}
                  onLabel={(v) => update((s) => setLabel(s, r.key, v))}
                  onHours={(h) => update((s) => setHours(s, r.key, h))}
                  onMove={(dir) => update((s) => moveCity(s, r.key, dir, homeEntryId))}
                  onHome={() => update((s) => ({ ...s, home: r.key }))}
                  onRemove={() => update((s) => removeCity(s, r.key))}
                />
              ) : editing && !r.entry ? (
                <div className="edit">
                  <span className="hint">This device&rsquo;s zone. Add {r.name} as a city to label it or change its hours.</span>
                </div>
              ) : null
            }
          />
        ))}
      </section>
      {others.length === 0 && <p className="hint pt-3">Only home is on the board. Edit the board to add cities.</p>}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function OverlapText({ o, rows }: { o: Overlap & { day: string }; rows: Row[] }) {
  const describe = () =>
    o.intervals
      .map((iv) => {
        const homeWall = wallOf(rows[0].zone, iv.start);
        return rows.map((r) => intervalText(iv, r, homeWall)).join(" / ");
      })
      .join("; ");
  if (o.kind === "work")
    return (
      <>
        <strong>Shared working hours</strong> on {o.day}: {describe()}
      </>
    );
  if (o.kind === "waking")
    return (
      <>
        <strong>No shared working hours</strong> on {o.day}. Shared waking hours, 07:00 to 22:00: {describe()}
      </>
    );
  return (
    <>
      <strong>No shared working or waking hours</strong> on {o.day}.
    </>
  );
}

interface RowViewProps {
  row: Row;
  home: Row;
  cursor: number;
  layout: StripLayout | null;
  note?: string;
  canvasRef: (el: HTMLCanvasElement | null) => void;
  pointer: Pick<React.DOMAttributes<HTMLCanvasElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;
  edit: React.ReactNode;
}

function RowView({ row: r, home, cursor, layout, note, canvasRef, pointer, edit }: RowViewProps) {
  const w = wallOf(r.zone, cursor);
  const hw = wallOf(home.zone, cursor);
  const diff = dayDiff(hw, w);
  const gap = offsetMin(r.zone, cursor) - offsetMin(home.zone, cursor);
  const s = r.lat != null && r.lon != null ? sun(cursor, r.lat, r.lon) : null;
  const working = isWorking(w, r.hours);
  return (
    <div className={`row${r.home ? " is-home" : ""}`} data-testid="row" data-zone={r.zone} data-name={r.name} data-home={r.home || undefined}>
      <div className="label">
        <div className="city">
          <span className="name">{r.name}</span>
          {r.label && <span className="personal">{r.label}</span>}
          <span className="badge" data-testid="badge">
            {r.home ? "Home" : fmtGap(gap)}
          </span>
        </div>
        <div className="time" data-testid="time">
          {hhmm(w)}
        </div>
        <div className="meta">
          <div className="date" data-testid="date">
            <span>{dayLabel(w)}</span>
            {!r.home && diff !== 0 && <span className="rel">{fmtDayDiff(diff)}</span>}
          </div>
          <div className="state" data-testid="state">
            <i className="sw" style={{ background: s ? rgbCss(skyRGB(s.alt, s.rising)) : "var(--neutral-a)" }} />
            <span>
              {s ? skyState(s.alt, s.rising) : "Sky unknown"} · {r.hours ? workStatus(w, r.hours) : w.weekday === 0 || w.weekday === 6 ? "weekend" : "no working hours"}
            </span>
          </div>
        </div>
        {note && (
          <div className="gapnote" data-testid="gapnote">
            {note}
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="strip"
        aria-hidden="true"
        data-cursor-day={layout?.cursorDay.label}
        data-cursor-day-hours={layout?.cursorDay.hours}
        data-working={working ? "yes" : "no"}
        {...pointer}
      />
      {edit}
    </div>
  );
}

interface RowEditorProps {
  row: Row;
  first: boolean;
  last: boolean;
  onLabel: (v: string) => void;
  onHours: (h: { start: number; end: number } | null | undefined) => void;
  onMove: (dir: -1 | 1) => void;
  onHome: () => void;
  onRemove: () => void;
}

function RowEditor({ row: r, first, last, onLabel, onHours, onMove, onHome, onRemove }: RowEditorProps) {
  const hours = r.hours ?? DEFAULT_HOURS;
  const setTime = (which: "start" | "end", v: string) => {
    const m = parseHHMM(v);
    if (m === null) return;
    const next = { ...hours, [which]: m };
    if (next.start !== next.end) onHours(next.start === DEFAULT_HOURS.start && next.end === DEFAULT_HOURS.end ? undefined : next);
  };
  return (
    <div className="edit" data-testid="row-editor">
      <label>
        Label
        <input className="field w-40" type="text" maxLength={40} placeholder="such as Office" value={r.label} aria-label={`Label for ${r.name}`} onChange={(e) => onLabel(e.target.value)} />
      </label>
      <label>
        Working hours
        <input className="field" type="time" step={900} value={hhmmColon(hours.start)} disabled={!r.hours} aria-label={`${r.name} working hours start`} onChange={(e) => setTime("start", e.target.value)} />
        to
        <input className="field" type="time" step={900} value={hhmmColon(hours.end)} disabled={!r.hours} aria-label={`${r.name} working hours end`} onChange={(e) => setTime("end", e.target.value)} />
      </label>
      <label>
        <input type="checkbox" checked={!r.hours} onChange={(e) => onHours(e.target.checked ? null : undefined)} />
        None
      </label>
      <span className="spacer" />
      {!r.home && (
        <>
          <button className="btn small" type="button" disabled={first} aria-label={`Move ${r.name} up`} onClick={() => onMove(-1)}>
            Up
          </button>
          <button className="btn small" type="button" disabled={last} aria-label={`Move ${r.name} down`} onClick={() => onMove(1)}>
            Down
          </button>
          <button className="btn small" type="button" onClick={onHome}>
            Make home
          </button>
        </>
      )}
      <button className="btn small" type="button" aria-label={`Remove ${r.name}`} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
