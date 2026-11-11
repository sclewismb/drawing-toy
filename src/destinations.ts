import type { Graphics } from 'pixi.js';
import { stall } from './fair';
import { INK } from './places';
import { hillDots, PALETTE, type Season } from './seasons';
import type { SkyDef } from './sky';

/**
 * Two more places: Niagara Falls (the falls seen from the riverside path,
 * with the lookout tower and the arched bridge) and a ninja kids gym (a
 * made-up one: no real gym's name or logo). Both wide like the rooms, drawn
 * here; things that move or can be tapped are in eggs/destinations.ts.
 */
export const NIAGARA = { left: 0.75, right: 0.85, floor: 0.8 };
export const NINJA = { left: 0.6, right: 0.7, floor: 0.74 };

/** Where the falls are (shared with the surprises). */
export const falls = (w: number, h: number) => ({ x0: 0.16 * w, x1: 0.84 * w, top: 0.22 * h, bottom: 0.6 * h, bulge: 0.05 * h });

export function niagaraSky(w: number, h: number, season: Season): SkyDef {
  const pal = PALETTE[season];
  const u = Math.min(w, h);
  return {
    x0: -NIAGARA.left * w,
    x1: (1 + NIAGARA.right) * w,
    h,
    color: pal.sky,
    sun: { x: w * 0.9, y: h * 0.09, r: u * 0.06 * pal.sunSize, color: pal.sun, rays: true },
    clouds: [[-0.6, 0.06, 0.8], [-0.1, 0.04, 0.6], [0.35, 0.05, 0.7], [1.15, 0.06, 0.9], [1.6, 0.04, 0.7]].map(([fx, fy, s]) => ({ x: w * fx, y: h * fy, r: u * 0.04 * s })),
    cloudColor: pal.cloud,
  };
}

export function drawNiagara(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const winter = season === 'winter';
  const x0 = -NIAGARA.left * w, x1 = (1 + NIAGARA.right) * w;
  const f = falls(w, h);
  const rock = 0x8d8d8d, rockDark = 0x6c757d;
  const river = winter ? 0x9fc5e8 : 0x4ea8ff;

  // the land across the top, with trees, and rocky cliffs down to the river
  g.rect(x0, h * 0.17, x1 - x0, h * 0.08).fill(pal.grass);
  hillDots(g, 0.5 * w, h * 0.24, 1.2 * w, h * 0.06, pal.dots, 12);
  for (let x = x0 + 30; x < x1; x += 46) {
    if (x > f.x0 - 10 && x < f.x1 + 10) continue;
    g.circle(x, h * 0.17, 20).fill(winter ? 0x6a9a7f : 0x40916c).stroke({ width: 2, color: INK });
  }
  g.rect(x0, h * 0.23, x1 - x0, h * 0.4).fill(rock);
  for (let x = x0; x < x1; x += 70) g.moveTo(x, h * 0.25).lineTo(x + 20, h * 0.4).lineTo(x - 10, h * 0.6);
  g.stroke({ width: 3, color: rockDark });
  // the great horseshoe falls: a pale curtain (its rushing water is drawn in the surprises)
  g.moveTo(f.x0, f.top).quadraticCurveTo(0.5 * w, f.top - f.bulge * 2, f.x1, f.top).lineTo(f.x1 + 10, f.bottom).lineTo(f.x0 - 10, f.bottom).closePath().fill(winter ? 0xe3f2fd : 0xbfe8ff).stroke({ width: 4, color: INK });
  // the smaller falls off to the left
  g.rect(-0.62 * w, h * 0.3, 0.22 * w, h * 0.3).fill(winter ? 0xe3f2fd : 0xbfe8ff).stroke({ width: 4, color: INK });
  // the river, with little waves
  g.rect(x0, h * 0.6, x1 - x0, h * 0.17).fill(river);
  for (let x = x0 + 20; x < x1; x += 60) g.moveTo(x, h * 0.68).quadraticCurveTo(x + 15, h * 0.665, x + 30, h * 0.68);
  for (let x = x0 + 50; x < x1; x += 60) g.moveTo(x, h * 0.72).quadraticCurveTo(x + 15, h * 0.705, x + 30, h * 0.72);
  g.stroke({ width: 3, color: 0xffffff, alpha: 0.7 });
  // the riverside path and its railing
  g.rect(x0, h * 0.77, x1 - x0, h * 0.23).fill(winter ? 0xf1f5f9 : 0xd6ccc2);
  for (let x = x0; x < x1; x += 90) g.moveTo(x, h * 0.77).lineTo(x - 30, h);
  g.stroke({ width: 2, color: 0xbdb5a6 });
  for (let x = x0 + 10; x < x1; x += 40) g.rect(x - 3, h * 0.72, 6, h * 0.06).fill(0x2b2d42);
  g.rect(x0, h * 0.72, x1 - x0, 8).fill(0x2b2d42);

  // --- left: the lookout tower ---
  const tx = -0.32 * w;
  g.rect(tx - 14, h * 0.14, 28, h * 0.58).fill(0xdee2e6).stroke({ width: 4, color: INK });
  g.moveTo(tx - 5, h * 0.16).lineTo(tx - 5, h * 0.72).stroke({ width: 3, color: 0xadb5bd });
  g.ellipse(tx, h * 0.12, 0.07 * w, h * 0.04).fill(0xffd166).stroke({ width: 4, color: INK });
  g.rect(tx - 0.06 * w, h * 0.11, 0.12 * w, h * 0.02).fill(0xbfe8ff);
  g.moveTo(tx, h * 0.08).lineTo(tx, h * 0.03).stroke({ width: 4, color: INK });

  // --- right: the arched bridge across the river ---
  const bx0 = 1.06 * w, bx1 = 1.74 * w, deck = h * 0.36;
  g.moveTo(bx0, h * 0.6).quadraticCurveTo((bx0 + bx1) / 2, h * 0.2, bx1, h * 0.6).stroke({ width: 16, color: INK });
  g.moveTo(bx0, h * 0.6).quadraticCurveTo((bx0 + bx1) / 2, h * 0.2, bx1, h * 0.6).stroke({ width: 10, color: 0xadb5bd });
  for (let i = 1; i < 10; i++) {
    const t = i / 10, x = bx0 + (bx1 - bx0) * t;
    const archY = (1 - t) * (1 - t) * h * 0.6 + 2 * (1 - t) * t * h * 0.2 + t * t * h * 0.6;
    g.moveTo(x, deck).lineTo(x, archY).stroke({ width: 3, color: 0x6c757d });
  }
  g.rect(bx0 - 20, deck - 8, bx1 - bx0 + 40, 14).fill(0x6c757d).stroke({ width: 3, color: INK });
  for (const lx of [1.15, 1.4, 1.65]) {
    g.rect(lx * w - 3, deck - 50, 6, 42).fill(0x2b2d42);
    g.circle(lx * w, deck - 54, 8).fill(0xfff3b0).stroke({ width: 2, color: INK });
  }
  // a little stall selling rain ponchos (the falls are splashy!)
  stall(g, 1.5 * w, h * 0.92, 0.14 * w, h * 0.26, 0x4ea8ff);
}

// ---------------------------------------------------------------------------
// The ninja kids gym
// ---------------------------------------------------------------------------
export function drawNinja(g: Graphics, w: number, h: number) {
  const fy = h * NINJA.floor;
  const x0 = -NINJA.left * w, x1 = (1 + NINJA.right) * w;
  // walls with bright stripes, and padded mats on the floor
  g.rect(x0, 0, x1 - x0, fy).fill(0x1d3557);
  g.rect(x0, h * 0.06, x1 - x0, 10).fill(0x7bd36b);
  g.rect(x0, h * 0.06 + 16, x1 - x0, 10).fill(0xffb703);
  g.rect(x0, fy, x1 - x0, h - fy).fill(0x4ea8ff);
  for (let x = x0; x < x1; x += 110) g.moveTo(x, fy).lineTo(x - 40, h);
  g.moveTo(x0, fy + (h - fy) * 0.5).lineTo(x1, fy + (h - fy) * 0.5);
  g.stroke({ width: 3, color: 0x2f80c8 });
  g.rect(x0, fy - 6, x1 - x0, 12).fill(0xffb703).stroke({ width: 3, color: INK });
  // a big star on the wall, like a ninja throwing star (but friendly)
  g.star(0.33 * w, h * 0.42, 4, 46, 16).fill(0xffb703).stroke({ width: 4, color: INK });
  g.circle(0.33 * w, h * 0.42, 9).fill(0x1d3557);

  // --- middle: monkey bars ---
  const mb0 = 0.08 * w, mb1 = 0.52 * w, top = h * 0.22;
  for (const px of [mb0, mb1]) g.rect(px - 8, top, 16, fy - top).fill(0xe5383b).stroke({ width: 3, color: INK });
  g.rect(mb0 - 10, top - 8, mb1 - mb0 + 20, 12).rect(mb0 - 10, top + 10, mb1 - mb0 + 20, 6).fill(0xadb5bd).stroke({ width: 2, color: INK });
  for (let x = mb0 + 20; x < mb1 - 10; x += 0.04 * w) g.rect(x - 4, top - 8, 8, 24).fill(0xdee2e6).stroke({ width: 2, color: INK });

  // --- middle: the warped wall (a curved ramp) with a platform on top ---
  const wx0 = 0.6 * w, wx1 = 0.82 * w, wtop = h * 0.3;
  g.moveTo(wx0, fy).quadraticCurveTo(wx1, fy, wx1, wtop).lineTo(wx1 + 0.12 * w, wtop).lineTo(wx1 + 0.12 * w, fy).closePath().fill(0xffb703).stroke({ width: 4, color: INK });
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const x = (1 - t) * (1 - t) * wx0 + 2 * (1 - t) * t * wx1 + t * t * wx1;
    const y = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * fy + t * t * wtop;
    g.moveTo(x, y).lineTo(wx1 + 0.12 * w, y).stroke({ width: 2, color: 0xe09400 });
  }
  g.rect(wx1, wtop - 10, 0.12 * w, 12).fill(0x2b2d42).stroke({ width: 2, color: INK });
  g.moveTo(wx1 + 6, wtop - 10).lineTo(wx1 + 6, wtop - 60).lineTo(wx1 + 0.12 * w - 6, wtop - 60).lineTo(wx1 + 0.12 * w - 6, wtop - 10).stroke({ width: 5, color: 0xdee2e6 });

  // --- left: a beam for the rope swings, and the foam pit ---
  g.rect(-0.58 * w, h * 0.1, 0.3 * w, 16).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.rect(-0.25 * w, fy - 6, 0.22 * w, h * 0.18).fill(0x2b2d42).stroke({ width: 4, color: INK });

  // --- right: trampolines in the floor, the climbing wall, the salmon ladder ---
  for (const tx of [1.06, 1.2]) {
    g.roundRect(tx * w, fy + h * 0.04, 0.12 * w, h * 0.08, 8).fill(0xe5383b).stroke({ width: 3, color: INK });
    g.roundRect(tx * w + 10, fy + h * 0.04 + 8, 0.12 * w - 20, h * 0.08 - 16, 4).fill(0x1f1f1f);
  }
  g.rect(1.36 * w, h * 0.12, 0.22 * w, fy - h * 0.12).fill(0xdee2e6).stroke({ width: 4, color: INK });
  g.rect(1.62 * w, h * 0.14, 10, fy - h * 0.14).rect(1.69 * w - 10, h * 0.14, 10, fy - h * 0.14).fill(0xadb5bd).stroke({ width: 2, color: INK });
  for (let y = h * 0.2; y < fy - 10; y += h * 0.08) {
    g.rect(1.62 * w + 10, y, 0.07 * w - 30, 6).fill(0x6c757d);
    g.moveTo(1.62 * w + 10, y).lineTo(1.62 * w + 10, y - 14).moveTo(1.69 * w - 20, y).lineTo(1.69 * w - 20, y - 14).stroke({ width: 4, color: 0x6c757d });
  }
}
