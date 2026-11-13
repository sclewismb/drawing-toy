import type { Graphics } from 'pixi.js';
import { INK } from './places';
import { SHOP_FLOOR } from './shops';

/**
 * The adoption corner, at the far right of the vet: a sunny room with ten
 * cosy pens, a pet waiting in each (see eggs/adoption.ts). Tap a pen to meet
 * the pet, choose its collar and name, and take it home (adopt.ts).
 */
export const ADOPTION = { x0: 1.65, x1: 2.5 };

export function adoptionLayout(w: number, h: number) {
  const fy = h * SHOP_FLOOR;
  const pens: { x: number; y: number; w: number; h: number }[] = [];
  const pw = 0.14 * w, ph = h * 0.2;
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) pens.push({ x: 1.72 * w + i * (pw + 0.01 * w), y: h * (0.18 + row * 0.25), w: pw, h: ph });
  }
  return { fy, pens, sign: { x: 2.08 * w, y: h * 0.08 } };
}

export function drawAdoption(g: Graphics, w: number, h: number) {
  const L = adoptionLayout(w, h);
  const fy = L.fy;
  const x0 = ADOPTION.x0 * w, x1 = ADOPTION.x1 * w;
  // a sunny wall with paw prints, and the vet's floor carrying on
  g.rect(x0, 0, x1 - x0, fy).fill(0xfff1c1);
  for (let x = x0 + 30, i = 0; x < x1; x += 70, i++) {
    const y = h * 0.03 + (i % 2) * 18;
    g.ellipse(x, y + 8, 8, 6).fill(0xffe08a);
    for (const [dx, dy] of [[-8, -2], [0, -6], [8, -2]]) g.circle(x + dx, y + dy, 3).fill(0xffe08a);
  }
  g.rect(x0, fy, x1 - x0, h - fy).fill(0xe9ecef);
  for (let x = x0; x < x1; x += 90) g.moveTo(x, fy).lineTo(x - 30, h);
  g.stroke({ width: 2, color: 0xdee2e6 });
  g.rect(x0, fy - 10, x1 - x0, 10).fill(0xffffff).stroke({ width: 2, color: INK });
  // an archway from the vet into the adoption corner, with hearts
  g.rect(x0 - 12, 0, 24, fy).fill(0xffffff).stroke({ width: 3, color: INK });
  for (let y = h * 0.1; y < fy - 20; y += h * 0.12) {
    g.moveTo(x0, y + 6).bezierCurveTo(x0 - 8, y, x0 - 4, y - 7, x0, y - 3).bezierCurveTo(x0 + 4, y - 7, x0 + 8, y, x0, y + 6).fill(0xff4d6d);
  }
  // the sign: a little house with a heart (no words)
  const s = L.sign;
  g.poly([s.x - 54, s.y + 14, s.x, s.y - 30, s.x + 54, s.y + 14]).fill(0xe5383b).stroke({ width: 3, color: INK });
  g.rect(s.x - 40, s.y + 14, 80, 46).fill(0xffffff).stroke({ width: 3, color: INK });
  g.moveTo(s.x, s.y + 50).bezierCurveTo(s.x - 22, s.y + 32, s.x - 12, s.y + 16, s.x, s.y + 28).bezierCurveTo(s.x + 12, s.y + 16, s.x + 22, s.y + 32, s.x, s.y + 50).fill(0xff4d6d).stroke({ width: 2, color: INK });
  // the pens: cosy cubbies with a cushion in each
  const cushions = [0xff8fab, 0x9bd0ff, 0xa8e6cf, 0xffd166, 0xc8b6ff];
  L.pens.forEach((p, i) => {
    g.roundRect(p.x, p.y, p.w, p.h, 14).fill(0xc68b59).stroke({ width: 4, color: INK });
    g.roundRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16, 10).fill(0x8d5524);
    g.ellipse(p.x + p.w / 2, p.y + p.h - 22, p.w * 0.36, 12).fill(cushions[i % cushions.length]).stroke({ width: 2, color: INK });
    g.circle(p.x + p.w - 16, p.y + 16, 6).fill(0xffd43b).stroke({ width: 2, color: INK }); // a little star on each
  });
  // a food bowl, a water bowl and a basket of pet toys
  const by = fy + (h - fy) * 0.35;
  for (const [x, col, top] of [[1.8, 0xe5383b, 0x8d5524], [1.9, 0x4dabf7, 0x6ec6ff]] as const) {
    g.ellipse(x * w, by, 34, 12).fill(top).stroke({ width: 3, color: INK });
    g.moveTo(x * w - 34, by).quadraticCurveTo(x * w, by + 34, x * w + 34, by).fill(col).stroke({ width: 3, color: INK });
  }
  g.roundRect(2.3 * w - 50, by - 30, 100, 44, 12).fill(0xc68b59).stroke({ width: 3, color: INK });
  g.circle(2.3 * w - 26, by - 32, 14).fill(0xe5383b).stroke({ width: 2, color: INK });
  g.circle(2.3 * w + 6, by - 34, 12).fill(0xffd43b).stroke({ width: 2, color: INK });
  g.rect(2.3 * w + 18, by - 50, 10, 26).fill(0x4dabf7).stroke({ width: 2, color: INK });
}
