import { blob, CX, group, limb, sh, shape, sockFoot, stroke, TAU, trainer, type Ctx, type Plan } from '../figure';
import type { Garment } from '../types';

/** More shoes: wellies (one pair with frog eyes), cowboy boots, ballet slippers, flip-flops, bunny slippers, party shoes, skates... */
const kOf = (P: Plan) => (P.kind === 'child' ? 0.84 : P.kind === 'woman' ? 0.92 : 1);
const both = (P: Plan, fn: (x: number, s: number, k: number, M: (dx: number) => number) => void) => {
  for (const s of [-1, 1]) {
    const x = CX + s * P.legX, k = kOf(P);
    fn(x, s, k, (dx) => x + s * dx * k);
  }
};
/** A boot `height` up from the ground, with a rounded toe. */
function boot(c: Ctx, P: Plan, col: string, height: number, o: { cuff?: string; sole?: string; inside?: (p: Ctx, x: number, s: number) => void } = {}) {
  both(P, (x, s, k, M) => {
    const top = 896 - height;
    const leg = limb([[x, top, P.legW + 6], [x, 870, P.legW + 2]]);
    const foot = (p: Ctx) => {
      p.moveTo(M(-26), 858);
      p.lineTo(M(22), 858);
      p.quadraticCurveTo(M(50), 866, M(52), 884);
      p.quadraticCurveTo(M(52), 897, M(38), 897);
      p.lineTo(M(-22), 897);
      p.quadraticCurveTo(M(-30), 896, M(-28), 882);
      p.closePath();
    };
    group(c, [leg, foot], col, [s * -5, 4, -0.22], 6, (p) => {
      p.fillStyle = o.sole ?? sh(col, -0.35);
      p.fillRect(0, 888, 420, 12);
      o.inside?.(p, x, s);
    });
    if (o.cuff) shape(c, (p) => p.roundRect(x - (P.legW + 12) / 2, top - 4, P.legW + 12, 18, 6), o.cuff, { line: 4.5 });
  });
}
const mk = (id: string, feet: (c: Ctx, P: Plan) => void): Garment => ({ id, slot: 'shoes', feet });

export const SHOES: Garment[] = [
  mk('trainers-grey', (c, P) => both(P, (x, s, k) => trainer(c, x, s, '#8a8f96', { k, top: P.ankle - 6, stripe: '#c9ced3' }))),
  mk('trainers-pink', (c, P) => both(P, (x, s, k) => trainer(c, x, s, '#ff8fc0', { k, top: P.ankle - 6, stripe: '#ffffff', lace: '#ffffff', inside: (p) => {
    for (let i = 0; i < 5; i++) blob(p, x - 26 + i * 12, 884, 3.5, 3.5, '#ffe066'); // little lights in the soles
  } }))),
  mk('trainers-socks', (c, P) => both(P, (x, s, k) => {
    shape(c, (p) => p.roundRect(x - 22, P.ankle - 22, 44, 30, 8), '#f3f4f6', { cel: [4, 0, -0.08], line: 5 });
    trainer(c, x, s, '#26282f', { k, top: P.ankle - 2, lace: '#a3abb4' });
  })),
  mk('red-socks-plain', (c, P) => both(P, (x, s, k) => sockFoot(c, x, s, '#6e1f2a', { k, toe: '#1f1f23' }))),
  mk('shoes-brown', (c, P) => both(P, (x, s, k, M) => {
    shape(c, (p) => {
      p.moveTo(M(-22), 872);
      p.quadraticCurveTo(M(-22), 856, M(-6), 854);
      p.lineTo(M(18), 854);
      p.quadraticCurveTo(M(46), 862, M(50), 884);
      p.quadraticCurveTo(M(50), 896, M(36), 896);
      p.lineTo(M(-20), 896);
      p.quadraticCurveTo(M(-28), 894, M(-24), 878);
      p.closePath();
    }, '#7a4a2c', { cel: [s * -4, 3, -0.25], inside: (p) => {
      p.fillStyle = '#3b2a20';
      p.fillRect(0, 888, 420, 10);
      blob(p, M(26), 866, 10, 4, '#b07a52', 0.8);
    } });
    stroke(c, (p) => {
      p.moveTo(M(0), 858);
      p.lineTo(M(14), 862);
    }, 3, '#3b2a20');
  })),
  mk('flats-brown', (c, P) => both(P, (x, s, k, M) => shape(c, (p) => {
    p.moveTo(M(-18), 876);
    p.quadraticCurveTo(M(-18), 866, M(-6), 866);
    p.lineTo(M(26), 866);
    p.quadraticCurveTo(M(44), 870, M(46), 884);
    p.quadraticCurveTo(M(46), 895, M(34), 895);
    p.lineTo(M(-14), 895);
    p.quadraticCurveTo(M(-22), 894, M(-18), 876);
    p.closePath();
  }, '#b97a55', { cel: [s * -4, 3, -0.25], inside: (p) => {
    p.fillStyle = '#7b4a31';
    p.fillRect(0, 888, 420, 10);
  } }))),
  mk('wellies-yellow', (c, P) => boot(c, P, '#ffd43b', 110, { sole: '#3a3a3a' })),
  mk('wellies-frog', (c, P) => {
    boot(c, P, '#5cc96b', 110, { sole: '#2e7d4f' });
    both(P, (x, s, k, M) => {
      for (const dx of [16, 36]) {
        shape(c, (p) => p.arc(M(dx), 858, 8, 0, TAU), '#ffffff', { line: 3 });
        blob(c, M(dx) + s * 2, 859, 3.5, 3.5, '#222');
      }
      stroke(c, (p) => p.arc(M(28), 872, 10, 0.15 * Math.PI, 0.85 * Math.PI), 3, '#2e7d4f');
    });
  }),
  mk('cowboy-boots', (c, P) => boot(c, P, '#8a5a3a', 150, { sole: '#4a2f1f', inside: (p, x) => {
    stroke(p, (q) => {
      q.moveTo(x - 14, 780);
      q.quadraticCurveTo(x, 800, x + 14, 780);
      q.moveTo(x - 10, 812);
      q.quadraticCurveTo(x, 826, x + 10, 812);
    }, 3, '#d9a06a');
  } })),
  mk('ballet-slippers', (c, P) => both(P, (x, s, k, M) => {
    shape(c, (p) => {
      p.moveTo(M(-16), 878);
      p.quadraticCurveTo(M(-16), 864, M(0), 864);
      p.lineTo(M(26), 866);
      p.quadraticCurveTo(M(44), 872, M(44), 886);
      p.quadraticCurveTo(M(42), 895, M(30), 895);
      p.lineTo(M(-12), 895);
      p.quadraticCurveTo(M(-20), 893, M(-16), 878);
      p.closePath();
    }, '#ffb3cf', { cel: [s * -3, 3, -0.15] });
    // ribbons crossing up the ankle
    stroke(c, (p) => {
      p.moveTo(M(-8), 866);
      p.lineTo(M(10), P.ankle - 40);
      p.moveTo(M(10), 866);
      p.lineTo(M(-8), P.ankle - 40);
    }, 4, '#ff8fc0');
    shape(c, (p) => p.ellipse(M(28), 872, 6, 4, 0, 0, TAU), '#ff8fc0', { line: 2.5 });
  })),
  mk('flip-flops', (c, P) => both(P, (x, s, k, M) => {
    shape(c, (p) => p.roundRect(Math.min(M(-24), M(50)), 888, 74 * k, 9, 4), '#4dabf7', { line: 3 });
    stroke(c, (p) => {
      p.moveTo(M(-12), 860);
      p.lineTo(M(22), 878);
      p.lineTo(M(8), 856);
    }, 6.5, '#3a3a3a');
    stroke(c, (p) => {
      p.moveTo(M(-12), 860);
      p.lineTo(M(22), 878);
      p.lineTo(M(8), 856);
    }, 3.5, '#4dabf7');
    shape(c, (p) => p.arc(M(22), 878, 5, 0, TAU), '#ffd166', { line: 2.5 });
  })),
  mk('bunny-slippers', (c, P) => both(P, (x, s, k, M) => {
    shape(c, (p) => p.ellipse(M(14), 876, 40 * k, 22, 0, 0, TAU), '#fbf7f2', { cel: [s * -3, 3, -0.08], inside: (p) => blob(p, M(14), 890, 36 * k, 8, '#ffd6e6', 0.6) });
    for (const dx of [6, 22]) shape(c, (p) => p.ellipse(M(dx), 842, 7, 20, s * 0.2, 0, TAU), '#fbf7f2', { line: 4, inside: (p) => blob(p, M(dx), 844, 3, 13, '#ffc2d4') });
    for (const dx of [8, 22]) blob(c, M(dx + 10), 868, 3, 3, '#222');
    blob(c, M(36), 876, 4, 3, '#ff8fab');
  })),
  mk('party-shoes', (c, P) => both(P, (x, s, k, M) => {
    shape(c, (p) => {
      p.moveTo(M(-18), 880);
      p.quadraticCurveTo(M(-18), 866, M(-4), 866);
      p.lineTo(M(26), 868);
      p.quadraticCurveTo(M(44), 872, M(46), 886);
      p.quadraticCurveTo(M(46), 895, M(34), 895);
      p.lineTo(M(-14), 895);
      p.quadraticCurveTo(M(-22), 893, M(-18), 880);
      p.closePath();
    }, '#c9ced8', { cel: [s * -3, 3, -0.15], inside: (p) => {
      for (let i = 0; i < 12; i++) blob(p, M(-12 + (i % 6) * 10), 872 + Math.floor(i / 6) * 10, 2.5, 2.5, i % 2 ? '#ffffff' : '#ffd166');
    } });
    stroke(c, (p) => {
      p.moveTo(M(-12), 866);
      p.lineTo(M(14), 858);
    }, 6, '#3a3a3a');
    stroke(c, (p) => {
      p.moveTo(M(-12), 866);
      p.lineTo(M(14), 858);
    }, 3, '#c9ced8');
    shape(c, (p) => p.arc(M(30), 870, 5, 0, TAU), '#ff8fc0', { line: 2.5 });
  })),
  mk('football-boots', (c, P) => both(P, (x, s, k) => {
    trainer(c, x, s, '#1f2024', { k, top: P.ankle - 4, stripe: '#e9ecef', lace: '#e9ecef', sole: '#2b2b30' });
    for (let i = 0; i < 4; i++) shape(c, (p) => p.roundRect(x + s * (-18 + i * 16) * k - 3, 894, 6, 6, 2), '#e9ecef', { line: 2 });
  })),
  mk('ice-skates', (c, P) => {
    boot(c, P, '#f4f4f2', 100, { sole: '#d6d6d0' });
    both(P, (x, s, k, M) => {
      stroke(c, (p) => {
        p.moveTo(M(-22), 902);
        p.lineTo(M(46), 902);
        p.quadraticCurveTo(M(58), 900, M(56), 890);
      }, 8, '#3a3a3a');
      stroke(c, (p) => {
        p.moveTo(M(-22), 902);
        p.lineTo(M(46), 902);
        p.quadraticCurveTo(M(58), 900, M(56), 890);
      }, 4, '#c9ced3');
      stroke(c, (p) => {
        for (let y = 812; y < 860; y += 12) {
          p.moveTo(x - 8, y);
          p.lineTo(x + 8, y + 4);
        }
      }, 2.5, '#6c757d');
    });
  }),
];
