import { FillGradient, FillPattern, Texture, type Graphics } from 'pixi.js';

/**
 * Softer, deeper rooms (first used in the two bedrooms): light and shade
 * drawn with smooth gradients, fine textures on paint, carpet and rugs, soft
 * shadows under and behind things, sunbeams through the windows and a glint
 * on glass. Still the same flat cartoon style with ink outlines, just lit.
 *
 * Every gradient and texture is made once and reused (each one is a small
 * texture on the graphics card), so redrawing a room costs nothing extra.
 * Gradients are "local": they stretch over whatever shape they fill.
 */

type Stops = [offset: number, color: string][];
const gradients = new Map<string, FillGradient>();

/** A smooth fill from one side of a shape to the other. */
export function gradient(dir: 'down' | 'up' | 'right' | 'left', stops: Stops): FillGradient {
  const key = `${dir}|${stops.map((s) => s.join(':')).join('|')}`;
  let g = gradients.get(key);
  if (!g) {
    const v = dir === 'down' || dir === 'up';
    const flip = dir === 'up' || dir === 'left';
    g = new FillGradient({
      type: 'linear',
      start: { x: v ? 0 : flip ? 1 : 0, y: v ? (flip ? 1 : 0) : 0 },
      end: { x: v ? 0 : flip ? 0 : 1, y: v ? (flip ? 0 : 1) : 0 },
      colorStops: stops.map(([offset, color]) => ({ offset, color })),
      textureSpace: 'local',
    });
    gradients.set(key, g);
  }
  return g;
}

/** A round glow, from the middle of a shape out to its edges. */
export function glowGradient(color: string, alpha: number): FillGradient {
  const key = `radial|${color}|${alpha}`;
  let g = gradients.get(key);
  if (!g) {
    const c = (a: number) => `rgba(${color},${a})`;
    g = new FillGradient({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: c(alpha) },
        { offset: 0.45, color: c(alpha * 0.55) },
        { offset: 1, color: c(0) },
      ],
      textureSpace: 'local',
    });
    gradients.set(key, g);
  }
  return g;
}

const patterns = new Map<string, FillPattern>();
/** A repeating texture, drawn once on a small canvas. */
function pattern(key: string, draw: (c: CanvasRenderingContext2D, size: number, rnd: () => number) => void, size = 128) {
  let p = patterns.get(key);
  if (!p) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size; // (a power of two, so it can repeat on every tablet)
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    draw(cv.getContext('2d')!, size, rnd);
    p = new FillPattern(Texture.from(cv), 'repeat');
    patterns.set(key, p);
  }
  return p;
}

/** Painted plaster: the faintest speckle, so walls aren't perfectly flat. */
const paintPattern = () =>
  pattern('paint', (c, n, rnd) => {
    for (let i = 0; i < 520; i++) {
      c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.06)';
      c.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
    }
  });

/** Carpet pile: lots of tiny light and dark flecks. */
const carpetPattern = () =>
  pattern('carpet', (c, n, rnd) => {
    for (let i = 0; i < 2600; i++) {
      const light = rnd() < 0.5;
      c.fillStyle = light ? `rgba(255,255,255,${0.05 + rnd() * 0.07})` : `rgba(0,0,0,${0.06 + rnd() * 0.08})`;
      c.fillRect(rnd() * n, rnd() * n, 1 + rnd(), 1 + rnd() * 2);
    }
  });

/** A fluffy rug: short soft strands every which way. */
const fluffPattern = () =>
  pattern('fluff', (c, n, rnd) => {
    c.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = rnd() * n, y = rnd() * n, a = rnd() * Math.PI * 2, l = 2 + rnd() * 4;
      c.strokeStyle = rnd() < 0.55 ? `rgba(255,255,255,${0.1 + rnd() * 0.12})` : `rgba(0,0,0,${0.06 + rnd() * 0.07})`;
      c.lineWidth = 1 + rnd() * 0.8;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      c.stroke();
    }
  });

// ---------------------------------------------------------------------------
// Walls and floors
// ---------------------------------------------------------------------------

/** Walls from x0 to x1 down to the floor at fy: a paint texture, darker up by the ceiling and down by the skirting. */
export function litWall(g: Graphics, x0: number, x1: number, fy: number) {
  g.rect(x0, 0, x1 - x0, fy).fill(paintPattern());
  g.rect(x0, 0, x1 - x0, fy).fill(
    gradient('down', [
      [0, 'rgba(20,20,40,0.13)'],
      [0.07, 'rgba(20,20,40,0.05)'],
      [0.28, 'rgba(255,255,255,0.05)'],
      [0.7, 'rgba(0,0,0,0)'],
      [1, 'rgba(20,20,40,0.09)'],
    ]),
  );
}

/** Where two walls meet: a soft shadow either side of the corner line. */
export function softCorner(g: Graphics, x: number, fy: number, width: number) {
  g.rect(x - width, 0, width, fy).fill(gradient('right', [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.09)']]));
  g.rect(x, 0, width, fy).fill(gradient('right', [[0, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0)']]));
  g.moveTo(x, 0).lineTo(x, fy).stroke({ width: 2, color: 0xc4c8ce });
}

/** Carpet from x0 to x1: its colour, pile texture, shade along the wall and towards the front, and a soft sheen in the middle. */
export function litCarpet(g: Graphics, x0: number, x1: number, fy: number, h: number, color: number) {
  g.rect(x0, fy, x1 - x0, h - fy).fill(color);
  g.rect(x0, fy, x1 - x0, h - fy).fill(carpetPattern());
  g.rect(x0, fy, x1 - x0, h - fy).fill(
    gradient('down', [
      [0, 'rgba(0,0,0,0.28)'],
      [0.12, 'rgba(0,0,0,0.08)'],
      [0.45, 'rgba(255,255,255,0.05)'],
      [1, 'rgba(0,0,0,0.16)'],
    ]),
  );
}

/** The skirting board along the bottom of the walls: lit on top, with a little shadow on the carpet. */
export function skirting(g: Graphics, x0: number, x1: number, fy: number) {
  g.rect(x0, fy + 6, x1 - x0, 10).fill(gradient('down', [[0, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]));
  g.rect(x0, fy - 6, x1 - x0, 12).fill(0xfbfbfc).stroke({ width: 3, color: 0x3a3a3a });
  g.rect(x0, fy - 4, x1 - x0, 3).fill({ color: 0xffffff, alpha: 0.9 });
  g.rect(x0, fy + 1, x1 - x0, 4).fill({ color: 0x000000, alpha: 0.06 });
}

// ---------------------------------------------------------------------------
// Light
// ---------------------------------------------------------------------------

/** A soft pool of light (a lamp on the wall, the glow round a window). `color` as "r,g,b". */
export function lightPool(g: Graphics, cx: number, cy: number, rx: number, ry: number, color = '255,244,214', alpha = 0.35) {
  g.ellipse(cx, cy, rx, ry).fill(glowGradient(color, alpha));
}

/**
 * Sunlight (or moonlight at night) slanting in through a window and down onto
 * the floor in front of it. Drawn into its own Graphics so it can fade with a
 * blind or curtains.
 */
export function sunbeam(g: Graphics, wx: number, wy: number, ww: number, wh: number, fy: number, h: number, night: boolean) {
  const c = night ? '200,215,255' : '255,240,200';
  const a = night ? 0.1 : 0.2;
  const bottom = h * 0.99;
  const slant = (bottom - (wy + wh)) * 0.55;
  // the beam through the air
  g.poly([wx + ww * 0.06, wy + wh * 0.2, wx + ww * 0.94, wy + wh * 0.2, wx + ww * 0.94 + slant, bottom, wx + ww * 0.06 + slant * 0.75, bottom]).fill(
    gradient('down', [
      [0, `rgba(${c},0)`],
      [0.25, `rgba(${c},${a * 0.6})`],
      [0.6, `rgba(${c},${a})`],
      [1, `rgba(${c},0)`],
    ]),
  );
  // and the patch of light where it lands on the floor
  const px = wx + ww / 2 + slant * 0.85, py = fy + (bottom - fy) * 0.62;
  lightPool(g, px, py, ww * 0.85, (bottom - fy) * 0.35, c, a * 1.1);
}

// ---------------------------------------------------------------------------
// Things on the walls and on the floor
// ---------------------------------------------------------------------------

/** A soft shadow behind something hanging on the wall (a frame, a shelf), a little down and to the right. */
export function hangShadow(g: Graphics, x: number, y: number, w: number, h: number, depth = 6) {
  for (let i = 3; i >= 1; i--) {
    const d = depth * (i / 3);
    g.roundRect(x + d * 0.6, y + d, w + d * 0.4, h + d * 0.2, 3 + d).fill({ color: 0x000000, alpha: 0.05 });
  }
}

/** A glint across glass or a shiny picture: two slanting streaks of light, inside the box. */
export function glint(g: Graphics, x: number, y: number, w: number, h: number, alpha = 0.22) {
  const streak = (a: number, b: number) =>
    g.poly([x + w * a, y + h, x + w * (a + b), y + h, x + w * Math.min(1, a + b + 0.45), y, x + w * Math.min(1, a + 0.45), y]);
  streak(0.08, 0.16).fill({ color: 0xffffff, alpha });
  streak(0.3, 0.05).fill({ color: 0xffffff, alpha: alpha * 0.8 });
}

/** Light and shade on the front of a piece of furniture: lit at the top, shaded towards the bottom and the right. */
export function shadeBox(g: Graphics, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h).fill(gradient('down', [[0, 'rgba(255,255,255,0.22)'], [0.35, 'rgba(255,255,255,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.14)']]));
  g.rect(x + w * 0.82, y, w * 0.18, h).fill(gradient('right', [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.1)']]));
}

/** A thin bright line along a top edge (a shelf, a desk, a sill). */
export function edgeHighlight(g: Graphics, x: number, y: number, w: number) {
  g.rect(x + 3, y + 2, w - 6, 2.5).fill({ color: 0xffffff, alpha: 0.75 });
}

/** A soft shadow on the floor under something standing on it. */
export function floorShadow(g: Graphics, x0: number, x1: number, fy: number, depth = 26) {
  const cx = (x0 + x1) / 2, rx = (x1 - x0) * 0.62;
  g.ellipse(cx, fy + depth * 0.25, rx, depth).fill(glowGradient('0,0,0', 0.3));
}

/** A fluffy rug texture over an ellipse, with a soft lit middle and a shadowy rim. */
export function fluffyRug(g: Graphics, cx: number, cy: number, rx: number, ry: number) {
  g.ellipse(cx, cy + ry * 0.12, rx * 1.03, ry * 1.1).fill(glowGradient('0,0,0', 0.25)); // its shadow
  return () => {
    g.ellipse(cx, cy, rx, ry).fill(fluffPattern());
    g.ellipse(cx - rx * 0.1, cy - ry * 0.15, rx * 0.75, ry * 0.65).fill(glowGradient('255,255,255', 0.18));
  };
}
