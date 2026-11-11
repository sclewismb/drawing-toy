import type { Graphics } from 'pixi.js';
import { INK } from './places';
import { PALETTE, type Season } from './seasons';
import type { SkyDef } from './sky';

/**
 * The zoo (a made-up one). Wide like the rooms: the elephant in the middle,
 * the giraffe and the monkey to the left, the penguins and the lion to the
 * right. The animals move and can be tapped: see eggs/zoo.ts.
 */
export const ZOO = { left: 0.8, right: 0.8, ground: 0.62 };

export function zooSky(w: number, h: number, season: Season): SkyDef {
  const pal = PALETTE[season];
  const u = Math.min(w, h);
  return {
    x0: -ZOO.left * w,
    x1: (1 + ZOO.right) * w,
    h,
    color: pal.sky,
    sun: { x: w * 0.82, y: h * 0.12, r: u * 0.07 * pal.sunSize, color: pal.sun, rays: true },
    clouds: [[-0.7, 0.08, 0.9], [-0.25, 0.14, 0.7], [0.3, 0.07, 0.8], [1.2, 0.12, 1], [1.6, 0.07, 0.7]].map(([fx, fy, s]) => ({ x: w * fx, y: h * fy, r: u * 0.045 * s })),
    cloudColor: pal.cloud,
  };
}

/** A wooden fence along the front of an enclosure. */
function fence(g: Graphics, x0: number, x1: number, y: number, hgt: number) {
  for (let x = x0; x <= x1; x += 34) g.rect(x - 5, y - hgt, 10, hgt + 6).fill(0xa47e4b).stroke({ width: 2, color: INK });
  g.rect(x0 - 6, y - hgt * 0.8, x1 - x0 + 12, 9).rect(x0 - 6, y - hgt * 0.35, x1 - x0 + 12, 9).fill(0xc68b59).stroke({ width: 2, color: INK });
}

export function drawZoo(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const x0 = -ZOO.left * w, x1 = (1 + ZOO.right) * w;
  const gy = h * ZOO.ground;
  const winter = season === 'winter';
  // far hills and the grass
  for (const [cx, rx] of [[-0.5, 0.5], [0.4, 0.6], [1.4, 0.55]]) g.ellipse(cx * w, gy + 8, rx * w, h * 0.16).fill(pal.hillBack);
  g.rect(x0, gy, x1 - x0, h - gy).fill(pal.grass);
  // the visitors' path along the front
  g.rect(x0, h * 0.8, x1 - x0, h * 0.1).fill(winter ? 0xeef2f6 : 0xe9d8a6);

  // --- left: the giraffe's tall tree, and the monkey's climbing frame ---
  const tx = -0.48 * w;
  g.rect(tx - 12, h * 0.26, 24, gy - h * 0.26 + 10).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.ellipse(tx, h * 0.22, 0.13 * w, h * 0.06).fill(winter ? 0xdfe9f3 : 0x52b788).stroke({ width: 3, color: INK });
  g.ellipse(tx + 0.06 * w, h * 0.17, 0.08 * w, h * 0.04).fill(winter ? 0xdfe9f3 : 0x40916c).stroke({ width: 3, color: INK });
  fence(g, -0.78 * w, -0.32 * w, h * 0.78, h * 0.08);
  const mx = -0.16 * w;
  g.moveTo(mx - 0.08 * w, gy + 10).lineTo(mx - 0.08 * w, h * 0.24).lineTo(mx + 0.08 * w, h * 0.24).lineTo(mx + 0.08 * w, gy + 10).stroke({ width: 12, color: 0x8d5524 });
  g.moveTo(mx - 0.08 * w, h * 0.42).lineTo(mx + 0.08 * w, h * 0.42).stroke({ width: 8, color: 0x8d5524 });
  fence(g, -0.28 * w, -0.04 * w, h * 0.78, h * 0.08);

  // --- middle: the elephant's pool and a big rock ---
  g.ellipse(0.7 * w, gy + h * 0.08, 0.16 * w, h * 0.05).fill(winter ? 0xd6eef8 : 0x6ec6ff).stroke({ width: 3, color: INK });
  g.ellipse(0.18 * w, gy + h * 0.04, 0.09 * w, h * 0.06).fill(0xadb5bd).stroke({ width: 3, color: INK });
  fence(g, 0.04 * w, 0.96 * w, h * 0.78, h * 0.08);

  // --- right: the penguins' icy pool, and the lion's rock ---
  const px = 1.26 * w;
  g.rect(1.06 * w, gy - h * 0.02, 0.4 * w, h * 0.18).fill(0xe3f2fd).stroke({ width: 3, color: INK });
  g.ellipse(px, gy + h * 0.08, 0.13 * w, h * 0.05).fill(0x4ea8ff).stroke({ width: 3, color: INK });
  g.poly([1.08 * w, gy + h * 0.1, 1.12 * w, gy, 1.16 * w, gy + h * 0.1]).poly([1.36 * w, gy + h * 0.1, 1.41 * w, gy - h * 0.02, 1.45 * w, gy + h * 0.1]).fill(0xffffff).stroke({ width: 3, color: INK });
  fence(g, 1.04 * w, 1.48 * w, h * 0.78, h * 0.06);
  const lx = 1.64 * w;
  g.poly([lx - 0.13 * w, gy + h * 0.1, lx - 0.08 * w, gy - h * 0.06, lx + 0.08 * w, gy - h * 0.08, lx + 0.13 * w, gy + h * 0.1]).fill(0xbdb5a6).stroke({ width: 4, color: INK });
  g.ellipse(lx + 0.12 * w, gy + h * 0.02, 0.05 * w, h * 0.09).fill(winter ? 0xdfe9f3 : 0x52b788).stroke({ width: 3, color: INK }); // a bush
  fence(g, 1.52 * w, 1.78 * w, h * 0.78, h * 0.08);
}
