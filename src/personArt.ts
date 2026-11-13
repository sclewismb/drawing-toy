import { circle, ellipse, fillPath, part, shade, trim, type Ctx } from './makerArt';

/**
 * People, made in the maker (so the family can be in the world, made on the
 * iPad: nothing about them is in the app's code). Drawn front on, standing
 * on the ground at y = 632 of a 300 x 640 area.
 */
export const AGES = ['grown', 'big', 'little'] as const;
export const SKINS = ['#ffe3d3', '#f6cfb3', '#e8b48a', '#c68b59', '#8d5524', '#5c3a21'];
export const HAIRS = ['braids', 'ponytail', 'bun', 'swept', 'short', 'long', 'curly', 'pixie', 'bald'] as const;
export const HAIR_COLOURS = ['#3b2a20', '#6b4226', '#9a6a3a', '#c09a62', '#e6c77d', '#1f1f1f', '#b5542e', '#a7a7a7', '#ecebe6', '#d1bc92'];
export const EYE_COLOURS = ['#6f93a8', '#3d8bd9', '#2b9348', '#6b4226', '#8d6e3f'];
export const GLASSES = ['none', 'dark', 'blue', 'round', 'sun'] as const;
export const FACE_BITS = ['none', 'freckles', 'stubble', 'beard', 'moustache', 'lines'] as const;
export const TOPS = ['tee', 'tank', 'hoodie', 'fleece', 'sweatshirt', 'jersey', 'shirt'] as const;
export const TOP_COLOURS = ['#9bd0ff', '#4ea8ff', '#2b3a67', '#2b2d42', '#adb5bd', '#7b2cbf', '#e5383b', '#ff8fab', '#52b788', '#ffd166', '#ff922b', '#f8f9fa', '#1f1f1f'];
export const BOTTOMS = ['jeans', 'joggers', 'camo', 'hockey', 'shorts', 'skirt', 'leggings'] as const;
export const SHOES = ['#2b2d42', '#f8f9fa', '#e5383b', '#4ea8ff', '#ff8fab'];
export const PERSON_EXTRAS = ['none', 'hockey-stick', 'cap', 'earrings', 'octopus', 'balloon'] as const;

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
  shoes: number;
  extra: (typeof PERSON_EXTRAS)[number];
  /** Typed on the iPad (shown when they're tapped). */
  name: string;
}

export const newPerson = (): PersonRecipe => ({ age: 'big', skin: 0, hair: 'short', hairColour: 1, eyes: 0, glasses: 'none', face: 'none', top: 'tee', topColour: 1, bottoms: 'jeans', shoes: 0, extra: 'none', name: '' });
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const idx = (a: readonly unknown[]) => Math.floor(Math.random() * a.length);
export const randomPerson = (): PersonRecipe => ({
  age: pick(AGES),
  skin: idx(SKINS),
  hair: pick(HAIRS.filter((h) => h !== 'bald')),
  hairColour: idx(HAIR_COLOURS),
  eyes: idx(EYE_COLOURS),
  glasses: Math.random() < 0.6 ? 'none' : pick(GLASSES),
  face: Math.random() < 0.6 ? 'none' : pick(FACE_BITS),
  top: pick(TOPS),
  topColour: idx(TOP_COLOURS),
  bottoms: pick(BOTTOMS),
  shoes: idx(SHOES),
  extra: Math.random() < 0.5 ? 'none' : pick(PERSON_EXTRAS),
  name: '',
});

export const PERSON_AREA = { w: 300, h: 640 };
const INK = '#3a3a3a';

/** Light colours get darker marks, dark colours lighter ones. */
function marks(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
  return lum > 140 ? shade(hex, -0.45) : shade(hex, 0.5);
}
/** A holiday shirt's pattern: rows of little dashes. */
function dashes(c: Ctx, hex: string, y0: number, y1: number) {
  c.fillStyle = marks(hex);
  for (let y = y0, row = 0; y < y1; y += 22, row++) {
    for (let x = (row % 2) * 7; x < 300; x += 14) {
      c.beginPath();
      c.roundRect(x, y, 7, 15, 3.5);
      c.fill();
    }
  }
}

/** Where things are, for each size of person. */
export function bodyOf(age: PersonRecipe['age']) {
  if (age === 'grown') return { headY: 150, headR: 56, shoulder: 212, hip: 402, half: 66 };
  if (age === 'big') return { headY: 232, headR: 62, shoulder: 300, hip: 452, half: 56 };
  return { headY: 286, headR: 64, shoulder: 352, hip: 482, half: 50 };
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

export function drawPerson(c: Ctx, r: PersonRecipe) {
  const b = bodyOf(r.age);
  const skin = SKINS[r.skin] ?? SKINS[0];
  const hair = HAIR_COLOURS[r.hairColour] ?? HAIR_COLOURS[0];
  const top = TOP_COLOURS[r.topColour] ?? TOP_COLOURS[0];
  const pants = BOTTOM_COLOUR[r.bottoms];
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
    const isShort = r.bottoms === 'shorts' || r.bottoms === 'skirt' || r.bottoms === 'hockey';
    // skin (or socks) below shorts, skirts and hockey pants
    if (isShort) part(c, (cc) => cc.roundRect(lx - legW * 0.38, b.hip, legW * 0.76, feet - b.hip, 12), r.bottoms === 'hockey' ? '#1f1f1f' : skin, r.bottoms === 'hockey' ? (cc) => {
      cc.fillStyle = '#20c997';
      for (const y of [feet - 90, feet - 60]) cc.fillRect(0, y, 300, 14);
    } : undefined);
    const legEnd = isShort ? b.hip + (feet - b.hip) * (r.bottoms === 'hockey' ? 0.45 : 0.4) : feet - 6;
    if (r.bottoms !== 'skirt') {
      part(c, (cc) => cc.roundRect(lx - legW / 2, b.hip - 10, legW, legEnd - b.hip + 10, 14), pants, r.bottoms === 'camo' ? (cc) => {
        for (const [x, y, w2] of [[lx - 10, b.hip + 30, 16], [lx + 8, b.hip + 80, 14], [lx - 6, b.hip + 140, 18], [lx + 6, b.hip + 190, 12]]) fillPath(cc, ellipse(x, y, w2, w2 * 0.6, 0.4), '#c4c8cc');
        for (const [x, y] of [[lx + 6, b.hip + 50], [lx - 8, b.hip + 110], [lx + 4, b.hip + 170]]) fillPath(cc, ellipse(x, y, 10, 6, -0.3), '#5c6670');
      } : undefined);
    }
    // shoes
    part(c, (cc) => cc.roundRect(lx - legW * 0.62 + s * 4, feet - 14, legW * 1.24, 26, 12), SHOES[r.shoes] ?? SHOES[0]);
  }
  if (r.bottoms === 'skirt') part(c, (cc) => {
    cc.moveTo(cx - b.half * 0.95, b.hip - 14);
    cc.lineTo(cx + b.half * 0.95, b.hip - 14);
    cc.lineTo(cx + b.half * 1.25, b.hip + 70);
    cc.lineTo(cx - b.half * 1.25, b.hip + 70);
    cc.closePath();
  }, pants);

  // --- arms (sleeves and hands) ---
  const longSleeves = r.top !== 'tee' && r.top !== 'tank' && r.top !== 'shirt';
  const armLen = b.hip - b.shoulder + 26;
  for (const s of [-1, 1]) {
    const ax = cx + s * (b.half + 14);
    const arm = (cc: Ctx) => cc.roundRect(ax - 15, b.shoulder + 6, 30, armLen, 15);
    part(c, arm, longSleeves ? top : skin, r.top === 'jersey' ? (cc) => {
      cc.fillStyle = '#20c997';
      cc.fillRect(0, b.shoulder + armLen * 0.55, 300, 12);
      cc.fillRect(0, b.shoulder + armLen * 0.55 + 20, 300, 12);
    } : r.top === 'tee' || r.top === 'shirt' ? (cc) => {
      cc.fillStyle = top;
      cc.fillRect(0, 0, 300, b.shoulder + 52);
      if (r.top === 'shirt') {
        cc.save();
        cc.beginPath();
        cc.rect(0, 0, 300, b.shoulder + 52);
        cc.clip();
        dashes(cc, top, b.shoulder, b.shoulder + 52);
        cc.restore();
        cc.fillStyle = shade(top, -0.2);
        cc.fillRect(0, b.shoulder + 46, 300, 6);
      }
    } : undefined);
    fillPath(c, circle(ax, b.shoulder + armLen + 8, 15), r.bottoms === 'hockey' && r.top === 'jersey' ? '#1f1f1f' : skin, 5); // hand (or a hockey glove)
  }

  // --- body (the top) ---
  part(c, (cc) => cc.roundRect(cx - b.half, b.shoulder, b.half * 2, b.hip - b.shoulder + 8, 26), top, (cc) => {
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
    if (r.top === 'shirt') {
      dashes(cc, top, b.shoulder + 4, b.hip + 10);
      cc.fillStyle = shade(top, -0.18);
      cc.fillRect(cx - 4, b.shoulder, 8, b.hip - b.shoulder + 10);
      for (let y = b.shoulder + 44; y < b.hip - 6; y += 36) fillPath(cc, circle(cx, y, 5), shade(top, -0.4));
    }
    if (r.top === 'tank') {
      fillPath(cc, (p) => {
        p.moveTo(cx - b.half * 0.55, b.shoulder - 2);
        p.quadraticCurveTo(cx, b.shoulder + 50, cx + b.half * 0.55, b.shoulder - 2);
        p.closePath();
      }, skin);
    }
  });
  // the neckline
  if (r.top === 'jersey') fillPath(c, (cc) => {
    cc.moveTo(cx - 22, b.shoulder);
    cc.lineTo(cx, b.shoulder + 30);
    cc.lineTo(cx + 22, b.shoulder);
    cc.closePath();
  }, skin, 4);
  else if (r.top === 'fleece') part(c, (cc) => cc.roundRect(cx - 34, b.shoulder - 14, 68, 26, 10), top);
  else if (r.top === 'shirt') {
    fillPath(c, (cc) => {
      cc.moveTo(cx - 24, b.shoulder);
      cc.lineTo(cx, b.shoulder + 34);
      cc.lineTo(cx + 24, b.shoulder);
      cc.closePath();
    }, skin, 4);
    for (const s of [-1, 1]) {
      fillPath(c, (cc) => {
        cc.moveTo(cx + s * 32, b.shoulder - 8);
        cc.lineTo(cx + s * 3, b.shoulder + 36);
        cc.lineTo(cx + s * 40, b.shoulder + 22);
        cc.closePath();
      }, top, 4);
    }
  }
  else if (r.top !== 'tank') fillPath(c, ellipse(cx, b.shoulder + 2, 26, 12), skin, 4);

  // --- head ---
  for (const s of [-1, 1]) part(c, circle(hx + s * hr * 0.98, hy + 6, hr * 0.2), skin);
  part(c, circle(hx, hy, hr), skin);
  // hair on top
  const hairCap = (cc: Ctx) => {
    cc.moveTo(hx - hr * 1.02, hy + 4);
    cc.bezierCurveTo(hx - hr * 1.1, hy - hr * 1.25, hx + hr * 1.1, hy - hr * 1.25, hx + hr * 1.02, hy + 4);
    cc.quadraticCurveTo(hx + hr * 0.9, hy - hr * 0.55, hx, hy - hr * 0.62);
    cc.quadraticCurveTo(hx - hr * 0.9, hy - hr * 0.55, hx - hr * 1.02, hy + 4);
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
    }, hair, (cc) => {
      cc.lineWidth = 3.5;
      cc.lineCap = 'round';
      cc.strokeStyle = shade(hair, -0.25);
      for (const [x0, x1, bend] of [[-0.42, -0.52, 0.1], [-0.05, 0.1, -0.12], [0.35, 0.62, -0.14]]) {
        cc.beginPath();
        cc.moveTo(hx + hr * x0, hy - hr * 0.98);
        cc.quadraticCurveTo(hx + hr * ((x0 + x1) / 2 + bend), hy - hr * 0.86, hx + hr * x1, hy - hr * 0.7);
        cc.stroke();
      }
    });
  } else if (r.hair === 'pixie') {
    // short and feathery, with a fringe swept to one side
    part(c, (cc) => {
      cc.moveTo(hx - hr * 1.0, hy - hr * 0.02);
      cc.bezierCurveTo(hx - hr * 1.2, hy - hr * 1.55, hx + hr * 1.2, hy - hr * 1.55, hx + hr * 1.0, hy - hr * 0.02);
      cc.quadraticCurveTo(hx + hr * 0.94, hy - hr * 0.42, hx + hr * 0.62, hy - hr * 0.52);
      cc.quadraticCurveTo(hx + hr * 0.1, hy - hr * 0.46, hx - hr * 0.42, hy - hr * 0.42);
      cc.quadraticCurveTo(hx - hr * 0.78, hy - hr * 0.36, hx - hr * 0.86, hy - hr * 0.12);
      cc.quadraticCurveTo(hx - hr * 0.94, hy - hr * 0.3, hx - hr * 1.0, hy - hr * 0.02);
    }, hair, (cc) => {
      cc.lineWidth = 5;
      cc.lineCap = 'round';
      for (const [x0, y0, x1, y1, col] of [[0.7, -0.95, 0.0, -0.6, 0.4], [0.25, -1.1, -0.45, -0.55, 0.3], [0.9, -0.55, 0.45, -0.58, -0.2], [-0.2, -1.1, -0.75, -0.3, -0.2]] as const) {
        cc.strokeStyle = shade(hair, col);
        cc.beginPath();
        cc.moveTo(hx + hr * x0, hy + hr * y0);
        cc.quadraticCurveTo(hx + hr * (x0 + x1) * 0.5, hy + hr * (y0 + y1) * 0.5 - hr * 0.12, hx + hr * x1, hy + hr * y1);
        cc.stroke();
      }
    });
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
  for (const s of [-1, 1]) {
    const ex = hx + s * hr * 0.38;
    fillPath(c, ellipse(ex, ey, hr * 0.15, hr * 0.17), '#ffffff', 3);
    fillPath(c, circle(ex, ey + 2, hr * 0.11), EYE_COLOURS[r.eyes] ?? EYE_COLOURS[0]);
    fillPath(c, circle(ex, ey + 2, hr * 0.055), '#1f1f1f');
    fillPath(c, circle(ex - hr * 0.04, ey - hr * 0.03, hr * 0.03), '#ffffff');
    // eyebrows
    c.beginPath();
    c.moveTo(ex - hr * 0.15, ey - hr * 0.26);
    c.quadraticCurveTo(ex, ey - hr * 0.33, ex + hr * 0.15, ey - hr * 0.26);
    c.lineWidth = 5;
    c.strokeStyle = r.hair === 'bald' ? shade(skin, -0.4) : shade(hair, -0.1);
    c.lineCap = 'round';
    c.stroke();
  }
  // cheeks, freckles
  c.globalAlpha = 0.4;
  for (const s of [-1, 1]) fillPath(c, ellipse(hx + s * hr * 0.58, hy + hr * 0.36, hr * 0.17, hr * 0.1), '#ff6b81');
  c.globalAlpha = 1;
  if (r.face === 'freckles') {
    for (const s of [-1, 1]) for (const [dx, dy] of [[0.45, 0.24], [0.56, 0.3], [0.5, 0.36], [0.62, 0.22], [0.38, 0.32]]) fillPath(c, circle(hx + s * hr * dx, hy + hr * dy, 2.2), '#b5651d');
  }
  // smile lines: little creases by the eyes and round the smile
  if (r.face === 'lines') {
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
  // nose and a big smile
  c.beginPath();
  c.moveTo(hx - 4, hy + hr * 0.3);
  c.quadraticCurveTo(hx + 4, hy + hr * 0.36, hx + 6, hy + hr * 0.28);
  c.lineWidth = 3.5;
  c.strokeStyle = shade(skin, -0.35);
  c.stroke();
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
  fillPath(c, (cc) => {
    cc.moveTo(hx - hr * 0.32, hy + hr * 0.52);
    cc.quadraticCurveTo(hx, hy + hr * 0.9, hx + hr * 0.32, hy + hr * 0.52);
    cc.closePath();
  }, '#7a2e3a', 3.5);
  fillPath(c, (cc) => cc.rect(hx - hr * 0.24, hy + hr * 0.53, hr * 0.48, hr * 0.1), '#ffffff');
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
