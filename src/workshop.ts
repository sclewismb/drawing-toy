import type { Graphics } from 'pixi.js';
import { INK, seeded } from './places';

/**
 * The teddy and squishy workshop: a cosy little shop (an original one, not a
 * real shop's look). Wide like the rooms:
 *   left:   the teddy corner: pegboard of floppy unstuffed teddies, the stuffing machine
 *   middle: display shelves of finished teddies, a big window, the maker table
 *   right:  the squishy bar: a counter, jars of squishies, the squishy machine
 *   far right: the glow stick den, a dark corner behind a curtain: a rack of
 *           glowing bracelets, the glow machine on the glow bar, a light switch
 * Everything that moves or opens the maker is in eggs/workshop.ts.
 */
export const WORKSHOP = { left: 0.6, right: 1.2, floor: 0.74 };

/** Where things are (shared with the surprises). */
export function workshopLayout(w: number, h: number) {
  const fy = h * WORKSHOP.floor;
  return {
    fy,
    pegboard: { x: -0.56 * w, y: h * 0.14, w: 0.26 * w, h: h * 0.38 },
    machine: { x: -0.16 * w, y: h * 0.36, r: Math.min(0.075 * w, h * 0.11) },
    shelves: [0.2, 0.36, 0.52].map((f) => h * f),
    shelfL: { x0: 0.03 * w, x1: 0.3 * w },
    shelfR: { x0: 0.7 * w, x1: 0.97 * w },
    window: { x: 0.37 * w, y: h * 0.1, w: 0.26 * w, h: h * 0.3 },
    table: { x0: 0.33 * w, x1: 0.67 * w, top: h * 0.6 },
    counter: { x0: 1.06 * w, x1: 1.52 * w, top: h * 0.55 },
    jars: { x0: 1.08 * w, x1: 1.5 * w, rows: [0.17, 0.33].map((f) => h * f) },
    gumball: { x: 1.36 * w, y: h * 0.42 },
    heartBox: { x: 0.79 * w, y: fy + h * 0.06 },
    glow: {
      x0: 1.62 * w,
      counter: { x0: 1.74 * w, x1: 2.12 * w, top: h * 0.56 },
      rail: { x0: 1.72 * w, x1: 2.14 * w, y: h * 0.15 },
      machine: { x: 1.98 * w, base: h * 0.56 },
      sign: { x: 1.84 * w, y: h * 0.42 },
      lightSwitch: { x: 1.66 * w, y: h * 0.42 },
    },
  };
}

export function drawWorkshop(g: Graphics, w: number, h: number) {
  const L = workshopLayout(w, h);
  const fy = L.fy;
  const x0 = -WORKSHOP.left * w, x1 = (1 + WORKSHOP.right) * w;
  const rnd = seeded(23);

  // --- walls: soft pink with little hearts and dots, bunting along the top ---
  g.rect(x0, 0, x1 - x0, fy).fill(0xfff0f5);
  for (let y = h * 0.06, row = 0; y < fy - 20; y += h * 0.09, row++) {
    for (let x = x0 + (row % 2) * 30; x < x1; x += 60) {
      if (row % 2) g.circle(x, y, 4).fill(0xffd6e5);
      else g.moveTo(x, y + 4).bezierCurveTo(x - 9, y - 2, x - 4, y - 9, x, y - 4).bezierCurveTo(x + 4, y - 9, x + 9, y - 2, x, y + 4).fill(0xffd6e5);
    }
  }
  // --- far right: the glow stick den, a dark corner with tiny stars on the walls ---
  const gd = L.glow;
  const stars = seeded(41);
  g.rect(gd.x0, 0, x1 - gd.x0, fy).fill(0x1e1b3a);
  for (let i = 0; i < 70; i++) g.circle(gd.x0 + stars() * (x1 - gd.x0), stars() * (fy - 20), 1 + stars() * 2).fill({ color: 0xffffff, alpha: 0.2 + stars() * 0.4 });
  const flags = [0xff8fab, 0xffd166, 0x9bd0ff, 0xa8e6cf, 0xc8b6ff];
  for (let x = x0, i = 0; x < x1; x += 0.2 * w, i++) {
    g.moveTo(x, h * 0.04).quadraticCurveTo(x + 0.1 * w, h * 0.09, x + 0.2 * w, h * 0.04).stroke({ width: 3, color: INK });
    for (let k = 1; k < 6; k++) {
      const t = k / 6, fx = x + 0.2 * w * t, sy = h * 0.04 + Math.sin(t * Math.PI) * h * 0.04;
      g.poly([fx - 12, sy, fx + 12, sy, fx, sy + 26]).fill(flags[(i + k) % flags.length]).stroke({ width: 2, color: INK });
    }
  }
  // skirting and a warm wooden floor
  g.rect(x0, fy - 14, x1 - x0, 14).fill(0xffffff).stroke({ width: 2, color: INK });
  g.rect(x0, fy, x1 - x0, h - fy).fill(0xdeb887);
  for (let y = fy + (h - fy) * 0.25; y < h; y += (h - fy) * 0.25) g.moveTo(x0, y).lineTo(x1, y);
  g.stroke({ width: 2, color: 0xc49a6c });
  for (let y = fy, row = 0; y < h; y += (h - fy) * 0.25, row++) {
    for (let x = x0 + (row % 2) * 80 + rnd() * 40; x < x1; x += 160) g.moveTo(x, y).lineTo(x, y + (h - fy) * 0.25);
  }
  g.stroke({ width: 2, color: 0xc49a6c });
  // a round rug by the table
  g.ellipse(0.5 * w, fy + (h - fy) * 0.55, 0.3 * w, (h - fy) * 0.32).fill(0xffc2d4).stroke({ width: 3, color: INK });
  g.ellipse(0.5 * w, fy + (h - fy) * 0.55, 0.22 * w, (h - fy) * 0.22).stroke({ width: 4, color: 0xffffff });

  // --- left: the pegboard (floppy teddies hang on it: see eggs) and the stuffing machine's stand ---
  const pb = L.pegboard;
  g.roundRect(pb.x, pb.y, pb.w, pb.h, 10).fill(0xf4d6a0).stroke({ width: 4, color: INK });
  for (let x = pb.x + 18; x < pb.x + pb.w - 8; x += 26) for (let y = pb.y + 18; y < pb.y + pb.h - 8; y += 26) g.circle(x, y, 2.5).fill(0xc9a46a);
  const m = L.machine;
  g.rect(m.x - m.r * 0.25, m.y + m.r * 0.9, m.r * 0.5, fy - m.y - m.r * 0.9).fill(0xe5383b).stroke({ width: 4, color: INK });
  g.roundRect(m.x - m.r * 0.9, fy - 14, m.r * 1.8, 22, 8).fill(0xe5383b).stroke({ width: 4, color: INK });
  // a basket of fluff beside it
  g.roundRect(m.x + m.r * 1.2, fy - h * 0.09, m.r * 1.2, h * 0.1, 10).fill(0xc68b59).stroke({ width: 3, color: INK });
  for (let i = 0; i < 5; i++) g.circle(m.x + m.r * (1.35 + i * 0.22), fy - h * 0.09, 14).fill(0xffffff).stroke({ width: 2, color: 0xcccccc });
  // thread spools on a little shelf
  g.rect(-0.3 * w, h * 0.58, 0.12 * w, 10).fill(0xc68b59).stroke({ width: 2, color: INK });
  for (const [i, col] of [0xe5383b, 0x4ea8ff, 0xffd166, 0x7bd36b].entries()) {
    const sx = -0.29 * w + i * 0.028 * w;
    g.rect(sx, h * 0.58 - 26, 18, 26).fill(col).stroke({ width: 2, color: INK });
    g.rect(sx - 3, h * 0.58 - 30, 24, 6).rect(sx - 3, h * 0.58 - 4, 24, 6).fill(0xdeb887).stroke({ width: 1.5, color: INK });
  }

  // --- middle: display shelves either side of a big window, and the maker table ---
  for (const side of [L.shelfL, L.shelfR]) {
    for (const y of L.shelves) g.rect(side.x0, y, side.x1 - side.x0, 12).fill(0xffffff).stroke({ width: 3, color: INK });
  }
  const wn = L.window;
  g.rect(wn.x, wn.y, wn.w, wn.h).fill(0xbfe8ff).stroke({ width: 8, color: 0xffffff });
  g.rect(wn.x, wn.y, wn.w, wn.h).stroke({ width: 3, color: INK });
  g.moveTo(wn.x + wn.w / 2, wn.y).lineTo(wn.x + wn.w / 2, wn.y + wn.h).moveTo(wn.x, wn.y + wn.h / 2).lineTo(wn.x + wn.w, wn.y + wn.h / 2).stroke({ width: 6, color: 0xffffff });
  g.circle(wn.x + wn.w * 0.3, wn.y + wn.h * 0.35, 18).fill(0xffffff);
  g.circle(wn.x + wn.w * 0.4, wn.y + wn.h * 0.32, 22).fill(0xffffff);
  for (const s of [-1, 1]) {
    const cx = s < 0 ? wn.x - 6 : wn.x + wn.w + 6;
    g.moveTo(cx, wn.y - 10).quadraticCurveTo(cx + s * 30, wn.y + wn.h * 0.5, cx - s * 4, wn.y + wn.h + 20).lineTo(cx + s * 36, wn.y + wn.h + 20).lineTo(cx + s * 30, wn.y - 10).closePath().fill(0xff8fab).stroke({ width: 3, color: INK });
  }
  g.rect(wn.x - 30, wn.y - 16, wn.w + 60, 10).fill(0xc68b59).stroke({ width: 2, color: INK });
  const t = L.table;
  for (const lx of [t.x0 + 20, t.x1 - 34]) g.rect(lx, t.top, 14, fy + (h - fy) * 0.3 - t.top).fill(0xa47e4b).stroke({ width: 3, color: INK });
  g.roundRect(t.x0 - 10, t.top - 16, t.x1 - t.x0 + 20, 22, 8).fill(0xc68b59).stroke({ width: 4, color: INK });
  g.roundRect(t.x0 + 20, t.top - 22, (t.x1 - t.x0) * 0.4, 8, 3).fill(0x7bd36b).stroke({ width: 2, color: INK }); // a cutting mat
  // scissors and a tape measure on the table
  g.circle(t.x1 - 70, t.top - 26, 8).circle(t.x1 - 52, t.top - 26, 8).stroke({ width: 4, color: 0xe5383b });
  g.moveTo(t.x1 - 64, t.top - 30).lineTo(t.x1 - 30, t.top - 44).moveTo(t.x1 - 58, t.top - 30).lineTo(t.x1 - 30, t.top - 34).stroke({ width: 3, color: 0x6c757d });

  // --- right: the squishy bar ---
  const ct = L.counter;
  g.rect(ct.x0, ct.top, ct.x1 - ct.x0, fy - ct.top + 6).fill(0xffffff).stroke({ width: 4, color: INK });
  for (let x = ct.x0 + 14; x < ct.x1 - 10; x += 40) g.rect(x, ct.top + 8, 20, fy - ct.top - 10).fill(0xffc2d4);
  g.roundRect(ct.x0 - 14, ct.top - 18, ct.x1 - ct.x0 + 28, 22, 8).fill(0xc8b6ff).stroke({ width: 4, color: INK });
  const j = L.jars;
  for (const y of j.rows) g.rect(j.x0, y + h * 0.1, j.x1 - j.x0, 12).fill(0xffffff).stroke({ width: 3, color: INK });
  // a striped awning over the bar
  for (let x = ct.x0 - 20, i = 0; x < ct.x1 + 20; x += 40, i++) {
    g.moveTo(x, h * 0.06).lineTo(x + 40, h * 0.06).lineTo(x + 40, h * 0.12).quadraticCurveTo(x + 20, h * 0.15, x, h * 0.12).closePath().fill(i % 2 ? 0xffffff : 0xff8fab).stroke({ width: 2, color: INK });
  }
  // --- the glow stick den: a curtain pulled back, the rail, the glow bar, a starry rug ---
  g.ellipse(1.93 * w, fy + (h - fy) * 0.55, 0.2 * w, (h - fy) * 0.3).fill(0x3a2f6b).stroke({ width: 3, color: INK });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.star(1.93 * w + Math.cos(a) * 0.13 * w, fy + (h - fy) * 0.55 + Math.sin(a) * (h - fy) * 0.18, 5, 7, 3).fill(0xffe94d);
  }
  const ct2 = gd.counter;
  g.rect(ct2.x0, ct2.top, ct2.x1 - ct2.x0, fy - ct2.top + 6).fill(0x2b2650).stroke({ width: 4, color: INK });
  const neon = [0xff4fd8, 0xffe94d, 0x3dfcff, 0x8cff4d, 0xff9f1c, 0xb45cff];
  for (let x = ct2.x0 + 18, i = 0; x < ct2.x1 - 20; x += 36, i++) g.roundRect(x, ct2.top + 14, 12, fy - ct2.top - 22, 6).fill({ color: neon[i % neon.length], alpha: 0.85 });
  g.roundRect(ct2.x0 - 14, ct2.top - 18, ct2.x1 - ct2.x0 + 28, 22, 8).fill(0x8a5cf6).stroke({ width: 4, color: INK });
  const rl = gd.rail;
  g.rect(rl.x0, rl.y - 4, rl.x1 - rl.x0, 8).fill(0xced4da).stroke({ width: 2.5, color: INK });
  for (const x of [rl.x0, rl.x1]) g.rect(x - 5, rl.y - 4, 10, 26).fill(0xadb5bd).stroke({ width: 2.5, color: INK });
  // the curtain, pulled back to the side
  const cx0 = gd.x0 - 0.03 * w, cw = 0.07 * w;
  g.moveTo(cx0, 0).lineTo(cx0 + cw, 0).quadraticCurveTo(cx0 + cw * 0.35, fy * 0.45, cx0 + cw * 0.75, fy).lineTo(cx0, fy).closePath().fill(0x7b2cbf).stroke({ width: 3, color: INK });
  for (const k of [0.3, 0.55]) g.moveTo(cx0 + cw * k, 6).quadraticCurveTo(cx0 + cw * k * 0.5, fy * 0.5, cx0 + cw * k * 0.9, fy - 4).stroke({ width: 2.5, color: 0x5a189a });
  g.roundRect(cx0 + cw * 0.15, fy * 0.47, cw * 0.55, 14, 7).fill(0xffd166).stroke({ width: 2.5, color: INK }); // its tie-back
  g.rect(gd.x0 - 0.04 * w, 0, x1 - gd.x0 + 0.04 * w, 12).fill(0x5a189a).stroke({ width: 2.5, color: INK }); // the curtain rail

  // the heart box on the floor (opens: see eggs)
  const hb = L.heartBox;
  g.roundRect(hb.x - 40, hb.y - 34, 80, 40, 8).fill(0xff4d6d).stroke({ width: 3, color: INK });
}
