import { circle, ellipse, fillPath, part, shade, trim, trimBox, type Ctx } from './makerArt';

/**
 * People, made in the maker (so the family can be in the world, made on the
 * iPad: nothing about them is in the app's code). Drawn front on, standing
 * on the ground at y = 632 of a 300 x 640 area.
 */
export const AGES = ['grown', 'big', 'little', 'older'] as const;
export const SKINS = ['#ffe3d3', '#f6cfb3', '#e8b48a', '#c68b59', '#8d5524', '#5c3a21', '#efb9a0', '#dfa47e'];
export const HAIRS = ['braids', 'ponytail', 'bun', 'swept', 'short', 'long', 'curly', 'pixie', 'receding', 'bald'] as const;
export const HAIR_COLOURS = ['#3b2a20', '#6b4226', '#9a6a3a', '#c09a62', '#e6c77d', '#1f1f1f', '#b5542e', '#a7a7a7', '#ecebe6', '#c6a774'];
export const EYE_COLOURS = ['#6f93a8', '#3d8bd9', '#2b9348', '#6b4226', '#8d6e3f'];
export const GLASSES = ['none', 'dark', 'blue', 'round', 'sun'] as const;
export const FACE_BITS = ['none', 'freckles', 'stubble', 'beard', 'moustache', 'lines'] as const;
export const TOPS = ['tee', 'tank', 'hoodie', 'fleece', 'sweatshirt', 'jersey', 'shirt', 'polo', 'stripes', 'dress'] as const;
export const TOP_COLOURS = ['#9bd0ff', '#4ea8ff', '#2b3a67', '#2b2d42', '#adb5bd', '#7b2cbf', '#e5383b', '#ff8fab', '#52b788', '#ffd166', '#ff922b', '#f8f9fa', '#1f1f1f', '#bfcde0'];
export const BOTTOMS = ['jeans', 'joggers', 'camo', 'hockey', 'shorts', 'skirt', 'leggings'] as const;
/** Colours for the bottoms (left unpicked, each kind has its own colour). */
export const BOTTOM_COLOURS = ['#4a6fa5', '#2b3a67', '#1f1f1f', '#6c757d', '#d4b483', '#e5383b', '#ff8fab', '#52b788'];
export const SHOES = ['#2b2d42', '#f8f9fa', '#e5383b', '#4ea8ff', '#ff8fab'];
export const PERSON_EXTRAS = ['none', 'hockey-stick', 'cap', 'earrings', 'octopus', 'balloon'] as const;
export const BUILDS = ['slim', 'regular', 'big'] as const;
export const NECKS = ['none', 'necklace', 'pearls'] as const;
export const WRISTS = ['none', 'bracelet', 'watch'] as const;

export interface PersonRecipe {
  age: (typeof AGES)[number];
  skin: number;
  hair: (typeof HAIRS)[number];
  hairColour: number;
  eyes: number;
  glasses: (typeof GLASSES)[number];
  face: (typeof FACE_BITS)[number];
  top: (typeof TOPS)[number];
  topColour: number;
  bottoms: (typeof BOTTOMS)[number];
  /** Index into BOTTOM_COLOURS; missing = the kind's own colour. */
  bottomColour?: number;
  shoes: number;
  extra: (typeof PERSON_EXTRAS)[number];
  build?: (typeof BUILDS)[number];
  neck?: (typeof NECKS)[number];
  wrist?: (typeof WRISTS)[number];
  /** Typed on the iPad (shown when they're tapped). */
  name: string;
}

export const newPerson = (): PersonRecipe => ({ age: 'big', skin: 0, hair: 'short', hairColour: 1, eyes: 0, glasses: 'none', face: 'none', top: 'tee', topColour: 1, bottoms: 'jeans', shoes: 0, extra: 'none', build: 'regular', neck: 'none', wrist: 'none', name: '' });
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const idx = (a: readonly unknown[]) => Math.floor(Math.random() * a.length);
export const randomPerson = (): PersonRecipe => ({
  age: pick(AGES),
  skin: idx(SKINS),
  hair: pick(HAIRS.filter((h) => h !== 'bald' && h !== 'receding')),
  hairColour: idx(HAIR_COLOURS),
  eyes: idx(EYE_COLOURS),
  glasses: Math.random() < 0.6 ? 'none' : pick(GLASSES),
  face: Math.random() < 0.6 ? 'none' : pick(FACE_BITS),
  top: pick(TOPS),
  topColour: idx(TOP_COLOURS),
  bottoms: pick(BOTTOMS),
  shoes: idx(SHOES),
  extra: Math.random() < 0.5 ? 'none' : pick(PERSON_EXTRAS),
  build: pick(BUILDS),
  neck: Math.random() < 0.7 ? 'none' : pick(NECKS),
  wrist: Math.random() < 0.7 ? 'none' : pick(WRISTS),
  name: '',
});

export const PERSON_AREA = { w: 300, h: 640 };
const INK = '#3a3a3a';

/** Where things are, for each size (and build) of person. */
export function bodyOf(age: PersonRecipe['age'], build: PersonRecipe['build'] = 'regular') {
  const k = build === 'slim' ? 0.86 : build === 'big' ? 1.22 : 1;
  const b =
    age === 'grown' || age === 'older' ? { headY: 150, headR: 56, shoulder: 212, hip: 402, half: 66 }
    : age === 'big' ? { headY: 232, headR: 62, shoulder: 300, hip: 452, half: 56 }
    : { headY: 286, headR: 64, shoulder: 352, hip: 482, half: 50 };
  return { ...b, half: b.half * k, headR: b.headR * (build === 'big' ? 1.07 : 1) };
}

const BOTTOM_COLOUR: Record<PersonRecipe['bottoms'], string> = {
  jeans: '#4a6fa5',
  joggers: '#6c757d',
  camo: '#8d949c',
  hockey: '#1f1f1f',
  shorts: '#d4b483',
  skirt: '#2b3a67',
  leggings: '#2b2d42',
};

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
};
/** Light colours get darker marks, dark colours lighter ones. */
const marks = (hex: string) => (lum(hex) > 140 ? shade(hex, -0.6) : shade(hex, 0.5));
/** A holiday shirt's pattern: columns of brushy dashes of different lengths. */
function dashes(c: Ctx, hex: string, y0: number, y1: number) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.fillStyle = marks(hex);
  for (let x = 2, col = 0; x < 300; x += 17, col++) {
    for (let y = y0 - rnd() * 20; y < y1; ) {
      const len = 9 + rnd() * 14;
      c.beginPath();
      c.roundRect(x + (col % 2) * 2, y, 9, len, 4);
      c.fill();
      y += len + 5 + rnd() * 3;
    }
  }
}
/** Shirt stripes: a wide stripe and a thin one, over and over. */
function stripes(c: Ctx, hex: string) {
  c.fillStyle = hex;
  for (let x = 0; x < 300; x += 20) {
    c.fillRect(x, 0, 7, 640);
    c.fillRect(x + 11, 0, 2.5, 640);
  }
}

export function drawPerson(c: Ctx, r: PersonRecipe) {
  const build = r.build ?? 'regular';
  const b = bodyOf(r.age, build);
  const older = r.age === 'older';
  const skin = SKINS[r.skin] ?? SKINS[0];
  const hair = HAIR_COLOURS[r.hairColour] ?? HAIR_COLOURS[0];
  const top = TOP_COLOURS[r.topColour] ?? TOP_COLOURS[0];
  const pants = (r.bottomColour !== undefined && BOTTOM_COLOURS[r.bottomColour]) || BOTTOM_COLOUR[r.bottoms];
  const dress = r.top === 'dress';
  const sleeveless = r.top === 'tank' || dress;
  const shortSleeves = r.top === 'tee' || r.top === 'shirt' || r.top === 'polo';
  // a striped shirt is white with stripes of the chosen colour
  const cloth = r.top === 'stripes' ? '#f4f6f8' : top;
  const cx = 150, feet = 612;
  const hx = cx, hy = b.headY, hr = b.headR;

  // a soft shadow
  c.globalAlpha = 0.14;
  fillPath(c, ellipse(cx, 630, 90, 10), '#000000');
  c.globalAlpha = 1;

  // --- hair at the back (long hair, ponytail) ---
  if (r.hair === 'long') part(c, (cc) => cc.roundRect(hx - hr * 1.08, hy - hr * 0.6, hr * 2.16, hr * 2.3, hr * 0.6), hair);
  if (r.hair === 'ponytail') part(c, ellipse(hx + hr * 0.9, hy + hr * 0.6, hr * 0.32, hr * 0.9, -0.25), hair);
  if (r.top === 'hoodie') part(c, ellipse(cx, b.shoulder - 6, b.half * 0.9, 34), shade(top, -0.12)); // the hood, behind the head

  // --- legs ---
  const legW = b.half * 0.62;
  for (const s of [-1, 1]) {
    const lx = cx + s * b.half * 0.42;
    const isShort = r.bottoms === 'shorts' || r.bottoms === 'skirt' || r.bottoms === 'hockey' || dress;
    const socks = r.bottoms === 'hockey' && !dress;
    // skin (or socks) below shorts, skirts, dresses and hockey pants
    if (isShort) part(c, (cc) => cc.roundRect(lx - legW * 0.38, b.hip, legW * 0.76, feet - b.hip, 12), socks ? '#1f1f1f' : skin, socks ? (cc) => {
      cc.fillStyle = '#20c997';
      for (const y of [feet - 90, feet - 60]) cc.fillRect(0, y, 300, 14);
    } : undefined);
    const legEnd = isShort ? b.hip + (feet - b.hip) * (r.bottoms === 'hockey' ? 0.45 : 0.4) : feet - 6;
    if (r.bottoms !== 'skirt' && !dress) {
      part(c, (cc) => cc.roundRect(lx - legW / 2, b.hip - 10, legW, legEnd - b.hip + 10, 14), pants, r.bottoms === 'camo' ? (cc) => {
        for (const [x, y, w2] of [[lx - 10, b.hip + 30, 16], [lx + 8, b.hip + 80, 14], [lx - 6, b.hip + 140, 18], [lx + 6, b.hip + 190, 12]]) fillPath(cc, ellipse(x, y, w2, w2 * 0.6, 0.4), '#c4c8cc');
        for (const [x, y] of [[lx + 6, b.hip + 50], [lx - 8, b.hip + 110], [lx + 4, b.hip + 170]]) fillPath(cc, ellipse(x, y, 10, 6, -0.3), '#5c6670');
      } : undefined);
    }
    // shoes, with a pale sole
    const shoe = SHOES[r.shoes] ?? SHOES[0];
    part(c, (cc) => cc.roundRect(lx - legW * 0.62 + s * 4, feet - 14, legW * 1.24, 26, 12), shoe, (cc) => {
      cc.fillStyle = lum(shoe) > 140 ? '#ced4da' : '#f1f3f5';
      cc.fillRect(0, feet + 4, 300, 10);
    });
  }
  if (r.bottoms === 'skirt' && !dress) part(c, (cc) => {
    cc.moveTo(cx - b.half * 0.95, b.hip - 14);
    cc.lineTo(cx + b.half * 0.95, b.hip - 14);
    cc.lineTo(cx + b.half * 1.25, b.hip + 70);
    cc.lineTo(cx - b.half * 1.25, b.hip + 70);
    cc.closePath();
  }, pants);

  // bare shoulders under a tank top or a dress (the arms cover its sides)
  if (sleeveless) part(c, (cc) => cc.roundRect(cx - b.half, b.shoulder, b.half * 2, 80, 26), skin);

  // --- arms (sleeves and hands) ---
  const longSleeves = !shortSleeves && !sleeveless;
  const armLen = b.hip - b.shoulder + 26;
  const armW = build === 'big' ? 34 : build === 'slim' ? 27 : 30;
  for (const s of [-1, 1]) {
    const ax = cx + s * (b.half + 14);
    const arm = (cc: Ctx) => cc.roundRect(ax - armW / 2, b.shoulder + 6, armW, armLen, armW / 2);
    part(c, arm, longSleeves ? cloth : skin, r.top === 'jersey' ? (cc) => {
      cc.fillStyle = '#20c997';
      cc.fillRect(0, b.shoulder + armLen * 0.55, 300, 12);
      cc.fillRect(0, b.shoulder + armLen * 0.55 + 20, 300, 12);
    } : r.top === 'stripes' ? (cc) => {
      stripes(cc, top);
      fillPath(cc, (p) => p.rect(0, b.shoulder + armLen - 22, 300, 14), shade(cloth, -0.08)); // a cuff
    } : shortSleeves ? (cc) => {
      const end = b.shoulder + (r.top === 'tee' ? 52 : 62);
      cc.fillStyle = top;
      cc.fillRect(0, 0, 300, end);
      if (r.top === 'shirt') {
        cc.save();
        cc.beginPath();
        cc.rect(0, 0, 300, end);
        cc.clip();
        dashes(cc, top, b.shoulder, end);
        cc.restore();
      }
      if (r.top !== 'tee') {
        cc.fillStyle = shade(top, -0.15);
        cc.fillRect(0, end - 7, 300, 7);
      }
    } : undefined);
    fillPath(c, circle(ax, b.shoulder + armLen + 8, 15), r.bottoms === 'hockey' && r.top === 'jersey' ? '#1f1f1f' : skin, 5); // hand (or a hockey glove)
  }
  // something on the wrist
  if (r.wrist && r.wrist !== 'none') {
    const ax = cx - (b.half + 14), wy = b.shoulder + armLen - 8;
    if (r.wrist === 'bracelet') {
      part(c, (cc) => cc.roundRect(ax - armW / 2 - 3, wy - 6, armW + 6, 12, 6), '#e9ecef', (cc) => {
        for (let i = -2; i <= 2; i++) fillPath(cc, circle(ax + i * (armW / 5), wy, 2.4), '#adb5bd');
      }, 4);
    } else {
      part(c, (cc) => cc.roundRect(ax - armW / 2 - 2, wy - 6, armW + 4, 12, 5), '#1f1f1f', undefined, 4);
      fillPath(c, circle(ax, wy, 8), '#dee2e6', 3.5);
    }
  }

  // --- body (the top) ---
  const torso = (cc: Ctx) => {
    const t = b.shoulder, bot = b.hip + 8, L = cx - b.half, R = cx + b.half, rad = 26, tall = bot - t;
    if (build !== 'big') return cc.roundRect(L, t, b.half * 2, tall, rad);
    // a round tummy
    const bulge = b.half * 1.1;
    cc.moveTo(L + rad, t);
    cc.lineTo(R - rad, t);
    cc.quadraticCurveTo(R, t, R, t + rad);
    cc.bezierCurveTo(R, t + tall * 0.35, cx + bulge, t + tall * 0.45, cx + bulge, t + tall * 0.72);
    cc.quadraticCurveTo(cx + bulge * 0.98, bot, cx + b.half * 0.72, bot);
    cc.lineTo(cx - b.half * 0.72, bot);
    cc.quadraticCurveTo(cx - bulge * 0.98, bot, cx - bulge, t + tall * 0.72);
    cc.bezierCurveTo(cx - bulge, t + tall * 0.45, L, t + tall * 0.35, L, t + rad);
    cc.quadraticCurveTo(L, t, L + rad, t);
    cc.closePath();
  };
  /** A sleeveless top or dress: thin straps, armholes, and (for a dress) a long flared skirt. */
  const sleevelessShape = (cc: Ctx) => {
    const t = b.shoulder, strap = b.half * 0.58, side = t + 46, H = b.half;
    const hem = dress ? feet - 42 : b.hip + 8;
    cc.moveTo(cx - strap, t);
    cc.lineTo(cx + strap, t);
    cc.quadraticCurveTo(cx + strap + 4, side, cx + H, side + 4);
    if (dress) {
      cc.lineTo(cx + H * 0.92, b.hip - 30);
      cc.quadraticCurveTo(cx + H * 1.0, b.hip + 40, cx + H * 1.4, hem);
      cc.lineTo(cx - H * 1.4, hem);
      cc.quadraticCurveTo(cx - H * 1.0, b.hip + 40, cx - H * 0.92, b.hip - 30);
    } else {
      cc.lineTo(cx + H, hem - 24);
      cc.quadraticCurveTo(cx + H, hem, cx + H - 24, hem);
      cc.lineTo(cx - H + 24, hem);
      cc.quadraticCurveTo(cx - H, hem, cx - H, hem - 24);
    }
    cc.lineTo(cx - H, side + 4);
    cc.quadraticCurveTo(cx - strap - 4, side, cx - strap, t);
    cc.closePath();
  };
  part(c, sleeveless ? sleevelessShape : torso, cloth, (cc) => {
    if (r.top === 'fleece') {
      // a busy pattern, and an orange zip
      const shapes = [[-30, 30], [24, 50], [-12, 90], [30, 110], [-34, 140], [10, 160]];
      for (const [dx, dy] of shapes) fillPath(cc, (p) => p.rect(cx + dx - 8, b.shoulder + dy - 5, 16, 10), dy % 20 ? '#8fa8d0' : '#f1e3c8');
      cc.fillStyle = '#ff6b3d';
      cc.fillRect(cx - 3, b.shoulder, 6, b.hip - b.shoulder);
    }
    if (r.top === 'hoodie') {
      fillPath(cc, (p) => p.roundRect(cx - b.half * 0.6, b.hip - 70, b.half * 1.2, 50, 14), shade(top, -0.1), 3);
      cc.lineWidth = 4;
      cc.strokeStyle = '#ffffff';
      cc.beginPath();
      cc.moveTo(cx - 12, b.shoulder + 6);
      cc.lineTo(cx - 14, b.shoulder + 50);
      cc.moveTo(cx + 12, b.shoulder + 6);
      cc.lineTo(cx + 14, b.shoulder + 50);
      cc.stroke();
    }
    if (r.top === 'sweatshirt') {
      cc.fillStyle = shade(top, -0.12);
      cc.fillRect(0, b.hip - 14, 300, 30);
    }
    if (r.top === 'jersey') {
      cc.fillStyle = '#20c997';
      cc.fillRect(0, b.hip - 40, 300, 12);
      cc.fillRect(0, b.hip - 20, 300, 12);
      fillPath(cc, circle(cx, b.shoulder + 60, 26), '#20c997', 4); // a round crest (no team name)
      fillPath(cc, circle(cx, b.shoulder + 60, 14), '#2b2d42');
    }
    if (r.top === 'shirt' || r.top === 'stripes') {
      if (r.top === 'shirt') dashes(cc, top, b.shoulder + 4, b.hip + 10);
      else stripes(cc, top);
      fillPath(cc, (p) => p.rect(cx - 7, b.shoulder, 14, b.hip - b.shoulder + 10), r.top === 'shirt' ? shade(top, -0.06) : cloth, 3);
      for (let y = b.shoulder + 44; y < b.hip - 6; y += 34) fillPath(cc, circle(cx, y, 4.5), r.top === 'shirt' ? shade(top, -0.4) : '#dee2e6', 2);
    }
    if (r.top === 'polo') {
      fillPath(cc, (p) => p.rect(cx - 8, b.shoulder, 16, 66), shade(top, -0.05), 3);
      for (const y of [b.shoulder + 34, b.shoulder + 54]) fillPath(cc, circle(cx, y, 4.5), shade(top, 0.5), 2);
    }
    if (r.top === 'dress') {
      // soft folds in the skirt
      cc.lineWidth = 3;
      cc.strokeStyle = shade(top, -0.18);
      for (const dx of [-0.5, 0, 0.5]) {
        cc.beginPath();
        cc.moveTo(cx + b.half * dx * 0.6, b.hip);
        cc.quadraticCurveTo(cx + b.half * dx * 0.9, b.hip + 80, cx + b.half * dx * 1.4, feet - 50);
        cc.stroke();
      }
    }
    if (r.top === 'tank') {
      fillPath(cc, (p) => {
        p.moveTo(cx - b.half * 0.45, b.shoulder - 2);
        p.quadraticCurveTo(cx, b.shoulder + 44, cx + b.half * 0.45, b.shoulder - 2);
        p.closePath();
      }, skin);
    }
  });
  // the neckline
  const vNeck = (w: number, d: number) =>
    fillPath(c, (cc) => {
      cc.moveTo(cx - w, b.shoulder);
      cc.lineTo(cx, b.shoulder + d);
      cc.lineTo(cx + w, b.shoulder);
      cc.closePath();
    }, skin, 4);
  if (r.top === 'jersey') vNeck(22, 30);
  else if (r.top === 'dress') vNeck(b.half * 0.5, 64);
  else if (r.top === 'fleece') part(c, (cc) => cc.roundRect(cx - 34, b.shoulder - 14, 68, 26, 10), top);
  else if (r.top === 'shirt' || r.top === 'stripes') {
    vNeck(24, 34);
    for (const s of [-1, 1]) {
      fillPath(c, (cc) => {
        cc.moveTo(cx + s * 32, b.shoulder - 8);
        cc.lineTo(cx + s * 3, b.shoulder + 36);
        cc.lineTo(cx + s * 40, b.shoulder + 22);
        cc.closePath();
      }, cloth, 4);
    }
  } else if (r.top === 'polo') {
    vNeck(14, 26);
    for (const s of [-1, 1]) {
      fillPath(c, (cc) => {
        cc.moveTo(cx + s * 30, b.shoulder - 8);
        cc.quadraticCurveTo(cx + s * 46, b.shoulder + 8, cx + s * 42, b.shoulder + 26);
        cc.lineTo(cx + s * 14, b.shoulder + 30);
        cc.lineTo(cx + s * 4, b.shoulder + 2);
        cc.closePath();
      }, top, 4);
    }
  } else if (r.top !== 'tank') fillPath(c, ellipse(cx, b.shoulder + 2, 26, 12), skin, 4);
  // a necklace
  if (r.neck === 'necklace' || r.neck === 'pearls') {
    const at = (k: number) => {
      const a = Math.PI * (0.15 + 0.7 * k);
      return [cx + Math.cos(a) * 30, b.shoulder - 4 + Math.sin(a) * 36] as const;
    };
    if (r.neck === 'necklace') {
      c.beginPath();
      for (let i = 0; i <= 20; i++) {
        const [x, y] = at(i / 20);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.lineCap = 'round';
      c.lineWidth = 7;
      c.strokeStyle = INK;
      c.stroke();
      c.lineWidth = 4;
      c.strokeStyle = '#e9ecef';
      c.stroke();
    } else for (let i = 0; i <= 10; i++) fillPath(c, circle(...at(i / 10), 4.5), '#fffaf0', 2);
  }

  // --- head ---
  const earR = hr * (older ? 0.25 : 0.2);
  for (const s of [-1, 1]) part(c, circle(hx + s * hr * 0.98, hy + 6, earR), skin);
  part(c, circle(hx, hy, hr), skin);
  if (older) {
    // lines on the forehead (hair covers them where it comes down)
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.strokeStyle = shade(skin, -0.2);
    for (const [dy, w] of [[-0.52, 0.32], [-0.64, 0.24]]) {
      c.beginPath();
      c.moveTo(hx - hr * w, hy + hr * dy + 3);
      c.quadraticCurveTo(hx, hy + hr * dy - 4, hx + hr * w, hy + hr * dy + 3);
      c.stroke();
    }
  }
  // hair on top
  const hairCap = (cc: Ctx) => {
    cc.moveTo(hx - hr * 1.02, hy + 4);
    cc.bezierCurveTo(hx - hr * 1.1, hy - hr * 1.25, hx + hr * 1.1, hy - hr * 1.25, hx + hr * 1.02, hy + 4);
    cc.quadraticCurveTo(hx + hr * 0.9, hy - hr * 0.55, hx, hy - hr * 0.62);
    cc.quadraticCurveTo(hx - hr * 0.9, hy - hr * 0.55, hx - hr * 1.02, hy + 4);
  };
  const strands = (cc: Ctx, col: string, width: number, lines: readonly (readonly number[])[], lift = 0.08) => {
    cc.lineWidth = width;
    cc.lineCap = 'round';
    cc.strokeStyle = col;
    for (const [x0, y0, x1, y1] of lines) {
      cc.beginPath();
      cc.moveTo(hx + hr * x0, hy + hr * y0);
      cc.quadraticCurveTo(hx + hr * (x0 + x1) * 0.5, hy + hr * ((y0 + y1) * 0.5 - lift), hx + hr * x1, hy + hr * y1);
      cc.stroke();
    }
  };
  if (r.hair === 'braids') {
    part(c, hairCap, hair);
    c.beginPath();
    c.moveTo(hx, hy - hr * 1.0);
    c.lineTo(hx, hy - hr * 0.62);
    c.lineWidth = 3;
    c.strokeStyle = shade(hair, -0.3);
    c.stroke();
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) part(c, ellipse(hx + s * hr * 1.0, hy + hr * 0.15 + i * hr * 0.32, hr * 0.2, hr * 0.2), hair, undefined, 5);
      fillPath(c, circle(hx + s * hr * 1.0, hy + hr * 2.1, hr * 0.1), '#ff8fab', 3);
    }
  } else if (r.hair === 'ponytail' || r.hair === 'bun') {
    part(c, hairCap, hair);
    if (r.hair === 'bun') part(c, circle(hx, hy - hr * 1.1, hr * 0.38), hair);
  } else if (r.hair === 'swept') {
    part(c, (cc) => {
      cc.moveTo(hx - hr * 1.02, hy - 2);
      cc.bezierCurveTo(hx - hr * 1.05, hy - hr * 1.3, hx + hr * 1.1, hy - hr * 1.25, hx + hr * 1.02, hy - 2);
      cc.quadraticCurveTo(hx + hr * 0.7, hy - hr * 0.7, hx + hr * 0.2, hy - hr * 0.45);
      cc.quadraticCurveTo(hx - hr * 0.5, hy - hr * 0.3, hx - hr * 1.02, hy - 2);
    }, hair);
  } else if (r.hair === 'short') {
    part(c, (cc) => {
      cc.moveTo(hx - hr * 1.0, hy - hr * 0.1);
      cc.bezierCurveTo(hx - hr * 1.05, hy - hr * 1.25, hx + hr * 1.05, hy - hr * 1.25, hx + hr * 1.0, hy - hr * 0.1);
      cc.quadraticCurveTo(hx, hy - hr * 0.8, hx - hr * 1.0, hy - hr * 0.1);
    }, hair, (cc) => strands(cc, shade(hair, -0.25), 3.5, [[-0.42, -0.98, -0.42, -0.7], [-0.05, -1.0, 0.05, -0.72], [0.35, -0.98, 0.62, -0.7]]));
  } else if (r.hair === 'pixie') {
    // short and feathery: darker underneath, lighter on top, a fringe swept to one side
    part(c, (cc) => {
      cc.moveTo(hx - hr * 0.9, hy + hr * 0.14); // a little point in front of the ear
      cc.quadraticCurveTo(hx - hr * 1.12, hy - hr * 0.3, hx - hr * 1.03, hy - hr * 0.6);
      cc.bezierCurveTo(hx - hr * 1.0, hy - hr * 1.55, hx + hr * 1.12, hy - hr * 1.55, hx + hr * 1.04, hy - hr * 0.55);
      cc.quadraticCurveTo(hx + hr * 1.1, hy - hr * 0.2, hx + hr * 0.9, hy + hr * 0.14);
      cc.quadraticCurveTo(hx + hr * 0.84, hy - hr * 0.22, hx + hr * 0.68, hy - hr * 0.5);
      cc.quadraticCurveTo(hx + hr * 0.3, hy - hr * 0.62, hx - hr * 0.1, hy - hr * 0.52);
      cc.quadraticCurveTo(hx - hr * 0.5, hy - hr * 0.42, hx - hr * 0.7, hy - hr * 0.2);
      cc.quadraticCurveTo(hx - hr * 0.84, hy - hr * 0.08, hx - hr * 0.9, hy + hr * 0.14);
    }, shade(hair, -0.14), (cc) => {
      fillPath(cc, ellipse(hx + hr * 0.02, hy - hr * 0.82, hr * 1.02, hr * 0.56, -0.18), hair);
      strands(cc, shade(hair, -0.28), 3, [[0.85, -0.5, 0.55, -0.85]], 0);
      strands(cc, shade(hair, 0.45), 5, [[0.75, -0.95, 0.05, -0.62], [0.3, -1.12, -0.42, -0.55], [-0.1, -1.15, -0.72, -0.32]], 0.12);
    });
  } else if (r.hair === 'receding') {
    // thinner on top with a high forehead, fuller at the sides, combed back
    part(c, (cc) => {
      cc.moveTo(hx - hr * 1.0, hy + hr * 0.08);
      cc.quadraticCurveTo(hx - hr * 1.14, hy - hr * 0.4, hx - hr * 0.94, hy - hr * 0.72);
      cc.bezierCurveTo(hx - hr * 0.72, hy - hr * 1.3, hx + hr * 0.72, hy - hr * 1.3, hx + hr * 0.94, hy - hr * 0.72);
      cc.quadraticCurveTo(hx + hr * 1.14, hy - hr * 0.4, hx + hr * 1.0, hy + hr * 0.08);
      cc.quadraticCurveTo(hx + hr * 0.86, hy - hr * 0.28, hx + hr * 0.8, hy - hr * 0.56);
      cc.quadraticCurveTo(hx + hr * 0.64, hy - hr * 0.7, hx + hr * 0.5, hy - hr * 0.84);
      cc.quadraticCurveTo(hx + hr * 0.2, hy - hr * 0.76, hx, hy - hr * 0.8);
      cc.quadraticCurveTo(hx - hr * 0.2, hy - hr * 0.76, hx - hr * 0.5, hy - hr * 0.84);
      cc.quadraticCurveTo(hx - hr * 0.64, hy - hr * 0.7, hx - hr * 0.8, hy - hr * 0.56);
      cc.quadraticCurveTo(hx - hr * 0.86, hy - hr * 0.28, hx - hr * 1.0, hy + hr * 0.08);
    }, hair, (cc) => {
      strands(cc, shade(hair, -0.22), 3, [[-0.4, -0.82, -0.48, -1.12], [-0.12, -0.8, -0.16, -1.15], [0.16, -0.8, 0.2, -1.15], [0.42, -0.84, 0.5, -1.1], [-0.94, -0.1, -0.9, -0.6], [0.94, -0.1, 0.9, -0.6]], 0.04);
    }, 6);
  } else if (r.hair === 'long') {
    part(c, hairCap, hair);
  } else if (r.hair === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      part(c, circle(hx + Math.cos(a) * hr * 0.95, hy - hr * 0.1 + Math.sin(a) * hr * 0.95, hr * 0.32), hair, undefined, 5);
    }
  }
  // cap
  if (r.extra === 'cap') {
    part(c, (cc) => {
      cc.moveTo(hx - hr * 1.0, hy - hr * 0.35);
      cc.bezierCurveTo(hx - hr * 1.0, hy - hr * 1.3, hx + hr * 1.0, hy - hr * 1.3, hx + hr * 1.0, hy - hr * 0.35);
      cc.closePath();
    }, '#e5383b');
    part(c, ellipse(hx + hr * 0.4, hy - hr * 0.38, hr * 0.8, hr * 0.16), shade('#e5383b', -0.15));
  }

  // --- the face ---
  const ey = hy + hr * 0.02;
  const eye = EYE_COLOURS[r.eyes] ?? EYE_COLOURS[0];
  const brow = r.hair === 'bald' ? shade(skin, -0.4) : lum(hair) > 150 ? shade(hair, -0.32) : shade(hair, -0.1);
  for (const s of [-1, 1]) {
    const ex = hx + s * hr * 0.38;
    if (older) {
      // a crinkly, smiling eye: flatter on top, pushed up by the cheek underneath
      const w = hr * 0.16, h = hr * 0.12;
      const almond = (cc: Ctx) => {
        cc.moveTo(ex - w, ey + 2);
        cc.quadraticCurveTo(ex, ey - h * 1.5, ex + w, ey + 2);
        cc.quadraticCurveTo(ex, ey + h * 1.1, ex - w, ey + 2);
        cc.closePath();
      };
      part(c, almond, '#ffffff', (cc) => {
        fillPath(cc, circle(ex, ey + 1, hr * 0.095), eye);
        fillPath(cc, circle(ex, ey + 1, hr * 0.05), '#1f1f1f');
        fillPath(cc, circle(ex - hr * 0.035, ey - hr * 0.03, hr * 0.025), '#ffffff');
      }, 3);
      c.beginPath();
      c.moveTo(ex - w - 2, ey + 3);
      c.quadraticCurveTo(ex, ey - h * 1.55, ex + w + 2, ey + 3);
      c.lineWidth = 4.5;
      c.strokeStyle = INK;
      c.stroke();
      // the crinkles: under the eye and fanning out at the side
      c.lineWidth = 2.5;
      c.strokeStyle = shade(skin, -0.25);
      c.beginPath();
      c.moveTo(ex - w * 0.8, ey + h * 1.25);
      c.quadraticCurveTo(ex, ey + h * 1.9, ex + w * 0.8, ey + h * 1.25);
      const ox = ex + s * (w + hr * 0.05);
      for (const [dy0, dy1] of [[-0.02, -0.12], [0.04, 0.04], [0.1, 0.18]]) {
        c.moveTo(ox, ey + hr * dy0);
        c.lineTo(ox + s * hr * 0.12, ey + hr * dy1);
      }
      c.stroke();
    } else {
      fillPath(c, ellipse(ex, ey, hr * 0.15, hr * 0.17), '#ffffff', 3);
      fillPath(c, circle(ex, ey + 2, hr * 0.11), eye);
      fillPath(c, circle(ex, ey + 2, hr * 0.055), '#1f1f1f');
      fillPath(c, circle(ex - hr * 0.04, ey - hr * 0.03, hr * 0.03), '#ffffff');
    }
    // eyebrows (fuller on older people)
    c.beginPath();
    c.moveTo(ex - hr * 0.16, ey - hr * (older ? 0.27 : 0.26));
    c.quadraticCurveTo(ex, ey - hr * (older ? 0.36 : 0.33), ex + hr * 0.16, ey - hr * (older ? 0.27 : 0.26));
    c.lineWidth = older ? 7 : 5;
    c.strokeStyle = brow;
    c.lineCap = 'round';
    c.stroke();
  }
  // cheeks, freckles
  c.globalAlpha = older ? 0.5 : 0.4;
  for (const s of [-1, 1]) fillPath(c, ellipse(hx + s * hr * 0.58, hy + hr * 0.36, hr * 0.17, hr * 0.1), '#ff6b81');
  c.globalAlpha = 1;
  if (r.face === 'freckles') {
    for (const s of [-1, 1]) for (const [dx, dy] of [[0.45, 0.24], [0.56, 0.3], [0.5, 0.36], [0.62, 0.22], [0.38, 0.32]]) fillPath(c, circle(hx + s * hr * dx, hy + hr * dy, 2.2), '#b5651d');
  }
  // smile lines: little creases by the eyes and round the smile (older people have them anyway)
  if (r.face === 'lines' && !older) {
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.strokeStyle = shade(skin, -0.22);
    for (const s of [-1, 1]) {
      const ox = hx + s * hr * 0.6;
      c.beginPath();
      for (const dy of [-0.05, 0.08]) {
        c.moveTo(ox, ey + hr * dy);
        c.lineTo(ox + s * hr * 0.1, ey + hr * dy * 1.9);
      }
      c.moveTo(hx + s * hr * 0.3, hy + hr * 0.36);
      c.quadraticCurveTo(hx + s * hr * 0.46, hy + hr * 0.52, hx + s * hr * 0.42, hy + hr * 0.7);
      c.stroke();
    }
  }
  // the nose
  c.beginPath();
  if (older) {
    c.moveTo(hx - hr * 0.04, hy + hr * 0.1);
    c.quadraticCurveTo(hx - hr * 0.17, hy + hr * 0.3, hx - hr * 0.07, hy + hr * 0.36);
    c.quadraticCurveTo(hx, hy + hr * 0.4, hx + hr * 0.07, hy + hr * 0.36);
    c.quadraticCurveTo(hx + hr * 0.15, hy + hr * 0.31, hx + hr * 0.1, hy + hr * 0.25);
  } else {
    c.moveTo(hx - 4, hy + hr * 0.3);
    c.quadraticCurveTo(hx + 4, hy + hr * 0.36, hx + 6, hy + hr * 0.28);
  }
  c.lineWidth = 3.5;
  c.strokeStyle = shade(skin, -0.35);
  c.stroke();
  // older people: creases from the nose round the smile, and a little one under the lip
  if (older) {
    c.lineWidth = 3;
    c.strokeStyle = shade(skin, -0.25);
    c.beginPath();
    for (const s of [-1, 1]) {
      c.moveTo(hx + s * hr * 0.2, hy + hr * 0.3);
      c.quadraticCurveTo(hx + s * hr * 0.5, hy + hr * 0.42, hx + s * hr * 0.5, hy + hr * 0.7);
    }
    c.moveTo(hx - hr * 0.1, hy + hr * 0.86);
    c.quadraticCurveTo(hx, hy + hr * 0.9, hx + hr * 0.1, hy + hr * 0.86);
    c.stroke();
  }
  // stubble / beard / moustache
  if (r.face === 'stubble' || r.face === 'beard') {
    c.globalAlpha = r.face === 'stubble' ? 0.45 : 1;
    fillPath(c, (cc) => {
      cc.moveTo(hx - hr * 0.86, hy + hr * 0.22);
      cc.quadraticCurveTo(hx - hr * 0.8, hy + hr * 1.08, hx, hy + hr * 1.12);
      cc.quadraticCurveTo(hx + hr * 0.8, hy + hr * 1.08, hx + hr * 0.86, hy + hr * 0.22);
      cc.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.75, hx, hy + hr * 0.72);
      cc.quadraticCurveTo(hx - hr * 0.5, hy + hr * 0.75, hx - hr * 0.86, hy + hr * 0.22);
    }, r.face === 'stubble' ? shade(hair, 0.1) : hair, r.face === 'beard' ? 4 : 0);
    c.globalAlpha = 1;
  }
  if (r.face === 'moustache' || r.face === 'stubble' || r.face === 'beard') {
    c.globalAlpha = r.face === 'stubble' ? 0.5 : 1;
    fillPath(c, ellipse(hx, hy + hr * 0.46, hr * 0.3, hr * 0.08), hair);
    c.globalAlpha = 1;
  }
  // a big smile (a wide, open, happy laugh when older)
  const mw = older ? 0.4 : 0.32, mt = older ? 0.5 : 0.52, md = older ? 0.98 : 0.9;
  const mouth = (cc: Ctx) => {
    cc.moveTo(hx - hr * mw, hy + hr * mt);
    cc.quadraticCurveTo(hx, hy + hr * md, hx + hr * mw, hy + hr * mt);
    cc.closePath();
  };
  if (older) {
    part(c, mouth, '#7a2e3a', (cc) => {
      fillPath(cc, (p) => p.rect(hx - hr * mw, hy + hr * mt, hr * mw * 2, hr * 0.12), '#ffffff');
      fillPath(cc, ellipse(hx, hy + hr * 0.8, hr * 0.18, hr * 0.08), '#e56b7a');
    }, 3.5);
  } else {
    fillPath(c, mouth, '#7a2e3a', 3.5);
    fillPath(c, (cc) => cc.rect(hx - hr * 0.24, hy + hr * 0.53, hr * 0.48, hr * 0.1), '#ffffff');
  }
  // glasses
  if (r.glasses !== 'none') {
    const col = r.glasses === 'blue' ? '#2f5aa8' : '#1f1f1f';
    c.lineWidth = 5;
    c.strokeStyle = col;
    for (const s of [-1, 1]) {
      const gx = hx + s * hr * 0.38;
      c.beginPath();
      if (r.glasses === 'round') c.arc(gx, ey, hr * 0.24, 0, Math.PI * 2);
      else c.roundRect(gx - hr * 0.28, ey - hr * 0.18, hr * 0.56, hr * 0.36, 8);
      if (r.glasses === 'sun') {
        c.fillStyle = '#1f2a44';
        c.fill();
      }
      c.stroke();
    }
    c.beginPath();
    c.moveTo(hx - hr * 0.1, ey - 2);
    c.lineTo(hx + hr * 0.1, ey - 2);
    c.stroke();
  }
  // earrings
  if (r.extra === 'earrings') for (const s of [-1, 1]) fillPath(c, circle(hx + s * hr * 0.98, hy + hr * 0.3, 6), '#fffaf0', 2.5);

  // --- things they hold ---
  if (r.extra === 'hockey-stick') {
    const sx = cx + b.half + 16;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sx, b.shoulder + 20);
    c.lineTo(sx + 6, feet - 14);
    c.lineWidth = 16;
    c.strokeStyle = INK;
    c.stroke();
    c.lineWidth = 10;
    c.strokeStyle = '#ff4fa3';
    c.stroke();
    part(c, (cc) => cc.roundRect(sx - 2, feet - 26, 60, 22, 8), '#1f1f1f');
  } else if (r.extra === 'octopus') {
    const ox = cx - b.half - 10, oy = b.shoulder + armLen * 0.6;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(ox - 20 + i * 10, oy + 10);
      c.quadraticCurveTo(ox - 26 + i * 12, oy + 40, ox - 16 + i * 10, oy + 52);
      c.lineWidth = 9;
      c.strokeStyle = '#4dabf7';
      c.lineCap = 'round';
      c.stroke();
    }
    part(c, ellipse(ox, oy, 30, 26), '#4dabf7');
    fillPath(c, circle(ox - 9, oy - 2, 4), '#1f1f1f');
    fillPath(c, circle(ox + 9, oy - 2, 4), '#1f1f1f');
  } else if (r.extra === 'balloon') {
    const bx = cx + b.half + 30, by = b.shoulder - 60;
    c.beginPath();
    c.moveTo(cx + b.half + 14, b.shoulder + armLen);
    c.quadraticCurveTo(bx + 10, by + 120, bx, by + 40);
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    part(c, ellipse(bx, by, 30, 38), '#ff4d6d');
  }
}

/** The person as a picture, ready to be a character. */
/**
 * Where renderPerson's picture (at scale 1) starts, in the drawing's own
 * units: a point (x, y) on the person is at (x - offset.x, y - offset.y) in
 * the picture (it's cropped to the person). Also the picture's size, to
 * check a saved picture really is that drawing. For putting things on them.
 */
export function personOffset(r: PersonRecipe): { x: number; y: number; w: number; h: number } {
  const pad = 80;
  const c = document.createElement('canvas');
  c.width = PERSON_AREA.w + pad;
  c.height = PERSON_AREA.h;
  const ctx = c.getContext('2d')!;
  ctx.translate(pad / 2, 0);
  drawPerson(ctx, r);
  const b = trimBox(c);
  return b ? { x: b.x - pad / 2, y: b.y, w: b.w, h: b.h } : { x: -pad / 2, y: 0, w: c.width, h: c.height };
}

export function renderPerson(r: PersonRecipe, scale = 1): HTMLCanvasElement {
  const pad = 80;
  const c = document.createElement('canvas');
  c.width = Math.ceil((PERSON_AREA.w + pad) * scale);
  c.height = Math.ceil(PERSON_AREA.h * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(pad / 2, 0);
  drawPerson(ctx, r);
  return trim(c);
}
