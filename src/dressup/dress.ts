import { trimBox } from '../makerArt';
import { CX, drawHands, drawSkin, handAt, hangPts, headCY, plan, TAU, type PlanKind } from './figure';
import { garment, type Garment, type Outfit } from './garments';

/**
 * A person who can be dressed up. Their face and hair are their own pictures
 * (kept on the iPad, made privately); their body and clothes are drawn here.
 */
export interface DressRecipe {
  plan: PlanKind;
  skin: string;
  /** Empty space on top (a fraction of the picture), so children stand shorter. */
  pad: number;
  outfit: Outfit;
  /** Their own clothes (the "back to usual" button). */
  usual: Outfit;
  /** Their head (face and hair), as a PNG (base64) on the full 420 x 980 canvas. */
  head: string;
  /** Anything behind them (long hair at the back), the same way. */
  back?: string;
  /** Which version of the drawing style their picture was drawn with (see LOOK). */
  look?: number;
}

/**
 * The drawing style's version. Raise it when bodies or clothes are drawn
 * differently: the app then redraws everyone's picture once (keeping what
 * they're wearing). 2 = soft light, shading and texture (2026-11-15).
 */
export const LOOK = 2;

/** The canvas everything is drawn on (the figure is 50 down from its top), and the part kept for the picture. */
export const CANVAS = { w: 420, h: 980, top: 50 };
export const CROP = { x: 20, y: 40, w: 380, h: 922 };
const DRAW_SKIN = '#f1c0a4';

const images = new Map<string, Promise<HTMLImageElement>>();
export function layerImage(b64: string): Promise<HTMLImageElement> {
  let p = images.get(b64);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `data:image/png;base64,${b64}`;
    });
    images.set(b64, p);
  }
  return p;
}
export interface Layers {
  head: HTMLImageElement;
  back: HTMLImageElement | null;
}
export async function loadLayers(d: DressRecipe): Promise<Layers> {
  const [head, back] = await Promise.all([layerImage(d.head), d.back ? layerImage(d.back) : Promise.resolve(null)]);
  return { head, back };
}

/** Which clothes are actually on (a whole-outfit costume replaces the top and bottoms; boots replace shoes). */
export function wearing(outfit: Outfit) {
  const costume = garment(outfit.costume);
  const dress = costume?.full ? undefined : garment(outfit.dress);
  const whole = !!costume?.full || !!dress;
  return {
    costume,
    dress,
    top: whole ? undefined : garment(outfit.top),
    bottom: whole ? undefined : garment(outfit.bottom),
    shoes: costume?.noShoes || dress?.noShoes ? undefined : garment(outfit.shoes),
    hat: garment(outfit.hat),
    neck: garment(outfit.neck),
    face: garment(outfit.face),
    back: garment(outfit.back),
  };
}

/** The whole person on the full canvas (not cropped). */
export function drawFull(d: DressRecipe, outfit: Outfit, layers: Layers): HTMLCanvasElement {
  const P = plan(d.plan);
  const cv = document.createElement('canvas');
  cv.width = CANVAS.w;
  cv.height = CANVAS.h;
  const c = cv.getContext('2d')!;
  const w = wearing(outfit);
  const dc = { skin: d.skin };
  const each = (list: (Garment | undefined)[], stage: 'back' | 'legs' | 'feet' | 'body' | 'waist' | 'outer' | 'neck' | 'front') => {
    c.save();
    c.translate(0, CANVAS.top);
    for (const g of list) g?.[stage]?.(c, P, dc);
    c.restore();
  };
  // a soft shadow on the ground, darker right under the feet
  softBlob(c, CX, 895 + CANVAS.top, P.kid ? (P.kind === 'baby' ? 84 : 96) : 116, 15, 0.2);
  for (const s of [-1, 1]) softBlob(c, CX + s * (P.legX + 6), 896 + CANVAS.top, P.legW * 0.9, 6, 0.22);
  each([w.back, w.costume, w.dress], 'back');
  if (layers.back) c.drawImage(layers.back, 0, 0);
  c.save();
  c.translate(0, CANVAS.top);
  drawSkin(c, P, d.skin);
  c.restore();
  each([w.bottom, w.dress, w.costume], 'legs');
  each([w.shoes, w.dress, w.costume], 'feet');
  each([w.top, w.dress, w.costume], 'body');
  each([w.top?.long ? undefined : w.bottom, w.top, w.dress], 'waist'); // (a long top hides a skirt's waistband)
  each([w.top, w.dress, w.costume, w.back], 'outer');
  c.save();
  c.translate(0, CANVAS.top);
  drawHands(c, P, w.costume?.hands ?? d.skin, !!w.costume?.hands);
  c.restore();
  each([w.neck, w.back], 'neck');
  // the head's soft shadow on the neck and shoulders (only on what's drawn)
  c.save();
  c.globalCompositeOperation = 'source-atop';
  softBlob(c, CX, P.chin + CANVAS.top + 14, P.hw * 1.05, P.hw * 0.42, 0.24);
  c.restore();
  c.drawImage(layers.head, 0, 0);
  each([w.costume, w.dress, w.face, w.hat], 'front');
  // light over the whole person: a little brighter up top, deeper down by the floor
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, CANVAS.top + P.top, 0, CANVAS.top + 900);
  g.addColorStop(0, 'rgba(255,250,235,0.06)');
  g.addColorStop(0.45, 'rgba(255,250,235,0)');
  g.addColorStop(0.8, 'rgba(30,24,48,0)');
  g.addColorStop(1, 'rgba(30,24,48,0.12)');
  c.fillStyle = g;
  c.fillRect(0, 0, CANVAS.w, CANVAS.h);
  c.restore();
  return cv;
}

/** A soft-edged dark oval (a shadow), fading out from the middle. */
function softBlob(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number) {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(30,24,48,${alpha})`);
  g.addColorStop(0.55, `rgba(30,24,48,${alpha * 0.6})`);
  g.addColorStop(1, 'rgba(30,24,48,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, rx, 0, TAU);
  c.fill();
  c.restore();
}

const padOf = (d: DressRecipe) => Math.round((CROP.h * d.pad) / (1 - d.pad));

/** The person as their picture: cropped, with space on top for the shorter ones. Always the same size for a person, whatever they wear. */
export function drawDressed(d: DressRecipe, outfit: Outfit, layers: Layers): HTMLCanvasElement {
  const full = drawFull(d, outfit, layers);
  const pad = padOf(d);
  const out = document.createElement('canvas');
  out.width = CROP.w;
  out.height = CROP.h + pad;
  out.getContext('2d')!.drawImage(full, CROP.x, CROP.y, CROP.w, CROP.h, 0, pad, CROP.w, CROP.h);
  return out;
}
export async function renderDressed(d: DressRecipe, outfit: Outfit = d.outfit) {
  return drawDressed(d, outfit, await loadLayers(d));
}

/** Where things go on them (for glow sticks): see wearSpots.ts. */
export function dressSpots(d: DressRecipe) {
  const P = plan(d.plan);
  const pad = padOf(d), H = CROP.h + pad;
  const fx = (x: number) => (x - CROP.x) / CROP.w;
  const fy = (y: number) => (y + CANVAS.top - CROP.y + pad) / H;
  const fw = (v: number) => v / CROP.w;
  const L = hangPts(P, -1), wl = L[L.length - 1];
  const [hx, hy] = handAt(hangPts(P, 1));
  return {
    head: [fx(CX), fy(headCY(P)), fw(P.hw * 1.02)] as [number, number, number],
    eyes: [fx(CX), fy(P.eyeY), fw(P.eyeX * 2)] as [number, number, number],
    neck: [fx(CX), fy(P.sy - 6), fw(P.neckW + 12)] as [number, number, number],
    wrist: [fx(wl[0]), fy(wl[1] - 14), fw(wl[2] / 2 + 6)] as [number, number, number],
    hand: [fx(hx), fy(hy)] as [number, number],
    tall: (H - pad - (P.top + CANVAS.top - CROP.y - 20)) / H,
  };
}

/** A piece of clothing on its own, cropped to it (for the choice tiles). */
const tiles = new Map<string, HTMLCanvasElement>();
export function garmentPicture(g: Garment, kind: PlanKind): HTMLCanvasElement {
  const key = `${kind}:${g.id}`;
  let t = tiles.get(key);
  if (t) return t;
  const P = plan(kind);
  const cv = document.createElement('canvas');
  cv.width = CANVAS.w;
  cv.height = CANVAS.h;
  const c = cv.getContext('2d')!;
  c.translate(0, CANVAS.top);
  const dc = { skin: DRAW_SKIN, alone: true };
  if (g.tile) g.tile(c, P, dc);
  else for (const stage of ['back', 'legs', 'feet', 'body', 'waist', 'outer', 'neck', 'front'] as const) g[stage]?.(c, P, dc);
  const b = trimBox(cv, 6);
  t = document.createElement('canvas');
  if (!b) {
    t.width = t.height = 1;
  } else {
    t.width = b.w;
    t.height = b.h;
    t.getContext('2d')!.drawImage(cv, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  }
  tiles.set(key, t);
  return t;
}
