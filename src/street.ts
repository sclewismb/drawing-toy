import { Container, Graphics, Sprite, Text, Texture, Ticker, type FederatedPointerEvent } from 'pixi.js';
import { Camera } from './camera';
import { drawClockHands } from './clock';
import type { StreetGeom } from './eggs';
import { markEggTouch, touchState } from './gestures';
import { INK, seeded, STREET, type PlaceId } from './places';
import { hillDots, PALETTE, type Season } from './seasons';
import { Sky, SwayingTrees } from './sky';
import { ease, tween } from './tween';

type StreetId = PlaceId | 'house';

interface Building {
  id: StreetId;
  holder: Container; // positioned on its patch, bottom-centre
  sprite: Sprite;
  clock?: { x: number; y: number; r: number }; // in SVG units
  hands?: Graphics;
}

const HOLD_MS = 1200;

/**
 * Where each building goes along the road (fractions of the map's width),
 * above or below the road, and how big (1 = normal).
 */
const SPOTS: Record<string, { fx: number; side: 'above' | 'below'; size?: number }> = {
  house: { fx: 0.08, side: 'above' },
  fire: { fx: 0.235, side: 'above' },
  police: { fx: 0.37, side: 'above' },
  school: { fx: 0.455, side: 'above', size: 1.05 },
  park: { fx: 0.53, side: 'below' },
  vet: { fx: 0.585, side: 'above' },
  restaurant: { fx: 0.66, side: 'above' },
  toyshop: { fx: 0.735, side: 'above' },
  zoo: { fx: 0.825, side: 'above', size: 1.3 },
  fair: { fx: 0.94, side: 'above', size: 1.45 },
};

/**
 * The neighbourhood: a long map you slide across (like the wide rooms), with
 * a building for each place along a winding road. Tap a building to go in.
 * Grown-ups: press and hold the house for the grown-up box.
 */
export class StreetView extends Container {
  /** Sliding along the map (drag empty space; arrows at the edges). */
  readonly camera = new Camera();
  /** The sky with drifting clouds, behind everything, staying put while the map slides (tap a cloud for rain). */
  readonly sky = new Sky();
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
  /** Star bursts from the street's surprises (they slide with the map). */
  readonly sparkles = new Container();
  /** Where things are, for the surprises (map coordinates). */
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
    const view = this.camera.view;
    view.addChild(this.sky, this.bg, this.swaying);
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
        // not "empty space", but a finger sliding from here still moves the map
        markEggTouch(e.pointerId);
        held = false;
        if (s.id === 'house') {
          clearTimeout(holdTimer);
          holdTimer = window.setTimeout(() => {
            if (touchState.panned) return; // that was sliding the map
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
        if (held || touchState.panned) return; // a press-and-hold, or sliding the map
        this.tap(b);
      });
      view.addChild(holder);
      this.buildings.push(b);
    }
    view.addChild(this.eggs, this.eggsFront, this.sparkles);
    this.addChild(view, this.camera.arrows);
    // keep the sky still while the map slides, and keep things moving
    this.camera.onMove = () => (this.sky.x = this.camera.x);
    Ticker.shared.add((t) => {
      if (!this.visible || !this.parent) return;
      this.camera.update(t.deltaMS);
      this.sky.update(t.deltaMS);
    });
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
   * The neighbourhood seen from above: rolling hills, a long winding road
   * with the buildings along it, the family's street with the neighbours'
   * houses, trees, a pond, a tunnel into the hill and a city far away. The
   * map is wider than the screen (slide to see it all). Colours follow the
   * season.
   */
  layout(w: number, h: number, season: Season) {
    const pal = PALETTE[season];
    const winter = season === 'winter';
    const u = Math.min(w, h); // a size that suits both ways up
    const M = Math.max(w * 2.6, h * 3.8); // the map's width
    const P = (fx: number, fy: number) => ({ x: fx * M, y: fy * h });
    const g = this.bg.clear();
    const keep = this.camera.x / Math.max(1, this.geom.w || M);
    this.camera.setRoom(0, M, w, h);

    // --- the sky (stays put while the map slides), and a city far away ---
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
    for (let x = M * 0.42; x < M * 0.6; x += u * 0.035) {
      const bh = h * (0.06 + rnd() * 0.1);
      g.rect(x, h * 0.33 - bh, u * 0.03, bh).fill({ color: city, alpha: 0.8 });
    }

    // --- hills: far, middle, and the meadow at the front ---
    const hill = (pts: { x: number; y: number }[], color: number) => {
      const s = spline(pts, 12);
      g.moveTo(0, h);
      for (const p of s) g.lineTo(p.x, p.y);
      g.lineTo(M, h).closePath().fill(color);
    };
    hill([P(0, 0.44), P(0.06, 0.36), P(0.14, 0.3), P(0.24, 0.34), P(0.33, 0.37), P(0.42, 0.31), P(0.52, 0.35), P(0.62, 0.33), P(0.72, 0.3), P(0.82, 0.36), P(0.9, 0.32), P(1, 0.36)], pal.hillBack);
    // patchwork fields on the far hill
    const fieldCols = winter ? [0xf4f7fa, 0xe9eff5] : season === 'autumn' ? [0xe9c46a, 0xd4a373] : [0xc7e59f, 0xe9d985];
    for (const [i, [fx, fy]] of [[0.04, 0.43], [0.08, 0.4], [0.12, 0.375], [0.75, 0.37], [0.79, 0.385]].entries()) {
      const x = M * fx, y = h * fy, fw = u * 0.12, fh = h * 0.035;
      g.poly([x, y, x + fw, y - fh * 0.4, x + fw * 1.05, y + fh * 0.6, x + fw * 0.05, y + fh]).fill(fieldCols[i % 2]).stroke({ width: 2, color: 0xa47e4b });
    }
    hill([P(0, 0.56), P(0.08, 0.5), P(0.18, 0.55), P(0.27, 0.5), P(0.36, 0.54), P(0.46, 0.49), P(0.56, 0.45), P(0.66, 0.5), P(0.76, 0.48), P(0.86, 0.5), P(0.95, 0.46), P(1, 0.5)], pal.hillFront);
    hill([P(0, 0.8), P(0.12, 0.78), P(0.25, 0.84), P(0.38, 0.8), P(0.5, 0.83), P(0.63, 0.79), P(0.76, 0.84), P(0.88, 0.8), P(1, 0.82)], pal.grass);
    for (const [cx, seed] of [[0.15, 7], [0.4, 8], [0.62, 9], [0.88, 10]]) hillDots(g, M * cx, h * 0.97, M * 0.08, h * 0.14, pal.dots, seed);

    // --- the pond, with a little jetty ---
    const pond = { x: M * 0.045, y: h * 0.89, rx: u * 0.13, ry: h * 0.065 };
    g.ellipse(pond.x, pond.y, pond.rx + 6, pond.ry + 6).fill(winter ? 0xe3edf5 : 0xc9b48a);
    g.ellipse(pond.x, pond.y, pond.rx, pond.ry).fill(winter ? 0xd6eef8 : 0x6ec6ff).stroke({ width: 3, color: winter ? 0xb7d3e6 : 0x4a9fd8 });
    g.rect(pond.x + pond.rx * 0.45, pond.y - pond.ry * 0.9, pond.rx * 0.45, 10).fill(0xa47e4b).stroke({ width: 2, color: INK });

    // --- trees far away along the hill, and the tunnel ---
    const treeG = winter ? 0x6a9a7f : 0x52b788, treeD = winter ? 0x557f69 : 0x2d6a4f;
    for (let fx = 0.02; fx < 1; fx += 0.035) {
      if ((fx > 0.4 && fx < 0.62) || rnd() < 0.3) continue; // (the city is there)
      const x = M * fx, y = h * (0.36 + rnd() * 0.06), r = u * 0.018;
      g.circle(x, y, r).fill(treeG).stroke({ width: 2, color: INK });
      if (winter) g.ellipse(x, y - r * 0.5, r * 0.6, r * 0.3).fill(0xffffff);
    }
    const tunnel = { x: M * 0.303, y: h * 0.5, r: u * 0.05 };
    g.moveTo(tunnel.x - tunnel.r - 10, tunnel.y).arc(tunnel.x, tunnel.y, tunnel.r + 10, Math.PI, 0).lineTo(tunnel.x - tunnel.r - 10, tunnel.y).fill(0xadb5bd).stroke({ width: 3, color: INK });
    g.moveTo(tunnel.x - tunnel.r, tunnel.y).arc(tunnel.x, tunnel.y, tunnel.r, Math.PI, 0).lineTo(tunnel.x - tunnel.r, tunnel.y).fill(0x1f1f1f);

    // --- the roads: a long one winding along, and one up to the tunnel ---
    const roadW = u * 0.045;
    const road = spline([P(-0.02, 0.73), P(0.05, 0.71), P(0.14, 0.71), P(0.23, 0.74), P(0.32, 0.76), P(0.4, 0.77), P(0.48, 0.71), P(0.57, 0.66), P(0.66, 0.7), P(0.74, 0.73), P(0.82, 0.73), P(0.9, 0.7), P(0.97, 0.69), P(1.02, 0.71)], 16);
    const roadY = (x: number) => road.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), road[0]).y;
    const branchStart = road.reduce((best, p) => (Math.abs(p.x - tunnel.x) < Math.abs(best.x - tunnel.x) ? p : best), road[0]);
    const branch = spline([branchStart, { x: tunnel.x + u * 0.02, y: (branchStart.y + tunnel.y) / 2 + h * 0.04 }, { x: tunnel.x, y: tunnel.y }], 14);
    drawRoad(g, branch, roadW * 0.85, winter);
    drawRoad(g, road, roadW, winter);

    // --- the neighbours' houses along the family's street ---
    const houseCols = [0xffd6a5, 0xcaffbf, 0xa0c4ff, 0xffadad, 0xfdffb6];
    for (const [i, fx] of [0.02, 0.135, 0.165].entries()) {
      const x = M * fx, base = roadY(x) - h * 0.055, hw = u * 0.075, hh = u * 0.08;
      g.rect(x - hw / 2, base - hh, hw, hh).fill(houseCols[i % houseCols.length]).stroke({ width: 3, color: INK });
      g.poly([x - hw / 2 - 8, base - hh, x, base - hh - u * 0.06, x + hw / 2 + 8, base - hh]).fill([0xe76f51, 0x6d6875, 0x2b2d42][i % 3]).stroke({ width: 3, color: INK });
      g.rect(x - hw * 0.12, base - hh * 0.5, hw * 0.24, hh * 0.5).fill(0xffffff).stroke({ width: 2, color: INK });
      g.rect(x - hw * 0.4, base - hh * 0.8, hw * 0.22, hh * 0.24).rect(x + hw * 0.18, base - hh * 0.8, hw * 0.22, hh * 0.24).fill(0xbfe8ff).stroke({ width: 2, color: INK });
      g.moveTo(x, base).lineTo(x, roadY(x)).stroke({ width: 10, color: winter ? 0xf1f5f9 : 0xe9e3d3 });
    }

    // --- the buildings, each on its own patch beside the road ---
    const placed: StreetGeom['buildings'] = {};
    for (const b of this.buildings) {
      const spot = SPOTS[b.id] ?? { fx: 0.5, side: 'above' };
      const size = spot.size ?? 1;
      const maxW = u * 0.3 * size, maxH = u * 0.26 * size;
      const tex = b.sprite.texture;
      const k = Math.min(maxW / tex.width, maxH / tex.height);
      b.sprite.scale.set(k);
      const x = M * spot.fx;
      const ry = roadY(x);
      const y = spot.side === 'above' ? ry - h * 0.06 : Math.min(h * 0.985, ry + h * 0.25);
      b.holder.position.set(x, y);
      const bw = tex.width * k, bh = tex.height * k;
      placed[b.id] = { x, y, w: bw, h: bh };
      // a driveway to the road, and a patch to stand on
      if (spot.side === 'above') {
        g.moveTo(x, y - 4).lineTo(x, ry).stroke({ width: roadW * 0.5, color: INK, cap: 'round' });
        g.moveTo(x, y - 4).lineTo(x, ry).stroke({ width: roadW * 0.5 - 6, color: winter ? 0xf1f5f9 : 0xe9e3d3, cap: 'round' });
      }
      g.ellipse(x, y, bw * 0.58, Math.max(10, bh * 0.08)).fill(winter ? 0xf1f5f9 : 0xe9e3d3).stroke({ width: 2, color: 0xbdb5a6 });
    }
    // the buildings further down the screen stand in front
    const view = this.camera.view;
    const order = [...this.buildings].sort((a, b) => a.holder.y - b.holder.y);
    for (const b of order) view.removeChild(b.holder);
    const at = view.getChildIndex(this.eggs);
    order.forEach((b, i) => view.addChildAt(b.holder, at + i));

    // --- trees (swaying in the breeze) and bushes, kept clear of the buildings and road ---
    const tree = (fx: number, fy: number, s: number) => {
      const r = u * s;
      this.swaying.add(M * fx, h * fy, (t) => {
        t.rect(-r * 0.15, -r * 0.3, r * 0.3, r * 0.6).fill(0x8d5524).stroke({ width: 2, color: INK });
        t.circle(0, -r * 1.1, r).fill(season === 'autumn' ? 0xe08a3c : treeG).stroke({ width: 3, color: INK });
        t.circle(-r * 0.3, -r * 1.3, r * 0.35).fill({ color: 0xffffff, alpha: 0.18 });
        if (winter) t.ellipse(0, -r * 1.8, r * 0.6, r * 0.25).fill(0xffffff);
      });
    };
    const cypress = (fx: number, fy: number, s: number) => {
      const r = u * s;
      this.swaying.add(M * fx, h * fy, (t) => {
        t.ellipse(0, -r * 1.4, r * 0.5, r * 1.5).fill(treeD).stroke({ width: 3, color: INK });
        if (winter) t.ellipse(0, -r * 2.6, r * 0.3, r * 0.2).fill(0xffffff);
      });
    };
    // behind the buildings, just above the road
    for (const fx of [0.005, 0.045, 0.11, 0.195, 0.27, 0.335, 0.41, 0.5, 0.62, 0.7, 0.775, 0.885, 0.995]) {
      const y = (roadY(M * fx) - h * 0.075) / h;
      if (Math.round(fx * 1000) % 2) cypress(fx, y, 0.028);
      else tree(fx, y, 0.03);
    }
    // big trees at the front
    const trees: { x: number; y: number; r: number }[] = [];
    for (const [fx, fy, s] of [[0.12, 0.93, 0.045], [0.2, 0.9, 0.04], [0.29, 0.94, 0.045], [0.4, 0.9, 0.04], [0.62, 0.93, 0.045], [0.7, 0.9, 0.04], [0.79, 0.94, 0.045], [0.88, 0.9, 0.04], [0.985, 0.92, 0.05]]) {
      tree(fx, fy, s);
      trees.push({ x: M * fx, y: h * fy - u * s * 1.1, r: u * s });
    }
    for (const fx of [0.1, 0.25, 0.45, 0.66, 0.84, 0.93]) {
      const x = M * fx, y = h * 0.8, r = u * 0.022;
      g.circle(x - r, y, r).circle(x + r, y, r).circle(x, y - r * 0.7, r * 1.1).fill(treeG).stroke({ width: 2, color: INK });
    }

    this.placeNumber();
    this.updateClock();
    this.geom = { w: M, h, road, roadW, buildings: placed, sun, clouds, tunnel, branch, pond, trees, ground: h * 0.72 };
    this.camera.set(keep * M);
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
