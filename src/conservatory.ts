import type { Graphics } from 'pixi.js';
import { INK, seeded } from './places';
import { PALETTE, type Season } from './seasons';
import type { SkyDef } from './sky';

/**
 * The butterfly conservatory: a big warm glasshouse full of plants, with
 * the sky showing through the glass. Wide like the rooms:
 *   left:   the hatching case (chrysalises) and a fruit stump for feeding
 *   middle: flower beds, a tall banana plant and the misting pipe
 *   right:  a rocky waterfall into a koi pond, a bench, and a picture board
 * The butterflies and everything that moves are in eggs/conservatory.ts.
 */
export const CONSERVATORY = { left: 0.7, right: 0.8, floor: 0.74 };

/** Where things are (shared with the surprises). */
export function glasshouse(w: number, h: number) {
  const fy = h * CONSERVATORY.floor;
  return {
    fy,
    hatchery: { x: -0.62 * w, y: h * 0.24, w: 0.26 * w, h: h * 0.34 },
    stump: { x: -0.17 * w, top: h * 0.6, r: 0.05 * w },
    bushes: [0.08, 0.3, 0.56, 0.8].map((f) => ({ x: f * w, y: fy - h * 0.08, r: Math.min(0.075 * w, h * 0.1) })),
    banana: { x: 0.43 * w, top: h * 0.3 },
    mister: { x0: 0.04 * w, x1: 0.96 * w, y: h * 0.11 },
    falls: { x0: 1.1 * w, x1: 1.27 * w, top: h * 0.22, bottom: fy + h * 0.03 },
    pond: { x: 1.2 * w, y: fy + h * 0.08, rx: 0.15 * w, ry: h * 0.05 },
    bench: { x0: 1.42 * w, x1: 1.6 * w, seat: h * 0.66 },
    board: { x: 1.63 * w, y: h * 0.2, w: 0.14 * w, h: h * 0.22 },
    sun: { x: w * 0.86, y: h * 0.08, r: Math.min(w, h) * 0.06 },
  };
}

export function conservatorySky(w: number, h: number, season: Season): SkyDef {
  const pal = PALETTE[season];
  const u = Math.min(w, h);
  const s = glasshouse(w, h).sun;
  return {
    x0: -CONSERVATORY.left * w,
    x1: (1 + CONSERVATORY.right) * w,
    h,
    color: pal.sky,
    sun: { x: s.x, y: s.y, r: s.r * pal.sunSize, color: pal.sun, rays: true },
    clouds: [[-0.6, 0.1, 0.8], [-0.15, 0.06, 0.6], [0.3, 0.12, 0.7], [1.1, 0.08, 0.9], [1.55, 0.13, 0.6]].map(([fx, fy, k]) => ({ x: w * fx, y: h * fy, r: u * 0.04 * k })),
    cloudColor: pal.cloud,
  };
}

/** A big tropical leaf from (x, y), pointing at `angle` (0 = right). */
export function bigLeaf(g: Graphics, x: number, y: number, len: number, angle: number, colour: number) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const at = (a: number, b: number) => [x + c * a - s * b, y + s * a + c * b];
  const [tx, ty] = at(len, 0);
  const [l1x, l1y] = at(len * 0.45, -len * 0.32);
  const [r1x, r1y] = at(len * 0.45, len * 0.32);
  g.moveTo(x, y).quadraticCurveTo(l1x, l1y, tx, ty).quadraticCurveTo(r1x, r1y, x, y).fill(colour).stroke({ width: 3, color: INK });
  g.moveTo(x, y).lineTo(tx, ty).stroke({ width: 2, color: 0x2d6a4f });
  for (let i = 1; i < 5; i++) {
    const [mx, my] = at((len * i) / 5.5, 0);
    const [ex, ey] = at((len * i) / 5.5 + len * 0.1, -len * 0.18);
    const [fx, fy] = at((len * i) / 5.5 + len * 0.1, len * 0.18);
    g.moveTo(mx, my).lineTo(ex, ey).moveTo(mx, my).lineTo(fx, fy);
  }
  g.stroke({ width: 1.5, color: 0x2d6a4f, alpha: 0.6 });
}

export function drawConservatory(g: Graphics, w: number, h: number, season: Season) {
  const G = glasshouse(w, h);
  const fy = G.fy;
  const x0 = -CONSERVATORY.left * w, x1 = (1 + CONSERVATORY.right) * w;
  const rnd = seeded(77);
  const winter = season === 'winter';
  const leafA = 0x52b788, leafB = 0x40916c, leafC = 0x74c69d;

  // --- the glass: a faint green tint over the sky, white frames, arched roof ---
  g.rect(x0, 0, x1 - x0, fy).fill({ color: 0xd8f3dc, alpha: 0.22 });
  if (winter) for (let x = x0; x < x1; x += 0.12 * w) g.ellipse(x + 0.06 * w, h * 0.05, 0.05 * w, 7).fill({ color: 0xffffff, alpha: 0.8 }); // snow on the roof
  for (let x = x0; x <= x1; x += 0.12 * w) g.rect(x - 4, 0, 8, fy).fill(0xffffff);
  for (const y of [0.3, 0.52]) g.rect(x0, h * y - 3, x1 - x0, 6).fill(0xffffff);
  for (let x = x0; x < x1; x += 0.48 * w) {
    g.moveTo(x, h * 0.16).quadraticCurveTo(x + 0.24 * w, -h * 0.08, x + 0.48 * w, h * 0.16).stroke({ width: 7, color: 0xffffff });
  }
  g.rect(x0, h * 0.16 - 3, x1 - x0, 6).fill(0xffffff);
  // the odd glint on the glass
  for (let x = x0 + 0.05 * w; x < x1; x += 0.36 * w) g.moveTo(x, h * 0.36).lineTo(x + 26, h * 0.33).moveTo(x + 6, h * 0.42).lineTo(x + 40, h * 0.38);
  g.stroke({ width: 4, color: 0xffffff, alpha: 0.7 });

  // --- ferns and leaves all along the back, behind the beds ---
  for (let x = x0 + 20; x < x1; x += 0.07 * w) {
    const lh = h * (0.12 + rnd() * 0.08);
    bigLeaf(g, x, fy - h * 0.03, lh, -Math.PI / 2 - 0.5 - rnd() * 0.3, rnd() < 0.5 ? leafB : leafA);
    bigLeaf(g, x + 10, fy - h * 0.03, lh * 0.9, -Math.PI / 2 + 0.4 + rnd() * 0.3, rnd() < 0.5 ? leafA : leafC);
  }
  // the soil bed along the back wall, with a low stone edge
  g.rect(x0, fy - h * 0.05, x1 - x0, h * 0.05).fill(0x6b4226);
  for (let x = x0; x < x1; x += 46) g.roundRect(x + 2, fy - 12, 42, 14, 5).fill(0xbdb5a6).stroke({ width: 2, color: INK });

  // --- the floor: a warm stone path with stepping stones ---
  g.rect(x0, fy, x1 - x0, h - fy).fill(0xe9dcc9);
  for (let x = x0 + 30; x < x1; x += 120) {
    g.ellipse(x + rnd() * 40, fy + (h - fy) * (0.3 + rnd() * 0.5), 34, 12).fill(0xd6c7b0).stroke({ width: 2, color: 0xbdae97 });
  }

  // --- middle: flower bushes (their flowers are surprises), a tall banana plant ---
  for (const b of G.bushes) {
    g.circle(b.x - b.r * 0.6, b.y + b.r * 0.2, b.r * 0.7).circle(b.x + b.r * 0.6, b.y + b.r * 0.2, b.r * 0.7).circle(b.x, b.y - b.r * 0.2, b.r).fill(leafB).stroke({ width: 3, color: INK });
    g.circle(b.x - b.r * 0.3, b.y - b.r * 0.5, b.r * 0.25).fill({ color: 0xffffff, alpha: 0.15 });
  }
  const bn = G.banana;
  g.rect(bn.x - 12, bn.top, 24, fy - bn.top).fill(0x8d6e4a).stroke({ width: 3, color: INK });
  for (let y = bn.top + 20; y < fy - 10; y += 26) g.moveTo(bn.x - 12, y).lineTo(bn.x + 12, y + 6);
  g.stroke({ width: 2, color: 0x6b4226 });
  bigLeaf(g, bn.x, bn.top + 6, h * 0.22, -2.6, leafA);
  bigLeaf(g, bn.x, bn.top + 6, h * 0.24, -0.5, leafC);
  bigLeaf(g, bn.x, bn.top, h * 0.2, -1.8, leafB);
  bigLeaf(g, bn.x, bn.top + 14, h * 0.2, -1.1, leafA);
  // hanging baskets of trailing plants from the roof
  for (const hx of [0.17, 0.7, -0.06, 1.45]) {
    const x = hx * w, y = h * 0.3;
    g.moveTo(x, h * 0.16).lineTo(x - 22, y).moveTo(x, h * 0.16).lineTo(x + 22, y).stroke({ width: 2, color: INK });
    for (let k = 0; k < 5; k++) {
      const vx = x - 24 + k * 12;
      g.moveTo(vx, y + 10).quadraticCurveTo(vx + (k % 2 ? 10 : -10), y + 40 + k * 6, vx, y + 60 + (k % 3) * 18).stroke({ width: 4, color: leafB });
      g.circle(vx, y + 60 + (k % 3) * 18, 5).fill(k % 2 ? 0xff8fb1 : 0xffffff).stroke({ width: 1.5, color: INK });
    }
    g.moveTo(x - 30, y).quadraticCurveTo(x, y + 34, x + 30, y).closePath().fill(0xa47e4b).stroke({ width: 3, color: INK });
    g.circle(x - 14, y - 4, 10).circle(x + 2, y - 8, 12).circle(x + 16, y - 3, 9).fill(leafA).stroke({ width: 2, color: INK });
  }
  // a palm by the right-hand end of the middle
  const px = 0.97 * w;
  g.moveTo(px - 10, fy).quadraticCurveTo(px - 24, h * 0.45, px + 8, h * 0.2).lineTo(px + 26, h * 0.2).quadraticCurveTo(px + 2, h * 0.45, px + 14, fy).closePath().fill(0xa47e4b).stroke({ width: 3, color: INK });
  for (const a of [-2.8, -2.2, -1.5, -0.9, -0.3]) bigLeaf(g, px + 17, h * 0.2, h * 0.17, a, a < -1.5 ? leafA : leafB);

  // --- left: the hatching case on its legs, and the fruit stump ---
  const c = G.hatchery;
  g.rect(c.x + 10, c.y + c.h, 12, fy - c.y - c.h).rect(c.x + c.w - 22, c.y + c.h, 12, fy - c.y - c.h).fill(0x8d5524).stroke({ width: 2, color: INK });
  g.roundRect(c.x - 10, c.y - 14, c.w + 20, c.h + 28, 10).fill(0xa47e4b).stroke({ width: 4, color: INK });
  g.rect(c.x, c.y, c.w, c.h).fill(0xe3f4e8).stroke({ width: 3, color: INK });
  // leaves growing up inside the case, and a little painted butterfly on top
  for (let i = 0; i < 6; i++) bigLeaf(g, c.x + c.w * (0.08 + i * 0.17), c.y + c.h * 0.88, c.h * (0.3 + (i % 3) * 0.08), -Math.PI / 2 + (i % 2 ? 0.45 : -0.45), i % 2 ? leafA : leafC);
  g.rect(c.x, c.y + c.h * 0.86, c.w, c.h * 0.14).fill(0xc68b59).stroke({ width: 2, color: INK }); // soil at the bottom of the case
  g.moveTo(c.x + c.w * 0.06, c.y + c.h * 0.7).lineTo(c.x + c.w * 0.3, c.y + c.h * 0.3).moveTo(c.x + c.w * 0.12, c.y + c.h * 0.76).lineTo(c.x + c.w * 0.4, c.y + c.h * 0.3).stroke({ width: 5, color: 0xffffff, alpha: 0.6 }); // the glass shines
  const bx = c.x + c.w / 2, by = c.y - 30;
  g.ellipse(bx - 13, by, 13, 15).ellipse(bx + 13, by, 13, 15).ellipse(bx - 9, by + 16, 9, 9).ellipse(bx + 9, by + 16, 9, 9).fill(0xff8c00).stroke({ width: 3, color: INK });
  g.roundRect(bx - 3, by - 14, 6, 36, 3).fill(INK);
  g.moveTo(c.x + 8, c.y + c.h * 0.16).lineTo(c.x + c.w - 8, c.y + c.h * 0.14).stroke({ width: 6, color: 0x6b4226, cap: 'round' }); // the twig they hang from
  const st = G.stump;
  g.rect(st.x - st.r, st.top, st.r * 2, fy + h * 0.02 - st.top).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.ellipse(st.x, st.top, st.r, st.r * 0.3).fill(0xd4a373).stroke({ width: 3, color: INK });
  g.ellipse(st.x, st.top, st.r * 0.55, st.r * 0.16).stroke({ width: 2, color: 0xa47e4b });
  // a tall fern on the far left, a lemon tree in a pot
  bigLeaf(g, x0 + 0.06 * w, fy, h * 0.3, -1.2, leafA);
  bigLeaf(g, x0 + 0.06 * w, fy, h * 0.26, -1.9, leafB);
  const lx = -0.28 * w;
  g.moveTo(lx - 28, fy - h * 0.1).lineTo(lx + 28, fy - h * 0.1).lineTo(lx + 20, fy + h * 0.02).lineTo(lx - 20, fy + h * 0.02).closePath().fill(0xe76f51).stroke({ width: 3, color: INK });
  g.rect(lx - 4, fy - h * 0.3, 8, h * 0.2).fill(0x8d5524).stroke({ width: 2, color: INK });
  g.circle(lx, fy - h * 0.34, h * 0.08).fill(leafB).stroke({ width: 3, color: INK });
  for (const [dx, dy] of [[-0.04, -0.36], [0.03, -0.31], [0.01, -0.4], [-0.02, -0.29]]) g.ellipse(lx + dx * h, fy + dy * h, 7, 9).fill(0xffd60a).stroke({ width: 2, color: INK });

  // --- right: the rocky waterfall into the koi pond (the water moves: see eggs) ---
  const f = G.falls;
  g.moveTo(f.x0 - 0.05 * w, f.bottom).lineTo(f.x0 - 0.03 * w, f.top + h * 0.12).lineTo(f.x0 + 0.02 * w, f.top).lineTo(f.x1 - 0.02 * w, f.top - h * 0.03).lineTo(f.x1 + 0.04 * w, f.top + h * 0.1).lineTo(f.x1 + 0.06 * w, f.bottom).closePath().fill(0x8d8d8d).stroke({ width: 4, color: INK });
  for (const [ax, ay, r] of [[-0.03, 0.4, 26], [0.2, 0.3, 20], [1.05, 0.45, 24], [0.95, 0.75, 30], [-0.02, 0.8, 28]]) g.circle(f.x0 + (f.x1 - f.x0) * ax, f.top + (f.bottom - f.top) * ay, r).fill(0x9e9e9e).stroke({ width: 3, color: INK });
  g.rect(f.x0 + 0.03 * w, f.top + 6, f.x1 - f.x0 - 0.06 * w, f.bottom - f.top - 10).fill(0xbfe8ff);
  bigLeaf(g, f.x1 + 0.04 * w, f.top + h * 0.06, h * 0.14, -0.6, leafA);
  bigLeaf(g, f.x0 - 0.02 * w, f.top + h * 0.1, h * 0.12, -2.5, leafC);
  const p = G.pond;
  g.ellipse(p.x, p.y, p.rx + 10, p.ry + 8).fill(0xbdb5a6).stroke({ width: 3, color: INK });
  g.ellipse(p.x, p.y, p.rx, p.ry).fill(winter ? 0x9fc5e8 : 0x2a9d8f);
  for (const [dx, dy] of [[-0.5, -0.1], [0.45, 0.25], [0.1, -0.4]]) {
    const lx2 = p.x + p.rx * dx, ly2 = p.y + p.ry * dy;
    g.moveTo(lx2, ly2).arc(lx2, ly2, 16, 0.4, Math.PI * 2 - 0.1).lineTo(lx2, ly2).fill(0x52b788).stroke({ width: 2, color: INK }); // lily pads
  }
  // the bench
  const b = G.bench;
  g.rect(b.x0 + 12, b.seat, 12, fy + h * 0.06 - b.seat).rect(b.x1 - 24, b.seat, 12, fy + h * 0.06 - b.seat).fill(0x2b2d42).stroke({ width: 2, color: INK });
  g.rect(b.x0, b.seat - 8, b.x1 - b.x0, 14).fill(0xc68b59).stroke({ width: 3, color: INK });
  g.rect(b.x0, b.seat - h * 0.1, b.x1 - b.x0, 12).rect(b.x0, b.seat - h * 0.06, b.x1 - b.x0, 12).fill(0xc68b59).stroke({ width: 3, color: INK });
  // the picture board on its post (the pictures are surprises)
  const bd = G.board;
  g.rect(bd.x + bd.w / 2 - 6, bd.y + bd.h, 12, fy - bd.y - bd.h + h * 0.02).fill(0x8d5524).stroke({ width: 2, color: INK });
  g.roundRect(bd.x - 8, bd.y - 8, bd.w + 16, bd.h + 16, 8).fill(0x6b4226).stroke({ width: 3, color: INK });
  g.rect(bd.x, bd.y, bd.w, bd.h).fill(0xfff8e1);
  // more plants at the far right
  bigLeaf(g, x1 - 0.04 * w, fy, h * 0.3, -1.9, leafB);
  bigLeaf(g, x1 - 0.04 * w, fy, h * 0.25, -1.3, leafA);
}
