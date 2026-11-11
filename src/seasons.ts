import { Container, Graphics, Ticker } from 'pixi.js';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** Outdoor colours for each season (street and park). */
export const PALETTE: Record<
  Season,
  { sky: number; hillBack: number; hillFront: number; grass: number; sun: number; sunSize: number; cloud: number; dots?: number[] }
> = {
  spring: { sky: 0xbfe8ff, hillBack: 0xc7eba0, hillFront: 0xa8dd8a, grass: 0x8fd16a, sun: 0xffe066, sunSize: 1, cloud: 0xffffff, dots: [0xff8fb1, 0xffffff, 0xffd93d] },
  summer: { sky: 0x8fd3ff, hillBack: 0x7bd36b, hillFront: 0x5cb85c, grass: 0x6cc04a, sun: 0xffd23f, sunSize: 1.3, cloud: 0xffffff },
  autumn: { sky: 0xd6e6f2, hillBack: 0xf2b45c, hillFront: 0xe08a3c, grass: 0xbfa24a, sun: 0xffc857, sunSize: 0.9, cloud: 0xf4f4f4, dots: [0xd62828, 0xf4a261] },
  winter: { sky: 0xdfe9f3, hillBack: 0xffffff, hillFront: 0xf1f6fb, grass: 0xffffff, sun: 0xfff3c4, sunSize: 0.75, cloud: 0xeef2f6 },
};

/** Scatter little coloured dots (flowers, fallen leaves) over a hill. */
export function hillDots(g: Graphics, cx: number, cy: number, rx: number, ry: number, colors: number[] | undefined, seed = 1) {
  if (!colors) return;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) {
    const a = Math.PI + rnd() * Math.PI; // top half of the hill
    const r = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rx * r * 0.95;
    const y = cy + Math.sin(a) * ry * r * 0.9;
    g.circle(x, y, 4 + rnd() * 3).fill(colors[i % colors.length]);
  }
}

interface Flake {
  g: Graphics;
  vx: number;
  vy: number;
  vr: number;
  sway: number;
  phase: number;
}

const RATE: Record<Season, number> = { spring: 3, summer: 0.6, autumn: 3, winter: 9 }; // per second
const LEAF_COLOURS = [0xe76f51, 0xf4a261, 0xe9c46a, 0xd62828];

/**
 * Things falling from the sky: blossom in spring, the odd butterfly in
 * summer, leaves in autumn, snow in winter.
 */
export class Weather extends Container {
  private flakes: Flake[] = [];
  private season: Season = 'spring';
  private w = 0;
  private h = 0;
  private due = 0;

  constructor() {
    super();
    this.eventMode = 'none';
    Ticker.shared.add(this.tick, this);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  set(season: Season) {
    this.season = season;
    for (const f of this.flakes) f.g.destroy();
    this.flakes = [];
    // Fill the sky straight away so the change shows at once.
    const n = Math.round(RATE[season] * 6);
    for (let i = 0; i < n; i++) this.spawn(Math.random() * this.h);
  }

  private spawn(y = -20) {
    if (this.flakes.length > 140) return;
    const g = new Graphics();
    let vx = 0, vy = 0.05, sway = 0.02, vr = 0;
    switch (this.season) {
      case 'winter': {
        const r = 2 + Math.random() * 4;
        g.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.9 }).stroke({ width: 1, color: 0xb8c7d6, alpha: 0.6 });
        vy = 0.03 + r * 0.01;
        sway = 0.015;
        break;
      }
      case 'spring':
        g.ellipse(0, 0, 7, 4).fill(Math.random() < 0.7 ? 0xffb7c5 : 0xffffff).stroke({ width: 1.5, color: 0xe58fa5 });
        vx = 0.02;
        vy = 0.03 + Math.random() * 0.02;
        sway = 0.03;
        vr = (Math.random() - 0.5) * 0.004;
        break;
      case 'autumn': {
        const c = LEAF_COLOURS[Math.floor(Math.random() * LEAF_COLOURS.length)];
        g.poly([0, -9, 6, 0, 0, 9, -6, 0]).fill(c).stroke({ width: 2, color: 0x3a3a3a });
        g.moveTo(0, -9).lineTo(0, 9).stroke({ width: 1.5, color: 0x3a3a3a });
        vx = 0.015;
        vy = 0.05 + Math.random() * 0.03;
        sway = 0.05;
        vr = (Math.random() - 0.5) * 0.006;
        break;
      }
      case 'summer': {
        // a fluttering butterfly drifting across
        const c = [0xff8fb1, 0x4ea8ff, 0xffd93d][Math.floor(Math.random() * 3)];
        g.ellipse(-6, -3, 6, 8).ellipse(6, -3, 6, 8).fill(c).stroke({ width: 2, color: 0x3a3a3a });
        g.rect(-1.5, -8, 3, 14).fill(0x3a3a3a);
        vx = 0.04 + Math.random() * 0.03;
        vy = 0.004;
        sway = 0.04;
        y = this.h * (0.1 + Math.random() * 0.45);
        break;
      }
    }
    g.position.set(this.season === 'summer' ? -20 : -40 + Math.random() * (this.w + 80), y);
    g.rotation = Math.random() * Math.PI;
    this.addChild(g);
    this.flakes.push({ g, vx, vy, vr, sway, phase: Math.random() * 10 });
  }

  private tick(t: Ticker) {
    if (!this.visible || !this.w) return;
    const dt = Math.min(50, t.deltaMS);
    this.due += (RATE[this.season] * dt) / 1000;
    while (this.due >= 1) {
      this.due--;
      this.spawn();
    }
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      f.phase += dt * 0.002;
      f.g.x += (f.vx + Math.sin(f.phase) * f.sway) * dt;
      f.g.y += f.vy * dt;
      if (this.season === 'summer') f.g.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(f.phase * 6)); // flap
      else f.g.rotation += f.vr * dt;
      if (f.g.y > this.h + 30 || f.g.x > this.w + 40) {
        f.g.destroy();
        this.flakes.splice(i, 1);
      }
    }
  }
}
