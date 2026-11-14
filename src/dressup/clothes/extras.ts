import { heartPath, starPath } from '../../makerArt';
import { blob, CX, INK, scarf, sh, shape, stroke, TAU, type Ctx, type Plan } from '../figure';
import type { Garment } from '../types';

/** Extras: things round the neck, on the face (glasses, face paint) and on the back (wings, capes, a backpack). */
const neckItem = (id: string, neck: (c: Ctx, P: Plan) => void): Garment => ({ id, slot: 'neck', neck });
const faceItem = (id: string, front: (c: Ctx, P: Plan) => void): Garment => ({ id, slot: 'face', front });

// ------------------------------------------------------------------ round the neck
/** Points along a necklace hanging from the sides of the neck down to `dip` below it. */
const chain = (P: Plan, dip: number, n: number) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, a = Math.PI * (0.05 + 0.9 * t);
  return [CX - Math.cos(a) * (P.neckW + 8), P.sy - 10 + Math.sin(a) * dip] as [number, number];
});
const chainLine = (c: Ctx, pts: [number, number][], w: number, col: string) => {
  const path = (p: Ctx) => pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  stroke(c, path, w + 3, INK);
  stroke(c, path, w, col);
};
const NECK: Garment[] = [
  neckItem('scarf-pink', (c, P) => scarf(c, P, ['#ff8fc0', '#ffffff'])),
  neckItem('pearls', (c, P) => {
    for (const [x, y] of chain(P, 40, 14)) shape(c, (p) => p.arc(x, y, 6, 0, TAU), '#f6f1e6', { line: 2.5, inside: (p) => blob(p, x - 2, y - 2, 2, 2, '#ffffff') });
  }),
  neckItem('heart-locket', (c, P) => {
    const pts = chain(P, 56, 20);
    chainLine(c, pts, 2.5, '#e0b34a');
    shape(c, (p) => heartPath(p, CX, P.sy + 58, 18), '#ffd43b', { line: 3.5 });
  }),
  neckItem('silver-chain', (c, P) => chainLine(c, chain(P, 34, 16), 4, '#e6e9ec')),
  neckItem('pendant', (c, P) => {
    chainLine(c, chain(P, 110, 24), 2, '#d9a98a');
    shape(c, (p) => p.ellipse(CX, P.sy + 114, 6, 14, 0, 0, TAU), '#f4f6f8', { line: 3 });
  }),
  neckItem('bow-tie', (c, P) => {
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(CX, P.sy + 6);
      p.lineTo(CX + s * 30, P.sy - 10);
      p.lineTo(CX + s * 30, P.sy + 22);
      p.closePath();
    }, '#e5383b', { line: 4 });
    shape(c, (p) => p.roundRect(CX - 8, P.sy - 2, 16, 16, 4), '#c22d30', { line: 3.5 });
  }),
  neckItem('tie', (c, P) => {
    shape(c, (p) => {
      p.moveTo(CX - 10, P.sy);
      p.lineTo(CX + 10, P.sy);
      p.lineTo(CX + 18, P.sy + 150);
      p.lineTo(CX, P.sy + 172);
      p.lineTo(CX - 18, P.sy + 150);
      p.closePath();
    }, '#2f5fa8', { line: 4, inside: (p) => {
      p.strokeStyle = '#ffd166';
      p.lineWidth = 4;
      for (let y = P.sy + 30; y < P.sy + 170; y += 26) {
        p.beginPath();
        p.moveTo(CX - 20, y);
        p.lineTo(CX + 20, y + 14);
        p.stroke();
      }
    } });
    shape(c, (p) => p.roundRect(CX - 13, P.sy - 6, 26, 18, 5), '#24508f', { line: 3.5 });
  }),
  neckItem('medal', (c, P) => {
    for (const s of [-1, 1]) {
      stroke(c, (p) => {
        p.moveTo(CX + s * (P.neckW + 6), P.sy - 12);
        p.lineTo(CX + s * 6, P.sy + 76);
      }, 16, INK);
      stroke(c, (p) => {
        p.moveTo(CX + s * (P.neckW + 6), P.sy - 12);
        p.lineTo(CX + s * 6, P.sy + 76);
      }, 11, s < 0 ? '#e5383b' : '#4d8fe0');
    }
    shape(c, (p) => p.arc(CX, P.sy + 96, 24, 0, TAU), '#ffd43b', { line: 4, inside: (p) => {
      p.beginPath();
      starPath(p, CX, P.sy + 96, 14, 5, 0.45);
      p.fillStyle = '#e0a800';
      p.fill();
    } });
  }),
  neckItem('lei', (c, P) => {
    for (const [i, [x, y]] of chain(P, 90, 16).entries()) {
      const col = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ee'][i % 4];
      for (let k = 0; k < 5; k++) blob(c, x + Math.cos(k * 1.26) * 7, y + Math.sin(k * 1.26) * 7, 7, 7, col);
      stroke(c, (p) => p.arc(x, y, 13, 0, TAU), 2, sh(col, -0.3), 0.5);
      blob(c, x, y, 3.5, 3.5, '#ffb703');
    }
  }),
  neckItem('bandana', (c, P) => {
    shape(c, (p) => {
      p.moveTo(CX - P.neckW - 16, P.sy - 26);
      p.quadraticCurveTo(CX, P.sy - 6, CX + P.neckW + 16, P.sy - 26);
      p.lineTo(CX + P.neckW + 14, P.sy + 2);
      p.quadraticCurveTo(CX, P.sy + 40, CX - P.neckW - 14, P.sy + 2);
      p.closePath();
    }, '#6e8fb0', { cel: [4, 3, -0.18], inside: (p) => {
      for (let i = 0; i < 18; i++) blob(p, CX - 40 + (i % 6) * 16, P.sy - 18 + Math.floor(i / 6) * 12, 2.5, 2.5, '#ffffff', 0.85);
    } });
  }),
  neckItem('beads', (c, P) => {
    for (const [i, [x, y]] of chain(P, 60, 16).entries()) shape(c, (p) => p.arc(x, y, 8, 0, TAU), ['#ff5d6c', '#ff9f43', '#ffe066', '#7bd389', '#5dade2', '#a37cf0'][i % 6], { line: 3 });
  }),
];

// ------------------------------------------------------------------ on the face
function shades(c: Ctx, P: Plan, lens: (p: Ctx, x: number, y: number, r: number) => void, frame: string, glass: string) {
  const r = P.eyeW * 1.4;
  for (const s of [-1, 1]) {
    const x = CX + s * P.eyeX, y = P.eyeY - 2;
    shape(c, (p) => lens(p, x, y, r), glass, { line: 0, inside: (p) => stroke(p, (q) => {
      q.moveTo(x - r * 0.6, y + r * 0.2);
      q.lineTo(x - r * 0.1, y - r * 0.5);
    }, 4, '#ffffff', 0.5) });
    stroke(c, (p) => lens(p, x, y, r), 9, INK);
    stroke(c, (p) => lens(p, x, y, r), 5, frame);
    stroke(c, (p) => {
      p.moveTo(x + s * r, y - r * 0.3);
      p.lineTo(CX + s * P.hw * 0.98, P.earY - P.hh * 0.06);
    }, 7, INK);
  }
  stroke(c, (p) => {
    p.moveTo(CX - P.eyeX + r * 0.9, P.eyeY - 4);
    p.quadraticCurveTo(CX, P.eyeY - r * 0.6, CX + P.eyeX - r * 0.9, P.eyeY - 4);
  }, 8, INK);
  stroke(c, (p) => {
    p.moveTo(CX - P.eyeX + r * 0.9, P.eyeY - 4);
    p.quadraticCurveTo(CX, P.eyeY - r * 0.6, CX + P.eyeX - r * 0.9, P.eyeY - 4);
  }, 4, frame);
}
const FACE: Garment[] = [
  faceItem('sunglasses', (c, P) => shades(c, P, (p, x, y, r) => p.roundRect(x - r, y - r * 0.62, r * 2, r * 1.3, r * 0.4), '#1f1f24', 'rgba(25,25,35,0.92)')),
  faceItem('heart-shades', (c, P) => shades(c, P, (p, x, y, r) => heartPath(p, x, y + r * 0.42, r * 1.12), '#ff4d9a', 'rgba(255,90,160,0.75)')),
  faceItem('star-shades', (c, P) => shades(c, P, (p, x, y, r) => starPath(p, x, y, r * 1.15, 5, 0.55), '#ffd43b', 'rgba(255,200,40,0.7)')),
  faceItem('round-glasses', (c, P) => shades(c, P, (p, x, y, r) => p.arc(x, y, r * 0.95, 0, TAU), '#26262b', 'rgba(220,235,255,0.18)')),
  faceItem('hero-mask', (c, P) => {
    shape(c, (p) => {
      p.moveTo(CX - P.hw * 0.98, P.eyeY - P.eyeW * 0.6);
      p.quadraticCurveTo(CX, P.eyeY - P.eyeW * 1.6, CX + P.hw * 0.98, P.eyeY - P.eyeW * 0.6);
      p.quadraticCurveTo(CX + P.hw * 0.9, P.eyeY + P.eyeW * 1.2, CX + P.eyeX * 0.3, P.eyeY + P.eyeW * 0.8);
      p.quadraticCurveTo(CX, P.eyeY + P.eyeW * 0.4, CX - P.eyeX * 0.3, P.eyeY + P.eyeW * 0.8);
      p.quadraticCurveTo(CX - P.hw * 0.9, P.eyeY + P.eyeW * 1.2, CX - P.hw * 0.98, P.eyeY - P.eyeW * 0.6);
      p.closePath();
      for (const s of [1, -1]) {
        const x = CX + s * P.eyeX;
        p.moveTo(x + P.eyeW * 1.15, P.eyeY);
        p.ellipse(x, P.eyeY, P.eyeW * 1.15, P.eyeW * 0.8, 0, 0, TAU, true);
      }
    }, '#2f6fd6', { line: 4.5 });
  }),
  faceItem('whiskers', (c, P) => {
    blob(c, CX, P.noseY - 4, 9, 7, '#2b2b31');
    for (const s of [-1, 1]) stroke(c, (p) => {
      for (const dy of [-6, 4, 14]) {
        p.moveTo(CX + s * P.hw * 0.28, P.noseY + dy);
        p.lineTo(CX + s * P.hw * 0.8, P.noseY + dy * 1.6 - 4);
      }
    }, 3, '#2b2b31');
  }),
  faceItem('heart-cheeks', (c, P) => {
    for (const s of [-1, 1]) shape(c, (p) => heartPath(p, CX + s * P.hw * 0.62, P.mouthY - P.hh * 0.06, P.hw * 0.16), '#ff4d6d', { line: 2.5 });
  }),
  faceItem('moustache', (c, P) => {
    shape(c, (p) => {
      const y = P.noseY + (P.mouthY - P.noseY) * 0.45;
      p.moveTo(CX, y - 4);
      p.bezierCurveTo(CX - 20, y - 18, CX - 50, y - 6, CX - 52, y + 6);
      p.quadraticCurveTo(CX - 40, y + 2, CX - 30, y + 8);
      p.quadraticCurveTo(CX - 14, y + 10, CX, y + 4);
      p.quadraticCurveTo(CX + 14, y + 10, CX + 30, y + 8);
      p.quadraticCurveTo(CX + 40, y + 2, CX + 52, y + 6);
      p.bezierCurveTo(CX + 50, y - 6, CX + 20, y - 18, CX, y - 4);
      p.closePath();
    }, '#5a3b26', { line: 3.5 });
  }),
];

// ------------------------------------------------------------------ on the back
type Lobe = [number, number, number, number, number]; // dx, dy, rx, ry, rotation (for the right-hand wing)
function wings(id: string, col: string, lobes: Lobe[], o: { alpha?: number; inside?: (p: Ctx, x: number, y: number, s: number) => void; edge?: string } = {}): Garment {
  return {
    id, slot: 'back',
    back(c, P) {
      const fill = col.startsWith('#') && o.alpha ? hexA(col, o.alpha) : col;
      for (const s of [-1, 1]) for (const [dx, dy, rx, ry, rot] of lobes) {
        const x = CX + s * (P.sh * 0.4 + dx), y = P.sy + dy;
        shape(c, (p) => p.ellipse(x, y, rx, ry, s * rot, 0, TAU), fill, { line: 4.5, inside: (p) => o.inside?.(p, x, y, s) });
      }
    },
  };
}
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const sparkly = (p: Ctx, x: number, y: number) => {
  for (let i = 0; i < 8; i++) blob(p, x - 30 + ((i * 37) % 60), y - 30 + ((i * 53) % 60), 3, 3, '#ffffff', 0.9);
};
const BACK: Garment[] = [
  wings('fairy-wings', '#e3c6ff', [[70, -20, 70, 46, -0.6], [56, 90, 50, 34, 0.5]], { alpha: 0.8, inside: sparkly }),
  wings('butterfly-wings', '#ff9f43', [[72, -14, 74, 52, -0.55], [58, 96, 52, 40, 0.5]], { inside: (p, x, y) => {
    blob(p, x, y, 22, 16, '#2b2b31', 0.85);
    for (let i = 0; i < 5; i++) blob(p, x - 30 + i * 15, y + 28, 5, 5, '#ffffff');
  } }),
  wings('bat-wings', '#5b2d82', [[76, 10, 82, 56, -0.3]], { inside: (p, x, y, s) => stroke(p, (q) => {
    for (let i = -1; i <= 1; i++) {
      q.moveTo(x - s * 60, y);
      q.lineTo(x + s * 40, y + i * 40);
    }
  }, 3, '#3a1a5a') }),
  wings('dragon-wings', '#4caf6a', [[80, 0, 86, 60, -0.35]], { inside: (p, x, y, s) => stroke(p, (q) => {
    for (let i = -1; i <= 1; i++) {
      q.moveTo(x - s * 70, y + 10);
      q.lineTo(x + s * 50, y + i * 44);
    }
  }, 4, '#2e7d4f') }),
  wings('angel-wings', '#fbfbf8', [[66, -10, 72, 56, -0.5], [50, 70, 54, 44, 0.3]], { inside: (p, x, y, s) => stroke(p, (q) => {
    for (let i = 0; i < 4; i++) {
      q.moveTo(x - s * 40, y - 30 + i * 18);
      q.quadraticCurveTo(x, y - 20 + i * 18, x + s * 40, y - 10 + i * 18);
    }
  }, 2.5, '#d6d6d0') }),
  {
    id: 'backpack', slot: 'back',
    back(c, P) {
      shape(c, (p) => p.roundRect(CX - P.sh * 0.95, P.sy + 10, P.sh * 1.9, (P.waist - P.sy) * 0.85, 24), '#4d8fe0', { cel: [6, 4, -0.2] });
      stroke(c, (p) => p.arc(CX, P.sy + 4, 24, Math.PI, 0), 10, INK);
      stroke(c, (p) => p.arc(CX, P.sy + 4, 24, Math.PI, 0), 6, '#2f6fd6');
    },
    outer(c, P) {
      for (const s of [-1, 1]) {
        stroke(c, (p) => {
          p.moveTo(CX + s * P.sh * 0.55, P.sy - 8);
          p.quadraticCurveTo(CX + s * P.sh * 0.6, P.sy + 80, CX + s * P.sh * 0.66, (P.sy + P.waist) / 2 + 20);
        }, 18, INK);
        stroke(c, (p) => {
          p.moveTo(CX + s * P.sh * 0.55, P.sy - 8);
          p.quadraticCurveTo(CX + s * P.sh * 0.6, P.sy + 80, CX + s * P.sh * 0.66, (P.sy + P.waist) / 2 + 20);
        }, 12, '#2f6fd6');
      }
    },
  },
  {
    id: 'hero-cape', slot: 'back',
    back(c, P) {
      shape(c, (p) => {
        p.moveTo(CX - P.sh + 6, P.sy - 6);
        p.quadraticCurveTo(CX - P.sh - 30, (P.sy + P.knee) / 2, CX - P.sh - 40, P.knee + 20);
        p.quadraticCurveTo(CX, P.knee + 50, CX + P.sh + 40, P.knee + 20);
        p.quadraticCurveTo(CX + P.sh + 30, (P.sy + P.knee) / 2, CX + P.sh - 6, P.sy - 6);
        p.closePath();
      }, '#e5383b', { cel: [10, 6, -0.25], inside: (p) => {
        p.beginPath();
        starPath(p, CX + P.sh + 10, P.knee - 40, 18, 5, 0.45);
        p.fillStyle = '#ffd43b';
        p.fill();
      } });
    },
    neck(c, P) {
      for (const s of [-1, 1]) stroke(c, (p) => {
        p.moveTo(CX + s * (P.sh - 10), P.sy - 2);
        p.lineTo(CX + s * 10, P.sy + 8);
      }, 9, '#e5383b');
      shape(c, (p) => p.arc(CX, P.sy + 8, 10, 0, TAU), '#ffd43b', { line: 3.5 });
    },
  },
  {
    id: 'jetpack', slot: 'back',
    back(c, P) {
      // two tanks that stick up and out past the shoulders, so they show from the front
      for (const s of [-1, 1]) {
        const x = CX + s * (P.sh + 14), top = P.sy - 74, bottom = P.waist + 16;
        // long flames, flaring out a little so they show below the hands
        const tipX = x + s * 16, tipY = bottom + (P.kind === 'child' ? 110 : 160);
        shape(c, (p) => {
          p.moveTo(x - 18, bottom - 4);
          p.quadraticCurveTo(x - 10 + s * 6, (bottom + tipY) / 2, tipX, tipY);
          p.quadraticCurveTo(x + 10 + s * 6, (bottom + tipY) / 2, x + 18, bottom - 4);
          p.closePath();
        }, '#ff9f43', { line: 3.5, inside: (p) => blob(p, x + s * 5, (bottom * 2 + tipY) / 3, 8, (tipY - bottom) * 0.3, '#ffe066') });
        shape(c, (p) => p.roundRect(x - 22, top, 44, bottom - top, 20), '#c9ced3', { cel: [s * -4, 4, -0.2], inside: (p) => {
          p.fillStyle = '#e5383b';
          p.fillRect(x - 22, top + 30, 44, 14);
          p.fillRect(x - 22, bottom - 36, 44, 10);
        } });
      }
    },
  },
];

export const EXTRAS: Garment[] = [...NECK, ...FACE, ...BACK];
