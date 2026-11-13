import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst, hearts } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { bezier, everyFrame, INK, later, oneAtATime, rand, tappable, type Cleanups, type EggKit, type Pt } from './common';

/**
 * Building blocks for the little hidden things in every place (see eggs/more/):
 * things that peek out of a hiding spot, drop down on a thread, crawl along,
 * fly off and land somewhere else, open up, jiggle, or hide somewhere new
 * each time they're found. Plus the small creatures who do the hiding.
 *
 * Every art function draws round (0, 0) = the middle of its bottom edge
 * (unless it says otherwise), facing right, at size `s` (1 = an 800px tall screen).
 */

export type Draw = (g: Graphics) => void;

/** Night time by the real clock (the same as the windows). */
export const night = () => {
  const hr = new Date().getHours();
  return hr >= 19 || hr < 7;
};

export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Draw something into its own Graphics, added to `parent` at (x, y). */
export function drawn(draw: Draw, parent: Container, x = 0, y = 0) {
  const g = new Graphics();
  draw(g);
  g.position.set(x, y);
  parent.addChild(g);
  return g;
}

const layer = (kit: EggKit, over?: boolean) => (over ? kit.over : kit.under);

// --- little ways to say "you found me!" ---
function wiggle(t: Container, done?: () => void) {
  const r0 = t.rotation;
  tween(650, (k) => (t.rotation = r0 + Math.sin(k * Math.PI * 6) * 0.2 * (1 - k)), () => ((t.rotation = r0), done?.()));
}
function hop(t: Container, height: number, done?: () => void) {
  const y0 = t.y;
  tween(800, (k) => (t.y = y0 - Math.abs(Math.sin(k * Math.PI * 2)) * height), () => ((t.y = y0), done?.()));
}
function lookAround(t: Container, done?: () => void) {
  const sx = t.scale.x;
  tween(1000, (k) => (t.scale.x = k > 0.3 && k < 0.65 ? -sx : sx), () => ((t.scale.x = sx), done?.()));
}
function stretch(t: Container, done?: () => void) {
  tween(600, (k) => {
    const q = Math.sin(k * Math.PI);
    t.scale.y = Math.sign(t.scale.y || 1) * (1 + q * 0.25);
    t.scale.x = Math.sign(t.scale.x || 1) * (1 - q * 0.12);
  }, () => (t.scale.set(Math.sign(t.scale.x || 1), Math.sign(t.scale.y || 1)), done?.()));
}
/** One of the "found you" reactions, a different one most times. */
export function react(t: Container, size: number) {
  pick([() => wiggle(t), () => hop(t, size * 0.5), () => lookAround(t), () => stretch(t)])();
}

// ---------------------------------------------------------------------------
// Peekers: something hiding in a hole, behind a bush, in a box... Tap the
// hiding spot and it pops up (now and then it's someone rarer instead).
// ---------------------------------------------------------------------------
export interface Peek {
  /** The bottom middle of the hiding spot (where it comes up from). */
  x: number;
  y: number;
  who: Draw;
  /** Sometimes (about one time in six) someone else is in there. */
  rare?: Draw;
  /** How far it comes up (or out, for `sideways`). */
  rise: number;
  /** Only seen inside this shape (a hole), drawn round (x, y) and filled. */
  hole?: Draw;
  back?: Draw;
  front?: Draw;
  /** The tap area, round (x, y). */
  hit: Rectangle;
  sound?: () => void;
  rareSound?: () => void;
  over?: boolean;
  stay?: number;
  /** Slides out to the side (+1 right, -1 left) instead of coming up. */
  sideways?: number;
  /** Called each time it's found (after it's come out). */
  onFound?: (count: number, rare: boolean) => void;
}
export function peeker(kit: EggKit, cleanups: Cleanups, o: Peek) {
  const c = new Container();
  c.position.set(o.x, o.y);
  layer(kit, o.over).addChild(c);
  if (o.back) drawn(o.back, c);
  const body = new Container();
  c.addChild(body);
  const usual = drawn(o.who, body);
  const rare = o.rare ? drawn(o.rare, body) : null;
  if (rare) rare.visible = false;
  if (o.hole) {
    const m = new Graphics();
    o.hole(m);
    c.addChild(m);
    body.mask = m;
  }
  if (o.front) drawn(o.front, c);
  const out = (k: number) => {
    if (o.sideways) body.x = -o.sideways * o.rise * (1 - k);
    else body.y = o.rise * (1 - k);
  };
  out(0);
  let count = 0;
  tappable(c, oneAtATime((done) => {
    const isRare = !!rare && Math.random() < 0.17;
    usual.visible = !isRare;
    if (rare) rare.visible = isRare;
    (isRare ? (o.rareSound ?? o.sound) : o.sound)?.();
    tween(380, (k) => out(ease.outBack(k)), () => {
      react(body, o.rise * 0.3);
      o.onFound?.(++count, isRare);
      later(o.stay ?? 1500, () => tween(420, (k) => out(1 - k), done), cleanups);
    });
  }), o.hit);
  return c;
}

// ---------------------------------------------------------------------------
// Danglers: tucked up high; tap and down it comes on its thread, bobs about,
// then climbs back up.
// ---------------------------------------------------------------------------
export function dangler(kit: EggKit, cleanups: Cleanups, o: { x: number; top: number; drop: number; who: Draw; size: number; sound?: () => void; color?: number; over?: boolean }) {
  const c = new Container();
  c.position.set(o.x, o.top);
  layer(kit, o.over).addChild(c);
  const thread = new Graphics();
  c.addChild(thread);
  const body = new Container();
  drawn(o.who, body);
  c.addChild(body);
  const tucked = o.size * 0.6;
  body.y = tucked;
  let t = 0;
  let down = false;
  everyFrame((dt) => {
    t += dt;
    body.x = Math.sin(t * 0.002) * (body.y / o.drop) * 8;
    thread.clear().moveTo(0, 0).lineTo(body.x, body.y - o.size * 0.4).stroke({ width: 1.5, color: o.color ?? 0x9aa0a6 });
  }, cleanups);
  tappable(body, oneAtATime((done) => {
    if (down) {
      o.sound?.();
      sfx.giggle(1.4);
      tween(700, (k) => (body.rotation = Math.sin(k * Math.PI * 4) * 0.4), () => ((body.rotation = 0), done()));
      return;
    }
    down = true;
    sfx.slideWhistle(0.8);
    tween(900, (k) => (body.y = tucked + (o.drop - tucked) * ease.outBack(k)), () => {
      o.sound?.();
      done();
      later(3200, () => tween(1600, (k) => (body.y = o.drop - (o.drop - tucked) * ease.inOutSine(k)), () => (down = false)), cleanups);
    });
  }), new Rectangle(-o.size, -o.size, o.size * 2, o.size * 2));
  return c;
}

// ---------------------------------------------------------------------------
// Crawlers: going to and fro along a wall, a fence, the floor. Tap and they
// stop and do their thing.
// ---------------------------------------------------------------------------
export function crawler(kit: EggKit, cleanups: Cleanups, o: {
  from: Pt; to: Pt; who: Draw; size: number; speed: number;
  /** What it looks like while it's hiding (a snail in its shell). */
  hiding?: Draw;
  how?: 'hide' | 'hop' | 'zoom' | 'spin';
  sound?: () => void; over?: boolean;
}) {
  const body = new Container();
  const walk = drawn(o.who, body);
  const hid = o.hiding ? drawn(o.hiding, body) : null;
  if (hid) hid.visible = false;
  layer(kit, o.over).addChild(body);
  const dx = o.to.x - o.from.x, dy = o.to.y - o.from.y;
  const len = Math.hypot(dx, dy) || 1;
  let at = Math.random(), dir = 1, paused = 0, boost = 1, t = 0;
  everyFrame((dt) => {
    t += dt;
    if (paused > 0) paused -= dt;
    else {
      at += (dir * o.speed * boost * dt) / 1000 / len;
      if (at > 1) (at = 1), (dir = -1);
      if (at < 0) (at = 0), (dir = 1);
    }
    body.position.set(o.from.x + dx * at, o.from.y + dy * at);
    body.scale.x = dir * (dx < 0 ? -1 : 1) || 1;
    if (Math.abs(dy) > Math.abs(dx)) body.rotation = Math.atan2(dy * dir, dx * dir || 0.0001);
  }, cleanups);
  tappable(body, oneAtATime((done) => {
    o.sound?.();
    const how = o.how ?? 'hop';
    if (how === 'hide') {
      paused = 2600;
      walk.visible = false;
      if (hid) hid.visible = true;
      wiggle(body);
      later(2400, () => {
        walk.visible = true;
        if (hid) hid.visible = false;
        done();
      }, cleanups);
    } else if (how === 'zoom') {
      boost = 9;
      dir = -dir;
      later(1100, () => ((boost = 1), done()), cleanups);
    } else if (how === 'spin') {
      paused = 900;
      tween(800, (k) => (body.rotation = k * Math.PI * 2), () => ((body.rotation = 0), done()));
    } else {
      paused = 1200;
      hop(body, o.size * 0.8, done);
    }
  }), new Rectangle(-o.size, -o.size * 1.3, o.size * 2, o.size * 1.6));
  return body;
}

// ---------------------------------------------------------------------------
// Fliers: resting somewhere; tap and off they go round the place, landing
// in a different spot (so you have to look for them again).
// ---------------------------------------------------------------------------
export function flier(kit: EggKit, cleanups: Cleanups, o: {
  rests: Pt[]; who: Draw; size: number;
  /** The area it flies round. */
  area: { x0: number; x1: number; y0: number; y1: number };
  /** Paper planes glide (tilt along the way) instead of flapping. */
  glide?: boolean; ms?: number;
  sound?: () => void; over?: boolean;
}) {
  const body = new Container();
  drawn(o.who, body);
  layer(kit, o.over ?? true).addChild(body);
  let spot = Math.floor(Math.random() * o.rests.length);
  body.position.set(o.rests[spot].x, o.rests[spot].y);
  tappable(body, oneAtATime((done) => {
    o.sound?.();
    const from = { x: body.x, y: body.y };
    if (o.rests.length > 1) spot = (spot + 1 + Math.floor(Math.random() * (o.rests.length - 1))) % o.rests.length;
    const to = o.rests[spot];
    const a = o.area;
    const p1 = { x: rand(a.x0, a.x1), y: rand(a.y0, a.y1) };
    const p2 = { x: rand(a.x0, a.x1), y: rand(a.y0, a.y1) };
    let last = from;
    tween(o.ms ?? 2600, (k) => {
      const p = bezier(from, p1, p2, to, ease.inOutSine(k));
      const vx = p.x - last.x, vy = p.y - last.y;
      if (Math.abs(vx) > 0.3) body.scale.x = vx > 0 ? 1 : -1;
      if (o.glide) body.rotation = Math.atan2(vy, Math.abs(vx)) * (vx > 0 ? 1 : -1) * 0.8;
      else body.scale.y = 1 - Math.abs(Math.sin(k * 90)) * 0.35;
      body.position.set(p.x, p.y);
      last = p;
    }, () => {
      body.rotation = 0;
      body.scale.y = 1;
      done();
    });
  }), new Rectangle(-o.size, -o.size, o.size * 2, o.size * 2));
  return body;
}

// ---------------------------------------------------------------------------
// Openers: a lid, a door, a box. Tap and it opens and something pops out
// (a different thing each time), then it shuts again.
// ---------------------------------------------------------------------------
export function opener(kit: EggKit, cleanups: Cleanups, o: {
  x: number; y: number; closed: Draw; open: Draw;
  /** What pops out (one picked each time), and from where (round x, y). */
  inside?: Draw[]; from?: Pt; up?: number;
  hit: Rectangle; sound?: () => void; over?: boolean; shutAfter?: number;
  /** Leave what popped out alone (onOpen animates it instead). */
  still?: boolean;
  /** It comes out in front (out of a cupboard), not up from behind (out of a jar). */
  inFront?: boolean;
  onOpen?: (popped: Container | null) => void;
}) {
  const c = new Container();
  c.position.set(o.x, o.y);
  layer(kit, o.over).addChild(c);
  const shut = drawn(o.closed, c);
  const open = drawn(o.open, c);
  open.visible = false;
  tappable(c, oneAtATime((done) => {
    o.sound?.();
    shut.visible = false;
    open.visible = true;
    let popped: Container | null = null;
    if (o.inside?.length) {
      popped = new Container();
      drawn(pick(o.inside), popped);
      const f = o.from ?? { x: 0, y: 0 };
      popped.position.set(f.x, f.y);
      if (o.inFront) c.addChild(popped);
      else c.addChildAt(popped, c.getChildIndex(open));
      const up = o.up ?? 40;
      tween(500, (k) => {
        popped!.y = f.y - up * ease.outBack(k);
        popped!.scale.set(0.3 + 0.7 * ease.outBack(k));
      }, () => !o.still && react(popped!, up * 0.4));
    }
    o.onOpen?.(popped);
    later(o.shutAfter ?? 2200, () => {
      const p = popped;
      const finish = () => {
        p?.destroy();
        shut.visible = true;
        open.visible = false;
        sfx.click();
        done();
      };
      if (p && !p.destroyed) tween(300, (k) => p.scale.set(1 - k), finish);
      else finish();
    }, cleanups);
  }), o.hit);
  return c;
}

// ---------------------------------------------------------------------------
// Jigglers: tap and it spins, twirls, sways, squashes or hops.
// ---------------------------------------------------------------------------
export function jiggler(kit: EggKit, cleanups: Cleanups, o: {
  x: number; y: number; draw: Draw; hit: Rectangle;
  how: 'spin' | 'twirl' | 'sway' | 'squash' | 'hop' | 'swing';
  sound?: () => void; over?: boolean; ms?: number;
}) {
  const c = new Container();
  c.position.set(o.x, o.y);
  layer(kit, o.over).addChild(c);
  const g = drawn(o.draw, c);
  tappable(c, oneAtATime((done) => {
    o.sound?.();
    const ms = o.ms ?? 1200;
    const end = () => {
      g.rotation = 0;
      g.scale.set(1);
      g.y = 0;
      done();
    };
    if (o.how === 'spin') tween(ms, (k) => (g.rotation = ease.outCubic(k) * Math.PI * 4), end);
    else if (o.how === 'twirl') tween(ms * 1.6, (k) => (g.scale.x = Math.cos(ease.outCubic(k) * Math.PI * 6)), end);
    else if (o.how === 'sway' || o.how === 'swing') tween(ms * 1.4, (k) => (g.rotation = Math.sin(k * Math.PI * 5) * (o.how === 'swing' ? 0.5 : 0.15) * (1 - k)), end);
    else if (o.how === 'squash') tween(ms * 0.6, (k) => g.scale.set(1 + Math.sin(k * Math.PI * 3) * 0.15 * (1 - k), 1 - Math.sin(k * Math.PI * 3) * 0.15 * (1 - k)), end);
    else tween(ms * 0.7, (k) => (g.y = -Math.abs(Math.sin(k * Math.PI * 2)) * o.hit.height * 0.3), end);
  }), o.hit);
  return c;
}

// ---------------------------------------------------------------------------
// Hiders: a little someone who hides in one of several spots. Find them and
// they giggle, vanish in a puff and hide somewhere else.
// ---------------------------------------------------------------------------
export function hider(kit: EggKit, cleanups: Cleanups, o: { spots: Pt[]; who: Draw; size: number; sound?: () => void; over?: boolean }) {
  const body = new Container();
  drawn(o.who, body);
  layer(kit, o.over).addChild(body);
  let spot = Math.floor(Math.random() * o.spots.length);
  body.position.set(o.spots[spot].x, o.spots[spot].y);
  tappable(body, oneAtATime((done) => {
    (o.sound ?? (() => sfx.giggle(1.3)))();
    hop(body, o.size * 0.6, () => {
      burst(kit.sparkles, body.x, body.y - o.size * 0.5, 10, 60);
      sfx.poof();
      tween(250, (k) => (body.alpha = 1 - k), () => {
        spot = (spot + 1 + Math.floor(Math.random() * (o.spots.length - 1))) % o.spots.length;
        body.position.set(o.spots[spot].x, o.spots[spot].y);
        later(900, () => tween(400, (k) => (body.alpha = k), done), cleanups);
      });
    });
  }), new Rectangle(-o.size * 0.7, -o.size * 1.4, o.size * 1.4, o.size * 1.5));
  return body;
}

/** A round wall clock that shows the real time; tap and the hands whizz round, then it chimes. */
export function wallClock(kit: EggKit, cleanups: Cleanups, x: number, y: number, r: number, rim = 0x4dabf7) {
  const c = new Container();
  c.position.set(x, y);
  kit.under.addChild(c);
  const face = new Graphics();
  face.circle(0, 0, r).fill(0xffffff).stroke({ width: r * 0.16, color: rim });
  face.circle(0, 0, r).stroke({ width: 2, color: INK });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    face.circle(Math.sin(a) * r * 0.75, -Math.cos(a) * r * 0.75, i % 3 === 0 ? r * 0.07 : r * 0.04).fill(INK);
  }
  c.addChild(face);
  const hour = new Graphics().roundRect(-r * 0.05, -r * 0.5, r * 0.1, r * 0.55, r * 0.05).fill(INK);
  const minute = new Graphics().roundRect(-r * 0.035, -r * 0.72, r * 0.07, r * 0.77, r * 0.035).fill(0xe5383b);
  c.addChild(hour, minute, new Graphics().circle(0, 0, r * 0.08).fill(INK));
  let extra = 0;
  everyFrame(() => {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    minute.rotation = (m / 60) * Math.PI * 2 + extra * Math.PI * 2;
    hour.rotation = ((now.getHours() % 12) + m / 60) / 12 * Math.PI * 2 + (extra / 12) * Math.PI * 2;
  }, cleanups);
  tappable(c, oneAtATime((done) => {
    sfx.whirr();
    tween(1600, (k) => (extra = ease.inOutSine(k) * 3), () => {
      extra = 0;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) later(i * 450, () => sfx.ding(), cleanups);
      later(n * 450, done, cleanups);
    });
  }), new Rectangle(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4));
}

/** Hearts or stars from a spot (for the happy endings). */
export function cheer(kit: EggKit, x: number, y: number, love = false) {
  if (love) hearts(kit.sparkles, x, y, 5);
  else burst(kit.sparkles, x, y, 12, 70);
}

// ===========================================================================
// The creatures (and a few things)
// ===========================================================================
const line = (s: number, width = 2.5) => ({ width: width * s, color: INK });

/** A mouse face, peeking out (front on). */
export const mouseFace = (s: number, fur = 0xb8b8c0): Draw => (g) => {
  g.circle(-11 * s, -26 * s, 8 * s).fill(fur).stroke(line(s));
  g.circle(11 * s, -26 * s, 8 * s).fill(fur).stroke(line(s));
  g.circle(-11 * s, -26 * s, 4 * s).fill(0xffb3c6);
  g.circle(11 * s, -26 * s, 4 * s).fill(0xffb3c6);
  g.ellipse(0, -13 * s, 12 * s, 13 * s).fill(fur).stroke(line(s));
  g.circle(-5 * s, -16 * s, 2.3 * s).fill(INK);
  g.circle(5 * s, -16 * s, 2.3 * s).fill(INK);
  g.circle(0, -9 * s, 2.6 * s).fill(0xff8fab);
  g.moveTo(-4 * s, -9 * s).lineTo(-15 * s, -11 * s).moveTo(-4 * s, -8 * s).lineTo(-15 * s, -6 * s)
    .moveTo(4 * s, -9 * s).lineTo(15 * s, -11 * s).moveTo(4 * s, -8 * s).lineTo(15 * s, -6 * s).stroke(line(s, 1));
};
/** A mouse running (side on). */
export const mouseSide = (s: number, fur = 0xb8b8c0): Draw => (g) => {
  g.moveTo(-13 * s, -6 * s).quadraticCurveTo(-30 * s, -2 * s, -27 * s, -15 * s).stroke({ width: 2.5 * s, color: 0xff8fab });
  g.ellipse(0, -9 * s, 15 * s, 9 * s).fill(fur).stroke(line(s));
  g.circle(8 * s, -18 * s, 6 * s).fill(fur).stroke(line(s));
  g.circle(8 * s, -18 * s, 3 * s).fill(0xffb3c6);
  g.circle(10 * s, -10 * s, 2 * s).fill(INK);
  g.circle(16 * s, -8 * s, 2.4 * s).fill(0xff8fab);
};
/** A tiny friendly dragon face (the rare one in a hole). */
export const dragonFace = (s: number): Draw => (g) => {
  g.poly([-12 * s, -22 * s, -8 * s, -36 * s, -3 * s, -24 * s]).fill(0xffd43b).stroke(line(s, 2));
  g.poly([12 * s, -22 * s, 8 * s, -36 * s, 3 * s, -24 * s]).fill(0xffd43b).stroke(line(s, 2));
  g.ellipse(0, -13 * s, 14 * s, 14 * s).fill(0x7bd36b).stroke(line(s));
  g.ellipse(0, -7 * s, 9 * s, 6 * s).fill(0xb2f2bb).stroke(line(s, 1.5));
  g.circle(-5 * s, -17 * s, 3 * s).fill(0xffffff).stroke(line(s, 1.5));
  g.circle(5 * s, -17 * s, 3 * s).fill(0xffffff).stroke(line(s, 1.5));
  g.circle(-5 * s, -17 * s, 1.4 * s).fill(INK);
  g.circle(5 * s, -17 * s, 1.4 * s).fill(INK);
  g.circle(-3 * s, -7 * s, 1.2 * s).fill(INK);
  g.circle(3 * s, -7 * s, 1.2 * s).fill(INK);
};
/** A round spider with big eyes (drawn round its middle). */
export const spider = (s: number, body = 0x2b2d42): Draw => (g) => {
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const a = -0.6 + i * 0.4;
    g.moveTo(side * 6 * s, 0).quadraticCurveTo(side * 16 * s, (a * 14 - 8) * s, side * 20 * s, (a * 16 + 6) * s);
  }
  g.stroke(line(s, 2));
  g.circle(0, 0, 10 * s).fill(body).stroke(line(s, 2));
  g.circle(-4 * s, -2 * s, 3.5 * s).fill(0xffffff);
  g.circle(4 * s, -2 * s, 3.5 * s).fill(0xffffff);
  g.circle(-4 * s, -1.5 * s, 1.6 * s).fill(INK);
  g.circle(4 * s, -1.5 * s, 1.6 * s).fill(INK);
  g.arc(0, 3 * s, 3 * s, 0.2, Math.PI - 0.2).stroke({ width: 1.5 * s, color: 0xffffff });
};
const shellOf = (s: number, color: number) => (g: Graphics) => {
  g.circle(-2 * s, -12 * s, 11 * s).fill(color).stroke(line(s));
  g.moveTo(-2 * s, -12 * s).arc(-2 * s, -12 * s, 3 * s, 0, Math.PI * 1.5).arc(-2 * s, -12 * s, 7 * s, Math.PI * 1.5, Math.PI * 3.2).stroke(line(s, 1.8));
};
export const snail = (s: number, shell = 0xe8a87c): Draw => (g) => {
  g.moveTo(-14 * s, 0).lineTo(14 * s, 0).quadraticCurveTo(20 * s, 0, 18 * s, -10 * s).lineTo(14 * s, -12 * s).lineTo(12 * s, -4 * s).lineTo(-14 * s, -3 * s).closePath().fill(0xd8e2a5).stroke(line(s, 2));
  g.moveTo(15 * s, -11 * s).lineTo(13 * s, -20 * s).moveTo(18 * s, -10 * s).lineTo(21 * s, -19 * s).stroke(line(s, 1.5));
  g.circle(13 * s, -20 * s, 1.8 * s).fill(INK);
  g.circle(21 * s, -19 * s, 1.8 * s).fill(INK);
  shellOf(s, shell)(g);
};
export const snailShell = (s: number, shell = 0xe8a87c): Draw => shellOf(s, shell);
export const squirrel = (s: number): Draw => (g) => {
  g.moveTo(-8 * s, -6 * s).bezierCurveTo(-34 * s, -4 * s, -36 * s, -40 * s, -16 * s, -38 * s).bezierCurveTo(-26 * s, -30 * s, -20 * s, -14 * s, -6 * s, -14 * s).closePath().fill(0xc8743c).stroke(line(s));
  g.ellipse(0, -10 * s, 12 * s, 10 * s).fill(0xd9853b).stroke(line(s));
  g.circle(11 * s, -20 * s, 8 * s).fill(0xd9853b).stroke(line(s));
  g.poly([8 * s, -26 * s, 9 * s, -33 * s, 13 * s, -27 * s]).fill(0xd9853b).stroke(line(s, 1.5));
  g.ellipse(2 * s, -7 * s, 6 * s, 4 * s).fill(0xffe8cc);
  g.circle(14 * s, -21 * s, 1.8 * s).fill(INK);
  g.circle(19 * s, -18 * s, 1.6 * s).fill(INK);
};
/** A mole popping up (front on), with a pink starry nose. */
export const moleFace = (s: number): Draw => (g) => {
  g.ellipse(0, -14 * s, 15 * s, 15 * s).fill(0x5c4033).stroke(line(s));
  g.ellipse(-12 * s, -4 * s, 6 * s, 4 * s).fill(0xffb3c6).stroke(line(s, 1.5));
  g.ellipse(12 * s, -4 * s, 6 * s, 4 * s).fill(0xffb3c6).stroke(line(s, 1.5));
  g.circle(0, -12 * s, 4.5 * s).fill(0xff8fab).stroke(line(s, 1.5));
  g.moveTo(-8 * s, -19 * s).lineTo(-4 * s, -19 * s).moveTo(4 * s, -19 * s).lineTo(8 * s, -19 * s).stroke(line(s, 1.8));
};
export const worm = (s: number): Draw => (g) => {
  g.roundRect(-5 * s, -26 * s, 10 * s, 26 * s, 5 * s).fill(0xff9eb5).stroke(line(s, 2));
  for (let i = 1; i < 4; i++) g.moveTo(-4 * s, -i * 6 * s).lineTo(4 * s, -i * 6 * s);
  g.stroke({ width: 1.2 * s, color: 0xd6336c });
  g.circle(-2 * s, -21 * s, 1.4 * s).fill(INK);
  g.circle(2 * s, -21 * s, 1.4 * s).fill(INK);
};
/** A fly / bee / moth: drawn round its middle. */
export const bug = (s: number, kind: 'fly' | 'bee' | 'moth' | 'ladybird'): Draw => (g) => {
  if (kind === 'ladybird') {
    g.circle(8 * s, 0, 4 * s).fill(INK);
    g.ellipse(0, 0, 9 * s, 8 * s).fill(0xe5383b).stroke(line(s, 1.8));
    g.moveTo(0, -8 * s).lineTo(0, 8 * s).stroke(line(s, 1.5));
    for (const [x, y] of [[-4, -4], [-3, 3], [4, -3], [3, 4]]) g.circle(x * s, y * s, 1.7 * s).fill(INK);
    return;
  }
  const wing = kind === 'moth' ? 0xe9dcc9 : 0xeaf6ff;
  const body = kind === 'bee' ? 0xffd43b : kind === 'moth' ? 0xb59f86 : 0x495057;
  g.ellipse(-3 * s, -7 * s, 6 * s, kind === 'moth' ? 8 * s : 5 * s).fill({ color: wing, alpha: 0.9 }).stroke(line(s, 1.2));
  g.ellipse(3 * s, -7 * s, 6 * s, kind === 'moth' ? 8 * s : 5 * s).fill({ color: wing, alpha: 0.9 }).stroke(line(s, 1.2));
  g.ellipse(0, 0, 8 * s, 5 * s).fill(body).stroke(line(s, 1.5));
  if (kind === 'bee') g.moveTo(-2 * s, -5 * s).lineTo(-2 * s, 5 * s).moveTo(2 * s, -5 * s).lineTo(2 * s, 5 * s).stroke(line(s, 1.8));
  g.circle(7 * s, -1 * s, 2 * s).fill(kind === 'fly' ? 0xc92a2a : INK);
};
export const ghost = (s: number): Draw => (g) => {
  g.moveTo(-14 * s, 0).lineTo(-14 * s, -22 * s).arc(0, -22 * s, 14 * s, Math.PI, 0).lineTo(14 * s, 0)
    .lineTo(9 * s, -5 * s).lineTo(4 * s, 0).lineTo(-1 * s, -5 * s).lineTo(-6 * s, 0).lineTo(-10 * s, -5 * s).closePath().fill(0xfdfdff).stroke(line(s));
  g.ellipse(-5 * s, -24 * s, 2.5 * s, 3.5 * s).fill(INK);
  g.ellipse(5 * s, -24 * s, 2.5 * s, 3.5 * s).fill(INK);
  g.ellipse(0, -15 * s, 3 * s, 3.5 * s).fill(INK);
  g.circle(-9 * s, -18 * s, 2.5 * s).fill({ color: 0xff8fab, alpha: 0.6 });
  g.circle(9 * s, -18 * s, 2.5 * s).fill({ color: 0xff8fab, alpha: 0.6 });
};
/** A bear (or other animal) face peeking out. */
export const bearFace = (s: number, fur = 0xc68b59, muzzle = 0xf3d9b1): Draw => (g) => {
  g.circle(-13 * s, -30 * s, 7 * s).fill(fur).stroke(line(s));
  g.circle(13 * s, -30 * s, 7 * s).fill(fur).stroke(line(s));
  g.circle(0, -17 * s, 17 * s).fill(fur).stroke(line(s));
  g.ellipse(0, -11 * s, 8 * s, 6 * s).fill(muzzle).stroke(line(s, 1.5));
  g.circle(0, -13 * s, 2.6 * s).fill(INK);
  g.circle(-6 * s, -21 * s, 2.2 * s).fill(INK);
  g.circle(6 * s, -21 * s, 2.2 * s).fill(INK);
};
export const catFace = (s: number, fur = 0xf4a261): Draw => (g) => {
  g.poly([-14 * s, -18 * s, -12 * s, -36 * s, -2 * s, -27 * s]).fill(fur).stroke(line(s));
  g.poly([14 * s, -18 * s, 12 * s, -36 * s, 2 * s, -27 * s]).fill(fur).stroke(line(s));
  g.ellipse(0, -16 * s, 16 * s, 15 * s).fill(fur).stroke(line(s));
  g.ellipse(-6 * s, -19 * s, 2.4 * s, 3.4 * s).fill(INK);
  g.ellipse(6 * s, -19 * s, 2.4 * s, 3.4 * s).fill(INK);
  g.poly([-2 * s, -12 * s, 2 * s, -12 * s, 0, -9 * s]).fill(0xff8fab);
  g.moveTo(-4 * s, -11 * s).lineTo(-17 * s, -13 * s).moveTo(-4 * s, -10 * s).lineTo(-17 * s, -7 * s)
    .moveTo(4 * s, -11 * s).lineTo(17 * s, -13 * s).moveTo(4 * s, -10 * s).lineTo(17 * s, -7 * s).stroke(line(s, 1));
};
export const gnome = (s: number): Draw => (g) => {
  g.roundRect(-11 * s, -22 * s, 22 * s, 22 * s, 6 * s).fill(0x4dabf7).stroke(line(s));
  g.moveTo(-9 * s, -30 * s).quadraticCurveTo(0, -6 * s, 9 * s, -30 * s).closePath().fill(0xffffff).stroke(line(s, 2));
  g.circle(0, -32 * s, 8 * s).fill(0xffd8b5).stroke(line(s, 2));
  g.circle(-3 * s, -33 * s, 1.4 * s).fill(INK);
  g.circle(3 * s, -33 * s, 1.4 * s).fill(INK);
  g.circle(0, -30 * s, 2.4 * s).fill(0xff8fab);
  g.poly([-10 * s, -36 * s, 10 * s, -36 * s, 2 * s, -60 * s]).fill(0xe5383b).stroke(line(s));
};
export const frog = (s: number, skin = 0x69db7c, feet = 0x51cf66): Draw => (g) => {
  g.ellipse(0, -10 * s, 16 * s, 10 * s).fill(skin).stroke(line(s));
  g.circle(-7 * s, -20 * s, 6 * s).fill(skin).stroke(line(s));
  g.circle(7 * s, -20 * s, 6 * s).fill(skin).stroke(line(s));
  g.circle(-7 * s, -20 * s, 2.5 * s).fill(INK);
  g.circle(7 * s, -20 * s, 2.5 * s).fill(INK);
  g.arc(0, -11 * s, 7 * s, 0.3, Math.PI - 0.3).stroke(line(s, 1.8));
  g.ellipse(-12 * s, -1 * s, 6 * s, 3 * s).fill(feet).stroke(line(s, 1.5));
  g.ellipse(12 * s, -1 * s, 6 * s, 3 * s).fill(feet).stroke(line(s, 1.5));
};
/** A bird standing (bottom middle at 0, 0). */
export const bird = (s: number, color = 0x4ea8ff): Draw => (g) => {
  g.moveTo(-3 * s, -2 * s).lineTo(-3 * s, 2 * s).moveTo(3 * s, -2 * s).lineTo(3 * s, 2 * s).stroke({ width: 2 * s, color: 0xffa94d });
  g.ellipse(0, -10 * s, 14 * s, 10 * s).fill(color).stroke(line(s));
  g.circle(10 * s, -18 * s, 7 * s).fill(color).stroke(line(s));
  g.circle(12 * s, -19 * s, 2 * s).fill(INK);
  g.poly([16 * s, -18 * s, 23 * s, -16 * s, 16 * s, -14 * s]).fill(0xffa94d);
  g.ellipse(-4 * s, -12 * s, 7 * s, 4 * s).fill({ color: 0xffffff, alpha: 0.6 });
};
export const bat = (s: number): Draw => (g) => {
  g.moveTo(0, 0).quadraticCurveTo(-14 * s, -10 * s, -26 * s, -2 * s).lineTo(-20 * s, 2 * s).lineTo(-16 * s, -1 * s).lineTo(-12 * s, 4 * s).lineTo(-6 * s, 2 * s).closePath()
    .moveTo(0, 0).quadraticCurveTo(14 * s, -10 * s, 26 * s, -2 * s).lineTo(20 * s, 2 * s).lineTo(16 * s, -1 * s).lineTo(12 * s, 4 * s).lineTo(6 * s, 2 * s).closePath().fill(0x5f3dc4).stroke(line(s, 1.8));
  g.ellipse(0, 0, 7 * s, 9 * s).fill(0x7048e8).stroke(line(s, 1.8));
  g.poly([-5 * s, -6 * s, -4 * s, -13 * s, -1 * s, -8 * s]).fill(0x7048e8);
  g.poly([5 * s, -6 * s, 4 * s, -13 * s, 1 * s, -8 * s]).fill(0x7048e8);
  g.circle(-2.5 * s, -2 * s, 1.6 * s).fill(0xffffff);
  g.circle(2.5 * s, -2 * s, 1.6 * s).fill(0xffffff);
};
export const owl = (s: number): Draw => (g) => {
  g.ellipse(0, -16 * s, 14 * s, 16 * s).fill(0x9c6644).stroke(line(s));
  g.poly([-12 * s, -28 * s, -9 * s, -36 * s, -5 * s, -30 * s]).fill(0x9c6644).stroke(line(s, 1.5));
  g.poly([12 * s, -28 * s, 9 * s, -36 * s, 5 * s, -30 * s]).fill(0x9c6644).stroke(line(s, 1.5));
  g.ellipse(0, -11 * s, 8 * s, 9 * s).fill(0xe6ccb2);
  g.circle(-6 * s, -23 * s, 5.5 * s).fill(0xffffff).stroke(line(s, 1.5));
  g.circle(6 * s, -23 * s, 5.5 * s).fill(0xffffff).stroke(line(s, 1.5));
  g.circle(-6 * s, -23 * s, 2.5 * s).fill(INK);
  g.circle(6 * s, -23 * s, 2.5 * s).fill(INK);
  g.poly([-2 * s, -18 * s, 2 * s, -18 * s, 0, -14 * s]).fill(0xffa94d);
};
export const fish = (s: number, color = 0xff922b): Draw => (g) => {
  g.poly([-12 * s, -8 * s, -22 * s, -15 * s, -22 * s, -1 * s]).fill(color).stroke(line(s, 2));
  g.ellipse(0, -8 * s, 14 * s, 8 * s).fill(color).stroke(line(s, 2));
  g.circle(7 * s, -10 * s, 2 * s).fill(INK);
};
export const crab = (s: number): Draw => (g) => {
  for (const side of [-1, 1]) {
    g.moveTo(side * 8 * s, -4 * s).lineTo(side * 18 * s, 0).moveTo(side * 6 * s, -2 * s).lineTo(side * 14 * s, 2 * s).stroke(line(s, 2));
    g.circle(side * 18 * s, -18 * s, 5 * s).fill(0xff6b6b).stroke(line(s, 1.8));
    g.moveTo(side * 10 * s, -10 * s).lineTo(side * 16 * s, -15 * s).stroke(line(s, 2));
  }
  g.ellipse(0, -8 * s, 13 * s, 8 * s).fill(0xff6b6b).stroke(line(s));
  g.moveTo(-4 * s, -15 * s).lineTo(-4 * s, -20 * s).moveTo(4 * s, -15 * s).lineTo(4 * s, -20 * s).stroke(line(s, 1.5));
  g.circle(-4 * s, -21 * s, 2 * s).fill(INK);
  g.circle(4 * s, -21 * s, 2 * s).fill(INK);
};
/** A folded paper plane (drawn round its middle, nose to the right). */
export const paperPlane = (s: number, color = 0xffffff): Draw => (g) => {
  g.poly([22 * s, 0, -18 * s, -10 * s, -10 * s, 0, -18 * s, 8 * s]).fill(color).stroke(line(s, 2));
  g.moveTo(22 * s, 0).lineTo(-10 * s, 0).stroke(line(s, 1.5));
  g.poly([-10 * s, 0, -16 * s, 4 * s, 4 * s, 2 * s]).fill(0xdee2e6);
};
/** A little glowing fairy (round her middle). */
export const fairy = (s: number): Draw => (g) => {
  g.circle(0, 0, 14 * s).fill({ color: 0xfff3bf, alpha: 0.5 });
  g.ellipse(-7 * s, -4 * s, 7 * s, 4 * s).fill({ color: 0xd0ebff, alpha: 0.9 }).stroke(line(s, 1));
  g.ellipse(7 * s, -4 * s, 7 * s, 4 * s).fill({ color: 0xd0ebff, alpha: 0.9 }).stroke(line(s, 1));
  g.poly([-4 * s, 8 * s, 4 * s, 8 * s, 0, -2 * s]).fill(0xf783ac).stroke(line(s, 1));
  g.circle(0, -5 * s, 3.5 * s).fill(0xffd8b5).stroke(line(s, 1));
};
/** A tiny arched door at the bottom of a wall (closed). */
export const tinyDoor = (s: number, color = 0x8d5a3b): Draw => (g) => {
  g.moveTo(-12 * s, 0).lineTo(-12 * s, -20 * s).arc(0, -20 * s, 12 * s, Math.PI, 0).lineTo(12 * s, 0).closePath().fill(color).stroke(line(s));
  g.circle(6 * s, -13 * s, 1.8 * s).fill(0xffd43b);
  g.circle(0, -22 * s, 3.5 * s).fill(0xfff3bf).stroke(line(s, 1.2));
};
/** The same door, open, with warm light inside. */
export const tinyDoorOpen = (s: number, color = 0x8d5a3b): Draw => (g) => {
  g.moveTo(-12 * s, 0).lineTo(-12 * s, -20 * s).arc(0, -20 * s, 12 * s, Math.PI, 0).lineTo(12 * s, 0).closePath().fill(0xffd166).stroke(line(s));
  g.poly([-12 * s, 0, -22 * s, 4 * s, -22 * s, -26 * s, -12 * s, -20 * s]).fill(color).stroke(line(s, 2));
};
/** The dark arch of a mouse hole. */
export const archHole = (s: number, w = 16, hgt = 22): Draw => (g) => {
  g.moveTo(-w * s, 0).lineTo(-w * s, -(hgt - w) * s).arc(0, -(hgt - w) * s, w * s, Math.PI, 0).lineTo(w * s, 0).closePath().fill(0x2b2118).stroke(line(s, 2));
};

/** A mouse hole at the bottom of a wall: a mouse peeks out (sometimes a tiny dragon), and now and then runs out for a scurry. */
export function mouseHole(kit: EggKit, cleanups: Cleanups, x: number, floorY: number, s: number, fur?: number) {
  const runner = new Container();
  drawn(mouseSide(s, fur), runner);
  runner.visible = false;
  peeker(kit, cleanups, {
    x, y: floorY, rise: 34 * s, who: mouseFace(s, fur), rare: dragonFace(s),
    back: archHole(s, 17, 37), hole: archHole(s, 17, 37),
    hit: new Rectangle(-24 * s, -34 * s, 48 * s, 40 * s),
    sound: () => sfx.squeak(1.8), rareSound: () => (sfx.puff(1.6), sfx.giggle(0.8)),
    onFound: (n, rare) => {
      if (rare) burst(kit.sparkles, x, floorY - 30 * s, 8, 40);
      if (rare || n % 3 !== 0) return;
      // a quick scurry along the floor and back home
      kit.under.addChild(runner);
      runner.visible = true;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const far = rand(120, 220) * s;
      later(1900, () => {
        sfx.squeak(2.2);
        tween(1800, (k) => {
          const q = Math.sin(k * Math.PI);
          runner.position.set(x + dir * far * q, floorY + 4 * s);
          runner.scale.x = (k < 0.5 ? dir : -dir) || 1;
        }, () => (runner.visible = false));
      }, cleanups);
    },
  });
}

/** A spotty puppy sitting (side on). */
export const puppy = (s: number, coat = 0xffffff, spots = 0x212529): Draw => (g) => {
  g.moveTo(-14 * s, -10 * s).quadraticCurveTo(-24 * s, -18 * s, -20 * s, -26 * s).stroke(line(s, 3));
  g.ellipse(-4 * s, -12 * s, 15 * s, 12 * s).fill(coat).stroke(line(s));
  g.roundRect(-10 * s, -6 * s, 7 * s, 6 * s, 3 * s).fill(coat).stroke(line(s, 2));
  g.roundRect(4 * s, -6 * s, 7 * s, 6 * s, 3 * s).fill(coat).stroke(line(s, 2));
  g.circle(10 * s, -26 * s, 11 * s).fill(coat).stroke(line(s));
  g.ellipse(4 * s, -24 * s, 4 * s, 9 * s).fill(spots).stroke(line(s, 1.5));
  g.circle(14 * s, -28 * s, 2 * s).fill(INK);
  g.circle(21 * s, -23 * s, 2.6 * s).fill(INK);
  for (const [x, y] of [[-10, -16], [0, -8], [-2, -18], [16, -32]]) g.circle(x * s, y * s, 2.6 * s).fill(spots);
};
/** A raccoon face (front on), with its bandit mask. */
export const raccoonFace = (s: number): Draw => (g) => {
  catFace(s, 0x9ca3a8)(g);
  g.roundRect(-14 * s, -24 * s, 28 * s, 9 * s, 4 * s).fill(0x343a40);
  g.circle(-6 * s, -20 * s, 2.2 * s).fill(0xffffff);
  g.circle(6 * s, -20 * s, 2.2 * s).fill(0xffffff);
  g.ellipse(0, -8 * s, 7 * s, 5 * s).fill(0xf1f3f5);
  g.circle(0, -10 * s, 2.2 * s).fill(INK);
};
/** A bunny sitting (side on). */
export const bunny = (s: number, fur = 0xf8f9fa): Draw => (g) => {
  g.circle(-14 * s, -10 * s, 6 * s).fill(0xffffff).stroke(line(s, 2));
  g.ellipse(-2 * s, -12 * s, 14 * s, 12 * s).fill(fur).stroke(line(s));
  g.ellipse(6 * s, -44 * s, 4 * s, 13 * s).fill(fur).stroke(line(s, 2));
  g.ellipse(12 * s, -42 * s, 4 * s, 13 * s).fill(fur).stroke(line(s, 2));
  g.ellipse(12 * s, -42 * s, 1.8 * s, 9 * s).fill(0xffc9de);
  g.circle(10 * s, -26 * s, 10 * s).fill(fur).stroke(line(s));
  g.circle(13 * s, -28 * s, 2 * s).fill(INK);
  g.circle(19 * s, -24 * s, 2 * s).fill(0xff8fab);
};
/** A toy rocket pointing up (round its middle). */
export const rocket = (s: number): Draw => (g) => {
  g.poly([-10 * s, 10 * s, -18 * s, 22 * s, -8 * s, 20 * s]).fill(0xe5383b).stroke(line(s, 2));
  g.poly([10 * s, 10 * s, 18 * s, 22 * s, 8 * s, 20 * s]).fill(0xe5383b).stroke(line(s, 2));
  g.moveTo(-10 * s, 20 * s).lineTo(-10 * s, -6 * s).quadraticCurveTo(0, -34 * s, 10 * s, -6 * s).lineTo(10 * s, 20 * s).closePath().fill(0xf8f9fa).stroke(line(s));
  g.circle(0, -2 * s, 5 * s).fill(0x74c0fc).stroke(line(s, 2));
  g.poly([-6 * s, 20 * s, 6 * s, 20 * s, 0, 30 * s]).fill(0xffa94d).stroke(line(s, 1.5));
};
