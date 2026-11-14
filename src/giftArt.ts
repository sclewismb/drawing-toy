/**
 * Wrapped presents (the Christmas wrapping shop): papers, ribbons and bows,
 * all drawn in code. A present is a box seen a little from above and from
 * the side, with paper on every face, a ribbon round it both ways, a bow on
 * top and a tag hanging off it with a picture of who it's for.
 */

export interface WrapRecipe {
  paper: string;
  ribbon: string;
  bow: string;
  /** How wide the box is for its height (a tall box for a tall thing). */
  shape: number;
  /** Who it's for (a player id), shown as a picture on the tag. */
  for?: string;
}

type Ctx = CanvasRenderingContext2D;
const INK = '#3a3a3a';
const T = 60; // a paper's pattern tile

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pickOne = <X>(a: X[]): X => a[Math.floor(Math.random() * a.length)];

/** A small seeded random (so a paper's pattern is the same every time). */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function star(c: Ctx, x: number, y: number, r: number, points = 5, inner = 0.45) {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points, rr = i % 2 ? r * inner : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

function heart(c: Ctx, x: number, y: number, s: number) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9);
  c.closePath();
}

function dot(c: Ctx, x: number, y: number, r: number, fill: string) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

function flake(c: Ctx, x: number, y: number, r: number, col: string, width = 2.4) {
  c.strokeStyle = col;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3, ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
    c.moveTo(x, y);
    c.lineTo(ex, ey);
    // little branches
    const bx = x + Math.cos(a) * r * 0.6, by = y + Math.sin(a) * r * 0.6;
    for (const s of [-1, 1]) c.moveTo(bx, by), c.lineTo(bx + Math.cos(a + s * 0.8) * r * 0.32, by + Math.sin(a + s * 0.8) * r * 0.32);
  }
  c.stroke();
}

/** Diagonal stripes across a tile, in these colours (one stripe each, repeating). */
function stripes(c: Ctx, cols: string[]) {
  const w = T / cols.length;
  for (let k = 0; k < 3; k++) {
    cols.forEach((col, i) => {
      const a = k * T + i * w;
      c.beginPath();
      c.moveTo(a, 0);
      c.lineTo(a + w, 0);
      c.lineTo(a + w - T, T);
      c.lineTo(a - T, T);
      c.closePath();
      c.fillStyle = col;
      c.fill();
    });
  }
}

interface Paper {
  id: string;
  /** Its colours (the first is the background): used for the bits that fly when it's unwrapped. */
  colours: string[];
  /** Draw one T x T tile (the background is already filled in). */
  tile?: (c: Ctx) => void;
}

/** The wrapping papers. */
export const PAPERS: Paper[] = [
  { id: 'red-dots', colours: ['#e03131', '#ffffff'], tile: (c) => (dot(c, 15, 15, 6, '#fff'), dot(c, 45, 45, 6, '#fff')) },
  {
    id: 'green-stars',
    colours: ['#2b8a3e', '#ffd43b'],
    tile: (c) => {
      for (const [x, y, r] of [[15, 15, 9], [45, 45, 9]]) {
        star(c, x, y, r);
        c.fillStyle = '#ffd43b';
        c.fill();
      }
      dot(c, 45, 14, 2, '#fff');
      dot(c, 14, 46, 2, '#fff');
    },
  },
  { id: 'candy', colours: ['#ffffff', '#e5383b'], tile: (c) => stripes(c, ['#e5383b', '#ffffff', '#e5383b', '#ffffff']) },
  { id: 'snowflakes', colours: ['#4dabf7', '#ffffff'], tile: (c) => (flake(c, 15, 15, 10, '#fff'), flake(c, 45, 45, 7, '#fff', 2), dot(c, 46, 13, 2.2, '#fff'), dot(c, 12, 46, 2.2, '#fff')) },
  {
    id: 'trees',
    colours: ['#c92a2a', '#2f9e44'],
    tile: (c) => {
      for (const [x, y] of [[15, 13], [45, 43]]) {
        c.fillStyle = '#8d5524';
        c.fillRect(x - 2, y + 9, 4, 5);
        c.beginPath();
        c.moveTo(x, y - 11);
        c.lineTo(x + 9, y + 10);
        c.lineTo(x - 9, y + 10);
        c.closePath();
        c.fillStyle = '#2f9e44';
        c.fill();
        dot(c, x, y - 12, 2.4, '#ffd43b');
      }
      dot(c, 44, 14, 2, '#fff');
      dot(c, 14, 44, 2, '#fff');
    },
  },
  {
    id: 'holly',
    colours: ['#f8f9fa', '#2f9e44', '#e03131'],
    tile: (c) => {
      for (const [x, y, s] of [[18, 20, 1], [46, 46, 0.7]]) {
        for (const a of [-0.6, 0.6]) {
          c.save();
          c.translate(x, y);
          c.rotate(a + Math.PI / 2);
          c.beginPath();
          c.ellipse(0, -9 * s, 4.5 * s, 9 * s, 0, 0, Math.PI * 2);
          c.fillStyle = '#2f9e44';
          c.fill();
          c.restore();
        }
        for (const [dx, dy] of [[-2.5, 0], [2.5, 0], [0, 3.5]]) dot(c, x + dx * s, y + dy * s, 3 * s, '#e03131');
      }
    },
  },
  {
    id: 'gold',
    colours: ['#f2c94c', '#fff3bf'],
    tile: (c) => {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(0, 22, T, 6);
      for (const [x, y, r] of [[14, 12, 7], [44, 40, 9], [30, 52, 4]]) {
        star(c, x, y, r, 4, 0.3);
        c.fillStyle = '#ffffff';
        c.fill();
      }
    },
  },
  {
    id: 'plaid',
    colours: ['#c92a2a', '#2b8a3e', '#ffd43b'],
    tile: (c) => {
      c.fillStyle = 'rgba(30,90,45,0.65)';
      c.fillRect(8, 0, 16, T);
      c.fillRect(0, 8, T, 16);
      c.fillStyle = 'rgba(20,20,20,0.35)';
      c.fillRect(38, 0, 4, T);
      c.fillRect(0, 38, T, 4);
      c.fillStyle = '#ffd43b';
      c.fillRect(48, 0, 2, T);
      c.fillRect(0, 48, T, 2);
    },
  },
  {
    id: 'hearts',
    colours: ['#ffc9de', '#e64980'],
    tile: (c) => {
      for (const [x, y, s] of [[15, 15, 8], [45, 45, 6]]) {
        heart(c, x, y, s);
        c.fillStyle = '#e64980';
        c.fill();
      }
      dot(c, 45, 14, 2, '#fff');
      dot(c, 14, 46, 2, '#fff');
    },
  },
  { id: 'rainbow', colours: ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'], tile: (c) => stripes(c, ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc']) },
  {
    id: 'night',
    colours: ['#5f3dc4', '#ffd43b'],
    tile: (c) => {
      // a crescent moon and stars
      c.beginPath();
      c.arc(16, 16, 9, 0, Math.PI * 2);
      c.fillStyle = '#ffd43b';
      c.fill();
      c.beginPath();
      c.arc(20, 13, 8, 0, Math.PI * 2);
      c.fillStyle = '#5f3dc4';
      c.fill();
      star(c, 45, 44, 7);
      c.fillStyle = '#ffd43b';
      c.fill();
      dot(c, 46, 15, 2, '#fff');
      dot(c, 14, 47, 2, '#fff');
    },
  },
  {
    id: 'kraft',
    colours: ['#c49a6c', '#ffffff'],
    tile: (c) => {
      const r = seeded(7);
      for (let i = 0; i < 9; i++) dot(c, 4 + r() * 52, 4 + r() * 52, 1.5 + r() * 1.5, '#fff');
      flake(c, 30, 30, 7, '#fff', 1.8);
    },
  },
  {
    id: 'gingerbread',
    colours: ['#a5d8ff', '#b5651d'],
    tile: (c) => {
      for (const [x, y, s] of [[17, 17, 1], [46, 46, 0.75]]) {
        c.fillStyle = '#b5651d';
        dot(c, x, y - 8 * s, 5 * s, '#b5651d');
        c.beginPath();
        c.ellipse(x, y + 3 * s, 5 * s, 7 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#b5651d';
        c.lineWidth = 4 * s;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x - 8 * s, y - 1 * s);
        c.lineTo(x + 8 * s, y - 1 * s);
        c.moveTo(x - 3 * s, y + 8 * s);
        c.lineTo(x - 6 * s, y + 13 * s);
        c.moveTo(x + 3 * s, y + 8 * s);
        c.lineTo(x + 6 * s, y + 13 * s);
        c.stroke();
        dot(c, x, y + 1 * s, 1.2 * s, '#fff');
        dot(c, x, y + 5 * s, 1.2 * s, '#fff');
      }
    },
  },
  {
    id: 'paws',
    colours: ['#ffe066', '#8d5524'],
    tile: (c) => {
      for (const [x, y, s] of [[16, 18, 1], [45, 46, 0.8]]) {
        c.fillStyle = '#8d5524';
        c.beginPath();
        c.ellipse(x, y + 3 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
        c.fill();
        for (const [dx, dy] of [[-6, -4], [-2, -8], [3, -8], [7, -4]]) dot(c, x + dx * s, y + dy * s, 2.4 * s, '#8d5524');
      }
    },
  },
  {
    id: 'confetti',
    colours: ['#ffffff', '#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'],
    tile: (c) => {
      const r = seeded(3), cols = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff922b'];
      for (let i = 0; i < 10; i++) {
        c.save();
        c.translate(5 + r() * 50, 5 + r() * 50);
        c.rotate(r() * 3);
        c.fillStyle = cols[i % cols.length];
        if (i % 2) c.fillRect(-4, -2, 8, 4);
        else (c.beginPath(), c.arc(0, 0, 3, 0, Math.PI * 2), c.fill());
        c.restore();
      }
    },
  },
  {
    id: 'peppermint',
    colours: ['#ffffff', '#e03131'],
    tile: (c) => {
      for (const [x, y, r] of [[16, 16, 11], [45, 45, 8]]) {
        dot(c, x, y, r, '#fff');
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.moveTo(x, y);
          c.arc(x, y, r, (i * Math.PI) / 3, (i * Math.PI) / 3 + 0.5);
          c.closePath();
          c.fillStyle = '#e03131';
          c.fill();
        }
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.strokeStyle = '#c92a2a';
        c.lineWidth = 1.5;
        c.stroke();
      }
    },
  },
  {
    id: 'blue-zigzag',
    colours: ['#e7f5ff', '#1c7ed6'],
    tile: (c) => {
      c.strokeStyle = '#1c7ed6';
      c.lineWidth = 5;
      c.lineJoin = 'round';
      for (const y of [15, 45]) {
        c.beginPath();
        for (let x = 0, i = 0; x <= T; x += 10, i++) c.lineTo(x, y + (i % 2 ? 6 : -6));
        c.stroke();
      }
    },
  },
  {
    id: 'pixels',
    colours: ['#ffffff', '#ff8fab', '#74c0fc', '#ffd43b', '#8ce99a'],
    tile: (c) => {
      const r = seeded(11), cols = ['#ff8fab', '#74c0fc', '#ffd43b', '#8ce99a', '#e599f7'];
      for (let y = 0; y < T; y += 12) for (let x = 0; x < T; x += 12) if (r() < 0.55) (c.fillStyle = cols[Math.floor(r() * cols.length)]), c.fillRect(x, y, 12, 12);
    },
  },
];

/** The ribbons: a colour, a light shine down the middle and a darker edge (or stripes). */
export const RIBBONS: { id: string; fill: string; shine: string; dark: string; stripes?: string[] }[] = [
  { id: 'red', fill: '#e03131', shine: '#ff8787', dark: '#a61e1e' },
  { id: 'gold', fill: '#fcc419', shine: '#fff3bf', dark: '#c48a00' },
  { id: 'green', fill: '#2f9e44', shine: '#8ce99a', dark: '#1e6b2e' },
  { id: 'white', fill: '#ffffff', shine: '#ffffff', dark: '#ced4da' },
  { id: 'silver', fill: '#ced4da', shine: '#f8f9fa', dark: '#868e96' },
  { id: 'blue', fill: '#339af0', shine: '#a5d8ff', dark: '#1864ab' },
  { id: 'pink', fill: '#ff8fab', shine: '#ffd6e0', dark: '#d6336c' },
  { id: 'purple', fill: '#9c6ade', shine: '#d0bfff', dark: '#5f3dc4' },
  { id: 'candy', fill: '#ffffff', shine: '#ffffff', dark: '#c92a2a', stripes: ['#e03131', '#ffffff'] },
  { id: 'rainbow', fill: '#ffd43b', shine: '#fff3bf', dark: '#e8590c', stripes: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'] },
];

export const BOWS = ['classic', 'big', 'puffy', 'curly', 'star', 'flower', 'bell', 'snowflake', 'pompom'] as const;
export type BowId = (typeof BOWS)[number];

const paperOf = (id: string) => PAPERS.find((p) => p.id === id) ?? PAPERS[0];
const ribbonOf = (id: string) => RIBBONS.find((r) => r.id === id) ?? RIBBONS[0];

/** The colours of this paper (for the bits that fly when it's unwrapped). */
export const paperColours = (id: string) => paperOf(id).colours;
export const ribbonColour = (id: string) => ribbonOf(id).fill;

/** A surprise way to wrap it. */
export function randomWrap(shape: number, forWho?: string): WrapRecipe {
  return { paper: pickOne(PAPERS).id, ribbon: pickOne(RIBBONS).id, bow: pickOne([...BOWS]), shape, for: forWho };
}

const patterns = new Map<string, HTMLCanvasElement>();
/** One tile of a paper's pattern. */
function paperTile(id: string) {
  let t = patterns.get(id);
  if (!t) {
    const p = paperOf(id);
    t = document.createElement('canvas');
    t.width = t.height = T;
    const c = t.getContext('2d')!;
    c.fillStyle = p.colours[0];
    c.fillRect(0, 0, T, T);
    p.tile?.(c);
    patterns.set(id, t);
  }
  return t;
}
const ribbonTiles = new Map<string, HTMLCanvasElement>();
function ribbonTile(id: string) {
  let t = ribbonTiles.get(id);
  if (!t) {
    t = document.createElement('canvas');
    t.width = t.height = T;
    const c = t.getContext('2d')!;
    stripes(c, ribbonOf(id).stripes ?? [ribbonOf(id).fill]);
    ribbonTiles.set(id, t);
  }
  return t;
}

// ---------------------------------------------------------------------------
// The box
// ---------------------------------------------------------------------------

/** Where everything goes, for a box of this shape (canvas pixels). */
export function giftGeom(shape: number) {
  const bh = 240, bw = Math.round(bh * clamp(shape, 0.72, 1.55));
  const m = Math.min(bw, bh);
  const D = m * 0.42, ox = D * 0.62, oy = D * 0.5;
  const S = m * 0.3 + 22; // the bow
  const rw = Math.max(18, m * 0.12); // the ribbon's width
  const tw = clamp(m * 0.36, 66, 96), th = tw * 1.2;
  // with the front face's top-left at (0, 0) first
  const bow = { x: bw / 2 + ox / 2, y: -oy / 2 };
  const tag = { x: bw * 0.14, y: bh * 0.14 }; // the top of the tag, hanging off the front
  const minX = Math.min(tag.x - tw * 0.55, bow.x - S * 1.25) - 8;
  const maxX = Math.max(bw + ox, bow.x + S * 1.25) + 8;
  const minY = bow.y - S * 1.15 - 8;
  const maxY = bh + 8;
  const x0 = -minX, y0 = -minY;
  return {
    w: Math.ceil(maxX - minX),
    h: Math.ceil(maxY - minY),
    x0, y0, bw, bh, D, ox, oy, S, rw,
    bow: { x: x0 + bow.x, y: y0 + bow.y },
    tag: { x: x0 + tag.x, y: y0 + tag.y, w: tw, h: th },
  };
}
export type GiftGeom = ReturnType<typeof giftGeom>;

type Fill = string | CanvasPattern;

/** The three faces we can see, each drawn by `fill` in its own flat space. */
function faces(c: Ctx, g: GiftGeom, draw: (face: 'front' | 'top' | 'side', w: number, h: number) => void) {
  const { x0, y0, bw, bh, D, ox, oy } = g;
  // front: (u, v) -> (x0 + u, y0 + v)
  c.save();
  c.translate(x0, y0);
  draw('front', bw, bh);
  c.restore();
  // top: (u along the width, w back into the box)
  c.save();
  c.transform(1, 0, ox / D, -oy / D, x0, y0);
  draw('top', bw, D);
  c.restore();
  // side: (w back into the box, v down)
  c.save();
  c.transform(ox / D, -oy / D, 0, 1, x0 + bw, y0);
  draw('side', D, bh);
  c.restore();
}

function outline(c: Ctx, g: GiftGeom, width = 5) {
  const { x0, y0, bw, bh, ox, oy } = g;
  c.strokeStyle = INK;
  c.lineWidth = width;
  c.lineJoin = 'round';
  c.beginPath();
  c.rect(x0, y0, bw, bh);
  c.moveTo(x0, y0);
  c.lineTo(x0 + ox, y0 - oy);
  c.lineTo(x0 + bw + ox, y0 - oy);
  c.lineTo(x0 + bw, y0);
  c.moveTo(x0 + bw + ox, y0 - oy);
  c.lineTo(x0 + bw + ox, y0 + bh - oy);
  c.lineTo(x0 + bw, y0 + bh);
  c.stroke();
}

const SHADE = { front: 'rgba(0,0,0,0)', top: 'rgba(255,255,255,0.22)', side: 'rgba(0,0,0,0.16)' };

/** A plain cardboard box (before it's wrapped), closed. */
function cardboard(c: Ctx, g: GiftGeom) {
  faces(c, g, (face, w, h) => {
    c.fillStyle = '#d9a86c';
    c.fillRect(0, 0, w, h);
    if (face === 'top') {
      c.fillStyle = 'rgba(120,80,40,0.35)';
      c.fillRect(0, h / 2 - 1.5, w, 3); // where the flaps meet
    }
    if (face === 'front') {
      c.fillStyle = 'rgba(255,240,200,0.6)';
      c.fillRect(w * 0.42, 0, w * 0.16, h * 0.14); // a strip of tape
    }
    c.fillStyle = SHADE[face];
    c.fillRect(0, 0, w, h);
  });
  outline(c, g);
}

/** The wrapped box: paper all over, the ribbon both ways round it (`ribbon` 0..1 = how much is on). */
function wrappedBox(c: Ctx, g: GiftGeom, r: WrapRecipe, ribbon = 1) {
  const paper: Fill = c.createPattern(paperTile(r.paper), 'repeat')!;
  const rib = ribbonOf(r.ribbon);
  const ribFill: Fill = rib.stripes ? c.createPattern(ribbonTile(r.ribbon), 'repeat')! : rib.fill;
  const band = (x: number, y: number, w: number, h: number, along: 'v' | 'h') => {
    c.fillStyle = ribFill;
    c.fillRect(x, y, w, h);
    c.fillStyle = rib.shine;
    c.globalAlpha = rib.stripes ? 0.35 : 0.7;
    if (along === 'v') c.fillRect(x + w * 0.38, y, w * 0.14, h);
    else c.fillRect(x, y + h * 0.38, w, h * 0.14);
    c.globalAlpha = 1;
    c.strokeStyle = rib.dark;
    c.lineWidth = 2.5;
    c.beginPath();
    if (along === 'v') (c.moveTo(x, y), c.lineTo(x, y + h), c.moveTo(x + w, y), c.lineTo(x + w, y + h));
    else (c.moveTo(x, y), c.lineTo(x + w, y), c.moveTo(x, y + h), c.lineTo(x + w, y + h));
    c.stroke();
  };
  const rw = g.rw;
  faces(c, g, (face, w, h) => {
    c.fillStyle = paper;
    c.fillRect(0, 0, w, h);
    if (ribbon > 0) {
      if (face === 'front') band(w / 2 - rw / 2, 0, rw, h * ribbon, 'v');
      if (face === 'side') band(w / 2 - rw * 0.35, 0, rw * 0.7, h * ribbon, 'v');
      if (face === 'top') {
        band(w / 2 - rw / 2, 0, rw, h * Math.min(1, ribbon * 1.5), 'v');
        band(0, h / 2 - rw * 0.4, w * Math.min(1, ribbon * 1.5), rw * 0.8, 'h');
      }
    }
    c.fillStyle = SHADE[face];
    c.fillRect(0, 0, w, h);
  });
  outline(c, g);
}

// ---------------------------------------------------------------------------
// Bows
// ---------------------------------------------------------------------------

function loop(c: Ctx, x: number, y: number, len: number, wid: number, angle: number, fill: Fill, dark: string) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(len * 0.3, -wid, len * 1.05, -wid * 0.9, len, 0);
  c.bezierCurveTo(len * 1.05, wid * 0.9, len * 0.3, wid, 0, 0);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.stroke();
  // the inside of the loop
  c.beginPath();
  c.ellipse(len * 0.62, 0, len * 0.22, wid * 0.32, 0, 0, Math.PI * 2);
  c.fillStyle = dark;
  c.globalAlpha = 0.55;
  c.fill();
  c.globalAlpha = 1;
  c.restore();
}

function tail(c: Ctx, x: number, y: number, len: number, wid: number, angle: number, fill: Fill) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(-wid / 2, 0);
  c.quadraticCurveTo(-wid * 0.2, len * 0.5, -wid * 0.6, len);
  c.lineTo(0, len * 0.86);
  c.lineTo(wid * 0.6, len);
  c.quadraticCurveTo(wid * 0.2, len * 0.5, wid / 2, 0);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.stroke();
  c.restore();
}

function knot(c: Ctx, x: number, y: number, r: number, fill: Fill) {
  c.beginPath();
  c.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.stroke();
}

/** A bow at (x, y), `S` big, in this ribbon. */
export function drawBow(c: Ctx, bow: string, ribbon: string, x: number, y: number, S: number) {
  const rib = ribbonOf(ribbon);
  const fill: Fill = rib.stripes ? c.createPattern(ribbonTile(ribbon), 'repeat')! : rib.fill;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const classic = (k: number) => {
    tail(c, x - S * 0.1 * k, y, S * 0.75 * k, S * 0.3 * k, 0.5, fill);
    tail(c, x + S * 0.1 * k, y, S * 0.75 * k, S * 0.3 * k, -0.5, fill);
    loop(c, x, y, S * 1.05 * k, S * 0.5 * k, Math.PI + 0.35, fill, rib.dark);
    loop(c, x, y, S * 1.05 * k, S * 0.5 * k, -0.35, fill, rib.dark);
    knot(c, x, y, S * 0.24 * k, fill);
  };
  switch (bow as BowId) {
    case 'big':
      classic(1.2);
      break;
    case 'puffy': {
      for (const [n, len, off] of [[9, 0.95, 0], [7, 0.7, 0.3]] as const) {
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          loop(c, x, y, S * len, S * 0.36, a, fill, rib.dark);
        }
      }
      knot(c, x, y, S * 0.22, fill);
      break;
    }
    case 'curly': {
      // curled streamers springing out
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        const dir = i < 3.5 ? -1 : 1;
        c.beginPath();
        let px = x, py = y;
        c.moveTo(px, py);
        for (let t = 0; t <= 1; t += 0.04) {
          const rr = S * 1.1 * t;
          const sp = Math.sin(t * Math.PI * 4) * S * 0.12;
          px = x + Math.cos(a) * rr + Math.cos(a + Math.PI / 2) * sp * dir;
          py = y + Math.sin(a) * rr * 0.9 + Math.sin(a + Math.PI / 2) * sp * dir;
          c.lineTo(px, py);
        }
        c.strokeStyle = INK;
        c.lineWidth = 11;
        c.stroke();
        c.strokeStyle = rib.stripes ? rib.stripes[i % rib.stripes.length] : rib.fill;
        c.lineWidth = 6;
        c.stroke();
      }
      knot(c, x, y, S * 0.2, fill);
      break;
    }
    case 'star':
      star(c, x, y - S * 0.25, S * 0.95);
      c.fillStyle = fill;
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 4;
      c.stroke();
      star(c, x - S * 0.12, y - S * 0.38, S * 0.3, 4, 0.3);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fill();
      break;
    case 'flower': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.ellipse(x + Math.cos(a) * S * 0.5, y + Math.sin(a) * S * 0.42, S * 0.36, S * 0.26, a, 0, Math.PI * 2);
        c.fillStyle = fill;
        c.fill();
        c.strokeStyle = INK;
        c.lineWidth = 3.5;
        c.stroke();
      }
      knot(c, x, y, S * 0.3, ribbon === 'gold' ? '#ffffff' : '#ffd43b');
      break;
    }
    case 'bell':
      classic(0.85);
      // a little golden jingle bell under the knot
      c.beginPath();
      c.arc(x, y + S * 0.42, S * 0.26, 0, Math.PI * 2);
      c.fillStyle = '#fcc419';
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 3.5;
      c.stroke();
      c.beginPath();
      c.moveTo(x - S * 0.14, y + S * 0.48);
      c.lineTo(x + S * 0.14, y + S * 0.48);
      c.stroke();
      dot(c, x - S * 0.08, y + S * 0.34, S * 0.06, '#fff9db');
      knot(c, x, y, S * 0.2, fill);
      break;
    case 'snowflake':
      flake(c, x, y - S * 0.2, S * 0.95, INK, 12);
      flake(c, x, y - S * 0.2, S * 0.95, rib.id === 'white' || rib.id === 'silver' ? '#e7f5ff' : rib.fill, 6);
      dot(c, x, y - S * 0.2, S * 0.16, '#ffffff');
      break;
    case 'pompom': {
      const r = seeded(5);
      c.beginPath();
      c.arc(x, y - S * 0.1, S * 0.62, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      c.beginPath();
      c.arc(x, y - S * 0.1, S * 0.56, 0, Math.PI * 2);
      c.fillStyle = fill;
      c.fill();
      c.strokeStyle = rib.dark;
      c.lineWidth = 3;
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2, d = r() * S * 0.5;
        const px = x + Math.cos(a) * d, py = y - S * 0.1 + Math.sin(a) * d;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + Math.cos(a) * 7, py + Math.sin(a) * 7);
        c.stroke();
      }
      c.strokeStyle = rib.shine;
      for (let i = 0; i < 18; i++) {
        const a = r() * Math.PI * 2, d = r() * S * 0.4;
        const px = x - S * 0.1 + Math.cos(a) * d, py = y - S * 0.25 + Math.sin(a) * d;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5);
        c.stroke();
      }
      break;
    }
    default:
      classic(1);
  }
}

// ---------------------------------------------------------------------------
// The tag
// ---------------------------------------------------------------------------

function drawTag(c: Ctx, g: GiftGeom, face: HTMLCanvasElement | undefined) {
  const t = g.tag;
  // the string, from the bow down to the tag's hole
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(g.bow.x, g.bow.y);
  c.quadraticCurveTo((g.bow.x + t.x) / 2 - 10, (g.bow.y + t.y) / 2 + 20, t.x, t.y + 10);
  c.stroke();
  c.save();
  c.translate(t.x, t.y);
  c.rotate(0.12);
  const w = t.w, h = t.h, cut = w * 0.22;
  c.beginPath();
  c.moveTo(-w / 2 + cut, 0);
  c.lineTo(w / 2 - cut, 0);
  c.lineTo(w / 2, cut);
  c.lineTo(w / 2, h);
  c.lineTo(-w / 2, h);
  c.lineTo(-w / 2, cut);
  c.closePath();
  c.fillStyle = '#fff9ec';
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 3.5;
  c.stroke();
  // its hole
  c.beginPath();
  c.arc(0, 10, 4.5, 0, Math.PI * 2);
  c.fillStyle = '#d9c8a9';
  c.fill();
  c.lineWidth = 2;
  c.stroke();
  // who it's for
  if (face) {
    const box = { x: -w * 0.4, y: 20, w: w * 0.8, h: h - 26 };
    const s = Math.min(box.w / face.width, box.h / face.height);
    c.drawImage(face, box.x + (box.w - face.width * s) / 2, box.y + (box.h - face.height * s) / 2, face.width * s, face.height * s);
  } else {
    heart(c, 0, h * 0.58, w * 0.16);
    c.fillStyle = '#ff4d6d';
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// The whole present
// ---------------------------------------------------------------------------

/**
 * How far along the wrapping is (all 1 = done): `lid` the plain box closing
 * over the thing inside, `paper` the paper going on (from the bottom up),
 * `ribbon` and `bow` going on, `tag` hanging on.
 */
export interface WrapStage {
  lid: number;
  paper: number;
  ribbon: number;
  bow: number;
  tag: number;
}
export const DONE: WrapStage = { lid: 1, paper: 1, ribbon: 1, bow: 1, tag: 1 };

/**
 * Draw a present (or, early on, the thing sitting in an open box) on `c`,
 * whose geometry is `g`. `inside` = the thing being wrapped.
 */
export function drawGift(c: Ctx, g: GiftGeom, r: WrapRecipe, stage: WrapStage, inside?: HTMLCanvasElement, face?: HTMLCanvasElement) {
  const { x0, y0, bw, bh, ox, oy } = g;
  if (stage.lid < 1) {
    // the open box: the inside, the thing in it (sinking in as the lid closes), then the box's front
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x0 + ox, y0 - oy);
    c.lineTo(x0 + bw + ox, y0 - oy);
    c.lineTo(x0 + bw, y0);
    c.closePath();
    c.fillStyle = '#8a5a2b';
    c.fill();
    if (inside) {
      const s = Math.min((bw * 0.82) / inside.width, (bh * 1.25) / inside.height);
      const iw = inside.width * s, ih = inside.height * s;
      const bottom = y0 + bh * 0.3 + stage.lid * bh * 1.05;
      c.save();
      c.beginPath();
      c.rect(x0 - bw, y0 - bh * 3, bw * 3, bh * 3); // nothing shows below the opening's front edge
      c.clip();
      c.drawImage(inside, x0 + ox * 0.5 + (bw - iw) / 2, bottom - ih, iw, ih);
      c.restore();
    }
    // the front and side, in cardboard
    faces(c, g, (face2, w, h) => {
      if (face2 === 'top') return;
      c.fillStyle = '#d9a86c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = SHADE[face2];
      c.fillRect(0, 0, w, h);
    });
    c.strokeStyle = INK;
    c.lineWidth = 5;
    c.lineJoin = 'round';
    c.beginPath();
    c.rect(x0, y0, bw, bh);
    c.moveTo(x0 + bw, y0);
    c.lineTo(x0 + bw + ox, y0 - oy);
    c.lineTo(x0 + bw + ox, y0 + bh - oy);
    c.lineTo(x0 + bw, y0 + bh);
    c.moveTo(x0, y0);
    c.lineTo(x0 + ox, y0 - oy);
    c.lineTo(x0 + bw + ox, y0 - oy);
    c.stroke();
    // the lid, coming down
    const lift = (1 - stage.lid) * bh * 0.9;
    c.save();
    c.translate(0, -lift);
    c.translate(x0 + bw / 2, y0);
    c.rotate((1 - stage.lid) * -0.25);
    c.translate(-(x0 + bw / 2), -y0);
    c.beginPath();
    c.moveTo(x0 - 6, y0);
    c.lineTo(x0 + ox - 6, y0 - oy);
    c.lineTo(x0 + bw + ox + 6, y0 - oy);
    c.lineTo(x0 + bw + 6, y0);
    c.closePath();
    c.fillStyle = '#e6b981';
    c.fill();
    c.stroke();
    c.fillStyle = '#d9a86c';
    c.fillRect(x0 - 6, y0, bw + 12, 18);
    c.strokeRect(x0 - 6, y0, bw + 12, 18);
    c.restore();
    return;
  }
  // closed: cardboard, with the paper going on from the bottom up
  if (stage.paper < 1) cardboard(c, g);
  if (stage.paper > 0) {
    c.save();
    if (stage.paper < 1) {
      const top = y0 - oy - 4, bottom = y0 + bh + 4;
      const yCut = bottom - (bottom - top) * stage.paper;
      c.beginPath();
      c.rect(0, yCut, g.w, g.h);
      c.clip();
    }
    wrappedBox(c, g, r, stage.ribbon);
    c.restore();
  }
  if (stage.tag > 0) {
    c.save();
    c.globalAlpha = Math.min(1, stage.tag * 2);
    drawTag(c, g, face);
    c.restore();
  }
  if (stage.bow > 0) {
    const pop = stage.bow < 1 ? Math.sin(stage.bow * Math.PI * 0.5) * (1 + Math.sin(stage.bow * Math.PI) * 0.25) : 1;
    c.save();
    c.translate(g.bow.x, g.bow.y);
    c.scale(pop, pop);
    c.translate(-g.bow.x, -g.bow.y);
    drawBow(c, r.bow, r.ribbon, g.bow.x, g.bow.y, g.S);
    c.restore();
  }
}

/** The wrapped present as a picture (it becomes a toy you can carry). */
export function renderGift(r: WrapRecipe, face?: HTMLCanvasElement) {
  const g = giftGeom(r.shape);
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  drawGift(c.getContext('2d')!, g, r, DONE, undefined, face);
  return c;
}

// ---------------------------------------------------------------------------
// Little pictures for the wrapping screen's buttons
// ---------------------------------------------------------------------------

function tileCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

/** A plain rectangle of paper (rolls in the shop, a sheet unrolling). */
export function paperStrip(id: string, w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  const c = cv.getContext('2d')!;
  c.fillStyle = c.createPattern(paperTile(id), 'repeat')!;
  c.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

/** A square of paper, a little curled at the corner. */
export function paperSwatch(id: string, size = 120) {
  const [cv, c] = tileCanvas(size);
  c.save();
  c.beginPath();
  c.moveTo(8, 8);
  c.lineTo(size - 8, 8);
  c.lineTo(size - 8, size - 34);
  c.lineTo(size - 34, size - 8);
  c.lineTo(8, size - 8);
  c.closePath();
  c.fillStyle = c.createPattern(paperTile(id), 'repeat')!;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.lineJoin = 'round';
  c.stroke();
  c.restore();
  // the curl
  c.beginPath();
  c.moveTo(size - 8, size - 34);
  c.quadraticCurveTo(size - 30, size - 30, size - 34, size - 8);
  c.closePath();
  c.fillStyle = '#f1f3f5';
  c.fill();
  c.stroke();
  return cv;
}

/** A piece of ribbon, tied in a loop. */
export function ribbonSwatch(id: string, size = 120) {
  const [cv, c] = tileCanvas(size);
  const rib = ribbonOf(id);
  const fill: Fill = rib.stripes ? c.createPattern(ribbonTile(id), 'repeat')! : rib.fill;
  c.lineJoin = 'round';
  c.beginPath();
  c.ellipse(size / 2, size / 2, size * 0.36, size * 0.36, 0, 0, Math.PI * 2);
  c.lineWidth = 26;
  c.strokeStyle = INK;
  c.stroke();
  c.lineWidth = 19;
  c.strokeStyle = fill;
  c.stroke();
  c.lineWidth = 4;
  c.strokeStyle = rib.shine;
  c.globalAlpha = 0.8;
  c.beginPath();
  c.ellipse(size / 2, size / 2, size * 0.36, size * 0.36, 0, Math.PI * 1.1, Math.PI * 1.6);
  c.stroke();
  c.globalAlpha = 1;
  return cv;
}

export function bowSwatch(bow: string, ribbon: string, size = 120) {
  const [cv, c] = tileCanvas(size);
  drawBow(c, bow, ribbon, size / 2, size * 0.55, size * 0.3);
  return cv;
}

/** The tabs' pictures: a roll of paper, a spool of ribbon, a bow, a tag. */
export function tabIcon(which: 'paper' | 'ribbon' | 'bow' | 'tag', r: WrapRecipe, face?: HTMLCanvasElement, size = 80) {
  const [cv, c] = tileCanvas(size);
  const s = size / 80;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = 3.5 * s;
  if (which === 'paper') {
    // a roll lying down
    c.fillStyle = c.createPattern(paperTile(r.paper), 'repeat')!;
    c.beginPath();
    c.rect(14 * s, 26 * s, 50 * s, 28 * s);
    c.fill();
    c.stroke();
    c.beginPath();
    c.ellipse(64 * s, 40 * s, 7 * s, 14 * s, 0, 0, Math.PI * 2);
    c.fillStyle = '#f1f3f5';
    c.fill();
    c.stroke();
    c.beginPath();
    c.ellipse(64 * s, 40 * s, 2.5 * s, 5 * s, 0, 0, Math.PI * 2);
    c.fillStyle = '#c49a6c';
    c.fill();
    // the end hanging down
    c.beginPath();
    c.moveTo(14 * s, 54 * s);
    c.lineTo(14 * s, 70 * s);
    c.lineTo(40 * s, 70 * s);
    c.lineTo(40 * s, 54 * s);
    c.fillStyle = c.createPattern(paperTile(r.paper), 'repeat')!;
    c.fill();
    c.stroke();
  } else if (which === 'ribbon') {
    const rib = ribbonOf(r.ribbon);
    c.beginPath();
    c.arc(40 * s, 36 * s, 22 * s, 0, Math.PI * 2);
    c.fillStyle = rib.stripes ? c.createPattern(ribbonTile(r.ribbon), 'repeat')! : rib.fill;
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(40 * s, 36 * s, 8 * s, 0, Math.PI * 2);
    c.fillStyle = '#c49a6c';
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(56 * s, 50 * s);
    c.quadraticCurveTo(66 * s, 64 * s, 54 * s, 72 * s);
    c.lineWidth = 9 * s;
    c.stroke();
    c.lineWidth = 5 * s;
    c.strokeStyle = rib.fill;
    c.stroke();
  } else if (which === 'bow') {
    drawBow(c, r.bow, r.ribbon, 40 * s, 44 * s, 22 * s);
  } else {
    const g = giftGeom(1);
    const sc = (60 * s) / g.tag.h;
    c.translate(40 * s - g.tag.x * sc, 8 * s - g.tag.y * sc);
    c.scale(sc, sc);
    c.save();
    c.translate(g.tag.x, g.tag.y);
    c.rotate(-0.12);
    c.translate(-g.tag.x, -g.tag.y);
    drawTag(c, { ...g, bow: { x: g.tag.x, y: g.tag.y - 10 } }, face);
    c.restore();
  }
  return cv;
}
