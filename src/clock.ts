import type { Graphics } from 'pixi.js';

const INK = 0x3a3a3a;

/** Clock face: white circle with a mark for each hour. */
export function drawClockFace(g: Graphics, x: number, y: number, r: number) {
  g.circle(x, y, r).fill(0xffffff).stroke({ width: Math.max(3, r * 0.12), color: INK });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const inner = i % 3 === 0 ? 0.7 : 0.8;
    g.moveTo(x + Math.cos(a) * r * inner, y + Math.sin(a) * r * inner).lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
  }
  g.stroke({ width: Math.max(1.5, r * 0.05), color: INK, cap: 'round' });
}

/** Clock hands showing the real time (redraw every second). */
export function drawClockHands(g: Graphics, x: number, y: number, r: number, now = new Date(), seconds = true) {
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const top = -Math.PI / 2;
  const hourA = top + ((h + m / 60) / 12) * Math.PI * 2;
  const minA = top + ((m + s / 60) / 60) * Math.PI * 2;
  const secA = top + (s / 60) * Math.PI * 2;
  g.clear();
  g.moveTo(x, y)
    .lineTo(x + Math.cos(hourA) * r * 0.5, y + Math.sin(hourA) * r * 0.5)
    .stroke({ width: Math.max(3, r * 0.13), color: INK, cap: 'round' });
  g.moveTo(x, y)
    .lineTo(x + Math.cos(minA) * r * 0.78, y + Math.sin(minA) * r * 0.78)
    .stroke({ width: Math.max(2, r * 0.08), color: INK, cap: 'round' });
  if (seconds) {
    g.moveTo(x, y)
      .lineTo(x + Math.cos(secA) * r * 0.84, y + Math.sin(secA) * r * 0.84)
      .stroke({ width: Math.max(1.5, r * 0.035), color: 0xe5383b, cap: 'round' });
  }
  g.circle(x, y, Math.max(2.5, r * 0.08)).fill(seconds ? 0xe5383b : INK);
}
