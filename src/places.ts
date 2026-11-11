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
  stool: { url: 'props/stool.svg', size: 0.6 },
  couch: { url: 'props/couch.svg', size: 1.7 },
  armchair: { url: 'props/armchair.svg', size: 0.85 },
  trampoline: { url: 'props/trampoline.svg', size: 0.8 },
  'bed-tiedye': { url: 'props/bed-tiedye.svg', size: 1.45 },
  daybed: { url: 'props/daybed.svg', size: 1.4 },
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

export type PlaceId = 'fire' | 'police' | 'school' | 'park' | RoomId;
/** Rooms inside the family house. Their names are set on the iPad, not here. */
export type RoomId = 'bedroom-a' | 'bedroom-b' | 'lounge' | 'kitchen';
export const ROOMS: RoomId[] = ['bedroom-a', 'bedroom-b', 'lounge', 'kitchen'];

/** What's on the street, left to right. The house opens the house view. */
export const STREET: { id: PlaceId | 'house'; building: string }[] = [
  { id: 'house', building: 'buildings/house.svg' },
  { id: 'fire', building: 'buildings/fire.svg' },
  { id: 'police', building: 'buildings/police.svg' },
  { id: 'school', building: 'buildings/school.svg' },
  { id: 'park', building: 'buildings/park.svg' },
];

export interface PlaceDef {
  id: PlaceId;
  /** Rooms belong to the house: "back" goes to the house, not the street. */
  parent?: 'house';
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

function heart(g: Graphics, cx: number, cy: number, s: number, color: number) {
  g.circle(cx - s * 0.5, cy - s * 0.2, s * 0.6).circle(cx + s * 0.5, cy - s * 0.2, s * 0.6).fill(color);
  g.poly([cx - s * 1.08, cy, cx + s * 1.08, cy, cx, cy + s * 1.2]).fill(color);
}

function star(g: Graphics, cx: number, cy: number, r: number, color: number) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.poly(pts).fill(color).stroke({ width: 3, color: INK });
}

/** A small seeded random generator, so decorations land in the same place every time. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function darkWoodFloor(g: Graphics, w: number, h: number, top: number) {
  g.rect(0, h * top, w, h * (1 - top)).fill(0x3b2620);
  for (let y = h * top + 24; y < h; y += 30) g.moveTo(0, y).lineTo(w, y);
  g.stroke({ width: 2, color: 0x2a1b17 });
  g.rect(0, h * top - 6, w, 12).fill(0xffffff).stroke({ width: 3, color: INK });
}

function blinds(g: Graphics, x: number, y: number, ww: number, wh: number, frame: number) {
  g.rect(x, y, ww, wh).fill(0xf4f4f4).stroke({ width: 10, color: frame });
  for (let yy = y + 10; yy < y + wh - 6; yy += 18) g.rect(x + 5, yy, ww - 10, 8).fill(0xc9cdd2);
}

function frame(g: Graphics, x: number, y: number, fw: number, fh: number) {
  g.rect(x, y, fw, fh).fill(0xf1f1f1).stroke({ width: 7, color: 0x1f1f1f });
}

function butterfly(g: Graphics, x: number, y: number, s: number, color: number, tilt: number) {
  const dx = Math.cos(tilt) * s, dy = Math.sin(tilt) * s;
  g.ellipse(x - dx * 0.6, y - dy * 0.6 - s * 0.2, s * 0.6, s * 0.8).ellipse(x + dx * 0.6, y + dy * 0.6 - s * 0.2, s * 0.6, s * 0.8).fill(color);
  g.ellipse(x - dx * 0.5, y - dy * 0.5 + s * 0.5, s * 0.4, s * 0.5).ellipse(x + dx * 0.5, y + dy * 0.5 + s * 0.5, s * 0.4, s * 0.5).fill(color);
  g.rect(x - 1.5, y - s * 0.7, 3, s * 1.6).fill(INK);
}

export const PLACES: PlaceDef[] = [
  {
    // First bedroom (its name is set on the iPad): geometric painted wall, daybed.
    id: 'bedroom-a',
    parent: 'house',
    toys: ['daybed', 'ball', 'books'],
    start: [
      { name: 'daybed', x: 0.66, y: 0.79 },
      { name: 'ball', x: 0.4, y: 0.9 },
    ],
    drawBackdrop(g, w, h) {
      const floor = 0.74;
      g.rect(0, 0, w, h * floor).fill(0xe4e6ea);
      // the painted feature wall
      const x0 = w * 0.48, fy = h * floor;
      g.poly([x0, 0, w * 0.62, 0, w * 0.56, fy, x0, fy]).fill(0xd4e94a);
      g.poly([w * 0.62, 0, w, 0, w * 0.56, fy]).fill(0xfbfbfb);
      g.poly([w, 0, w, fy, w * 0.56, fy]).fill(0x9fd8e8);
      g.moveTo(w * 0.62, 0).lineTo(w * 0.56, fy).moveTo(w, 0).lineTo(w * 0.56, fy).stroke({ width: 6, color: 0xffffff });
      g.moveTo(x0, 0).lineTo(x0, fy).stroke({ width: 3, color: 0xc9cdd2 });
      // grey carpet
      g.rect(0, fy, w, h - fy).fill(0x5f5a57);
      g.rect(0, fy - 6, w, 12).fill(0xffffff).stroke({ width: 3, color: INK });
      // window with blackout blind and a spotty valance
      const wx = w * 0.15, wy = h * 0.16, ww = w * 0.24, wh = h * 0.34;
      g.rect(wx, wy, ww, wh).fill(0x1f1f1f).stroke({ width: 6, color: INK });
      g.rect(wx - 14, wy - 30, ww + 28, h * 0.11).fill(0xf6f7f2).stroke({ width: 4, color: INK });
      g.rect(wx - 14, wy - 30 + h * 0.11 - 14, ww + 28, 8).fill(0x9fd8e8);
      g.rect(wx - 14, wy - 30 + h * 0.11 - 6, ww + 28, 6).fill(0xd4e94a);
      const rnd = seeded(7);
      for (let i = 0; i < 40; i++) g.circle(wx - 10 + rnd() * (ww + 20), wy - 24 + rnd() * (h * 0.11 - 26), 2.5).fill(0x6c757d);
      g.moveTo(wx - 24, wy - 30).lineTo(wx + ww + 24, wy - 30).stroke({ width: 5, color: 0x6c757d });
      // turquoise dresser with a lamp
      const dx = w * 0.0, dy = h * 0.46, dw = w * 0.17, dh = fy - dy;
      g.rect(dx, dy, dw, dh).fill(0x8ecdd0).stroke({ width: 5, color: INK });
      g.rect(dx, dy, dw + 10, 16).fill(0xa8dadc).stroke({ width: 4, color: INK });
      for (let i = 1; i < 3; i++) g.moveTo(dx, dy + (dh * i) / 3).lineTo(dx + dw, dy + (dh * i) / 3).stroke({ width: 3, color: INK });
      g.rect(dx + dw * 0.45, dy - h * 0.12, 8, h * 0.12).fill(0xf6f7f2).stroke({ width: 2, color: INK });
      g.poly([dx + dw * 0.18, dy - h * 0.12, dx + dw * 0.82, dy - h * 0.12, dx + dw * 0.72, dy - h * 0.22, dx + dw * 0.28, dy - h * 0.22])
        .fill(0xfff1c1)
        .stroke({ width: 4, color: INK });
      g.poly([dx + dw * 0.38, dy - h * 0.14, dx + dw * 0.46, dy - h * 0.19, dx + dw * 0.5, dy - h * 0.14]).fill(0xf4a261); // a little fox
    },
  },
  {
    // Second bedroom (its name is set on the iPad): turquoise wall, butterflies, tie-dye bed.
    id: 'bedroom-b',
    parent: 'house',
    toys: ['bed-tiedye', 'flower', 'books', 'ball'],
    start: [
      { name: 'bed-tiedye', x: 0.48, y: 0.78 },
      { name: 'books', x: 0.88, y: 0.66 },
    ],
    drawBackdrop(g, w, h) {
      const floor = 0.74, fy = h * floor;
      g.rect(0, 0, w * 0.45, fy).fill(0x7fdde0);
      g.rect(w * 0.45, 0, w * 0.55, fy).fill(0xf6f6f8);
      g.moveTo(w * 0.45, 0).lineTo(w * 0.45, fy).stroke({ width: 3, color: 0xc9cdd2 });
      g.rect(0, fy, w, h - fy).fill(0x6b625c);
      g.rect(0, fy - 6, w, 12).fill(0xffffff).stroke({ width: 3, color: INK });
      // window with sheer white curtains
      const wx = w * 0.18, wy = h * 0.12, ww = w * 0.2, wh = h * 0.38;
      g.rect(wx, wy, ww, wh).fill(0xdff3ff).stroke({ width: 6, color: 0xffffff });
      g.moveTo(wx - 30, wy - 8).lineTo(wx + ww + 30, wy - 8).stroke({ width: 5, color: 0x1f1f1f });
      g.rect(wx - 26, wy - 6, ww * 0.45, wh + h * 0.2).fill({ color: 0xffffff, alpha: 0.85 });
      g.rect(wx + ww * 0.6, wy - 6, ww * 0.45, wh + h * 0.2).fill({ color: 0xffffff, alpha: 0.85 });
      // stripy framed art
      const art = (x: number, y: number, fw: number, fh: number) => {
        frame(g, x, y, fw, fh);
        const cols = [0x3a3a3a, 0xff8fa3, 0x2a9d8f, 0xe9ecef, 0x1d3557];
        cols.forEach((c, i) => g.rect(x + 8, y + 8 + ((fh - 16) * i) / cols.length, fw - 16, (fh - 16) / cols.length).fill(c));
      };
      art(w * 0.03, h * 0.16, w * 0.11, h * 0.18);
      art(w * 0.4 - w * 0.035, h * 0.18, w * 0.035, h * 0.08);
      art(w * 0.4 - w * 0.035, h * 0.3, w * 0.035, h * 0.08);
      // a big swoop of butterflies on the white wall
      const rnd = seeded(11);
      const colours = [0xff8fb1, 0xb07de8, 0x7fdde0, 0xffd166, 0x9ad0f5, 0xffb3c6, 0xc3b1ff];
      for (let i = 0; i < 70; i++) {
        const t = rnd();
        const x = w * (0.5 + 0.46 * t) + (rnd() - 0.5) * w * 0.06;
        const y = h * (0.42 - 0.34 * t) + (rnd() - 0.5) * h * 0.22;
        butterfly(g, x, y, 7 + rnd() * 6, colours[i % colours.length], (rnd() - 0.5) * 0.8);
      }
      // a few drawings pinned up
      g.rect(w * 0.52, h * 0.1, w * 0.04, h * 0.1).fill(0x9fd8e8).stroke({ width: 3, color: INK });
      g.rect(w * 0.86, h * 0.36, w * 0.08, h * 0.1).fill(0xffffff).stroke({ width: 3, color: INK });
      g.rect(w * 0.7, h * 0.46, w * 0.06, h * 0.07).fill(0x7bd36b).stroke({ width: 3, color: INK });
      // white desk with a purple sparkly lamp
      const dx = w * 0.82, dy = h * 0.52;
      g.rect(dx, dy, w * 0.18, 16).fill(0xffffff).stroke({ width: 4, color: INK });
      g.rect(dx + 10, dy + 16, 12, fy - dy - 16).fill(0xffffff).stroke({ width: 3, color: INK });
      g.rect(w - 22, dy + 16, 12, fy - dy - 16).fill(0xffffff).stroke({ width: 3, color: INK });
      g.ellipse(dx + w * 0.13, dy - h * 0.07, w * 0.03, h * 0.06).fill(0xd0a8ff).stroke({ width: 3, color: INK });
      for (let i = 0; i < 6; i++) g.circle(dx + w * 0.13 + (rnd() - 0.5) * w * 0.04, dy - h * 0.07 + (rnd() - 0.5) * h * 0.08, 2.5).fill(0xffffff);
      // round black side table and the purple fluffy rug
      g.ellipse(w * 0.7, h * 0.62, w * 0.04, h * 0.015).fill(0x1f1f1f);
      g.moveTo(w * 0.68, h * 0.62).lineTo(w * 0.67, fy).moveTo(w * 0.72, h * 0.62).lineTo(w * 0.73, fy).stroke({ width: 4, color: 0x1f1f1f });
      g.ellipse(w * 0.14, h * 0.9, w * 0.14, h * 0.08).fill(0xc8a2e8).stroke({ width: 4, color: 0xa77bd1 });
    },
  },
  {
    // Lounge room: grey walls, big window with blinds, TV, pictures, grey couch.
    id: 'lounge',
    parent: 'house',
    toys: ['couch', 'armchair', 'trampoline', 'ball'],
    start: [
      { name: 'couch', x: 0.68, y: 0.7 },
      { name: 'armchair', x: 0.16, y: 0.76 },
      { name: 'trampoline', x: 0.44, y: 0.88 },
    ],
    drawBackdrop(g, w, h) {
      const floor = 0.72;
      g.rect(0, 0, w, h * floor).fill(0xe9ecef);
      darkWoodFloor(g, w, h, floor);
      // shaggy rug
      g.roundRect(w * 0.26, h * 0.78, w * 0.6, h * 0.17, 10).fill(0xd6ccc2);
      const rnd = seeded(5);
      for (let i = 0; i < 120; i++) {
        const x = w * (0.27 + rnd() * 0.58), y = h * (0.79 + rnd() * 0.15);
        g.moveTo(x, y).lineTo(x + 3, y + 6);
      }
      g.stroke({ width: 2, color: 0xbdb2a7 });
      // big window with blinds on the right
      blinds(g, w * 0.66, h * 0.1, w * 0.32, h * 0.4, 0xffffff);
      g.moveTo(w * 0.82, h * 0.1).lineTo(w * 0.82, h * 0.5).stroke({ width: 6, color: 0xffffff });
      // a big picture of a black-and-white dog
      frame(g, w * 0.02, h * 0.08, w * 0.11, h * 0.42);
      const cx = w * 0.075, cy = h * 0.28, r = Math.min(w * 0.04, h * 0.08);
      g.circle(cx, cy, r).fill(0xffffff).stroke({ width: 3, color: INK });
      g.ellipse(cx - r * 0.8, cy - r * 0.6, r * 0.45, r * 0.7).ellipse(cx + r * 0.8, cy - r * 0.6, r * 0.45, r * 0.7).fill(0x1f1f1f);
      g.poly([cx - r * 0.6, cy - r * 0.9, cx - r * 0.1, cy - r * 0.9, cx - r * 0.15, cy + r * 0.2, cx - r * 0.7, cy - r * 0.1]).fill(0x1f1f1f);
      g.circle(cx - r * 0.35, cy - r * 0.15, 3).circle(cx + r * 0.35, cy - r * 0.15, 3).circle(cx, cy + r * 0.35, 5).fill(0x1f1f1f);
      // TV on a dark wood stand
      g.rect(w * 0.15, h * 0.5, w * 0.17, h * 0.22 - 6).fill(0x3e2723).stroke({ width: 4, color: INK });
      g.rect(w * 0.155, h * 0.24, w * 0.16, h * 0.24).fill(0x111111).stroke({ width: 4, color: INK });
      g.rect(w * 0.165, h * 0.26, w * 0.14, h * 0.2).fill(0x2b2d42);
      // tall mirror
      g.rect(w * 0.35, h * 0.14, w * 0.06, h * 0.34).fill(0xcfe3ee).stroke({ width: 8, color: 0x3e2723 });
      g.moveTo(w * 0.36, h * 0.2).lineTo(w * 0.39, h * 0.16).stroke({ width: 4, color: 0xffffff, alpha: 0.8 });
      // three black-and-white pictures
      const pics = [0.44, 0.52, 0.6];
      pics.forEach((px, i) => {
        frame(g, w * px, h * 0.12, w * 0.075, h * 0.13);
        const fx = w * px, fy = h * 0.12, fw = w * 0.075, fh = h * 0.13;
        if (i === 0) g.rect(fx + fw * 0.2, fy + fh * 0.35, fw * 0.15, fh * 0.45).rect(fx + fw * 0.65, fy + fh * 0.35, fw * 0.15, fh * 0.45).fill(0x6c757d);
        if (i === 1) g.circle(fx + fw / 2, fy + fh / 2, fh * 0.28).fill(0x8d8d8d);
        if (i === 2) g.poly([fx + 8, fy + fh - 8, fx + fw * 0.4, fy + fh * 0.4, fx + fw - 8, fy + fh - 8]).fill(0x6c757d);
      });
      // floor lamp
      g.rect(w * 0.635, h * 0.36, 6, h * 0.36 - 6).fill(0x6c757d);
      g.poly([w * 0.605, h * 0.38, w * 0.67, h * 0.38, w * 0.655, h * 0.29, w * 0.62, h * 0.29]).fill(0xffffff).stroke({ width: 3, color: INK });
    },
  },
  {
    // Kitchen: white cupboards, tiled splashback, three black pendant lights, island.
    id: 'kitchen',
    parent: 'house',
    toys: ['fridge', 'stool', 'table'],
    start: [
      { name: 'fridge', x: 0.1, y: 0.58 },
      { name: 'stool', x: 0.32, y: 0.9 },
      { name: 'stool', x: 0.47, y: 0.9 },
      { name: 'stool', x: 0.62, y: 0.9 },
    ],
    drawBackdrop(g, w, h) {
      const floor = 0.74, fy = h * floor;
      g.rect(0, 0, w, fy).fill(0xeef1f4);
      darkWoodFloor(g, w, h, floor);
      const white = 0xfbfbf8;
      const cupboard = (x: number, y: number, cw: number, ch: number, handle: 'v' | 'h') => {
        g.rect(x, y, cw, ch).fill(white).stroke({ width: 3, color: 0xadb5bd });
        g.rect(x + 6, y + 6, cw - 12, ch - 12).stroke({ width: 2, color: 0xced4da });
        if (handle === 'v') g.rect(x + cw - 14, y + ch * 0.35, 4, ch * 0.3).fill(0x8d99ae);
        else g.rect(x + cw * 0.3, y + 12, cw * 0.4, 4).fill(0x8d99ae);
      };
      // subway-tile splashback
      g.rect(w * 0.2, h * 0.3, w * 0.6, h * 0.17).fill(0xffffff);
      for (let r = 0, y = h * 0.3; y < h * 0.47; r++, y += 16) {
        g.moveTo(w * 0.2, y).lineTo(w * 0.8, y);
        for (let x = w * 0.2 + (r % 2) * 20; x < w * 0.8; x += 40) g.moveTo(x, y).lineTo(x, y + 16);
      }
      g.stroke({ width: 1.5, color: 0xadb5bd });
      // window with blinds over the sink
      blinds(g, w * 0.42, h * 0.15, w * 0.18, h * 0.22, 0xffffff);
      // upper cupboards and microwave
      cupboard(w * 0.2, h * 0.08, w * 0.11, h * 0.22, 'v');
      cupboard(w * 0.31, h * 0.08, w * 0.11, h * 0.22, 'v');
      cupboard(w * 0.6, h * 0.08, w * 0.06, h * 0.22, 'v');
      g.rect(w * 0.66, h * 0.08, w * 0.14, h * 0.1).fill(white).stroke({ width: 3, color: 0xadb5bd });
      g.roundRect(w * 0.66, h * 0.18, w * 0.14, h * 0.1, 4).fill(0xc0c4c8).stroke({ width: 3, color: INK });
      g.rect(w * 0.675, h * 0.195, w * 0.09, h * 0.07).fill(0x495057);
      // counter and lower cupboards
      g.rect(w * 0.2, h * 0.47, w * 0.6, h * 0.025).fill(0xffffff).stroke({ width: 3, color: 0xadb5bd });
      for (let i = 0; i < 4; i++) cupboard(w * (0.2 + i * 0.1), h * 0.495, w * 0.1, fy - h * 0.495, 'h');
      // steel oven
      g.roundRect(w * 0.6, h * 0.47, w * 0.12, fy - h * 0.47, 4).fill(0xc0c4c8).stroke({ width: 4, color: INK });
      g.roundRect(w * 0.615, h * 0.56, w * 0.09, h * 0.12, 4).fill(0x343a40);
      g.rect(w * 0.6, h * 0.47, w * 0.12, h * 0.035).fill(0x212529);
      cupboard(w * 0.72, h * 0.495, w * 0.08, fy - h * 0.495, 'h');
      // tall pantry cupboards on the right
      cupboard(w * 0.82, h * 0.08, w * 0.08, fy - h * 0.08, 'v');
      cupboard(w * 0.9, h * 0.08, w * 0.08, fy - h * 0.08, 'v');
      // tap
      g.moveTo(w * 0.51, h * 0.47).lineTo(w * 0.51, h * 0.41).lineTo(w * 0.535, h * 0.41).stroke({ width: 5, color: 0x8d99ae });
      // island: white top, dark base
      g.rect(w * 0.22, h * 0.6, w * 0.5, fy + h * 0.1 - h * 0.6).fill(0x1b1f2e).stroke({ width: 5, color: 0xffffff });
      g.rect(w * 0.2, h * 0.58, w * 0.54, h * 0.03).fill(0xffffff).stroke({ width: 3, color: INK });
      // three black pendant lights
      for (const px of [0.3, 0.47, 0.64]) {
        g.moveTo(w * px, 0).lineTo(w * px, h * 0.16).stroke({ width: 3, color: 0x1f1f1f });
        g.poly([w * px - 26, h * 0.24, w * px + 26, h * 0.24, w * px + 14, h * 0.16, w * px - 14, h * 0.16]).fill(0x2b2b2b).stroke({ width: 3, color: INK });
        g.ellipse(w * px, h * 0.24, 22, 5).fill(0xfff3c4);
      }
      // a black-and-white picture on the left wall
      frame(g, w * 0.01, h * 0.12, w * 0.12, h * 0.2);
      g.moveTo(w * 0.04, h * 0.3).quadraticCurveTo(w * 0.07, h * 0.12, w * 0.1, h * 0.3).fill(0x9a9a9a);
    },
  },
  {
    id: 'fire',
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
