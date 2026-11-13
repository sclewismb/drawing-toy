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
