import { ShapePath } from 'pixi.js';

/**
 * Small fixes to PixiJS, set up before anything is drawn.
 *
 * No doubled-up points in lines: when a line (or a shape's outline) has the
 * same point twice in a row, Pixi's line builder divides by a zero length
 * and makes "not a number" corners. That happens all over the drawing code,
 * mostly from `g.moveTo(cx - r, cy).arc(cx, cy, r, Math.PI, 0)` (the arc adds
 * its first point again), from zero-size arcs while something grows, and
 * from curves that start where they are. Apple's GPUs quietly skip the
 * broken corners; others (the kids' Amazon tablet) draw them as long thin
 * streaks across the room. So every line drops a point that's the same as
 * the one before it before Pixi builds it.
 */
const SAME = 1e-3; // closer than this (in pixels) is the same point

/** The points without any that sit on the one before (the same array if there are none). */
function withoutDoubles(p: number[]): number[] {
  let found = false;
  for (let i = 2; i + 1 < p.length; i += 2) {
    if (Math.abs(p[i] - p[i - 2]) < SAME && Math.abs(p[i + 1] - p[i - 1]) < SAME) {
      found = true;
      break;
    }
  }
  if (!found) return p;
  const out = [p[0], p[1]];
  for (let i = 2; i + 1 < p.length; i += 2) {
    const n = out.length;
    if (Math.abs(p[i] - out[n - 2]) < SAME && Math.abs(p[i + 1] - out[n - 1]) < SAME) continue;
    out.push(p[i], p[i + 1]);
  }
  return out;
}

type Poly = { type?: string; points: number[] };
const proto = ShapePath.prototype as unknown as {
  endPoly: (closePath?: boolean) => unknown;
  drawShape: (shape: unknown, matrix?: unknown) => unknown;
  _currentPoly: Poly | null;
};

// lines built up with moveTo / lineTo / arc / curves
const endPoly = proto.endPoly;
proto.endPoly = function (this: typeof proto, closePath?: boolean) {
  const poly = this._currentPoly;
  if (poly) poly.points = withoutDoubles(poly.points);
  return endPoly.call(this, closePath);
};

// shapes given as a list of points (g.poly)
const drawShape = proto.drawShape;
proto.drawShape = function (this: typeof proto, shape: unknown, matrix?: unknown) {
  const s = shape as Poly | undefined;
  if (s?.type === 'polygon' && Array.isArray(s.points)) s.points = withoutDoubles(s.points); // (a new array: the caller's is left alone)
  return drawShape.call(this, shape, matrix);
};
