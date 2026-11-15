import { blob, CX, cuff, dressed, folds, neckline, sh, shape, stroke, TAU, trousers, W, type Ctx, type Plan } from '../figure';
import type { Garment } from '../types';

/**
 * Baby things (anyone can wear them): a footed sleepsuit with little
 * flowers, a party dress with a layered tulle skirt, a nappy, leg warmers
 * and a bib with tiny animals on it.
 */
const between = (a: number, b: number, t: number) => a + (b - a) * t;

/** Little flowers and leaves all over (a soft print on white), with faint ribs. */
const ditsy = (p: Ctx, top: number, bottom: number) => {
  stroke(p, (q) => {
    for (let x = 6; x < W; x += 9) {
      q.moveTo(x, top);
      q.lineTo(x, bottom);
    }
  }, 1.5, '#d9d4cc', 0.5);
  const petals = ['#f2b9b0', '#8fc9bb', '#9fb1d1', '#f6cfc0'];
  let i = 0;
  for (let y = top + 10, row = 0; y < bottom; y += 30, row++) {
    for (let x = 14 + (row % 2) * 17; x < W; x += 34, i++) {
      const jx = ((i * 37) % 11) - 5, jy = ((i * 53) % 9) - 4;
      const fx = x + jx, fy = y + jy;
      if (i % 3 === 2) {
        // a pair of leaves
        blob(p, fx - 5, fy, 7, 3.4, '#9cc79a', 1, -0.6);
        blob(p, fx + 5, fy + 2, 7, 3.4, '#7fb38d', 1, 0.5);
        continue;
      }
      const col = petals[i % petals.length], r = i % 4 === 0 ? 4.6 : 3.6;
      for (let k = 0; k < 5; k++) blob(p, fx + Math.cos(k * 1.257 + i) * r, fy + Math.sin(k * 1.257 + i) * r, r * 0.85, r * 0.85, col);
      blob(p, fx, fy, r * 0.5, r * 0.5, sh(col, -0.25));
    }
  }
};
const SUIT = '#f7f3ec';

/** Where the legs of trousers end (to fit a foot on the bottom). */
const hemOf = (P: Plan, wide: number) => ({ outK: P.legX + P.legW * 0.55 + wide, inn: Math.max(6, P.legX - P.legW * 0.5 - wide * 0.3) });

/** A footed sleepsuit: all in one, zip up the front. */
const sleepsuit: Garment = {
  id: 'sleepsuit-floral', slot: 'costume', full: true, noShoes: true,
  legs(c, P) {
    trousers(c, P, SUIT, { hem: P.ankle - 4, wide: 6, hips: 4, dark: -0.1, inside: (p) => {
      ditsy(p, P.waist - 20, P.ankle + 10);
      folds(p, [[CX - P.legX - 16, P.knee - 6, CX - P.legX + 14, P.knee + 4, 5], [CX + P.legX + 16, P.knee - 6, CX + P.legX - 14, P.knee + 4, -5]], '#d6cfc4');
    } });
  },
  feet(c, P) {
    const { outK, inn } = hemOf(P, 6), top = P.ankle - 12;
    for (const s of [-1, 1]) {
      const X = (dx: number) => CX + s * dx;
      shape(c, (p) => {
        p.moveTo(X(inn), top);
        p.lineTo(X(outK), top);
        p.quadraticCurveTo(X(outK + 26), top + 8, X(outK + 26), 882);
        p.quadraticCurveTo(X(outK + 26), 897, X(outK + 10), 897);
        p.lineTo(X(inn + 2), 897);
        p.quadraticCurveTo(X(inn - 10), 896, X(inn - 8), 878);
        p.closePath();
      }, SUIT, { cel: [s * -5, 4, -0.1], inside: (p) => {
        ditsy(p, top - 10, 900);
        // the soft grippy sole
        p.fillStyle = '#e8ded2';
        p.fillRect(0, 890, W, 10);
        for (let x = 0; x < W; x += 9) blob(p, x, 893, 2, 1.6, '#cbbfb0');
      } });
    }
  },
  body(c, P) {
    const arms = dressed(c, P, SUIT, { hem: P.waist + 30, loose: 14, tummy: 8, cel: [12, 8, -0.1], inside: (p) => ditsy(p, P.sy - 30, P.waist + 40) });
    for (const pts of arms) cuff(c, pts, '#efe8de', 14, 16);
    neckline(c, P, '#efe8de', 6, 16);
    // the zip, from the neck down to the tummy
    const zipEnd = between(P.waist, P.crotch, 0.6);
    stroke(c, (p) => {
      p.moveTo(CX, P.sy + 10);
      p.lineTo(CX, zipEnd);
    }, 5, '#cfc6ba');
    stroke(c, (p) => {
      for (let y = P.sy + 14; y < zipEnd; y += 7) {
        p.moveTo(CX - 3, y);
        p.lineTo(CX + 3, y);
      }
    }, 1.4, '#b5ab9e');
    shape(c, (p) => p.roundRect(CX - 5, P.sy + 8, 10, 18, 3), '#e9e4dc', { line: 2.5 });
  },
};

/** A party dress: a mint top with little lacy circles, a satin sash and a skirt of tulle layers. */
const MINT = '#a9dfcb';
const tulleDress: Garment = {
  id: 'tulle-dress', slot: 'dress',
  legs(c, P) {
    const top = P.waist - 8, hem = between(P.crotch, P.knee, 0.55), w0 = P.sh - 6;
    const tier = (y0: number, y1: number, spread: number, col: string, edge: string) => {
      const w1 = P.sh + spread;
      const path = (p: Ctx) => {
        p.moveTo(CX - w0, y0);
        p.lineTo(CX + w0, y0);
        p.quadraticCurveTo(CX + w1 - 6, (y0 + y1) / 2, CX + w1, y1);
        const n = 9;
        for (let i = 1; i <= n; i++) {
          const xa = CX + w1 - ((i - 0.5) * 2 * w1) / n, xb = CX + w1 - (i * 2 * w1) / n;
          p.quadraticCurveTo(xa, y1 + 16, xb, y1);
        }
        p.quadraticCurveTo(CX - w1 + 6, (y0 + y1) / 2, CX - w0, y0);
        p.closePath();
      };
      shape(c, path, col, { cel: [8, 4, -0.1], line: 5, inside: (p) => {
        stroke(p, (q) => {
          for (let i = -4; i <= 4; i++) {
            q.moveTo(CX + i * w0 * 0.22, y0 + 6);
            q.quadraticCurveTo(CX + i * w1 * 0.24, (y0 + y1) / 2, CX + i * w1 * 0.2, y1 + 6);
          }
        }, 2.5, sh(col, 0.4), 0.7);
        for (let i = 0; i < 18; i++) blob(p, CX - w1 + (((i * 37) % 100) / 100) * w1 * 2, between(y0, y1, ((i * 53) % 100) / 100), 2, 2, '#ffffff', 0.85);
        stroke(p, (q) => {
          q.moveTo(CX - w1 - 10, y1 + 2);
          q.lineTo(CX + w1 + 10, y1 + 2);
        }, 6, edge, 0.9);
      } });
    };
    tier(top, hem, 70, '#f6f8f3', '#f3e58a');
    tier(top, hem - 26, 56, MINT, '#ffffff');
    tier(top, between(top, hem, 0.42), 38, '#d9f1e7', '#f3e58a');
  },
  body(c, P) {
    const a = P.sh * 0.42, b = P.sh * 0.74, dip = P.sy + (P.waist - P.sy) * 0.18;
    shape(c, (p) => {
      p.moveTo(CX - b, P.sy + 2);
      p.lineTo(CX - a, P.sy + 2);
      p.quadraticCurveTo(CX, dip + 20, CX + a, P.sy + 2);
      p.lineTo(CX + b, P.sy + 2);
      p.quadraticCurveTo(CX + P.sh - 8, P.sy + 60, CX + P.sh - 12, P.sy + 120);
      p.quadraticCurveTo(CX + P.sh - 8, P.waist - 60, CX + P.sh - 12, P.waist + 6);
      p.lineTo(CX - P.sh + 12, P.waist + 6);
      p.quadraticCurveTo(CX - P.sh + 8, P.waist - 60, CX - P.sh + 12, P.sy + 120);
      p.quadraticCurveTo(CX - P.sh + 8, P.sy + 60, CX - b, P.sy + 2);
      p.closePath();
    }, MINT, { cel: [10, 7, -0.14], inside: (p) => {
      // lacy circles
      for (let y = P.sy + 10, row = 0; y < P.waist + 10; y += 26, row++) for (let x = CX - P.sh + (row % 2) * 13; x < CX + P.sh; x += 26) {
        stroke(p, (q) => q.arc(x, y, 9, 0, TAU), 2.2, '#e9f7f1', 0.95);
        blob(p, x, y, 3, 3, '#e9f7f1', 0.8);
      }
    } });
  },
  waist(c, P) {
    shape(c, (p) => p.roundRect(CX - P.sh + 10, P.waist - 16, (P.sh - 10) * 2, 22, 8), '#86cdb3', { cel: [4, 3, -0.12], line: 4.5, inside: (p) => blob(p, CX - 30, P.waist - 10, 40, 4, '#ffffff', 0.45) });
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(CX + 30, P.waist - 5);
      p.quadraticCurveTo(CX + 30 + s * 30, P.waist - 30, CX + 30 + s * 32, P.waist + 4);
      p.closePath();
    }, '#86cdb3', { line: 4 });
    shape(c, (p) => p.arc(CX + 30, P.waist - 5, 7, 0, TAU), '#74bfa4', { line: 3.5 });
  },
};

/** A nappy, with sticky tabs and little stars. */
const nappy: Garment = {
  id: 'nappy', slot: 'bottom',
  legs(c, P) {
    const top = P.waist - 6, bottom = P.crotch + (P.kid ? 34 : 44), hw = P.sh + 4;
    shape(c, (p) => {
      p.moveTo(CX - hw, top);
      p.lineTo(CX + hw, top);
      p.quadraticCurveTo(CX + hw + 12, (top + bottom) / 2 - 10, CX + hw - 4, bottom - 30);
      p.quadraticCurveTo(CX + P.legX * 0.6, bottom - 34, CX + 22, bottom);
      p.quadraticCurveTo(CX, bottom + 8, CX - 22, bottom);
      p.quadraticCurveTo(CX - P.legX * 0.6, bottom - 34, CX - hw + 4, bottom - 30);
      p.quadraticCurveTo(CX - hw - 12, (top + bottom) / 2 - 10, CX - hw, top);
      p.closePath();
    }, '#fbfbfd', { cel: [10, 6, -0.1], inside: (p) => {
      for (let i = 0; i < 14; i++) blob(p, CX - hw + 14 + ((i * 41) % (hw * 2 - 20)), top + 16 + ((i * 29) % (bottom - top - 30)), 3, 3, i % 2 ? '#9fd0f0' : '#ffd88a');
      stroke(p, (q) => {
        q.moveTo(CX - hw, top + 12);
        q.lineTo(CX + hw, top + 12);
      }, 6, '#dfe8f2');
    } });
    for (const s of [-1, 1]) shape(c, (p) => p.roundRect(CX + s * (hw - 14) - 14, top + 14, 28, 18, 5), '#8cc8ec', { line: 3.5 });
  },
};

/** Pink leg warmers, scrunched down to bare feet. */
const legWarmers: Garment = {
  id: 'leg-warmers-pink', slot: 'shoes',
  feet(c, P) {
    const col = '#f6c3cf';
    for (const s of [-1, 1]) {
      const x = CX + s * P.legX, y0 = P.knee - 24, y1 = P.ankle - 2;
      const w = P.legW + 10;
      shape(c, (p) => {
        p.moveTo(x - w / 2, y0);
        p.lineTo(x + w / 2, y0);
        p.quadraticCurveTo(x + w / 2 + 6, (y0 + y1) / 2, x + w / 2 + 2, y1);
        p.lineTo(x - w / 2 - 2, y1);
        p.quadraticCurveTo(x - w / 2 - 6, (y0 + y1) / 2, x - w / 2, y0);
        p.closePath();
      }, col, { cel: [s * -5, 3, -0.14], inside: (p) => {
        stroke(p, (q) => {
          for (let dx = -w / 2; dx <= w / 2; dx += 7) {
            q.moveTo(x + dx, y0);
            q.lineTo(x + dx * 1.05, y1);
          }
        }, 1.6, sh(col, -0.12));
        folds(p, [[x - w / 2, between(y0, y1, 0.35), x + w / 2, between(y0, y1, 0.42), 3], [x - w / 2, between(y0, y1, 0.7), x + w / 2, between(y0, y1, 0.66), -3]], sh(col, -0.2));
      } });
    }
  },
};

/** A soft silicone bib with a crumb-catcher, dotted with tiny animals. */
const bib: Garment = {
  id: 'bib', slot: 'neck',
  neck(c, P) {
    const col = '#f6efdf', top = P.sy - 14, bottom = P.sy + (P.waist - P.sy) * (P.kid ? 0.66 : 0.5), hw = P.sh * 0.78;
    const outline = (p: Ctx) => {
      p.moveTo(CX - P.neckW - 24, top);
      p.quadraticCurveTo(CX - hw - 6, top + 10, CX - hw, top + 60);
      p.lineTo(CX - hw + 4, bottom - 40);
      p.quadraticCurveTo(CX - hw + 8, bottom, CX - hw + 50, bottom);
      p.lineTo(CX + hw - 50, bottom);
      p.quadraticCurveTo(CX + hw - 8, bottom, CX + hw - 4, bottom - 40);
      p.lineTo(CX + hw, top + 60);
      p.quadraticCurveTo(CX + hw + 6, top + 10, CX + P.neckW + 24, top);
      p.quadraticCurveTo(CX, top + 40, CX - P.neckW - 24, top);
      p.closePath();
    };
    const cols = ['#4a90d9', '#f08a3c', '#3fb6a8', '#7c6fd6', '#e0b33a'];
    shape(c, outline, col, { cel: [8, 6, -0.08], line: 5, inside: (p) => {
      for (let y = top + 44, row = 0; y < bottom - 10; y += 30, row++) for (let x = CX - hw + 22 + (row % 2) * 18; x < CX + hw - 12; x += 38) {
        const i = row * 7 + Math.round(x);
        const k = cols[i % cols.length], f = i % 2 ? 1 : -1;
        blob(p, x, y, 7, 4.5, k); // a tiny animal: body, head and legs
        blob(p, x + f * 7, y - 4, 3.4, 3.4, k);
        stroke(p, (q) => {
          q.moveTo(x - 4, y + 3);
          q.lineTo(x - 5, y + 8);
          q.moveTo(x + 4, y + 3);
          q.lineTo(x + 5, y + 8);
        }, 1.6, k);
      }
    } });
    // the crumb-catcher pocket along the bottom
    const pocket = (p: Ctx) => {
      p.moveTo(CX - hw + 2, bottom - 46);
      p.quadraticCurveTo(CX, bottom - 30, CX + hw - 2, bottom - 46);
      p.lineTo(CX + hw - 4, bottom - 30);
      p.quadraticCurveTo(CX + hw - 8, bottom + 2, CX + hw - 50, bottom + 2);
      p.lineTo(CX - hw + 50, bottom + 2);
      p.quadraticCurveTo(CX - hw + 8, bottom + 2, CX - hw + 4, bottom - 30);
      p.closePath();
    };
    shape(c, pocket, sh(col, -0.04), { cel: [6, 5, -0.1], line: 4.5 });
    stroke(c, (p) => {
      p.moveTo(CX - hw + 10, bottom - 40);
      p.quadraticCurveTo(CX, bottom - 24, CX + hw - 10, bottom - 40);
    }, 3, '#ffffff', 0.8);
    // the popper at the back of the neck
    shape(c, (p) => p.arc(CX + P.neckW + 14, top + 4, 5, 0, TAU), '#e9dfc9', { line: 2.5 });
  },
};

export const BABY: Garment[] = [sleepsuit, tulleDress, nappy, legWarmers, bib];
