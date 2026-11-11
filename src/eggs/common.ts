import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import { markEggTouch, touchState } from '../gestures';
import { windowView } from '../places';
import type { Season } from '../seasons';
import { sfx } from '../sound';
import { ease, tween } from '../tween';

/**
 * What a set of surprises gets to work with.
 *   under:    things on the walls and furniture (behind characters)
 *   over:     darkness, glows, things flying round (in front of characters)
 *   sparkles: star bursts
 */
export interface EggKit {
  under: Container;
  over: Container;
  sparkles: Container;
  w: number;
  h: number;
  season: Season;
  /** Wide rooms: the room's left and right edges (it carries on past 0..w). */
  x0?: number;
  x1?: number;
}

/** The whole room from side to side (wider than w in the wide rooms). */
export function roomSpan(kit: EggKit) {
  const x0 = kit.x0 ?? 0;
  return { x: x0, w: (kit.x1 ?? kit.w) - x0 };
}

export type Cleanups = (() => void)[];

export const INK = 0x3a3a3a;

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Make something tappable without it counting as a tap on empty space. */
export function tappable(c: Container, onTap: () => void, hit?: { contains(x: number, y: number): boolean }) {
  c.eventMode = 'static';
  c.cursor = 'pointer';
  if (hit) c.hitArea = hit;
  // Not "empty space", but a finger that slides from here still moves the room.
  c.on('pointerdown', (e: FederatedPointerEvent) => markEggTouch(e.pointerId));
  c.on('pointertap', () => {
    if (!touchState.panned) onTap();
  });
}

/** An invisible tappable area over something in the background. */
export function hotspot(kit: EggKit, rect: Rectangle, onTap: () => void) {
  const c = new Container();
  kit.under.addChild(c);
  tappable(c, onTap, rect);
  return c;
}

/** For surprises that shouldn't restart while they're still playing. */
export function oneAtATime(run: (done: () => void) => void) {
  let busy = false;
  return () => {
    if (busy) return;
    busy = true;
    run(() => (busy = false));
  };
}

/** A soft round glow (several faint circles). */
export function glow(g: Graphics, x: number, y: number, r: number, color: number, strength = 1) {
  for (let i = 7; i >= 1; i--) g.circle(x, y, (r * i) / 7).fill({ color, alpha: Math.min(1, 0.055 * strength) });
}

/** Run something every frame until the place is left. */
export function everyFrame(fn: (dtMs: number) => void, cleanups: Cleanups) {
  const tick = (t: Ticker) => {
    try {
      fn(t.deltaMS);
    } catch {
      Ticker.shared.remove(tick); // something it used has gone: stop, don't freeze everything else
    }
  };
  Ticker.shared.add(tick);
  cleanups.push(() => Ticker.shared.remove(tick));
}

/** setTimeout that's cancelled when the place is left. */
export function later(ms: number, fn: () => void, cleanups: Cleanups) {
  const id = setTimeout(fn, ms);
  cleanups.push(() => clearTimeout(id));
}

/** Several rectangles as one tap area. */
export class MultiHit {
  private rects: Rectangle[];
  constructor(...rects: Rectangle[]) {
    this.rects = rects;
  }
  contains(x: number, y: number) {
    return this.rects.some((r) => r.contains(x, y));
  }
}

/** A point along a cubic curve (for things flying round the room). */
export function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
export interface Pt {
  x: number;
  y: number;
}

/** Room lights: a dark blue veil over everything when they're off. */
export function roomLights(kit: EggKit, onLevel: (level: number) => void = () => {}, darkness = 0.62) {
  const veil = new Graphics();
  veil.eventMode = 'none';
  kit.over.addChildAt(veil, 0);
  let on = true;
  let level = 0;
  const draw = () => {
    veil.clear();
    const span = roomSpan(kit);
    if (level > 0.001) veil.rect(span.x, 0, span.w, kit.h).fill({ color: 0x0b1026, alpha: level });
  };
  return {
    get on() {
      return on;
    },
    get level() {
      return level;
    },
    toggle() {
      on = !on;
      const from = level;
      const to = on ? 0 : darkness;
      tween(350, (t) => {
        level = from + (to - from) * t;
        draw();
        onLevel(level);
      });
    },
  };
}

export function lightSwitch(kit: EggKit, x: number, y: number, lights: { on: boolean; toggle: () => void }) {
  const g = new Graphics();
  const draw = () =>
    g
      .clear()
      .roundRect(x, y, 28, 42, 5)
      .fill(0xffffff)
      .stroke({ width: 3, color: INK })
      .roundRect(x + 9, y + (lights.on ? 8 : 21), 10, 13, 3)
      .fill(0xdee2e6)
      .stroke({ width: 2, color: INK });
  draw();
  kit.under.addChild(g);
  tappable(
    g,
    () => {
      sfx.click();
      lights.toggle();
      draw();
    },
    new Rectangle(x - 20, y - 20, 68, 82),
  );
}

/**
 * A window with blinds you can raise: the outside (day or night, by the
 * real clock) shows when they go up.
 */
export function raisableBlinds(kit: EggKit, x: number, y: number, ww: number, wh: number, frame: number, style: 'slats' | 'blackout') {
  const view = new Graphics();
  windowView(view, x, y, ww, wh);
  view.visible = false;
  kit.under.addChild(view);
  const cover = new Graphics();
  kit.under.addChild(cover);
  let down = 1;
  let isDown = true;
  const draw = () => {
    const bottom = y + wh * down;
    cover.clear();
    if (style === 'slats') {
      cover.rect(x, y, ww, Math.max(14, wh * down)).fill(0xf4f4f4);
      for (let yy = y + 10; yy < bottom - 6; yy += 18) cover.rect(x + 5, yy, ww - 10, 8).fill(0xc9cdd2);
      cover.rect(x, Math.max(y + 8, bottom - 8), ww, 8).fill(0xdee2e6).stroke({ width: 2, color: INK });
      cover.rect(x, y, ww, wh).stroke({ width: 10, color: frame });
    } else {
      cover.rect(x + 3, y, ww - 6, Math.max(2, wh * down)).fill(0x1f1f1f);
      cover.roundRect(x - 6, bottom - 7, ww + 12, 14, 6).fill(0x2b2b2b).stroke({ width: 3, color: INK });
    }
    view.visible = down < 0.98;
  };
  draw();
  tappable(
    cover,
    () => {
      isDown = !isDown;
      sfx.zip();
      const from = down;
      const to = isDown ? 1 : 0.08;
      tween(550, (t) => {
        down = from + (to - from) * ease.inOutSine(t);
        draw();
      });
    },
    new Rectangle(x - 10, y - 10, ww + 20, wh + 20),
  );
}

/** Water spraying out in an arc, as drops. */
export function spray(kit: EggKit, x: number, y: number, vx: number, vy: number, ms: number, color = 0x6ec6ff, floorY = kit.h) {
  let made = 0;
  const id = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const d = new Graphics().circle(0, 0, rand(3, 6)).fill({ color, alpha: 0.85 });
      d.position.set(x, y);
      kit.over.addChild(d);
      const dvx = vx * rand(0.8, 1.2), dvy = vy * rand(0.85, 1.15);
      tween(900, (t) => {
        const tt = t * 900;
        d.x = x + dvx * tt;
        d.y = y + dvy * tt + 0.0012 * tt * tt;
        if (d.y > floorY) d.alpha = 0;
      }, () => d.destroy());
    }
    made += 50;
    if (made >= ms) clearInterval(id);
  }, 50);
}

/** Rain (or snow in winter) falling from a cloud. */
export function rainFrom(kit: EggKit, x: number, y: number, width: number, groundY: number, ms = 2400) {
  const snow = kit.season === 'winter';
  if (snow) sfx.twinkle();
  else sfx.rain(ms / 1000);
  let made = 0;
  const id = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const d = new Graphics();
      if (snow) d.circle(0, 0, rand(2, 4)).fill(0xffffff);
      else d.roundRect(-1.5, -6, 3, 12, 2).fill({ color: 0x4ea8ff, alpha: 0.8 });
      const sx = x + rand(-width / 2, width / 2);
      d.position.set(sx, y);
      kit.over.addChild(d);
      const speed = snow ? 0.12 : 0.6;
      const dist = groundY - y;
      tween(dist / speed, (t) => {
        d.y = y + dist * t;
        if (snow) d.x = sx + Math.sin(t * 12) * 6;
      }, () => d.destroy());
    }
    made += 60;
    if (made >= ms) clearInterval(id);
  }, 60);
}

/** Things tumbling down with a bounce, then fading (apples, leaves, socks...). */
export function tumble(kit: EggKit, piece: Graphics, x: number, y: number, floorY: number, opts: { vx?: number; vy?: number; spin?: number; float?: boolean } = {}) {
  piece.position.set(x, y);
  kit.over.addChild(piece);
  const vx = opts.vx ?? rand(-0.15, 0.15);
  const vy = opts.vy ?? 0;
  const g = opts.float ? 0.00025 : 0.0012;
  const spin = opts.spin ?? rand(-4, 4);
  tween(1800, (t) => {
    const ms = t * 1800;
    piece.x = x + vx * ms + (opts.float ? Math.sin(ms * 0.006) * 14 : 0);
    piece.y = Math.min(floorY, y + vy * ms + g * ms * ms);
    piece.rotation = spin * t;
    piece.alpha = t > 0.8 ? 1 - (t - 0.8) * 5 : 1;
  }, () => piece.destroy());
}

/** A simple bird (for roofs, branches and windows). */
export function drawBird(g: Graphics, color = 0x4ea8ff) {
  g.ellipse(0, 0, 14, 10).fill(color).stroke({ width: 2.5, color: INK });
  g.circle(10, -8, 7).fill(color).stroke({ width: 2.5, color: INK });
  g.circle(12, -9, 2).fill(INK);
  g.poly([16, -8, 23, -6, 16, -4]).fill(0xffa94d);
  g.ellipse(-4, -2, 7, 4).fill({ color: 0xffffff, alpha: 0.6 });
  return g;
}
