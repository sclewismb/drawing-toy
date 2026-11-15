import { Container, Graphics } from 'pixi.js';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { INK, later, rand, type Cleanups, type EggKit, type Puppet, type Spot } from './common';

/**
 * Having a go on the ninja gym's equipment: drop someone (a person, an
 * animal, a drawing, a teddy...) onto any of it and they use it themselves.
 * People walking about the gym have a go by themselves now and then too.
 *
 *   monkey bars:    hand over hand to the far end, then drop onto the mats
 *   warped wall:    a run-up, scramble on top, ring the bell; slide back down or flip off the back
 *   rope swings:    higher and higher, then let go... into the foam pit!
 *   foam pit:       jump in, sink in the foam, wriggle, climb out
 *   trampolines:    higher and higher, a somersault on the last one
 *   climbing wall:  hold by hold to the top, then the rope lets them down
 *   salmon ladder:  hang on the bar and it jumps up rung by rung
 *
 * The equipment itself (and what happens when it's tapped) is in
 * destinations.ts (the picture) and eggs/destinations.ts (ninjaGym).
 */
export interface GymGear {
  /** The back of the floor. */
  fy: number;
  /** Where hands go on the monkey bars: each rung's x, and the height. */
  bars: { rungs: number[]; y: number };
  /** The warped wall: the ramp starts at x0 and goes up to the platform (x1..x2) at `top`. */
  wall: { x0: number; x1: number; x2: number; top: number; ring: () => void };
  ropes: GymRope[];
  /** The foam pit (its cubes fly up when someone jumps in). */
  pit: { x0: number; x1: number; splash: () => void };
  /** Trampolines in the floor: x0..x1, and where feet bounce. */
  tramps: { x0: number; x1: number; y: number }[];
  /** The climbing wall: a hold lights up where hands touch it. */
  climb: { x0: number; x1: number; top: number; touch: (x: number, y: number) => void; untouch: () => void };
  /** The salmon ladder's bar, and the rungs it jumps up (top first). */
  ladder: { x: number; x0: number; x1: number; rungs: number[]; bar: Graphics; busy: boolean };
}

export interface GymRope {
  rope: Container;
  x: number;
  y: number;
  len: number;
  busy: boolean;
}

/** A piece of equipment someone can have a go on. */
interface Gear {
  busy: boolean;
  /** Dropped here? (where their feet are) */
  catches: (at: Spot) => boolean;
  /** Where the drop is checked (room coordinates): wide, the feet decide. */
  x0: number;
  x1: number;
  /** Where to walk up to it, from `at`. */
  entry: (at: Spot) => { x: number; y: number };
  use: (p: Puppet) => Promise<unknown>;
  /** Busy being tapped just now (the rope swinging, the ladder's bar going up). */
  blocked?: () => boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Slow to start, then faster and faster (a run-up). */
const speedUp = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
const COLOURS = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];

/** One part of a go: `fn(t)` for t = 0..1 over `ms`. False if they were taken off part way. */
function step(p: Puppet, ms: number, fn: (t: number) => void) {
  return new Promise<boolean>((resolve) => {
    let off = false;
    tween(ms, (t) => {
      if (off) return;
      if (!p.ok) return void (off = true);
      fn(t);
    }, () => resolve(!off && p.ok));
  });
}
const pause = (p: Puppet, ms: number) => step(p, ms, () => {});

/** Jump from where their feet are to (x, y), `high` up on the way, turning `turns` somersaults (round their middle). */
function jump(p: Puppet, x: number, y: number, ms: number, high: number, turns = 0) {
  const f = p.feet;
  const dir = x < f.x ? -1 : 1;
  if (Math.abs(x - f.x) > 8) p.face(dir);
  return step(p, ms, (t) => {
    const fx = lerp(f.x, x, t), fy = lerp(f.y, y, t) - Math.sin(t * Math.PI) * high;
    if (turns) p.pin(fx, fy - p.h / 2, 0.5, turns * Math.PI * 2 * ease.inOutSine(t) * dir);
    else p.pin(fx, fy);
  });
}

/** Let go and drop down to (x, y), landing with a squish. */
async function fall(p: Puppet, x: number, y: number, ms: number) {
  const f = p.feet;
  const ok = await step(p, ms, (t) => p.pin(lerp(f.x, x, t), lerp(f.y, y, t * t)));
  if (ok) {
    sfx.boing(p.voice);
    p.react('squish');
  }
  return ok;
}

/** Walk over to (x, y) on the floor, with a little bob in their step. */
function walkTo(p: Puppet, x: number, y: number) {
  const f = p.feet;
  const ms = Math.max(250, Math.hypot(x - f.x, y - f.y) / 0.22);
  p.face(x - f.x);
  return step(p, ms, (t) => p.pin(lerp(f.x, x, t), lerp(f.y, y, t) - Math.abs(Math.sin((t * ms) / 140)) * 7));
}

export function gymGoes(kit: EggKit, cleanups: Cleanups, gear: GymGear) {
  const actors = kit.actors;
  if (!actors) return;
  const { w, h } = kit;
  const fy = gear.fy;
  /** Where feet go back down on the floor. */
  const floorY = fy + (h - fy) * 0.3;
  const below = (s: Spot) => s.y < fy - 10; // up in the air, not standing on the floor

  // --- monkey bars: hand over hand to the far end ---
  const xs = gear.bars.rungs;
  const nearestRung = (x: number) => xs.reduce((best, r, i) => (Math.abs(r - x) < Math.abs(xs[best] - x) ? i : best), 0);
  async function monkeyBars(p: Puppet) {
    const hy = gear.bars.y;
    let i = nearestRung(p.feet.x);
    const dir = i < (xs.length - 1) / 2 ? 1 : -1; // off to the far end
    sfx.whoosh();
    if (!(await jump(p, xs[i], hy + p.h, 380, 30))) return;
    p.face(dir);
    sfx.click();
    while (i + dir >= 0 && i + dir < xs.length) {
      const a = xs[i], b = xs[i + dir];
      i += dir;
      // swing to the next rung, the body trailing behind
      if (!(await step(p, 300, (t) => p.pin(lerp(a, b, ease.inOutSine(t)), hy, 1, dir * 0.28 * Math.sin(t * Math.PI))))) return;
      sfx.click();
    }
    sfx.yippee(p.voice);
    if (!(await step(p, 600, (t) => p.pin(xs[i], hy, 1, Math.sin(t * Math.PI * 2) * 0.12)))) return;
    await fall(p, xs[i] + dir * 0.035 * w, floorY, 420);
  }

  // --- the warped wall: run up, ring the bell, then down again ---
  const W = gear.wall;
  let slideNext = Math.random() < 0.5;
  async function warpedWall(p: Puppet) {
    const standX = W.x1 + 0.045 * w, standY = W.top - 10;
    const f = p.feet;
    if (f.y > (W.top + fy) / 2 || f.x < W.x1 - 0.03 * w) {
      // a run-up from the floor in front of it...
      const sx = W.x0 - 0.06 * w;
      if (!(await jump(p, sx, fy + 4, 380, 30))) return;
      p.face(1);
      sfx.slideWhistle(Math.min(1.5, p.voice * 1.2));
      const ok = await step(p, 1000, (t) => {
        const e = speedUp(t);
        const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * W.x1 + e * e * W.x1;
        const y = (1 - e) * (1 - e) * (fy + 4) + 2 * (1 - e) * e * (fy + 4) + e * e * W.top;
        p.pin(x, y - Math.abs(Math.sin(t * 22)) * 5, 0, -0.6 * e);
      });
      if (!ok) return;
      // ...and scramble up on top
      const lip = p.feet;
      if (!(await step(p, 380, (t) => p.pin(lerp(lip.x, standX, t), lerp(lip.y, standY, t) - Math.sin(t * Math.PI) * 30, 0, -0.6 * (1 - t))))) return;
    } else if (!(await jump(p, standX, standY, 300, 20))) return;
    // reach up and ring the bell
    p.face(1);
    if (!(await step(p, 220, (t) => p.pin(standX, standY - Math.sin((t * Math.PI) / 2) * h * 0.07)))) return;
    W.ring();
    if (!(await step(p, 260, (t) => p.pin(standX, standY - Math.cos((t * Math.PI) / 2) * h * 0.07)))) return;
    sfx.yippee(p.voice);
    p.react('bounce');
    if (!(await pause(p, 800))) return;
    slideNext = !slideNext;
    if (slideNext) {
      // whee! back down the ramp
      p.face(-1);
      if (!(await step(p, 250, (t) => p.pin(lerp(standX, W.x1, t), standY + 10 * t, 0, -0.5 * t)))) return;
      sfx.slideWhistle(Math.min(1.3, p.voice));
      const ok = await step(p, 900, (t) => {
        const e = 1 - speedUp(t);
        const x = (1 - e) * (1 - e) * (W.x0 - 0.02 * w) + 2 * (1 - e) * e * W.x1 + e * e * W.x1;
        const y = (1 - e) * (1 - e) * (fy + 4) + 2 * (1 - e) * e * (fy + 4) + e * e * W.top;
        p.pin(x, y, 0, -0.5 * e);
      });
      if (!ok) return;
      await jump(p, W.x0 - 0.06 * w, floorY, 350, 10);
      sfx.drop(p.voice);
    } else {
      // a somersault off the back
      sfx.whoosh();
      await jump(p, W.x2 + 0.05 * w, floorY, 800, h * 0.1, 1);
      sfx.boing(p.voice);
      p.react('squish');
    }
  }

  // --- rope swings: higher and higher, then let go into the foam pit ---
  const pitTop = fy + 14; // the top of the foam
  async function ropeSwing(p: Puppet, r: GymRope) {
    const knot = (rot: number) => ({ x: r.x - Math.sin(rot) * r.len, y: r.y + Math.cos(rot) * r.len - 10 });
    const k0 = knot(r.rope.rotation);
    if (!(await jump(p, k0.x, k0.y, 380, 30))) return;
    p.face(1);
    let side = 0;
    const swung = await step(p, 3400, (t) => {
      const a = 0.12 + 0.45 * t;
      const phase = t * Math.PI * 4.5;
      const rot = -a * Math.sin(phase);
      r.rope.rotation = rot;
      const k = knot(rot);
      p.pin(k.x, k.y, 0, rot);
      const s = Math.sign(Math.cos(phase));
      if (s !== side) {
        side = s;
        sfx.whoosh();
      }
    });
    // the rope swings back to rest by itself
    const rot0 = r.rope.rotation;
    tween(1800, (t) => !r.rope.destroyed && (r.rope.rotation = rot0 * (1 - t) * Math.cos(t * Math.PI * 3)));
    if (!swung) return;
    // let go at the top of the swing: a somersault into the foam pit!
    sfx.yippee(p.voice);
    const from = knot(rot0);
    const m0 = { x: from.x + Math.sin(rot0) * p.h * 0.5, y: from.y - Math.cos(rot0) * p.h * 0.5 };
    const tx = lerp(gear.pit.x0, gear.pit.x1, rand(0.3, 0.7));
    const flew = await step(p, 850, (t) => {
      p.pin(lerp(m0.x, tx, t), lerp(m0.y, pitTop - p.h / 2, t) - Math.sin(t * Math.PI) * h * 0.16, 0.5, lerp(rot0, Math.PI * 2, t));
    });
    if (flew) await intoPit(p, false);
  }

  // --- the foam pit: in they go ---
  async function intoPit(p: Puppet, jumpIn = true) {
    const { x0, x1 } = gear.pit;
    const tx = clamp(p.feet.x, x0 + p.w * 0.3 + 10, x1 - p.w * 0.3 - 10);
    if (jumpIn && !(await jump(p, tx, pitTop, 520, h * 0.12))) return;
    p.pin(tx, pitTop);
    p.clipBelow(pitTop);
    gear.pit.splash();
    sfx.poof();
    const deep = Math.min(p.h * 0.62, h * 0.16);
    if (!(await step(p, 450, (t) => p.pin(tx, pitTop + deep * ease.outCubic(t), 0, Math.sin(t * Math.PI * 2) * 0.08)))) return;
    // a few cubes in front of them, all round where they sank in
    const front = new Container();
    front.eventMode = 'none';
    for (let i = 0; i < 5; i++) {
      const c = new Graphics().rect(-11, -11, 22, 22).fill(COLOURS[(i * 2 + 1) % COLOURS.length]).stroke({ width: 2, color: INK });
      c.position.set(tx + (i - 2) * Math.max(16, p.w * 0.16) + rand(-4, 4), pitTop + rand(2, 10));
      c.rotation = rand(-0.4, 0.4);
      front.addChild(c);
    }
    kit.over.addChild(front);
    try {
      sfx.giggle(p.voice);
      p.react('giggle');
      const wriggled = await step(p, 1300, (t) => p.pin(tx + Math.sin(t * Math.PI * 3) * 6, pitTop + deep - Math.abs(Math.sin(t * Math.PI * 2)) * 10, 0, Math.sin(t * Math.PI * 3) * 0.06));
      if (!wriggled) return;
      // ...and out they climb
      if (!(await step(p, 350, (t) => p.pin(tx, pitTop + deep * (1 - ease.outCubic(t)) - 4 * t)))) return;
    } finally {
      tween(300, (t) => !front.destroyed && (front.alpha = 1 - t), () => front.destroy({ children: true }));
    }
    p.clipBelow();
    const out = tx < (x0 + x1) / 2 ? x0 - 0.04 * w : x1 + 0.05 * w;
    if (await jump(p, out, floorY, 480, h * 0.1)) sfx.drop(p.voice);
  }

  // --- trampolines: higher and higher, and a somersault ---
  async function trampoline(p: Puppet, tr: { x0: number; x1: number; y: number }) {
    const cx = (tr.x0 + tr.x1) / 2;
    const came = p.feet.x < cx ? 1 : -1;
    if (!(await jump(p, cx, tr.y, 420, h * 0.08))) return;
    const most = Math.min(h * 0.34, Math.max(h * 0.1, tr.y - p.h - h * 0.04)); // (heads stay on the screen)
    const heights = [0.35, 0.6, 0.85, 1].map((k) => most * k);
    for (let k = 0; k < heights.length; k++) {
      const H = heights[k], last = k === heights.length - 1;
      sfx.spring(p.voice * (0.9 + k * 0.1));
      if (last) later(200, () => sfx.yippee(p.voice), cleanups);
      const ok = await step(p, 520 + k * 90, (t) => {
        const y = tr.y - H * 4 * t * (1 - t);
        if (last) p.pin(cx, y - p.h / 2, 0.5, came * Math.PI * 2 * ease.inOutSine(t));
        else p.pin(cx, y);
      });
      if (!ok) return;
    }
    p.react('squish');
    if (!(await pause(p, 350))) return;
    // off the front, onto the mats (not onto the next trampoline)
    if (await jump(p, cx + came * (tr.x1 - tr.x0) * 0.35, Math.min(h - 12, tr.y + h * 0.12), 450, h * 0.08)) sfx.drop(p.voice);
  }

  // --- the climbing wall: hold by hold to the top, then the rope lets them down ---
  async function climbWall(p: Puppet) {
    const C = gear.climb;
    const mid = (C.x0 + C.x1) / 2, half = (C.x1 - C.x0) / 2 - p.w * 0.35 - 10;
    const bx = clamp(p.feet.x, mid - half, mid + half);
    if (!(await jump(p, bx, fy, 380, 30))) return;
    const topFeet = Math.min(fy - 40, C.top + p.h + 8);
    const n = 6;
    let x = bx;
    for (let k = 1; k <= n; k++) {
      const from = p.feet;
      x = clamp(bx + (k % 2 ? 1 : -1) * 0.02 * w, mid - half, mid + half);
      const y = lerp(fy, topFeet, k / n), lean = (k % 2 ? 1 : -1) * 0.07;
      if (!(await step(p, 420, (t) => p.pin(lerp(from.x, x, ease.inOutSine(t)), lerp(from.y, y, ease.inOutSine(t)), 0, lean * Math.sin(t * Math.PI))))) return C.untouch();
      C.touch(x + rand(-20, 20), y - p.h * 0.85);
      sfx.click();
    }
    C.untouch();
    sfx.yippee(p.voice);
    sfx.twinkle();
    burst(kit.sparkles, x, C.top + 20, 12, 70);
    p.react('giggle');
    if (!(await pause(p, 700))) return;
    // the rope from the top lets them down gently, bump bump bump
    const line = new Graphics();
    line.eventMode = 'none';
    kit.under.addChild(line);
    const from = p.feet;
    sfx.whirr();
    try {
      const ok = await step(p, 1500, (t) => {
        const y = lerp(from.y, fy + 4, t) - Math.abs(Math.sin(t * Math.PI * 3)) * 14;
        p.pin(x, y, 0, Math.sin(t * Math.PI * 3) * 0.05);
        line.clear().circle(x, C.top + 6, 7).fill(0x6c757d).moveTo(x, C.top + 6).lineTo(x, y - p.h * 0.6).stroke({ width: 4, color: 0x2b2d42 });
      });
      if (!ok) return;
    } finally {
      line.destroy();
    }
    if (await jump(p, x, floorY, 320, 15)) sfx.drop(p.voice);
  }

  // --- the salmon ladder: hang on and the bar jumps up rung by rung ---
  const L = gear.ladder;
  const restBar = () => {
    const from = L.bar.y, to = L.rungs[L.rungs.length - 1] - 8;
    if (Math.abs(from - to) < 1) return;
    later(300, () => tween(600, (t) => !L.bar.destroyed && (L.bar.y = lerp(from, to, t))), cleanups);
  };
  async function salmonLadder(p: Puppet) {
    const hang = () => L.bar.y + 4;
    if (!(await jump(p, L.x, hang() + p.h, 400, 30))) return;
    sfx.clank();
    let i = L.rungs.reduce((best, r, k) => (Math.abs(r - 8 - L.bar.y) < Math.abs(L.rungs[best] - 8 - L.bar.y) ? k : best), 0);
    while (i > 0) {
      const a = L.rungs[i] - 8, b = L.rungs[i - 1] - 8;
      i--;
      const ok = await step(p, 200, (t) => {
        L.bar.y = lerp(a, b, t) - Math.sin(t * Math.PI) * 16;
        p.pin(L.x, hang(), 1, Math.sin(t * Math.PI) * 0.12);
      });
      if (!ok) return;
      sfx.clank();
      if (!(await pause(p, 90))) return;
    }
    sfx.yippee(p.voice);
    burst(kit.sparkles, L.x, L.bar.y, 10, 60);
    if (!(await step(p, 600, (t) => p.pin(L.x, hang(), 1, Math.sin(t * Math.PI * 2) * 0.1)))) return;
    await fall(p, L.x + 0.03 * w, floorY, 480);
  }

  // --- what's where: drop someone on it, or walk up and have a go ---
  const near = (at: Spot, a: number, b: number) => (Math.abs(at.x - a) < Math.abs(at.x - b) ? a : b);
  const gears: Gear[] = [
    {
      busy: false, x0: xs[0], x1: xs[xs.length - 1],
      catches: (at) => below(at) && at.x > xs[0] - 20 && at.x < xs[xs.length - 1] + 20,
      entry: (at) => ({ x: near(at, xs[0], xs[xs.length - 1]), y: fy + h * 0.05 }),
      use: monkeyBars,
    },
    {
      busy: false, x0: W.x0 + 0.05 * w, x1: W.x2,
      catches: (at) => below(at) && at.x > W.x0 + 0.05 * w && at.x < W.x2,
      entry: () => ({ x: W.x0 - 0.06 * w, y: fy + h * 0.04 }),
      use: warpedWall,
    },
    ...gear.ropes.map((r): Gear => ({
      busy: false, x0: r.x - 0.045 * w, x1: r.x + 0.045 * w,
      catches: (at) => below(at) && Math.abs(at.x - r.x) < 0.045 * w,
      entry: () => ({ x: r.x, y: fy + h * 0.05 }),
      blocked: () => r.busy,
      use: (p) => {
        r.busy = true;
        return ropeSwing(p, r).finally(() => (r.busy = false));
      },
    })),
    {
      busy: false, x0: gear.pit.x0, x1: gear.pit.x1,
      catches: (at) => at.x > gear.pit.x0 && at.x < gear.pit.x1 && at.y < fy + h * 0.17,
      entry: (at) => ({ x: near(at, gear.pit.x0 - 0.03 * w, gear.pit.x1 + 0.03 * w), y: fy + h * 0.06 }),
      use: (p) => intoPit(p),
    },
    ...gear.tramps.map((tr): Gear => ({
      busy: false, x0: tr.x0, x1: tr.x1,
      catches: (at) => at.x > tr.x0 && at.x < tr.x1 && at.y < tr.y + h * 0.06,
      entry: (at) => ({ x: near(at, tr.x0 - 0.03 * w, tr.x1 + 0.03 * w), y: tr.y + h * 0.04 }),
      use: (p) => trampoline(p, tr),
    })),
    {
      busy: false, x0: gear.climb.x0, x1: gear.climb.x1,
      catches: (at) => below(at) && at.x > gear.climb.x0 && at.x < gear.climb.x1,
      entry: (at) => ({ x: clamp(at.x, gear.climb.x0 + 0.05 * w, gear.climb.x1 - 0.05 * w), y: fy + h * 0.04 }),
      use: climbWall,
    },
    {
      busy: false, x0: L.x0, x1: L.x1,
      catches: (at) => below(at) && at.x > L.x0 && at.x < L.x1,
      entry: () => ({ x: L.x - 0.03 * w, y: fy + h * 0.05 }),
      blocked: () => L.busy,
      use: (p) => {
        L.busy = true;
        return salmonLadder(p).finally(() => {
          L.busy = false;
          restBar();
        });
      },
    },
  ];
  const free = (g: Gear) => !g.busy && !g.blocked?.();
  const go = async (g: Gear, p: Puppet, walk: boolean) => {
    g.busy = true;
    try {
      if (walk) {
        const e = g.entry({ ...p.feet, w: p.w, h: p.h });
        if (!(await walkTo(p, e.x, e.y))) return;
      }
      await g.use(p);
    } catch (err) {
      console.warn('Gym go failed', err);
    } finally {
      g.busy = false;
      p.done();
    }
  };
  for (const g of gears) {
    kit.secrets?.lock({
      accepts: ['*'],
      wants: (ch) => {
        if (!free(g) || !actors.canUse(ch)) return false;
        const at = actors.where(ch);
        return !!at && g.catches(at);
      },
      area: () => ({ x: g.x0 - 0.2 * w, y: -h, w: g.x1 - g.x0 + 0.4 * w, h: h * 3 }),
      open: (_name, ch) => {
        const p = actors.borrow(ch);
        if (p) void go(g, p, false);
        return true;
      },
    });
  }
  // Now and then, someone walking about has a go by themselves.
  const haveAGo = () => {
    const who = actors.idle().map((ch) => ({ ch, at: actors.where(ch)! })).filter(({ at }) => at && actors.seen(at.x));
    if (!who.length) return;
    const { ch, at } = who[Math.floor(Math.random() * who.length)];
    const options = gears.filter((g) => {
      if (!free(g)) return false;
      const e = g.entry(at);
      return Math.abs(e.x - at.x) < 0.45 * w && actors.seen(e.x);
    });
    if (!options.length) return;
    const p = actors.borrow(ch);
    if (p) void go(options[Math.floor(Math.random() * options.length)], p, true);
  };
  const again = () => later(rand(6000, 11000), () => (haveAGo(), again()), cleanups);
  again();
}
