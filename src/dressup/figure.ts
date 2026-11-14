/**
 * The shared body shapes for dress-up (a grown man, a grown woman, a child)
 * and the little drawing helpers the clothes are made from: cel-shaded
 * outlined parts, smooth limbs, hands, trousers, shoes, robes, scarves and
 * hoods. No faces or hair here: a person's head is their own picture (made
 * privately, kept on the iPad); everything else is drawn from these.
 *
 * Coordinates: a 420 x 920 figure (feet on the ground at y = 896), drawn on
 * a canvas 980 tall with 50 extra on top (see dress.ts).
 */
export type Ctx = CanvasRenderingContext2D;
export type PathFn = (c: Ctx) => void;
export type Pt3 = [number, number, number];

export const W = 420;
export const INK = '#3a3a3a';
export const LW = 7;
export const CX = 210;
export const TAU = Math.PI * 2;

/** A colour mixed towards white (amt > 0) or black (amt < 0). */
export const sh = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
};

export interface ShapeOpts {
  /** A cel shadow: the part shifted by (dx, dy) shows the lit colour; the rest is darker by `amount`. */
  cel?: [number, number, number?];
  inside?: (c: Ctx) => void;
  line?: number;
}
/** A filled, outlined part with a cel shadow on its lower right (light from the top left). */
export function shape(c: Ctx, fn: PathFn, fill: string, o: ShapeOpts = {}) {
  c.beginPath();
  fn(c);
  c.fillStyle = o.cel ? sh(fill, o.cel[2] ?? -0.16) : fill;
  c.fill();
  if (o.cel || o.inside) {
    c.save();
    c.beginPath();
    fn(c);
    c.clip();
    if (o.cel) {
      c.save();
      c.translate(-o.cel[0], -o.cel[1]);
      c.beginPath();
      fn(c);
      c.fillStyle = fill;
      c.fill();
      c.restore();
    }
    o.inside?.(c);
    c.restore();
  }
  if (o.line !== 0) {
    c.beginPath();
    fn(c);
    c.lineWidth = o.line ?? LW;
    c.strokeStyle = INK;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }
}
/** Several parts drawn as one (one outline round the lot), with a shared cel shadow. */
export function group(c: Ctx, fns: PathFn[], fill: string, cel: [number, number, number] = [9, 7, -0.15], line = LW, inside?: (c: Ctx) => void) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const fn of fns) {
    c.beginPath();
    fn(c);
    c.lineWidth = line * 2;
    c.strokeStyle = INK;
    c.stroke();
  }
  for (const fn of fns) {
    c.beginPath();
    fn(c);
    c.fillStyle = sh(fill, cel[2]);
    c.fill();
  }
  for (const fn of fns) {
    c.save();
    c.beginPath();
    fn(c);
    c.clip();
    c.translate(-cel[0], -cel[1]);
    for (const g of fns) {
      c.beginPath();
      g(c);
      c.fillStyle = fill;
      c.fill();
    }
    c.restore();
  }
  if (inside) {
    for (const fn of fns) {
      c.save();
      c.beginPath();
      fn(c);
      c.clip();
      inside(c);
      c.restore();
    }
  }
}
export function stroke(c: Ctx, fn: PathFn, w: number, col: string, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  fn(c);
  c.lineWidth = w;
  c.strokeStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
  c.restore();
}
export function blob(c: Ctx, x: number, y: number, rx: number, ry: number, col: string, alpha = 1, rot = 0) {
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fillStyle = col;
  c.fill();
  c.restore();
}
/** A smooth limb along a centre line of [x, y, width] points (flat ends). */
export function limb(pts: Pt3[]): PathFn {
  const L: [number, number][] = [], R: [number, number][] = [];
  pts.forEach(([x, y, w], i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    L.push([x - (dy * w) / 2, y + (dx * w) / 2]);
    R.push([x + (dy * w) / 2, y - (dx * w) / 2]);
  });
  const through = (c: Ctx, p: [number, number][], first: boolean) => {
    if (first) c.moveTo(p[0][0], p[0][1]);
    else c.lineTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length - 1; i++) c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
    c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  };
  return (c) => {
    through(c, L, true);
    through(c, [...R].reverse(), false);
    c.closePath();
  };
}
export const line = (pts: [number, number][]): PathFn => (p) => pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
/** Folds where cloth bunches: [x0, y0, x1, y1, bend]. */
export function folds(p: Ctx, list: [number, number, number, number, number?][], col: string) {
  stroke(p, (q) => {
    for (const [x0, y0, x1, y1, bend] of list) {
      q.moveTo(x0, y0);
      q.quadraticCurveTo((x0 + x1) / 2 + (bend ?? 0), (y0 + y1) / 2, x1, y1);
    }
  }, 3, col);
}
/** Soft knit: very faint lines. */
export function knit(p: Ctx, top: number, bottom: number, alpha = 0.06) {
  stroke(p, (q) => {
    for (let y = top; y < bottom; y += 10) {
      q.moveTo(0, y);
      q.lineTo(W, y);
    }
  }, 2, '#ffffff', alpha);
}

// ------------------------------------------------------------------ body plans
export type PlanKind = 'man' | 'woman' | 'child';
export interface Plan {
  kind: PlanKind;
  top: number; chin: number; hw: number; neckW: number; sy: number; sh: number; hem: number; waist: number;
  crotch: number; knee: number; ankle: number; legX: number; legW: number; armW: number; k: number;
  hh: number; eyeY: number; eyeX: number; eyeW: number; browY: number; noseY: number; mouthY: number; earY: number;
}
/** Where everything goes, for a grown man, a woman, and a child (a child is drawn to fill the picture too: the app makes children smaller). */
export function plan(kind: PlanKind): Plan {
  const b =
    kind === 'child'
      ? { top: 70, chin: 300, hw: 92, neckW: 22, sy: 332, sh: 80, hem: 596, waist: 590, crotch: 682, knee: 772, ankle: 852, legX: 35, legW: 44, armW: 38, k: 0.86 }
      : kind === 'woman'
        ? { top: 58, chin: 236, hw: 68, neckW: 23, sy: 256, sh: 86, hem: 520, waist: 500, crotch: 636, knee: 728, ankle: 846, legX: 38, legW: 50, armW: 40, k: 0.92 }
        : { top: 48, chin: 236, hw: 74, neckW: 27, sy: 264, sh: 98, hem: 522, waist: 500, crotch: 640, knee: 728, ankle: 846, legX: 45, legW: 58, armW: 46, k: 1 };
  const hh = b.chin - b.top;
  const eyeY = b.top + hh * (kind === 'child' ? 0.56 : 0.52);
  const eyeX = b.hw * (kind === 'child' ? 0.4 : 0.42);
  return {
    kind, ...b, hh, eyeY, eyeX,
    eyeW: b.hw * (kind === 'child' ? 0.25 : 0.235),
    browY: eyeY - b.hw * 0.37,
    noseY: b.top + hh * 0.72,
    mouthY: b.top + hh * (kind === 'child' ? 0.84 : 0.83),
    earY: eyeY + hh * 0.05,
  };
}
export const headCY = (P: Plan) => P.top + P.hh * 0.5;
/** Arms hanging at the sides: shoulder to wrist. */
export function hangPts(P: Plan, s: number): Pt3[] {
  const x = (dx: number) => CX + s * dx;
  if (P.kind === 'child') return [[x(P.sh - 6), P.sy + 22, P.armW + 2], [x(P.sh + 3), P.sy + 84, P.armW - 1], [x(P.sh + 9), P.sy + 152, P.armW - 4], [x(P.sh + 12), P.sy + 218, P.armW - 6], [x(P.sh + 12), P.sy + 256, P.armW - 8]];
  return [[x(P.sh - 6), P.sy + 24, P.armW + 2], [x(P.sh + 4), P.sy + 92, P.armW], [x(P.sh + 11), P.sy + 172, P.armW - 4], [x(P.sh + 15), P.sy + 242, P.armW - 8], [x(P.sh + 15), P.sy + 290, P.armW - 11]];
}
export const handAt = (pts: Pt3[], d = 34): [number, number] => {
  const [x, y] = pts[pts.length - 1];
  return [x, y + d];
};
export const widen = (pts: Pt3[], d: number): Pt3[] => pts.map(([x, y, w]) => [x, y, w + d]);
/** The outline of a top (from the shoulders to `hem`), for drawing with its sleeves as one. */
export function topPath(P: Plan, o: { hem?: number; flare?: number; neckline?: number; tummy?: number } = {}): PathFn {
  const hem = o.hem ?? P.hem, flare = o.flare ?? 0, nl = o.neckline ?? 14;
  return (p) => {
    p.moveTo(CX - P.neckW - 10, P.sy - 12);
    p.quadraticCurveTo(CX - P.sh + 14, P.sy - 8, CX - P.sh - 2, P.sy + 18);
    p.bezierCurveTo(CX - P.sh + 2, P.sy + 110, CX - P.sh + 10 - (o.tummy ?? 0), P.waist - 120, CX - P.sh + 8 - flare, hem);
    p.quadraticCurveTo(CX, hem + 10, CX + P.sh - 8 + flare, hem);
    p.bezierCurveTo(CX + P.sh - 10 + (o.tummy ?? 0), P.waist - 120, CX + P.sh - 2, P.sy + 110, CX + P.sh + 2, P.sy + 18);
    p.quadraticCurveTo(CX + P.sh - 14, P.sy - 8, CX + P.neckW + 10, P.sy - 12);
    p.quadraticCurveTo(CX, P.sy + nl, CX - P.neckW - 10, P.sy - 12);
    p.closePath();
  };
}
/** The line between an arm and the body (the inside edge of a sleeve), from the armpit down. */
export function armEdge(c: Ctx, pts: Pt3[], s: number, col: string, from = 1, to = pts.length) {
  stroke(c, (p) => {
    pts.slice(from, to).forEach(([x, y, w], i) => {
      const ex = x - s * (w / 2 + 4);
      if (i) p.lineTo(ex, y);
      else p.moveTo(ex, y + 8);
    });
  }, 4, col);
}
/** A top and its sleeves as one piece of clothing (one outline round the lot). `sleeveTo`: how far down the arm (points). */
export function dressed(c: Ctx, P: Plan, col: string, o: { hem?: number; flare?: number; neckline?: number; tummy?: number; loose?: number; cel?: [number, number, number]; inside?: (c: Ctx) => void; sleeve?: (pts: Pt3[]) => Pt3[] } = {}) {
  const arms = [hangPts(P, -1), hangPts(P, 1)].map((pts) => (o.sleeve ? o.sleeve(pts) : pts));
  const loose = o.loose ?? 8;
  group(c, [topPath(P, o), ...arms.map((pts) => limb(widen(pts, loose)))], col, o.cel ?? [12, 8, -0.18], LW, o.inside);
  arms.forEach((pts, i) => armEdge(c, widen(pts, loose), i ? 1 : -1, sh(col, -0.4), 1, pts.length - 1));
  return arms;
}
/** A band round the end of a sleeve. */
export function cuff(c: Ctx, pts: Pt3[], col: string, loose = 8, h = 20) {
  const [x, y, w] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
  const a = Math.atan2(y - py, x - px);
  c.save();
  c.translate(x, y);
  c.rotate(a - Math.PI / 2);
  shape(c, (p) => p.roundRect(-(w + loose) / 2 - 1, -h + 2, w + loose + 2, h, 6), col, { cel: [3, 2, -0.15], line: 5 });
  c.restore();
}
/** Short sleeves: the arm only as far as `t` (0..1) of the way from the shoulder to the elbow and on. */
export const shortSleeve = (t = 0.55) => (pts: Pt3[]): Pt3[] => {
  const a = pts[1], b = pts[2];
  return [pts[0], a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2]]];
};

// ------------------------------------------------------------------ the body (skin), and hands
/** A relaxed hand hanging down; the thumb lies along the side towards the body. */
export function hangHand(c: Ctx, x: number, y: number, s: number, skin: string, k = 1) {
  const t = -s;
  shape(c, (p) => {
    p.moveTo(x - 14 * k, y - 28 * k);
    p.bezierCurveTo(x - 22 * k, y - 8 * k, x - 22 * k, y + 18 * k, x - 14 * k, y + 31 * k);
    p.quadraticCurveTo(x, y + 43 * k, x + 14 * k, y + 31 * k);
    p.bezierCurveTo(x + 22 * k, y + 18 * k, x + 22 * k, y - 8 * k, x + 14 * k, y - 28 * k);
    p.closePath();
  }, skin, { cel: [4, 4, -0.14], line: 5.5 });
  for (const dx of [-7, 0, 7]) stroke(c, (p) => {
    p.moveTo(x - t * 4 * k + dx * k, y + 36 * k);
    p.lineTo(x - t * 4 * k + dx * k, y + 20 * k);
  }, 3, sh(skin, -0.38));
  shape(c, (p) => {
    p.moveTo(x + t * 6 * k, y - 18 * k);
    p.quadraticCurveTo(x + t * 24 * k, y - 8 * k, x + t * 21 * k, y + 12 * k);
    p.quadraticCurveTo(x + t * 18 * k, y + 22 * k, x + t * 10 * k, y + 15 * k);
    p.quadraticCurveTo(x + t * 6 * k, y, x + t * 6 * k, y - 18 * k);
    p.closePath();
  }, skin, { cel: [3, 3, -0.12], line: 4.5 });
}
export const legPts = (P: Plan, s: number): Pt3[] => [[CX + s * P.legX, P.waist + 10, P.legW + 6], [CX + s * P.legX, P.knee, P.legW - 2], [CX + s * P.legX, P.ankle + 4, P.legW - 14]];
/** A bare foot (under the shoes), toe out to the side `s`. */
export function bareFoot(c: Ctx, P: Plan, s: number, skin: string) {
  const x = CX + s * P.legX, k = P.kind === 'child' ? 0.85 : 1, M = (dx: number) => x + s * dx * k;
  shape(c, (p) => {
    p.moveTo(M(-14), P.ankle - 8);
    p.lineTo(M(14), P.ankle - 8);
    p.quadraticCurveTo(M(40), 862, M(44), 882);
    p.quadraticCurveTo(M(44), 894, M(32), 894);
    p.lineTo(M(-14), 894);
    p.quadraticCurveTo(M(-22), 892, M(-20), 876);
    p.closePath();
  }, skin, { cel: [s * -4, 3, -0.15], line: 5 });
  stroke(c, (p) => {
    for (let i = 0; i < 4; i++) {
      p.moveTo(M(22 + i * 6), 884 - i);
      p.lineTo(M(22 + i * 6), 892 - i);
    }
  }, 2.2, sh(skin, -0.35));
}
/** The skin underneath: legs and bare feet, the body and arms in one, the neck (the hands come later, over the sleeves). */
export function drawSkin(c: Ctx, P: Plan, skin: string) {
  group(c, [limb(legPts(P, -1)), limb(legPts(P, 1))], skin, [7, 0, -0.15]);
  for (const s of [-1, 1]) {
    const [x, y] = legPts(P, s)[1];
    stroke(c, (p) => {
      p.moveTo(x - 12, y - 4);
      p.quadraticCurveTo(x, y + 6, x + 12, y - 4);
    }, 2.6, sh(skin, -0.28));
    bareFoot(c, P, s, skin);
  }
  const L = hangPts(P, -1), R = hangPts(P, 1);
  group(c, [topPath(P, { hem: P.waist + 30 }), limb(L), limb(R)], skin, [8, 6, -0.15]);
  for (const pts of [L, R]) {
    const [x, y] = pts[2];
    stroke(c, (p) => {
      p.moveTo(x - 10, y + 2);
      p.quadraticCurveTo(x, y + 8, x + 10, y + 2);
    }, 2.4, sh(skin, -0.28));
  }
  neck(c, P, skin);
}
export function drawHands(c: Ctx, P: Plan, col: string) {
  for (const s of [-1, 1]) hangHand(c, ...handAt(hangPts(P, s)), s, col, P.k * (P.kind === 'man' ? 1.05 : 1));
}
export function neck(c: Ctx, P: Plan, skin: string) {
  shape(c, (p) => {
    p.moveTo(CX - P.neckW, P.chin - 40);
    p.lineTo(CX - P.neckW - 2, P.sy + 4);
    p.quadraticCurveTo(CX, P.sy + 22, CX + P.neckW + 2, P.sy + 4);
    p.lineTo(CX + P.neckW, P.chin - 40);
    p.closePath();
  }, skin, {
    cel: [6, 0, -0.15],
    inside: (p) => blob(p, CX, P.chin + 2, P.neckW * 1.2, 14, sh(skin, -0.22), 0.8),
  });
}
/** A neckline drawn over the neck (a crew neck, a sweatshirt's band...). */
export function neckline(c: Ctx, P: Plan, col: string, w = 5, dip = 20, wide = 8) {
  const path: PathFn = (p) => {
    p.moveTo(CX - P.neckW - wide, P.sy - 10);
    p.quadraticCurveTo(CX, P.sy + dip, CX + P.neckW + wide, P.sy - 10);
  };
  stroke(c, path, w + 4, INK);
  stroke(c, path, w, col);
}

// ------------------------------------------------------------------ legs and feet
/** Trousers: from the waist to `hem` (the ankle for long ones), with the gap between the legs. */
export function trousers(c: Ctx, P: Plan, col: string, o: { hem?: number; top?: number; wide?: number; hips?: number; dark?: number; inside?: (p: Ctx, t: { out0: number; outK: number; inn: number; hem: number; top: number }) => void } = {}) {
  const hem = o.hem ?? P.ankle, top = o.top ?? P.waist, wide = o.wide ?? 0;
  const out0 = P.sh - (P.kind === 'child' ? 8 : 6) + (o.hips ?? 0), outK = P.legX + P.legW * 0.55 + wide, inn = P.legX - P.legW * 0.5 - wide * 0.3;
  const kneeY = Math.min(P.knee, hem - 10);
  const path: PathFn = (p) => {
    p.moveTo(CX - out0, top);
    p.lineTo(CX + out0, top);
    p.quadraticCurveTo(CX + out0 + 2, (top + kneeY) / 2, CX + outK + 4, kneeY);
    p.lineTo(CX + outK, hem);
    p.lineTo(CX + Math.max(6, inn), hem);
    p.lineTo(CX + 5, P.crotch);
    p.lineTo(CX - 5, P.crotch);
    p.lineTo(CX - Math.max(6, inn), hem);
    p.lineTo(CX - outK, hem);
    p.lineTo(CX - outK - 4, kneeY);
    p.quadraticCurveTo(CX - out0 - 2, (top + kneeY) / 2, CX - out0, top);
    p.closePath();
  };
  const t = { out0, outK, inn, hem, top };
  shape(c, path, col, { cel: [10, 6, o.dark ?? -0.22], inside: o.inside ? (p) => o.inside!(p, t) : undefined });
  return t;
}
/** A trainer, toe out to the side `s`. */
export function trainer(c: Ctx, x: number, s: number, col: string, o: { k?: number; top?: number; sole?: string; stripe?: string; lace?: string; inside?: (p: Ctx) => void } = {}) {
  const k = o.k ?? 1, top = o.top ?? 840;
  const M = (dx: number) => x + s * dx * k;
  shape(c, (p) => {
    p.moveTo(M(-22), 876);
    p.quadraticCurveTo(M(-24), top, M(-12), top - 2);
    p.lineTo(M(14), top - 2);
    p.quadraticCurveTo(M(26), top, M(34), 858);
    p.quadraticCurveTo(M(52), 868, M(52), 884);
    p.quadraticCurveTo(M(52), 896, M(40), 896);
    p.lineTo(M(-20), 896);
    p.quadraticCurveTo(M(-30), 896, M(-29), 884);
    p.closePath();
  }, col, {
    cel: [s * -5, 4, -0.28],
    inside: (p) => {
      p.fillStyle = o.sole ?? '#eef0f2';
      p.fillRect(0, 880, W, 20);
      p.fillStyle = sh(col, 0.22);
      p.fillRect(0, 876, W, 4);
      o.inside?.(p);
      if (o.stripe) stroke(p, (q) => {
        q.moveTo(M(-14), 870);
        q.quadraticCurveTo(M(6), 862, M(24), 872);
      }, 5, o.stripe);
    },
  });
  for (const y of [top + 8, top + 17, top + 26]) stroke(c, (p) => {
    p.moveTo(M(-6), y);
    p.lineTo(M(18), y + 2);
  }, 3.2, o.lace ?? '#a3abb4');
}
/** A foot in a sock, toe out to the side `s`. */
export function sockFoot(c: Ctx, x: number, s: number, col: string, o: { k?: number; toe?: string; stripes?: [number, number][]; stripeCol?: string } = {}) {
  const k = o.k ?? 1, M = (dx: number) => x + s * dx * k;
  shape(c, (p) => {
    p.moveTo(M(-20), 800);
    p.lineTo(M(18), 800);
    p.lineTo(M(20), 860);
    p.quadraticCurveTo(M(48), 864, M(52), 882);
    p.quadraticCurveTo(M(54), 897, M(36), 897);
    p.lineTo(M(-16), 897);
    p.quadraticCurveTo(M(-28), 896, M(-24), 878);
    p.closePath();
  }, col, {
    cel: [s * -5, 4, -0.22],
    inside: (p) => {
      if (o.toe) {
        blob(p, M(42), 888, 18, 14, o.toe);
        blob(p, M(-20), 890, 10, 12, o.toe);
      }
      stroke(p, (q) => {
        for (let dx = -18; dx <= 18; dx += 6) {
          q.moveTo(M(dx), 802);
          q.lineTo(M(dx), 822);
        }
      }, 2, sh(col, -0.25));
      if (o.stripes) for (const [y, h] of o.stripes) {
        p.fillStyle = o.stripeCol ?? '#ffffff';
        p.fillRect(0, y, W, h);
      }
      stroke(p, (q) => {
        q.moveTo(M(-18), 836);
        q.quadraticCurveTo(M(0), 842, M(18), 834);
      }, 2.5, sh(col, -0.3));
    },
  });
}

// ------------------------------------------------------------------ robes, scarves, hoods
/** A long wizard's robe, open down the front. */
export function robe(c: Ctx, P: Plan, col: string) {
  const hem = P.ankle + 8, gap = P.kind === 'child' ? 24 : 30;
  for (const s of [-1, 1]) {
    const X = (dx: number) => CX + s * dx;
    shape(c, (p) => {
      p.moveTo(X(P.neckW + 6), P.sy - 16);
      p.quadraticCurveTo(X(P.sh - 6), P.sy - 8, X(P.sh + 8), P.sy + 20);
      p.bezierCurveTo(X(P.sh + 14), P.sy + 200, X(P.sh + 22), hem - 220, X(P.sh + 36), hem);
      p.quadraticCurveTo(X((P.sh + gap) / 2 + 10), hem + 10, X(gap + 6), hem + 2);
      p.quadraticCurveTo(X(gap - 6), (P.sy + hem) / 2, X(gap - 10), P.sy + 60);
      p.quadraticCurveTo(X(gap - 6), P.sy + 10, X(P.neckW + 6), P.sy - 16);
      p.closePath();
    }, col, {
      cel: [s < 0 ? 8 : 14, 6, -0.25],
      inside: (p) => {
        stroke(p, (q) => {
          for (const [dx, y0] of [[P.sh - 20, P.sy + 120], [P.sh * 0.62, P.sy + 260], [gap + 20, P.sy + 200]]) {
            q.moveTo(X(dx), y0);
            q.quadraticCurveTo(X(dx + 6), (y0 + hem) / 2, X(dx + 14), hem - 6);
          }
        }, 3, sh(col, 0.32));
        blob(p, X(P.sh - 24), P.sy + 26, 34, 14, sh(col, 0.4), 0.5);
      },
    });
  }
  // wide sleeves, wider towards the hands
  const arms = [hangPts(P, -1), hangPts(P, 1)].map((pts) => pts.map(([x, y, w], i): Pt3 => [x, y, w + 10 + i * 6]));
  group(c, arms.map(limb), col, [8, 6, -0.25], LW);
  arms.forEach((pts, i) => armEdge(c, pts, i ? 1 : -1, sh(col, 0.25), 1, 4));
}
/** The robe's hood, down, bunched behind the neck (seen above the shoulders). */
export function robeHood(c: Ctx, P: Plan, col: string) {
  shape(c, (p) => {
    p.moveTo(CX - P.sh + 6, P.sy + 18);
    p.quadraticCurveTo(CX - P.sh + 8, P.sy - 50, CX - P.neckW - 20, P.sy - 56);
    p.quadraticCurveTo(CX, P.sy - 64, CX + P.neckW + 20, P.sy - 56);
    p.quadraticCurveTo(CX + P.sh - 8, P.sy - 50, CX + P.sh - 6, P.sy + 18);
    p.closePath();
  }, col, { cel: [8, 6, -0.25] });
}
/** A long striped scarf: round the neck, the two ends hanging down the front. */
export function scarf(c: Ctx, P: Plan, cols: string[]) {
  const y = P.sy - 8, stripe = 30, gap = 34, wd = P.kind === 'child' ? 40 : 46;
  const lenL = P.kind === 'child' ? 240 : 300, lenR = P.kind === 'child' ? 200 : 250;
  const stripes = (p: Ctx, horizontal = true) => {
    for (let i = -4; i < 30; i++) {
      p.fillStyle = cols[((i % cols.length) + cols.length) % cols.length];
      if (horizontal) p.fillRect(0, y - 40 + i * stripe, W, stripe);
      else p.fillRect(CX - 140 + i * stripe, 0, stripe, 980);
    }
  };
  const end = (x0: number, x1: number, len: number, tilt: number) => {
    shape(c, (p) => {
      p.moveTo(x0 - wd / 2, y + 6);
      p.quadraticCurveTo(x0 - wd / 2 + tilt * 0.4, y + len * 0.5, x1 - wd / 2, y + len);
      p.lineTo(x1 + wd / 2, y + len + 4);
      p.quadraticCurveTo(x0 + wd / 2 + tilt * 0.4, y + len * 0.5, x0 + wd / 2, y + 6);
      p.closePath();
    }, cols[0], { cel: [6, 2, -0.15], inside: (p) => {
      stripes(p);
      blob(p, x1 + wd * 0.3, y + len * 0.5, wd * 0.25, len * 0.5, '#000', 0.12);
    } });
    const fringe: PathFn = (p) => {
      for (let i = 0; i < 6; i++) {
        const fx = x1 - wd / 2 + 4 + (i * (wd - 8)) / 5;
        p.moveTo(fx, y + len + 2 + (i / 5) * 4);
        p.lineTo(fx + 1, y + len + 18 + (i / 5) * 4);
      }
    };
    stroke(c, fringe, 7, INK);
    stroke(c, fringe, 3.5, cols[cols.length - 1]);
  };
  end(CX - gap, CX - gap - 8, lenL, -6);
  end(CX + gap + 4, CX + gap + 12, lenR, 6);
  shape(c, (p) => {
    p.moveTo(CX - P.neckW - 30, y - 22);
    p.quadraticCurveTo(CX, y + 14, CX + P.neckW + 30, y - 22);
    p.lineTo(CX + P.neckW + 34, y + 10);
    p.quadraticCurveTo(CX, y + 46, CX - P.neckW - 34, y + 10);
    p.closePath();
  }, cols[0], { cel: [4, 4, -0.18], inside: (p) => stripes(p, false) });
}
const hoodOutline = (P: Plan, m: number) => (p: Ctx) => {
  p.moveTo(CX - P.hw * m, P.chin + 26);
  p.bezierCurveTo(CX - P.hw * (m + 0.12), P.top + P.hh * 0.2, CX - P.hw * 0.8, P.top - P.hh * 0.24, CX, P.top - P.hh * 0.24);
  p.bezierCurveTo(CX + P.hw * 0.8, P.top - P.hh * 0.24, CX + P.hw * (m + 0.12), P.top + P.hh * 0.2, CX + P.hw * m, P.chin + 26);
};
/** A hood up round the face: the back of it (draw before the head). */
export function hoodBack(c: Ctx, P: Plan, col: string, m = 1.32) {
  shape(c, (p) => {
    hoodOutline(P, m)(p);
    p.quadraticCurveTo(CX, P.chin + 60, CX - P.hw * m, P.chin + 26);
    p.closePath();
  }, col, { cel: [10, 6, -0.25] });
}
/** The front edge of a hood, framing the face (draw after the face and hair). */
export function hoodRim(c: Ctx, P: Plan, col: string, o: { m?: number; open?: number; openH?: number; openY?: number } = {}) {
  const m = o.m ?? 1.32, ow = P.hw * (o.open ?? 1.04), oh = P.hh * (o.openH ?? 0.62), oy = P.eyeY + P.hh * (o.openY ?? 0.07);
  shape(c, (p) => {
    hoodOutline(P, m)(p);
    p.quadraticCurveTo(CX + P.hw * 0.9, P.chin + 50, CX + P.hw * 0.6, P.chin + 30);
    p.lineTo(CX + ow * 0.62, oy + oh * 0.82);
    p.ellipse(CX, oy, ow, oh, 0, Math.PI * 0.32, Math.PI * 0.68, true);
    p.lineTo(CX - P.hw * 0.6, P.chin + 30);
    p.quadraticCurveTo(CX - P.hw * 0.9, P.chin + 50, CX - P.hw * m, P.chin + 26);
    p.closePath();
  }, col, {
    cel: [8, 6, -0.2],
    inside: (p) => stroke(p, (q) => q.ellipse(CX, oy, ow + 16, oh + 14, 0, Math.PI * 0.85, Math.PI * 2.15), 4, sh(col, -0.3)),
  });
}
