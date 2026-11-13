import type { Graphics } from 'pixi.js';
import { frame, INK, seeded, type PlaceId } from './places';
import { drawBackyard, YARD } from './backyard';
import { drawFair, drawFairFar, FAIR } from './fair';
import { drawRestaurant, drawToyshop, drawVet, SHOP_WIDE } from './shops';
import { fireWide, parkWide, policeWide, schoolWide, TOWN_WIDE } from './townWide';
import { drawZoo, drawZooFar, ZOO } from './zoo';
import { CONSERVATORY, drawConservatory } from './conservatory';
import { drawWorkshop, WORKSHOP } from './workshop';
import { drawAdoption } from './adoption';
import { ARENA, drawArena } from './arena';
import { drawPigCottage, PIGS } from './pigs';
import { drawNiagara, drawNiagaraFar, drawNinja, NIAGARA, NINJA } from './destinations';
import type { Season } from './seasons';

/**
 * The wide rooms: each house room carries on to the left and right of its
 * original view (drawn from the family's panorama photos), so you can slide
 * along to see more of it.
 *
 * Coordinates: the original view is x = 0..w (w is its width), so the part
 * to the left has negative x and the part to the right has x beyond w.
 * Things that move or can be tapped are drawn in eggs/wide.ts.
 */
export interface WideRoom {
  /** How far the room carries on to the left and right (in widths of the original view). */
  left: number;
  right: number;
  draw: (g: Graphics, w: number, h: number, season: Season) => void;
  /**
   * Outdoors, for depth: far scenery (hazy hills, a distant train...) drawn
   * behind the room's picture on a layer that slides slower than the room
   * when you pan (`farSpeed` of the room's speed, 0.6 if not given).
   */
  far?: (g: Graphics, w: number, h: number, season: Season) => void;
  farSpeed?: number;
  /** The sky slides slower still (only where nothing in the sky has to line up with the picture). */
  skySpeed?: number;
}

export const WIDE: Partial<Record<PlaceId, WideRoom>> = {
  'bedroom-a': { left: 0.75, right: 0.6, draw: bedroomA },
  'bedroom-b': { left: 0.6, right: 0.85, draw: bedroomB },
  kitchen: { left: 0.85, right: 0.55, draw: kitchen },
  lounge: { left: 0.6, right: 0.6, draw: lounge },
  backyard: { left: YARD.left, right: YARD.right, draw: drawBackyard }, // all of it is drawn in backyard.ts
  fair: { left: FAIR.left, right: FAIR.right, draw: drawFair, far: drawFairFar, farSpeed: 0.55, skySpeed: 0.3 }, // all of it is drawn in fair.ts
  // the town places carry on either side too (see townWide.ts)
  fire: { ...TOWN_WIDE.fire, draw: fireWide },
  police: { ...TOWN_WIDE.police, draw: policeWide },
  school: { ...TOWN_WIDE.school, draw: schoolWide },
  park: { ...TOWN_WIDE.park, draw: parkWide },
  // the vet, the restaurant, the toy shop and the zoo (all drawn in shops.ts and zoo.ts)
  vet: { ...SHOP_WIDE.vet, draw: (g, w, h) => (drawVet(g, w, h), drawAdoption(g, w, h)) },
  restaurant: { ...SHOP_WIDE.restaurant, draw: drawRestaurant },
  toyshop: { ...SHOP_WIDE.toyshop, draw: drawToyshop },
  zoo: { left: ZOO.left, right: ZOO.right, draw: drawZoo, far: drawZooFar, farSpeed: 0.55, skySpeed: 0.3 },
  ninja: { left: NINJA.left, right: NINJA.right, draw: drawNinja },
  niagara: { left: NIAGARA.left, right: NIAGARA.right, draw: drawNiagara, far: drawNiagaraFar, farSpeed: 0.5, skySpeed: 0.25 },
  conservatory: { left: CONSERVATORY.left, right: CONSERVATORY.right, draw: drawConservatory },
  workshop: { left: WORKSHOP.left, right: WORKSHOP.right, draw: drawWorkshop },
  arena: { left: ARENA.left, right: ARENA.right, draw: drawArena },
  pigs: { left: PIGS.left, right: PIGS.right, draw: drawPigCottage },
};

/** Wall and carpet across a stretch of a bedroom. */
function wallAndCarpet(g: Graphics, x0: number, x1: number, h: number, fy: number, wall: number, carpet: number) {
  g.rect(x0, 0, x1 - x0, fy).fill(wall);
  g.rect(x0, fy, x1 - x0, h - fy).fill(carpet);
  g.rect(x0, fy - 6, x1 - x0, 12).fill(0xffffff).stroke({ width: 3, color: INK });
}

/** Where two walls meet: a soft shadowy line. */
function corner(g: Graphics, x: number, fy: number) {
  g.rect(x - 3, 0, 6, fy).fill({ color: 0x000000, alpha: 0.06 });
  g.moveTo(x, 0).lineTo(x, fy).stroke({ width: 2, color: 0xc9cdd2 });
}

/** A white door frame (the door itself is drawn in eggs/wide.ts so it can open). */
export function doorFrame(g: Graphics, x: number, y: number, dw: number, dh: number) {
  g.rect(x - 10, y - 10, dw + 20, dh + 10).fill(0xffffff).stroke({ width: 3, color: 0xc9cdd2 });
  g.rect(x, y, dw, dh).fill(0x2b2d42);
}

/** Books standing on a little wall ledge. */
function bookLedge(g: Graphics, x: number, y: number, lw: number, seed: number) {
  const rnd = seeded(seed);
  const colours = [0xe5383b, 0x4ea8ff, 0xffd166, 0x52b788, 0xb07de8, 0xff8fb1, 0xf4a261];
  let bx = x + 6;
  while (bx < x + lw - 14) {
    const bw = 10 + rnd() * 12;
    const bh = 34 + rnd() * 22;
    g.rect(bx, y - bh, bw, bh).fill(colours[Math.floor(rnd() * colours.length)]).stroke({ width: 2, color: INK });
    g.rect(bx + 2, y - bh + 6, bw - 4, 4).fill({ color: 0xffffff, alpha: 0.6 });
    bx += bw + 1;
  }
  g.rect(x, y - 12, lw, 14).fill(0xc68b59).stroke({ width: 3, color: INK }); // wooden front
  g.rect(x, y + 2, lw, 6).fill(0x8ecdd0).stroke({ width: 2, color: INK }); // turquoise shelf
}

// ---------------------------------------------------------------------------
// First bedroom. Left: a closet, the laundry hamper, a growth chart, book
// ledges, a dream catcher and a scratch map. Right: round the corner to the
// bedroom door (towel hanging on it) and another closet.
// ---------------------------------------------------------------------------
function bedroomA(g: Graphics, w: number, h: number) {
  const fy = h * 0.74;
  const wall = 0xe4e6ea, side = 0xdadde2, carpet = 0x5f5a57;
  // left
  wallAndCarpet(g, -0.75 * w, 0, h, fy, wall, carpet);
  g.rect(-0.75 * w, 0, 0.22 * w, fy).fill(side);
  corner(g, -0.53 * w, fy);
  doorFrame(g, -0.72 * w, h * 0.1, 0.16 * w, fy - h * 0.1);
  // growth chart (a big wooden ruler)
  const rx = -0.43 * w, ry = h * 0.18, rw = Math.max(18, 0.03 * w), rh = h * 0.52;
  g.rect(rx, ry, rw, rh).fill(0xb5835a).stroke({ width: 3, color: INK });
  for (let i = 1; i < 24; i++) {
    const y = ry + (rh * i) / 24;
    g.moveTo(rx, y).lineTo(rx + (i % 4 === 0 ? rw * 0.7 : rw * 0.35), y);
  }
  g.stroke({ width: 2, color: 0x6b4226 });
  // three ledges of books, a little flag on the top one
  const lx = -0.37 * w, lw = 0.14 * w;
  bookLedge(g, lx, h * 0.24, lw, 3);
  bookLedge(g, lx, h * 0.4, lw, 9);
  bookLedge(g, lx, h * 0.56, lw, 15);
  g.moveTo(lx + lw - 10, h * 0.24 - 10).lineTo(lx + lw - 10, h * 0.11).stroke({ width: 3, color: INK });
  g.rect(lx + lw - 10, h * 0.11, 30, 20).fill(0x1d3557).stroke({ width: 2, color: INK });
  for (const [sx, sy] of [[8, 6], [20, 12], [24, 5], [14, 15]]) g.circle(lx + lw - 10 + sx, h * 0.11 + sy, 2).fill(0xffffff);
  // the scratch map, in a turquoise frame
  const mx = -0.17 * w, my = h * 0.18, mw = 0.15 * w, mh = h * 0.22;
  g.rect(mx, my, mw, mh).fill(0x8ecdd0).stroke({ width: 3, color: INK });
  g.rect(mx + 8, my + 8, mw - 16, mh - 16).fill(0xf6e7c8);
  const blob = (cx: number, cy: number, rx2: number, ry2: number) => g.ellipse(mx + mw * cx, my + mh * cy, mw * rx2, mh * ry2);
  blob(0.25, 0.35, 0.1, 0.16);
  blob(0.3, 0.68, 0.06, 0.16);
  blob(0.52, 0.32, 0.07, 0.12);
  blob(0.55, 0.62, 0.07, 0.16);
  blob(0.74, 0.36, 0.13, 0.16);
  blob(0.82, 0.74, 0.06, 0.08);
  g.fill(0xb08850);
  // floor vent
  g.rect(-0.3 * w, fy + 14, 0.05 * w, 10).fill(0xdee2e6).stroke({ width: 2, color: INK });

  // right
  wallAndCarpet(g, w, 1.6 * w, h, fy, wall, carpet);
  g.rect(w, 0, 0.6 * w, fy).fill(side);
  corner(g, w, fy);
  doorFrame(g, 1.08 * w, h * 0.09, 0.18 * w, fy - h * 0.09);
  doorFrame(g, 1.38 * w, h * 0.09, 0.18 * w, fy - h * 0.09);
  // light switch by the door
  g.roundRect(1.3 * w, h * 0.4, 22, 34, 4).fill(0xffffff).stroke({ width: 2, color: INK });
  g.rect(1.3 * w + 8, h * 0.4 + 9, 6, 14).fill(0xdee2e6);
}

// ---------------------------------------------------------------------------
// Second bedroom. Left: double closet doors, then round the corner a dream
// catcher and a pennant. Right: a white dresser with an oval mirror, a
// basket, the bedroom door, a dressing gown on a hook and a world map with
// pinned-up pictures.
// ---------------------------------------------------------------------------
function bedroomB(g: Graphics, w: number, h: number) {
  const fy = h * 0.74;
  const wall = 0xf6f6f8, side = 0xeceef0, carpet = 0x6b625c;
  // left
  wallAndCarpet(g, -0.6 * w, 0, h, fy, wall, carpet);
  g.rect(-0.6 * w, 0, 0.2 * w, fy).fill(side);
  corner(g, -0.4 * w, fy);
  corner(g, 0, fy);
  doorFrame(g, -0.36 * w, h * 0.08, 0.32 * w, fy - h * 0.08);

  // right
  wallAndCarpet(g, w, 1.85 * w, h, fy, wall, carpet);
  g.rect(1.68 * w, 0, 0.17 * w, fy).fill(side);
  corner(g, 1.68 * w, fy);
  // the white dresser (its drawers open: see eggs/wide.ts) with lamps and bits on top
  const dx = 1.03 * w, dy = h * 0.5, dw = 0.26 * w;
  g.rect(dx, dy, dw, fy - dy + 6).fill(0xfbfbfb).stroke({ width: 4, color: INK });
  g.rect(dx - 6, dy - 10, dw + 12, 14).fill(0xffffff).stroke({ width: 3, color: INK });
  g.circle(dx + dw * 0.12, dy - 22, 13).fill(0xd8b4fe).stroke({ width: 2, color: INK }); // sparkly lamp
  g.roundRect(dx + dw * 0.3, dy - 34, 22, 26, 3).fill(0xf4a261).stroke({ width: 2, color: INK }); // little picture
  g.roundRect(dx + dw * 0.55, dy - 30, 34, 22, 6).fill(0xff8fb1).stroke({ width: 2, color: INK }); // jewellery box
  g.circle(dx + dw * 0.86, dy - 18, 9).fill(0xffd166).stroke({ width: 2, color: INK });
  // wicker basket
  const bx = 1.32 * w, bw = 0.08 * w, by = h * 0.6;
  g.poly([bx, by, bx + bw, by, bx + bw * 0.9, fy + 8, bx + bw * 0.1, fy + 8]).fill(0xd4b483).stroke({ width: 3, color: INK });
  for (let i = 1; i < 6; i++) g.moveTo(bx + bw * 0.04 * i, by + ((fy + 8 - by) * i) / 6).lineTo(bx + bw - bw * 0.04 * i, by + ((fy + 8 - by) * i) / 6);
  g.stroke({ width: 2, color: 0xa47e4b });
  g.ellipse(bx + bw / 2, by + 4, bw * 0.4, 8).fill(0x5c7c99); // clothes in it
  // the bedroom door
  doorFrame(g, 1.44 * w, h * 0.1, 0.18 * w, fy - h * 0.1);
  // the world map with pictures pinned on it (just bright squares, no photos)
  const mx = 1.7 * w, my = h * 0.14, mw = 0.14 * w, mh = h * 0.36;
  g.rect(mx, my, mw, mh).fill(0xffffff).stroke({ width: 7, color: 0x1f1f1f });
  const blob = (cx: number, cy: number, rx: number, ry: number) => g.ellipse(mx + mw * cx, my + mh * cy, mw * rx, mh * ry);
  blob(0.25, 0.3, 0.14, 0.12);
  blob(0.32, 0.62, 0.08, 0.14);
  blob(0.55, 0.28, 0.1, 0.08);
  blob(0.58, 0.55, 0.09, 0.14);
  blob(0.8, 0.32, 0.15, 0.12);
  blob(0.85, 0.72, 0.07, 0.06);
  g.fill(0x52b788);
  const rnd = seeded(21);
  const pics = [0xffd6a5, 0xa0c4ff, 0xcaffbf, 0xffadad, 0xbdb2ff];
  for (let i = 0; i < 4; i++) {
    const px = mx + mw * (0.15 + rnd() * 0.65), py = my + mh * (0.1 + rnd() * 0.7);
    g.rect(px, py, 26, 20).fill(0xffffff).stroke({ width: 2, color: INK });
    g.rect(px + 3, py + 3, 20, 14).fill(pics[i % pics.length]);
    g.circle(px + 13, py + 1, 3).fill(0xe5383b);
  }
  // more pictures down the wall
  for (let i = 0; i < 4; i++) {
    const px = mx - 0.02 * w + i * 0.035 * w, py = my + mh + 24 + (i % 2) * 30;
    g.rect(px, py, 30, 24).fill(0xffffff).stroke({ width: 2, color: INK });
    g.rect(px + 3, py + 3, 24, 18).fill(pics[(i + 2) % pics.length]);
  }
}

// ---------------------------------------------------------------------------
// Kitchen. Left: the back door and mat, coats on hooks, the dining window and
// a round table, a picture and the bin. Right: a door, and the stairs with
// their stripy runner.
// ---------------------------------------------------------------------------
function kitchen(g: Graphics, w: number, h: number) {
  const fy = h * 0.74;
  const wall = 0xeef1f4;
  // left
  g.rect(-0.85 * w, 0, 0.85 * w, fy).fill(wall);
  darkFloor(g, -0.85 * w, 0, h, fy);
  g.ellipse(-0.35 * w, 0, 0.04 * w, h * 0.025).fill(0xfff3c4).stroke({ width: 3, color: INK }); // ceiling light
  doorFrame(g, -0.82 * w, h * 0.12, 0.16 * w, fy - h * 0.12);
  g.rect(-0.85 * w, fy + 4, 0.24 * w, h * 0.09).fill(0x343a40); // door mat
  // coat hooks
  g.rect(-0.6 * w, h * 0.18, 0.09 * w, 10).fill(0x6c757d).stroke({ width: 2, color: INK });
  // the dining window's frame and sill (its blind is in eggs/wide.ts)
  const wx = -0.48 * w, wy = h * 0.16, ww = 0.2 * w, wh = h * 0.26;
  g.rect(wx - 10, wy - 10, ww + 20, wh + 20).fill(0xffffff).stroke({ width: 3, color: 0xc9cdd2 });
  g.rect(wx - 14, wy + wh + 8, ww + 28, 10).fill(0xffffff).stroke({ width: 2, color: INK });
  // a black-and-white picture: a tall tower
  const fx = -0.22 * w, fyy = h * 0.14, fw = 0.09 * w, fh = h * 0.2;
  frame(g, fx, fyy, fw, fh);
  g.rect(fx + 7, fyy + 7, fw - 14, fh - 14).fill(0xdcdcdc);
  g.poly([fx + fw * 0.5, fyy + fh * 0.15, fx + fw * 0.62, fyy + fh - 8, fx + fw * 0.38, fyy + fh - 8]).fill(0x3a3a3a);
  g.rect(fx + 7, fyy + fh * 0.78, fw - 14, fh * 0.22 - 7).fill(0x8d8d8d);
  // round dining table (its food is a surprise) and two chairs behind it
  const tx = -0.2 * w, ty = h * 0.57, tr = 0.1 * w;
  for (const cx of [tx - tr * 0.75, tx + tr * 0.75]) {
    g.moveTo(cx - 0.03 * w, ty).lineTo(cx - 0.03 * w, h * 0.42).arc(cx, h * 0.42, 0.03 * w, Math.PI, 0).lineTo(cx + 0.03 * w, ty);
    g.stroke({ width: 5, color: 0x1f1f1f });
    for (const lx of [cx - 0.025 * w, cx + 0.025 * w]) g.moveTo(lx, ty).lineTo(lx, fy + h * 0.03);
    g.stroke({ width: 4, color: 0x1f1f1f });
  }
  g.rect(tx - 5, ty, 10, fy + h * 0.05 - ty).fill(0x1f1f1f);
  g.ellipse(tx, fy + h * 0.05, tr * 0.4, 8).fill(0x1f1f1f);
  g.ellipse(tx, ty, tr, h * 0.025).fill(0x262626).stroke({ width: 3, color: INK });

  // right
  g.rect(w, 0, 0.55 * w, fy).fill(wall);
  darkFloor(g, w, 1.55 * w, h, fy);
  doorFrame(g, 1.04 * w, h * 0.1, 0.18 * w, fy - h * 0.1);
  // the stairs, going up to the right, with a black-and-white stripy runner
  const sx = 1.28 * w, steps = 7, stepH = (fy - h * 0.16) / steps, stepW = (0.27 * w) / steps;
  const outline: number[] = [sx, fy];
  for (let i = 0; i < steps; i++) {
    const x = sx + i * stepW, y = fy - (i + 1) * stepH;
    outline.push(x, y, x + stepW, y);
  }
  outline.push(1.55 * w, fy);
  g.poly(outline).fill(0xffffff).stroke({ width: 3, color: INK });
  for (let i = 0; i < steps; i++) {
    const x = sx + i * stepW, y = fy - (i + 1) * stepH;
    g.rect(x, y, stepW, stepH * 0.45).fill(0x1f1f1f);
    g.rect(x, y + stepH * 0.45, stepW, stepH * 0.55).fill(0xfbfbfb).stroke({ width: 1.5, color: 0xadb5bd });
  }
  // handrail
  g.moveTo(sx + stepW * 0.5, fy - stepH * 2.2).lineTo(1.55 * w, fy - (steps + 1.4) * stepH).stroke({ width: 7, color: 0x6b4226, cap: 'round' });
}

function darkFloor(g: Graphics, x0: number, x1: number, h: number, fy: number) {
  g.rect(x0, fy, x1 - x0, h - fy).fill(0x3b2620);
  for (let y = fy + 24; y < h; y += 30) g.moveTo(x0, y).lineTo(x1, y);
  g.stroke({ width: 2, color: 0x2a1b17 });
  g.rect(x0, fy - 6, x1 - x0, 12).fill(0xffffff).stroke({ width: 3, color: INK });
}

// ---------------------------------------------------------------------------
// Lounge. Left: the stairs up to the landing and the hallway with its doors.
// Right: a small mirror, a little black table with candles, the front door,
// coats on hooks, and slippers on the mat.
// ---------------------------------------------------------------------------
function lounge(g: Graphics, w: number, h: number) {
  const fy = h * 0.72;
  const wall = 0xe9ecef;
  // left: the hallway upstairs, then the stairs coming down into the lounge
  const landY = h * 0.42;
  g.rect(-0.6 * w, 0, 0.6 * w, fy).fill(wall);
  g.rect(-0.6 * w, h * 0.06, 0.42 * w, landY - h * 0.06).fill(0xc9ced6); // hallway, a bit darker
  g.rect(-0.6 * w, h * 0.06, 0.42 * w, 8).fill(0xb4bac4);
  doorFrame(g, -0.56 * w, h * 0.12, 0.1 * w, landY - h * 0.12); // a closed door
  doorFrame(g, -0.4 * w, h * 0.12, 0.1 * w, landY - h * 0.12); // an open bedroom door (see eggs/wide.ts)
  g.rect(-0.6 * w, landY, 0.44 * w, 14).fill(0x2a1b17); // landing floor
  g.rect(-0.6 * w, fy, 0.6 * w, h - fy).fill(0x3b2620);
  for (let y = fy + 24; y < h; y += 30) g.moveTo(-0.6 * w, y).lineTo(0, y);
  g.stroke({ width: 2, color: 0x2a1b17 });
  g.rect(-0.6 * w, fy - 6, 0.6 * w, 12).fill(0xffffff).stroke({ width: 3, color: INK });
  // steps down from the landing to the lounge floor
  const steps = 5, sx0 = -0.16 * w, sx1 = -0.02 * w, stepW = (sx1 - sx0) / steps, stepH = (fy - landY) / steps;
  const outline: number[] = [sx0, landY];
  for (let i = 0; i < steps; i++) {
    const x = sx0 + i * stepW, y = landY + i * stepH;
    outline.push(x + stepW, y, x + stepW, y + stepH);
  }
  outline.push(sx0, fy);
  g.poly(outline).fill(0xffffff).stroke({ width: 3, color: INK });
  for (let i = 0; i < steps; i++) {
    const x = sx0 + i * stepW, y = landY + i * stepH;
    g.rect(x, y - 2, stepW + 4, 10).fill(0x2a1b17);
  }
  // the half wall with a wooden handrail beside the stairs
  g.rect(-0.2 * w, landY - h * 0.08, 0.04 * w, fy - landY + h * 0.08).fill(0xffffff).stroke({ width: 3, color: INK });
  g.rect(-0.21 * w, landY - h * 0.09, 0.06 * w, 10).fill(0xffffff).stroke({ width: 2, color: INK });
  g.moveTo(-0.16 * w, landY - h * 0.06).lineTo(-0.02 * w, fy - h * 0.1).stroke({ width: 7, color: 0x8d5a3b, cap: 'round' });

  // right
  g.rect(w, 0, 0.6 * w, fy).fill(wall);
  darkFloor(g, w, 1.6 * w, h, fy);
  // small mirror in a dark wood frame
  g.rect(1.03 * w, h * 0.12, 0.08 * w, h * 0.2).fill(0xcfe3ee).stroke({ width: 8, color: 0x3e2723 });
  // little black table with iron legs (its candles are a surprise)
  const tx = 1.02 * w, ty = h * 0.5, tw = 0.12 * w;
  g.rect(tx, ty, tw, 12).fill(0x3e2723).stroke({ width: 3, color: INK });
  for (const lx of [tx + 10, tx + tw - 10]) g.moveTo(lx, ty + 12).lineTo(lx, fy + h * 0.04);
  g.stroke({ width: 5, color: 0x1f1f1f });
  g.circle(tx + tw / 2, ty + (fy - ty) * 0.55, (fy - ty) * 0.22).stroke({ width: 4, color: 0x1f1f1f });
  // the front door (it opens: see eggs/wide.ts) and its mat
  doorFrame(g, 1.2 * w, h * 0.1, 0.17 * w, fy - h * 0.1);
  g.rect(1.17 * w, fy + 6, 0.24 * w, h * 0.08).fill(0x7a6a58);
  // coats on hooks
  g.rect(1.43 * w, h * 0.18, 0.1 * w, 10).fill(0x6c757d).stroke({ width: 2, color: INK });
  g.poly([1.44 * w, h * 0.2, 1.48 * w, h * 0.2, 1.49 * w, h * 0.52, 1.43 * w, h * 0.52]).fill(0x1f1f1f).stroke({ width: 2, color: INK });
  g.poly([1.48 * w, h * 0.2, 1.52 * w, h * 0.2, 1.53 * w, h * 0.46, 1.47 * w, h * 0.46]).fill(0x2b2d42).stroke({ width: 2, color: INK });
  g.roundRect(1.5 * w, h * 0.44, 0.05 * w, h * 0.1, 6).fill(0x52b788).stroke({ width: 2, color: INK }); // shopping bag
  g.circle(1.4 * w, 0, 0.02 * w).fill(0xfff3c4).stroke({ width: 2, color: INK }); // ceiling light
}
