import type { Graphics } from 'pixi.js';
import { INK } from './places';

/**
 * The hockey arena (a made-up one: no team names or logos). Wide like the
 * rooms: the stands and a picture scoreboard up top, glass and boards, and
 * the ice with a net at each end. The crowd, the scoreboard, the ice machine,
 * the mascot, the organ and the goal horn are in eggs/arena.ts. The ice is
 * slippery: things let go on it glide (main.ts).
 */
export const ARENA = { left: 0.6, right: 0.6, floor: 0.62 };

export function arenaLayout(w: number, h: number) {
  return {
    stands: { y0: h * 0.09, y1: h * 0.4 },
    glass: { y0: h * 0.4, y1: h * 0.5 },
    boards: { y0: h * 0.5, y1: h * 0.58 },
    ice: h * 0.58,
    nets: [
      { x: -0.47 * w, dir: 1 }, // opening faces right
      { x: 1.47 * w, dir: -1 }, // opening faces left
    ].map((n) => ({ ...n, y: h * 0.86, w: 0.1 * w, h: h * 0.13 })),
    scoreboard: { x: 0.38 * w, y: h * 0.015, w: 0.24 * w, h: h * 0.13 },
    organ: { x: 1.3 * w, y: h * 0.26 },
  };
}

export function drawArena(g: Graphics, w: number, h: number) {
  const L = arenaLayout(w, h);
  const x0 = -ARENA.left * w, x1 = (1 + ARENA.right) * w;
  // the roof, with spotlights
  g.rect(x0, 0, x1 - x0, L.stands.y0).fill(0x1d2b4f);
  for (let x = x0 + 60; x < x1; x += 220) g.circle(x, h * 0.04, 10).fill(0xfff3b0).stroke({ width: 2, color: INK });
  // banners hanging from the roof (plain colours, no words)
  const banners = [0xe5383b, 0x4dabf7, 0xffd43b, 0x20c997, 0x9775fa];
  for (let x = x0 + 140, i = 0; x < x1; x += 330, i++) {
    if (Math.abs(x - 0.5 * w) < 0.18 * w) continue; // (the scoreboard is there)
    g.poly([x - 26, 0, x + 26, 0, x + 26, h * 0.1, x, h * 0.13, x - 26, h * 0.1]).fill(banners[i % banners.length]).stroke({ width: 3, color: INK });
    g.star(x, h * 0.05, 5, 10, 4).fill(0xffffff);
  }
  // the stands (the crowd sits in them: see eggs)
  const st = L.stands;
  g.rect(x0, st.y0, x1 - x0, st.y1 - st.y0).fill(0x2b3a67);
  for (let i = 0; i < 4; i++) {
    const y = st.y0 + ((st.y1 - st.y0) * (i + 1)) / 4;
    g.rect(x0, y - 8, x1 - x0, 8).fill(i % 2 ? 0xe5383b : 0x4dabf7);
  }
  // glass and boards
  const gl = L.glass, bd = L.boards;
  g.rect(x0, gl.y0, x1 - x0, gl.y1 - gl.y0).fill({ color: 0xdff3ff, alpha: 0.85 });
  for (let x = x0; x < x1; x += 140) g.rect(x - 2, gl.y0, 4, gl.y1 - gl.y0).fill(0xb8d8ea);
  g.moveTo(x0, gl.y0 + 10).lineTo(x1, gl.y0 + 10).stroke({ width: 3, color: 0xffffff, alpha: 0.8 });
  g.rect(x0, bd.y0, x1 - x0, bd.y1 - bd.y0).fill(0xffffff).stroke({ width: 3, color: INK });
  g.rect(x0, bd.y1 - 12, x1 - x0, 12).fill(0xffd43b);
  // plain coloured panels on the boards (no ads)
  for (let x = x0 + 40, i = 0; x < x1; x += 260, i++) g.roundRect(x, bd.y0 + 8, 160, bd.y1 - bd.y0 - 26, 6).fill(banners[(i + 2) % banners.length]);
  // the ice and its lines
  g.rect(x0, L.ice, x1 - x0, h - L.ice).fill(0xeef6fb);
  for (let x = x0 + 30; x < x1; x += 90) g.moveTo(x, L.ice + 20).lineTo(x + 40, L.ice + 18);
  g.stroke({ width: 2, color: 0xffffff });
  const lineAt = (x: number, col: number, wdt = 10) => g.rect(x - wdt / 2, L.ice, wdt, h - L.ice).fill({ color: col, alpha: 0.75 });
  lineAt(0.5 * w, 0xe5383b, 12);
  lineAt(0.13 * w, 0x2f6fd8);
  lineAt(0.87 * w, 0x2f6fd8);
  lineAt(-0.42 * w, 0xe5383b, 5);
  lineAt(1.42 * w, 0xe5383b, 5);
  const cy = L.ice + (h - L.ice) * 0.5;
  g.ellipse(0.5 * w, cy, 0.12 * w, (h - L.ice) * 0.28).stroke({ width: 4, color: 0x2f6fd8, alpha: 0.75 });
  g.circle(0.5 * w, cy, 6).fill(0x2f6fd8);
  for (const fx of [-0.2, 1.2]) {
    g.ellipse(fx * w, cy, 0.1 * w, (h - L.ice) * 0.24).stroke({ width: 4, color: 0xe5383b, alpha: 0.7 });
    g.circle(fx * w, cy, 6).fill(0xe5383b);
  }
  // the nets, each with a blue crease in front
  for (const n of L.nets) {
    const front = n.x + (n.dir > 0 ? n.w : 0);
    g.moveTo(front, n.y - n.h * 0.2).arc(front, n.y - n.h * 0.2, n.h * 0.5, n.dir > 0 ? -Math.PI / 2 : Math.PI / 2, n.dir > 0 ? Math.PI / 2 : Math.PI * 1.5).closePath().fill({ color: 0x9bd0ff, alpha: 0.7 });
    g.rect(n.x, n.y - n.h, n.w, n.h).fill({ color: 0xffffff, alpha: 0.85 });
    for (let x = n.x + 8; x < n.x + n.w; x += 12) g.moveTo(x, n.y - n.h).lineTo(x, n.y);
    for (let y = n.y - n.h + 8; y < n.y; y += 12) g.moveTo(n.x, y).lineTo(n.x + n.w, y);
    g.stroke({ width: 1.5, color: 0xadb5bd });
    g.moveTo(front, n.y).lineTo(front, n.y - n.h).lineTo(n.x + (n.dir > 0 ? 0 : n.w), n.y - n.h * 0.8).lineTo(n.x + (n.dir > 0 ? 0 : n.w), n.y).stroke({ width: 7, color: 0xe5383b, join: 'round' });
  }
  // the organ booth up in the stands
  const o = L.organ;
  g.roundRect(o.x - 60, o.y - 20, 120, 60, 10).fill(0x8d5524).stroke({ width: 3, color: INK });
  g.rect(o.x - 50, o.y - 6, 100, 16).fill(0xffffff).stroke({ width: 2, color: INK });
  for (let x = o.x - 44; x < o.x + 46; x += 14) g.rect(x, o.y - 6, 7, 10).fill(0x1f1f1f);
  // the scoreboard's frame (its lights are in the eggs)
  const sb = L.scoreboard;
  g.rect(sb.x + sb.w * 0.3, 0, 6, sb.y).rect(sb.x + sb.w * 0.7, 0, 6, sb.y).fill(0x6c757d);
  g.roundRect(sb.x, sb.y, sb.w, sb.h, 10).fill(0x1f1f1f).stroke({ width: 4, color: INK });
}
