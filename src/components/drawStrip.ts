import type { Overlap } from "@/lib/board";
import { isWorking, type WorkHours } from "@/lib/hours";
import type { StripLayout } from "@/lib/strip";
import { skyRGB, sun } from "@/lib/sun";
import { HOUR, pad } from "@/lib/time";

/** Strip geometry by canvas height: 78px from 641px wide, 64px on phones (see globals.css). */
function geometry(H: number) {
  return H < 70 ? { SY: 18, SH: 26, gap: 3, tick: 10 } : { SY: 20, SH: 34, gap: 4, tick: 11 };
}

export interface Palette {
  ink: string;
  muted: string;
  ground: string;
  accent: string;
  na: string;
  nb: string;
  cond: string;
  /** A hairline round the sky, so night strips keep their edge on a dark ground; transparent in light. */
  edge: string;
}

export function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { ink: v("--ink"), muted: v("--muted"), ground: v("--ground"), accent: v("--accent"), na: v("--neutral-a"), nb: v("--neutral-b"), cond: v("--cond"), edge: v("--strip-edge") };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface StripRow {
  lat: number | null;
  lon: number | null;
  hours: WorkHours | null;
}

/** Draws one row's strip: sky, midnights and day labels, working bar, hour ticks, overlap, cursor. */
export function drawStrip(cv: HTMLCanvasElement, L: StripLayout, row: StripRow, c: Palette, overlap: Overlap) {
  const W = L.width;
  const H = Math.round(cv.clientHeight) || 78;
  const { SY, SH, gap, tick } = geometry(H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Whole backing pixels: at 125% a 78px strip is 97.5, which the canvas would store as 97 and
  // then reallocate on every frame for not matching.
  const BW = Math.round(W * dpr);
  const BH = Math.round(H * dpr);
  if (cv.width !== BW || cv.height !== BH) {
    cv.width = BW;
    cv.height = BH;
  }
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(BW / W, 0, 0, BH / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const X = (t: number) => ((t - L.t0) / HOUR) * L.pph;

  // Shared hours: a column behind everything, outlined on the sky.
  const spans = overlap.intervals.filter((iv) => iv.end > L.t0 && iv.start < L.t1).map((iv) => [Math.max(0, X(iv.start)), Math.min(W, X(iv.end))]);
  if (spans.length) {
    ctx.save();
    ctx.globalAlpha = overlap.kind === "work" ? 0.16 : overlap.kind === "waking" ? 0.1 : 0.07;
    ctx.fillStyle = c.accent;
    for (const [a, b] of spans) ctx.fillRect(a, 0, b - a, H);
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, 0, SY, W, SH, 7);
  ctx.clip();
  if (row.lat == null || row.lon == null) {
    for (let t = Math.floor(L.t0 / (3 * HOUR)) * 3 * HOUR; t < L.t1; t += 3 * HOUR) {
      ctx.fillStyle = Math.floor(t / (3 * HOUR)) % 2 ? c.na : c.nb;
      ctx.fillRect(Math.floor(X(t)), SY, Math.ceil(3 * L.pph) + 1, SH);
    }
  } else {
    const step = 2;
    for (let x = 0; x < W; x += step) {
      const s = sun(L.t0 + ((x + step / 2) / L.pph) * HOUR, row.lat, row.lon);
      const k = skyRGB(s.alt, s.rising);
      ctx.fillStyle = `rgb(${k[0]},${k[1]},${k[2]})`;
      ctx.fillRect(x, SY, step + 0.5, SH);
    }
  }
  ctx.fillStyle = row.lat == null ? c.ink : "rgba(255,248,231,0.8)";
  for (const d of L.days) ctx.fillRect(Math.round(d.x) - 0.75, SY, 1.5, SH);
  if (spans.length) {
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash(overlap.kind === "work" ? [] : [4, 3]);
    for (const [a, b] of spans) ctx.strokeRect(a + 1, SY + 1, b - a - 2, SH - 2);
    ctx.setLineDash([]);
  }
  ctx.restore();
  if (c.edge && c.edge !== "transparent") {
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, SY + 0.5, W - 1, SH - 1, 6.5);
    ctx.stroke();
  }

  // Working hours: a bar under the sky, absent at weekends.
  ctx.fillStyle = c.ink;
  const q = 0.25 * L.pph;
  for (const k of L.marks) {
    if (isWorking(k.wall, row.hours)) {
      const x0 = Math.floor(k.x);
      const x1 = Math.ceil(k.x + q);
      ctx.fillRect(x0, SY + SH + gap, x1 - x0, gap);
    }
  }

  const cx = Math.round(W / 2);
  const every = W < 520 ? 6 : 3;
  ctx.font = `500 ${tick}px ${c.cond}`;
  ctx.fillStyle = c.muted;
  ctx.textAlign = "center";
  for (const k of L.marks) {
    if (k.wall.minute !== 0 || k.wall.hour === 0 || k.wall.hour % every !== 0) continue;
    if (k.x < 10 || k.x > W - 10 || Math.abs(k.x - cx) < 9) continue; // clear of the edges and the cursor
    ctx.fillText(pad(k.wall.hour), k.x, H - 3);
  }

  // Each local date is labelled where it starts, beside its midnight line. A label that would run
  // under the cursor or off the right edge goes on the other side of its line; the date at the
  // left edge stays put until the next one pushes it out.
  ctx.font = `600 13px ${c.cond}`;
  ctx.textAlign = "left"; // here, not in the loop: a strip with no midnight still draws its edge label
  let firstLeft = Infinity;
  for (const d of L.days) {
    const w = ctx.measureText(d.label).width;
    const hits = (x: number) => x < cx + 9 && x + w > cx - 9;
    let x = d.x + 6;
    if ((hits(x) || x + w > W - 2) && d.x - 6 - w >= 0) x = d.x - 6 - w;
    if (hits(x)) x = cx + 10; // a midnight right at the cursor: its label goes just past it
    ctx.fillStyle = c.ink;
    ctx.fillRect(Math.round(d.x) - 0.75, 3, 1.5, SY - 3);
    ctx.fillText(d.label, x, 14);
    firstLeft = Math.min(firstLeft, Math.min(x, d.x));
  }
  const lw = ctx.measureText(L.edgeLabel).width;
  const lx = Math.min(4, firstLeft - lw - 10);
  if (lx >= 0 && !(lx < cx + 9 && lx + lw > cx - 9)) {
    ctx.fillStyle = c.muted;
    ctx.fillText(L.edgeLabel, lx, 14);
  }

  // The cursor, fixed at the centre.
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = c.ground;
  ctx.fillRect(cx - 2.5, SY, 5, SH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.ink;
  ctx.fillRect(cx - 1, 0, 2, SY + SH + 2 * gap + 1);
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.moveTo(cx - 6, 0);
  ctx.lineTo(cx + 6, 0);
  ctx.lineTo(cx, 7);
  ctx.closePath();
  ctx.fill();
}
