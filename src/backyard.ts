import type { Graphics } from 'pixi.js';
import { INK, seeded } from './places';
import { PALETTE, type Season } from './seasons';

/**
 * The back garden (drawn after the family's panorama photo, without any
 * people). Like the wide rooms, x = 0..w is the middle part (the lawn with
 * the big spruce), the left part (negative x) runs to the side of the house,
 * and the right part (beyond w) has the gazebo, the barbecue and the patio.
 * Things that move or can be tapped are in eggs/backyard.ts.
 */
export const YARD = {
  left: 0.75,
  right: 0.95,
  horizon: 0.56, // where the lawn meets the back fence
};

export function drawBackyard(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const x0 = -YARD.left * w, x1 = (1 + YARD.right) * w;
  const hz = h * YARD.horizon;
  const winter = season === 'winter';
  const treeGreen = winter ? 0x3a7d5c : 0x2d6a4f;
  const treeDark = winter ? 0x2f6a4c : 0x1f5039;

  // sky, sun, clouds
  g.rect(x0, 0, x1 - x0, hz).fill(pal.sky);
  g.circle(w * 0.84, h * 0.12, Math.min(w, h) * 0.07 * pal.sunSize).fill(pal.sun);
  for (const [cx, cy, s] of [[-0.4, 0.1, 1], [0.15, 0.08, 0.8], [0.6, 0.18, 0.6], [1.3, 0.1, 0.9], [1.7, 0.16, 0.7]]) {
    const x = w * cx, y = h * cy, r = Math.min(w, h) * 0.045 * s;
    g.circle(x, y, r).circle(x + r, y - r * 0.4, r * 1.2).circle(x + r * 2.1, y, r).fill(pal.cloud);
  }

  // a far-off row of trees and the neighbours' roofs over the back fence
  const rnd = seeded(31);
  for (let x = x0; x < x1; x += 40 + rnd() * 50) {
    const th = h * (0.1 + rnd() * 0.12);
    g.poly([x - 26, hz - h * 0.04, x, hz - h * 0.04 - th, x + 26, hz - h * 0.04]).fill(winter ? 0x6b9080 : 0x52796f);
  }
  g.rect(w * 1.05, hz - h * 0.12, w * 0.16, h * 0.08).fill(0xf1e3d3).stroke({ width: 2, color: INK });
  g.poly([w * 1.03, hz - h * 0.12, w * 1.13, hz - h * 0.18, w * 1.23, hz - h * 0.12]).fill(0x8d6e63).stroke({ width: 2, color: INK });

  // the back fence
  g.rect(x0, hz - h * 0.07, x1 - x0, h * 0.075).fill(0xb08968);
  for (let x = x0; x < x1; x += 22) g.moveTo(x, hz - h * 0.07).lineTo(x, hz);
  g.stroke({ width: 2, color: 0x8d6e4f });
  g.rect(x0, hz - h * 0.07, x1 - x0, 5).fill(0x8d6e4f);

  // the lawn (white in winter), with mowing stripes
  g.rect(x0, hz, x1 - x0, h - hz).fill(pal.grass);
  if (!winter) {
    for (let i = 0; i < 6; i++) {
      const y = hz + (h - hz) * (i / 6);
      if (i % 2) g.rect(x0, y, x1 - x0, (h - hz) / 6).fill({ color: 0x000000, alpha: 0.035 });
    }
  }

  // tall spruces along the back
  const spruce = (x: number, base: number, ht: number, wd: number) => {
    g.rect(x - wd * 0.06, base - ht * 0.2, wd * 0.12, ht * 0.2).fill(0x6b4226);
    for (let i = 0; i < 5; i++) {
      const y = base - ht * 0.12 - i * ht * 0.17;
      const ww = wd * (1 - i * 0.17);
      g.poly([x - ww / 2, y, x, y - ht * 0.3, x + ww / 2, y]).fill(i % 2 ? treeGreen : treeDark).stroke({ width: 2, color: INK });
      if (winter) g.ellipse(x, y - ht * 0.26, ww * 0.18, 5).fill(0xffffff);
    }
  };
  for (const [fx, s] of [[-0.62, 0.9], [-0.48, 1.05], [-0.34, 0.85], [-0.18, 1], [0.08, 0.8], [0.22, 0.95], [0.9, 0.85], [1.08, 0.7]]) {
    spruce(w * fx, hz + h * 0.02, h * 0.5 * s, w * 0.11 * s);
  }

  // far off: a trampoline and a little swing set (tap them: see eggs)
  g.ellipse(w * 0.16, hz + h * 0.04, w * 0.05, h * 0.012).fill(0x2b2d42).stroke({ width: 2, color: 0x4ea8ff });
  for (const lx of [-0.04, 0.04]) g.moveTo(w * (0.16 + lx), hz + h * 0.045).lineTo(w * (0.16 + lx), hz + h * 0.06);
  g.stroke({ width: 2, color: 0x4ea8ff });

  // the sandbox at the foot of the big spruce
  const sx = w * 0.3, sy = h * 0.64, sw = w * 0.14, sh = h * 0.07;
  g.poly([sx + sw * 0.1, sy, sx + sw, sy, sx + sw * 0.92, sy + sh, sx, sy + sh]).fill(0xc68b59).stroke({ width: 3, color: INK });
  g.poly([sx + sw * 0.16, sy + 6, sx + sw * 0.94, sy + 6, sx + sw * 0.88, sy + sh - 8, sx + sw * 0.08, sy + sh - 8]).fill(winter ? 0xf1f5f9 : 0xf4d79b);

  // the big spruce in the middle (its swing and bird feeder are surprises)
  const bx = w * 0.55;
  g.rect(bx - 12, h * 0.3, 24, h * 0.36).fill(0x6b4226).stroke({ width: 3, color: INK });
  for (let i = 0; i < 6; i++) {
    const y = h * (0.5 - i * 0.085);
    const ww = w * (0.36 - i * 0.05);
    g.poly([bx - ww / 2, y, bx, y - h * 0.16, bx + ww / 2, y]).fill(i % 2 ? treeGreen : treeDark).stroke({ width: 3, color: INK });
    if (winter) g.ellipse(bx, y - h * 0.14, ww * 0.16, 6).fill(0xffffff);
  }
  g.moveTo(bx + 8, h * 0.47).lineTo(w * 0.66, h * 0.43).stroke({ width: 7, color: 0x6b4226, cap: 'round' }); // the swing's branch

  // the putting green
  const px = w * 0.62, py = h * 0.8;
  g.poly([px, py, px + w * 0.2, py - h * 0.02, px + w * 0.23, py + h * 0.12, px + w * 0.03, py + h * 0.15]).fill(0x52b788).stroke({ width: 3, color: 0x2d6a4f });
  g.ellipse(px + w * 0.17, py + h * 0.02, 10, 5).fill(0x1f1f1f);

  // --- left: the side of the house, a downpipe with a black hose, a planter of sand toys ---
  const hx = -0.75 * w, hw = 0.14 * w, hb = h * 0.88;
  g.rect(hx, 0, hw, hb).fill(0xf4f1ea).stroke({ width: 3, color: INK });
  for (let y = h * 0.08; y < hb - h * 0.2; y += 16) g.moveTo(hx, y).lineTo(hx + hw, y);
  g.stroke({ width: 1.5, color: 0xd6d1c4 });
  g.rect(hx, hb - h * 0.2, hw, h * 0.2).fill(0xbdb5a6).stroke({ width: 3, color: INK }); // concrete base
  g.poly([hx, 0, hx + hw + 30, 0, hx + hw + 30, h * 0.05, hx, h * 0.07]).fill(0x2b2d42); // eave
  g.rect(hx + hw * 0.2, h * 0.16, hw * 0.55, h * 0.26).fill(0xffffff).stroke({ width: 4, color: 0x1f1f1f }); // window frame
  g.rect(hx + hw - 10, h * 0.06, 10, h * 0.66).fill(0xdee2e6).stroke({ width: 2, color: INK }); // downpipe
  g.moveTo(hx + hw - 5, h * 0.72).bezierCurveTo(hx + hw + 20, h * 0.78, hx + hw + 60, h * 0.72, hx + hw + w * 0.12, h * 0.76).stroke({ width: 9, color: 0x1f1f1f, cap: 'round' });

  // --- right: side fence, gazebo with a picnic table, barbecue, patio, outdoor TV room ---
  // patio paving
  g.poly([w * 1.08, hz + h * 0.06, x1, hz + h * 0.06, x1, h, w * 1.0, h]).fill(winter ? 0xe9eef3 : 0xcfd4da);
  for (let x = w * 1.12; x < x1; x += w * 0.09) g.moveTo(x, hz + h * 0.06).lineTo(x - w * 0.04, h);
  g.stroke({ width: 2, color: 0xb8bec5 });
  // the tall wooden side fence
  g.rect(w * 1.0, hz - h * 0.16, w * 0.62, h * 0.18).fill(0xc08b5c).stroke({ width: 3, color: INK });
  for (let x = w * 1.0; x < w * 1.62; x += 14) g.moveTo(x, hz - h * 0.16).lineTo(x, hz + h * 0.02);
  g.stroke({ width: 1.5, color: 0x9c6b42 });
  // the gazebo: dark roof on four posts, picnic table and benches
  const gx = w * 1.1, gw = w * 0.3, gy = h * 0.3;
  for (const fx of [0.04, 0.96]) g.rect(gx + gw * fx - 6, gy + h * 0.08, 12, h * 0.4).fill(0x2b2d42).stroke({ width: 2, color: INK });
  g.poly([gx - 20, gy + h * 0.09, gx + gw * 0.25, gy, gx + gw * 0.75, gy, gx + gw + 20, gy + h * 0.09]).fill(0x3d405b).stroke({ width: 3, color: INK });
  g.poly([gx + gw * 0.3, gy, gx + gw * 0.4, gy - h * 0.05, gx + gw * 0.6, gy - h * 0.05, gx + gw * 0.7, gy]).fill(0x2b2d42).stroke({ width: 3, color: INK });
  g.rect(gx - 20, gy + h * 0.09, gw + 40, 8).fill(0x2b2d42);
  const ty = h * 0.66;
  g.rect(gx + gw * 0.12, ty, gw * 0.76, 14).fill(0x3a3a3a).stroke({ width: 2, color: INK }); // table top
  g.moveTo(gx + gw * 0.2, ty + 14).lineTo(gx + gw * 0.28, ty + h * 0.1).moveTo(gx + gw * 0.8, ty + 14).lineTo(gx + gw * 0.72, ty + h * 0.1).stroke({ width: 6, color: 0x3a3a3a });
  g.rect(gx + gw * 0.08, ty + h * 0.08, gw * 0.84, 10).fill(0x3a3a3a).stroke({ width: 2, color: INK }); // bench
  // blue outdoor rug, a low table and two chairs under covers
  g.roundRect(w * 1.48, h * 0.76, w * 0.28, h * 0.13, 6).fill(0x4a90b8).stroke({ width: 3, color: 0x2f6f95 });
  for (let i = 0; i < 6; i++) g.circle(w * (1.51 + i * 0.045), h * 0.825, 7).stroke({ width: 2, color: 0xbfe3f5 });
  g.rect(w * 1.56, h * 0.74, w * 0.12, h * 0.05).fill(0x3a3a3a).stroke({ width: 2, color: INK });
  // the brick TV room at the back of the patio
  const rx = w * 1.62, rw = w * 0.25, ry = h * 0.32;
  g.rect(rx, ry, rw, h * 0.36).fill(0xb9a99a).stroke({ width: 3, color: INK });
  for (let y = ry + 10; y < ry + h * 0.36; y += 10) g.moveTo(rx, y).lineTo(rx + rw, y);
  g.stroke({ width: 1, color: 0x9c8b7c });
  g.poly([rx - 20, ry, rx + rw * 0.2, ry - h * 0.07, rx + rw * 0.8, ry - h * 0.07, rx + rw + 20, ry]).fill(0x3d405b).stroke({ width: 3, color: INK });
  g.rect(rx + rw * 0.08, ry + h * 0.08, rw * 0.2, h * 0.28).fill(0xffffff).stroke({ width: 3, color: INK }); // door
  g.circle(rx + rw * 0.25, ry + h * 0.23, 4).fill(INK);
  g.rect(rx + rw * 0.36, ry + h * 0.26, rw * 0.6, h * 0.12).fill(0xd4a373).stroke({ width: 3, color: INK }); // wooden counter
  // the house wall at the far right, with the hose reel on it
  g.rect(w * 1.88, 0, x1 - w * 1.88, h * 0.9).fill(0xf4f1ea).stroke({ width: 3, color: INK });
  for (let y = h * 0.06; y < h * 0.72; y += 16) g.moveTo(w * 1.88, y).lineTo(x1, y);
  g.stroke({ width: 1.5, color: 0xd6d1c4 });
  g.rect(w * 1.88, h * 0.72, x1 - w * 1.88, h * 0.18).fill(0xbdb5a6).stroke({ width: 3, color: INK });
}
