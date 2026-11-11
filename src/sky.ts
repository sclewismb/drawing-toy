import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import { markEggTouch, touchState } from './gestures';

/**
 * The sky behind an outdoor scene: its colour, the sun, clouds that drift
 * slowly across (big ones slower, so it feels deep), and far-away trees that
 * sway in a gentle breeze. The scene's own picture is drawn on top, so the
 * clouds pass behind hills, trees and buildings.
 *
 * Tap a cloud and `onCloudTap` is told where it is (the surprises make it
 * rain, or snow in winter).
 */
export interface SkyDef {
  /** The stretch it covers, left to right (wide rooms go below 0). */
  x0: number;
  x1: number;
  h: number;
  color: number;
  sun?: { x: number; y: number; r: number; color: number; rays?: boolean };
  /** Each cloud: its left puff's centre and size. */
  clouds: { x: number; y: number; r: number }[];
  cloudColor: number;
  /** Far-away things that don't move (drawn in front of the clouds, behind the trees). */
  far?: (g: Graphics) => void;
  /** Trees that sway: each drawn round the foot of its trunk at (0, 0). */
  trees?: { x: number; y: number; draw: (g: Graphics) => void }[];
}

export class Sky extends Container {
  private bg = new Graphics();
  private cloudLayer = new Container();
  private far = new Graphics();
  private treeLayer = new Container();
  private clouds: { g: Graphics; speed: number; r: number }[] = [];
  private trees: { g: Graphics; phase: number; speed: number; amount: number }[] = [];
  private span = { x0: 0, x1: 0 };
  private time = 0;
  /** A cloud was tapped: its middle and size. */
  onCloudTap: ((x: number, y: number, r: number) => void) | null = null;

  constructor(selfUpdate = false) {
    super();
    this.addChild(this.bg, this.cloudLayer, this.far, this.treeLayer);
    this.visible = false;
    // Views that aren't part of a place keep themselves moving.
    if (selfUpdate) Ticker.shared.add((t) => onScreen(this) && this.update(t.deltaMS));
  }

  /** Lay out the sky (null = no sky here). */
  set(def: SkyDef | null) {
    for (const c of this.cloudLayer.removeChildren()) c.destroy();
    for (const c of this.treeLayer.removeChildren()) c.destroy();
    this.clouds = [];
    this.trees = [];
    this.bg.clear();
    this.far.clear();
    this.visible = !!def;
    if (!def) return;
    this.span = { x0: def.x0, x1: def.x1 };
    this.bg.rect(def.x0, 0, def.x1 - def.x0, def.h).fill(def.color);
    const sun = def.sun;
    if (sun) {
      if (sun.rays) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.bg.moveTo(sun.x + Math.cos(a) * sun.r * 1.25, sun.y + Math.sin(a) * sun.r * 1.25).lineTo(sun.x + Math.cos(a) * sun.r * 1.6, sun.y + Math.sin(a) * sun.r * 1.6);
        }
        this.bg.stroke({ width: 4, color: sun.color, cap: 'round' });
      }
      this.bg.circle(sun.x, sun.y, sun.r).fill(sun.color);
    }
    for (const c of def.clouds) {
      const g = new Graphics();
      const r = c.r;
      g.circle(0, 0, r).circle(r, -r * 0.4, r * 1.2).circle(r * 2.1, 0, r).fill(def.cloudColor);
      g.position.set(c.x, c.y);
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.hitArea = new Rectangle(-r * 1.2, -r * 1.8, r * 4.4, r * 3);
      // Not "empty space", but a finger sliding from here still moves the room.
      g.on('pointerdown', (e: FederatedPointerEvent) => markEggTouch(e.pointerId));
      g.on('pointertap', () => {
        if (!touchState.panned) this.onCloudTap?.(this.x + g.x + r, this.y + g.y, r); // (in the sky's parent's coordinates)
      });
      this.cloudLayer.addChild(g);
      // bigger clouds are nearer, so they drift a little faster
      this.clouds.push({ g, r, speed: 0.006 + (r / 60) * 0.007 * (0.8 + Math.random() * 0.4) });
    }
    def.far?.(this.far);
    for (const t of def.trees ?? []) {
      const g = new Graphics();
      t.draw(g);
      g.position.set(t.x, t.y);
      this.treeLayer.addChild(g);
      this.trees.push({ g, phase: Math.random() * Math.PI * 2, speed: 0.0009 + Math.random() * 0.0005, amount: 0.025 + Math.random() * 0.02 });
    }
  }

  update(dtMs: number) {
    if (!this.visible) return;
    this.time += dtMs;
    const { x0, x1 } = this.span;
    for (const c of this.clouds) {
      c.g.x += c.speed * dtMs;
      if (c.g.x - c.r * 1.2 > x1) c.g.x = x0 - c.r * 3.4; // round again from the left
    }
    for (const t of this.trees) t.g.skew.x = swayAt(this.time, t);
  }
}

/** Is it (and everything it sits in) showing? No point moving things nobody can see. */
function onScreen(c: Container) {
  for (let n: Container | null = c; n; n = n.parent) if (!n.visible) return false;
  return !!c.parent;
}

/** A gentle breeze: a slow sway with the odd soft gust. */
export function swayAt(time: number, t: { phase: number; speed: number; amount: number }) {
  const gust = 0.6 + 0.4 * Math.sin(time * 0.00023 + t.phase * 0.5);
  return Math.sin(time * t.speed + t.phase) * t.amount * gust;
}

/** Make some trees (each drawn round the foot of its trunk) sway in the breeze. */
export class SwayingTrees extends Container {
  private list: { g: Graphics; phase: number; speed: number; amount: number }[] = [];
  private time = 0;

  constructor() {
    super();
    Ticker.shared.add((t) => {
      if (!onScreen(this)) return;
      this.time += t.deltaMS;
      for (const tr of this.list) tr.g.skew.x = swayAt(this.time, tr);
    });
  }

  clear() {
    for (const c of this.removeChildren()) c.destroy();
    this.list = [];
  }

  add(x: number, y: number, draw: (g: Graphics) => void) {
    const g = new Graphics();
    draw(g);
    g.position.set(x, y);
    this.addChild(g);
    this.list.push({ g, phase: Math.random() * Math.PI * 2, speed: 0.0009 + Math.random() * 0.0005, amount: 0.02 + Math.random() * 0.02 });
  }
}
