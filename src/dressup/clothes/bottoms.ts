import { starPath } from '../../makerArt';
import { blob, CX, folds, sh, shape, stroke, trousers, W, type Ctx, type Plan } from '../figure';
import type { Garment } from '../types';

/** Bottoms: trousers, joggers and leggings in lots of colours, shorts, and skirts (denim, spotty, sparkly, a tutu). */
const between = (a: number, b: number, t: number) => a + (b - a) * t;
type Pattern = (p: Ctx, P: Plan) => void;

function pants(id: string, col: string, o: { hem?: 'long' | 'shorts' | 'capri'; pattern?: Pattern; cuffs?: string; wide?: number; stripe?: string } = {}): Garment {
  return {
    id, slot: 'bottom',
    legs(c, P) {
      const hem = o.hem === 'shorts' ? between(P.crotch, P.knee, 0.7) : o.hem === 'capri' ? between(P.knee, P.ankle, 0.5) : o.cuffs ? P.ankle - 12 : P.ankle;
      const t = trousers(c, P, col, { hem, wide: o.wide, inside: (p, t2) => {
        o.pattern?.(p, P);
        if (o.stripe) for (const s of [-1, 1]) {
          p.fillStyle = o.stripe;
          p.beginPath();
          p.moveTo(CX + s * (t2.out0 - 10), P.waist);
          p.lineTo(CX + s * (t2.out0 - 2), P.waist);
          p.lineTo(CX + s * (t2.outK + 2), hem);
          p.lineTo(CX + s * (t2.outK - 8), hem);
          p.closePath();
          p.fill();
        }
        folds(p, [
          [CX - 2, P.waist + 6, CX + 2, P.crotch - 10, 4],
          [CX - P.legX - 12, Math.min(P.knee, hem - 20) - 10, CX - P.legX + 10, Math.min(P.knee, hem - 20)],
          [CX + P.legX + 12, Math.min(P.knee, hem - 20) - 10, CX + P.legX - 10, Math.min(P.knee, hem - 20)],
        ], sh(col, col === '#2b2b31' ? 0.25 : -0.22));
      } });
      if (o.cuffs) for (const s of [-1, 1]) shape(c, (p) => p.roundRect(CX + s * P.legX - 26, t.hem - 12, 52, 18, 7), o.cuffs, { line: 4.5 });
    },
  };
}
const denim = (light: string): Pattern => (p, P) => stroke(p, (q) => {
  for (const s of [-1, 1]) {
    q.moveTo(CX + s * (P.sh - 26), P.waist + 14);
    q.quadraticCurveTo(CX + s * (P.sh - 40), P.waist + 40, CX + s * (P.sh - 62), P.waist + 44);
  }
}, 3, light);
const stars = (col: string): Pattern => (p, P) => {
  for (let y = P.waist + 20, row = 0; y < P.ankle; y += 46, row++) for (let x = 60 + (row % 2) * 24; x < W - 40; x += 50) {
    p.beginPath();
    starPath(p, x, y, 9, 5, 0.45);
    p.fillStyle = col;
    p.fill();
  }
};
const hoops = (cols: string[]): Pattern => (p, P) => {
  for (let y = P.waist, i = 0; y < P.ankle + 10; y += 26, i++) {
    p.fillStyle = cols[i % cols.length];
    p.fillRect(0, y, W, 26);
  }
};

function skirt(id: string, col: string, o: { len: 'mini' | 'knee' | 'maxi'; pleats?: boolean; pattern?: Pattern; tutu?: boolean; band?: string }): Garment {
  const hemOf = (P: Plan) => (o.len === 'mini' ? between(P.crotch, P.knee, 0.25) : o.len === 'knee' ? between(P.crotch, P.knee, 0.75) : P.ankle - 6);
  return {
    id, slot: 'bottom',
    legs(c, P) {
      const top = P.waist + 6, hem = hemOf(P), w0 = P.sh - 8, w1 = P.sh + (o.tutu ? 70 : o.len === 'maxi' ? 40 : 36);
      const path = (p: Ctx, grow = 0) => {
        p.moveTo(CX - w0, top);
        p.lineTo(CX + w0, top);
        p.quadraticCurveTo(CX + w1 - 18 + grow, (top + hem) / 2, CX + w1 + grow, hem);
        if (o.tutu || o.pleats) for (let i = 0; i <= 14; i++) p.lineTo(CX + w1 + grow - (i * 2 * (w1 + grow)) / 14, hem + (i % 2 ? (o.tutu ? 12 : 7) : 0));
        else p.quadraticCurveTo(CX, hem + 12, CX - w1 - grow, hem);
        p.quadraticCurveTo(CX - w1 + 18 - grow, (top + hem) / 2, CX - w0, top);
        p.closePath();
      };
      if (o.tutu) {
        // layers of net, a lighter one peeking out underneath
        shape(c, (p) => path(p, 14), sh(col, 0.35), { cel: [6, 3, -0.08] });
      }
      shape(c, path, col, {
        cel: [8, 4, -0.2],
        inside: (p) => {
          o.pattern?.(p, P);
          if (o.pleats) for (let i = 0; i < 14; i++) {
            const t = (i + 0.5) / 14;
            stroke(p, (q) => {
              q.moveTo(CX - w0 + t * w0 * 2, top + 4);
              q.lineTo(CX - w1 + t * w1 * 2, hem + 6);
            }, 3, sh(col, -0.22));
          }
          if (o.tutu) for (let i = 0; i < 30; i++) blob(p, CX - w1 + ((i * 37) % 100) / 100 * w1 * 2, between(top, hem, ((i * 53) % 100) / 100), 2.5, 2.5, '#ffffff', 0.8);
        },
      });
    },
    waist(c, P) {
      shape(c, (p) => p.roundRect(CX - P.sh + 6, P.waist - 4, (P.sh - 6) * 2, 18, 6), o.band ?? sh(col, -0.08), { line: 4.5 });
    },
  };
}
const dots = (col: string): Pattern => (p, P) => {
  for (let y = P.waist + 20, row = 0; y < P.ankle; y += 30, row++) for (let x = 40 + (row % 2) * 15; x < W - 30; x += 30) blob(p, x, y, 6, 6, col);
};
const sparkle = (p: Ctx, P: Plan) => {
  for (let i = 0; i < 60; i++) blob(p, 60 + ((i * 41) % 300), P.waist + ((i * 67) % 260), 3, 3, i % 3 ? '#ffffff' : '#ffd166', 0.9);
};
const tartan = (a: string, b: string): Pattern => (p) => {
  p.save();
  p.globalAlpha = 0.7;
  p.fillStyle = a;
  for (let x = 0; x < W; x += 28) p.fillRect(x, 0, 10, 980);
  p.globalAlpha = 0.5;
  for (let y = 0; y < 980; y += 28) p.fillRect(0, y, W, 10);
  p.globalAlpha = 0.8;
  p.fillStyle = b;
  for (let x = 14; x < W; x += 28) p.fillRect(x, 0, 2, 980);
  p.restore();
};

export const BOTTOMS: Garment[] = [
  pants('jeans-light', '#8fb3dd', { pattern: denim('#c8daf0') }),
  pants('trousers-dark', '#34373f'),
  pants('trousers-red', '#c73a3a'),
  pants('joggers-grey', '#9aa0a8', { cuffs: '#868c94' }),
  pants('joggers-pink', '#ff9ec2', { cuffs: '#f77fb0', stripe: '#ffffff' }),
  pants('leggings-purple', '#8e5cc9'),
  pants('leggings-stars', '#2b3a67', { pattern: stars('#ffd166') }),
  pants('leggings-rainbow', '#ff5d6c', { pattern: hoops(['#ff5d6c', '#ff9f43', '#ffe066', '#7bd389', '#5dade2', '#a37cf0']) }),
  pants('shorts-denim', '#6f95c9', { hem: 'shorts', pattern: denim('#b6cdec') }),
  pants('shorts-navy', '#282d3b', { hem: 'shorts' }),
  pants('shorts-pink', '#ff9ec2', { hem: 'shorts', stripe: '#ffffff' }),
  pants('capris-mint', '#a8e6cf', { hem: 'capri' }),
  skirt('skirt-denim', '#5b83b8', { len: 'knee' }),
  skirt('skirt-dots', '#e5484d', { len: 'knee', pattern: dots('#ffffff') }),
  skirt('skirt-sparkle', '#9b6ad8', { len: 'mini', pattern: sparkle }),
  skirt('tutu', '#ff9ec2', { len: 'mini', tutu: true, band: '#ff7fb0' }),
  skirt('skirt-tartan', '#2b3a67', { len: 'knee', pleats: true, pattern: tartan('#2e7d4f', '#ffd166') }),
  skirt('skirt-yellow', '#ffd84d', { len: 'maxi', pattern: dots('#ffffff') }),
];
