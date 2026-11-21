import type { Overlap } from "@/lib/board";
import { isWorking, type WorkHours } from "@/lib/hours";
import type { StripLayout } from "@/lib/strip";
import { skyRGB, sun } from "@/lib/sun";
import { HOUR, pad } from "@/lib/time";

export const STRIP_HEIGHT = 78;
const SY = 20; // sky top
const SH = 34; // sky height

export interface Palette {
  ink: string;
  muted: string;
  ground: string;
  accent: string;
  na: string;
  nb: string;
  cond: string;
}

export function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { ink: v("--ink"), muted: v("--muted"), ground: v("--ground"), accent: v("--accent"), na: v("--neutral-a"), nb: v("--neutral-b"), cond: v("--cond") };
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
  const H = STRIP_HEIGHT;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W * dpr) || cv.height !== H * dpr) {
    cv.width = Math.round(W * dpr);
    cv.height = H * dpr;
  }
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const X = (t: number) => ((t - L.t0) / HOUR) * L.pph;

  // Shared hours: a column behind everything, outlined on the sky.
  const spans = overlap.intervals.filter((iv) => iv.end > L.t0 && iv.start < L.t1).map((iv) => [Math.max(0, X(iv.start)), Math.min(W, X(iv.end))]);
  if (spans.length) {
    ctx.save();
    ctx.globalAlpha = overlap.kind === "work" ? 0.16 : 0.1;
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

  // Working hours: a bar under the sky, absent at weekends.
  ctx.fillStyle = c.ink;
  const q = 0.25 * L.pph;
  for (const k of L.marks) {
    if (isWorking(k.wall, row.hours)) {
      const x0 = Math.floor(k.x);
      const x1 = Math.ceil(k.x + q);
      ctx.fillRect(x0, SY + SH + 4, x1 - x0, 4);
    }
  }

  const every = W < 520 ? 6 : 3;
  ctx.font = `500 11px ${c.cond}`;
  ctx.fillStyle = c.muted;
  ctx.textAlign = "center";
  for (const k of L.marks) if (k.wall.minute === 0 && k.wall.hour !== 0 && k.wall.hour % every === 0) ctx.fillText(pad(k.wall.hour), k.x, H - 3);

  // Each local date is labelled where it starts; the one at the left edge stays put.
  ctx.textAlign = "left";
  ctx.font = `600 13px ${c.cond}`;
  for (const d of L.days) {
    ctx.fillStyle = c.ink;
    ctx.fillRect(Math.round(d.x) - 0.75, 3, 1.5, SY - 3);
    ctx.fillText(d.label, d.x + 6, 14);
  }
  const lw = ctx.measureText(L.edgeLabel).width;
  const lx = Math.min(4, (L.days.length ? L.days[0].x : Infinity) - lw - 14);
  if (lx + lw > 0) {
    ctx.fillStyle = c.muted;
    ctx.fillText(L.edgeLabel, lx, 14);
  }

  // The cursor, fixed at the centre.
  const cx = Math.round(W / 2);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = c.ground;
  ctx.fillRect(cx - 2.5, SY, 5, SH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.ink;
  ctx.fillRect(cx - 1, 0, 2, H - 15);
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.moveTo(cx - 6, 0);
  ctx.lineTo(cx + 6, 0);
  ctx.lineTo(cx, 7);
  ctx.closePath();
  ctx.fill();
}
