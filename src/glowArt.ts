import { heartPath, starPath, trimBox, type Ctx, type PathFn } from './makerArt';

/**
 * Glow sticks, drawn in code from a recipe (the choices made in the
 * workshop's glow stick maker): bracelets, necklaces, headbands, bunny ears,
 * crowns, glasses, sticks and wands, in one colour, stripes of two colours or
 * a rainbow, with a little charm. Each is drawn two ways: by day (bright
 * plastic with an outline) and glowing (neon with a soft halo), which main.ts
 * shows on top of the darkness when the lights are off or it's night.
 */

const INK = '#3a3a3a';
const TAU = Math.PI * 2;

export const GLOW_SHAPES = ['bracelet', 'necklace', 'headband', 'bunny-ears', 'crown', 'glasses', 'stick', 'wand'] as const;
export const GLOW_COLOURS = ['#ff4fd8', '#ff4d6d', '#ff9f1c', '#ffe94d', '#8cff4d', '#2bffb0', '#3dfcff', '#4d8bff', '#b45cff', '#f4f4ff'];
export const GLOW_RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffe94d', '#8cff4d', '#3dfcff', '#b45cff'];
export const GLOW_CHARMS = ['none', 'star', 'heart', 'moon', 'flower', 'butterfly'] as const;
/** The second colour: all one colour, a rainbow, or (0 and up) stripes of that colour. */
export const ONE_COLOUR = -1;
export const RAINBOW = -2;

export type GlowShape = (typeof GLOW_SHAPES)[number];
export type GlowCharm = (typeof GLOW_CHARMS)[number];
export interface GlowRecipe {
  shape: GlowShape;
  colour: number;
  colour2: number;
  charm: GlowCharm;
}
/** Where each one is worn. */
export type GlowSlot = 'head' | 'eyes' | 'neck' | 'wrist' | 'hand';
export const SLOT_OF: Record<GlowShape, GlowSlot> = {
  bracelet: 'wrist',
  necklace: 'neck',
  headband: 'head',
  'bunny-ears': 'head',
  crown: 'head',
  glasses: 'eyes',
  stick: 'hand',
  wand: 'hand',
};

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const pickIndex = (a: readonly unknown[]) => Math.floor(Math.random() * a.length);
export const newGlow = (): GlowRecipe => ({ shape: 'bracelet', colour: 0, colour2: ONE_COLOUR, charm: 'none' });
export const randomGlow = (): GlowRecipe => ({
  shape: pick(GLOW_SHAPES),
  colour: pickIndex(GLOW_COLOURS),
  colour2: Math.random() < 0.5 ? ONE_COLOUR : Math.random() < 0.4 ? RAINBOW : pickIndex(GLOW_COLOURS),
  charm: Math.random() < 0.35 ? 'none' : pick(GLOW_CHARMS),
});

export type GlowLook = 'day' | 'glow';
/** The area the glow things are drawn on (in drawing units). */
export const GLOW_AREA = { x: 0, y: -20, w: 400, h: 470 };

// ---------------------------------------------------------------------------
// Little helpers
// ---------------------------------------------------------------------------
/** A colour mixed towards white. */
function lighten(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}
function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const colourOf = (r: GlowRecipe) => GLOW_COLOURS[r.colour] ?? GLOW_COLOURS[0];
/** The charm's colour: the second colour if there is one. */
const charmColour = (r: GlowRecipe) => (r.colour2 >= 0 ? (GLOW_COLOURS[r.colour2] ?? colourOf(r)) : r.colour2 === RAINBOW ? GLOW_RAINBOW[5] : colourOf(r));
/** Canvas pixels per drawing unit (a shadow's blur isn't scaled by the canvas transform, so it's scaled by hand). */
function unitOf(c: Ctx) {
  const m = c.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

/** One glow tube along a path: its colour (or stripes, or a rainbow), with an outline by day or a halo in the dark. */
function tube(c: Ctx, path: PathFn, r: GlowRecipe, width: number, look: GlowLook) {
  const u = unitOf(c);
  const col = colourOf(r);
  const line = (w: number, style: string, o: { dash?: number[]; offset?: number; blur?: number; glow?: string; butt?: boolean } = {}) => {
    c.save();
    c.beginPath();
    path(c);
    c.lineWidth = w;
    c.strokeStyle = style;
    c.lineCap = o.butt ? 'butt' : 'round';
    c.lineJoin = 'round';
    if (o.dash) {
      c.setLineDash(o.dash);
      c.lineDashOffset = o.offset ?? 0;
    }
    if (o.blur) {
      c.shadowBlur = o.blur * u;
      c.shadowColor = o.glow ?? style;
    }
    c.stroke();
    c.restore();
  };
  const bands = (w: number, light: number, blur = 0) => {
    line(w, lighten(col, light), { blur, glow: col });
    if (r.colour2 >= 0) {
      const c2 = GLOW_COLOURS[r.colour2] ?? col;
      line(w, lighten(c2, light), { dash: [width * 1.5, width * 1.5], blur, glow: c2, butt: true });
    } else if (r.colour2 === RAINBOW) {
      const L = width * 1.3, n = GLOW_RAINBOW.length;
      GLOW_RAINBOW.forEach((rc, i) => line(w, lighten(rc, light), { dash: [L, L * (n - 1)], offset: -i * L, blur, glow: rc, butt: true }));
    }
  };
  if (look === 'day') {
    line(width + Math.min(9, 3 + width * 0.4), INK);
    bands(width, 0.12);
    line(width * 0.22, 'rgba(255,255,255,0.7)'); // a shine along the plastic
  } else {
    // a soft haze of light round it, then the halo
    c.save();
    c.globalAlpha *= 0.4;
    bands(width * 2.2, 0.1, width * 3);
    c.restore();
    bands(width * 1.3, 0, width * 1.6);
    bands(width, 0.3, width * 0.6);
    line(width * 0.38, 'rgba(255,255,255,0.9)', { blur: width * 0.5, glow: '#ffffff' }); // the bright middle
  }
}

/** A little plastic charm: by day with an outline, in the dark glowing. */
function charm(c: Ctx, kind: GlowCharm | 'ball', x: number, y: number, s: number, col: string, look: GlowLook) {
  if (kind === 'none') return;
  const u = unitOf(c);
  const parts: { path: PathFn; light?: number }[] = [];
  if (kind === 'ball') parts.push({ path: (p) => p.arc(x, y, s * 0.75, 0, TAU) });
  else if (kind === 'star') parts.push({ path: (p) => starPath(p, x, y, s, 5, 0.5) });
  else if (kind === 'heart') parts.push({ path: (p) => heartPath(p, x, y + s * 0.3, s * 1.15) });
  else if (kind === 'moon')
    parts.push({
      path: (p) => {
        p.arc(x, y, s, 0.915, TAU - 0.915);
        p.arc(x + s * 0.5, y, s * 0.8, -1.433, 1.433, true);
        p.closePath();
      },
    });
  else if (kind === 'flower') {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      parts.push({ path: (p) => p.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.45, 0, TAU) });
    }
    parts.push({ path: (p) => p.arc(x, y, s * 0.35, 0, TAU), light: 0.75 });
  } else if (kind === 'butterfly') {
    for (const k of [-1, 1]) {
      parts.push({ path: (p) => p.ellipse(x + k * s * 0.45, y - s * 0.28, s * 0.5, s * 0.4, k * 0.5, 0, TAU) });
      parts.push({ path: (p) => p.ellipse(x + k * s * 0.36, y + s * 0.36, s * 0.33, s * 0.27, -k * 0.4, 0, TAU) });
    }
    parts.push({ path: (p) => p.roundRect(x - s * 0.1, y - s * 0.6, s * 0.2, s * 1.15, s * 0.1), light: 0.75 });
  }
  for (const part of parts) {
    c.save();
    c.beginPath();
    part.path(c);
    if (look === 'day') {
      c.fillStyle = lighten(col, part.light ?? 0.2);
      c.fill();
      c.lineWidth = Math.max(3, s * 0.12);
      c.strokeStyle = INK;
      c.lineJoin = 'round';
      c.stroke();
    } else {
      c.shadowBlur = s * 0.9 * u;
      c.shadowColor = col;
      c.fillStyle = lighten(col, part.light ?? 0.35);
      c.fill();
      c.fill();
    }
    c.restore();
  }
  if (look === 'glow') {
    // a bright middle
    c.save();
    c.translate(x, y);
    c.scale(0.45, 0.45);
    c.translate(-x, -y);
    c.beginPath();
    parts[parts.length - 1].path(c);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fill();
    c.restore();
  }
}

/** A thin string or clip (by day a grey line, in the dark a faint glow). */
function thread(c: Ctx, x0: number, y0: number, x1: number, y1: number, look: GlowLook) {
  c.save();
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.lineCap = 'round';
  c.lineWidth = 5;
  c.strokeStyle = look === 'day' ? INK : 'rgba(255,255,255,0.45)';
  c.stroke();
  c.restore();
}

/** The little clear plastic joiner that closes a bracelet or a necklace. */
function joiner(c: Ctx, x: number, y: number, w: number, h: number, look: GlowLook) {
  c.save();
  c.beginPath();
  c.roundRect(x - w / 2, y - h / 2, w, h, h * 0.35);
  if (look === 'day') {
    c.fillStyle = '#eef2f7';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = INK;
    c.stroke();
  } else {
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fill();
  }
  c.restore();
}

/** A bendy spring (the headband's boppers). */
function springPath(x0: number, y0: number, x1: number, y1: number, wiggles = 7, amp = 9): PathFn {
  return (p) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    p.moveTo(x0, y0);
    for (let i = 1; i <= wiggles * 2; i++) {
      const t = i / (wiggles * 2);
      const side = i === wiggles * 2 ? 0 : i % 2 ? 1 : -1;
      p.lineTo(x0 + dx * t + nx * amp * side, y0 + dy * t + ny * amp * side);
    }
  };
}

// ---------------------------------------------------------------------------
// The glow things
// ---------------------------------------------------------------------------
/** The glasses' lens shape (the charm picks it: stars, hearts, or round). */
function lensPath(kind: GlowCharm, x: number, y: number): PathFn {
  if (kind === 'star') return (p) => starPath(p, x, y, 74, 5, 0.55);
  if (kind === 'heart') return (p) => heartPath(p, x, y + 28, 82);
  return (p) => p.arc(x, y, 66, 0, TAU);
}

/** Draw a glow thing (on GLOW_AREA), by day or glowing. */
export function drawGlow(c: Ctx, r: GlowRecipe, look: GlowLook) {
  const ch = charmColour(r);
  switch (r.shape) {
    case 'stick':
      tube(c, (p) => (p.moveTo(110, 380), p.lineTo(290, 70)), r, 34, look);
      charm(c, r.charm, 300, 40, 34, ch, look);
      break;
    case 'wand':
      tube(c, (p) => (p.moveTo(150, 410), p.lineTo(202, 196)), r, 24, look);
      charm(c, r.charm === 'none' ? 'star' : r.charm, 210, 130, 74, ch, look);
      break;
    case 'bracelet':
      tube(c, (p) => (p.moveTo(320, 190), p.arc(200, 190, 120, 0, TAU)), r, 26, look);
      joiner(c, 200, 310, 40, 26, look);
      if (r.charm !== 'none') {
        thread(c, 200, 322, 200, 344, look);
        charm(c, r.charm, 200, 368, 30, ch, look);
      }
      break;
    case 'necklace':
      tube(c, (p) => (p.moveTo(365, 200), p.arc(200, 200, 165, 0, TAU)), r, 16, look);
      joiner(c, 200, 35, 34, 22, look);
      if (r.charm !== 'none') {
        thread(c, 200, 368, 200, 392, look);
        charm(c, r.charm, 200, 416, 34, ch, look);
      }
      break;
    case 'headband':
    case 'bunny-ears': {
      if (r.shape === 'headband') {
        for (const [x0, y0, x1, y1] of [[123, 189, 112, 72], [277, 189, 288, 72]]) {
          tube(c, springPath(x0, y0, x1, y1), r, 7, look);
          charm(c, r.charm === 'none' ? 'ball' : r.charm, x1, y1 - 22, 32, ch, look);
        }
      } else {
        for (const s of [-1, 1]) tube(c, (p) => p.ellipse(200 + s * 52, 82, 34, 100, s * 0.18, 0, TAU), r, 18, look);
      }
      tube(c, (p) => p.arc(200, 340, 170, Math.PI * 1.1, Math.PI * 1.9), r, 22, look);
      if (r.shape === 'bunny-ears') charm(c, r.charm, 200, 166, 40, ch, look);
      break;
    }
    case 'crown': {
      const pts = [[65, 320], [65, 150], [130, 235], [200, 95], [270, 235], [335, 150], [335, 320]];
      tube(c, (p) => {
        pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
        p.closePath();
      }, r, 20, look);
      for (const [x, y] of [pts[1], pts[3], pts[5]]) charm(c, 'ball', x, y - 4, 20, ch, look);
      charm(c, r.charm, 200, 268, 44, ch, look);
      break;
    }
    case 'glasses': {
      for (const x of [125, 275]) {
        const lens = lensPath(r.charm, x, 215);
        c.save();
        c.beginPath();
        lens(c);
        c.fillStyle = alpha(colourOf(r), look === 'day' ? 0.25 : 0.2);
        c.fill();
        c.restore();
        tube(c, lens, r, 16, look);
      }
      tube(c, (p) => (p.moveTo(186, 208), p.quadraticCurveTo(200, 188, 214, 208)), r, 12, look);
      tube(c, (p) => (p.moveTo(58, 205), p.lineTo(24, 192), p.moveTo(342, 205), p.lineTo(376, 192)), r, 12, look);
      if (r.charm === 'moon' || r.charm === 'flower' || r.charm === 'butterfly') charm(c, r.charm, 200, 165, 24, ch, look);
      break;
    }
  }
}

// --- worn: a bracelet round a wrist and a necklace round a neck look different on someone ---
/** Round a wrist, seen from the front: a flat ring 120 wide, round (0, 0). */
function drawWornBracelet(c: Ctx, r: GlowRecipe, look: GlowLook) {
  tube(c, (p) => p.ellipse(0, 0, 60, 18, 0, 0, TAU), r, 14, look);
  if (r.charm !== 'none') {
    thread(c, 0, 18, 0, 30, look);
    charm(c, r.charm, 0, 44, 16, charmColour(r), look);
  }
}
/** Round a neck: the front of the loop, from one side of the neck (at 0, 0) to the other, 140 wide. */
function drawWornNecklace(c: Ctx, r: GlowRecipe, look: GlowLook) {
  tube(c, (p) => (p.moveTo(-70, 0), p.bezierCurveTo(-76, 96, 76, 96, 70, 0)), r, 12, look);
  if (r.charm !== 'none') {
    thread(c, 0, 72, 0, 84, look);
    charm(c, r.charm, 0, 100, 20, charmColour(r), look);
  }
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------
function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/**
 * The finished glow thing as a picture (cropped to it, ready to be a
 * character), and its glowing twin: bigger, because the halo needs room, but
 * centred on the same spot, so the two line up when both are centred.
 */
export function renderGlow(r: GlowRecipe, scale = 0.6): { picture: HTMLCanvasElement; glow: HTMLCanvasElement } {
  const A = GLOW_AREA, M = 30;
  const draw = (c: Ctx, look: GlowLook, dx: number, dy: number) => {
    c.save();
    c.translate(dx, dy);
    c.scale(scale, scale);
    c.translate(M - A.x, M - A.y);
    drawGlow(c, r, look);
    c.restore();
  };
  const full = canvasOf((A.w + M * 2) * scale, (A.h + M * 2) * scale);
  draw(full.getContext('2d')!, 'day', 0, 0);
  const b = trimBox(full, 6) ?? { x: 0, y: 0, w: full.width, h: full.height };
  const picture = canvasOf(b.w, b.h);
  picture.getContext('2d')!.drawImage(full, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  const P = Math.ceil(150 * scale) + 4;
  const glow = canvasOf(b.w + P * 2, b.h + P * 2);
  draw(glow.getContext('2d')!, 'glow', P - b.x, P - b.y);
  return { picture, glow };
}

/** Worn on someone: the picture by day and glowing (the same size), where it hangs from, and its size in drawing units. */
export interface WornGlow {
  day: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  /** The point that goes on the wearer's head/eyes/neck/wrist/hand, as a fraction of the picture (a sprite's anchor). */
  ax: number;
  ay: number;
  /** Picture pixels per drawing unit. */
  unit: number;
  /** How big it is (drawing units) for fitting to the wearer: see WORN_FIT. */
  size: number;
  /** Things held in the hand: their middle (as ax, ay) and how far to turn them to lie flat, for an animal carrying one in its mouth. */
  mid?: { ax: number; ay: number; turn: number };
}
/**
 * How each one fits on someone: which part of them `size` units should
 * cover: the head's radius (headbands, crowns), the gap between the eyes
 * (glasses), the neck's half width, the arm's half width, or how tall
 * they are (things held in the hand).
 */
const WORN: Record<GlowShape, { area: { x: number; y: number; w: number; h: number }; at: [number, number]; size: number; mid?: [number, number, number] }> = {
  headband: { area: GLOW_AREA, at: [200, 340], size: 170 },
  'bunny-ears': { area: GLOW_AREA, at: [200, 340], size: 170 },
  crown: { area: GLOW_AREA, at: [200, 320], size: 135 },
  glasses: { area: GLOW_AREA, at: [200, 215], size: 150 },
  stick: { area: GLOW_AREA, at: [140, 330], size: 360, mid: [200, 225, 1.045] },
  wand: { area: GLOW_AREA, at: [160, 370], size: 330, mid: [178, 300, 1.33] },
  bracelet: { area: { x: -80, y: -30, w: 160, h: 100 }, at: [0, 0], size: 60 },
  necklace: { area: { x: -90, y: -20, w: 180, h: 150 }, at: [0, 0], size: 70 },
};
export function renderWorn(r: GlowRecipe, scale = 0.5): WornGlow {
  const fit = WORN[r.shape];
  const A = fit.area;
  const P = Math.ceil(110 * scale) + 4;
  const W = A.w * scale + P * 2, H = A.h * scale + P * 2;
  const make = (look: GlowLook) => {
    const cv = canvasOf(W, H);
    const c = cv.getContext('2d')!;
    c.translate(P, P);
    c.scale(scale, scale);
    c.translate(-A.x, -A.y);
    if (r.shape === 'bracelet') drawWornBracelet(c, r, look);
    else if (r.shape === 'necklace') drawWornNecklace(c, r, look);
    else drawGlow(c, r, look);
    return cv;
  };
  const day = make('day'), glow = make('glow');
  const fx = (x: number) => (P + (x - A.x) * scale) / day.width;
  const fy = (y: number) => (P + (y - A.y) * scale) / day.height;
  const mid = fit.mid ? { ax: fx(fit.mid[0]), ay: fy(fit.mid[1]), turn: fit.mid[2] } : undefined;
  return { day, glow, ax: fx(fit.at[0]), ay: fy(fit.at[1]), unit: scale, size: fit.size, mid };
}
