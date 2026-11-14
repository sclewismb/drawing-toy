import { CX, blob, cuff, dressed, folds, INK, neckline, sh, shape, shortSleeve, stroke, TAU, trousers, W, type Ctx, type Plan } from '../figure';
import type { Garment } from '../types';

/** Dresses (instead of a top and bottoms): a red maxi, a party dress, a princess gown, a sundress, dungarees, pyjamas... */
const between = (a: number, b: number, t: number) => a + (b - a) * t;
type Pattern = (p: Ctx, P: Plan) => void;
type Sleeves = 'none' | 'short' | 'puff' | 'long';

/** A sleeveless bodice (round or V neck). */
function bodice(c: Ctx, P: Plan, col: string, neck: 'round' | 'v', pattern?: Pattern) {
  const a = P.sh * 0.42, b = P.sh * 0.74, dip = neck === 'v' ? P.sy + (P.waist - P.sy) * 0.42 : P.sy + (P.waist - P.sy) * 0.18;
  shape(c, (p) => {
    p.moveTo(CX - b, P.sy + 2);
    p.lineTo(CX - a, P.sy + 2);
    if (neck === 'v') p.lineTo(CX, dip);
    else p.quadraticCurveTo(CX, dip + 20, CX + a, P.sy + 2);
    if (neck === 'v') p.lineTo(CX + a, P.sy + 2);
    p.lineTo(CX + b, P.sy + 2);
    p.quadraticCurveTo(CX + P.sh - 8, P.sy + 60, CX + P.sh - 12, P.sy + 120);
    p.quadraticCurveTo(CX + P.sh - 8, P.waist - 60, CX + P.sh - 12, P.waist + 6);
    p.lineTo(CX - P.sh + 12, P.waist + 6);
    p.quadraticCurveTo(CX - P.sh + 8, P.waist - 60, CX - P.sh + 12, P.sy + 120);
    p.quadraticCurveTo(CX - P.sh + 8, P.sy + 60, CX - b, P.sy + 2);
    p.closePath();
  }, col, { cel: [10, 7, -0.18], inside: (p) => pattern?.(p, P) });
}
function dress(id: string, col: string, o: { len: 'mini' | 'knee' | 'maxi'; sleeves: Sleeves; neck?: 'round' | 'v'; pattern?: Pattern; sash?: string; collar?: string; flare?: number; seam?: boolean }): Garment {
  const hemOf = (P: Plan) => (o.len === 'mini' ? between(P.crotch, P.knee, 0.3) : o.len === 'knee' ? between(P.crotch, P.knee, 0.85) : P.ankle - 4);
  return {
    id, slot: 'dress',
    legs(c, P) {
      const top = P.waist - 6, hem = hemOf(P), w0 = P.sh - 10, w1 = P.sh + (o.flare ?? (o.len === 'maxi' ? 46 : 34));
      shape(c, (p) => {
        p.moveTo(CX - w0, top);
        p.lineTo(CX + w0, top);
        p.quadraticCurveTo(CX + w1 - 18, (top + hem) / 2, CX + w1, hem);
        p.quadraticCurveTo(CX, hem + 14, CX - w1, hem);
        p.quadraticCurveTo(CX - w1 + 18, (top + hem) / 2, CX - w0, top);
        p.closePath();
      }, col, { cel: [10, 6, -0.2], inside: (p) => {
        o.pattern?.(p, P);
        folds(p, [[CX - 40, top + 60, CX - 56, hem - 4, -4], [CX + 40, top + 60, CX + 56, hem - 4, 4], [CX, top + 40, CX, hem - 2, 0]], sh(col, -0.22));
      } });
    },
    body(c, P) {
      if (o.sleeves === 'none') bodice(c, P, col, o.neck ?? 'round', o.pattern);
      else {
        const sleeve = o.sleeves === 'long' ? undefined : shortSleeve(o.sleeves === 'puff' ? 0.4 : 0.5);
        const arms = dressed(c, P, col, { hem: P.waist + 6, loose: o.sleeves === 'puff' ? 30 : 14, sleeve, inside: (p) => o.pattern?.(p, P) });
        for (const pts of arms) {
          if (o.sleeves === 'long') cuff(c, pts, sh(col, -0.08));
          else {
            const [x, y, w] = pts[pts.length - 1];
            shape(c, (p) => p.roundRect(x - w / 2 - 14, y - 8, w + 28, 12, 5), sh(col, -0.1), { line: 4 });
          }
        }
        if (o.collar) for (const s of [-1, 1]) shape(c, (p) => p.ellipse(CX + s * 20, P.sy + 4, 22, 13, s * 0.4, 0, TAU), o.collar!, { line: 4 });
        else neckline(c, P, sh(col, -0.15), 6, 16);
      }
      if (o.seam) stroke(c, (p) => {
        p.moveTo(CX, P.sy + (P.waist - P.sy) * 0.42);
        p.lineTo(CX, P.ankle - 8);
      }, 3, sh(col, -0.3));
    },
    waist(c, P) {
      if (!o.sash) return;
      shape(c, (p) => p.roundRect(CX - P.sh + 10, P.waist - 14, (P.sh - 10) * 2, 20, 8), o.sash, { line: 4.5 });
      for (const s of [-1, 1]) shape(c, (p) => {
        p.moveTo(CX + 40, P.waist - 4);
        p.quadraticCurveTo(CX + 40 + s * 30, P.waist - 30, CX + 40 + s * 34, P.waist + 6);
        p.closePath();
      }, o.sash, { line: 4 });
      shape(c, (p) => p.arc(CX + 40, P.waist - 4, 7, 0, TAU), sh(o.sash, -0.1), { line: 3.5 });
    },
  };
}
const flowers = (cols: string[]): Pattern => (p, P) => {
  for (let y = P.sy + 40, row = 0; y < P.ankle; y += 56, row++) for (let x = 50 + (row % 2) * 30; x < W - 30; x += 60) {
    for (let k = 0; k < 5; k++) blob(p, x + Math.cos(k * 1.26) * 7, y + Math.sin(k * 1.26) * 7, 6, 6, cols[(row + k) % cols.length]);
    blob(p, x, y, 3.5, 3.5, '#ffd166');
  }
};
const sparkle = (p: Ctx, P: Plan) => {
  for (let i = 0; i < 90; i++) blob(p, 40 + ((i * 41) % 340), P.sy + ((i * 67) % (P.ankle - P.sy)), 3, 3, i % 3 ? '#ffffff' : '#ffd166', 0.9);
};
const hoops = (cols: string[]): Pattern => (p, P) => {
  for (let y = P.waist, i = 0; y < P.ankle; y += 34, i++) {
    p.fillStyle = cols[i % cols.length];
    p.fillRect(0, y, W, 34);
  }
};
const gingham = (col: string): Pattern => (p) => {
  p.save();
  p.globalAlpha = 0.45;
  p.fillStyle = col;
  for (let x = 0; x < W; x += 24) p.fillRect(x, 0, 12, 980);
  for (let y = 0; y < 980; y += 24) p.fillRect(0, y, W, 12);
  p.restore();
};

/** Dungarees over a white T-shirt. */
const dungarees: Garment = {
  id: 'dungarees', slot: 'dress',
  legs(c, P) {
    trousers(c, P, '#5b83b8', { inside: (p) => folds(p, [[CX - P.legX - 12, P.knee - 10, CX - P.legX + 10, P.knee], [CX + P.legX + 12, P.knee - 10, CX + P.legX - 10, P.knee]], '#46699a') });
  },
  body(c, P) {
    const arms = dressed(c, P, '#f6f6f2', { hem: P.waist + 10, loose: 14, sleeve: shortSleeve(0.5) });
    for (const pts of arms) {
      const [x, y] = pts[pts.length - 1];
      stroke(c, (p) => {
        p.moveTo(x - 22, y - 4);
        p.quadraticCurveTo(x, y + 6, x + 22, y - 4);
      }, 3, '#d6d6d0');
    }
    neckline(c, P, '#e6e6e0', 5, 16);
    const bib = P.sy + (P.waist - P.sy) * 0.35;
    shape(c, (p) => {
      p.moveTo(CX - P.sh * 0.5, bib);
      p.lineTo(CX + P.sh * 0.5, bib);
      p.lineTo(CX + P.sh * 0.56, P.waist + 14);
      p.lineTo(CX - P.sh * 0.56, P.waist + 14);
      p.closePath();
    }, '#5b83b8', { cel: [4, 4, -0.18], inside: (p) => shape(p, (q) => q.roundRect(CX - 24, bib + 22, 48, 36, 6), '#4f76ab', { line: 3.5 }) });
    for (const s of [-1, 1]) {
      stroke(c, (p) => {
        p.moveTo(CX + s * P.sh * 0.42, bib + 4);
        p.lineTo(CX + s * P.sh * 0.62, P.sy - 6);
      }, 17, INK);
      stroke(c, (p) => {
        p.moveTo(CX + s * P.sh * 0.42, bib + 4);
        p.lineTo(CX + s * P.sh * 0.62, P.sy - 6);
      }, 11, '#5b83b8');
      shape(c, (p) => p.arc(CX + s * P.sh * 0.44, bib + 8, 6, 0, TAU), '#d9b45a', { line: 2.5 });
    }
  },
};
/** Star pyjamas: a long-sleeved top and long bottoms. */
const pyjamas: Garment = {
  id: 'pyjamas', slot: 'dress',
  legs(c, P) {
    trousers(c, P, '#3d5a9e', { inside: (p) => {
      for (let y = P.waist + 20, row = 0; y < P.ankle; y += 40, row++) for (let x = 60 + (row % 2) * 20; x < W - 40; x += 40) blob(p, x, y, 4, 4, '#ffe066');
    } });
  },
  body(c, P) {
    const arms = dressed(c, P, '#3d5a9e', { hem: P.hem + 20, loose: 14, inside: (p) => {
      for (let y = P.sy + 20, row = 0; y < P.hem + 20; y += 40, row++) for (let x = 40 + (row % 2) * 20; x < W - 30; x += 40) blob(p, x, y, 4, 4, '#ffe066');
    } });
    for (const pts of arms) cuff(c, pts, '#ffe066', 14, 14);
    stroke(c, (p) => {
      p.moveTo(CX - P.neckW - 10, P.sy - 10);
      p.quadraticCurveTo(CX, P.sy + 22, CX + P.neckW + 10, P.sy - 10);
    }, 10, '#ffe066');
    for (let y = P.sy + 30; y < P.hem; y += 40) shape(c, (p) => p.arc(CX, y, 5, 0, TAU), '#ffe066', { line: 2.5 });
  },
};
/** A ballet leotard with a sticking-out tutu. */
const ballerina: Garment = {
  id: 'ballerina', slot: 'dress',
  legs(c, P) {
    const top = P.waist, hem = between(P.crotch, P.knee, 0.15), w0 = P.sh - 8, w1 = P.sh + 76;
    const tutu = (p: Ctx, grow: number) => {
      p.moveTo(CX - w0, top);
      p.lineTo(CX + w0, top);
      p.quadraticCurveTo(CX + w1 + grow, top + 20, CX + w1 + grow, hem);
      for (let i = 0; i <= 16; i++) p.lineTo(CX + w1 + grow - (i * 2 * (w1 + grow)) / 16, hem + (i % 2 ? 14 : 0));
      p.quadraticCurveTo(CX - w1 - grow, top + 20, CX - w0, top);
      p.closePath();
    };
    shape(c, (p) => tutu(p, 12), '#ffd1e3', { cel: [5, 3, -0.06] });
    shape(c, (p) => tutu(p, 0), '#ffa8cb', { cel: [6, 3, -0.12], inside: (p) => {
      for (let i = 0; i < 30; i++) blob(p, CX - w1 + ((i * 37) % 100) / 100 * w1 * 2, between(top, hem, ((i * 53) % 100) / 100), 2.5, 2.5, '#ffffff', 0.8);
    } });
  },
  body(c, P) {
    bodice(c, P, '#ff8fc0', 'round', (p) => blob(p, CX - 20, P.sy + 60, 30, 12, '#ffffff', 0.25));
  },
};

export const DRESSES: Garment[] = [
  dress('red-dress', '#d8312e', { len: 'maxi', sleeves: 'none', neck: 'v', seam: true }),
  dress('party-dress', '#ff8fc0', { len: 'knee', sleeves: 'puff', pattern: sparkle, sash: '#ffffff' }),
  dress('princess-gown', '#9fb4ff', { len: 'maxi', sleeves: 'puff', pattern: sparkle, sash: '#ffd166', flare: 70 }),
  dress('sundress', '#ffd84d', { len: 'knee', sleeves: 'none', pattern: flowers(['#ffffff', '#ff8fab']) }),
  dress('rainbow-dress', '#ff5d6c', { len: 'knee', sleeves: 'short', pattern: hoops(['#ff5d6c', '#ff9f43', '#ffe066', '#7bd389', '#5dade2', '#a37cf0']) }),
  dress('gingham-dress', '#f6f6f2', { len: 'knee', sleeves: 'short', pattern: gingham('#4d8fe0'), collar: '#ffffff' }),
  dress('green-dress', '#5cc96b', { len: 'maxi', sleeves: 'long', pattern: flowers(['#ffffff', '#ffd166']) }),
  dungarees, pyjamas, ballerina,
];
