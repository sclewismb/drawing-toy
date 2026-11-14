import { heartPath, starPath } from '../../makerArt';
import { blob, CX, cuff, dressed, folds, INK, knit, line, neckline, sh, shape, shortSleeve, stroke, TAU, W, type Ctx, type Plan, type Pt3 } from '../figure';
import type { Garment } from '../types';

/** Tops: T-shirts in every colour with little prints, stripes, shirts, cardigans, a jacket, jumpers and hoodies. */
type Print = (c: Ctx, P: Plan) => void;
const chest = (P: Plan) => ({ x: CX, y: P.sy + (P.kind === 'child' ? 104 : 116), k: P.kind === 'child' ? 1 : 1.15 });

// ------------------------------------------------------------------ prints (all original)
const heart = (col: string): Print => (c, P) => {
  const { x, y, k } = chest(P);
  shape(c, (p) => heartPath(p, x, y + 14 * k, 34 * k), col, { line: 4 });
  blob(c, x - 12 * k, y - 4 * k, 6 * k, 4 * k, '#ffffff', 0.6);
};
const star = (col: string): Print => (c, P) => {
  const { x, y, k } = chest(P);
  shape(c, (p) => starPath(p, x, y, 34 * k, 5, 0.48), col, { line: 4 });
};
const smiley: Print = (c, P) => {
  const { x, y, k } = chest(P);
  shape(c, (p) => p.arc(x, y, 30 * k, 0, TAU), '#ffe066', { line: 4 });
  blob(c, x - 10 * k, y - 6 * k, 4 * k, 6 * k, INK);
  blob(c, x + 10 * k, y - 6 * k, 4 * k, 6 * k, INK);
  stroke(c, (p) => p.arc(x, y + 2 * k, 16 * k, 0.2 * Math.PI, 0.8 * Math.PI), 4, INK);
};
const rainbow: Print = (c, P) => {
  const { x, y, k } = chest(P);
  ['#ff5d6c', '#ff9f43', '#ffe066', '#7bd389', '#5dade2', '#a37cf0'].forEach((col, i) => stroke(c, (p) => p.arc(x, y + 24 * k, (44 - i * 6) * k, Math.PI, 0), 6 * k, col));
  for (const s of [-1, 1]) shape(c, (p) => p.ellipse(x + s * 40 * k, y + 26 * k, 14 * k, 9 * k, 0, 0, TAU), '#ffffff', { line: 3 });
};
const dino: Print = (c, P) => {
  const { x, y, k } = chest(P);
  const col = '#5cc96b';
  shape(c, (p) => {
    p.moveTo(x - 46 * k, y + 20 * k);
    p.quadraticCurveTo(x - 30 * k, y - 4 * k, x - 4 * k, y - 2 * k);
    p.quadraticCurveTo(x + 14 * k, y - 4 * k, x + 18 * k, y - 26 * k);
    p.quadraticCurveTo(x + 22 * k, y - 40 * k, x + 38 * k, y - 36 * k);
    p.quadraticCurveTo(x + 50 * k, y - 30 * k, x + 40 * k, y - 22 * k);
    p.quadraticCurveTo(x + 30 * k, y - 20 * k, x + 30 * k, y);
    p.quadraticCurveTo(x + 32 * k, y + 22 * k, x + 18 * k, y + 26 * k);
    p.lineTo(x + 16 * k, y + 38 * k);
    p.lineTo(x + 6 * k, y + 38 * k);
    p.lineTo(x + 4 * k, y + 26 * k);
    p.lineTo(x - 14 * k, y + 26 * k);
    p.lineTo(x - 16 * k, y + 38 * k);
    p.lineTo(x - 26 * k, y + 38 * k);
    p.lineTo(x - 26 * k, y + 22 * k);
    p.closePath();
  }, col, { line: 3.5 });
  blob(c, x + 36 * k, y - 30 * k, 3 * k, 3 * k, INK);
  for (let i = 0; i < 4; i++) shape(c, (p) => p.arc(x - 24 * k + i * 12 * k, y - 4 * k - Math.sin((i / 3) * Math.PI) * 4 * k, 5 * k, Math.PI, 0), '#ffb347', { line: 2.5 });
};
const bolt: Print = (c, P) => {
  const { x, y, k } = chest(P);
  shape(c, (p) => {
    p.moveTo(x + 6 * k, y - 40 * k);
    p.lineTo(x - 22 * k, y + 4 * k);
    p.lineTo(x - 2 * k, y + 4 * k);
    p.lineTo(x - 10 * k, y + 40 * k);
    p.lineTo(x + 22 * k, y - 8 * k);
    p.lineTo(x + 2 * k, y - 8 * k);
    p.closePath();
  }, '#ffe066', { line: 4 });
};
const planet: Print = (c, P) => {
  const { x, y, k } = chest(P);
  shape(c, (p) => p.arc(x, y, 26 * k, 0, TAU), '#ff9f43', { line: 4, inside: (p) => blob(p, x - 8 * k, y - 8 * k, 10 * k, 6 * k, '#ffd08a', 0.9) });
  stroke(c, (p) => p.ellipse(x, y, 46 * k, 12 * k, -0.3, 0, TAU), 9, INK);
  stroke(c, (p) => p.ellipse(x, y, 46 * k, 12 * k, -0.3, 0, TAU), 5, '#ffe066');
  for (const [dx, dy] of [[-50, -30], [44, -34], [36, 34]]) shape(c, (p) => starPath(p, x + dx * k, y + dy * k, 7 * k, 5, 0.45), '#ffffff', { line: 2 });
};
const paw: Print = (c, P) => {
  const { x, y, k } = chest(P);
  shape(c, (p) => p.ellipse(x, y + 10 * k, 20 * k, 16 * k, 0, 0, TAU), '#ffffff', { line: 3.5 });
  for (const [dx, dy] of [[-22, -12], [-8, -24], [8, -24], [22, -12]]) shape(c, (p) => p.ellipse(x + dx * k, y + dy * k, 7 * k, 9 * k, 0, 0, TAU), '#ffffff', { line: 3 });
};
const flower = (col: string): Print => (c, P) => {
  const { x, y, k } = chest(P);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    shape(c, (p) => p.arc(x + Math.cos(a) * 18 * k, y + Math.sin(a) * 18 * k, 14 * k, 0, TAU), col, { line: 3 });
  }
  shape(c, (p) => p.arc(x, y, 11 * k, 0, TAU), '#ffe066', { line: 3 });
};
const sparkles = (col: string): Print => (c, P) => {
  let n = 7;
  const rnd = () => ((n = (n * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) blob(c, CX - P.sh + 14 + rnd() * (P.sh * 2 - 28), P.sy + 10 + rnd() * (P.hem - P.sy - 10), 3, 3, i % 3 ? col : '#ffffff', 0.9);
};

// ------------------------------------------------------------------ T-shirts
const sleeveEnd = (c: Ctx, pts: Pt3[], col: string) => {
  const [x, y] = pts[pts.length - 1];
  stroke(c, (p) => {
    p.moveTo(x - 24, y - 4);
    p.quadraticCurveTo(x, y + 6, x + 24, y - 4);
  }, 3.5, sh(col, -0.3));
};
function tee(id: string, col: string, o: { stripes?: string[]; print?: Print; long?: boolean; neck?: string } = {}): Garment {
  return {
    id, slot: 'top',
    body(c, P) {
      const arms = dressed(c, P, col, { hem: P.hem + 6, loose: 14, sleeve: o.long ? undefined : shortSleeve(0.5), inside: (p) => {
        if (o.stripes) for (let y = P.sy - 6, i = 0; y < P.hem + 40; y += 30, i++) {
          p.fillStyle = o.stripes[i % o.stripes.length];
          p.fillRect(0, y, W, 14);
        }
        folds(p, [[CX - P.sh + 26, P.sy + 130, CX - P.sh + 46, P.sy + 200, 6], [CX + P.sh - 26, P.sy + 130, CX + P.sh - 46, P.sy + 200, -6]], sh(col, -0.22));
      } });
      for (const pts of arms) (o.long ? cuff(c, pts, sh(col, -0.08)) : sleeveEnd(c, pts, col));
      neckline(c, P, o.neck ?? sh(col, -0.15), 6, 16);
      o.print?.(c, P);
    },
  };
}

// ------------------------------------------------------------------ shirts with a collar and buttons
const plaid = (a: string, b: string) => (p: Ctx) => {
  p.save();
  p.globalAlpha = 0.8;
  p.fillStyle = a;
  for (let x = 0; x < W; x += 22) p.fillRect(x, 0, 7, 980);
  p.globalAlpha = 0.5;
  for (let y = 0; y < 980; y += 22) p.fillRect(0, y, W, 7);
  p.globalAlpha = 0.8;
  p.fillStyle = b;
  for (let x = 11; x < W; x += 22) p.fillRect(x, 0, 2, 980);
  p.restore();
};
const hibiscus = (p: Ctx) => {
  let n = 3;
  const rnd = () => ((n = (n * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) {
    const x = 30 + rnd() * 360, y = 200 + rnd() * 500;
    blob(p, x + 14, y + 10, 16, 6, '#2e8b57', 0.9, 0.6);
    for (let k = 0; k < 5; k++) blob(p, x + Math.cos(k * 1.26) * 9, y + Math.sin(k * 1.26) * 9, 9, 9, ['#ff6b8a', '#ffd166', '#ffffff'][i % 3]);
    blob(p, x, y, 4, 4, '#ffd166');
  }
};
function shirt(id: string, col: string, o: { pattern?: (p: Ctx) => void; short?: boolean; collar?: string } = {}): Garment {
  return {
    id, slot: 'top',
    body(c, P) {
      const arms = dressed(c, P, col, { hem: P.hem + 14, loose: 12, sleeve: o.short ? shortSleeve(0.55) : undefined, inside: (p) => {
        o.pattern?.(p);
        folds(p, [[CX - P.sh + 26, P.sy + 130, CX - P.sh + 46, P.sy + 200, 6], [CX + P.sh - 26, P.sy + 130, CX + P.sh - 46, P.sy + 200, -6]], sh(col, -0.25));
      } });
      for (const pts of arms) (o.short ? sleeveEnd(c, pts, col) : cuff(c, pts, sh(col, -0.06), 12, 18));
      stroke(c, line([[CX, P.sy + 4], [CX, P.hem + 12]]), 3, sh(col, -0.35));
      for (let y = P.sy + 30; y < P.hem; y += 42) shape(c, (p) => p.arc(CX + 5, y, 4, 0, TAU), '#f4f1ea', { line: 2.5 });
      for (const s of [-1, 1]) shape(c, (p) => {
        p.moveTo(CX + s * 2, P.sy - 4);
        p.lineTo(CX + s * (P.neckW + 20), P.sy - 22);
        p.lineTo(CX + s * (P.neckW + 16), P.sy + 10);
        p.lineTo(CX + s * 12, P.sy + 30);
        p.closePath();
      }, o.collar ?? col, { cel: [2, 2, -0.15], line: 4.5 });
    },
  };
}

// ------------------------------------------------------------------ cardigans and a jacket (open over a white T-shirt)
function cardigan(id: string, col: string, inner = '#f6f4ef'): Garment {
  return {
    id, slot: 'top', long: true,
    body(c, P) {
      const hem = P.hem + 24;
      const arms = dressed(c, P, col, { hem, loose: 14, inside: (p) => {
        knit(p, P.sy, hem + 20, 0.12);
        folds(p, [[CX - P.sh + 24, P.sy + 130, CX - P.sh + 44, P.sy + 200, 6]], sh(col, -0.22));
      } });
      for (const pts of arms) cuff(c, pts, sh(col, -0.1), 12, 22);
      // the T-shirt underneath, down the middle
      shape(c, (p) => {
        p.moveTo(CX - 26, P.sy - 4);
        p.quadraticCurveTo(CX, P.sy + 14, CX + 26, P.sy - 4);
        p.lineTo(CX + 30, hem - 6);
        p.lineTo(CX - 30, hem - 6);
        p.closePath();
      }, inner, { line: 4.5 });
      neckline(c, P, sh(inner, -0.1), 5, 14, -2);
      for (const s of [-1, 1]) for (let y = P.sy + 40; y < hem - 20; y += 46) shape(c, (p) => p.arc(CX + s * 38, y, 5, 0, TAU), sh(col, 0.4), { line: 2.5 });
      shape(c, (p) => p.roundRect(CX - P.sh + 4, hem - 24, (P.sh - 4) * 2, 24, 8), sh(col, -0.06), { line: 4.5 });
    },
  };
}
const denimJacket: Garment = {
  id: 'denim-jacket', slot: 'top', long: true,
  body(c, P) {
    const col = '#5b83b8', hem = P.hem + 20;
    const arms = dressed(c, P, col, { hem, loose: 14, inside: (p) => {
      stroke(p, (q) => {
        for (const s of [-1, 1]) {
          q.moveTo(CX + s * 14, P.sy + 10);
          q.lineTo(CX + s * 14, hem);
          q.moveTo(CX - P.sh, P.sy + 60);
          q.lineTo(CX + P.sh, P.sy + 60);
        }
      }, 2.2, '#f2c46d', 0.8); // stitching
      folds(p, [[CX - P.sh + 24, P.sy + 130, CX - P.sh + 44, P.sy + 200, 6], [CX + P.sh - 24, P.sy + 130, CX + P.sh - 44, P.sy + 200, -6]], '#46699a');
    } });
    for (const pts of arms) cuff(c, pts, '#4f76ab', 14, 22);
    for (const s of [-1, 1]) {
      shape(c, (p) => p.roundRect(CX + s * (P.sh * 0.45) - 22, P.sy + 66, 44, 34, 6), '#4f76ab', { line: 4 }); // pockets
      shape(c, (p) => p.arc(CX + s * (P.sh * 0.45), P.sy + 74, 4, 0, TAU), '#d9b45a', { line: 2 });
      shape(c, (p) => {
        p.moveTo(CX + s * 4, P.sy - 6);
        p.lineTo(CX + s * (P.neckW + 30), P.sy - 26);
        p.lineTo(CX + s * (P.neckW + 30), P.sy + 18);
        p.lineTo(CX + s * 14, P.sy + 40);
        p.closePath();
      }, '#6b93c8', { cel: [2, 2, -0.15], line: 4.5 });
    }
    for (let y = P.sy + 50; y < hem - 10; y += 46) shape(c, (p) => p.arc(CX + 6, y, 5, 0, TAU), '#d9b45a', { line: 2.5 });
  },
};

// ------------------------------------------------------------------ jumpers and hoodies
function jumper(id: string, col: string, pattern: (p: Ctx, P: Plan) => void): Garment {
  return {
    id, slot: 'top', long: true,
    body(c, P) {
      const hem = P.hem + 26;
      const arms = dressed(c, P, col, { hem, loose: 14, inside: (p) => {
        pattern(p, P);
        knit(p, P.sy, hem + 20, 0.08);
      } });
      for (const pts of arms) cuff(c, pts, sh(col, -0.1), 12, 22);
      shape(c, (p) => p.roundRect(CX - P.sh + 4, hem - 24, (P.sh - 4) * 2, 24, 8), sh(col, -0.08), { line: 4.5, inside: (p) => stroke(p, (q) => {
        for (let x = CX - P.sh + 10; x < CX + P.sh; x += 8) {
          q.moveTo(x, hem - 20);
          q.lineTo(x, hem - 4);
        }
      }, 2, sh(col, -0.25)) });
      neckline(c, P, sh(col, -0.12), 8, 16);
    },
  };
}
const snowflakes = (p: Ctx, P: Plan) => {
  p.fillStyle = '#2e8b57';
  for (let x = 0, i = 0; x < W; x += 20, i++) p.fillRect(x, P.sy + 150 + (i % 2) * 8, 20, 14);
  p.fillStyle = '#ffffff';
  for (let x = 10; x < W; x += 20) p.fillRect(x, P.sy + 156, 6, 6);
  stroke(p, (q) => {
    for (const [x, y] of [[CX - 50, P.sy + 70], [CX + 40, P.sy + 90], [CX - 30, P.sy + 230], [CX + 50, P.sy + 250], [CX, P.sy + 40]]) {
      for (let a = 0; a < 3; a++) {
        const r = (a / 3) * Math.PI;
        q.moveTo(x - Math.cos(r) * 12, y - Math.sin(r) * 12);
        q.lineTo(x + Math.cos(r) * 12, y + Math.sin(r) * 12);
      }
    }
  }, 3, '#ffffff');
};
const hearts = (p: Ctx, P: Plan) => {
  for (let y = P.sy + 30, row = 0; y < P.hem + 20; y += 50, row++) for (let x = 40 + (row % 2) * 30; x < W - 30; x += 60) {
    p.beginPath();
    heartPath(p, x, y, 14);
    p.fillStyle = '#ffffff';
    p.fill();
  }
};
const bands = (cols: string[]) => (p: Ctx, P: Plan) => {
  for (let y = P.sy - 10, i = 0; y < P.hem + 40; y += 34, i++) {
    p.fillStyle = cols[i % cols.length];
    p.fillRect(0, y, W, 34);
  }
};
function hoodie(id: string, col: string, o: { print?: Print; zip?: string } = {}): Garment {
  return {
    id, slot: 'top', long: true,
    body(c, P) {
      const hem = P.hem + 20;
      const arms = dressed(c, P, col, { hem, loose: 12, inside: (p) => {
        knit(p, P.sy, hem + 20, 0.07);
        folds(p, [[CX - P.sh + 24, P.sy + 120, CX - P.sh + 44, P.sy + 190, 6], [CX + P.sh - 24, P.sy + 120, CX + P.sh - 44, P.sy + 190, -6]], sh(col, -0.22));
      } });
      for (const pts of arms) cuff(c, pts, sh(col, -0.08), 12, 20);
      shape(c, (p) => p.roundRect(CX - P.sh * 0.6, hem - (P.kind === 'child' ? 90 : 110), P.sh * 1.2, P.kind === 'child' ? 60 : 70, 14), sh(col, -0.05), { cel: [4, 3, -0.12], line: 4.5 });
      if (o.zip) {
        stroke(c, line([[CX, P.sy + 6], [CX, hem]]), 8, INK);
        stroke(c, line([[CX, P.sy + 6], [CX, hem]]), 4, o.zip);
      }
      shape(c, (p) => {
        p.moveTo(CX - P.neckW - 26, P.sy - 26);
        p.quadraticCurveTo(CX, P.sy + 4, CX + P.neckW + 26, P.sy - 26);
        p.lineTo(CX + P.neckW + 30, P.sy + 4);
        p.quadraticCurveTo(CX, P.sy + 34, CX - P.neckW - 30, P.sy + 4);
        p.closePath();
      }, col, { cel: [4, 4, -0.18] });
      for (const s of [-1, 1]) {
        stroke(c, line([[CX + s * 14, P.sy + 18], [CX + s * 18, P.sy + 96]]), 6.5, INK);
        stroke(c, line([[CX + s * 14, P.sy + 18], [CX + s * 18, P.sy + 96]]), 3, '#f1f2f4');
      }
      if (!o.zip) o.print?.(c, P);
    },
  };
}
function tankTop(id: string, col: string, print?: Print): Garment {
  return {
    id, slot: 'top',
    body(c, P) {
      const a = P.sh * 0.5, b = P.sh * 0.72, scoop = P.sy + (P.waist - P.sy) * 0.3;
      shape(c, (p) => {
        p.moveTo(CX - b, P.sy + 2);
        p.lineTo(CX - a, P.sy + 2);
        p.quadraticCurveTo(CX - a * 0.86, scoop - 4, CX, scoop);
        p.quadraticCurveTo(CX + a * 0.86, scoop - 4, CX + a, P.sy + 2);
        p.lineTo(CX + b, P.sy + 2);
        p.quadraticCurveTo(CX + P.sh - 8, P.sy + 60, CX + P.sh - 10, P.sy + 120);
        p.quadraticCurveTo(CX + P.sh - 2, P.waist - 80, CX + P.sh - 6, P.waist + 12);
        p.lineTo(CX - P.sh + 6, P.waist + 12);
        p.quadraticCurveTo(CX - P.sh + 2, P.waist - 80, CX - P.sh + 10, P.sy + 120);
        p.quadraticCurveTo(CX - P.sh + 8, P.sy + 60, CX - b, P.sy + 2);
        p.closePath();
      }, col, { cel: [10, 7, -0.15], inside: (p) => folds(p, [[CX - 40, P.sy + 160, CX - 30, P.sy + 220, 4], [CX + 40, P.sy + 160, CX + 30, P.sy + 220, -4]], sh(col, -0.2)) });
      print?.(c, { ...P, sy: P.sy + 20 });
    },
  };
}
/** A light blue-grey polo with a teal collar. */
const poloGrey: Garment = {
  id: 'polo-grey', slot: 'top',
  body(c, P) {
    const col = '#c9d3dd', collar = '#a7cad3';
    const arms = dressed(c, P, col, { hem: P.hem + 8, loose: 16, sleeve: shortSleeve(0.5), inside: (p) => folds(p, [[CX - P.sh + 30, P.sy + 140, CX - P.sh + 56, P.sy + 210, 6], [CX + P.sh - 30, P.sy + 150, CX + P.sh - 54, P.sy + 220, -6]], sh(col, -0.22)) });
    for (const pts of arms) sleeveEnd(c, pts, col);
    shape(c, (p) => p.roundRect(CX - 10, P.sy - 4, 20, 70, 4), sh(col, -0.03), { line: 3.5 });
    for (const y of [P.sy + 18, P.sy + 44]) shape(c, (p) => p.arc(CX, y, 4.5, 0, TAU), '#eef2f5', { line: 2.5 });
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(CX + s * 4, P.sy - 8);
      p.lineTo(CX + s * (P.neckW + 24), P.sy - 24);
      p.lineTo(CX + s * (P.neckW + 30), P.sy + 6);
      p.lineTo(CX + s * 14, P.sy + 28);
      p.closePath();
    }, collar, { cel: [2, 3, -0.15], line: 5 });
  },
};

export const TOPS: Garment[] = [
  tee('tee-white', '#f6f6f2', { print: heart('#ff6b8a') }),
  tee('tee-red', '#e5484d', { print: star('#ffe066') }),
  tee('tee-orange', '#ff9f43', { print: smiley }),
  tee('tee-yellow', '#ffd84d', { print: flower('#ff8fab') }),
  tee('tee-green', '#7bd389', { print: dino }),
  tee('tee-blue', '#4d8fe0', { print: bolt }),
  tee('tee-purple', '#9b6ad8', { print: rainbow }),
  tee('tee-pink', '#ff9ec2', { print: heart('#ffffff') }),
  tee('tee-black', '#2b2b31', { print: planet }),
  tee('tee-sky', '#9bd8f5', { print: paw }),
  tee('tee-sparkle', '#b06ad8', { print: sparkles('#ffd166') }),
  tee('stripes-navy', '#f4f2ea', { stripes: ['#2b3a67'] }),
  tee('stripes-red', '#ffffff', { stripes: ['#e5484d'] }),
  tee('stripes-rainbow', '#ffffff', { stripes: ['#ff5d6c', '#ff9f43', '#ffe066', '#7bd389', '#5dade2', '#a37cf0'] }),
  tee('long-grey', '#adb5bd', { long: true, print: star('#ffffff') }),
  tee('long-mint', '#a8e6cf', { long: true, print: flower('#ffffff') }),
  shirt('plaid-shirt', '#d9cdb8', { pattern: plaid('#7b5a3e', '#3a3a3a'), collar: '#7b5a3e' }),
  shirt('blue-shirt', '#a9c6e3', { collar: '#c3d8ec' }),
  shirt('holiday-shirt', '#3fb8af', { pattern: hibiscus, short: true }),
  shirt('white-shirt', '#f4f4f2'),
  shirt('check-shirt', '#c73a3a', { pattern: plaid('#3a1f1f', '#2b2b2b'), collar: '#a12e2e' }),
  cardigan('cardigan-pink', '#ff9ec2'),
  cardigan('cardigan-yellow', '#ffd166'),
  denimJacket,
  jumper('xmas-jumper', '#c9302c', snowflakes),
  jumper('heart-jumper', '#ff8fab', hearts),
  jumper('stripy-jumper', '#2b3a67', bands(['#2b3a67', '#f1e9d8'])),
  jumper('rainbow-jumper', '#ff5d6c', bands(['#ff5d6c', '#ff9f43', '#ffe066', '#7bd389', '#5dade2', '#a37cf0'])),
  hoodie('hoodie-pink', '#ff8fb8', { print: heart('#ffffff') }),
  hoodie('hoodie-green', '#5cc96b', { print: dino }),
  hoodie('hoodie-lilac', '#c3a6ee', { zip: '#ffffff' }),
  hoodie('hoodie-orange', '#ff9f43', { print: star('#ffffff') }),
  tankTop('tank-pink', '#ff9ec2', heart('#ffffff')),
  tankTop('tank-black', '#2b2b31', star('#ffd166')),
  poloGrey,
];
