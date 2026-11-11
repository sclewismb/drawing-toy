import { Container, Graphics, Sprite, Text, Texture, type FederatedPointerEvent } from 'pixi.js';
import { drawClockHands } from './clock';
import type { StreetGeom } from './eggs';
import { INK, seeded, STREET, type PlaceId } from './places';
import { hillDots, PALETTE, type Season } from './seasons';
import { Sky, SwayingTrees } from './sky';
import { ease, tween } from './tween';

type StreetId = PlaceId | 'house';

interface Building {
  id: StreetId;
  holder: Container; // positioned on the pavement, bottom-centre
  sprite: Sprite;
  clock?: { x: number; y: number; r: number }; // in SVG units
  hands?: Graphics;
}

const HOLD_MS = 1200;

/**
 * The neighbourhood: a street with a building for each place. Tap a
 * building to go inside. Grown-ups: press and hold the house to set its
 * sign and room names (kept on this iPad only).
 */
export class StreetView extends Container {
  /** The sky with drifting clouds, behind everything (tap a cloud for rain). */
  readonly sky = new Sky(true);
  private bg = new Graphics();
  /** Trees swaying in the breeze, behind the buildings. */
  private swaying = new SwayingTrees();
  private buildings: Building[] = [];
  private busy = false;
  /** The house number, on the brick wall above the garage (set on the iPad only). */
  private houseNumber = new Text({
    text: '',
    style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 16, fontWeight: '800', fill: 0x1f1f1f },
  });
  /** Surprises on the street (see eggs/views.ts): on top of the buildings. */
  readonly eggs = new Container();
  readonly eggsFront = new Container();
  /** Where things are, for the surprises. */
  geom: StreetGeom = {
    w: 0,
    h: 0,
    road: [],
    roadW: 0,
    branch: [],
    buildings: {},
    sun: { x: 0, y: 0, r: 0 },
    clouds: [],
    tunnel: { x: 0, y: 0, r: 0 },
    pond: { x: 0, y: 0, rx: 0, ry: 0 },
    trees: [],
    ground: 0,
  };
  onEnter: (id: StreetId, at: { x: number; y: number }) => void = () => {};
  onBuildingTap: () => void = () => {};
  onHouseHold: () => void = () => {};

  constructor(pictures: Map<string, HTMLCanvasElement>) {
    super();
    this.addChild(this.sky, this.bg, this.swaying);
    for (const s of STREET) {
      const sprite = new Sprite(Texture.from(pictures.get(s.building)!));
      sprite.anchor.set(0.5, 1);
      const holder = new Container();
      holder.addChild(sprite);
      holder.eventMode = 'static';
      holder.cursor = 'pointer';
      const b: Building = { id: s.id, holder, sprite, clock: s.clock };
      if (s.clock) {
        b.hands = new Graphics();
        holder.addChild(b.hands);
      }
      if (s.id === 'house') {
        this.houseNumber.anchor.set(0.5);
        holder.addChild(this.houseNumber);
      }

      let holdTimer = 0;
      let held = false;
      holder.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation(); // not "empty space"
        held = false;
        if (s.id === 'house') {
          clearTimeout(holdTimer);
          holdTimer = window.setTimeout(() => {
            held = true;
            this.onHouseHold();
          }, HOLD_MS);
        }
      });
      const cancel = () => clearTimeout(holdTimer);
      holder.on('pointerup', cancel);
      holder.on('pointerupoutside', cancel);
      holder.on('pointerleave', cancel);
      holder.on('pointertap', () => {
        if (held) return; // that was a press-and-hold, not a tap
        this.tap(b);
      });
      this.addChild(holder);
      this.buildings.push(b);
    }
    this.addChild(this.eggs, this.eggsFront);
  }

  private tap(b: Building) {
    if (this.busy) return;
    this.busy = true;
    this.onBuildingTap();
    // A happy bounce, then in we go.
    tween(
      260,
      (t) => {
        const k = Math.sin(t * Math.PI);
        b.holder.scale.set(1 + 0.08 * k, 1 - 0.1 * k + 0.18 * Math.sin(t * Math.PI * 2) * (1 - t));
      },
      () => {
        b.holder.scale.set(1);
        this.onEnter(b.id, this.buildingCentre(b.id));
        this.busy = false;
      },
    );
  }

  /** The house number painted on the house (empty = none). */
  setHouseNumber(text: string) {
    this.houseNumber.text = text.trim();
    this.placeNumber();
  }

  private placeNumber() {
    const house = this.buildings.find((b) => b.id === 'house');
    if (!house) return;
    // On the brick wall above the garage door: (282, 124) in the SVG's own
    // units. The picture is drawn at twice the SVG's size, anchored bottom-centre.
    const tex = house.sprite.texture;
    const k = house.sprite.scale.x;
    this.houseNumber.style.fontSize = Math.max(8, 26 * 2 * k);
    this.houseNumber.position.set((282 * 2 - tex.width / 2) * k, (124 * 2 - tex.height) * k);
  }

  /** Where a building is on screen (for zooming in and out). */
  buildingCentre(id: StreetId) {
    const b = this.buildings.find((x) => x.id === id);
    if (!b) return { x: 0, y: 0 };
    const r = b.holder.getBounds();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }

  /** Zoom the street around a point: 0 = normal, 1 = fully zoomed in. */
  setZoom(at: { x: number; y: number }, amount: number) {
    const s = 1 + 1.6 * ease.inOutSine(amount);
    this.pivot.set(at.x, at.y);
    this.position.set(at.x, at.y);
    this.scale.set(s);
  }

  /**
   * The neighbourhood seen from above: rolling hills, a winding road with
   * the buildings along it, trees, a pond, a tunnel into the hill and a city
   * far away. Everything is placed by fractions of the screen, so it fits
   * the iPad either way up. Colours follow the season.
   */
  layout(w: number, h: number, season: Season) {
    const pal = PALETTE[season];
    const winter = season === 'winter';
    const u = Math.min(w, h); // a size that suits both ways up
    const P = (fx: number, fy: number) => ({ x: fx * w, y: fy * h });
    const g = this.bg.clear();

    // --- sky, sun and drifting clouds (behind everything: see sky.ts), and a city far away ---
    const sun = { x: w * 0.86, y: h * 0.11, r: u * 0.065 * pal.sunSize };
    const clouds: [number, number, number][] = [];
    for (const [cx, cy, s] of [[0.1, 0.1, 1], [0.4, 0.06, 0.8], [0.64, 0.15, 0.65], [-0.2, 0.2, 0.55]]) {
      clouds.push([w * cx, h * cy, u * 0.045 * s]);
    }
    this.sky.set({
      x0: 0,
      x1: w,
      h,
      color: pal.sky,
      sun: { ...sun, color: pal.sun, rays: true },
      clouds: clouds.map(([x, y, r]) => ({ x, y, r })),
      cloudColor: pal.cloud,
    });
    this.swaying.clear();
    const city = winter ? 0xc5d3e0 : 0xa9c4dc;
    const rnd = seeded(5);
    for (let x = w * 0.5; x < w * 0.8; x += u * 0.035) {
      const bh = h * (0.06 + rnd() * 0.1);
      g.rect(x, h * 0.33 - bh, u * 0.03, bh).fill({ color: city, alpha: 0.8 });
    }

    // --- hills: far, middle, and the meadow at the front ---
    const hill = (pts: { x: number; y: number }[], color: number) => {
      const s = spline(pts, 10);
      g.moveTo(0, h);
      for (const p of s) g.lineTo(p.x, p.y);
      g.lineTo(w, h).closePath().fill(color);
    };
    hill([P(0, 0.44), P(0.15, 0.36), P(0.32, 0.29), P(0.5, 0.33), P(0.66, 0.37), P(0.86, 0.3), P(1, 0.35)], pal.hillBack);
    // patchwork fields on the far hill
    const fieldCols = winter ? [0xf4f7fa, 0xe9eff5] : season === 'autumn' ? [0xe9c46a, 0xd4a373] : [0xc7e59f, 0xe9d985];
    for (const [i, [fx, fy]] of [[0.1, 0.43], [0.19, 0.4], [0.28, 0.375]].entries()) {
      const x = w * fx, y = h * fy, fw = w * 0.085, fh = h * 0.035;
      g.poly([x, y, x + fw, y - fh * 0.4, x + fw * 1.05, y + fh * 0.6, x + fw * 0.05, y + fh]).fill(fieldCols[i % 2]).stroke({ width: 2, color: 0xa47e4b });
    }
    hill([P(0, 0.56), P(0.18, 0.5), P(0.4, 0.55), P(0.58, 0.5), P(0.75, 0.45), P(0.9, 0.48), P(1, 0.5)], pal.hillFront);
    hill([P(0, 0.8), P(0.25, 0.78), P(0.5, 0.84), P(0.75, 0.8), P(1, 0.82)], pal.grass);
    hillDots(g, w * 0.3, h * 0.95, w * 0.3, h * 0.14, pal.dots, 7);
    hillDots(g, w * 0.85, h * 0.62, w * 0.12, h * 0.1, pal.dots, 8);

    // --- the pond, with a little jetty ---
    const pond = { x: w * 0.14, y: h * 0.89, rx: w * 0.11, ry: h * 0.065 };
    g.ellipse(pond.x, pond.y, pond.rx + 6, pond.ry + 6).fill(winter ? 0xe3edf5 : 0xc9b48a);
    g.ellipse(pond.x, pond.y, pond.rx, pond.ry).fill(winter ? 0xd6eef8 : 0x6ec6ff).stroke({ width: 3, color: winter ? 0xb7d3e6 : 0x4a9fd8 });
    g.rect(pond.x + pond.rx * 0.45, pond.y - pond.ry * 0.9, pond.rx * 0.45, 10).fill(0xa47e4b).stroke({ width: 2, color: INK });

    // --- trees far away on the hill, and the tunnel ---
    const treeG = winter ? 0x6a9a7f : 0x52b788, treeD = winter ? 0x557f69 : 0x2d6a4f;
    for (const [fx, fy] of [[0.04, 0.43], [0.07, 0.42], [0.21, 0.335], [0.24, 0.325], [0.27, 0.32], [0.36, 0.305], [0.4, 0.31], [0.83, 0.315], [0.88, 0.315], [0.92, 0.325]]) {
      const x = w * fx, y = h * fy, r = u * 0.018;
      g.circle(x, y, r).fill(treeG).stroke({ width: 2, color: INK });
      if (winter) g.ellipse(x, y - r * 0.5, r * 0.6, r * 0.3).fill(0xffffff);
    }
    const tunnel = { x: w * 0.47, y: h * 0.5, r: u * 0.05 };
    g.moveTo(tunnel.x - tunnel.r - 10, tunnel.y).arc(tunnel.x, tunnel.y, tunnel.r + 10, Math.PI, 0).lineTo(tunnel.x - tunnel.r - 10, tunnel.y).fill(0xadb5bd).stroke({ width: 3, color: INK });
    g.moveTo(tunnel.x - tunnel.r, tunnel.y).arc(tunnel.x, tunnel.y, tunnel.r, Math.PI, 0).lineTo(tunnel.x - tunnel.r, tunnel.y).fill(0x1f1f1f);

    // --- the roads: one winding along the hill, one up to the tunnel ---
    const roadW = u * 0.045;
    const road = spline([P(-0.06, 0.73), P(0.08, 0.7), P(0.22, 0.71), P(0.38, 0.75), P(0.52, 0.77), P(0.64, 0.7), P(0.77, 0.635), P(0.9, 0.67), P(1.06, 0.71)], 14);
    const branch = spline([P(0.52, 0.77), P(0.51, 0.66), P(0.48, 0.57), { x: tunnel.x, y: tunnel.y }], 12);
    drawRoad(g, branch, roadW * 0.85, winter);
    drawRoad(g, road, roadW, winter);

    // --- the buildings, each on its own patch beside the road ---
    const spots: Record<string, [number, number]> = {
      house: [0.17, 0.63],
      fire: [0.35, 0.665],
      school: [0.7, 0.555],
      police: [0.89, 0.6],
      park: [0.62, 0.975],
    };
    const maxW = Math.min(w * 0.16, u * 0.28), maxH = Math.min(h * 0.2, u * 0.26);
    const placed: StreetGeom['buildings'] = {};
    for (const b of this.buildings) {
      const [fx, fy] = spots[b.id] ?? [0.5, 0.6];
      const tex = b.sprite.texture;
      const k = Math.min(maxW / tex.width, maxH / tex.height);
      b.sprite.scale.set(k);
      const x = w * fx, y = h * fy;
      b.holder.position.set(x, y);
      const bw = tex.width * k, bh = tex.height * k;
      placed[b.id] = { x, y, w: bw, h: bh };
      // a driveway down to the road, and a patch to stand on
      const near = road.reduce((best, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best), road[0]);
      if (b.id !== 'park') {
        g.moveTo(x, y - 4).lineTo(near.x, near.y).stroke({ width: roadW * 0.5, color: INK, cap: 'round' });
        g.moveTo(x, y - 4).lineTo(near.x, near.y).stroke({ width: roadW * 0.5 - 6, color: winter ? 0xf1f5f9 : 0xe9e3d3, cap: 'round' });
      }
      g.ellipse(x, y, bw * 0.58, Math.max(10, bh * 0.08)).fill(winter ? 0xf1f5f9 : 0xe9e3d3).stroke({ width: 2, color: 0xbdb5a6 });
    }
    // the buildings further down the screen stand in front
    const order = [...this.buildings].sort((a, b) => a.holder.y - b.holder.y);
    for (const b of order) this.removeChild(b.holder);
    const at = this.getChildIndex(this.eggs);
    order.forEach((b, i) => this.addChildAt(b.holder, at + i));

    // --- trees (swaying in the breeze) and bushes, kept clear of the buildings and road ---
    const tree = (fx: number, fy: number, s: number) => {
      const r = u * s;
      this.swaying.add(w * fx, h * fy, (t) => {
        t.rect(-r * 0.15, -r * 0.3, r * 0.3, r * 0.6).fill(0x8d5524).stroke({ width: 2, color: INK });
        t.circle(0, -r * 1.1, r).fill(season === 'autumn' ? 0xe08a3c : treeG).stroke({ width: 3, color: INK });
        t.circle(-r * 0.3, -r * 1.3, r * 0.35).fill({ color: 0xffffff, alpha: 0.18 });
        if (winter) t.ellipse(0, -r * 1.8, r * 0.6, r * 0.25).fill(0xffffff);
      });
    };
    const cypress = (fx: number, fy: number, s: number) => {
      const r = u * s;
      this.swaying.add(w * fx, h * fy, (t) => {
        t.ellipse(0, -r * 1.4, r * 0.5, r * 1.5).fill(treeD).stroke({ width: 3, color: INK });
        if (winter) t.ellipse(0, -r * 2.6, r * 0.3, r * 0.2).fill(0xffffff);
      });
    };
    for (const [fx, fy, s] of [[0.03, 0.6, 0.03], [0.27, 0.6, 0.028], [0.57, 0.6, 0.03], [0.6, 0.62, 0.025], [0.81, 0.555, 0.027], [0.985, 0.6, 0.03]]) tree(fx, fy, s);
    for (const [fx, fy, s] of [[0.06, 0.62, 0.03], [0.25, 0.62, 0.028], [0.44, 0.63, 0.03], [0.79, 0.57, 0.026]]) cypress(fx, fy, s);
    const trees: { x: number; y: number; r: number }[] = [];
    for (const [fx, fy, s] of [[0.33, 0.93, 0.045], [0.43, 0.9, 0.04], [0.8, 0.9, 0.045], [0.92, 0.86, 0.04], [0.97, 0.97, 0.05]]) {
      tree(fx, fy, s);
      trees.push({ x: w * fx, y: h * fy - u * s * 1.1, r: u * s });
    }
    for (const [fx, fy] of [[0.04, 0.79], [0.27, 0.8], [0.73, 0.84]]) {
      const x = w * fx, y = h * fy, r = u * 0.022;
      g.circle(x - r, y, r).circle(x + r, y, r).circle(x, y - r * 0.7, r * 1.1).fill(treeG).stroke({ width: 2, color: INK });
    }

    this.placeNumber();
    this.updateClock();
    this.geom = { w, h, road, roadW, buildings: placed, sun, clouds, tunnel, branch, pond, trees, ground: h * 0.72 };
  }

  /** Move the clock hands on buildings to the real time. */
  updateClock(now = new Date()) {
    for (const b of this.buildings) {
      if (!b.clock || !b.hands) continue;
      // The picture is drawn at twice the SVG's size, anchored bottom-centre.
      const tex = b.sprite.texture;
      const k = b.sprite.scale.x;
      const x = (b.clock.x * 2 - tex.width / 2) * k;
      const y = (b.clock.y * 2 - tex.height) * k;
      drawClockHands(b.hands, x, y, b.clock.r * 2 * k, now, false);
    }
  }
}

type Pt = { x: number; y: number };

/** A smooth curve through some points (Catmull-Rom), as lots of little steps. */
export function spline(pts: Pt[], steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}

/** A road along a path: kerbs, pavement, grey road and a dashed white line. */
function drawRoad(g: Graphics, pts: Pt[], width: number, winter: boolean) {
  const path = () => {
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
  };
  path();
  g.stroke({ width: width + 16, color: INK, cap: 'round', join: 'round' });
  path();
  g.stroke({ width: width + 11, color: winter ? 0xf8fafc : 0xe9ecef, cap: 'round', join: 'round' });
  path();
  g.stroke({ width: width, color: 0x8d99ae, cap: 'round', join: 'round' });
  // dashes: 16 on, 18 off, all the way along
  let along = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 2) {
      if ((along + d) % 34 < 16) {
        const t0 = d / len, t1 = Math.min(1, (d + 2) / len);
        g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0).lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      }
    }
    along += len;
  }
  g.stroke({ width: 3, color: 0xffffff, cap: 'butt' });
}
