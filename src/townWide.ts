import type { Graphics } from 'pixi.js';
import { frame, INK, windowView } from './places';
import { hillDots, PALETTE, type Season } from './seasons';

/**
 * The new parts either side of the town places (made up, like the places
 * themselves). Coordinates as in the wide rooms: x = 0..w is the original
 * view; the left part is negative x, the right part beyond w. Things that
 * move or can be tapped are in eggs/townWide.ts.
 */
export const TOWN_WIDE = {
  fire: { left: 0.6, right: 0.7 },
  police: { left: 0.6, right: 0.6 },
  school: { left: 0.6, right: 0.7 },
  park: { left: 0.7, right: 0.7 },
};

function wallFloor(g: Graphics, x0: number, x1: number, h: number, fy: number, wall: number, floor: number) {
  g.rect(x0, 0, x1 - x0, fy).fill(wall);
  g.rect(x0, fy, x1 - x0, h - fy).fill(floor);
  g.rect(x0, fy - 8, x1 - x0, 16).fill(0xffffff).stroke({ width: 4, color: INK });
}

function bricks(g: Graphics, x0: number, x1: number, fy: number) {
  const bh = 34, bw = 80;
  for (let row = 0, y = 0; y < fy - 8; row++, y += bh) {
    g.moveTo(x0, y).lineTo(x1, y);
    for (let x = x0 + (row % 2) * (bw / 2); x < x1; x += bw) g.moveTo(x, y).lineTo(x, y + bh);
  }
  g.stroke({ width: 3, color: 0x9d3a2f });
}

/** Fire station: the crew's lockers and coats (left), and the station kitchen (right). */
export function fireWide(g: Graphics, w: number, h: number) {
  const fy = h * 0.74;
  for (const [x0, x1] of [[-0.6 * w, 0], [w, 1.7 * w]]) {
    wallFloor(g, x0, x1, h, fy, 0xc75146, 0xb0b0b0);
    bricks(g, x0, x1, fy);
    for (let x = x0; x < x1; x += 60) g.poly([x, h * 0.95, x + 30, h * 0.95, x + 50, h, x + 20, h]).fill(0xffd93d);
  }
  // a bench by the lockers
  g.rect(-0.5 * w, h * 0.62, 0.26 * w, 14).fill(0xa47e4b).stroke({ width: 3, color: INK });
  g.rect(-0.48 * w, h * 0.62 + 14, 12, fy - h * 0.62 - 14).rect(-0.26 * w, h * 0.62 + 14, 12, fy - h * 0.62 - 14).fill(0x6b4226);
  // coat hooks
  g.rect(-0.2 * w, h * 0.22, 0.16 * w, 10).fill(0x6c757d).stroke({ width: 2, color: INK });
  // right: the kitchen: a window, worktop, stove and a table
  const wx = 1.28 * w, wy = h * 0.14, ww = 0.17 * w, wh = h * 0.24;
  windowView(g, wx, wy, ww, wh);
  g.rect(wx, wy, ww, wh).stroke({ width: 8, color: 0xffffff }).rect(wx, wy, ww, wh).stroke({ width: 3, color: INK });
  g.rect(1.03 * w, h * 0.48, 0.2 * w, fy - h * 0.48).fill(0xdee2e6).stroke({ width: 4, color: INK }); // worktop cupboards
  g.rect(1.02 * w, h * 0.46, 0.22 * w, 16).fill(0x6c757d).stroke({ width: 3, color: INK });
  g.rect(1.15 * w, h * 0.5, 0.07 * w, h * 0.18).fill(0x343a40).stroke({ width: 3, color: INK }); // oven door
  for (const bx of [1.06, 1.12]) g.ellipse(bx * w, h * 0.46, 22, 6).stroke({ width: 4, color: 0x1f1f1f }); // burners
  g.rect(1.38 * w, h * 0.56, 0.18 * w, 14).fill(0xa47e4b).stroke({ width: 3, color: INK }); // table
  g.rect(1.4 * w, h * 0.56 + 14, 10, fy - h * 0.56 - 14).rect(1.53 * w, h * 0.56 + 14, 10, fy - h * 0.56 - 14).fill(0x6b4226);
  for (const [i, mx] of [1.42, 1.47, 1.52].entries()) g.roundRect(mx * w, h * 0.52, 22, 26, 4).fill([0xe5383b, 0xffd166, 0x4ea8ff][i]).stroke({ width: 2, color: INK });
  // the fire dog's bed
  g.ellipse(1.63 * w, fy + h * 0.06, 0.06 * w, h * 0.035).fill(0xe5383b).stroke({ width: 4, color: INK });
  g.ellipse(1.63 * w, fy + h * 0.055, 0.045 * w, h * 0.022).fill(0xffd6a5);
}

/** Police station: the front desk and lost-and-found (left), the garage with a traffic light (right). */
export function policeWide(g: Graphics, w: number, h: number) {
  const fy = h * 0.72;
  for (const [x0, x1] of [[-0.6 * w, 0], [w, 1.6 * w]]) {
    wallFloor(g, x0, x1, h, fy, 0xcfe1ff, 0x7d8597);
    for (let x = x0; x < x1; x += 70) g.moveTo(x, fy).lineTo(x - 40, h).stroke({ width: 3, color: 0x5c6273 });
  }
  // wanted posters: cheeky animals
  const poster = (x: number, y: number, face: number, ear: number) => {
    g.rect(x, y, 70, 90).fill(0xfff3e6).stroke({ width: 3, color: INK });
    g.circle(x + 35, y + 44, 22).fill(face).stroke({ width: 2, color: INK });
    g.poly([x + 15, y + 30, x + 20, y + 12, x + 30, y + 26]).poly([x + 55, y + 30, x + 50, y + 12, x + 40, y + 26]).fill(ear).stroke({ width: 2, color: INK });
    g.rect(x + 18, y + 36, 34, 10).fill(0x1f1f1f); // a robber's mask
    g.circle(x + 28, y + 41, 2.5).circle(x + 42, y + 41, 2.5).fill(0xffffff);
    g.rect(x + 10, y + 74, 50, 6).fill(0xe5383b);
  };
  poster(-0.55 * w, h * 0.14, 0x9e9e9e, 0x757575);
  poster(-0.45 * w, h * 0.14, 0xf4a261, 0xd9822b);
  // the front desk (its bell is a surprise)
  g.rect(-0.38 * w, h * 0.5, 0.26 * w, fy - h * 0.5).fill(0x3d5a80).stroke({ width: 4, color: INK });
  g.rect(-0.39 * w, h * 0.48, 0.28 * w, 18).fill(0xdee2e6).stroke({ width: 3, color: INK });
  g.star(-0.25 * w, h * 0.6, 5, 20, 10).fill(0xffd93d).stroke({ width: 3, color: INK });
  // right: the garage door, a traffic light pole
  g.rect(1.15 * w, h * 0.12, 0.34 * w, fy - h * 0.12).fill(0x495057).stroke({ width: 6, color: INK });
  g.rect(1.12 * w, fy, 0.4 * w, h * 0.06).fill(0x6c757d);
  g.rect(1.06 * w - 5, h * 0.3, 10, fy - h * 0.3).fill(0x343a40).stroke({ width: 2, color: INK });
}

/** School: coat pegs, backpacks and the class pet (left); art and music corner (right). */
export function schoolWide(g: Graphics, w: number, h: number) {
  const fy = h * 0.72;
  for (const [x0, x1] of [[-0.6 * w, 0], [w, 1.7 * w]]) wallFloor(g, x0, x1, h, fy, 0xfff3b0, 0xc68b59);
  // coat pegs
  g.rect(-0.56 * w, h * 0.2, 0.3 * w, 12).fill(0x8d5524).stroke({ width: 3, color: INK });
  for (let i = 0; i < 6; i++) g.circle(-0.54 * w + i * 0.052 * w, h * 0.2 + 18, 6).fill(0xffd166).stroke({ width: 2, color: INK });
  // cubby shelves with books
  const sx = -0.55 * w, sy = h * 0.5, sw = 0.28 * w;
  g.rect(sx, sy, sw, fy - sy).fill(0xe9c46a).stroke({ width: 4, color: INK });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const cx = sx + 8 + (c * (sw - 16)) / 4, cy = sy + 8 + (r * (fy - sy - 16)) / 2;
      g.rect(cx, cy, (sw - 16) / 4 - 6, (fy - sy - 16) / 2 - 6).fill(0xfff3e6).stroke({ width: 2, color: INK });
      g.rect(cx + 6, cy + 10, 10, (fy - sy) / 2 - 30).rect(cx + 18, cy + 14, 8, (fy - sy) / 2 - 34).fill([0xe5383b, 0x4ea8ff, 0x7bd36b, 0xb07de8][(r + c) % 4]);
    }
  }
  // the pet's table
  g.rect(-0.2 * w, h * 0.52, 0.17 * w, 14).fill(0xa47e4b).stroke({ width: 3, color: INK });
  g.rect(-0.19 * w, h * 0.52 + 14, 10, fy - h * 0.52 - 14).rect(-0.05 * w, h * 0.52 + 14, 10, fy - h * 0.52 - 14).fill(0x6b4226);
  // right: a sink for paint brushes, a table for the xylophone, a rug
  g.rect(1.05 * w, h * 0.5, 0.12 * w, fy - h * 0.5).fill(0xdee2e6).stroke({ width: 4, color: INK });
  g.rect(1.04 * w, h * 0.48, 0.14 * w, 16).fill(0xffffff).stroke({ width: 3, color: INK });
  for (const [i, px] of [1.06, 1.1, 1.14].entries()) g.roundRect(px * w, h * 0.43, 26, 22, 4).fill([0xe5383b, 0x4ea8ff, 0xffd166][i]).stroke({ width: 2, color: INK });
  g.rect(1.42 * w, h * 0.56, 0.24 * w, 14).fill(0xa47e4b).stroke({ width: 3, color: INK });
  g.rect(1.43 * w, h * 0.56 + 14, 10, fy - h * 0.56 - 14).rect(1.64 * w, h * 0.56 + 14, 10, fy - h * 0.56 - 14).fill(0x6b4226);
  g.ellipse(1.35 * w, h * 0.88, 0.16 * w, h * 0.06).fill(0x9fd8e8).stroke({ width: 4, color: 0x7cc3d6 });
  // music notes painted on the wall
  for (const [nx, ny] of [[1.45, 0.2], [1.55, 0.28], [1.62, 0.16]]) {
    g.circle(nx * w, ny * h, 10).fill(0x3a3a3a);
    g.rect(nx * w + 7, ny * h - 40, 4, 40).fill(0x3a3a3a);
  }
}

/** Park: the playground (left), the fountain and the ice-cream cart (right). */
export function parkWide(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  for (const [x0, x1, cx] of [[-0.7 * w, 0, -0.35 * w], [w, 1.7 * w, 1.35 * w]]) {
    g.ellipse(cx, h * 0.73, w * 0.42, h * 0.2).fill(pal.hillBack);
    hillDots(g, cx, h * 0.73, w * 0.42, h * 0.2, pal.dots, 11);
    g.rect(x0, h * 0.7, x1 - x0, h * 0.3).fill(pal.grass);
    if (season === 'winter') g.rect(x0, h * 0.7, x1 - x0, 4).fill(0xc9d6e3);
  }
  // playground: bark underneath, and the swing frame (its swings move: see eggs)
  g.ellipse(-0.42 * w, h * 0.86, 0.26 * w, h * 0.07).fill(season === 'winter' ? 0xf1f5f9 : 0xc68b59);
  const sx0 = -0.6 * w, sx1 = -0.3 * w, top = h * 0.36;
  g.moveTo(sx0, h * 0.86).lineTo(sx0 + 30, top).lineTo(sx0 + 60, h * 0.86).moveTo(sx1, h * 0.86).lineTo(sx1 - 30, top).lineTo(sx1 - 60, h * 0.86).stroke({ width: 12, color: INK, cap: 'round' });
  g.moveTo(sx0, h * 0.86).lineTo(sx0 + 30, top).lineTo(sx0 + 60, h * 0.86).moveTo(sx1, h * 0.86).lineTo(sx1 - 30, top).lineTo(sx1 - 60, h * 0.86).stroke({ width: 6, color: 0xe5383b, cap: 'round' });
  g.moveTo(sx0 + 20, top).lineTo(sx1 - 20, top).stroke({ width: 12, color: INK, cap: 'round' });
  g.moveTo(sx0 + 20, top).lineTo(sx1 - 20, top).stroke({ width: 6, color: 0xffd166, cap: 'round' });
  // the seesaw's middle (its plank rocks: see eggs)
  g.poly([-0.14 * w - 20, h * 0.86, -0.14 * w, h * 0.8, -0.14 * w + 20, h * 0.86]).fill(0x4ea8ff).stroke({ width: 3, color: INK });
  // right: the fountain basin
  const fx = 1.25 * w;
  g.ellipse(fx, h * 0.8, 0.12 * w, h * 0.045).fill(0xbdb5a6).stroke({ width: 4, color: INK });
  g.ellipse(fx, h * 0.79, 0.1 * w, h * 0.03).fill(season === 'winter' ? 0xd6eef8 : 0x6ec6ff);
  g.rect(fx - 10, h * 0.68, 20, h * 0.1).fill(0xbdb5a6).stroke({ width: 3, color: INK });
  g.ellipse(fx, h * 0.68, 0.035 * w, h * 0.014).fill(0xbdb5a6).stroke({ width: 3, color: INK });
  // flower beds and a lamp post
  for (const [i, bx] of [1.05, 1.45].entries()) {
    g.ellipse(bx * w, h * 0.9, 0.07 * w, h * 0.03).fill(0x8d5524);
    for (let k = 0; k < 6; k++) g.circle(bx * w - 0.05 * w + k * 0.02 * w, h * 0.885 - (k % 2) * 8, 7).fill(season === 'winter' ? 0xffffff : [0xff8fb1, 0xffd166, 0xb07de8][(k + i) % 3]).stroke({ width: 1.5, color: INK });
  }
  g.rect(1.66 * w - 5, h * 0.4, 10, h * 0.32).fill(0x2b2d42);
  g.roundRect(1.66 * w - 16, h * 0.36, 32, 30, 6).fill(0xfff3b0).stroke({ width: 3, color: INK });
  void frame;
}
