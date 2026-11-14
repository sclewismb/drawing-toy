import type { Graphics } from 'pixi.js';
import { ceilingLight, roomShade, rug } from './depth';
import { INK, seeded } from './places';

/**
 * The Christmas wrapping shop (only on the map in winter). Wide like the
 * rooms:
 *   left:   the ribbon wall (spools on pegs), a bin of paper rolls, a barrel of bows
 *   middle: the big wrapping counter with an empty box on it (drop anything
 *           in to wrap it up), a snowy window, shelves of wrapped presents
 *   right:  the sleigh with its sack (wrapped presents fly in, off to the
 *           house's Christmas tree), the door out with a wreath
 * Everything that moves or can be tapped is in eggs/wrapShop.ts.
 */
export const WRAPSHOP = { left: 0.6, right: 0.78, floor: 0.74 };

/** Where things are (shared with the surprises). */
export function wrapShopLayout(w: number, h: number) {
  const fy = h * WRAPSHOP.floor;
  return {
    fy,
    counter: { x0: 0.27 * w, x1: 0.73 * w, top: h * 0.6 },
    box: { x: 0.5 * w, y: h * 0.6 },
    window: { x: 0.37 * w, y: h * 0.1, w: 0.26 * w, h: h * 0.3 },
    shelves: [0.2, 0.36, 0.52].map((f) => h * f),
    shelfL: { x0: 0.04 * w, x1: 0.24 * w },
    shelfR: { x0: 0.76 * w, x1: 0.96 * w },
    roll: { x: 0.31 * w, y: h * 0.6 }, // the paper roll on its stand, on the counter
    tape: { x: 0.65 * w, y: h * 0.6 },
    scissors: { x: 0.7 * w, y: h * 0.6 },
    elf: { x: 0.6 * w, y: h * 0.6 },
    pegboard: { x: -0.52 * w, y: h * 0.12, w: 0.3 * w, h: h * 0.32 },
    bin: { x0: -0.5 * w, x1: -0.26 * w, top: fy - h * 0.16 },
    bows: { x: -0.11 * w, y: fy + h * 0.02, r: Math.min(0.07 * w, h * 0.1) },
    // the sleigh stands on the floor at the right of the main view, so presents can be seen flying in
    sleigh: { x0: 0.8 * w, x1: 1.18 * w, y: fy + h * 0.12 },
    sack: { x: 1.09 * w, y: fy - h * 0.0 },
    door: { x: 1.42 * w, y: h * 0.16, w: 0.22 * w },
    house: { x: 1.53 * w, y: h * 0.08 },
  };
}

export function drawWrapShop(g: Graphics, w: number, h: number) {
  const L = wrapShopLayout(w, h);
  const fy = L.fy;
  const x0 = -WRAPSHOP.left * w, x1 = (1 + WRAPSHOP.right) * w;
  const rnd = seeded(31);

  // --- walls: pale mint with little red and gold diamonds, wood panels below ---
  g.rect(x0, 0, x1 - x0, fy).fill(0xe6f5ec);
  for (let y = h * 0.07, row = 0; y < h * 0.5; y += h * 0.08, row++) {
    for (let x = x0 + (row % 2) * 34; x < x1; x += 68) {
      g.poly([x, y - 6, x + 5, y, x, y + 6, x - 5, y]).fill(row % 2 ? 0xf2c94c : 0xe5737a);
    }
  }
  const panelTop = h * 0.52;
  g.rect(x0, panelTop, x1 - x0, fy - panelTop).fill(0xb7794a);
  g.rect(x0, panelTop - 8, x1 - x0, 10).fill(0x8d5a3b).stroke({ width: 2.5, color: INK });
  for (let x = x0 + 30; x < x1; x += 110) g.roundRect(x, panelTop + 14, 80, fy - panelTop - 34, 6).stroke({ width: 3, color: 0x8d5a3b });
  // skirting and a warm wooden floor
  g.rect(x0, fy - 12, x1 - x0, 12).fill(0x6f4329).stroke({ width: 2, color: INK });
  g.rect(x0, fy, x1 - x0, h - fy).fill(0xd8a878);
  for (let y = fy + (h - fy) * 0.25; y < h; y += (h - fy) * 0.25) g.moveTo(x0, y).lineTo(x1, y);
  g.stroke({ width: 2, color: 0xbf8f5f });
  for (let y = fy, row = 0; y < h; y += (h - fy) * 0.25, row++) {
    for (let x = x0 + (row % 2) * 80 + rnd() * 40; x < x1; x += 160) g.moveTo(x, y).lineTo(x, y + (h - fy) * 0.25);
  }
  g.stroke({ width: 2, color: 0xbf8f5f });
  // a big red rug in front of the counter
  rug(g, 0.5 * w, fy + (h - fy) * 0.55, 0.32 * w, (h - fy) * 0.3, 0xd64550, 0xf2c94c);
  for (const x of [0.2 * w, 0.8 * w, -0.3 * w, 1.3 * w]) ceilingLight(g, x, h);

  // --- the middle: a snowy window with a sign over it, shelves of presents either side ---
  const wn = L.window;
  g.rect(wn.x, wn.y, wn.w, wn.h).fill(0x9fc5e8);
  // outside: snowy hills and a snowy tree (the snow falling is in the eggs)
  g.moveTo(wn.x, wn.y + wn.h * 0.7).quadraticCurveTo(wn.x + wn.w * 0.3, wn.y + wn.h * 0.5, wn.x + wn.w * 0.6, wn.y + wn.h * 0.68).quadraticCurveTo(wn.x + wn.w * 0.85, wn.y + wn.h * 0.78, wn.x + wn.w, wn.y + wn.h * 0.62).lineTo(wn.x + wn.w, wn.y + wn.h).lineTo(wn.x, wn.y + wn.h).closePath().fill(0xffffff);
  const tx = wn.x + wn.w * 0.75, ty = wn.y + wn.h * 0.72;
  g.poly([tx, ty - wn.h * 0.42, tx + wn.w * 0.1, ty, tx - wn.w * 0.1, ty]).fill(0x2f7a4f);
  g.poly([tx, ty - wn.h * 0.42, tx + wn.w * 0.04, ty - wn.h * 0.26, tx - wn.w * 0.04, ty - wn.h * 0.26]).fill(0xffffff);
  g.rect(wn.x, wn.y, wn.w, wn.h).stroke({ width: 10, color: 0xffffff });
  g.rect(wn.x - 5, wn.y - 5, wn.w + 10, wn.h + 10).stroke({ width: 3, color: INK });
  g.moveTo(wn.x + wn.w / 2, wn.y).lineTo(wn.x + wn.w / 2, wn.y + wn.h).moveTo(wn.x, wn.y + wn.h / 2).lineTo(wn.x + wn.w, wn.y + wn.h / 2).stroke({ width: 6, color: 0xffffff });
  g.rect(wn.x - 20, wn.y + wn.h + 4, wn.w + 40, 12).fill(0xffffff).stroke({ width: 2.5, color: INK }); // the sill
  // the shop's sign: a big present with a bow (no words)
  const sx = 0.5 * w, sy = h * 0.035;
  g.roundRect(sx - 0.1 * w, sy, 0.2 * w, h * 0.05, 10).fill(0xd64550).stroke({ width: 3, color: INK });
  for (const k of [-1, 1]) g.circle(sx + k * 0.07 * w, sy + h * 0.025, 6).fill(0xf2c94c).stroke({ width: 2, color: INK });
  g.rect(sx - 16, sy + 4, 32, h * 0.04).fill(0x2f9e44).stroke({ width: 2, color: INK });
  g.rect(sx - 4, sy + 4, 8, h * 0.04).fill(0xf2c94c);
  // shelves
  for (const side of [L.shelfL, L.shelfR]) {
    for (const y of L.shelves) g.rect(side.x0, y, side.x1 - side.x0, 12).fill(0xffffff).stroke({ width: 3, color: INK });
    for (const x of [side.x0 + 10, side.x1 - 22]) for (const y of L.shelves) g.poly([x, y + 12, x + 12, y + 12, x + 6, y + 26]).fill(0xdee2e6).stroke({ width: 2, color: INK });
  }

  // --- the wrapping counter ---
  const ct = L.counter;
  g.rect(ct.x0, ct.top, ct.x1 - ct.x0, fy - ct.top + 6).fill(0xd64550).stroke({ width: 4, color: INK });
  // gold trim and a big painted bow on its front
  g.rect(ct.x0, ct.top + 14, ct.x1 - ct.x0, 8).fill(0xf2c94c);
  g.rect(ct.x0, fy - 18, ct.x1 - ct.x0, 8).fill(0xf2c94c);
  const bx = (ct.x0 + ct.x1) / 2, by = (ct.top + fy) / 2 + 6;
  g.rect(bx - 10, ct.top + 22, 20, fy - ct.top - 40).fill(0xf2c94c);
  g.moveTo(bx, by).bezierCurveTo(bx - 40, by - 34, bx - 70, by - 4, bx - 46, by + 14).closePath().fill(0xf2c94c).stroke({ width: 3, color: INK });
  g.moveTo(bx, by).bezierCurveTo(bx + 40, by - 34, bx + 70, by - 4, bx + 46, by + 14).closePath().fill(0xf2c94c).stroke({ width: 3, color: INK });
  g.circle(bx, by, 10).fill(0xf2c94c).stroke({ width: 3, color: INK });
  // the counter top
  g.roundRect(ct.x0 - 12, ct.top - 16, ct.x1 - ct.x0 + 24, 22, 8).fill(0xf4ead5).stroke({ width: 4, color: INK });

  // --- left: the ribbon wall (the spools are eggs), a bin of paper rolls ---
  const pb = L.pegboard;
  g.roundRect(pb.x, pb.y, pb.w, pb.h, 10).fill(0xf4d6a0).stroke({ width: 4, color: INK });
  for (let x = pb.x + 18; x < pb.x + pb.w - 8; x += 26) for (let y = pb.y + 18; y < pb.y + pb.h - 8; y += 26) g.circle(x, y, 2.5).fill(0xc9a46a);
  const bin = L.bin;
  // the back of the bin (the rolls stand in it: see eggs), then its front comes in the eggs too
  g.rect(bin.x0, bin.top, bin.x1 - bin.x0, fy - bin.top + 4).fill(0x8d5a3b).stroke({ width: 4, color: INK });

  // --- right: the door out (the sleigh and the sack are eggs) ---
  const d = L.door;
  g.rect(d.x - 12, d.y - 12, d.w + 24, fy - d.y + 12).fill(0xffffff).stroke({ width: 3, color: INK });
  g.rect(d.x, d.y, d.w / 2, fy - d.y).rect(d.x + d.w / 2, d.y, d.w / 2, fy - d.y).fill(0x2f7a4f).stroke({ width: 3, color: INK });
  for (const k of [0, 1]) {
    const px = d.x + k * (d.w / 2);
    g.rect(px + d.w * 0.06, d.y + (fy - d.y) * 0.08, d.w * 0.38, (fy - d.y) * 0.3).fill(0xbfe8ff).stroke({ width: 3, color: INK });
    g.roundRect(px + d.w * 0.06, d.y + (fy - d.y) * 0.5, d.w * 0.38, (fy - d.y) * 0.38, 6).stroke({ width: 3, color: 0x1f5a39 });
  }
  g.circle(d.x + d.w / 2 - 10, d.y + (fy - d.y) * 0.46, 5).circle(d.x + d.w / 2 + 10, d.y + (fy - d.y) * 0.46, 5).fill(0xf2c94c).stroke({ width: 2, color: INK });
  // over the door: a round picture of a house with a Christmas tree in the window (where the presents go)
  const hs = L.house, r = Math.min(0.065 * w, h * 0.065);
  g.circle(hs.x, hs.y, r).fill(0xfff9ec).stroke({ width: 4, color: 0xf2c94c });
  g.circle(hs.x, hs.y, r + 4).stroke({ width: 2.5, color: INK });
  g.rect(hs.x - r * 0.45, hs.y - r * 0.1, r * 0.9, r * 0.6).fill(0xffd6a5).stroke({ width: 2.5, color: INK });
  g.poly([hs.x - r * 0.6, hs.y - r * 0.1, hs.x, hs.y - r * 0.62, hs.x + r * 0.6, hs.y - r * 0.1]).fill(0xd64550).stroke({ width: 2.5, color: INK });
  g.rect(hs.x - r * 0.3, hs.y + r * 0.02, r * 0.3, r * 0.26).fill(0xbfe8ff).stroke({ width: 2, color: INK });
  g.poly([hs.x - r * 0.15, hs.y + r * 0.04, hs.x - r * 0.05, hs.y + r * 0.26, hs.x - r * 0.25, hs.y + r * 0.26]).fill(0x2f9e44);
  g.rect(hs.x + r * 0.08, hs.y + r * 0.12, r * 0.2, r * 0.38).fill(0x8d5a3b).stroke({ width: 2, color: INK });
  // and a little dotted trail of hearts from the sleigh up to it
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const px = L.sack.x + (hs.x - r - L.sack.x) * t, py = L.sack.y - h * 0.18 + (hs.y + r * 0.6 - (L.sack.y - h * 0.18)) * t - Math.sin(t * Math.PI) * h * 0.08;
    g.circle(px, py, 4).fill({ color: 0xd64550, alpha: 0.5 });
  }

  roomShade(g, x0, x1, h, fy);
}
