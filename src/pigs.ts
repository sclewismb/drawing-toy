import type { Graphics } from 'pixi.js';
import { INK } from './places';
import { PALETTE, type Season } from './seasons';
import type { SkyDef } from './sky';

/**
 * A pig family's cottage (our own: stone walls and a thatched roof), seen
 * from its garden. Wide like the rooms: the cottage on the left, a vegetable
 * patch and the big mud puddle in the middle, a tyre swing, a washing line
 * and a bath tub on the right. Things that move are in eggs/pigs.ts.
 */
export const PIGS = { left: 0.6, right: 0.6, floor: 0.7 };

export function pigsLayout(w: number, h: number) {
  return {
    cottage: { x0: -0.55 * w, x1: -0.08 * w, top: h * 0.24, base: h * 0.7 },
    door: { x: -0.36 * w, w: 0.08 * w, top: h * 0.46, base: h * 0.7 },
    chimney: { x: -0.18 * w, y: h * 0.1 },
    puddle: { x: 0.52 * w, y: h * 0.84, rx: 0.2 * w, ry: h * 0.07 },
    patch: { x0: 0.08 * w, x1: 0.34 * w, y: h * 0.64 },
    swing: { x: 1.12 * w, branch: h * 0.18, seat: h * 0.6 },
    line: { x0: 1.26 * w, x1: 1.56 * w, y: h * 0.3 },
    tub: { x: 1.4 * w, y: h * 0.8 },
  };
}

export function pigsSky(w: number, h: number, season: Season): SkyDef {
  const pal = PALETTE[season];
  const u = Math.min(w, h);
  return {
    x0: -PIGS.left * w,
    x1: (1 + PIGS.right) * w,
    h,
    color: pal.sky,
    sun: { x: w * 0.78, y: h * 0.1, r: u * 0.065 * pal.sunSize, color: pal.sun, rays: true },
    clouds: [[-0.4, 0.08, 0.8], [0.25, 0.12, 0.7], [0.9, 0.06, 0.9], [1.45, 0.1, 0.6]].map(([fx, fy, s]) => ({ x: w * fx, y: h * fy, r: u * 0.045 * s })),
    cloudColor: pal.cloud,
  };
}

export function drawPigCottage(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const L = pigsLayout(w, h);
  const winter = season === 'winter';
  const x0 = -PIGS.left * w, x1 = (1 + PIGS.right) * w;
  // far hills, a hedge, and the garden
  g.moveTo(x0, h * 0.5);
  for (let x = x0; x <= x1; x += 0.25 * w) g.quadraticCurveTo(x + 0.125 * w, h * 0.38, x + 0.25 * w, h * 0.5);
  g.lineTo(x1, h).lineTo(x0, h).closePath().fill(pal.hillBack);
  g.rect(x0, h * 0.52, x1 - x0, h * 0.48).fill(pal.grass);
  for (let x = x0; x < x1; x += 34) g.circle(x, h * 0.53, 22).fill(winter ? 0x6a9a7f : 0x40916c);
  g.rect(x0, h * 0.53, x1 - x0, 6).fill(winter ? 0x6a9a7f : 0x40916c);
  // a white picket fence along the back
  for (let x = x0 + 10; x < x1; x += 30) g.poly([x - 7, h * 0.6, x - 7, h * 0.53, x, h * 0.51, x + 7, h * 0.53, x + 7, h * 0.6]).fill(0xffffff).stroke({ width: 2, color: INK });
  g.rect(x0, h * 0.545, x1 - x0, 6).rect(x0, h * 0.58, x1 - x0, 6).fill(0xffffff);

  // --- the cottage ---
  const c = L.cottage;
  g.rect(c.x0, c.top, c.x1 - c.x0, c.base - c.top).fill(winter ? 0xc5cdd6 : 0xb8c4ce).stroke({ width: 4, color: INK });
  for (let y = c.top + 24, row = 0; y < c.base - 10; y += 30, row++) {
    for (let x = c.x0 + (row % 2) * 30 + 10; x < c.x1 - 30; x += 60) g.roundRect(x, y, 44, 20, 6).stroke({ width: 2, color: 0x8d99a6 });
  }
  const ch = L.chimney;
  g.rect(ch.x - 20, ch.y, 40, c.top - ch.y).fill(0x8d99a6).stroke({ width: 3, color: INK });
  g.moveTo(c.x0 - 30, c.top + 20).quadraticCurveTo((c.x0 + c.x1) / 2, c.top - h * 0.28, c.x1 + 30, c.top + 20).closePath().fill(winter ? 0xf1f5f9 : 0xe0b25a).stroke({ width: 4, color: INK });
  if (!winter) for (let x = c.x0; x < c.x1; x += 40) g.moveTo(x, c.top + 14).lineTo(x + 18, c.top - h * 0.08).stroke({ width: 3, color: 0xb8862f });
  for (const wx of [c.x0 + 0.08 * w, c.x1 - 0.1 * w]) {
    g.circle(wx, c.top + h * 0.2, h * 0.055).fill(0xbfe8ff).stroke({ width: 4, color: INK });
    g.moveTo(wx - h * 0.055, c.top + h * 0.2).lineTo(wx + h * 0.055, c.top + h * 0.2).moveTo(wx, c.top + h * 0.145).lineTo(wx, c.top + h * 0.255).stroke({ width: 3, color: INK });
    g.roundRect(wx - h * 0.06, c.top + h * 0.27, h * 0.12, 14, 4).fill(0xa47e4b).stroke({ width: 2, color: INK });
    for (const dx of [-0.035, 0, 0.035]) g.circle(wx + dx * h, c.top + h * 0.262, 7).fill(dx ? 0xff8fab : 0xffd166).stroke({ width: 1.5, color: INK });
  }
  // the doorway (the door itself opens: see eggs)
  const d = L.door;
  g.rect(d.x - d.w / 2 - 6, d.top - 6, d.w + 12, d.base - d.top + 6).fill(0x2b2d42).stroke({ width: 3, color: INK });
  // a path from the door
  g.poly([d.x - d.w / 2, d.base, d.x + d.w / 2, d.base, d.x + d.w, h, d.x - d.w, h]).fill(0xd6c7b0);

  // --- the vegetable patch (pumpkins grow: see eggs) ---
  const p = L.patch;
  g.roundRect(p.x0, p.y - 12, p.x1 - p.x0, 34, 10).fill(0x8d5524).stroke({ width: 3, color: INK });
  for (let x = p.x0 + 20; x < p.x1; x += 40) g.moveTo(x, p.y).quadraticCurveTo(x + 10, p.y - 24, x + 20, p.y - 30).stroke({ width: 4, color: 0x52b788 });

  // --- the mud puddle ---
  const m = L.puddle;
  g.ellipse(m.x, m.y, m.rx + 10, m.ry + 6).fill(0x9c7a54);
  g.ellipse(m.x, m.y, m.rx, m.ry).fill(winter ? 0xb7c4cf : 0x7a5230).stroke({ width: 3, color: INK });
  for (const [dx, dy, r] of [[-0.4, -0.2, 0.12], [0.3, 0.25, 0.1], [0.05, -0.3, 0.08]]) g.ellipse(m.x + m.rx * dx, m.y + m.ry * dy, m.rx * r, m.ry * r * 1.4).fill(winter ? 0xdce6ee : 0x9c6b42);

  // --- right: the tree with the tyre swing, the washing line, the bath tub ---
  const s = L.swing;
  g.rect(s.x - 0.08 * w - 16, s.branch - 10, 32, h * 0.72 - s.branch + 10).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.circle(s.x - 0.08 * w, s.branch - h * 0.08, h * 0.13).fill(winter ? 0x6a9a7f : 0x52b788).stroke({ width: 3, color: INK });
  g.moveTo(s.x - 0.08 * w, s.branch).lineTo(s.x + 0.04 * w, s.branch - 6).stroke({ width: 10, color: 0x8d5524, cap: 'round' });
  const ln = L.line;
  for (const x of [ln.x0, ln.x1]) g.rect(x - 5, ln.y - 10, 10, h * 0.72 - ln.y + 10).fill(0xa47e4b).stroke({ width: 2, color: INK });
  g.moveTo(ln.x0, ln.y).quadraticCurveTo((ln.x0 + ln.x1) / 2, ln.y + 24, ln.x1, ln.y).stroke({ width: 2, color: INK });
  const t = L.tub;
  g.rect(t.x - 70, t.y - 2, 8, 22).rect(t.x + 62, t.y - 2, 8, 22).fill(0xffd166).stroke({ width: 2, color: INK });
  g.moveTo(t.x - 90, t.y - 56).lineTo(t.x + 90, t.y - 56).quadraticCurveTo(t.x + 84, t.y + 4, t.x, t.y + 4).quadraticCurveTo(t.x - 84, t.y + 4, t.x - 90, t.y - 56).fill(0xffffff).stroke({ width: 4, color: INK });
  g.ellipse(t.x, t.y - 56, 90, 12).fill(0x9bd0ff).stroke({ width: 3, color: INK });
}
