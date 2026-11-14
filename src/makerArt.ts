/**
 * Teddies and squishies, drawn in code from a "recipe" (the choices made in
 * the workshop's maker). Plain canvas drawing, so the same code makes the
 * big preview, the little option pictures and the finished toy.
 */

const INK = '#3a3a3a';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------
export const ANIMALS = ['bear', 'bunny', 'kitty', 'puppy', 'unicorn'] as const;
export const FURS = ['#b5835a', '#e0a458', '#f3dfc1', '#f8f9fa', '#adb5bd', '#5c5c66', '#ffb3c6', '#c8b6ff', '#9bd0ff', '#a8e6cf', '#ffe08a', '#ff8a80'];
export const PATTERNS = ['plain', 'patches', 'spots', 'hearts', 'stars', 'rainbow'] as const;
export const EYES = ['button', 'sparkle', 'big', 'sleepy', 'wink', 'hearts'] as const;
export const MOUTHS = ['smile', 'open', 'tongue', 'whiskers'] as const;
export const TUMMIES = ['none', 'circle', 'heart', 'star', 'rainbow'] as const;
export const EXTRAS = ['none', 'bow', 'party-hat', 'top-hat', 'scarf', 'crown', 'glasses', 'flower'] as const;

export interface BearRecipe {
  animal: (typeof ANIMALS)[number];
  fur: number;
  pattern: (typeof PATTERNS)[number];
  eyes: (typeof EYES)[number];
  mouth: (typeof MOUTHS)[number];
  tummy: (typeof TUMMIES)[number];
  extra: (typeof EXTRAS)[number];
  heart: boolean;
}

export const SHAPES = ['bun', 'cat', 'strawberry', 'cloud', 'star', 'heart', 'dumpling', 'donut', 'peach'] as const;
export const PASTELS = ['#ffc2d4', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fffffc', '#ff9aa2', '#b5ead7', '#e2c2a0'];
export const FACES = ['happy', 'sleepy', 'wink', 'surprised', 'kitty', 'love', 'none'] as const;
export const TOPPINGS = ['none', 'sprinkles', 'icing', 'stars', 'glitter', 'cherry', 'bow'] as const;

export interface SquishyRecipe {
  shape: (typeof SHAPES)[number];
  colour: number;
  /** Second colour for a two-tone squishy (-1 = just one colour). */
  colour2: number;
  face: (typeof FACES)[number];
  topping: (typeof TOPPINGS)[number];
}

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const pickIndex = (a: readonly unknown[]) => Math.floor(Math.random() * a.length);

export const newBear = (): BearRecipe => ({ animal: 'bear', fur: 0, pattern: 'plain', eyes: 'button', mouth: 'smile', tummy: 'circle', extra: 'none', heart: false });
export const randomBear = (): BearRecipe => ({
  animal: pick(ANIMALS),
  fur: pickIndex(FURS),
  pattern: Math.random() < 0.5 ? 'plain' : pick(PATTERNS),
  eyes: pick(EYES),
  mouth: pick(MOUTHS),
  tummy: pick(TUMMIES),
  extra: pick(EXTRAS),
  heart: false,
});
export const newSquishy = (): SquishyRecipe => ({ shape: 'bun', colour: 0, colour2: -1, face: 'happy', topping: 'none' });
export const randomSquishy = (): SquishyRecipe => ({
  shape: pick(SHAPES),
  colour: pickIndex(PASTELS),
  colour2: Math.random() < 0.4 ? pickIndex(PASTELS) : -1,
  face: pick(FACES.slice(0, 6)),
  topping: pick(TOPPINGS),
});

// ---------------------------------------------------------------------------
// Little helpers
// ---------------------------------------------------------------------------
type Ctx = CanvasRenderingContext2D;
type PathFn = (c: Ctx) => void;

/** Mix a colour towards white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

/** A filled, outlined part, with an optional pattern drawn only inside it. */
export function part(c: Ctx, path: PathFn, fill: string | CanvasGradient, inside?: (c: Ctx) => void, line = 8) {
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inside) {
    c.save();
    c.beginPath();
    path(c);
    c.clip();
    inside(c);
    c.restore();
  }
  c.beginPath();
  path(c);
  c.lineWidth = line;
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke();
}

export const ellipse = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU);
export const circle = (x: number, y: number, r: number): PathFn => ellipse(x, y, r, r);

export function heartPath(c: Ctx, x: number, y: number, s: number) {
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 1.1, y - s * 0.3, x - s * 0.5, y - s * 1.05, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.5, y - s * 1.05, x + s * 1.1, y - s * 0.3, x, y + s * 0.35);
  c.closePath();
}
export function starPath(c: Ctx, x: number, y: number, r: number, points = 5, inner = 0.48) {
  for (let i = 0; i <= points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
export function fillPath(c: Ctx, path: PathFn, fill: string, stroke = 0) {
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = stroke;
    c.strokeStyle = INK;
    c.stroke();
  }
}
/** A seeded random, so patterns look the same every time. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}
const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];

// ---------------------------------------------------------------------------
// Teddies (and bunnies, kitties, puppies, unicorns)
// ---------------------------------------------------------------------------
export const BEAR_SIZE = { w: 600, h: 700 };

/**
 * Draw a teddy. `plump` 0..1 is how stuffed it is (0 = floppy and flat).
 * Drawn on a 600 x 700 area (scale the context first for other sizes).
 */
export function drawBear(c: Ctx, r: BearRecipe, plump = 1) {
  const fur = FURS[r.fur] ?? FURS[0];
  const light = shade(fur, 0.55);
  const dark = shade(fur, -0.25);
  const p = Math.max(0, Math.min(1, plump));
  const cx = 300;
  const sag = (1 - p) * 40; // unstuffed: everything droops a bit

  // the pattern, drawn inside each furry part
  const rnd = seeded(r.fur * 31 + PATTERNS.indexOf(r.pattern) * 7 + 3);
  const spots = Array.from({ length: 40 }, () => [rnd() * 600, rnd() * 700, 0.6 + rnd() * 0.6] as const);
  const pattern = (cc: Ctx) => {
    if (r.pattern === 'plain') return;
    if (r.pattern === 'rainbow') {
      RAINBOW.forEach((col, i) => {
        cc.fillStyle = col;
        cc.globalAlpha = 0.55;
        cc.fillRect(0, 60 + i * 105, 600, 105);
      });
      cc.globalAlpha = 1;
      return;
    }
    for (const [x, y, k] of spots) {
      cc.beginPath();
      if (r.pattern === 'patches') {
        cc.ellipse(x, y, 34 * k, 26 * k, k * 3, 0, TAU);
        cc.fillStyle = dark;
        cc.fill();
        cc.setLineDash([6, 6]);
        cc.lineWidth = 3;
        cc.strokeStyle = shade(fur, -0.5);
        cc.stroke();
        cc.setLineDash([]);
      } else if (r.pattern === 'spots') {
        cc.arc(x, y, 16 * k, 0, TAU);
        cc.fillStyle = dark;
        cc.fill();
      } else if (r.pattern === 'hearts') {
        heartPath(cc, x, y, 18 * k);
        cc.fillStyle = '#ff6b9a';
        cc.fill();
      } else if (r.pattern === 'stars') {
        starPath(cc, x, y, 16 * k);
        cc.fillStyle = '#ffd43b';
        cc.fill();
      }
    }
  };

  // --- legs (sitting, feet towards you) with paw pads ---
  for (const s of [-1, 1]) {
    part(c, ellipse(cx + s * 95, 595, 82, 68), fur, pattern);
    fillPath(c, ellipse(cx + s * 100, 612, 44, 38), light, 5);
    for (const t of [-1, 0, 1]) fillPath(c, circle(cx + s * 100 + t * 22, 568, 9), light, 3);
  }
  // --- body ---
  const bodyRx = 150 * (0.82 + 0.18 * p), bodyRy = 148 * (0.72 + 0.28 * p);
  part(c, ellipse(cx, 470 + sag * 0.6, bodyRx, bodyRy), fur, pattern);
  // the tummy patch
  const ty = 485 + sag * 0.6;
  if (r.tummy === 'circle') fillPath(c, ellipse(cx, ty, 88, 92 * (0.75 + 0.25 * p)), light, 5);
  else if (r.tummy === 'heart') fillPath(c, (cc) => heartPath(cc, cx, ty + 20, 86), light, 5);
  else if (r.tummy === 'star') fillPath(c, (cc) => starPath(cc, cx, ty + 5, 90), light, 5);
  else if (r.tummy === 'rainbow') {
    RAINBOW.forEach((col, i) => {
      c.beginPath();
      c.arc(cx, ty + 50, 85 - i * 11, Math.PI, 0);
      c.lineWidth = 11;
      c.strokeStyle = col;
      c.stroke();
    });
  }
  // a little heart stitched on (put in when it was stuffed)
  if (r.heart) {
    fillPath(c, (cc) => heartPath(cc, cx + 70, 420 + sag * 0.6, 22), '#ff4d6d', 4);
    c.setLineDash([4, 5]);
    c.beginPath();
    heartPath(c, cx + 70, 420 + sag * 0.6, 30);
    c.lineWidth = 2.5;
    c.strokeStyle = '#ff4d6d';
    c.stroke();
    c.setLineDash([]);
  }
  // wrinkles while it's still floppy
  if (p < 0.95) {
    c.globalAlpha = 1 - p;
    for (const [x, y] of [[cx - 60, 430], [cx + 40, 520], [cx - 20, 560]]) {
      c.beginPath();
      c.moveTo(x, y + sag * 0.6);
      c.quadraticCurveTo(x + 20, y - 12 + sag * 0.6, x + 40, y + sag * 0.6);
      c.lineWidth = 4;
      c.strokeStyle = INK;
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  // --- arms (droopy when unstuffed) ---
  for (const s of [-1, 1]) {
    const ax = cx + s * 150, ay = 440 + sag;
    const rot = s * (0.55 - (1 - p) * 0.45);
    part(c, ellipse(ax, ay, 50, 96 * (0.85 + 0.15 * p), rot), fur, pattern);
    fillPath(c, ellipse(ax + s * Math.sin(rot) * -60, ay + Math.cos(rot) * 60, 30, 26, rot), light, 4);
  }
  // --- ears (behind the head) ---
  const hy = 245 + sag * 0.5, hr = 150 * (0.92 + 0.08 * p);
  if (r.animal === 'bear') {
    for (const s of [-1, 1]) {
      part(c, circle(cx + s * 118, hy - 112, 56), fur, pattern);
      fillPath(c, circle(cx + s * 118, hy - 108, 30), light, 4);
    }
  } else if (r.animal === 'bunny') {
    for (const s of [-1, 1]) {
      part(c, ellipse(cx + s * 62, hy - 190, 40, 112, s * 0.18), fur, pattern);
      fillPath(c, ellipse(cx + s * 62, hy - 185, 20, 80, s * 0.18), '#ffc2d4', 4);
    }
  } else if (r.animal === 'kitty' || r.animal === 'unicorn') {
    for (const s of [-1, 1]) {
      const tri: PathFn = (cc) => {
        cc.moveTo(cx + s * 50, hy - 120);
        cc.lineTo(cx + s * 132, hy - 205);
        cc.lineTo(cx + s * 140, hy - 60);
        cc.closePath();
      };
      part(c, tri, fur, pattern);
      fillPath(c, (cc) => {
        cc.moveTo(cx + s * 72, hy - 118);
        cc.lineTo(cx + s * 126, hy - 172);
        cc.lineTo(cx + s * 128, hy - 88);
        cc.closePath();
      }, '#ffc2d4');
    }
  }
  // --- head ---
  part(c, circle(cx, hy, hr), fur, pattern);
  // floppy puppy ears hang over the sides of the head
  if (r.animal === 'puppy') {
    for (const s of [-1, 1]) part(c, ellipse(cx + s * 140, hy + 10, 50, 104, -s * 0.32), dark);
  }
  // unicorn: a golden horn and a rainbow mane
  if (r.animal === 'unicorn') {
    part(c, (cc) => {
      cc.moveTo(cx - 30, hy - 128);
      cc.lineTo(cx, hy - 260);
      cc.lineTo(cx + 30, hy - 128);
      cc.closePath();
    }, '#ffd43b');
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo(cx - 30 + i * 8, hy - 128 - i * 30);
      c.lineTo(cx + 30 - i * 8, hy - 140 - i * 30);
      c.lineWidth = 4;
      c.strokeStyle = '#e0a800';
      c.stroke();
    }
    RAINBOW.forEach((col, i) => part(c, circle(cx - 60 - i * 16, hy - 120 + i * 30, 30), col, undefined, 5));
  }
  // --- the face ---
  const fy = hy + 55;
  fillPath(c, ellipse(cx, fy, 74, 54), light, 5); // muzzle
  // cheeks
  c.globalAlpha = 0.45;
  fillPath(c, ellipse(cx - 98, fy - 6, 24, 15), '#ff6b9a');
  fillPath(c, ellipse(cx + 98, fy - 6, 24, 15), '#ff6b9a');
  c.globalAlpha = 1;
  // nose
  const noseCol = r.animal === 'bunny' || r.animal === 'kitty' || r.animal === 'unicorn' ? '#ff8fab' : '#4a3426';
  fillPath(c, (cc) => {
    cc.moveTo(cx - 24, fy - 30);
    cc.quadraticCurveTo(cx, fy - 42, cx + 24, fy - 30);
    cc.quadraticCurveTo(cx + 18, fy - 8, cx, fy - 6);
    cc.quadraticCurveTo(cx - 18, fy - 8, cx - 24, fy - 30);
  }, noseCol, 4);
  fillPath(c, ellipse(cx - 7, fy - 30, 7, 4), 'rgba(255,255,255,0.7)');
  // mouth
  c.lineWidth = 6;
  c.strokeStyle = INK;
  c.lineCap = 'round';
  if (r.mouth === 'open') {
    fillPath(c, (cc) => {
      cc.moveTo(cx - 26, fy + 6);
      cc.quadraticCurveTo(cx, fy + 52, cx + 26, fy + 6);
      cc.closePath();
    }, '#7a2e3a', 5);
    fillPath(c, ellipse(cx, fy + 26, 13, 9), '#ff8fab');
  } else {
    c.beginPath();
    c.moveTo(cx, fy - 6);
    c.lineTo(cx, fy + 8);
    c.moveTo(cx - 30, fy + 4);
    c.quadraticCurveTo(cx - 15, fy + 22, cx, fy + 8);
    c.quadraticCurveTo(cx + 15, fy + 22, cx + 30, fy + 4);
    c.stroke();
    if (r.mouth === 'tongue') fillPath(c, (cc) => {
      cc.moveTo(cx + 2, fy + 12);
      cc.quadraticCurveTo(cx + 4, fy + 40, cx + 18, fy + 36);
      cc.quadraticCurveTo(cx + 28, fy + 30, cx + 22, fy + 12);
      cc.closePath();
    }, '#ff6b81', 4);
    if (r.mouth === 'whiskers') {
      c.lineWidth = 3;
      for (const s of [-1, 1]) {
        for (const dy of [-10, 6]) {
          c.beginPath();
          c.moveTo(cx + s * 50, fy + dy);
          c.lineTo(cx + s * 118, fy + dy * 1.8 - 4);
          c.stroke();
        }
      }
    }
  }
  // eyes
  const ey = hy - 18;
  for (const s of [-1, 1]) {
    const ex = cx + s * 62;
    const style = r.eyes === 'wink' && s === 1 ? 'shut' : r.eyes;
    if (style === 'button') {
      fillPath(c, circle(ex, ey, 21), '#2b2118', 4);
      for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) fillPath(c, circle(ex + dx, ey + dy, 3), '#6b5a4a');
      fillPath(c, circle(ex - 8, ey - 9, 4), '#ffffff');
    } else if (style === 'sparkle' || style === 'wink') {
      fillPath(c, ellipse(ex, ey, 22, 28), '#1f1f1f');
      fillPath(c, circle(ex - 7, ey - 10, 8), '#ffffff');
      fillPath(c, circle(ex + 8, ey + 8, 4), '#ffffff');
    } else if (style === 'big') {
      fillPath(c, circle(ex, ey, 32), '#ffffff', 5);
      fillPath(c, circle(ex + s * 4, ey + 4, 18), '#3d2b1f');
      fillPath(c, circle(ex + s * 4 - 6, ey - 4, 6), '#ffffff');
    } else if (style === 'sleepy' || style === 'shut') {
      c.beginPath();
      c.lineWidth = 7;
      if (style === 'sleepy') c.arc(ex, ey - 6, 20, 0.15 * Math.PI, 0.85 * Math.PI);
      else c.arc(ex, ey + 8, 20, 1.15 * Math.PI, 1.85 * Math.PI);
      c.stroke();
    } else if (style === 'hearts') {
      fillPath(c, (cc) => heartPath(cc, ex, ey + 8, 26), '#ff4d6d', 4);
      fillPath(c, circle(ex - 9, ey - 6, 4), '#ffffff');
    }
  }
  // --- extras ---
  if (r.extra === 'bow') {
    const by = hy + hr - 6;
    for (const s of [-1, 1]) fillPath(c, (cc) => {
      cc.moveTo(cx, by);
      cc.lineTo(cx + s * 62, by - 34);
      cc.lineTo(cx + s * 62, by + 34);
      cc.closePath();
    }, '#ff4d6d', 6);
    fillPath(c, circle(cx, by, 18), '#ff8fab', 6);
  } else if (r.extra === 'scarf') {
    const by = hy + hr - 10;
    fillPath(c, (cc) => cc.roundRect(cx - 120, by - 22, 240, 46, 22), '#4dabf7', 6);
    fillPath(c, (cc) => cc.roundRect(cx + 50, by + 6, 46, 110, 14), '#4dabf7', 6);
    c.lineWidth = 6;
    c.strokeStyle = '#ffffff';
    for (const x of [cx - 80, cx - 20, cx + 40]) {
      c.beginPath();
      c.moveTo(x, by - 20);
      c.lineTo(x, by + 20);
      c.stroke();
    }
  } else if (r.extra === 'party-hat') {
    fillPath(c, (cc) => {
      cc.moveTo(cx + 20, hy - hr + 20);
      cc.lineTo(cx + 110, hy - hr - 130);
      cc.lineTo(cx + 150, hy - hr + 60);
      cc.closePath();
    }, '#9775fa', 6);
    fillPath(c, circle(cx + 110, hy - hr - 136, 18), '#ffd43b', 5);
    for (const t of [0.35, 0.65]) fillPath(c, circle(cx + 20 + (110 - 20) * t + 30 * t, hy - hr + 20 - 150 * t + 40, 8), '#ffffff');
  } else if (r.extra === 'top-hat') {
    fillPath(c, (cc) => cc.roundRect(cx - 100, hy - hr + 6, 200, 26, 10), '#2b2d42', 6);
    fillPath(c, (cc) => cc.roundRect(cx - 62, hy - hr - 120, 124, 130, 8), '#2b2d42', 6);
    fillPath(c, (cc) => cc.rect(cx - 62, hy - hr - 30, 124, 24), '#e5383b', 4);
  } else if (r.extra === 'crown') {
    fillPath(c, (cc) => {
      cc.moveTo(cx - 80, hy - hr + 30);
      cc.lineTo(cx - 92, hy - hr - 60);
      cc.lineTo(cx - 40, hy - hr - 10);
      cc.lineTo(cx, hy - hr - 80);
      cc.lineTo(cx + 40, hy - hr - 10);
      cc.lineTo(cx + 92, hy - hr - 60);
      cc.lineTo(cx + 80, hy - hr + 30);
      cc.closePath();
    }, '#ffd43b', 6);
    for (const [dx, col] of [[-50, '#4dabf7'], [0, '#ff4d6d'], [50, '#69db7c']] as const) fillPath(c, circle(cx + dx, hy - hr + 8, 10), col, 3);
  } else if (r.extra === 'glasses') {
    c.lineWidth = 7;
    c.strokeStyle = '#2b2d42';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(cx + s * 62, ey, 42, 0, TAU);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(cx - 20, ey - 6);
    c.quadraticCurveTo(cx, ey - 18, cx + 20, ey - 6);
    c.stroke();
  } else if (r.extra === 'flower') {
    const fx = cx + 105, fyy = hy - 95;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      fillPath(c, circle(fx + Math.cos(a) * 24, fyy + Math.sin(a) * 24, 18), '#ff8fab', 4);
    }
    fillPath(c, circle(fx, fyy, 14), '#ffd43b', 4);
  }
}

// ---------------------------------------------------------------------------
// Squishies
// ---------------------------------------------------------------------------
export const SQUISHY_SIZE = { w: 560, h: 520 };

/** The squishy's outline, on a 560 x 520 area. */
function squishyPath(shape: SquishyRecipe['shape']): PathFn {
  switch (shape) {
    case 'bun':
      return (c) => {
        c.moveTo(70, 420);
        c.bezierCurveTo(50, 150, 510, 150, 490, 420);
        c.quadraticCurveTo(490, 460, 440, 460);
        c.lineTo(120, 460);
        c.quadraticCurveTo(70, 460, 70, 420);
      };
    case 'cat':
      return (c) => {
        c.moveTo(80, 400);
        c.bezierCurveTo(60, 260, 90, 190, 130, 165);
        c.lineTo(150, 70);
        c.lineTo(225, 140);
        c.quadraticCurveTo(280, 128, 335, 140);
        c.lineTo(410, 70);
        c.lineTo(430, 165);
        c.bezierCurveTo(470, 190, 500, 260, 480, 400);
        c.quadraticCurveTo(470, 460, 400, 460);
        c.lineTo(160, 460);
        c.quadraticCurveTo(90, 460, 80, 400);
      };
    case 'strawberry':
      return (c) => {
        c.moveTo(280, 470);
        c.bezierCurveTo(130, 420, 50, 260, 100, 170);
        c.quadraticCurveTo(160, 110, 280, 130);
        c.quadraticCurveTo(400, 110, 460, 170);
        c.bezierCurveTo(510, 260, 430, 420, 280, 470);
      };
    case 'cloud':
      return (c) => {
        c.moveTo(90, 430);
        c.arc(120, 360, 75, Math.PI * 0.6, Math.PI * 1.5);
        c.arc(220, 250, 95, Math.PI * 1.1, Math.PI * 1.85);
        c.arc(350, 245, 90, Math.PI * 1.2, Math.PI * 1.95);
        c.arc(445, 345, 80, Math.PI * 1.5, Math.PI * 0.4);
        c.quadraticCurveTo(460, 450, 400, 450);
        c.lineTo(140, 450);
        c.quadraticCurveTo(90, 450, 90, 430);
      };
    case 'star':
      return (c) => starPath(c, 280, 290, 230, 5, 0.52);
    case 'heart':
      return (c) => heartPath(c, 280, 360, 230);
    case 'dumpling':
      return (c) => {
        c.moveTo(60, 400);
        c.bezierCurveTo(60, 230, 180, 120, 280, 110);
        c.bezierCurveTo(380, 120, 500, 230, 500, 400);
        c.quadraticCurveTo(500, 455, 440, 455);
        c.lineTo(120, 455);
        c.quadraticCurveTo(60, 455, 60, 400);
      };
    case 'donut':
      return (c) => {
        c.ellipse(280, 290, 230, 200, 0, 0, TAU);
        c.moveTo(355, 290);
        c.ellipse(280, 290, 75, 62, 0, 0, TAU, true);
      };
    case 'peach':
      return (c) => {
        c.moveTo(280, 150);
        c.bezierCurveTo(120, 90, 50, 260, 120, 380);
        c.bezierCurveTo(170, 470, 390, 470, 440, 380);
        c.bezierCurveTo(510, 260, 440, 90, 280, 150);
      };
  }
}

/** Where the face goes on each shape. */
const FACE_AT: Record<SquishyRecipe['shape'], [number, number, number]> = {
  bun: [280, 360, 1],
  cat: [280, 320, 1],
  strawberry: [280, 290, 0.9],
  cloud: [280, 350, 1],
  star: [280, 320, 0.8],
  heart: [280, 260, 1],
  dumpling: [280, 350, 1],
  donut: [280, 420, 0.7],
  peach: [280, 320, 1],
};

export function drawSquishy(c: Ctx, r: SquishyRecipe) {
  const main = PASTELS[r.colour] ?? PASTELS[0];
  const path = squishyPath(r.shape);
  let fill: string | CanvasGradient = main;
  if (r.colour2 >= 0) {
    const g = c.createLinearGradient(0, 100, 0, 470);
    g.addColorStop(0, main);
    g.addColorStop(1, PASTELS[r.colour2] ?? main);
    fill = g;
  }
  // a soft shadow underneath
  c.globalAlpha = 0.15;
  fillPath(c, ellipse(280, 478, 200, 22), '#000000');
  c.globalAlpha = 1;

  const decorate = (cc: Ctx) => {
    // toppings and details that sit inside the shape
    if (r.shape === 'strawberry') {
      const rnd = seeded(5);
      for (let i = 0; i < 26; i++) fillPath(cc, ellipse(110 + rnd() * 340, 180 + rnd() * 250, 6, 9), '#fff3b0');
    }
    if (r.shape === 'donut' || r.topping === 'icing') {
      // icing on the top, with drips
      cc.beginPath();
      cc.moveTo(0, 0);
      cc.lineTo(560, 0);
      const base = r.shape === 'donut' ? 300 : 230;
      for (let x = 560; x >= 0; x -= 40) cc.quadraticCurveTo(x - 20, base + ((x / 40) % 3) * 30 + 40, x - 40, base);
      cc.closePath();
      cc.fillStyle = r.shape === 'donut' && r.topping !== 'icing' ? '#ff8fab' : '#ffffff';
      cc.fill();
      cc.lineWidth = 5;
      cc.strokeStyle = 'rgba(58,58,58,0.6)';
      cc.stroke();
    }
    if (r.topping === 'sprinkles') {
      const rnd = seeded(9);
      for (let i = 0; i < 40; i++) {
        const x = 80 + rnd() * 400, y = 120 + rnd() * 170, a = rnd() * Math.PI;
        cc.beginPath();
        cc.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9);
        cc.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
        cc.lineWidth = 7;
        cc.lineCap = 'round';
        cc.strokeStyle = RAINBOW[i % RAINBOW.length];
        cc.stroke();
      }
    } else if (r.topping === 'stars') {
      const rnd = seeded(3);
      for (let i = 0; i < 12; i++) fillPath(cc, (p) => starPath(p, 90 + rnd() * 380, 130 + rnd() * 300, 14), '#ffffff', 3);
    } else if (r.topping === 'glitter') {
      const rnd = seeded(11);
      for (let i = 0; i < 60; i++) fillPath(cc, circle(60 + rnd() * 440, 100 + rnd() * 360, 2 + rnd() * 3), i % 3 ? '#ffffff' : '#ffd43b');
    }
    // a shine
    cc.globalAlpha = 0.45;
    fillPath(cc, ellipse(190, 210, 60, 30, -0.5), '#ffffff');
    cc.globalAlpha = 1;
  };
  part(c, path, fill, decorate, 9);
  // donut: fill the hole outline properly (the even-odd hole)
  // details on top
  if (r.shape === 'strawberry') {
    for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
      fillPath(c, (cc) => {
        cc.moveTo(280, 140);
        cc.lineTo(280 + Math.sin(a) * 110, 140 - Math.cos(a) * 60 + 20);
        cc.lineTo(280 + Math.sin(a) * 50, 150);
        cc.closePath();
      }, '#52b788', 5);
    }
  } else if (r.shape === 'peach') {
    c.beginPath();
    c.moveTo(280, 155);
    c.quadraticCurveTo(250, 260, 285, 360);
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(58,58,58,0.45)';
    c.stroke();
    fillPath(c, ellipse(330, 120, 48, 22, -0.4), '#52b788', 5);
  } else if (r.shape === 'dumpling') {
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(58,58,58,0.5)';
    for (const dx of [-60, -20, 20, 60]) {
      c.beginPath();
      c.moveTo(280 + dx * 0.5, 125);
      c.quadraticCurveTo(280 + dx, 170, 280 + dx * 1.3, 200);
      c.stroke();
    }
  } else if (r.shape === 'cat') {
    for (const s of [-1, 1]) fillPath(c, (cc) => {
      cc.moveTo(280 + s * 118, 100);
      cc.lineTo(280 + s * 75, 150);
      cc.lineTo(280 + s * 132, 160);
      cc.closePath();
    }, '#ffc2d4');
  }
  if (r.topping === 'cherry') {
    c.beginPath();
    c.moveTo(285, 140);
    c.quadraticCurveTo(300, 80, 340, 60);
    c.lineWidth = 6;
    c.strokeStyle = '#2d6a4f';
    c.stroke();
    fillPath(c, circle(285, 150, 34), '#e5383b', 6);
    fillPath(c, circle(274, 138, 9), '#ffffff');
  } else if (r.topping === 'bow') {
    for (const s of [-1, 1]) fillPath(c, (cc) => {
      cc.moveTo(380, 150);
      cc.lineTo(380 + s * 56, 120);
      cc.lineTo(380 + s * 56, 182);
      cc.closePath();
    }, '#ff4d6d', 5);
    fillPath(c, circle(380, 151, 15), '#ff8fab', 5);
  }
  drawFace(c, r.face, ...FACE_AT[r.shape]);
}

function drawFace(c: Ctx, face: SquishyRecipe['face'], x: number, y: number, k: number) {
  if (face === 'none') return;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  // blush
  c.globalAlpha = 0.55;
  fillPath(c, ellipse(-95, 22, 28, 16), '#ff8fab');
  fillPath(c, ellipse(95, 22, 28, 16), '#ff8fab');
  c.globalAlpha = 1;
  c.lineCap = 'round';
  c.strokeStyle = '#2b2118';
  for (const s of [-1, 1]) {
    const ex = s * 62;
    const style = face === 'wink' && s === 1 ? 'shut' : face;
    if (style === 'happy' || style === 'wink' || style === 'kitty') {
      fillPath(c, ellipse(ex, -8, 16, 20), '#2b2118');
      fillPath(c, circle(ex - 5, -15, 6), '#ffffff');
    } else if (style === 'surprised') {
      fillPath(c, circle(ex, -10, 22), '#2b2118');
      fillPath(c, circle(ex - 7, -18, 8), '#ffffff');
      fillPath(c, circle(ex + 7, -2, 4), '#ffffff');
    } else if (style === 'sleepy' || style === 'shut') {
      c.beginPath();
      c.lineWidth = 7;
      if (style === 'sleepy') c.arc(ex, -16, 18, 0.15 * Math.PI, 0.85 * Math.PI);
      else c.arc(ex, -2, 18, 1.15 * Math.PI, 1.85 * Math.PI);
      c.stroke();
    } else if (style === 'love') {
      fillPath(c, (cc) => heartPath(cc, ex, -2, 24), '#ff4d6d', 4);
    }
  }
  // mouth
  c.lineWidth = 6;
  c.beginPath();
  if (face === 'surprised') {
    fillPath(c, ellipse(0, 22, 12, 15), '#7a2e3a', 5);
  } else if (face === 'sleepy') {
    fillPath(c, ellipse(0, 20, 8, 6), '#7a2e3a', 4);
  } else {
    c.moveTo(-22, 12);
    c.quadraticCurveTo(-11, 28, 0, 14);
    c.quadraticCurveTo(11, 28, 22, 12);
    c.stroke();
  }
  if (face === 'kitty') {
    c.lineWidth = 3;
    for (const s of [-1, 1]) {
      for (const dy of [0, 16]) {
        c.beginPath();
        c.moveTo(s * 60, 30 + dy);
        c.lineTo(s * 120, 22 + dy * 1.6);
        c.stroke();
      }
    }
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// The finished picture
// ---------------------------------------------------------------------------
/** Where trim() crops a picture to: just the drawn part (plus a little margin). */
export function trimBox(src: HTMLCanvasElement, margin = 10): { x: number; y: number; w: number; h: number } | null {
  const ctx = src.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - margin);
  y0 = Math.max(0, y0 - margin);
  x1 = Math.min(w - 1, x1 + margin);
  y1 = Math.min(h - 1, y1 + margin);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Crop a picture to just the drawn part (plus a little margin). */
export function trim(src: HTMLCanvasElement, margin = 10): HTMLCanvasElement {
  const b = trimBox(src, margin);
  if (!b) return src;
  const out = document.createElement('canvas');
  out.width = b.w;
  out.height = b.h;
  out.getContext('2d')!.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  return out;
}

export type { Ctx, PathFn };

/** The finished toy as a picture, ready to be a character (`scale` < 1 for little ones on shelves). */
export function renderToy(kind: 'bear' | 'squishy', recipe: BearRecipe | SquishyRecipe, scale = 1): HTMLCanvasElement {
  const size = kind === 'bear' ? BEAR_SIZE : SQUISHY_SIZE;
  const pad = 140; // room for hats, horns and ears
  const c = document.createElement('canvas');
  c.width = Math.ceil(size.w * scale);
  c.height = Math.ceil((size.h + pad) * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(0, pad);
  if (kind === 'bear') drawBear(ctx, recipe as BearRecipe, 1);
  else drawSquishy(ctx, recipe as SquishyRecipe);
  return trim(c);
}
