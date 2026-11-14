import { heartPath, starPath } from '../../makerArt';
import { blob, CX, INK, sh, shape, stroke, TAU, type Ctx, type Plan } from '../figure';
import type { Garment } from '../types';

/** Hats and headbands, sitting on the head (drawn over the hair). */
const head = (P: Plan) => ({ top: P.top, hw: P.hw, hh: P.hh, band: P.top + P.hh * 0.14 });
const hat = (id: string, front: (c: Ctx, P: Plan) => void): Garment => ({ id, slot: 'hat', front });

/** A dome over the top of the head (caps, beanies, helmets). */
function dome(c: Ctx, P: Plan, col: string, o: { low?: number; inside?: (p: Ctx) => void; wide?: number } = {}) {
  const { top, hw, hh } = head(P);
  const y = top + hh * (o.low ?? 0.22), w = hw * (o.wide ?? 1.08);
  shape(c, (p) => {
    p.moveTo(CX - w, y);
    p.bezierCurveTo(CX - w, top - hh * 0.2, CX + w, top - hh * 0.2, CX + w, y);
    p.quadraticCurveTo(CX, y + 10, CX - w, y);
    p.closePath();
  }, col, { cel: [6, 5, -0.18], inside: o.inside });
  return { y, w };
}
const band = (c: Ctx, x0: number, x1: number, y: number, h: number, col: string) => shape(c, (p) => p.roundRect(x0, y - h / 2, x1 - x0, h, h / 2), col, { line: 4.5 });
/** A tall pointy hat (witch, wizard, party) with an optional brim. */
function cone(c: Ctx, P: Plan, col: string, o: { height: number; tilt?: number; brim?: number; inside?: (p: Ctx) => void; bend?: number }) {
  const { top, hw, hh } = head(P);
  const by = top + hh * 0.12, bw = hw * 0.85, tipX = CX + (o.tilt ?? 0) * hw, tipY = by - hh * o.height;
  if (o.brim) shape(c, (p) => p.ellipse(CX, by, hw * o.brim!, hh * 0.1, 0, 0, TAU), col, { cel: [4, 4, -0.2] });
  shape(c, (p) => {
    p.moveTo(CX - bw, by);
    p.quadraticCurveTo(CX - bw * 0.4, by - hh * o.height * 0.5, tipX + (o.bend ?? 0) * hw, tipY);
    p.quadraticCurveTo(CX + bw * 0.5, by - hh * o.height * 0.45, CX + bw, by);
    p.quadraticCurveTo(CX, by + 10, CX - bw, by);
    p.closePath();
  }, col, { cel: [6, 4, -0.2], inside: o.inside });
  return { by, bw, tipX: tipX + (o.bend ?? 0) * hw, tipY };
}
const earsBand = (c: Ctx, P: Plan, col: string) => {
  const { top, hw, hh } = head(P);
  stroke(c, (p) => p.arc(CX, top + hh * 0.5, hw * 1.02, Math.PI * 1.12, Math.PI * 1.88), 13, INK);
  stroke(c, (p) => p.arc(CX, top + hh * 0.5, hw * 1.02, Math.PI * 1.12, Math.PI * 1.88), 8, col);
};

export const HATS: Garment[] = [
  hat('crown', (c, P) => {
    const { top, hw, hh } = head(P);
    const y0 = top + hh * 0.1, w = hw * 0.78;
    shape(c, (p) => {
      p.moveTo(CX - w, y0);
      p.lineTo(CX - w - 6, y0 - hh * 0.32);
      p.lineTo(CX - w * 0.45, y0 - hh * 0.12);
      p.lineTo(CX, y0 - hh * 0.4);
      p.lineTo(CX + w * 0.45, y0 - hh * 0.12);
      p.lineTo(CX + w + 6, y0 - hh * 0.32);
      p.lineTo(CX + w, y0);
      p.closePath();
    }, '#ffd43b', { cel: [4, 4, -0.15] });
    ['#4dabf7', '#ff4d6d', '#69db7c'].forEach((col, i) => shape(c, (p) => p.arc(CX + (i - 1) * w * 0.6, y0 - 12, 8, 0, TAU), col, { line: 3 }));
    for (const x of [CX - w - 6, CX, CX + w + 6]) shape(c, (p) => p.arc(x, x === CX ? y0 - hh * 0.4 : y0 - hh * 0.32, 6, 0, TAU), '#fff3b0', { line: 3 });
  }),
  hat('tiara', (c, P) => {
    const { top, hw, hh } = head(P);
    stroke(c, (p) => p.arc(CX, top + hh * 0.5, hw * 0.98, Math.PI * 1.2, Math.PI * 1.8), 11, INK);
    stroke(c, (p) => p.arc(CX, top + hh * 0.5, hw * 0.98, Math.PI * 1.2, Math.PI * 1.8), 6, '#e3e7ec');
    shape(c, (p) => {
      p.moveTo(CX - 30, top + 4);
      p.lineTo(CX - 16, top - 22);
      p.lineTo(CX, top - 40);
      p.lineTo(CX + 16, top - 22);
      p.lineTo(CX + 30, top + 4);
      p.closePath();
    }, '#e3e7ec', { line: 4 });
    shape(c, (p) => heartPath(p, CX, top - 8, 14), '#ff4d9a', { line: 3 });
  }),
  hat('cap-red', (c, P) => {
    const { y, w } = dome(c, P, '#e5484d', { inside: (p) => stroke(p, (q) => {
      q.moveTo(CX, P.top - P.hh * 0.06);
      q.lineTo(CX, P.top + P.hh * 0.2);
    }, 3, '#b8333a') });
    shape(c, (p) => p.ellipse(CX, y + 4, w * 0.95, P.hh * 0.07, 0, 0, Math.PI), '#c73a3a', { line: 5 });
    shape(c, (p) => p.arc(CX, P.top - P.hh * 0.08, 7, 0, TAU), '#c73a3a', { line: 3 });
  }),
  hat('cap-blue', (c, P) => {
    const { y, w } = dome(c, P, '#4d8fe0');
    shape(c, (p) => p.ellipse(CX, y + 4, w * 0.95, P.hh * 0.07, 0, 0, Math.PI), '#2f6fd6', { line: 5 });
    shape(c, (p) => starPath(p, CX, P.top + P.hh * 0.06, 14, 5, 0.45), '#ffffff', { line: 2.5 });
  }),
  hat('beanie-pink', (c, P) => {
    const { y, w } = dome(c, P, '#ff8fc0', { low: 0.24, inside: (p) => stroke(p, (q) => {
      for (let x = CX - P.hw; x < CX + P.hw; x += 12) {
        q.moveTo(x, P.top - P.hh * 0.1);
        q.lineTo(x, P.top + P.hh * 0.24);
      }
    }, 2, '#f06aa8') });
    band(c, CX - w, CX + w, y - 4, 22, '#f77fb0');
    shape(c, (p) => p.arc(CX, P.top - P.hh * 0.14, 18, 0, TAU), '#ffffff', { line: 4, inside: (p) => blob(p, CX - 5, P.top - P.hh * 0.16, 6, 4, '#f0f0f0') });
  }),
  hat('beanie-grey', (c, P) => {
    const { y, w } = dome(c, P, '#7c7f86', { low: 0.26, inside: (p) => stroke(p, (q) => {
      for (let x = CX - P.hw; x < CX + P.hw; x += 10) {
        q.moveTo(x, P.top - P.hh * 0.1);
        q.lineTo(x, P.top + P.hh * 0.28);
      }
    }, 2.2, '#5f626a') });
    band(c, CX - w, CX + w, y - 4, 20, '#6a6d74');
  }),
  hat('sun-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    shape(c, (p) => p.ellipse(CX, top + hh * 0.12, hw * 1.9, hh * 0.14, 0, 0, TAU), '#f2d48a', { cel: [6, 4, -0.15], inside: (p) => stroke(p, (q) => {
      for (let r = 0.5; r < 1.9; r += 0.25) q.ellipse(CX, top + hh * 0.12, hw * r, hh * 0.07 * r, 0, 0, TAU);
    }, 1.5, '#d9b45a') });
    dome(c, P, '#f2d48a', { low: 0.1, wide: 0.86 });
    band(c, CX - hw * 0.86, CX + hw * 0.86, top + hh * 0.06, 16, '#ff8fab');
    for (let k = 0; k < 5; k++) blob(c, CX + hw * 0.55 + Math.cos(k * 1.26) * 9, top + hh * 0.04 + Math.sin(k * 1.26) * 9, 8, 8, '#ffffff');
    blob(c, CX + hw * 0.55, top + hh * 0.04, 5, 5, '#ffd166');
  }),
  hat('witch-hat', (c, P) => {
    const t = cone(c, P, '#5b2d82', { height: 0.95, brim: 1.7, bend: 0.5 });
    band(c, CX - t.bw, CX + t.bw, t.by - 14, 18, '#2b2b31');
    shape(c, (p) => p.roundRect(CX - 12, t.by - 24, 24, 20, 3), '#ffd43b', { line: 3 });
  }),
  hat('wizard-hat', (c, P) => {
    cone(c, P, '#2f4fb0', { height: 1.05, brim: 1.45, inside: (p) => {
      for (let i = 0; i < 8; i++) {
        p.beginPath();
        starPath(p, CX - P.hw * 0.5 + ((i * 37) % 100) / 100 * P.hw, P.top - ((i * 53) % 100) / 100 * P.hh * 0.8, 9, 5, 0.45);
        p.fillStyle = '#ffd43b';
        p.fill();
      }
    } });
  }),
  hat('pirate-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    shape(c, (p) => {
      p.moveTo(CX - hw * 1.3, top + hh * 0.12);
      p.quadraticCurveTo(CX - hw * 1.1, top - hh * 0.4, CX, top - hh * 0.3);
      p.quadraticCurveTo(CX + hw * 1.1, top - hh * 0.4, CX + hw * 1.3, top + hh * 0.12);
      p.quadraticCurveTo(CX, top - hh * 0.02, CX - hw * 1.3, top + hh * 0.12);
      p.closePath();
    }, '#2b2b31', { cel: [5, 4, -0.2] });
    stroke(c, (p) => {
      p.moveTo(CX - hw * 1.24, top + hh * 0.08);
      p.quadraticCurveTo(CX, top - hh * 0.06, CX + hw * 1.24, top + hh * 0.08);
    }, 5, '#ffd43b');
    shape(c, (p) => {
      p.moveTo(CX + hw * 0.4, top - hh * 0.2);
      p.quadraticCurveTo(CX + hw * 1.0, top - hh * 0.7, CX + hw * 1.3, top - hh * 0.5);
      p.quadraticCurveTo(CX + hw * 0.9, top - hh * 0.36, CX + hw * 0.5, top - hh * 0.16);
      p.closePath();
    }, '#e5484d', { line: 3.5 });
  }),
  hat('chef-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    for (const [dx, dy, r] of [[-0.55, -0.2, 0.4], [0, -0.36, 0.48], [0.55, -0.2, 0.4], [-0.25, -0.5, 0.35], [0.28, -0.5, 0.35]]) shape(c, (p) => p.arc(CX + dx * hw, top + dy * hh, r * hw, 0, TAU), '#fbfbf8', { cel: [3, 3, -0.06] });
    shape(c, (p) => p.roundRect(CX - hw * 0.82, top - hh * 0.1, hw * 1.64, hh * 0.24, 10), '#fbfbf8', { cel: [3, 3, -0.06] });
  }),
  hat('cowboy-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    shape(c, (p) => {
      p.moveTo(CX - hw * 1.55, top - hh * 0.06);
      p.quadraticCurveTo(CX - hw * 1.2, top + hh * 0.22, CX, top + hh * 0.16);
      p.quadraticCurveTo(CX + hw * 1.2, top + hh * 0.22, CX + hw * 1.55, top - hh * 0.06);
      p.quadraticCurveTo(CX + hw * 1.3, top + hh * 0.08, CX, top + hh * 0.04);
      p.quadraticCurveTo(CX - hw * 1.3, top + hh * 0.08, CX - hw * 1.55, top - hh * 0.06);
      p.closePath();
    }, '#a8743a', { cel: [5, 4, -0.2] });
    shape(c, (p) => {
      p.moveTo(CX - hw * 0.78, top + hh * 0.06);
      p.quadraticCurveTo(CX - hw * 0.84, top - hh * 0.4, CX - hw * 0.3, top - hh * 0.36);
      p.quadraticCurveTo(CX, top - hh * 0.26, CX + hw * 0.3, top - hh * 0.36);
      p.quadraticCurveTo(CX + hw * 0.84, top - hh * 0.4, CX + hw * 0.78, top + hh * 0.06);
      p.closePath();
    }, '#a8743a', { cel: [5, 4, -0.2] });
    band(c, CX - hw * 0.8, CX + hw * 0.8, top - hh * 0.02, 14, '#5a3b26');
  }),
  hat('party-hat', (c, P) => {
    const t = cone(c, P, '#9775fa', { height: 0.62, tilt: 0.3, inside: (p) => {
      p.fillStyle = '#ffd43b';
      for (let i = 0; i < 8; i++) {
        p.beginPath();
        p.arc(CX - P.hw * 0.4 + (i % 4) * P.hw * 0.3, P.top - (i < 4 ? 0.1 : 0.3) * P.hh, 7, 0, TAU);
        p.fill();
      }
    } });
    shape(c, (p) => p.arc(t.tipX, t.tipY, 14, 0, TAU), '#ff8fab', { line: 3.5 });
  }),
  hat('flower-crown', (c, P) => {
    const { top, hw, hh } = head(P);
    stroke(c, (p) => p.arc(CX, top + hh * 0.42, hw * 1.0, Math.PI * 1.08, Math.PI * 1.92), 8, '#2e8b57');
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.1 + i * 0.13), x = CX + Math.cos(a) * hw, y = top + hh * 0.42 + Math.sin(a) * hw;
      const col = ['#ff8fab', '#ffd166', '#c3a6ee', '#ffffff'][i % 4];
      for (let k = 0; k < 5; k++) blob(c, x + Math.cos(k * 1.26) * 8, y + Math.sin(k * 1.26) * 8, 8, 8, col);
      stroke(c, (p) => p.arc(x, y, 14, 0, TAU), 2, sh(col, -0.3), 0.6);
      blob(c, x, y, 4.5, 4.5, '#ffb703');
    }
  }),
  hat('bunny-ears', (c, P) => {
    const { top, hw, hh } = head(P);
    for (const s of [-1, 1]) {
      shape(c, (p) => p.ellipse(CX + s * hw * 0.42, top - hh * 0.32, hw * 0.18, hh * 0.36, s * 0.15, 0, TAU), '#fbf7f2', { line: 4.5 });
      shape(c, (p) => p.ellipse(CX + s * hw * 0.42, top - hh * 0.3, hw * 0.09, hh * 0.26, s * 0.15, 0, TAU), '#ffc2d4', { line: 0 });
    }
    earsBand(c, P, '#fbf7f2');
  }),
  hat('cat-ears', (c, P) => {
    const { top, hw, hh } = head(P);
    for (const s of [-1, 1]) {
      shape(c, (p) => {
        p.moveTo(CX + s * hw * 0.25, top + hh * 0.02);
        p.lineTo(CX + s * hw * 0.62, top - hh * 0.32);
        p.lineTo(CX + s * hw * 0.85, top + hh * 0.08);
        p.closePath();
      }, '#2b2b31', { line: 4 });
      shape(c, (p) => {
        p.moveTo(CX + s * hw * 0.38, top + hh * 0.0);
        p.lineTo(CX + s * hw * 0.6, top - hh * 0.2);
        p.lineTo(CX + s * hw * 0.74, top + hh * 0.04);
        p.closePath();
      }, '#ff8fc0', { line: 0 });
    }
    earsBand(c, P, '#2b2b31');
  }),
  hat('unicorn-band', (c, P) => {
    const { top, hw, hh } = head(P);
    earsBand(c, P, '#c3a6ee');
    shape(c, (p) => {
      p.moveTo(CX - 15, top + 4);
      p.lineTo(CX, top - hh * 0.42);
      p.lineTo(CX + 15, top + 4);
      p.closePath();
    }, '#ffd43b', { line: 4, inside: (p) => stroke(p, (q) => {
      for (let i = 1; i < 4; i++) {
        q.moveTo(CX - 15, top - i * hh * 0.09);
        q.lineTo(CX + 15, top - i * hh * 0.09 - 8);
      }
    }, 3, '#e0a800') });
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) blob(c, CX + s * hw * 0.5 + Math.cos(k * 1.26) * 8, top + Math.sin(k * 1.26) * 8, 7, 7, s < 0 ? '#ff8fab' : '#9bd8f5');
  }),
  hat('santa-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    shape(c, (p) => {
      p.moveTo(CX - hw * 0.95, top + hh * 0.12);
      p.quadraticCurveTo(CX - hw * 0.5, top - hh * 0.6, CX + hw * 1.1, top - hh * 0.3);
      p.quadraticCurveTo(CX + hw * 0.4, top - hh * 0.2, CX + hw * 0.95, top + hh * 0.12);
      p.closePath();
    }, '#e5383b', { cel: [5, 4, -0.2] });
    band(c, CX - hw * 1.02, CX + hw * 1.02, top + hh * 0.1, 30, '#ffffff');
    shape(c, (p) => p.arc(CX + hw * 1.12, top - hh * 0.3, 18, 0, TAU), '#ffffff', { line: 4 });
  }),
  hat('fire-helmet', (c, P) => {
    const { y, w } = dome(c, P, '#e5383b', { low: 0.18, wide: 1.12, inside: (p) => stroke(p, (q) => {
      q.moveTo(CX, P.top - P.hh * 0.18);
      q.lineTo(CX, P.top + P.hh * 0.18);
    }, 8, '#c22d30') });
    shape(c, (p) => p.ellipse(CX, y + 2, w * 1.25, P.hh * 0.08, 0, 0, TAU), '#c22d30', { line: 5 });
    shape(c, (p) => {
      p.moveTo(CX - 22, P.top - P.hh * 0.06);
      p.lineTo(CX + 22, P.top - P.hh * 0.06);
      p.lineTo(CX + 18, P.top + P.hh * 0.14);
      p.quadraticCurveTo(CX, P.top + P.hh * 0.2, CX - 18, P.top + P.hh * 0.14);
      p.closePath();
    }, '#ffd43b', { line: 3.5 });
  }),
  hat('bike-helmet', (c, P) => {
    dome(c, P, '#4dabf7', { low: 0.2, wide: 1.14, inside: (p) => {
      for (const dx of [-0.5, 0, 0.5]) shape(p, (q) => q.roundRect(CX + dx * P.hw - 7, P.top - P.hh * 0.12, 14, P.hh * 0.22, 6), '#1c4f86', { line: 2.5 });
    } });
  }),
  hat('hair-bow', (c, P) => {
    const { top, hw } = head(P);
    const x = CX + hw * 0.5, y = top + 8;
    for (const s of [-1, 1]) shape(c, (p) => {
      p.moveTo(x, y);
      p.quadraticCurveTo(x + s * 40, y - 46, x + s * 56, y - 6);
      p.quadraticCurveTo(x + s * 40, y + 30, x, y);
      p.closePath();
    }, '#ff4d9a', { line: 4.5, inside: (p) => blob(p, x + s * 30, y - 14, 10, 5, '#ffffff', 0.4) });
    shape(c, (p) => p.arc(x, y, 12, 0, TAU), '#ff7ab8', { line: 4 });
  }),
  hat('top-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    shape(c, (p) => p.ellipse(CX, top + hh * 0.08, hw * 1.3, hh * 0.08, 0, 0, TAU), '#2b2b31', { line: 5 });
    shape(c, (p) => p.roundRect(CX - hw * 0.72, top - hh * 0.62, hw * 1.44, hh * 0.72, 8), '#2b2b31', { cel: [5, 4, -0.25] });
    shape(c, (p) => p.rect(CX - hw * 0.72, top - hh * 0.1, hw * 1.44, hh * 0.12), '#e5383b', { line: 4 });
  }),
  hat('bucket-hat', (c, P) => {
    const { top, hw, hh } = head(P);
    shape(c, (p) => {
      p.moveTo(CX - hw * 1.3, top + hh * 0.22);
      p.lineTo(CX - hw * 0.86, top + hh * 0.06);
      p.lineTo(CX + hw * 0.86, top + hh * 0.06);
      p.lineTo(CX + hw * 1.3, top + hh * 0.22);
      p.quadraticCurveTo(CX, top + hh * 0.3, CX - hw * 1.3, top + hh * 0.22);
      p.closePath();
    }, '#ffd43b', { cel: [4, 4, -0.15] });
    dome(c, P, '#ffd43b', { low: 0.08, wide: 0.88, inside: (p) => {
      for (let i = 0; i < 6; i++) blob(p, CX - P.hw * 0.6 + i * P.hw * 0.24, P.top - P.hh * 0.02 + (i % 2) * 10, 5, 5, '#ff9f43');
    } });
  }),
];
