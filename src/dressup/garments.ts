import {
  bareFoot, blob, CX, cuff, dressed, folds, group, hangPts, hoodBack, hoodRim, INK, knit, limb, line, LW, neck,
  neckline, robe, robeHood, scarf, sh, shape, shortSleeve, sockFoot, stroke, TAU, topPath, trainer, trousers, W,
  type Ctx, type Plan, type Pt3,
} from './figure';

/**
 * The dress-up clothes. Each piece draws itself on any of the three body
 * shapes (it's drawn from the shape's measurements), at the right moment:
 *   back:  behind everyone (a cape, the back of a hood)
 *   legs:  trousers, skirts, shorts      feet:  shoes and socks
 *   body:  tops                          waist: a skirt's waistband, over the top
 *   outer: robes, a cape's front         hands: gloves (a colour)
 *   neck:  scarves                       front: after the face (a hood's rim)
 * Original designs only (no logos or anyone's characters).
 */
export type Slot = 'top' | 'bottom' | 'shoes' | 'costume' | 'neck';
export interface DrawCtx {
  skin: string;
  /** Drawing a picture of the piece on its own (for the choice tiles). */
  alone?: boolean;
}
type Draw = (c: Ctx, P: Plan, d: DrawCtx) => void;
export interface Garment {
  id: string;
  slot: Slot;
  /** A whole outfit (no top or bottoms under it). */
  full?: boolean;
  /** Its own boots: no shoes. */
  noShoes?: boolean;
  /** A long top: a skirt's waistband stays hidden under it. */
  long?: boolean;
  back?: Draw;
  legs?: Draw;
  feet?: Draw;
  body?: Draw;
  waist?: Draw;
  outer?: Draw;
  hands?: string;
  neck?: Draw;
  front?: Draw;
  /** Its picture on the choice tile, if it isn't drawn by the parts above (bare feet). */
  tile?: Draw;
}
export interface Outfit {
  top: string;
  bottom: string;
  shoes: string;
  costume?: string;
  neck?: string;
}

const kid = (P: Plan) => P.kind === 'child';
const between = (a: number, b: number, t: number) => a + (b - a) * t;

// ------------------------------------------------------------------ tops
const henley: Garment = {
  id: 'henley', slot: 'top',
  body(c, P) {
    const col = '#8fa3b8';
    const arms = dressed(c, P, col, { hem: P.waist + 22, inside: (p) => {
      knit(p, P.sy, P.waist + 40);
      folds(p, [[CX - P.sh + 30, P.sy + 140, CX - P.sh + 56, P.sy + 210, 6], [CX + P.sh - 30, P.sy + 150, CX + P.sh - 54, P.sy + 220, -6], [CX - 40, P.waist - 10, CX + 20, P.waist - 6, 6]], sh(col, -0.25));
    } });
    for (const pts of arms) cuff(c, pts, sh(col, -0.08));
    neckline(c, P, sh(col, -0.15));
    shape(c, (p) => p.roundRect(CX - 9, P.sy - 2, 18, kid(P) ? 60 : 74, 4), sh(col, -0.05), { line: 3.5 });
    for (const y of [P.sy + 22, P.sy + 48]) shape(c, (p) => p.arc(CX, y, 4.2, 0, TAU), '#e6e2da', { line: 2.5 });
  },
};
const sweatshirt: Garment = {
  id: 'sweatshirt', slot: 'top', long: true,
  body(c, P) {
    const col = '#2b2b31';
    const arms = dressed(c, P, col, { hem: P.waist + 26, inside: (p) => {
      knit(p, P.sy, P.waist + 40, 0.05);
      folds(p, [[CX - P.sh + 26, P.sy + 130, CX - P.sh + 48, P.sy + 200, 6], [CX + P.sh - 26, P.sy + 130, CX + P.sh - 48, P.sy + 200, -6]], sh(col, 0.25));
    } });
    shape(c, (p) => p.roundRect(CX - P.sh + 6, P.waist + 4, (P.sh - 6) * 2, 26, 8), sh(col, 0.06), { line: 5, inside: (p) => stroke(p, (q) => {
      for (let x = CX - P.sh + 14; x < CX + P.sh - 8; x += 9) {
        q.moveTo(x, P.waist + 8);
        q.lineTo(x, P.waist + 28);
      }
    }, 2, sh(col, 0.2)) });
    for (const pts of arms) cuff(c, pts, sh(col, 0.06), 8, 22);
    neckline(c, P, sh(col, 0.1), 7, 18);
  },
};
const jersey: Garment = {
  id: 'hockey-jersey', slot: 'top', long: true,
  body(c, P) {
    const col = '#202024', teal = '#20c9a0', hem = P.hem + 22;
    const L = hangPts(P, -1), R = hangPts(P, 1);
    const arms = dressed(c, P, col, { hem, flare: 6, loose: 12, inside: (p) => {
      p.fillStyle = teal;
      p.fillRect(0, hem - 32, W, 10);
      p.fillRect(0, hem - 16, W, 6);
      for (const pts of [L, R]) {
        const [x, y] = pts[3];
        p.fillRect(x - 40, y - 26, 80, 9);
        p.fillRect(x - 40, y - 10, 80, 5);
      }
      folds(p, [[CX - P.sh + 24, P.sy + 120, CX - P.sh + 44, P.sy + 190, 6], [CX + P.sh - 24, P.sy + 120, CX + P.sh - 44, P.sy + 190, -6]], '#3c3c44');
    } });
    shape(c, (p) => p.arc(CX, P.sy + 78, 30, 0, TAU), teal, { line: 4.5 });
    shape(c, (p) => p.arc(CX, P.sy + 78, 18, 0, TAU), col, { line: 3 });
    for (const pts of arms) cuff(c, pts, '#2d2d33', 12, 18);
    neckline(c, P, teal, 8, 16);
  },
};
const fleece: Garment = {
  id: 'fleece', slot: 'top', long: true,
  body(c, P) {
    const col = '#28324a', zip = '#ff8a3d', hem = P.hem + 16;
    const arms = dressed(c, P, col, { hem, loose: 12, inside: (p) => {
      stroke(p, (q) => {
        for (let y = P.sy + 10; y < hem + 10; y += 26) for (let x = 40; x < W - 40; x += 26) {
          const o = ((y / 26) % 2) * 13;
          q.moveTo(x + o - 5, y);
          q.lineTo(x + o, y - 5);
          q.lineTo(x + o + 5, y);
        }
      }, 2.2, '#5d6f99', 0.7);
      folds(p, [[CX + P.sh - 24, P.sy + 120, CX + P.sh - 44, P.sy + 190, -6], [CX - 30, hem - 22, CX + 30, hem - 16, 6]], '#151a28');
    } });
    for (const pts of arms) cuff(c, pts, '#1d2436', 12, 18);
    shape(c, (p) => {
      p.moveTo(CX - P.neckW - 14, P.sy - 30);
      p.lineTo(CX - P.neckW - 16, P.sy + 2);
      p.quadraticCurveTo(CX, P.sy + 18, CX + P.neckW + 16, P.sy + 2);
      p.lineTo(CX + P.neckW + 14, P.sy - 30);
      p.quadraticCurveTo(CX, P.sy - 18, CX - P.neckW - 14, P.sy - 30);
      p.closePath();
    }, '#1d2436', { line: 5 });
    stroke(c, line([[CX, P.sy + 8], [CX, hem]]), 9, INK);
    stroke(c, line([[CX, P.sy + 8], [CX, hem]]), 5, zip);
    shape(c, (p) => p.roundRect(CX - 6, P.sy + 30, 12, 24, 4), zip, { line: 3 });
  },
};
const polo: Garment = {
  id: 'polo', slot: 'top',
  body(c, P) {
    const col = '#6e2a3a';
    const arms = dressed(c, P, col, { hem: P.hem + 8, loose: 14, sleeve: shortSleeve(0.5), inside: (p) => {
      knit(p, P.sy, P.hem + 20, 0.025);
      folds(p, [[CX - P.sh + 30, P.sy + 140, CX - P.sh + 56, P.sy + 210, 6], [CX + P.sh - 30, P.sy + 150, CX + P.sh - 54, P.sy + 220, -6]], sh(col, -0.28));
    } });
    for (const pts of arms) {
      const [x, y] = pts[pts.length - 1];
      stroke(c, (p) => {
        p.moveTo(x - 24, y - 6);
        p.quadraticCurveTo(x, y + 4, x + 24, y - 6);
      }, 3.5, sh(col, -0.3));
    }
    shape(c, (p) => p.roundRect(CX - 9, P.sy - 4, 18, 64, 4), sh(col, -0.05), { line: 3.5 });
    for (const y of [P.sy + 16, P.sy + 40]) shape(c, (p) => p.arc(CX, y, 4, 0, TAU), '#e8dfe0', { line: 2.5 });
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(CX + s * 4, P.sy - 6);
      p.lineTo(CX + s * (P.neckW + 22), P.sy - 24);
      p.lineTo(CX + s * (P.neckW + 30), P.sy + 4);
      p.lineTo(CX + s * 14, P.sy + 26);
      p.closePath();
    }, col, { cel: [s < 0 ? 3 : 5, 3, -0.2], line: 5 });
  },
};
const bowTee: Garment = {
  id: 'bow-tee', slot: 'top',
  body(c, P) {
    const col = '#f3eee3';
    dressed(c, P, col, { hem: P.hem + 2, flare: 6, loose: 26, cel: [10, 7, -0.1], sleeve: shortSleeve(0.45), inside: (p) => {
      folds(p, [[CX - P.sh + 18, P.sy + 130, CX - P.sh + 36, P.sy + 200, 6], [CX + P.sh - 18, P.sy + 130, CX + P.sh - 36, P.sy + 200, -6]], sh(col, -0.15));
    } });
    neckline(c, P, sh(col, -0.05), 9, 18, 10);
    // the print: a bow drawn in one black line
    const x = CX, y = P.sy + (kid(P) ? 112 : 120), k = kid(P) ? 1 : 1.15;
    stroke(c, (p) => {
      for (const s of [-1, 1]) {
        p.moveTo(x + s * 8 * k, y);
        p.bezierCurveTo(x + s * 30 * k, y - 40 * k, x + s * 74 * k, y - 34 * k, x + s * 66 * k, y - 4 * k);
        p.bezierCurveTo(x + s * 60 * k, y + 22 * k, x + s * 26 * k, y + 12 * k, x + s * 8 * k, y + 4 * k);
        p.moveTo(x + s * 6 * k, y + 8 * k);
        p.quadraticCurveTo(x + s * 20 * k, y + 40 * k, x + s * 32 * k, y + 67 * k);
        p.lineTo(x + s * 20 * k, y + 60 * k);
        p.lineTo(x + s * 15 * k, y + 70 * k);
      }
    }, 3.2, '#2b2f3a');
    stroke(c, (p) => p.ellipse(x, y + 2 * k, 10 * k, 9 * k, 0, 0, TAU), 3.2, '#2b2f3a');
  },
};
const footballTop: Garment = {
  id: 'football-top', slot: 'top',
  body(c, P) {
    const col = '#f5d63d';
    for (const s of [-1, 1]) {
      const pts = shortSleeve(0.6)(hangPts(P, s));
      const [ex, ey] = pts[2];
      group(c, [limb(pts.map(([x, y, w]) => [x, y, w + 14] as Pt3)), (p) => p.ellipse(ex, ey, 16, 24, -s * 0.9, 0, TAU)], '#f4f4f4', [4, 4, -0.1], 5.5);
    }
    shape(c, topPath(P, { hem: P.hem + 10, flare: 4 }), col, { cel: [12, 8, -0.18], inside: (p) => {
      folds(p, [[CX - P.sh + 22, P.sy + 110, CX - P.sh + 40, P.sy + 180, 6], [CX + P.sh - 22, P.sy + 110, CX + P.sh - 40, P.sy + 180, -6]], sh(col, -0.2));
      blob(p, CX - 30, P.sy + 50, 40, 18, '#ffffff', 0.25);
    } });
    neckline(c, P, '#ffffff', 6, 16);
  },
};
const tank: Garment = {
  id: 'tank', slot: 'top',
  body(c, P) {
    const col = '#e6ecf2', a = P.sh * 0.54, b = P.sh * 0.76, scoop = P.sy + (P.waist - P.sy) * 0.38;
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
    }, col, { cel: [10, 7, -0.12], inside: (p) => folds(p, [[CX - 40, P.sy + 160, CX - 30, P.sy + 220, 4], [CX + 40, P.sy + 160, CX + 30, P.sy + 220, -4]], sh(col, -0.18)) });
  },
};
const turtleneck: Garment = {
  id: 'turtleneck', slot: 'top', long: true,
  body(c, P) {
    const col = '#ebe1cc', hem = between(P.waist, P.crotch, 0.63);
    const arms = dressed(c, P, col, { hem, flare: 10, loose: 18, inside: (p) => {
      stroke(p, (q) => {
        for (let x = 0; x < W; x += 11) {
          q.moveTo(x, P.sy - 20);
          q.lineTo(x, hem + 30);
        }
      }, 2.5, sh(col, -0.12), 0.9);
      folds(p, [[CX - P.sh + 20, P.sy + 120, CX - P.sh + 40, P.sy + 210, 6], [CX + P.sh - 20, P.sy + 120, CX + P.sh - 40, P.sy + 210, -6]], sh(col, -0.2));
    } });
    for (const pts of arms) cuff(c, pts, sh(col, 0.04), 18, 26);
    shape(c, (p) => p.roundRect(CX - P.sh - 2, hem - 20, (P.sh + 2) * 2, 24, 8), sh(col, 0.03), { line: 5, inside: (p) => stroke(p, (q) => {
      for (let x = CX - P.sh + 4; x < CX + P.sh; x += 8) {
        q.moveTo(x, hem - 16);
        q.lineTo(x, hem + 2);
      }
    }, 2, sh(col, -0.15)) });
    shape(c, (p) => {
      p.moveTo(CX - P.neckW - 20, P.sy - 50);
      p.quadraticCurveTo(CX, P.sy - 36, CX + P.neckW + 20, P.sy - 50);
      p.quadraticCurveTo(CX + P.neckW + 40, P.sy - 10, CX + P.neckW + 34, P.sy + 16);
      p.quadraticCurveTo(CX, P.sy + 34, CX - P.neckW - 34, P.sy + 16);
      p.quadraticCurveTo(CX - P.neckW - 40, P.sy - 10, CX - P.neckW - 20, P.sy - 50);
      p.closePath();
    }, col, { cel: [6, 5, -0.12], inside: (p) => {
      stroke(p, (q) => {
        for (let x = CX - P.neckW - 34; x < CX + P.neckW + 34; x += 10) {
          q.moveTo(x, P.sy - 46);
          q.lineTo(x + 2, P.sy + 24);
        }
      }, 2.5, sh(col, -0.12), 0.9);
      folds(p, [[CX - P.neckW - 20, P.sy - 14, CX + P.neckW + 20, P.sy - 14, 12]], sh(col, -0.2));
    } });
  },
};
const boatJumper: Garment = {
  id: 'boat-jumper', slot: 'top', long: true,
  body(c, P) {
    const col = '#f0ece3', hem = between(P.waist, P.crotch, 0.55);
    const arms = dressed(c, P, col, { hem, flare: 16, neckline: 6, loose: 14, cel: [11, 7, -0.12],
      sleeve: (pts) => [...pts.slice(0, 2), [(pts[2][0] + pts[3][0]) / 2, (pts[2][1] + pts[3][1]) / 2 - 20, pts[2][2]] as Pt3],
      inside: (p) => {
        knit(p, P.sy, hem + 20, 0.18);
        folds(p, [[CX - P.sh + 20, P.sy + 120, CX - P.sh + 40, P.sy + 220, 6], [CX + P.sh - 20, P.sy + 120, CX + P.sh - 40, P.sy + 220, -6], [CX - 50, hem - 40, CX + 30, hem - 32, 8]], sh(col, -0.14));
      } });
    for (const pts of arms) cuff(c, pts, sh(col, -0.04), 14, 16);
    for (const s of [-1, 1]) stroke(c, line([[CX + s * (P.sh - 2), hem - 24], [CX + s * (P.sh - 4), hem]]), 3.5, sh(col, -0.3));
    neckline(c, P, sh(col, -0.04), 7, 14, 40);
  },
};
const hoodie: Garment = {
  id: 'hoodie', slot: 'top', long: true,
  body(c, P) {
    const col = '#9aa0a8', hem = P.hem + 20;
    const arms = dressed(c, P, col, { hem, loose: 12, inside: (p) => {
      knit(p, P.sy, hem + 20, 0.07);
      folds(p, [[CX - P.sh + 24, P.sy + 120, CX - P.sh + 44, P.sy + 190, 6], [CX + P.sh - 24, P.sy + 120, CX + P.sh - 44, P.sy + 190, -6]], sh(col, -0.22));
    } });
    for (const pts of arms) cuff(c, pts, sh(col, -0.08), 12, 20);
    shape(c, (p) => p.roundRect(CX - P.sh * 0.6, hem - (kid(P) ? 90 : 110), P.sh * 1.2, kid(P) ? 60 : 70, 14), sh(col, -0.04), { cel: [4, 3, -0.12], line: 4.5 }); // the pocket
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
  },
};
const puffer: Garment = {
  id: 'puffer', slot: 'top', long: true,
  body(c, P) {
    const col = '#232328', hem = between(P.crotch, P.knee, 0.9);
    const arms = dressed(c, P, col, { hem, flare: 10, loose: 18, inside: (p) => {
      for (let y = P.sy + 40; y < hem; y += 44) stroke(p, (q) => {
        q.moveTo(0, y);
        q.quadraticCurveTo(CX, y + 10, W, y);
      }, 3, '#45464f');
      for (let y = P.sy + 40; y < hem; y += 44) blob(p, CX - 30, y + 20, 50, 7, '#5a5c66', 0.45);
    } });
    stroke(c, line([[CX + 4, P.sy - 4], [CX + 4, hem + 4]]), 4, '#55565f');
    for (const pts of arms) cuff(c, pts, '#2c2d33', 18, 18);
    shape(c, (p) => {
      p.moveTo(CX - P.neckW - 16, P.sy - 36);
      p.lineTo(CX - P.neckW - 20, P.sy + 4);
      p.quadraticCurveTo(CX, P.sy + 18, CX + P.neckW + 20, P.sy + 4);
      p.lineTo(CX + P.neckW + 16, P.sy - 36);
      p.quadraticCurveTo(CX, P.sy - 22, CX - P.neckW - 16, P.sy - 36);
      p.closePath();
    }, col, { line: 5.5, inside: (p) => stroke(p, line([[CX + 4, P.sy - 30], [CX + 4, P.sy + 12]]), 3, '#55565f') });
  },
};

// ------------------------------------------------------------------ bottoms
const jeans: Garment = {
  id: 'jeans', slot: 'bottom',
  legs(c, P) {
    const col = '#4b6f9e';
    trousers(c, P, col, { inside: (p, t) => folds(p, [
      [CX - t.out0 + 18, P.waist + 14, CX - t.out0 + 56, P.waist + 46, -10],
      [CX + t.out0 - 18, P.waist + 14, CX + t.out0 - 56, P.waist + 46, 10],
      [CX - 2, P.waist + 6, CX + 2, P.crotch - 10, 4],
      [CX - P.legX - 14, P.knee - 24, CX - P.legX + 6, P.knee - 14],
      [CX + P.legX + 14, P.knee - 24, CX + P.legX - 6, P.knee - 14],
      [CX - P.legX - 10, P.ankle - 30, CX - P.legX + 10, P.ankle - 24],
      [CX + P.legX + 10, P.ankle - 30, CX + P.legX - 10, P.ankle - 24],
    ], sh(col, 0.3)) });
  },
};
const leggings: Garment = {
  id: 'leggings', slot: 'bottom',
  legs(c, P) {
    trousers(c, P, '#25262c', { inside: (p) => folds(p, [[CX - P.legX - 10, P.knee - 10, CX - P.legX + 10, P.knee], [CX + P.legX + 10, P.knee - 10, CX + P.legX - 10, P.knee]], '#45474f') });
  },
};
const shiny: Garment = {
  id: 'shiny-leggings', slot: 'bottom',
  legs(c, P) {
    trousers(c, P, '#16161a', { hem: P.ankle - 8, inside: (p) => {
      for (const s of [-1, 1]) {
        stroke(p, (q) => {
          q.moveTo(CX + s * (P.legX - 6), P.crotch - 40);
          q.quadraticCurveTo(CX + s * (P.legX - 2), P.knee, CX + s * (P.legX - 8), P.ankle - 30);
        }, 7, '#5a5d68', 0.7);
        stroke(p, (q) => {
          q.moveTo(CX + s * (P.legX - 10), P.knee - 60);
          q.quadraticCurveTo(CX + s * (P.legX - 6), P.knee - 20, CX + s * (P.legX - 10), P.knee + 20);
        }, 3, '#9a9eab', 0.8);
      }
    } });
  },
};
const hockeyPants: Garment = {
  id: 'hockey-pants', slot: 'bottom',
  legs(c, P) {
    const teal = '#20c9a0', hem = between(P.crotch, P.knee, 0.4);
    for (const s of [-1, 1]) shape(c, limb([[CX + s * P.legX, hem - 16, P.legW + 6], [CX + s * P.legX, P.knee + 8, P.legW + 4], [CX + s * P.legX, P.ankle - 2, P.legW - 2]]), '#232328', { cel: [6, 0, -0.2], inside: (p) => {
      p.fillStyle = teal;
      p.fillRect(0, P.knee - 12, W, 10);
      p.fillRect(0, P.knee + 6, W, 6);
    } });
    shape(c, (p) => {
      p.moveTo(CX - P.sh + 4, P.waist + 6);
      p.lineTo(CX + P.sh - 4, P.waist + 6);
      p.quadraticCurveTo(CX + P.sh + 10, (P.waist + hem) / 2, CX + P.sh + 2, hem);
      p.lineTo(CX + 8, hem + 2);
      p.lineTo(CX + 4, P.crotch - 6);
      p.lineTo(CX - 4, P.crotch - 6);
      p.lineTo(CX - 8, hem + 2);
      p.lineTo(CX - P.sh - 2, hem);
      p.quadraticCurveTo(CX - P.sh - 10, (P.waist + hem) / 2, CX - P.sh + 4, P.waist + 6);
      p.closePath();
    }, '#1c1c20', { cel: [8, 5, -0.2], inside: (p) => {
      folds(p, [[CX - P.sh + 4, P.waist + 50, CX - P.sh + 30, P.waist + 70], [CX + P.sh - 4, P.waist + 50, CX + P.sh - 30, P.waist + 70]], '#3a3a42');
      p.fillStyle = teal;
      p.fillRect(CX - P.sh - 20, hem - 16, 20, 20);
    } });
  },
};
const camo: Garment = {
  id: 'camo-joggers', slot: 'bottom',
  legs(c, P) {
    const hem = P.ankle - 12;
    // grey camo spots, drawn inside the trousers' shape
    const t = trousers(c, P, '#8d949c', { hem, wide: 4, inside: (p) => {
      const spots: [number, number, number, number][] = [[-50, 0.1, 22, 12], [30, 0.2, 18, 10], [-20, 0.38, 16, 9], [50, 0.5, 20, 11], [-40, 0.68, 18, 10], [20, 0.78, 22, 11], [-60, 0.55, 14, 8], [60, 0.12, 14, 9], [0, 0.6, 12, 8]];
      for (const [dx, f, rx, ry] of spots) blob(p, CX + dx, between(P.waist, hem, f), rx, ry, '#c4c8cc', 0.95, 0.4);
      for (const [dx, f, rx, ry] of spots) blob(p, CX + dx + 20, between(P.waist, hem, f) + 22, rx * 0.6, ry * 0.6, '#5c6670', 0.95, -0.3);
      folds(p, [[CX - P.legX - 12, P.knee - 10, CX - P.legX + 10, P.knee], [CX + P.legX + 12, P.knee - 10, CX + P.legX - 10, P.knee]], '#6c737c');
    } });
    for (const s of [-1, 1]) shape(c, (p) => p.roundRect(CX + s * P.legX - 26, t.hem - 12, 52, 18, 7), '#7c838b', { line: 4.5 });
  },
};
const shorts: Garment = {
  id: 'shorts', slot: 'bottom',
  legs(c, P) {
    const col = '#e6e0d2', hem = between(P.crotch, P.knee, 0.8);
    trousers(c, P, col, { hem, inside: (p, t) => folds(p, [
      [CX - t.out0 + 18, P.waist + 14, CX - t.out0 + 56, P.waist + 44, -10],
      [CX + t.out0 - 18, P.waist + 14, CX + t.out0 - 56, P.waist + 44, 10],
      [CX - 2, P.waist + 6, CX + 2, P.crotch - 10, 4],
    ], sh(col, -0.2)) });
    for (const s of [-1, 1]) shape(c, (p) => p.roundRect(CX + s * P.legX - P.legW * 0.6, hem - 14, P.legW * 1.2, 16, 5), sh(col, -0.04), { line: 4.5 });
  },
};
const pleated: Garment = {
  id: 'pleated-skirt', slot: 'bottom',
  legs(c, P) {
    const teal = '#1e7f74', top = P.waist + 10, hem = between(P.crotch, P.knee, 0.22), w0 = P.sh - 10, w1 = P.sh + 52;
    shape(c, (p) => {
      p.moveTo(CX - w0, top);
      p.lineTo(CX + w0, top);
      p.quadraticCurveTo(CX + w1 - 22, (top + hem) / 2, CX + w1, hem);
      for (let i = 0; i <= 12; i++) p.lineTo(CX + w1 - (i * 2 * w1) / 12, hem + (i % 2 ? 8 : 0));
      p.quadraticCurveTo(CX - w1 + 22, (top + hem) / 2, CX - w0, top);
      p.closePath();
    }, teal, { cel: [8, 4, -0.22], inside: (p) => {
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12;
        const x0 = CX - w0 + t * w0 * 2, x1 = CX - w1 + t * w1 * 2;
        p.fillStyle = i % 2 ? sh(teal, -0.18) : sh(teal, 0.1);
        p.beginPath();
        p.moveTo(x0 - 3, top + 4);
        p.lineTo(x0 + 3, top + 4);
        p.lineTo(x1 + 8, hem + 10);
        p.lineTo(x1 - 8, hem + 10);
        p.closePath();
        p.fill();
      }
    } });
  },
  waist(c, P) {
    const teal = '#1e7f74', y = P.waist - 6;
    shape(c, (p) => p.roundRect(CX - P.sh + 6, y, (P.sh - 6) * 2, 26, 10), sh(teal, 0.05), { cel: [4, 3, -0.15], line: 5.5 });
    stroke(c, (p) => {
      for (const s of [-1, 1]) {
        p.moveTo(CX + s * 6, y + 8);
        p.quadraticCurveTo(CX + s * 20, y + 2, CX + s * 22, y + 12);
        p.quadraticCurveTo(CX + s * 18, y + 20, CX + s * 6, y + 10);
        p.moveTo(CX + s * 4, y + 12);
        p.lineTo(CX + s * 9, y + 36);
      }
    }, 3, sh(teal, 0.45));
  },
};
const footballShorts: Garment = {
  id: 'football-shorts', slot: 'bottom',
  legs(c, P) {
    const hem = between(P.crotch, P.knee, 0.22);
    for (const s of [-1, 1]) shape(c, limb([[CX + s * P.legX, P.knee - 16, P.legW + 2], [CX + s * P.legX, P.knee + 30, P.legW - 2], [CX + s * P.legX, P.ankle - 2, P.legW - 6]]), '#1f1f23', { cel: [5, 0, -0.2], inside: (p) => folds(p, [[CX + s * P.legX - 14, P.knee + 20, CX + s * P.legX + 10, P.knee + 26]], '#3c3c44') });
    shape(c, (p) => {
      p.moveTo(CX - P.sh + 6, P.waist);
      p.lineTo(CX + P.sh - 6, P.waist);
      p.quadraticCurveTo(CX + P.sh + 6, (P.waist + hem) / 2, CX + P.sh + 2, hem);
      p.lineTo(CX + 8, hem + 2);
      p.lineTo(CX + 4, P.crotch - 18);
      p.lineTo(CX - 4, P.crotch - 18);
      p.lineTo(CX - 8, hem + 2);
      p.lineTo(CX - P.sh - 2, hem);
      p.quadraticCurveTo(CX - P.sh - 6, (P.waist + hem) / 2, CX - P.sh + 6, P.waist);
      p.closePath();
    }, '#1e1f24', { cel: [8, 5, -0.2], inside: (p) => folds(p, [[CX - 40, hem - 12, CX - 24, hem - 26], [CX + 40, hem - 12, CX + 24, hem - 26]], '#3a3a42') });
  },
};
const floral: Garment = {
  id: 'floral-skirt', slot: 'bottom',
  legs(c, P) {
    const top = P.waist - 30, hem = P.ankle;
    shape(c, (p) => {
      p.moveTo(CX - P.sh + 8, top);
      p.lineTo(CX + P.sh - 8, top);
      p.quadraticCurveTo(CX + P.sh + 20, between(top, hem, 0.45), CX + P.sh + 34, hem);
      p.quadraticCurveTo(CX, hem + 12, CX - P.sh - 30, hem);
      p.quadraticCurveTo(CX - P.sh - 18, between(top, hem, 0.45), CX - P.sh + 8, top);
      p.closePath();
    }, '#f3f0f7', { cel: [10, 6, -0.1], inside: (p) => {
      let n = 11;
      const rnd = () => ((n = (n * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 26; i++) {
        const x = CX - 100 + rnd() * 200, y = top + 10 + rnd() * (hem - top), a = rnd() * Math.PI;
        const col = ['#b9a6e0', '#f2a5c0', '#9dd4b0', '#d7c9ef', '#f7c6d6'][i % 5];
        blob(p, x, y, 18 + rnd() * 10, 6 + rnd() * 3, col, 0.9, a);
      }
      for (let i = 0; i < 8; i++) {
        const x = CX - 80 + rnd() * 160, y = top + 30 + rnd() * (hem - top - 40);
        for (let k = 0; k < 5; k++) blob(p, x + Math.cos(k * 1.26) * 6, y + Math.sin(k * 1.26) * 6, 4.5, 4.5, '#ec7fa6', 0.9);
        blob(p, x, y, 3, 3, '#ffd166');
      }
      folds(p, [[CX - 60, top + 140, CX - 70, hem - 6, -4], [CX + 70, top + 140, CX + 84, hem - 6, 4]], '#c8bfd8');
    } });
    stroke(c, (p) => {
      p.moveTo(CX + 30, top + 4);
      p.quadraticCurveTo(CX - 20, between(top, hem, 0.6), CX - 40, hem + 4);
    }, 4, '#a89cbf');
  },
  waist(c, P) {
    shape(c, (p) => p.roundRect(CX - P.sh + 6, P.waist - 34, (P.sh - 6) * 2, 18, 6), '#f3f0f7', { line: 4.5, inside: (p) => blob(p, CX + 20, P.waist - 25, 14, 5, '#b9a6e0', 0.9) });
  },
};

// ------------------------------------------------------------------ shoes
const feetOf = (P: Plan) => ({ k: kid(P) ? 0.84 : P.kind === 'woman' ? 0.92 : 1, top: P.ankle - 6 });
const trainers = (id: string, col: string, o: { stripe?: string; lace?: string; sole?: string; inside?: (x: number) => (p: Ctx) => void } = {}): Garment => ({
  id, slot: 'shoes',
  feet(c, P) {
    for (const s of [-1, 1]) {
      const x = CX + s * P.legX;
      trainer(c, x, s, col, { ...feetOf(P), stripe: o.stripe, lace: o.lace, sole: o.sole, inside: o.inside?.(x) });
    }
  },
});
const rainbow = (x: number) => (p: Ctx) => {
  ['#ff5d8f', '#ffb347', '#ffe066', '#7bd389', '#5dade2', '#a37cf0'].forEach((col, i) => blob(p, x - 30 + i * 12, 856 + (i % 2) * 10, 16, 12, col, 0.85, 0.5));
};
const knitLines = (x: number) => (p: Ctx) => stroke(p, (q) => {
  for (let y = 846; y < 878; y += 6) {
    q.moveTo(x - 30, y);
    q.lineTo(x + 30, y + 2);
  }
}, 1.5, '#454b5c', 0.8);
const redSocks: Garment = {
  id: 'red-socks', slot: 'shoes',
  feet(c, P) {
    for (const s of [-1, 1]) sockFoot(c, CX + s * P.legX, s, '#7a2633', { k: feetOf(P).k, toe: '#5c1a25', stripes: [[812, 6], [824, 6]], stripeCol: '#d98a96' });
  },
};
const sandals: Garment = {
  id: 'sandals', slot: 'shoes',
  feet(c, P) {
    const k = feetOf(P).k;
    for (const s of [-1, 1]) {
      const x = CX + s * P.legX, M = (dx: number) => x + s * dx * k;
      shape(c, (p) => p.roundRect(Math.min(M(-22), M(48)), 890, 70 * k, 8, 4), '#1f1f23', { line: 3 });
      const straps = (p: Ctx) => {
        p.moveTo(M(-12), 852);
        p.quadraticCurveTo(M(10), 870, M(26), 872);
        p.moveTo(M(14), 846);
        p.lineTo(M(16), 868);
      };
      stroke(c, straps, 6.5, INK);
      stroke(c, straps, 3.5, '#1f1f23');
      for (const [dx, dy] of [[-2, 858], [8, 864], [18, 868]]) shape(c, (p) => p.arc(M(dx), dy, 3.6, 0, TAU), '#2b2b30', { line: 2 });
    }
  },
};
const bare: Garment = {
  id: 'bare', slot: 'shoes',
  tile(c, P, d) {
    for (const s of [-1, 1]) bareFoot(c, P, s, d.skin);
  },
};

// ------------------------------------------------------------------ costumes: over everything, or instead of top and bottoms
const ROBE = '#2c2d35';
const wizardRobe: Garment = {
  id: 'robe', slot: 'costume',
  outer(c, P, d) {
    robeHood(c, P, ROBE);
    robe(c, P, ROBE);
    if (!d.alone) neck(c, P, d.skin);
  },
};
const RED = '#d92b2b';
const redCape: Garment = {
  id: 'red-cape', slot: 'costume',
  back(c, P) {
    shape(c, (p) => {
      p.moveTo(CX - P.sh + 4, P.sy - 4);
      p.quadraticCurveTo(CX - P.sh - 40, P.sy + 200, CX - P.sh - 46, P.knee - 40);
      p.lineTo(CX - P.sh - 20, P.knee - 54);
      p.lineTo(CX - P.sh + 2, P.knee - 30);
      p.lineTo(CX + P.sh - 2, P.knee - 30);
      p.lineTo(CX + P.sh + 20, P.knee - 54);
      p.lineTo(CX + P.sh + 46, P.knee - 40);
      p.quadraticCurveTo(CX + P.sh + 40, P.sy + 200, CX + P.sh - 4, P.sy - 4);
      p.closePath();
    }, RED, { cel: [10, 6, -0.3] });
    hoodBack(c, P, RED, 1.3);
  },
  outer(c, P) {
    for (const s of [-1, 1]) {
      shape(c, (p) => {
        p.moveTo(CX + s * (P.neckW + 6), P.sy - 30);
        p.quadraticCurveTo(CX + s * (P.sh + 30), P.sy - 10, CX + s * (P.sh + 34), P.sy + 60);
        p.quadraticCurveTo(CX + s * (P.sh + 40), P.sy + 200, CX + s * (P.sh + 30), P.sy + 300);
        p.lineTo(CX + s * (P.sh + 6), P.sy + 290);
        p.lineTo(CX + s * (P.sh - 8), P.sy + 312);
        p.quadraticCurveTo(CX + s * (P.sh - 30), P.sy + 160, CX + s * 34, P.sy + 30);
        p.closePath();
      }, RED, { cel: [s < 0 ? 6 : 10, 6, -0.22], inside: (p) => folds(p, [[CX + s * (P.sh + 10), P.sy + 60, CX + s * (P.sh + 4), P.sy + 260, s * 6], [CX + s * (P.sh - 14), P.sy + 120, CX + s * (P.sh - 18), P.sy + 280, s * 4]], sh(RED, -0.3)) });
    }
  },
  front(c, P) {
    hoodRim(c, P, RED, { m: 1.3, open: 1.24, openH: 0.76, openY: 0.02 });
    for (const s of [-1, 1]) {
      shape(c, (p) => {
        p.moveTo(CX, P.sy - 16);
        p.quadraticCurveTo(CX + s * 30, P.sy - 44, CX + s * 40, P.sy - 14);
        p.quadraticCurveTo(CX + s * 30, P.sy + 4, CX, P.sy - 16);
        p.closePath();
      }, RED, { cel: [2, 2, -0.2], line: 5 });
      shape(c, (p) => {
        p.moveTo(CX - s * 2, P.sy - 10);
        p.quadraticCurveTo(CX + s * 14, P.sy + 30, CX + s * 8, P.sy + 76);
        p.lineTo(CX + s * 20, P.sy + 70);
        p.quadraticCurveTo(CX + s * 26, P.sy + 26, CX + s * 8, P.sy - 12);
        p.closePath();
      }, RED, { cel: [2, 2, -0.2], line: 5 });
    }
    shape(c, (p) => p.ellipse(CX, P.sy - 14, 10, 9, 0, 0, TAU), sh(RED, -0.1), { line: 4.5 });
  },
};
const FLEECE = '#d8d4cb';
const koalaOnesie: Garment = {
  id: 'koala-onesie', slot: 'costume', full: true,
  back(c, P) {
    hoodBack(c, P, FLEECE, 1.3);
  },
  legs(c, P) {
    trousers(c, P, FLEECE, { hem: P.ankle + 4, wide: 8, hips: 6, inside: (p) => folds(p, [
      [CX - P.legX - 20, P.knee - 40, CX - P.legX + 10, P.knee - 20],
      [CX + P.legX + 20, P.knee - 40, CX + P.legX - 10, P.knee - 20],
      [CX - P.legX - 22, P.ankle - 14, CX - P.legX + 20, P.ankle - 10, 6],
      [CX + P.legX + 22, P.ankle - 14, CX + P.legX - 20, P.ankle - 10, -6],
    ], sh(FLEECE, -0.18)) });
  },
  body(c, P) {
    const arms = dressed(c, P, FLEECE, { hem: P.waist + 40, loose: 14, tummy: 6, inside: (p) => folds(p, [[CX - P.sh + 26, P.sy + 130, CX - P.sh + 48, P.sy + 200, 6]], sh(FLEECE, -0.18)) });
    const belly = '#f5f3ee';
    shape(c, (p) => p.ellipse(CX, (P.sy + P.crotch) / 2 - 20, P.sh * 0.62, (P.crotch - P.sy) / 2 - 10, 0, 0, TAU), belly, { cel: [8, 6, -0.08] });
    for (let i = 0; i < 4; i++) shape(c, (p) => p.arc(CX, P.sy + 40 + i * 50 * (kid(P) ? 0.8 : 1), 4, 0, TAU), '#ffffff', { line: 2.5 });
    for (const pts of arms) cuff(c, pts, '#2a2a2e', 14, 22);
  },
  front(c, P) {
    hoodRim(c, P, FLEECE, { m: 1.3, open: 1.14, openH: 0.7, openY: 0.03 });
    for (const s of [-1, 1]) {
      const ex = CX + s * P.hw * 1.0, ey = P.top - P.hh * 0.1;
      shape(c, (p) => p.arc(ex, ey, P.hw * 0.36, 0, TAU), FLEECE, { cel: [4, 4, -0.18] });
      shape(c, (p) => p.arc(ex, ey + 4, P.hw * 0.22, 0, TAU), '#efc3c9', { line: 3.5 });
    }
    blob(c, CX, P.top - P.hh * 0.16, 15, 11, '#26272c');
    for (const s of [-1, 1]) blob(c, CX + s * 34, P.top - P.hh * 0.2, 6, 6, '#26272c');
  },
};
const HERO_RED = '#d8262e', HERO_BLUE = '#2f6fd6';
const heroSuit: Garment = {
  id: 'hero-suit', slot: 'costume', full: true, noShoes: true, hands: HERO_RED,
  legs(c, P) {
    trousers(c, P, HERO_BLUE, { hem: P.ankle, inside: (p) => {
      for (let y = P.waist; y < P.ankle + 10; y += 16) for (let x = 60; x < 360; x += 16) blob(p, x + ((y / 16) % 2) * 8, y, 2.2, 2.2, '#5b8fe6', 0.6);
    } });
    const k = feetOf(P).k;
    for (const s of [-1, 1]) {
      const x = CX + s * P.legX, M = (dx: number) => x + s * dx * k;
      const boot = limb([[x, P.knee - 24, P.legW + 10], [x, P.knee + 30, P.legW + 6], [x, 868, P.legW + 2]]);
      const foot = (p: Ctx) => {
        p.moveTo(M(-26), 862);
        p.lineTo(M(22), 862);
        p.quadraticCurveTo(M(50), 868, M(52), 886);
        p.quadraticCurveTo(M(52), 897, M(38), 897);
        p.lineTo(M(-22), 897);
        p.quadraticCurveTo(M(-30), 896, M(-28), 884);
        p.closePath();
      };
      group(c, [boot, foot], HERO_RED, [s * -5, 4, -0.22], LW);
    }
  },
  body(c, P) {
    const L = hangPts(P, -1), R = hangPts(P, 1);
    dressed(c, P, HERO_RED, { hem: P.hem + 4, loose: 10, inside: (p) => {
      p.fillStyle = HERO_BLUE;
      p.beginPath();
      for (const s of [-1, 1]) {
        p.moveTo(CX + s * (P.sh + 30), P.sy + 110);
        p.quadraticCurveTo(CX + s * 40, P.sy + 160, CX + s * 46, P.hem - 36);
        p.lineTo(CX + s * 60, P.hem + 24);
        p.lineTo(CX + s * (P.sh + 30), P.hem + 24);
        p.closePath();
      }
      p.fill();
      for (const pts of [L, R]) blob(p, pts[1][0], pts[1][1] + 30, 14, 40, HERO_BLUE);
      folds(p, [
        [CX - 50, P.sy + 90, CX - 6, P.sy + 104, 8], [CX + 50, P.sy + 90, CX + 6, P.sy + 104, -8],
        [CX - 26, P.sy + 150, CX + 26, P.sy + 150, 6], [CX - 24, P.sy + 196, CX + 24, P.sy + 196, 6], [CX, P.sy + 120, CX, P.sy + 240, 0],
      ], sh(HERO_RED, -0.32));
    } });
    shape(c, (p) => {
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 13 : 30;
        const x = CX + Math.cos(a) * r, y = P.sy + 64 + Math.sin(a) * r;
        if (i) p.lineTo(x, y);
        else p.moveTo(x, y);
      }
      p.closePath();
    }, '#ffd43b', { line: 4.5 });
  },
};

// ------------------------------------------------------------------ scarves
const scarfOf = (id: string, cols: string[]): Garment => ({ id, slot: 'neck', neck: (c, P) => scarf(c, P, cols) });

export const GARMENTS: Garment[] = [
  henley, sweatshirt, jersey, fleece, polo, bowTee, footballTop, tank, turtleneck, boatJumper, hoodie, puffer,
  jeans, leggings, shiny, hockeyPants, camo, shorts, pleated, footballShorts, floral,
  trainers('trainers-dark', '#33363d', { stripe: '#9aa3ad' }),
  trainers('trainers-white', '#f1f2f4', { stripe: '#b8c0c8', lace: '#c6ccd2', sole: '#ffffff' }),
  trainers('trainers-black', '#2a2b30', { stripe: '#e9ecef' }),
  trainers('trainers-rainbow', '#c45ab3', { lace: '#2b2b30', sole: '#f4f4f4', inside: rainbow }),
  trainers('trainers-knit', '#2c3140', { lace: '#1a1d26', sole: '#b98a5a', inside: knitLines }),
  redSocks, sandals, bare,
  wizardRobe, redCape, koalaOnesie, heroSuit,
  scarfOf('scarf-blue', ['#2f5fa8', '#e9eef5']), scarfOf('scarf-red', ['#a8232f', '#e8b830']), scarfOf('scarf-green', ['#2e7d4f', '#eef1ec']),
];
export const garment = (id: string | undefined) => (id ? GARMENTS.find((g) => g.id === id) : undefined);
/** The tabs in the dress-up screen, in order. */
export const SLOTS: Slot[] = ['top', 'bottom', 'shoes', 'costume', 'neck'];
