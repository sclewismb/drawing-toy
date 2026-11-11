import type { Graphics } from 'pixi.js';
import { hillDots, PALETTE, type Season } from './seasons';

/**
 * Built-in pictures: the sample characters and every place's toys.
 * `size` is how big it starts compared with a normal character.
 */
export const BUILTIN: Record<string, { url: string; size: number }> = {
  monster: { url: 'characters/monster.svg', size: 1 },
  cat: { url: 'characters/cat.svg', size: 1 },
  robot: { url: 'characters/robot.svg', size: 1 },
  // house
  bed: { url: 'props/bed.svg', size: 1.3 },
  sofa: { url: 'props/sofa.svg', size: 1.2 },
  fridge: { url: 'props/fridge.svg', size: 1.1 },
  table: { url: 'props/table.svg', size: 1 },
  // fire station
  'fire-engine': { url: 'props/fire-engine.svg', size: 1.5 },
  helmet: { url: 'props/helmet.svg', size: 0.6 },
  hydrant: { url: 'props/hydrant.svg', size: 0.65 },
  // police station
  'police-car': { url: 'props/police-car.svg', size: 1.5 },
  'police-hat': { url: 'props/police-hat.svg', size: 0.55 },
  cone: { url: 'props/cone.svg', size: 0.55 },
  // school
  'school-desk': { url: 'props/school-desk.svg', size: 0.9 },
  globe: { url: 'props/globe.svg', size: 0.75 },
  books: { url: 'props/books.svg', size: 0.6 },
  // park
  bench: { url: 'props/bench.svg', size: 1.1 },
  slide: { url: 'props/slide.svg', size: 1.3 },
  flower: { url: 'props/flower.svg', size: 0.6 },
  ball: { url: 'props/ball.svg', size: 0.45 },
};

export type PlaceId = 'house' | 'fire' | 'police' | 'school' | 'park';

export interface PlaceDef {
  id: PlaceId;
  building: string; // picture on the street
  toys: string[]; // built-in names that belong here
  /** What's here the very first time (positions as fractions of the screen). */
  start: { name: string; x: number; y: number }[];
  /** Draw the background to fill a w x h screen. */
  drawBackdrop: (g: Graphics, w: number, h: number, season: Season) => void;
  /** Outdoors: falling blossom, leaves or snow show here too. */
  outdoors?: boolean;
}

const INK = 0x3a3a3a;

function floorAndWall(g: Graphics, w: number, h: number, wall: number, floor: number, floorTop = 0.72) {
  g.rect(0, 0, w, h * floorTop).fill(wall);
  g.rect(0, h * floorTop, w, h * (1 - floorTop)).fill(floor);
  g.rect(0, h * floorTop - 8, w, 16).fill(0xffffff).stroke({ width: 4, color: INK });
}

function windowWithSky(g: Graphics, x: number, y: number, ww: number, wh: number) {
  g.roundRect(x, y, ww, wh, 10).fill(0xbfe8ff).stroke({ width: 8, color: INK });
  g.circle(x + ww * 0.7, y + wh * 0.35, Math.min(ww, wh) * 0.14).fill(0xffe066);
  g.moveTo(x + ww / 2, y).lineTo(x + ww / 2, y + wh).moveTo(x, y + wh / 2).lineTo(x + ww, y + wh / 2).stroke({ width: 6, color: INK });
}

export const PLACES: PlaceDef[] = [
  {
    id: 'house',
    building: 'buildings/house.svg',
    toys: ['bed', 'sofa', 'fridge', 'table'],
    start: [
      { name: 'bed', x: 0.22, y: 0.76 },
      { name: 'sofa', x: 0.55, y: 0.74 },
      { name: 'fridge', x: 0.86, y: 0.62 },
      { name: 'table', x: 0.5, y: 0.9 },
    ],
    drawBackdrop(g, w, h) {
      floorAndWall(g, w, h, 0xffe5d9, 0xc68b59);
      for (let x = 30; x < w; x += 60) g.rect(x, 0, 14, h * 0.72 - 8).fill({ color: 0xffffff, alpha: 0.45 });
      for (let y = h * 0.78; y < h; y += h * 0.07) g.moveTo(0, y).lineTo(w, y).stroke({ width: 3, color: 0xa0522d, alpha: 0.5 });
      windowWithSky(g, w * 0.08, h * 0.12, w * 0.22, h * 0.3);
      // a framed heart picture
      const fx = w * 0.62, fy = h * 0.14, fw = w * 0.14, fh = h * 0.2;
      g.roundRect(fx, fy, fw, fh, 6).fill(0xfff8e7).stroke({ width: 8, color: 0xc68b59 });
      const cx = fx + fw / 2, cy = fy + fh / 2, s = Math.min(fw, fh) * 0.22;
      g.circle(cx - s * 0.5, cy - s * 0.2, s * 0.6).circle(cx + s * 0.5, cy - s * 0.2, s * 0.6).fill(0xe5383b);
      g.poly([cx - s * 1.08, cy, cx + s * 1.08, cy, cx, cy + s * 1.2]).fill(0xe5383b);
      // rug
      g.ellipse(w * 0.5, h * 0.88, w * 0.3, h * 0.07).fill({ color: 0x4ea8ff, alpha: 0.55 });
    },
  },
  {
    id: 'fire',
    building: 'buildings/fire.svg',
    toys: ['fire-engine', 'helmet', 'hydrant'],
    start: [
      { name: 'fire-engine', x: 0.62, y: 0.76 },
      { name: 'helmet', x: 0.25, y: 0.86 },
      { name: 'hydrant', x: 0.1, y: 0.8 },
    ],
    drawBackdrop(g, w, h) {
      floorAndWall(g, w, h, 0xc75146, 0xb0b0b0, 0.74);
      // bricks
      const bh = 34, bw = 80;
      for (let row = 0, y = 0; y < h * 0.74 - 8; row++, y += bh) {
        g.moveTo(0, y).lineTo(w, y);
        for (let x = (row % 2) * (bw / 2); x < w; x += bw) g.moveTo(x, y).lineTo(x, y + bh);
      }
      g.stroke({ width: 3, color: 0x9d3a2f });
      // big garage door opening
      g.roundRect(w * 0.38, h * 0.18, w * 0.5, h * 0.56, 14).fill(0x5c5c5c).stroke({ width: 8, color: INK });
      // fire pole
      g.rect(w * 0.16, 0, 18, h * 0.74).fill(0xffd166).stroke({ width: 4, color: INK });
      // yellow and black stripes on the floor
      for (let x = 0; x < w; x += 60) g.poly([x, h * 0.95, x + 30, h * 0.95, x + 50, h, x + 20, h]).fill(0xffd93d);
    },
  },
  {
    id: 'police',
    building: 'buildings/police.svg',
    toys: ['police-car', 'police-hat', 'cone'],
    start: [
      { name: 'police-car', x: 0.35, y: 0.8 },
      { name: 'police-hat', x: 0.12, y: 0.86 },
      { name: 'cone', x: 0.58, y: 0.88 },
    ],
    drawBackdrop(g, w, h) {
      floorAndWall(g, w, h, 0xcfe1ff, 0x7d8597);
      // floor tiles
      for (let x = 0; x < w; x += 70) g.moveTo(x, h * 0.72).lineTo(x - 40, h).stroke({ width: 3, color: 0x5c6273 });
      windowWithSky(g, w * 0.08, h * 0.14, w * 0.2, h * 0.26);
      // jail cell on the right
      const x0 = w * 0.66, x1 = w * 0.97, y0 = h * 0.12, y1 = h * 0.72;
      g.rect(x0, y0, x1 - x0, y1 - y0).fill(0x9aa5b1).stroke({ width: 6, color: INK });
      g.rect(x0, y0, x1 - x0, 20).fill(0x5c6273).stroke({ width: 4, color: INK });
      for (let x = x0 + 24; x < x1 - 10; x += 34) g.rect(x, y0 + 20, 10, y1 - y0 - 20).fill(0x3a3a3a);
      // badge on the wall
      const bx = w * 0.42, by = h * 0.26, r = Math.min(w, h) * 0.07;
      const pts: number[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
      }
      g.poly(pts).fill(0xffd93d).stroke({ width: 5, color: INK });
    },
  },
  {
    id: 'school',
    building: 'buildings/school.svg',
    toys: ['school-desk', 'globe', 'books'],
    start: [
      { name: 'school-desk', x: 0.3, y: 0.82 },
      { name: 'school-desk', x: 0.62, y: 0.82 },
      { name: 'globe', x: 0.88, y: 0.7 },
      { name: 'books', x: 0.12, y: 0.86 },
    ],
    drawBackdrop(g, w, h) {
      floorAndWall(g, w, h, 0xfff3b0, 0xc68b59);
      // blackboard with chalk doodles (no words)
      const x = w * 0.22, y = h * 0.1, bw = w * 0.56, bh = h * 0.36;
      g.roundRect(x - 12, y - 12, bw + 24, bh + 24, 10).fill(0xa0522d).stroke({ width: 6, color: INK });
      g.rect(x, y, bw, bh).fill(0x2f6f4f);
      const chalk = { width: 5, color: 0xffffff, alpha: 0.85 };
      const sx = x + bw * 0.2, sy = y + bh * 0.4, sr = bh * 0.14;
      g.circle(sx, sy, sr).stroke(chalk);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3).lineTo(sx + Math.cos(a) * sr * 1.8, sy + Math.sin(a) * sr * 1.8);
      }
      g.stroke(chalk);
      const fx = x + bw * 0.55, fy = y + bh * 0.5, fr = bh * 0.22;
      g.circle(fx, fy, fr).stroke(chalk);
      g.circle(fx - fr * 0.35, fy - fr * 0.2, 4).circle(fx + fr * 0.35, fy - fr * 0.2, 4).fill({ color: 0xffffff, alpha: 0.85 });
      const sr2 = fr * 0.55;
      g.moveTo(fx + Math.cos(0.3) * sr2, fy + Math.sin(0.3) * sr2).arc(fx, fy, sr2, 0.3, Math.PI - 0.3).stroke(chalk);
      // a little chalk house
      const hx = x + bw * 0.82, hy = y + bh * 0.5, hs = bh * 0.16;
      g.rect(hx - hs, hy - hs * 0.2, hs * 2, hs * 1.6).stroke(chalk);
      g.moveTo(hx - hs * 1.3, hy - hs * 0.2).lineTo(hx, hy - hs * 1.3).lineTo(hx + hs * 1.3, hy - hs * 0.2).stroke(chalk);
      // clock
      const cx = w * 0.9, cy = h * 0.18, cr = Math.min(w, h) * 0.06;
      g.circle(cx, cy, cr).fill(0xffffff).stroke({ width: 6, color: INK });
      g.moveTo(cx, cy).lineTo(cx, cy - cr * 0.7).moveTo(cx, cy).lineTo(cx + cr * 0.5, cy).stroke({ width: 5, color: INK });
    },
  },
  {
    id: 'park',
    building: 'buildings/park.svg',
    toys: ['bench', 'slide', 'flower', 'ball'],
    start: [
      { name: 'monster', x: 0.25, y: 0.68 },
      { name: 'cat', x: 0.5, y: 0.68 },
      { name: 'robot', x: 0.75, y: 0.68 },
      { name: 'slide', x: 0.86, y: 0.62 },
      { name: 'bench', x: 0.14, y: 0.66 },
      { name: 'flower', x: 0.4, y: 0.84 },
      { name: 'ball', x: 0.62, y: 0.88 },
    ],
    outdoors: true,
    drawBackdrop(g, w, h, season) {
      const pal = PALETTE[season];
      g.rect(0, 0, w, h).fill(pal.sky);
      g.ellipse(w * 0.2, h * 0.72, w * 0.4, h * 0.2).fill(pal.hillBack);
      hillDots(g, w * 0.2, h * 0.72, w * 0.4, h * 0.2, pal.dots, 3);
      g.ellipse(w * 0.75, h * 0.74, w * 0.45, h * 0.22).fill(pal.hillFront);
      hillDots(g, w * 0.75, h * 0.74, w * 0.45, h * 0.22, pal.dots, 4);
      g.rect(0, h * 0.7, w, h * 0.3).fill(pal.grass);
      if (season === 'winter') g.rect(0, h * 0.7, w, 4).fill(0xc9d6e3);
      g.circle(w * 0.85, h * 0.15, Math.min(w, h) * 0.08 * pal.sunSize).fill(pal.sun);
      for (const [cx, cy, s] of [[0.2, 0.15, 1], [0.55, 0.1, 0.8]]) {
        const x = w * cx, y = h * cy, r = Math.min(w, h) * 0.05 * s;
        g.circle(x, y, r).circle(x + r, y - r * 0.4, r * 1.2).circle(x + r * 2.1, y, r).fill(pal.cloud);
      }
    },
  },
];

export const placeById = (id: string) => PLACES.find((p) => p.id === id);
