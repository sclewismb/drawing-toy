import type { Graphics } from 'pixi.js';
import { INK } from './places';
import { PALETTE, type Season } from './seasons';
import type { SkyDef } from './sky';

/**
 * The fairground (a made-up one). Like the wide rooms: x = 0..w is the
 * middle (the big Ferris wheel), the entrance with the ticket booth, the
 * candy floss and the balloons is to the left, and the carousel, hook-a-duck
 * and the big top are to the right. Things that move or can be tapped
 * (the wheel, the carousel...) are in eggs/fair.ts.
 */
export const FAIR = { left: 0.75, right: 0.85, ground: 0.66 };

export function fairSky(w: number, h: number, season: Season): SkyDef {
  const pal = PALETTE[season];
  const u = Math.min(w, h);
  return {
    x0: -FAIR.left * w,
    x1: (1 + FAIR.right) * w,
    h,
    color: pal.sky,
    sun: { x: w * 0.12, y: h * 0.12, r: u * 0.07 * pal.sunSize, color: pal.sun, rays: true },
    clouds: [[-0.6, 0.1, 0.9], [-0.1, 0.07, 0.7], [0.75, 0.12, 0.8], [1.3, 0.08, 1], [1.65, 0.16, 0.6]].map(([fx, fy, s]) => ({ x: w * fx, y: h * fy, r: u * 0.045 * s })),
    cloudColor: pal.cloud,
  };
}

/** A striped stall with a roof and a counter (the food or game goes on top: see eggs). */
export function stall(g: Graphics, x: number, base: number, sw: number, sh: number, stripe: number) {
  g.rect(x, base - sh * 0.62, sw, sh * 0.62).fill(0xfff3e6).stroke({ width: 4, color: INK });
  g.rect(x - 6, base - sh * 0.3, sw + 12, 14).fill(0xc68b59).stroke({ width: 3, color: INK }); // counter
  // stripy awning with a scalloped edge
  const top = base - sh, n = 6;
  g.rect(x - 10, top, sw + 20, sh * 0.2).fill(0xffffff).stroke({ width: 4, color: INK });
  for (let i = 0; i < n; i += 2) g.rect(x - 10 + ((sw + 20) * i) / n, top, (sw + 20) / n, sh * 0.2).fill(stripe);
  for (let i = 0; i < n; i++) {
    const cx = x - 10 + ((sw + 20) * (i + 0.5)) / n;
    g.moveTo(cx - (sw + 20) / n / 2, top + sh * 0.2).arc(cx, top + sh * 0.2, (sw + 20) / n / 2, Math.PI, 0, true).fill(i % 2 ? 0xffffff : stripe).stroke({ width: 3, color: INK });
  }
  g.rect(x - 10, top, sw + 20, sh * 0.2).stroke({ width: 4, color: INK });
  g.moveTo(x, base - sh * 0.62).lineTo(x, top + sh * 0.2).moveTo(x + sw, base - sh * 0.62).lineTo(x + sw, top + sh * 0.2).stroke({ width: 5, color: INK });
}

export function drawFair(g: Graphics, w: number, h: number, season: Season) {
  const pal = PALETTE[season];
  const x0 = -FAIR.left * w, x1 = (1 + FAIR.right) * w;
  const gy = h * FAIR.ground;
  const winter = season === 'winter';

  // grass, and a sandy path all the way along
  g.rect(x0, gy, x1 - x0, h - gy).fill(pal.grass);
  g.rect(x0, h * 0.76, x1 - x0, h * 0.13).fill(winter ? 0xeef2f6 : 0xe9d8a6);
  g.rect(x0, h * 0.76, x1 - x0, 4).fill(winter ? 0xd5dee8 : 0xd4b483);

  // bunting strung between poles, all the way along
  const poles: number[] = [];
  for (let x = x0 + w * 0.05; x < x1; x += w * 0.42) poles.push(x);
  for (const px of poles) g.rect(px - 6, h * 0.18, 12, gy - h * 0.18).fill(0xffffff).stroke({ width: 3, color: INK });
  const flags = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1], sag = h * 0.05;
    const at = (t: number) => ({ x: a + (b - a) * t, y: h * 0.19 + Math.sin(t * Math.PI) * sag });
    g.moveTo(a, h * 0.19);
    for (let t = 0.05; t <= 1.001; t += 0.05) g.lineTo(at(t).x, at(t).y);
    g.stroke({ width: 3, color: INK });
    for (let k = 1; k < 10; k++) {
      const p = at(k / 10);
      g.poly([p.x - 11, p.y, p.x + 11, p.y, p.x, p.y + 24]).fill(flags[(i * 3 + k) % flags.length]).stroke({ width: 2, color: INK });
    }
  }

  // --- left: the entrance arch ---
  const ax = -0.66 * w;
  g.rect(ax - 70, h * 0.3, 26, gy - h * 0.3 + 10).rect(ax + 44, h * 0.3, 26, gy - h * 0.3 + 10).fill(0x4ea8ff).stroke({ width: 4, color: INK });
  g.moveTo(ax - 82, h * 0.32).quadraticCurveTo(ax, h * 0.16, ax + 82, h * 0.32).lineTo(ax + 82, h * 0.37).quadraticCurveTo(ax, h * 0.22, ax - 82, h * 0.37).closePath().fill(0xe5383b).stroke({ width: 4, color: INK });
  for (let i = 0; i < 7; i++) {
    const t = i / 6, bx = ax - 70 + t * 140, by = h * 0.32 - Math.sin(t * Math.PI) * h * 0.115;
    g.circle(bx, by + 6, 6).fill(0xfff3b0).stroke({ width: 2, color: INK });
  }
  // ticket booth
  const tb = -0.47 * w;
  g.rect(tb - 50, gy - h * 0.26, 100, h * 0.26).fill(0xffd166).stroke({ width: 4, color: INK });
  g.poly([tb - 64, gy - h * 0.26, tb, gy - h * 0.36, tb + 64, gy - h * 0.26]).fill(0xe5383b).stroke({ width: 4, color: INK });
  g.roundRect(tb - 32, gy - h * 0.21, 64, h * 0.09, 8).fill(0xbfe8ff).stroke({ width: 3, color: INK });
  g.rect(tb - 44, gy - h * 0.1, 88, 12).fill(0xc68b59).stroke({ width: 3, color: INK });
  // candy floss stall and balloon seller's cart
  stall(g, -0.33 * w, gy, 0.15 * w, h * 0.32, 0xff8fb1);
  const bx = -0.1 * w;
  g.rect(bx - 40, gy - h * 0.12, 80, h * 0.1).fill(0x7bd36b).stroke({ width: 4, color: INK });
  g.circle(bx - 26, gy, 14).circle(bx + 26, gy, 14).fill(0x2b2d42).stroke({ width: 3, color: INK });
  g.rect(bx - 4, gy - h * 0.12, 8, -h * 0.08).fill(0x8d5524);

  // --- middle: the Ferris wheel's stand (the wheel turns: see eggs) ---
  const fx = 0.5 * w, fy = h * 0.37, R = h * 0.27;
  g.moveTo(fx - R * 0.55, gy + 4).lineTo(fx, fy).lineTo(fx + R * 0.55, gy + 4).stroke({ width: 16, color: INK, cap: 'round' });
  g.moveTo(fx - R * 0.55, gy + 4).lineTo(fx, fy).lineTo(fx + R * 0.55, gy + 4).stroke({ width: 9, color: 0xb07de8, cap: 'round' });
  g.roundRect(fx - R * 0.35, gy - 6, R * 0.7, 18, 6).fill(0xc68b59).stroke({ width: 3, color: INK }); // the boarding step

  // --- right: the carousel's base and roof (it turns: see eggs) ---
  const cx = 1.22 * w, cw = 0.32 * w;
  g.ellipse(cx, gy - 4, cw / 2, h * 0.035).fill(0xc68b59).stroke({ width: 4, color: INK });
  g.rect(cx - 8, h * 0.3, 16, gy - h * 0.3).fill(0xffd166).stroke({ width: 3, color: INK });
  g.poly([cx - cw / 2 - 14, h * 0.32, cx, h * 0.17, cx + cw / 2 + 14, h * 0.32]).fill(0xffffff).stroke({ width: 4, color: INK });
  for (let i = 0; i < 6; i++) {
    const a = cx - cw / 2 - 14 + ((cw + 28) * i) / 6;
    if (i % 2 === 0) g.poly([a, h * 0.32, cx, h * 0.17, a + (cw + 28) / 6, h * 0.32]).fill(0xe5383b);
  }
  g.poly([cx - cw / 2 - 14, h * 0.32, cx, h * 0.17, cx + cw / 2 + 14, h * 0.32]).stroke({ width: 4, color: INK });
  g.rect(cx - cw / 2 - 14, h * 0.32, cw + 28, h * 0.035).fill(0x4ea8ff).stroke({ width: 4, color: INK });
  g.moveTo(cx, h * 0.17).lineTo(cx, h * 0.12).stroke({ width: 4, color: INK });
  g.poly([cx, h * 0.12, cx + 26, h * 0.135, cx, h * 0.15]).fill(0xffd166).stroke({ width: 2, color: INK });

  // hook-a-duck stall (its ducks go round: see eggs)
  stall(g, 1.47 * w, gy, 0.17 * w, h * 0.34, 0x4ea8ff);
  // the big top tent
  const tx = 1.74 * w, tw = 0.2 * w;
  g.poly([tx - tw / 2, gy, tx - tw * 0.4, gy - h * 0.2, tx, gy - h * 0.36, tx + tw * 0.4, gy - h * 0.2, tx + tw / 2, gy]).fill(0xffffff).stroke({ width: 4, color: INK });
  for (let i = -2; i <= 2; i++) g.moveTo(tx, gy - h * 0.36).lineTo(tx + i * tw * 0.2, gy).stroke({ width: 12, color: 0xe5383b });
  g.poly([tx - tw / 2, gy, tx - tw * 0.4, gy - h * 0.2, tx, gy - h * 0.36, tx + tw * 0.4, gy - h * 0.2, tx + tw / 2, gy]).stroke({ width: 4, color: INK });
  g.poly([tx - tw * 0.1, gy, tx, gy - h * 0.12, tx + tw * 0.1, gy]).fill(0x2b2d42).stroke({ width: 3, color: INK });
  g.moveTo(tx, gy - h * 0.36).lineTo(tx, gy - h * 0.42).stroke({ width: 4, color: INK });
}
