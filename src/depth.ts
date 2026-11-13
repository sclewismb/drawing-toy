import type { Graphics } from 'pixi.js';
import { seeded } from './places';

/**
 * Helpers for making outdoor places feel deep: far things are paler and
 * hazier (mixed with the sky's colour), things standing on the ground cast
 * soft shadows, and leafy plants at the very front frame the view.
 *
 * Far scenery can go on a wide room's `far` layer (see wideRooms.ts), which
 * slides slower than the rest of the room as you pan: that's the parallax.
 */

/** Mix two colours: t = 0 gives a, t = 1 gives b. */
export function mix(a: number, b: number, t: number) {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** A colour seen far away: faded towards the sky. */
export const haze = (color: number, sky: number, amount: number) => mix(color, sky, amount);

/** A soft shadow on the ground (a few faint ellipses, darkest in the middle). */
export function softShadow(g: Graphics, x: number, y: number, rx: number, ry: number, strength = 1) {
  for (let i = 4; i >= 1; i--) g.ellipse(x, y, (rx * (3 + i)) / 7, (ry * (3 + i)) / 7).fill({ color: 0x000000, alpha: 0.045 * strength });
}

/**
 * A wavy ridge of hills from x0 to x1, filled down to `bottom`. `top` is the
 * highest the hills reach, `low` the lowest dip.
 */
export function ridge(g: Graphics, x0: number, x1: number, top: number, low: number, bottom: number, color: number, seed = 1, step = 260) {
  const rnd = seeded(seed);
  g.moveTo(x0, low);
  let x = x0;
  let y = low;
  while (x < x1) {
    const nx = Math.min(x1, x + step * (0.7 + rnd() * 0.6));
    const ny = top + (low - top) * rnd();
    g.quadraticCurveTo((x + nx) / 2, Math.min(y, ny) - (low - top) * 0.35, nx, ny);
    x = nx;
    y = ny;
  }
  g.lineTo(x1, bottom).lineTo(x0, bottom).closePath().fill(color);
}

/** A row of soft round far-away trees along a line (a tree line on the hills). */
export function treeLine(g: Graphics, x0: number, x1: number, y: number, r: number, color: number, seed = 2) {
  const rnd = seeded(seed);
  for (let x = x0; x < x1; x += r * (1.1 + rnd() * 1.4)) {
    const rr = r * (0.7 + rnd() * 0.6);
    g.circle(x, y - rr * 0.6, rr).fill(color);
  }
  g.rect(x0, y - r * 0.4, x1 - x0, r * 0.4).fill(color);
}

/** A flat-topped far-away tree (an acacia), drawn as a silhouette. */
export function acacia(g: Graphics, x: number, y: number, size: number, color: number) {
  g.moveTo(x, y).lineTo(x - size * 0.05, y - size * 0.5).lineTo(x - size * 0.3, y - size * 0.7).stroke({ width: size * 0.06, color, cap: 'round' });
  g.moveTo(x - size * 0.05, y - size * 0.5).lineTo(x + size * 0.25, y - size * 0.75).stroke({ width: size * 0.06, color, cap: 'round' });
  g.ellipse(x - size * 0.05, y - size * 0.8, size * 0.5, size * 0.13).fill(color);
}

/**
 * A big leafy plant at the very front (drawn round the bottom of its stems
 * at (x, y), leaning `lean` = -1 left .. 1 right). Leaves are long ovals.
 */
export function frontLeaves(g: Graphics, x: number, y: number, size: number, colors: [number, number], lean = 0, ink = 0x3a3a3a) {
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + (i / (leaves - 1) - 0.5) * 2.2 + lean * 0.35;
    const len = size * (0.6 + 0.4 * Math.sin((i / (leaves - 1)) * Math.PI));
    const cx = x + Math.cos(a) * len * 0.5;
    const cy = y + Math.sin(a) * len * 0.5;
    const color = i % 2 ? colors[0] : colors[1];
    // a leaf: an ellipse turned along its angle, with a midrib
    const pts: number[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      const lx = Math.cos(t) * len * 0.5;
      const ly = Math.sin(t) * len * 0.13;
      pts.push(cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a));
    }
    g.poly(pts).fill(color).stroke({ width: 3, color: ink });
    g.moveTo(x, y).lineTo(x + Math.cos(a) * len * 0.92, y + Math.sin(a) * len * 0.92).stroke({ width: 2, color: ink, alpha: 0.5 });
  }
}

// --- Indoors ---------------------------------------------------------------

/**
 * Soft shading that makes a room feel like a room: a shadow under the
 * ceiling, a dark line where the wall meets the floor, the floor a little
 * darker close to the wall and again right at the front.
 */
export function roomShade(g: Graphics, x0: number, x1: number, h: number, fy: number) {
  const W = x1 - x0;
  for (let i = 1; i <= 5; i++) g.rect(x0, 0, W, h * 0.018 * i).fill({ color: 0x000000, alpha: 0.016 });
  for (let i = 1; i <= 4; i++) g.rect(x0, fy - 8 - i * 7, W, i * 7).fill({ color: 0x000000, alpha: 0.012 });
  for (let i = 1; i <= 4; i++) g.rect(x0, fy + 8, W, i * 9).fill({ color: 0x000000, alpha: 0.02 });
  for (let i = 1; i <= 4; i++) g.rect(x0, h - i * h * 0.03, W, i * h * 0.03).fill({ color: 0x000000, alpha: 0.012 });
}

/** A round ceiling light, and the soft pool of light it throws on the wall. */
export function ceilingLight(g: Graphics, x: number, h: number, ink = 0x3a3a3a, color = 0xfff3c4) {
  for (let i = 5; i >= 1; i--) g.ellipse(x, h * 0.04, h * 0.05 * i, h * 0.06 * i).fill({ color, alpha: 0.05 });
  g.rect(x - 2, 0, 4, h * 0.025).fill(ink);
  g.moveTo(x - h * 0.04, h * 0.05).arc(x, h * 0.05, h * 0.04, Math.PI, 0).closePath().fill(0xffffff).stroke({ width: 3, color: ink });
  g.ellipse(x, h * 0.05, h * 0.04, 4).fill(color).stroke({ width: 2, color: ink });
}

/**
 * An open doorway into a room further back: its walls are paler and greyer
 * (further away), with a window and a lamp of its own.
 */
export function doorway(g: Graphics, x: number, top: number, dw: number, fy: number, wall: number, floor: number, ink = 0x3a3a3a) {
  const far = (c: number) => mix(c, 0xdfe6ee, 0.35);
  g.rect(x, top, dw, fy - top).fill(far(mix(wall, 0x000000, 0.08)));
  const bfy = top + (fy - top) * 0.78; // the far room's floor line
  g.poly([x, bfy, x + dw, bfy, x + dw, fy, x, fy]).fill(far(mix(floor, 0x000000, 0.1)));
  g.rect(x, bfy - 3, dw, 5).fill(far(0xffffff));
  // a little window in the far wall, and a lamp
  const ww = dw * 0.36, wh = (bfy - top) * 0.3;
  g.rect(x + dw * 0.52, top + (bfy - top) * 0.22, ww, wh).fill(far(0xbfe8ff)).stroke({ width: 2, color: far(ink) });
  g.moveTo(x + dw * 0.52 + ww / 2, top + (bfy - top) * 0.22).lineTo(x + dw * 0.52 + ww / 2, top + (bfy - top) * 0.22 + wh).stroke({ width: 2, color: far(ink) });
  g.rect(x + dw * 0.15, bfy - (bfy - top) * 0.32, dw * 0.22, (bfy - top) * 0.32).fill(far(0xc68b59)).stroke({ width: 2, color: far(ink) });
  for (let i = 4; i >= 1; i--) g.ellipse(x + dw * 0.26, bfy - (bfy - top) * 0.45, dw * 0.04 * i, dw * 0.04 * i).fill({ color: 0xfff3c4, alpha: 0.08 });
  g.circle(x + dw * 0.26, bfy - (bfy - top) * 0.45, dw * 0.05).fill(far(0xffd166)).stroke({ width: 2, color: far(ink) });
  // the shadowy inside edge (the wall's thickness) and the door frame
  g.poly([x, top, x + dw * 0.08, top + dw * 0.06, x + dw * 0.08, fy, x, fy]).fill({ color: 0x000000, alpha: 0.12 });
  g.rect(x - 10, top - 10, dw + 20, 12).rect(x - 10, top, 12, fy - top).rect(x + dw - 2, top, 12, fy - top).fill(0xffffff).stroke({ width: 3, color: ink });
}

/** A rug on the floor, seen at a slant (wider at the front). */
export function rug(g: Graphics, cx: number, y: number, rw: number, rh: number, color: number, border: number, ink = 0x3a3a3a) {
  const pts = (k: number) => [cx - rw * 0.42 * k, y - rh / 2 * k, cx + rw * 0.42 * k, y - rh / 2 * k, cx + rw / 2 * k, y + rh / 2 * k, cx - rw / 2 * k, y + rh / 2 * k];
  g.poly(pts(1)).fill(border).stroke({ width: 3, color: ink });
  g.poly(pts(0.8)).fill(color);
  g.poly(pts(0.45)).stroke({ width: 3, color: border });
}

/** A potted plant (for the front corners), drawn round the bottom of its pot. */
export function pottedPlant(g: Graphics, x: number, y: number, size: number, pot: number, ink = 0x3a3a3a) {
  frontLeaves(g, x, y - size * 0.32, size * 0.9, [0x2d6a4f, 0x52b788], 0, ink);
  g.poly([x - size * 0.22, y - size * 0.36, x + size * 0.22, y - size * 0.36, x + size * 0.17, y, x - size * 0.17, y]).fill(pot).stroke({ width: 3, color: ink });
  g.rect(x - size * 0.25, y - size * 0.4, size * 0.5, size * 0.07).fill(mix(pot, 0x000000, 0.15)).stroke({ width: 3, color: ink });
}
