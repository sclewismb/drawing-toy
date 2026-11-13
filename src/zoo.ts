import type { Graphics } from 'pixi.js';
import { acacia, haze, mix, ridge, softShadow, treeLine } from './depth';
import { INK } from './places';
import { PALETTE, type Season } from './seasons';
import type { SkyDef } from './sky';

/**
 * The zoo (a made-up one). Wide, and deep: far-off hazy hills with a little
 * train running along them (on the far layer, which slides slower than the
 * rest as you pan), then a row of enclosures, then the visitors' path.
 *
 * Left to right: the snack kiosk, the meerkats, the savannah (zebras and the
 * giraffe), the monkey, the elephant (the middle of the first view), the
 * flamingos' lagoon, the penguins, the lion, the hippo's pool, the
 * crocodile's swamp, the parrots' aviary and the tortoise.
 *
 * The animals, the train, the signposts and the kiosk move and can be
 * tapped: see eggs/zoo.ts (feeding them is in eggs/secrets.ts).
 */
export const ZOO = { left: 1.55, right: 2.35, ground: 0.62 };

/** Where everything is (shared by the picture and the surprises). */
export function zooLayout(w: number, h: number) {
  const gy = h * ZOO.ground;
  return {
    gy,
    fenceY: h * 0.78,
    kiosk: { x: -1.3 * w, base: h * 0.79 },
    meerkats: { x0: -1.17 * w, x1: -0.91 * w, y: h * 0.715, holes: [-1.11 * w, -1.04 * w, -0.97 * w] },
    savannah: { x0: -0.87 * w, x1: -0.32 * w },
    zebras: [
      { x: -0.83 * w, y: h * 0.69, s: 0.78 }, // the one at the back first
      { x: -0.75 * w, y: h * 0.745, s: 1 },
    ],
    monkey: { x0: -0.28 * w, x1: -0.04 * w },
    elephant: { x0: 0.04 * w, x1: 0.62 * w },
    flamingos: { x0: 0.66 * w, x1: 0.98 * w, lagoon: { x: 0.82 * w, y: h * 0.675, rx: 0.15 * w, ry: h * 0.04 } },
    penguins: { x0: 1.04 * w, x1: 1.48 * w },
    lion: { x0: 1.52 * w, x1: 1.78 * w },
    hippo: { x0: 1.84 * w, x1: 2.24 * w, pool: { x: 2.04 * w, y: h * 0.67, rx: 0.17 * w, ry: h * 0.045 } },
    croc: { x0: 2.28 * w, x1: 2.62 * w, pool: { x: 2.45 * w, y: h * 0.675, rx: 0.15 * w, ry: h * 0.04 } },
    aviary: { x: 2.82 * w, rx: 0.14 * w, top: h * 0.12, base: h * 0.74, perches: [{ x: 2.75 * w, y: h * 0.35 }, { x: 2.89 * w, y: h * 0.44 }, { x: 2.79 * w, y: h * 0.56 }] },
    tortoise: { x0: 3.0 * w, x1: 3.22 * w, y: h * 0.725 },
    /** Picture signposts on the path: the animal to the left, and the one to the right. */
    signs: [
      { x: -0.89 * w, left: 'meerkat', right: 'zebra' },
      { x: 0, left: 'monkey', right: 'elephant' },
      { x: 1.0 * w, left: 'flamingo', right: 'penguin' },
      { x: 1.81 * w, left: 'lion', right: 'hippo' },
      { x: 2.645 * w, left: 'croc', right: 'parrot' },
    ] as { x: number; left: Face; right: Face }[],
    /** The far-off train line (on the far layer): tunnels at both ends. */
    train: { y: h * 0.6, x0: -0.72 * w, x1: 2.16 * w },
  };
}

export function zooSky(w: number, h: number, season: Season): SkyDef {
  const pal = PALETTE[season];
  const u = Math.min(w, h);
  return {
    x0: -ZOO.left * w,
    x1: (1 + ZOO.right) * w,
    h,
    color: pal.sky,
    sun: { x: w * 0.82, y: h * 0.12, r: u * 0.07 * pal.sunSize, color: pal.sun, rays: true },
    clouds: [[-1.3, 0.1, 0.8], [-0.7, 0.08, 0.9], [-0.25, 0.14, 0.7], [0.3, 0.07, 0.8], [1.2, 0.12, 1], [1.6, 0.07, 0.7], [2.2, 0.11, 0.9], [2.8, 0.06, 0.7]].map(([fx, fy, s]) => ({ x: w * fx, y: h * fy, r: u * 0.045 * s })),
    cloudColor: pal.cloud,
  };
}

/** Far away: hazy mountains, rolling hills with trees, a meadow and the train line (it slides slower). */
export function drawZooFar(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const L = zooLayout(w, h);
  const x0 = -ZOO.left * w, x1 = (1 + ZOO.right) * w;
  const winter = season === 'winter';
  const tree = winter ? 0xe3ebf2 : 0x52b788;
  // the farthest hills: very pale
  ridge(g, x0, x1, h * 0.3, h * 0.44, h * 0.7, haze(pal.hillBack, pal.sky, 0.6), 3, 0.5 * w);
  for (const fx of [-1.1, -0.2, 0.55, 1.35, 2.3, 2.9]) acacia(g, fx * w, h * 0.47, h * 0.12, haze(winter ? 0x9fb3c8 : 0x6b8f5e, pal.sky, 0.55));
  // nearer hills, with a line of trees
  ridge(g, x0, x1, h * 0.43, h * 0.52, h * 0.7, haze(pal.hillBack, pal.sky, 0.3), 7, 0.4 * w);
  treeLine(g, x0, x1, h * 0.565, h * 0.035, haze(tree, pal.sky, 0.4), 5);
  // the back meadow
  g.rect(x0, h * 0.56, x1 - x0, h * 0.14).fill(haze(pal.grass, pal.sky, 0.2));
  // the train line: sleepers and rails (the tunnels at each end are in eggs/zoo.ts, in front of the train)
  const T = L.train;
  for (let x = T.x0; x < T.x1; x += 22) g.rect(x, T.y - 2, 10, 7).fill(haze(0x8d5524, pal.sky, 0.3));
  g.rect(T.x0, T.y - 3, T.x1 - T.x0, 3).fill(haze(0x6c757d, pal.sky, 0.25));
}

/**
 * A grassy hill with a tunnel into it, for the far-off train (drawn in front
 * of the train, so it goes in behind the hill). `facing` = the side the
 * opening is on (-1 left, 1 right).
 */
export function tunnelHill(g: Graphics, x: number, y: number, h: number, hill: number, sky: number, facing: -1 | 1) {
  const r = h * 0.075;
  const col = haze(hill, sky, 0.15);
  const ink = haze(INK, sky, 0.45);
  g.ellipse(x, y + 4, r * 2.6, r * 1.6).fill(col).stroke({ width: 2, color: ink });
  g.rect(x - r * 2.7, y + 4, r * 5.4, r * 1.7).fill(col); // (the bottom half is under the meadow)
  const ax = x + facing * r * 1.75, ay = y + 3;
  g.moveTo(ax - r * 0.9, ay).arc(ax, ay, r * 0.9, Math.PI, 0).lineTo(ax + r * 0.6, ay).arc(ax, ay, r * 0.6, 0, Math.PI, true).closePath().fill(haze(0xadb5bd, sky, 0.2)).stroke({ width: 2, color: ink });
  g.moveTo(ax - r * 0.6, ay).arc(ax, ay, r * 0.6, Math.PI, 0).closePath().fill(0x2b2d42);
}

/**
 * The fences along the front of the enclosures. They're drawn in front of
 * the animals (by eggs/zoo.ts), so the animals are inside, behind them.
 */
export function drawZooFences(g: Graphics, w: number, h: number) {
  const L = zooLayout(w, h);
  const M = L.meerkats, S = L.savannah, T = L.tortoise;
  glassWall(g, M.x0 - 6, M.x1 + 6, L.fenceY, h * 0.06);
  fence(g, S.x0, S.x1, L.fenceY, h * 0.08);
  fence(g, L.monkey.x0, L.monkey.x1, L.fenceY, h * 0.08);
  fence(g, L.elephant.x0, L.elephant.x1, L.fenceY, h * 0.08);
  fence(g, L.flamingos.x0, L.flamingos.x1, L.fenceY, h * 0.06);
  fence(g, 1.04 * w, 1.48 * w, L.fenceY, h * 0.06);
  fence(g, 1.52 * w, 1.78 * w, L.fenceY, h * 0.08);
  fence(g, L.hippo.x0, L.hippo.x1, L.fenceY, h * 0.08);
  fence(g, L.croc.x0, L.croc.x1, L.fenceY, h * 0.08);
  fence(g, T.x0, T.x1, L.fenceY, h * 0.05);
}

/** A wooden fence along the front of an enclosure. */
function fence(g: Graphics, x0: number, x1: number, y: number, hgt: number) {
  g.rect(x0 - 6, y + 2, x1 - x0 + 12, 8).fill({ color: 0x000000, alpha: 0.07 }); // its shadow
  for (let x = x0; x <= x1; x += 34) g.rect(x - 5, y - hgt, 10, hgt + 6).fill(0xa47e4b).stroke({ width: 2, color: INK });
  g.rect(x0 - 6, y - hgt * 0.8, x1 - x0 + 12, 9).rect(x0 - 6, y - hgt * 0.35, x1 - x0 + 12, 9).fill(0xc68b59).stroke({ width: 2, color: INK });
}

/** A low glass wall (the meerkats can't climb it). */
function glassWall(g: Graphics, x0: number, x1: number, y: number, hgt: number) {
  g.rect(x0, y - hgt, x1 - x0, hgt).fill({ color: 0xcfefff, alpha: 0.35 }).stroke({ width: 3, color: INK });
  for (let x = x0 + 30; x < x1 - 10; x += 70) g.moveTo(x, y - hgt + 8).lineTo(x + 18, y - 8).stroke({ width: 3, color: 0xffffff, alpha: 0.7 });
  g.rect(x0 - 4, y - 4, x1 - x0 + 8, 10).fill(0x8d99a6).stroke({ width: 2, color: INK });
}

export type Face = 'giraffe' | 'zebra' | 'monkey' | 'elephant' | 'flamingo' | 'penguin' | 'lion' | 'hippo' | 'croc' | 'parrot' | 'tortoise' | 'meerkat' | 'icecream';

/** A little picture of an animal's face (for the signs: no words). */
export function face(g: Graphics, kind: Face, x: number, y: number, r: number) {
  const k = r / 20; // drawn at r = 20, scaled
  const P = (px: number, py: number) => [x + px * k, y + py * k] as const;
  const c = (px: number, py: number, rr: number) => g.circle(...P(px, py), rr * k);
  const e = (px: number, py: number, rx: number, ry: number) => g.ellipse(...P(px, py), rx * k, ry * k);
  const eyes = (dy = -3, dx = 6) => c(-dx, dy, 2.4).circle(...P(dx, dy), 2.4 * k).fill(INK);
  const sw = Math.max(1.5, 2 * k);
  switch (kind) {
    case 'giraffe':
      g.moveTo(...P(-6, -14)).lineTo(...P(-7, -24)).moveTo(...P(6, -14)).lineTo(...P(7, -24)).stroke({ width: 3 * k, color: INK });
      c(-7, -25, 3).circle(...P(7, -25), 3 * k).fill(0xc68b59);
      e(0, 0, 15, 18).fill(0xffd166).stroke({ width: sw, color: INK });
      c(-8, -9, 3).circle(...P(9, -6), 2.5 * k).circle(...P(-10, 6), 2.5 * k).fill(0xc68b59);
      e(0, 10, 9, 6).fill(0xffe5a8);
      eyes(-2);
      break;
    case 'zebra':
      e(0, 0, 15, 19).fill(0xffffff).stroke({ width: sw, color: INK });
      for (const sy of [-12, -5, 2]) g.moveTo(...P(-14, sy)).quadraticCurveTo(...P(-6, sy + 3), ...P(-4, sy - 1)).moveTo(...P(14, sy)).quadraticCurveTo(...P(6, sy + 3), ...P(4, sy - 1)).stroke({ width: 2.4 * k, color: INK });
      e(0, 11, 9, 7).fill(0x3a3a3a);
      eyes(-2, 7);
      g.moveTo(...P(-3, -19)).lineTo(...P(0, -26)).lineTo(...P(3, -19)).fill(INK);
      break;
    case 'monkey':
      c(-17, -2, 7).circle(...P(17, -2), 7 * k).fill(0xffd6a5).stroke({ width: sw, color: INK });
      c(0, 0, 17).fill(0x8d5524).stroke({ width: sw, color: INK });
      e(0, 4, 11, 10).fill(0xffd6a5);
      eyes(-1, 5);
      g.moveTo(...P(-4, 9)).quadraticCurveTo(...P(0, 12), ...P(4, 9)).stroke({ width: 1.6 * k, color: INK });
      break;
    case 'elephant':
      e(-15, 0, 10, 14).ellipse(...P(15, 0), 10 * k, 14 * k).fill(0x9aa5b1).stroke({ width: sw, color: INK });
      c(0, -2, 14).fill(0xadb5bd).stroke({ width: sw, color: INK });
      g.moveTo(...P(0, 4)).quadraticCurveTo(...P(-2, 16), ...P(5, 22)).stroke({ width: 7 * k, color: INK, cap: 'round' });
      g.moveTo(...P(0, 4)).quadraticCurveTo(...P(-2, 16), ...P(5, 22)).stroke({ width: 4.5 * k, color: 0xadb5bd, cap: 'round' });
      eyes(-4, 6);
      break;
    case 'flamingo':
      c(0, -2, 15).fill(0xff8fab).stroke({ width: sw, color: INK });
      g.moveTo(...P(6, -2)).quadraticCurveTo(...P(20, 0), ...P(16, 14)).lineTo(...P(10, 6)).closePath().fill(0xffffff).stroke({ width: sw, color: INK });
      g.moveTo(...P(16, 14)).lineTo(...P(14, 8)).lineTo(...P(18, 9)).closePath().fill(INK);
      c(-3, -6, 2.6).fill(INK);
      break;
    case 'penguin':
      c(0, 0, 17).fill(0x1f1f1f).stroke({ width: sw, color: INK });
      e(0, 4, 12, 12).fill(0xffffff);
      eyes(-1, 5);
      g.poly([...P(-4, 5), ...P(4, 5), ...P(0, 11)]).fill(0xffa94d);
      break;
    case 'lion':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        c(Math.cos(a) * 15, Math.sin(a) * 15, 8);
      }
      g.fill(0x9c4f1e);
      c(0, 0, 13).fill(0xe0a458).stroke({ width: sw, color: INK });
      eyes(-3, 5);
      g.poly([...P(-3, 3), ...P(3, 3), ...P(0, 7)]).fill(0x6b4226);
      break;
    case 'hippo':
      c(-11, -15, 4).circle(...P(11, -15), 4 * k).fill(0x9d8ba7).stroke({ width: sw, color: INK });
      e(0, -3, 15, 13).fill(0x9d8ba7).stroke({ width: sw, color: INK });
      e(0, 9, 18, 11).fill(0xb8a9c2).stroke({ width: sw, color: INK });
      c(-6, 6, 2.2).circle(...P(6, 6), 2.2 * k).fill(INK);
      eyes(-7, 7);
      break;
    case 'croc':
      e(6, 4, 18, 8).fill(0x52b788).stroke({ width: sw, color: INK });
      c(-8, -6, 8).fill(0x52b788).stroke({ width: sw, color: INK });
      c(-8, -7, 3).fill(INK);
      for (let i = 0; i < 4; i++) g.poly([...P(-2 + i * 6, 6), ...P(1 + i * 6, 11), ...P(4 + i * 6, 6)]);
      g.fill(0xffffff);
      break;
    case 'parrot':
      c(0, 0, 15).fill(0xe63946).stroke({ width: sw, color: INK });
      e(-8, 9, 8, 6).fill(0x3a86ff);
      g.moveTo(...P(8, -4)).quadraticCurveTo(...P(20, -2), ...P(14, 10)).lineTo(...P(8, 4)).closePath().fill(0xfff3c4).stroke({ width: sw, color: INK });
      c(1, -5, 4.5).fill(0xffffff);
      c(1, -5, 2.2).fill(INK);
      break;
    case 'tortoise':
      g.moveTo(...P(-18, 6)).quadraticCurveTo(...P(-16, -16), ...P(2, -16)).quadraticCurveTo(...P(18, -16), ...P(18, 6)).closePath().fill(0x8a9a5b).stroke({ width: sw, color: INK });
      for (const px of [-10, 0, 10]) g.poly([...P(px - 5, -2), ...P(px, -9), ...P(px + 5, -2), ...P(px, 4)]);
      g.stroke({ width: 1.6 * k, color: 0x5a6b3a });
      e(20, 4, 6, 5).fill(0xb5c99a).stroke({ width: sw, color: INK });
      c(21, 2, 1.4).fill(INK);
      break;
    case 'meerkat':
      e(0, 0, 12, 17).fill(0xd4a373).stroke({ width: sw, color: INK });
      e(-5, -4, 4, 3).ellipse(...P(5, -4), 4 * k, 3 * k).fill(0x6b4226);
      c(-5, -4, 1.8).circle(...P(5, -4), 1.8 * k).fill(0xffffff);
      c(0, 9, 3).fill(INK);
      break;
    case 'icecream':
      g.poly([...P(-9, 0), ...P(9, 0), ...P(0, 22)]).fill(0xf4a261).stroke({ width: sw, color: INK });
      c(-5, -5, 8).fill(0xff8fab).stroke({ width: sw, color: INK });
      c(5, -9, 8).fill(0xb7f0c1).stroke({ width: sw, color: INK });
      c(1, -18, 3.5).fill(0xe63946);
      break;
  }
}

/** A round picture sign on a post (behind a fence). */
function plaque(g: Graphics, x: number, y: number, kind: Face, r = 22) {
  g.rect(x - 4, y, 8, r * 2.2).fill(0xa47e4b).stroke({ width: 2, color: INK });
  g.circle(x, y, r + 5).fill(0xfff8e7).stroke({ width: 3, color: INK });
  face(g, kind, x, y, r * 0.85);
}

export function drawZoo(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const L = zooLayout(w, h);
  const x0 = -ZOO.left * w, x1 = (1 + ZOO.right) * w;
  const gy = L.gy;
  const winter = season === 'winter';
  const leaf = winter ? 0xdfe9f3 : 0x52b788;
  const leafDark = winter ? 0xc9d6e3 : 0x40916c;
  const water = winter ? 0xd6eef8 : 0x6ec6ff;
  const sand = winter ? 0xeef2f6 : 0xe9c46a;
  // the grass: a little paler at the back, richer at the front
  g.rect(x0, gy, x1 - x0, h - gy).fill(pal.grass);
  g.rect(x0, gy, x1 - x0, h * 0.03).fill(haze(pal.grass, pal.sky, 0.12));
  g.rect(x0, h * 0.9, x1 - x0, h * 0.1).fill(mix(pal.grass, 0x2d6a4f, winter ? 0.05 : 0.14));
  // the visitors' path along the front, with stepping-stone edges
  g.rect(x0, h * 0.8, x1 - x0, h * 0.1).fill(winter ? 0xeef2f6 : 0xe9d8a6);
  for (let x = x0 + 20; x < x1; x += 60) g.ellipse(x, h * 0.9, 22, 6).fill(winter ? 0xdde5ec : 0xd8c38b);

  // --- the snack kiosk (it does things when tapped: eggs) ---
  const K = L.kiosk;
  const kw = 0.085 * w, kh = h * 0.17;
  softShadow(g, K.x + 10, K.base + 2, kw * 1.4, h * 0.025);
  g.roundRect(K.x - kw, K.base - kh, kw * 2, kh, 8).fill(0xfff3d6).stroke({ width: 4, color: INK });
  g.rect(K.x - kw * 0.8, K.base - kh * 0.82, kw * 1.6, kh * 0.42).fill(0x6b4226).stroke({ width: 3, color: INK }); // the window
  g.rect(K.x - kw - 6, K.base - kh * 0.4, kw * 2 + 12, 14).fill(0xc68b59).stroke({ width: 3, color: INK }); // the counter
  for (let i = 0; i < 8; i++) g.rect(K.x - kw - 8 + (i * (kw * 2 + 16)) / 8, K.base - kh - 26, (kw * 2 + 16) / 8, 30).fill(i % 2 ? 0xffffff : 0xe63946);
  for (let i = 0; i < 8; i++) g.circle(K.x - kw - 8 + ((i + 0.5) * (kw * 2 + 16)) / 8, K.base - kh + 4, (kw * 2 + 16) / 16).fill(i % 2 ? 0xffffff : 0xe63946);
  g.rect(K.x - kw - 8, K.base - kh - 26, kw * 2 + 16, 30).stroke({ width: 3, color: INK });
  face(g, 'icecream', K.x, K.base - kh - 62, 30); // the big ice cream on the roof
  // a popcorn tub and a drink on the counter
  const ct = K.base - kh * 0.4;
  g.poly([K.x + kw * 0.3, ct, K.x + kw * 0.6, ct, K.x + kw * 0.65, ct - 34, K.x + kw * 0.25, ct - 34]).fill(0xffffff).stroke({ width: 2, color: INK });
  for (const dx of [0.33, 0.45, 0.57]) g.rect(K.x + kw * dx - 3, ct - 33, 6, 32).fill(0xe63946);
  for (const [dx, dy] of [[0.3, -38], [0.4, -42], [0.5, -40], [0.6, -37], [0.45, -47]]) g.circle(K.x + kw * dx, ct + dy, 7).fill(0xfff3c4).stroke({ width: 1.5, color: INK });
  g.poly([K.x - kw * 0.55, ct, K.x - kw * 0.35, ct, K.x - kw * 0.32, ct - 30, K.x - kw * 0.58, ct - 30]).fill(0x4ea8ff).stroke({ width: 2, color: INK });
  g.moveTo(K.x - kw * 0.45, ct - 30).lineTo(K.x - kw * 0.4, ct - 46).stroke({ width: 3, color: 0xff8fab });
  // a sunshade and a little table beside it
  const ux = K.x + kw + 0.045 * w;
  softShadow(g, ux, K.base + 4, 0.04 * w, h * 0.015);
  g.rect(ux - 3, K.base - h * 0.15, 6, h * 0.15).fill(0xadb5bd).stroke({ width: 1.5, color: INK });
  g.moveTo(ux - 0.042 * w, K.base - h * 0.13).quadraticCurveTo(ux, K.base - h * 0.21, ux + 0.042 * w, K.base - h * 0.13).closePath().fill(0x4ea8ff).stroke({ width: 3, color: INK });
  g.moveTo(ux, K.base - h * 0.185).lineTo(ux - 0.016 * w, K.base - h * 0.13).moveTo(ux, K.base - h * 0.185).lineTo(ux + 0.016 * w, K.base - h * 0.13).stroke({ width: 2, color: 0xffffff });
  g.ellipse(ux, K.base - h * 0.05, 0.028 * w, 7).fill(0xffffff).stroke({ width: 2, color: INK });

  // --- the meerkats: a sandy mound with burrows, behind a low glass wall ---
  const M = L.meerkats;
  const mx = (M.x0 + M.x1) / 2;
  g.ellipse(mx, M.y + h * 0.02, (M.x1 - M.x0) * 0.52, h * 0.06).fill(sand);
  g.ellipse(mx, M.y + 4, (M.x1 - M.x0) * 0.4, h * 0.045).fill(winter ? 0xf7f9fb : 0xd4a373).stroke({ width: 3, color: INK });
  g.ellipse(M.x0 + 18, M.y + h * 0.03, 26, 18).fill(0xadb5bd).stroke({ width: 3, color: INK }); // a lookout rock
  g.roundRect(M.x1 - 70, M.y + h * 0.035, 64, 18, 9).fill(0x8d5524).stroke({ width: 2.5, color: INK }); // a log
  for (const hx of M.holes) g.ellipse(hx, M.y, 19, 8).fill(0x3d2a1e).stroke({ width: 2, color: INK });
  plaque(g, M.x0 + 0.05 * w, L.fenceY - h * 0.15, 'meerkat');

  // --- the savannah: the giraffe's tall tree, dry grass, the zebras ---
  const S = L.savannah;
  g.ellipse((S.x0 + S.x1) / 2, h * 0.72, (S.x1 - S.x0) * 0.5, h * 0.055).fill(winter ? 0xf4f7fa : mix(pal.grass, 0xe9c46a, 0.45));
  const tx = -0.48 * w;
  softShadow(g, tx + 10, gy + 14, 0.14 * w, h * 0.03);
  g.rect(tx - 12, h * 0.26, 24, gy - h * 0.26 + 10).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.moveTo(tx, h * 0.34).lineTo(tx - 0.07 * w, h * 0.23).moveTo(tx, h * 0.3).lineTo(tx + 0.06 * w, h * 0.19).stroke({ width: 10, color: 0x8d5524, cap: 'round' });
  g.ellipse(tx, h * 0.22, 0.13 * w, h * 0.06).fill(leaf).stroke({ width: 3, color: INK });
  g.ellipse(tx + 0.06 * w, h * 0.17, 0.08 * w, h * 0.04).fill(leafDark).stroke({ width: 3, color: INK });
  softShadow(g, -0.6 * w + 20, h * 0.745, Math.max(1, (h * 0.5) / 260) * 70, h * 0.02); // the giraffe's
  g.roundRect(-0.42 * w, h * 0.705, 0.07 * w, h * 0.03, 6).fill(0x8d99a6).stroke({ width: 2.5, color: INK }); // a water trough
  g.rect(-0.415 * w, h * 0.708, 0.06 * w, 6).fill(water);
  plaque(g, S.x1 - 0.1 * w, L.fenceY - h * 0.15, 'zebra');
  plaque(g, S.x1 - 0.04 * w, L.fenceY - h * 0.15, 'giraffe');

  // --- the monkey's climbing frame, a rope and a tyre ---
  const mfx = -0.16 * w;
  softShadow(g, mfx, gy + 14, 0.1 * w, h * 0.02);
  g.moveTo(mfx - 0.08 * w, gy + 10).lineTo(mfx - 0.08 * w, h * 0.24).lineTo(mfx + 0.08 * w, h * 0.24).lineTo(mfx + 0.08 * w, gy + 10).stroke({ width: 12, color: 0x8d5524 });
  g.moveTo(mfx - 0.08 * w, h * 0.42).lineTo(mfx + 0.08 * w, h * 0.42).stroke({ width: 8, color: 0x8d5524 });
  g.moveTo(mfx + 0.05 * w, h * 0.24).lineTo(mfx + 0.05 * w, h * 0.5).stroke({ width: 3, color: 0xc9a66b });
  g.circle(mfx + 0.05 * w, h * 0.53, 20).stroke({ width: 10, color: 0x3a3a3a });
  g.roundRect(mfx - 0.075 * w, h * 0.5, 0.06 * w, 12, 4).fill(0xc68b59).stroke({ width: 2, color: INK }); // a platform
  plaque(g, L.monkey.x0 + 0.03 * w, L.fenceY - h * 0.15, 'monkey');

  // --- the elephant: a shady tree, a big rock and some hay ---
  const sx = 0.1 * w;
  softShadow(g, sx + 0.04 * w, gy + 12, 0.12 * w, h * 0.025);
  g.rect(sx - 10, h * 0.3, 20, gy - h * 0.3 + 8).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.circle(sx, h * 0.28, h * 0.1).fill(leafDark).stroke({ width: 3, color: INK });
  g.circle(sx + h * 0.07, h * 0.31, h * 0.07).fill(leaf).stroke({ width: 3, color: INK });
  softShadow(g, 0.19 * w, gy + h * 0.09, 0.1 * w, h * 0.02);
  g.ellipse(0.18 * w, gy + h * 0.04, 0.09 * w, h * 0.06).fill(0xadb5bd).stroke({ width: 3, color: INK });
  g.ellipse(0.16 * w, gy + h * 0.015, 0.04 * w, h * 0.015).fill({ color: 0xffffff, alpha: 0.4 });
  softShadow(g, 0.42 * w + 20, h * 0.725, 140, h * 0.025); // the elephant's
  g.ellipse(0.585 * w, h * 0.735, 0.03 * w, h * 0.022).fill(0xe9c46a).stroke({ width: 2.5, color: INK }); // hay
  for (let i = -3; i <= 3; i++) g.moveTo(0.585 * w + i * 6, h * 0.72).lineTo(0.585 * w + i * 9, h * 0.705).stroke({ width: 2, color: 0xc9a227 });
  plaque(g, L.elephant.x0 + 0.04 * w, L.fenceY - h * 0.15, 'elephant');

  // --- the flamingos' lagoon (the flamingos are in eggs) ---
  const F = L.flamingos.lagoon;
  g.ellipse(F.x, F.y + 4, F.rx + 16, F.ry + 10).fill(sand);
  g.ellipse(F.x, F.y, F.rx, F.ry).fill(winter ? 0xd6eef8 : 0x7fd1e8).stroke({ width: 3, color: INK });
  for (const [dx, dy] of [[-0.6, 0.2], [0.5, -0.3], [0.1, 0.45]]) g.ellipse(F.x + F.rx * dx, F.y + F.ry * dy, 16, 6).fill(0x52b788).stroke({ width: 1.5, color: INK });
  reeds(g, F.x + F.rx * 0.95, F.y, 5, h, winter);
  plaque(g, L.flamingos.x0 + 0.03 * w, L.fenceY - h * 0.13, 'flamingo');

  // --- the penguins' icy pool ---
  const px = 1.26 * w;
  g.roundRect(1.38 * w, gy - h * 0.1, 0.09 * w, h * 0.12, 30).fill(0xe3f2fd).stroke({ width: 3, color: INK }); // an ice cave
  g.ellipse(1.425 * w, gy + h * 0.01, 0.025 * w, h * 0.04).fill(0x8ecae6);
  g.rect(1.06 * w, gy - h * 0.02, 0.4 * w, h * 0.18).fill(0xe3f2fd).stroke({ width: 3, color: INK });
  g.ellipse(px, gy + h * 0.08, 0.13 * w, h * 0.05).fill(0x4ea8ff).stroke({ width: 3, color: INK });
  g.ellipse(px - 0.05 * w, gy + h * 0.065, 0.03 * w, h * 0.01).fill({ color: 0xffffff, alpha: 0.5 });
  g.poly([1.08 * w, gy + h * 0.1, 1.12 * w, gy, 1.16 * w, gy + h * 0.1]).poly([1.36 * w, gy + h * 0.1, 1.41 * w, gy - h * 0.02, 1.45 * w, gy + h * 0.1]).fill(0xffffff).stroke({ width: 3, color: INK });
  plaque(g, 1.46 * w, L.fenceY - h * 0.13, 'penguin');

  // --- the lion's rock ---
  const lx = 1.64 * w;
  softShadow(g, lx + 10, gy + h * 0.105, 0.15 * w, h * 0.025);
  g.poly([lx - 0.13 * w, gy + h * 0.1, lx - 0.08 * w, gy - h * 0.06, lx + 0.08 * w, gy - h * 0.08, lx + 0.13 * w, gy + h * 0.1]).fill(0xbdb5a6).stroke({ width: 4, color: INK });
  g.poly([lx - 0.06 * w, gy - h * 0.04, lx + 0.06 * w, gy - h * 0.06, lx + 0.03 * w, gy - h * 0.02]).fill({ color: 0xffffff, alpha: 0.25 });
  g.ellipse(lx + 0.12 * w, gy + h * 0.02, 0.05 * w, h * 0.09).fill(leaf).stroke({ width: 3, color: INK }); // a bush
  grass(g, lx - 0.12 * w, gy + h * 0.12, winter);
  plaque(g, 1.7 * w, L.fenceY - h * 0.15, 'lion');

  // --- the hippo's pool (the hippo is in eggs, with the front of the water) ---
  const H = L.hippo.pool;
  g.ellipse(H.x, H.y + 6, H.rx + 22, H.ry + 16).fill(winter ? 0xe3e9ef : 0x9c7a54);
  for (const [dx, r] of [[-0.75, 26], [0.55, 34], [0.85, 22]]) g.ellipse(H.x + H.rx * dx, H.y - H.ry * 0.9, r, r * 0.6).fill(0xadb5bd).stroke({ width: 2.5, color: INK });
  g.ellipse(H.x, H.y, H.rx, H.ry).fill(winter ? water : 0x5fb3d9).stroke({ width: 3, color: INK });
  reeds(g, H.x - H.rx * 1.02, H.y, 4, h, winter);
  plaque(g, L.hippo.x0 + 0.03 * w, L.fenceY - h * 0.15, 'hippo');

  // --- the crocodile's swamp ---
  const C = L.croc.pool;
  g.ellipse(C.x - C.rx * 0.2, C.y + 6, C.rx + 26, C.ry + 16).fill(winter ? 0xe3e9ef : 0xc9b37e);
  palm(g, L.croc.x1 - 0.03 * w, gy + h * 0.03, h, winter);
  g.ellipse(C.x, C.y, C.rx, C.ry).fill(winter ? 0xcde3d6 : 0x5e9c76).stroke({ width: 3, color: INK });
  g.roundRect(C.x + C.rx * 0.3, C.y - C.ry * 0.5, 80, 16, 8).fill(0x8d5524).stroke({ width: 2.5, color: INK }); // a floating log
  reeds(g, C.x + C.rx * 0.95, C.y, 6, h, winter);
  plaque(g, L.croc.x0 + 0.03 * w, L.fenceY - h * 0.15, 'croc');

  // --- the aviary: its tree and perches (the birds and the netting are in eggs) ---
  const A = L.aviary;
  softShadow(g, A.x, A.base + 6, A.rx * 1.1, h * 0.025);
  g.rect(A.x - A.rx, A.base - h * 0.03, A.rx * 2, h * 0.04).fill(0xc68b59).stroke({ width: 3, color: INK });
  g.ellipse(A.x, A.base - h * 0.03, A.rx * 0.95, h * 0.02).fill(winter ? 0xf1f6fb : 0x95d5b2);
  g.moveTo(A.x, A.base - h * 0.03).lineTo(A.x, A.top + h * 0.2).stroke({ width: 16, color: 0x8d5524, cap: 'round' });
  for (const p of A.perches) g.moveTo(A.x, p.y + 14).lineTo(p.x + (p.x < A.x ? -40 : 40), p.y + 6).stroke({ width: 9, color: 0x8d5524, cap: 'round' });
  // leafy clumps at the ends of the branches
  for (const [dx, dy, r] of [[-0.55, 0.2, 0.045], [0.55, 0.29, 0.04], [0.05, 0.13, 0.05], [-0.3, 0.42, 0.035]]) {
    const cx = A.x + A.rx * dx, cy = A.top + h * dy, rr = h * r;
    for (const [ox, oy] of [[-0.7, 0.2], [0.7, 0.25], [0, -0.35], [0, 0.35]]) g.circle(cx + ox * rr, cy + oy * rr, rr * 0.75).fill(leafDark).stroke({ width: 2, color: INK });
    g.circle(cx, cy, rr * 0.7).fill(leaf);
  }
  plaque(g, A.x - A.rx - 18, L.fenceY - h * 0.12, 'parrot', 20);

  // --- the tortoise's sandy patch and its little shelter ---
  const T = L.tortoise;
  g.ellipse((T.x0 + T.x1) / 2, T.y, (T.x1 - T.x0) * 0.52, h * 0.05).fill(sand);
  const hx = T.x1 - 0.03 * w;
  softShadow(g, hx, T.y + 2, 0.05 * w, h * 0.015);
  g.rect(hx - 0.04 * w, T.y - h * 0.08, 0.08 * w, h * 0.08).fill(0xc68b59).stroke({ width: 3, color: INK });
  g.moveTo(hx - 0.02 * w, T.y).arc(hx, T.y, 0.02 * w, Math.PI, 0).closePath().fill(0x3d2a1e);
  g.poly([hx - 0.05 * w, T.y - h * 0.075, hx, T.y - h * 0.13, hx + 0.05 * w, T.y - h * 0.075]).fill(winter ? 0xffffff : 0xe76f51).stroke({ width: 3, color: INK });
  for (const dx of [-0.07, -0.05]) g.ellipse(T.x0 + (0.12 + dx) * w, T.y + h * 0.02, 14, 9).fill(0x95d5b2).stroke({ width: 2, color: INK }); // lettuce
  plaque(g, T.x0 + 0.02 * w, L.fenceY - h * 0.12, 'tortoise');
}

/** A clump of reeds (bulrushes) at the water's edge. */
function reeds(g: Graphics, x: number, y: number, n: number, h: number, winter: boolean) {
  for (let i = 0; i < n; i++) {
    const rx = x + (i - n / 2) * 9;
    const top = y - h * (0.07 + ((i * 37) % 5) * 0.012);
    g.moveTo(rx, y + 6).quadraticCurveTo(rx + 4, (y + top) / 2, rx + (i % 2 ? 6 : -4), top).stroke({ width: 3, color: winter ? 0x9fb3c8 : 0x40916c });
    if (i % 2 === 0) g.roundRect(rx - 7, top - 4, 9, 20, 4).fill(0x8d5524).stroke({ width: 1.5, color: INK });
  }
}

/** A tuft of tall grass. */
function grass(g: Graphics, x: number, y: number, winter: boolean) {
  for (let i = -3; i <= 3; i++) g.moveTo(x + i * 5, y).quadraticCurveTo(x + i * 7, y - 20, x + i * 11, y - 34 + Math.abs(i) * 4);
  g.stroke({ width: 3, color: winter ? 0xb7c4cf : 0x7a9a3a });
}

/** A palm tree (for the warm places). */
function palm(g: Graphics, x: number, y: number, h: number, winter: boolean) {
  const top = y - h * 0.38;
  g.moveTo(x, y).quadraticCurveTo(x - 30, (y + top) / 2, x - 10, top).stroke({ width: 22, color: INK, cap: 'round' });
  g.moveTo(x, y).quadraticCurveTo(x - 30, (y + top) / 2, x - 10, top).stroke({ width: 16, color: 0xb08850, cap: 'round' });
  const c = winter ? 0xb7c4cf : 0x40916c;
  for (const a of [-2.7, -2.2, -1.6, -1.0, -0.45]) {
    const ex = x - 10 + Math.cos(a) * h * 0.13, ey = top + Math.sin(a) * h * 0.06 + h * 0.04;
    g.moveTo(x - 10, top).quadraticCurveTo((x - 10 + ex) / 2, top - h * 0.05, ex, ey).stroke({ width: 14, color: c, cap: 'round' });
  }
  g.circle(x - 16, top + 8, 8).circle(x - 4, top + 10, 8).fill(0x8d5524);
}
