import { starPath } from '../../makerArt';
import {
  blob, CX, cuff, dressed, folds, group, hoodBack, hoodRim, INK, limb, line, neck, robe, robeHood, sh, shape, stroke, TAU, trousers, W,
  type Ctx, type Plan,
} from '../figure';
import type { Garment } from '../types';

/** Costumes: animal onesies with hoods, and dressing-up outfits (astronaut, firefighter, knight, mermaid, pirate, bee, chef, doctor...). */
const between = (a: number, b: number, t: number) => a + (b - a) * t;

// ------------------------------------------------------------------ onesies
type Ears = 'round' | 'long' | 'pointy' | 'none';
function onesie(id: string, col: string, belly: string, o: { ears: Ears; inner?: string; horn?: boolean; mane?: string[]; spikes?: string; stripes?: string; face?: boolean; cuffs?: string }): Garment {
  const stripeIt = (p: Ctx) => {
    if (!o.stripes) return;
    stroke(p, (q) => {
      for (let y = 200; y < 900; y += 46) {
        q.moveTo(0, y);
        q.quadraticCurveTo(60, y + 16, 110, y + 4);
        q.moveTo(W, y + 20);
        q.quadraticCurveTo(W - 60, y + 36, W - 110, y + 24);
      }
    }, 9, o.stripes);
  };
  return {
    id, slot: 'costume', full: true,
    back(c, P) {
      if (o.mane) o.mane.forEach((m, i) => shape(c, (p) => p.arc(CX + P.hw * (0.9 + i * 0.05), P.top + P.hh * (0.1 + i * 0.16), P.hw * 0.26, 0, TAU), m, { line: 4.5 }));
      hoodBack(c, P, col, 1.3);
    },
    legs(c, P) {
      trousers(c, P, col, { hem: P.ankle + 4, wide: 8, hips: 6, inside: (p) => {
        stripeIt(p);
        folds(p, [[CX - P.legX - 22, P.ankle - 14, CX - P.legX + 20, P.ankle - 10, 6], [CX + P.legX + 22, P.ankle - 14, CX + P.legX - 20, P.ankle - 10, -6]], sh(col, -0.18));
      } });
    },
    body(c, P) {
      const arms = dressed(c, P, col, { hem: P.waist + 40, loose: 14, tummy: 6, inside: stripeIt });
      shape(c, (p) => p.ellipse(CX, (P.sy + P.crotch) / 2 - 20, P.sh * 0.6, (P.crotch - P.sy) / 2 - 10, 0, 0, TAU), belly, { cel: [8, 6, -0.08] });
      for (const pts of arms) cuff(c, pts, o.cuffs ?? sh(col, -0.15), 14, 22);
    },
    front(c, P) {
      hoodRim(c, P, col, { m: 1.3, open: 1.14, openH: 0.7, openY: 0.03 });
      const ey = P.top - P.hh * 0.1;
      if (o.ears === 'round') for (const s of [-1, 1]) {
        shape(c, (p) => p.arc(CX + s * P.hw, ey, P.hw * 0.36, 0, TAU), col, { cel: [4, 4, -0.18] });
        shape(c, (p) => p.arc(CX + s * P.hw, ey + 4, P.hw * 0.22, 0, TAU), o.inner ?? '#efc3c9', { line: 3.5 });
      }
      if (o.ears === 'long') for (const s of [-1, 1]) {
        shape(c, (p) => p.ellipse(CX + s * P.hw * 0.5, ey - P.hh * 0.22, P.hw * 0.2, P.hh * 0.32, s * 0.15, 0, TAU), col, { cel: [3, 4, -0.18] });
        shape(c, (p) => p.ellipse(CX + s * P.hw * 0.5, ey - P.hh * 0.2, P.hw * 0.1, P.hh * 0.22, s * 0.15, 0, TAU), o.inner ?? '#ffffff', { line: 3 });
      }
      if (o.ears === 'pointy') for (const s of [-1, 1]) {
        shape(c, (p) => {
          p.moveTo(CX + s * P.hw * 0.45, ey + P.hh * 0.06);
          p.lineTo(CX + s * P.hw * 0.95, ey - P.hh * 0.24);
          p.lineTo(CX + s * P.hw * 1.12, ey + P.hh * 0.12);
          p.closePath();
        }, col, { cel: [3, 3, -0.18] });
        shape(c, (p) => {
          p.moveTo(CX + s * P.hw * 0.62, ey + P.hh * 0.04);
          p.lineTo(CX + s * P.hw * 0.93, ey - P.hh * 0.14);
          p.lineTo(CX + s * P.hw * 1.02, ey + P.hh * 0.08);
          p.closePath();
        }, o.inner ?? '#efc3c9', { line: 3 });
      }
      if (o.spikes) for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.18 + i * 0.16), r = P.hw * 1.12;
        const x = CX + Math.cos(a) * r, y = P.top + P.hh * 0.4 + Math.sin(a) * P.hh * 0.7;
        shape(c, (p) => {
          p.moveTo(x - Math.sin(a) * 14, y + Math.cos(a) * 14);
          p.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26);
          p.lineTo(x + Math.sin(a) * 14, y - Math.cos(a) * 14);
          p.closePath();
        }, o.spikes, { line: 3.5 });
      }
      if (o.horn) {
        shape(c, (p) => {
          p.moveTo(CX - 14, P.top - P.hh * 0.18);
          p.lineTo(CX, P.top - P.hh * 0.48);
          p.lineTo(CX + 14, P.top - P.hh * 0.18);
          p.closePath();
        }, '#ffd43b', { line: 4, inside: (p) => stroke(p, (q) => {
          for (let i = 1; i < 4; i++) {
            q.moveTo(CX - 14, P.top - P.hh * (0.18 + i * 0.07));
            q.lineTo(CX + 14, P.top - P.hh * (0.22 + i * 0.07));
          }
        }, 3, '#e0a800') });
      }
      if (o.face) {
        blob(c, CX, P.top - P.hh * 0.14, 13, 10, '#26272c');
        for (const s of [-1, 1]) blob(c, CX + s * 32, P.top - P.hh * 0.19, 6, 6, '#26272c');
      }
    },
  };
}

// ------------------------------------------------------------------ dressing-up outfits
const boots = (c: Ctx, P: Plan, col: string, height = 100) => {
  for (const s of [-1, 1]) {
    const x = CX + s * P.legX, k = P.kind === 'child' ? 0.84 : 1, M = (dx: number) => x + s * dx * k;
    group(c, [limb([[x, 896 - height, P.legW + 8], [x, 870, P.legW + 4]]), (p) => {
      p.moveTo(M(-26), 858);
      p.lineTo(M(22), 858);
      p.quadraticCurveTo(M(50), 866, M(52), 884);
      p.quadraticCurveTo(M(52), 897, M(38), 897);
      p.lineTo(M(-22), 897);
      p.quadraticCurveTo(M(-30), 896, M(-28), 882);
      p.closePath();
    }], col, [s * -5, 4, -0.25], 6);
  }
};
const astronaut: Garment = {
  id: 'astronaut', slot: 'costume', full: true, noShoes: true, hands: '#eef0f2',
  legs(c, P) {
    trousers(c, P, '#eef0f2', { wide: 6, inside: (p) => {
      for (const s of [-1, 1]) shape(p, (q) => q.roundRect(CX + s * P.legX - 22, P.knee - 22, 44, 40, 10), '#c9ced3', { line: 3.5 });
    } });
    boots(c, P, '#c9ced3', 110);
  },
  body(c, P) {
    const arms = dressed(c, P, '#eef0f2', { hem: P.waist + 30, loose: 18, inside: (p) => folds(p, [[CX - P.sh + 24, P.sy + 130, CX - P.sh + 44, P.sy + 200, 6], [CX + P.sh - 24, P.sy + 130, CX + P.sh - 44, P.sy + 200, -6]], '#c9ced3') });
    for (const pts of arms) cuff(c, pts, '#ff9f43', 18, 18);
    shape(c, (p) => p.roundRect(CX - 40, P.sy + 70, 80, 60, 10), '#c9ced3', { line: 4.5 });
    ['#e5484d', '#ffd43b', '#4dabf7', '#7bd389'].forEach((col, i) => shape(c, (p) => p.arc(CX - 24 + i * 16, P.sy + 90, 6, 0, TAU), col, { line: 2.5 }));
    shape(c, (p) => p.roundRect(CX - 26, P.sy + 106, 52, 14, 4), '#2b3a67', { line: 2.5 });
    shape(c, (p) => p.arc(CX - P.sh * 0.55, P.sy + 40, 18, 0, TAU), '#2b3a67', { line: 3.5, inside: (p) => {
      blob(p, CX - P.sh * 0.55, P.sy + 40, 8, 8, '#ff9f43');
      stroke(p, (q) => q.ellipse(CX - P.sh * 0.55, P.sy + 40, 15, 5, -0.4, 0, TAU), 2, '#ffffff');
    } });
    shape(c, (p) => p.roundRect(CX - P.neckW - 14, P.sy - 24, (P.neckW + 14) * 2, 26, 10), '#c9ced3', { line: 5 });
  },
};
const firefighter: Garment = {
  id: 'firefighter', slot: 'costume', full: true, noShoes: true, long: true,
  legs(c, P) {
    trousers(c, P, '#b8925a', { wide: 8, inside: (p) => {
      p.fillStyle = '#ffe066';
      p.fillRect(0, P.knee + 30, W, 12);
      p.fillStyle = '#d6d6d0';
      p.fillRect(0, P.knee + 42, W, 8);
    } });
    boots(c, P, '#26282f', 80);
  },
  body(c, P) {
    const hem = between(P.crotch, P.knee, 0.35);
    const arms = dressed(c, P, '#b8925a', { hem, loose: 18, inside: (p) => {
      for (const y of [P.sy + 120, hem - 40]) {
        p.fillStyle = '#ffe066';
        p.fillRect(0, y, W, 14);
        p.fillStyle = '#d6d6d0';
        p.fillRect(0, y + 14, W, 8);
      }
    } });
    for (const pts of arms) cuff(c, pts, '#ffe066', 18, 18);
    stroke(c, line([[CX, P.sy], [CX, hem]]), 4, '#8a6a3e');
    for (let y = P.sy + 40; y < hem; y += 50) shape(c, (p) => p.roundRect(CX - 10, y, 20, 8, 3), '#3a3a3a', { line: 2 });
    shape(c, (p) => p.roundRect(CX - P.neckW - 16, P.sy - 34, (P.neckW + 16) * 2, 38, 10), '#b8925a', { line: 5 });
  },
};
const knight: Garment = {
  id: 'knight', slot: 'costume', full: true, noShoes: true, hands: '#9aa3ad',
  legs(c, P) {
    trousers(c, P, '#7d858f', { inside: (p) => {
      for (let y = P.waist; y < P.ankle; y += 12) for (let x = 0; x < W; x += 12) blob(p, x + ((y / 12) % 2) * 6, y, 3, 3, '#9aa3ad');
    } });
    for (const s of [-1, 1]) shape(c, (p) => p.ellipse(CX + s * P.legX, P.knee, P.legW * 0.62, 22, 0, 0, TAU), '#d6dbe0', { line: 4 });
    boots(c, P, '#c9ced3', 90);
  },
  body(c, P) {
    const arms = dressed(c, P, '#c9ced3', { hem: P.waist + 40, loose: 16, cel: [12, 8, -0.22], inside: (p) => {
      stroke(p, (q) => {
        for (let y = P.waist - 40; y < P.waist + 40; y += 22) {
          q.moveTo(CX - P.sh, y);
          q.lineTo(CX + P.sh, y);
        }
      }, 3, '#8f969e');
      blob(p, CX - 30, P.sy + 50, 34, 14, '#ffffff', 0.45);
    } });
    for (const pts of arms) cuff(c, pts, '#9aa3ad', 16, 16);
    shape(c, (p) => {
      p.moveTo(CX - 34, P.sy + 50);
      p.lineTo(CX + 34, P.sy + 50);
      p.lineTo(CX + 34, P.sy + 100);
      p.quadraticCurveTo(CX + 30, P.sy + 136, CX, P.sy + 150);
      p.quadraticCurveTo(CX - 30, P.sy + 136, CX - 34, P.sy + 100);
      p.closePath();
    }, '#4d6fd6', { line: 4.5, inside: (p) => {
      p.beginPath();
      starPath(p, CX, P.sy + 96, 22, 5, 0.45);
      p.fillStyle = '#ffd43b';
      p.fill();
    } });
  },
};
const mermaid: Garment = {
  id: 'mermaid', slot: 'costume', full: true, noShoes: true,
  legs(c, P) {
    const col = '#2bb5a6';
    shape(c, (p) => {
      p.moveTo(CX - P.sh + 6, P.waist - 10);
      p.lineTo(CX + P.sh - 6, P.waist - 10);
      p.quadraticCurveTo(CX + P.sh + 6, P.knee, CX + 30, 840);
      p.lineTo(CX - 30, 840);
      p.quadraticCurveTo(CX - P.sh - 6, P.knee, CX - P.sh + 6, P.waist - 10);
      p.closePath();
    }, col, { cel: [8, 4, -0.2], inside: (p) => {
      for (let y = P.waist, row = 0; y < 850; y += 18, row++) for (let x = 60 + (row % 2) * 12; x < W - 50; x += 24) stroke(p, (q) => q.arc(x, y, 10, 0.1 * Math.PI, 0.9 * Math.PI), 2.5, sh(col, 0.3));
    } });
    // the fin
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(CX, 832);
      p.quadraticCurveTo(CX + s * 40, 830, CX + s * 92, 900);
      p.quadraticCurveTo(CX + s * 50, 886, CX, 868);
      p.closePath();
    }, '#7fe0d4', { line: 4.5, inside: (p) => stroke(p, (q) => {
      for (let i = 1; i < 4; i++) {
        q.moveTo(CX, 840 + i * 6);
        q.lineTo(CX + s * (30 + i * 18), 870 + i * 8);
      }
    }, 2.5, '#2bb5a6') });
  },
  body(c, P) {
    for (const s of [-1, 1]) shape(c, (p) => p.ellipse(CX + s * P.sh * 0.32, P.sy + 54, P.sh * 0.28, P.sh * 0.22, 0, Math.PI, 0), '#b06ad8', { line: 4, inside: (p) => stroke(p, (q) => {
      for (let i = -2; i <= 2; i++) {
        q.moveTo(CX + s * P.sh * 0.32, P.sy + 54);
        q.lineTo(CX + s * P.sh * 0.32 + i * 10, P.sy + 34);
      }
    }, 2, '#8a4ab8') });
    for (const s of [-1, 1]) stroke(c, line([[CX + s * P.sh * 0.3, P.sy + 36], [CX + s * P.sh * 0.5, P.sy - 4]]), 4, '#b06ad8');
  },
};
const pirate: Garment = {
  id: 'pirate', slot: 'costume', full: true, noShoes: true,
  legs(c, P) {
    trousers(c, P, '#2b2b31', { hem: P.knee + 20 });
    for (const s of [-1, 1]) shape(c, limb([[CX + s * P.legX, P.knee + 10, P.legW], [CX + s * P.legX, P.ankle, P.legW - 8]]), '#f4f2ea', { cel: [5, 0, -0.1], inside: (p) => {
      p.fillStyle = '#e5484d';
      for (let y = P.knee + 10; y < P.ankle; y += 22) p.fillRect(0, y, W, 11);
    } });
    boots(c, P, '#3b2a20', 70);
  },
  body(c, P) {
    const arms = dressed(c, P, '#f4f2ea', { hem: P.waist + 20, loose: 26, inside: (p) => folds(p, [[CX - 30, P.sy + 30, CX - 20, P.sy + 120, 4], [CX + 30, P.sy + 30, CX + 20, P.sy + 120, -4]], '#d6d2c6') });
    for (const pts of arms) cuff(c, pts, '#ffffff', 26, 16);
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(CX + s * 24, P.sy - 2);
      p.lineTo(CX + s * (P.sh - 4), P.sy + 10);
      p.lineTo(CX + s * (P.sh - 10), P.waist - 6);
      p.lineTo(CX + s * 30, P.waist - 6);
      p.closePath();
    }, '#2b2b31', { line: 4.5 });
    shape(c, (p) => p.roundRect(CX - P.sh + 6, P.waist - 14, (P.sh - 6) * 2, 26, 6), '#e5484d', { line: 4.5 });
    shape(c, (p) => {
      p.moveTo(CX + P.sh * 0.5, P.waist + 4);
      p.lineTo(CX + P.sh * 0.62, P.waist + 70);
      p.lineTo(CX + P.sh * 0.36, P.waist + 66);
      p.closePath();
    }, '#e5484d', { line: 4 });
  },
};
const bee: Garment = {
  id: 'bee', slot: 'costume', full: true,
  back(c, P) {
    for (const s of [-1, 1]) for (const [dy, r] of [[0, 1], [70, 0.7]] as const) shape(c, (p) => p.ellipse(CX + s * (P.sh + 30), P.sy + 40 + dy, 60 * r, 40 * r, s * -0.5, 0, TAU), 'rgba(220,240,255,0.85)', { line: 4 });
  },
  legs(c, P) {
    trousers(c, P, '#2b2b31');
  },
  body(c, P) {
    const arms = dressed(c, P, '#ffd43b', { hem: P.waist + 50, loose: 14, inside: (p) => {
      p.fillStyle = '#2b2b31';
      for (let y = P.sy + 50; y < P.waist + 60; y += 56) p.fillRect(0, y, W, 26);
    } });
    for (const pts of arms) cuff(c, pts, '#2b2b31', 14, 18);
  },
  front(c, P) {
    for (const s of [-1, 1]) {
      stroke(c, (p) => {
        p.moveTo(CX + s * P.hw * 0.3, P.top + 6);
        p.quadraticCurveTo(CX + s * P.hw * 0.4, P.top - 50, CX + s * P.hw * 0.7, P.top - 70);
      }, 7, INK);
      shape(c, (p) => p.arc(CX + s * P.hw * 0.7, P.top - 72, 11, 0, TAU), '#2b2b31', { line: 3 });
    }
    stroke(c, (p) => p.arc(CX, P.top + P.hh * 0.45, P.hw * 1.04, Math.PI * 1.12, Math.PI * 1.88), 12, INK);
    stroke(c, (p) => p.arc(CX, P.top + P.hh * 0.45, P.hw * 1.04, Math.PI * 1.12, Math.PI * 1.88), 7, '#2b2b31');
  },
};
/** Coats worn over the clothes. */
function coat(id: string, col: string, o: { length: number; buttons?: 'double' | 'single' | 'toggles'; pockets?: boolean; stars?: boolean }): Garment {
  return {
    id, slot: 'costume', long: true,
    outer(c, P) {
      const hem = between(P.crotch, P.ankle, o.length);
      const arms = dressed(c, P, col, { hem, flare: 16, loose: 18, inside: (p) => {
        if (o.stars) for (let i = 0; i < 24; i++) {
          p.beginPath();
          starPath(p, 40 + ((i * 53) % 340), P.sy + ((i * 71) % (hem - P.sy)), 9, 5, 0.45);
          p.fillStyle = '#ffd43b';
          p.fill();
        }
        folds(p, [[CX - P.sh + 24, P.sy + 140, CX - P.sh + 40, hem - 20, 6], [CX + P.sh - 24, P.sy + 140, CX + P.sh - 40, hem - 20, -6]], sh(col, -0.18));
      } });
      for (const pts of arms) cuff(c, pts, sh(col, -0.08), 18, 18);
      stroke(c, line([[CX, P.sy + 4], [CX, hem]]), 3.5, sh(col, -0.35));
      if (o.buttons === 'double') for (const s of [-1, 1]) for (let y = P.sy + 40; y < P.waist; y += 44) shape(c, (p) => p.arc(CX + s * 24, y, 5, 0, TAU), sh(col, -0.15), { line: 2.5 });
      if (o.buttons === 'single') for (let y = P.sy + 40; y < hem - 20; y += 50) shape(c, (p) => p.arc(CX + 8, y, 5, 0, TAU), sh(col, -0.15), { line: 2.5 });
      if (o.buttons === 'toggles') for (let y = P.sy + 50; y < hem - 30; y += 60) shape(c, (p) => p.roundRect(CX - 12, y, 24, 8, 4), '#8a6a3e', { line: 2.5 });
      if (o.pockets) for (const s of [-1, 1]) shape(c, (p) => p.roundRect(CX + s * P.sh * 0.5 - 22, P.waist, 44, 40, 6), sh(col, -0.05), { line: 4 });
      for (const s of [-1, 1]) shape(c, (p) => {
        p.moveTo(CX + s * 4, P.sy - 8);
        p.lineTo(CX + s * (P.neckW + 26), P.sy - 26);
        p.lineTo(CX + s * (P.neckW + 30), P.sy + 18);
        p.lineTo(CX + s * 14, P.sy + 44);
        p.closePath();
      }, col, { cel: [2, 2, -0.15], line: 4.5 });
    },
  };
}
const witchRobe: Garment = {
  id: 'witch-robe', slot: 'costume',
  outer(c, P, d) {
    robeHood(c, P, '#5b2d82');
    robe(c, P, '#5b2d82');
    for (const s of [-1, 1]) for (const [dx, f] of [[P.sh - 4, 0.3], [P.sh * 0.6, 0.55], [P.sh + 12, 0.75], [P.sh * 0.7, 0.9]] as const) shape(c, (p) => starPath(p, CX + s * dx, between(P.sy, P.ankle, f), 11, 5, 0.45), '#ffd43b', { line: 2.5 });
    if (!d.alone) neck(c, P, d.skin);
  },
};

export const COSTUMES: Garment[] = [
  onesie('unicorn-onesie', '#fbf7f2', '#ffd6e6', { ears: 'pointy', inner: '#ffc2d4', horn: true, mane: ['#ff8fab', '#c3a6ee', '#9bd8f5', '#ffe066'] }),
  onesie('dino-onesie', '#5cc96b', '#ffe8a3', { ears: 'none', spikes: '#ff9f43' }),
  onesie('bunny-onesie', '#ffc2d4', '#ffffff', { ears: 'long', inner: '#ffffff' }),
  onesie('bear-onesie', '#9a6a44', '#e0b98c', { ears: 'round', inner: '#e0b98c', face: true }),
  onesie('tiger-onesie', '#ff9f43', '#fff3e0', { ears: 'pointy', inner: '#fff3e0', stripes: '#3a2a20' }),
  astronaut, firefighter, knight, mermaid, pirate, bee,
  coat('chef-coat', '#f6f6f2', { length: 0.15, buttons: 'double' }),
  coat('lab-coat', '#f6f6f2', { length: 0.55, buttons: 'single', pockets: true }),
  coat('raincoat', '#ffd43b', { length: 0.4, buttons: 'toggles', pockets: true }),
  witchRobe,
];
