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
 * The town is laid out in city blocks along a winding main road, with cross
 * streets between the blocks. Each block has a place on each side of the
 * road; the road snakes up and down between them. Positions are fractions of
 * B (a size that suits the screen) along the map.
 *
 *   house block | police / fire | school / park | vet / restaurant |
 *   zoo / toy shop | ninja gym / fair | Niagara / town square |
 *   bus stop / conservatory
 */
const SPOTS: Record<string, { fx: number; side: 'above' | 'below'; size?: number; base?: number }> = {
  house: { fx: 0.085, side: 'above' },
  police: { fx: 0.235, side: 'below' },
  fire: { fx: 0.335, side: 'above' },
  school: { fx: 0.465, side: 'above', size: 1.05 },
  park: { fx: 0.565, side: 'below' },
  vet: { fx: 0.675, side: 'below' },
  restaurant: { fx: 0.775, side: 'above' },
  zoo: { fx: 0.918, side: 'above', size: 1.3 },
  toyshop: { fx: 1.005, side: 'below' },
  ninja: { fx: 1.115, side: 'below' },
  fair: { fx: 1.2, side: 'above', size: 1.45 },
  niagara: { fx: 1.362, side: 'above', size: 1.5 },
  conservatory: { fx: 1.635, side: 'above', size: 1.3 },
  // tiny, and tucked away down a side street near the bottom: a surprise to find
  workshop: { fx: 0.445, side: 'below', size: 0.42, base: 0.975 },
};
/** The cross streets between the blocks (the first one goes up into the tunnel). */
const CROSS = [0.18, 0.4, 0.62, 0.84, 1.06, 1.28, 1.5];
/** How long the map is (in B). */
const MAP_LENGTH = 1.74;
/**
 * The main road: low (further down) under the places above it and high
 * under the places below it, so it winds between them.
 */
const ROAD: [number, number][] = [
  [-0.03, 0.6], [0.085, 0.665], [0.18, 0.6],
  [0.235, 0.535], [0.335, 0.665], [0.4, 0.6],
  [0.465, 0.665], [0.565, 0.535], [0.62, 0.6],
  [0.675, 0.535], [0.775, 0.665], [0.84, 0.6],
  [0.918, 0.665], [1.005, 0.535], [1.06, 0.6],
  [1.115, 0.535], [1.2, 0.665], [1.28, 0.6],
  [1.362, 0.665], [1.45, 0.535], [1.5, 0.6],
  [1.555, 0.535], [1.635, 0.665], [1.77, 0.6],
];
/** Big trees along the front (birds live in them: see eggs). */
const FRONT_TREES: [number, number, number][] = [
  [0.155, 0.93, 0.04], [0.34, 0.95, 0.045], [0.505, 0.95, 0.04], [0.78, 0.95, 0.045], [0.9, 0.95, 0.04],
  [1.21, 0.95, 0.045], [1.34, 0.95, 0.04], [1.67, 0.95, 0.045],
];

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
   * The town seen from above, like a city map: hills along the back with
   * the tall buildings of the city centre on them, a back street, cross
   * streets with zebra crossings and traffic lights, and the winding main
   * road with a place on each side of every block. Street lamps, trees, a
   * pond by the house, a town square with a fountain, a bus stop. The map
   * is wider than the screen (slide to see it all). Colours follow the season.
   */
  layout(w: number, h: number, season: Season) {
    const pal = PALETTE[season];
    const winter = season === 'winter';
    const u = Math.min(w, h); // a size that suits both ways up
    const B = u * 3.8; // positions along the map are fractions of this
    const M = B * MAP_LENGTH;
    const P = (fx: number, fy: number) => ({ x: fx * B, y: fy * h });
    const g = this.bg.clear();
    const keep = this.camera.x / Math.max(1, this.geom.w || M);
    this.camera.setRoom(0, M, w, h);
    const pave = winter ? 0xf1f5f9 : 0xe9e3d3;
    const rnd = seeded(5);

    // --- the sky (stays put while the map slides) ---
    const sun = { x: w * 0.86, y: h * 0.11, r: u * 0.065 * pal.sunSize };
    const clouds: [number, number, number][] = [];
    for (const [cx, cy, k] of [[0.1, 0.1, 1], [0.4, 0.06, 0.8], [0.64, 0.15, 0.65], [-0.2, 0.2, 0.55]]) {
      clouds.push([w * cx, h * cy, u * 0.045 * k]);
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

    // --- hills along the back, with the city centre's tall buildings on them ---
    const hill = (pts: { x: number; y: number }[], color: number) => {
      const sp = spline(pts, 12);
      g.moveTo(0, h);
      for (const p of sp) g.lineTo(p.x, p.y);
      g.lineTo(M, h).closePath().fill(color);
    };
    const backHill: { x: number; y: number }[] = [];
    for (let fx = 0, i = 0; fx <= MAP_LENGTH + 0.1; fx += 0.09, i++) backHill.push(P(fx, i % 2 ? 0.27 : 0.32));
    hill(backHill, pal.hillBack);
    const towers = winter ? 0xc5d3e0 : 0xa9c4dc;
    for (let x = 0; x < M; x += u * 0.034) {
      // in clusters, with gaps for the hills to show
      if (Math.sin(x / (u * 0.5)) < -0.2 || rnd() < 0.25) continue;
      const th = h * (0.04 + rnd() * 0.08), tw = u * 0.028, ty = h * 0.4 - th;
      g.rect(x, ty, tw, th).fill({ color: towers, alpha: 0.75 });
      for (let wy = ty + 8; wy < h * 0.37; wy += 12) g.rect(x + tw * 0.25, wy, tw * 0.5, 4).fill({ color: 0xffffff, alpha: 0.3 });
      if (rnd() < 0.15) g.moveTo(x + tw / 2, ty).lineTo(x + tw / 2, ty - h * 0.03).stroke({ width: 2, color: towers }); // an aerial
    }
    const frontHill: { x: number; y: number }[] = [];
    for (let fx = 0, i = 0; fx <= MAP_LENGTH + 0.1; fx += 0.07, i++) frontHill.push(P(fx, i % 2 ? 0.385 : 0.415));
    hill(frontHill, pal.hillFront);
    const treeG = winter ? 0x6a9a7f : 0x52b788, treeD = winter ? 0x557f69 : 0x2d6a4f;
    for (let fx = 0.01; fx < MAP_LENGTH; fx += 0.025) {
      if (rnd() < 0.35) continue;
      const x = B * fx, y = h * (0.415 + rnd() * 0.015), r = u * 0.016;
      g.circle(x, y, r).fill(treeG).stroke({ width: 2, color: INK });
      if (winter) g.ellipse(x, y - r * 0.5, r * 0.6, r * 0.3).fill(0xffffff);
    }
    // the town's ground
    const groundTop = h * 0.445;
    g.rect(0, groundTop, M, h - groundTop).fill(pal.grass);
    for (const [cx, seed] of [[0.1, 7], [0.5, 8], [0.95, 9], [1.4, 10]]) hillDots(g, B * cx, h * 0.985, B * 0.1, h * 0.04, pal.dots, seed);
    // the tunnel into the hill, at the top of the first cross street
    const tunnel = { x: B * CROSS[0], y: groundTop + 2, r: u * 0.05 };
    g.moveTo(tunnel.x - tunnel.r - 10, tunnel.y).arc(tunnel.x, tunnel.y, tunnel.r + 10, Math.PI, 0).lineTo(tunnel.x - tunnel.r - 10, tunnel.y).fill(0xadb5bd).stroke({ width: 3, color: INK });
    g.moveTo(tunnel.x - tunnel.r, tunnel.y).arc(tunnel.x, tunnel.y, tunnel.r, Math.PI, 0).lineTo(tunnel.x - tunnel.r, tunnel.y).fill(0x1f1f1f);

    // --- the streets ---
    const roadW = u * 0.045, sideW = roadW * 0.82;
    const road = spline(ROAD.map(([fx, fy]) => P(fx, fy)), 16);
    const roadY = (x: number) => road.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), road[0]).y;
    /** How high and how low the main road goes between x0 and x1. */
    const span = (x0: number, x1: number) => {
      let lo = Infinity, hi = -Infinity;
      for (const p of road) if (p.x >= x0 && p.x <= x1) (lo = Math.min(lo, p.y)), (hi = Math.max(hi, p.y));
      if (lo === Infinity) lo = hi = roadY((x0 + x1) / 2);
      return { lo, hi };
    };
    const backY = h * 0.475;
    const back = spline([P(-0.03, 0.475), P(0.5, 0.47), P(1.0, 0.48), P(1.5, 0.47), P(MAP_LENGTH + 0.03, 0.475)], 16);
    const crossing = (x: number, y: number) => Math.abs(y - roadY(x)) < roadW * 1.1 || Math.abs(y - backY) < sideW;
    const streets: { pts: Pt[]; width: number; skip?: (x: number, y: number) => boolean }[] = CROSS.map((fx, i) => ({
      pts: [P(fx, i === 0 ? tunnel.y / h : backY / h), P(fx, 1.06)],
      width: sideW,
      skip: crossing,
    }));
    streets.push({ pts: back, width: sideW }, { pts: road, width: roadW });
    drawRoads(g, streets, winter);
    const branchStart = { x: tunnel.x, y: roadY(tunnel.x) };
    const branch = spline([branchStart, { x: tunnel.x, y: (branchStart.y + tunnel.y) / 2 }, { x: tunnel.x, y: tunnel.y }], 14);

    // zebra crossings either side of the main road, and traffic lights at some corners
    for (const [i, fx] of CROSS.entries()) {
      const x = B * fx, ry = roadY(x);
      for (const y of [ry - roadW - 18, ry + roadW + 4]) {
        for (let k = -2; k <= 2; k++) g.rect(x + k * sideW * 0.2 - 3, y, 6, 14).fill(0xffffff);
      }
      if (i % 2 === 1) {
        const lx = x + sideW / 2 + 16, ly = ry + roadW / 2 + 40;
        g.rect(lx - 3, ly - 50, 6, 50).fill(0x2b2d42);
        g.roundRect(lx - 9, ly - 82, 18, 40, 5).fill(0x2b2d42).stroke({ width: 2, color: INK });
        g.circle(lx, ly - 74, 4.5).fill(0xe5383b).circle(lx, ly - 62, 4.5).fill(0xffd166).circle(lx, ly - 50, 4.5).fill(0x7bd36b);
      }
    }
    // street lamps along the front of the main road
    for (let fx = 0.03; fx < MAP_LENGTH; fx += 0.06) {
      if (CROSS.some((c) => Math.abs(c - fx) < 0.035)) continue;
      const x = B * fx, y = roadY(x) + roadW / 2 + 9;
      g.rect(x - 2.5, y - 46, 5, 46).fill(0x495057);
      g.moveTo(x, y - 46).quadraticCurveTo(x, y - 54, x + 9, y - 52).stroke({ width: 3, color: 0x495057 });
      g.circle(x + 10, y - 49, 5).fill(0xfff3b0).stroke({ width: 2, color: INK });
    }

    // --- little paw prints from the main road, down a side street to the tiny hidden workshop ---
    const ws = SPOTS.workshop;
    if (ws) {
      const sx = B * ws.fx;
      const from = { x: sx - B * 0.03, y: roadY(sx - B * 0.03) + roadW / 2 + 18 };
      const to = { x: sx + u * 0.02, y: h * (ws.base ?? 0.97) - 6 };
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      const fwd = { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
      const side = { x: -fwd.y, y: fwd.x };
      const pawCol = winter ? 0x9aa5b1 : 0x8d6e63;
      const n = Math.max(6, Math.round(len / 26));
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const k = i % 2 ? 7 : -7;
        const x = from.x + (to.x - from.x) * t + Math.sin(t * Math.PI * 2) * u * 0.015 + side.x * k;
        const y = from.y + (to.y - from.y) * t + side.y * k;
        g.ellipse(x, y, 6, 5).fill({ color: pawCol, alpha: 0.6 });
        for (const s2 of [-1, 0, 1]) g.circle(x + fwd.x * 8 + side.x * s2 * 5, y + fwd.y * 8 + side.y * s2 * 5, 2.4).fill({ color: pawCol, alpha: 0.6 });
      }
    }

    // --- the family's street: the neighbours' houses either side of the house ---
    const houseCols = [0xffd6a5, 0xcaffbf, 0xa0c4ff];
    for (const [i, fx] of [0.015, 0.152].entries()) {
      const x = B * fx, hw = u * 0.075, hh = u * 0.08;
      const base = span(x - hw, x + hw).lo - roadW / 2 - 14 - h * 0.02;
      g.rect(x - hw / 2, base - hh, hw, hh).fill(houseCols[i % houseCols.length]).stroke({ width: 3, color: INK });
      g.poly([x - hw / 2 - 8, base - hh, x, base - hh - u * 0.06, x + hw / 2 + 8, base - hh]).fill([0xe76f51, 0x6d6875][i % 2]).stroke({ width: 3, color: INK });
      g.rect(x - hw * 0.12, base - hh * 0.5, hw * 0.24, hh * 0.5).fill(0xffffff).stroke({ width: 2, color: INK });
      g.rect(x - hw * 0.4, base - hh * 0.8, hw * 0.22, hh * 0.24).rect(x + hw * 0.18, base - hh * 0.8, hw * 0.22, hh * 0.24).fill(0xbfe8ff).stroke({ width: 2, color: INK });
      g.moveTo(x, base).lineTo(x, roadY(x)).stroke({ width: 10, color: pave });
    }
    // the pond, with a little jetty, across the road from the house
    const pond = { x: B * 0.085, y: h * 0.86, rx: u * 0.13, ry: h * 0.065 };
    g.ellipse(pond.x, pond.y, pond.rx + 6, pond.ry + 6).fill(winter ? 0xe3edf5 : 0xc9b48a);
    g.ellipse(pond.x, pond.y, pond.rx, pond.ry).fill(winter ? 0xd6eef8 : 0x6ec6ff).stroke({ width: 3, color: winter ? 0xb7d3e6 : 0x4a9fd8 });
    g.rect(pond.x + pond.rx * 0.45, pond.y - pond.ry * 0.9, pond.rx * 0.45, 10).fill(0xa47e4b).stroke({ width: 2, color: INK });

    // --- the town square with its fountain, and the bus stop ---
    const gap = roadW / 2 + 14 + h * 0.02;
    {
      const x = B * 1.43, half = B * 0.055, top = span(x - half, x + half).hi + gap, bottom = Math.min(h * 0.97, top + h * 0.32);
      g.roundRect(x - half, top, half * 2, bottom - top, 18).fill(pave).stroke({ width: 3, color: 0xbdb5a6 });
      for (let k = 1; k < 6; k++) g.moveTo(x - half + (half * 2 * k) / 6, top + 6).lineTo(x - half + (half * 2 * k) / 6, bottom - 6);
      g.stroke({ width: 1.5, color: 0xd6cdb8 });
      const fy = (top + bottom) / 2, fr = Math.min(B * 0.04, (bottom - top) * 0.35);
      g.ellipse(x, fy, fr + 8, fr * 0.45 + 6).fill(0xbdb5a6).stroke({ width: 3, color: INK });
      g.ellipse(x, fy, fr, fr * 0.45).fill(winter ? 0xd6eef8 : 0x6ec6ff);
      g.rect(x - 5, fy - fr * 0.7, 10, fr * 0.7).fill(0xdee2e6).stroke({ width: 2, color: INK });
      if (!winter) g.moveTo(x, fy - fr * 0.7).quadraticCurveTo(x - fr * 0.5, fy - fr * 1.2, x - fr * 0.7, fy).moveTo(x, fy - fr * 0.7).quadraticCurveTo(x + fr * 0.5, fy - fr * 1.2, x + fr * 0.7, fy).stroke({ width: 4, color: 0xbfe8ff });
      for (const side of [-1, 1]) {
        const bx = x + side * half * 0.72;
        g.rect(bx - 22, bottom - 34, 44, 8).fill(0xc68b59).stroke({ width: 2, color: INK });
        g.rect(bx - 18, bottom - 26, 5, 12).rect(bx + 13, bottom - 26, 5, 12).fill(0x2b2d42);
      }
    }
    {
      const x = B * 1.555, top = span(x - B * 0.05, x + B * 0.05).hi + gap;
      // the shelter: roof, glass back and a bench
      g.rect(x - 48, top + 8, 96, 10).fill(0x4ea8ff).stroke({ width: 3, color: INK });
      g.rect(x - 44, top + 18, 88, 52).fill({ color: 0xbfe8ff, alpha: 0.7 }).stroke({ width: 3, color: INK });
      g.rect(x - 34, top + 52, 68, 8).fill(0xc68b59).stroke({ width: 2, color: INK });
      // the bus stop sign (a little bus on it)
      g.rect(x + 62, top + 2, 5, 72).fill(0x6c757d);
      g.circle(x + 64.5, top + 2, 15).fill(0xffffff).stroke({ width: 3, color: INK });
      g.roundRect(x + 55, top - 5, 19, 12, 3).fill(0xe5383b);
      g.circle(x + 59, top + 8, 2.5).circle(x + 70, top + 8, 2.5).fill(INK);
      // flower beds
      for (const [dx, col] of [[0.045, 0xff8fb1], [0.085, 0xffd166]] as const) {
        const fx2 = x + B * dx, fy2 = top + h * (dx > 0.05 ? 0.26 : 0.18);
        g.ellipse(fx2, fy2, 40, 14).fill(0x8d5524).stroke({ width: 2, color: INK });
        for (let k = -2; k <= 2; k++) g.circle(fx2 + k * 14, fy2 - 6 - (k % 2 ? 4 : 0), 6).fill(col).stroke({ width: 1.5, color: INK });
      }
    }

    // --- the buildings, one each side of the road in every block ---
    const placed: StreetGeom['buildings'] = {};
    for (const b of this.buildings) {
      const spot = SPOTS[b.id] ?? { fx: 0.5, side: 'above' };
      const size = spot.size ?? 1;
      const tex = b.sprite.texture;
      let k = Math.min((u * 0.3 * size) / tex.width, (u * 0.26 * size) / tex.height);
      const x = B * spot.fx;
      let bw = tex.width * k, bh = tex.height * k;
      const s = span(x - bw * 0.6, x + bw * 0.6);
      let y: number;
      if (spot.base) {
        y = h * spot.base; // tucked away at a set spot
      } else if (spot.side === 'above') {
        // standing back from the road, with a driveway down to it
        y = s.lo - gap;
        g.moveTo(x, y - 4).lineTo(x, roadY(x)).stroke({ width: roadW * 0.5, color: INK, cap: 'round' });
        g.moveTo(x, y - 4).lineTo(x, roadY(x)).stroke({ width: roadW * 0.5 - 6, color: pave, cap: 'round' });
      } else {
        // just below the road (a little smaller if there isn't room)
        const top = s.hi + gap;
        const room = h * 0.985 - top;
        if (bh > room) {
          k *= room / bh;
          bw = tex.width * k;
          bh = tex.height * k;
        }
        y = top + bh;
      }
      b.sprite.scale.set(k);
      b.holder.position.set(x, y);
      placed[b.id] = { x, y, w: bw, h: bh };
      // a paved patch to stand on
      g.roundRect(x - bw * 0.58, y - Math.max(8, bh * 0.06), bw * 1.16, Math.max(16, bh * 0.12), 10).fill(pave).stroke({ width: 2, color: 0xbdb5a6 });
    }
    // the buildings further down the screen stand in front
    const view = this.camera.view;
    const order = [...this.buildings].sort((a, b) => a.holder.y - b.holder.y);
    for (const b of order) view.removeChild(b.holder);
    const at = view.getChildIndex(this.eggs);
    order.forEach((b, i) => view.addChildAt(b.holder, at + i));

    // --- trees (swaying in the breeze): along the back street, and big ones at the front ---
    const tree = (fx: number, fy: number, s: number) => {
      const r = u * s;
      this.swaying.add(B * fx, h * fy, (t) => {
        t.rect(-r * 0.15, -r * 0.3, r * 0.3, r * 0.6).fill(0x8d5524).stroke({ width: 2, color: INK });
        t.circle(0, -r * 1.1, r).fill(season === 'autumn' ? 0xe08a3c : treeG).stroke({ width: 3, color: INK });
        t.circle(-r * 0.3, -r * 1.3, r * 0.35).fill({ color: 0xffffff, alpha: 0.18 });
        if (winter) t.ellipse(0, -r * 1.8, r * 0.6, r * 0.25).fill(0xffffff);
      });
    };
    const cypress = (fx: number, fy: number, s: number) => {
      const r = u * s;
      this.swaying.add(B * fx, h * fy, (t) => {
        t.ellipse(0, -r * 1.4, r * 0.5, r * 1.5).fill(treeD).stroke({ width: 3, color: INK });
        if (winter) t.ellipse(0, -r * 2.6, r * 0.3, r * 0.2).fill(0xffffff);
      });
    };
    for (let fx = 0.05, i = 0; fx < MAP_LENGTH; fx += 0.05, i++) {
      if (CROSS.some((c) => Math.abs(c - fx) < 0.03)) continue;
      if (i % 2) cypress(fx, 0.462, 0.024);
      else tree(fx, 0.462, 0.026);
    }
    const trees: { x: number; y: number; r: number }[] = [];
    for (const [fx, fy, s] of FRONT_TREES) {
      tree(fx, fy, s);
      trees.push({ x: B * fx, y: h * fy - u * s * 1.1, r: u * s });
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

/**
 * Streets along paths: outline, pavement, grey road and a dashed white line.
 * All the streets are drawn a layer at a time, so where they cross they
 * join up instead of one's outline cutting across the other.
 */
function drawRoads(g: Graphics, roads: { pts: Pt[]; width: number; skip?: (x: number, y: number) => boolean }[], winter: boolean) {
  const path = (pts: Pt[]) => {
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
  };
  for (const r of roads) {
    path(r.pts);
    g.stroke({ width: r.width + 26, color: INK, cap: 'round', join: 'round' });
  }
  for (const r of roads) {
    path(r.pts);
    g.stroke({ width: r.width + 21, color: winter ? 0xf8fafc : 0xe9ecef, cap: 'round', join: 'round' });
  }
  for (const r of roads) {
    path(r.pts);
    g.stroke({ width: r.width, color: 0x8d99ae, cap: 'round', join: 'round' });
  }
  // dashes: 16 on, 18 off, all the way along
  for (const { pts, skip } of roads) {
    let along = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < len; d += 2) {
        if ((along + d) % 34 < 16) {
          const t0 = d / len, t1 = Math.min(1, (d + 2) / len);
          if (skip?.(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0)) continue; // no lines across a crossing
          g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0).lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        }
      }
      along += len;
    }
  }
  g.stroke({ width: 3, color: 0xffffff, cap: 'butt' });
}
