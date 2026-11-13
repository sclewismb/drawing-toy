import { Container, Graphics, Rectangle } from 'pixi.js';
import { frontLeaves, haze } from '../depth';
import { hearts } from '../fx';
import { PALETTE } from '../seasons';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { drawZooFences, face, tunnelHill, ZOO, zooLayout, type Face } from '../zoo';
import { cloudRain, everyFrame, INK, later, oneAtATime, rand, spray, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * The zoo's animals: they move about a little, and do something when tapped
 * (a different thing each time). Also the little train far away, the snack
 * kiosk, the picture signposts and the leafy plants at the front.
 * Layout: zooLayout() in zoo.ts. Feeding them: eggs/secrets.ts.
 */
export function zoo(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = zooLayout(w, h);
  const S = h / 768; // the new animals are drawn for a 768-tall screen
  const clock = { t: 0 };
  everyFrame((dt) => (clock.t += dt), cleanups);
  const ctx: Ctx = { kit, cleanups, w, h, S, L, clock };

  train(ctx);
  zebras(ctx);
  meerkats(ctx);
  classics(ctx); // the giraffe, monkey, elephant, penguins and lion
  flamingos(ctx);
  hippo(ctx);
  crocodile(ctx);
  parrots(ctx);
  tortoise(ctx);
  // the fences, in front of the animals (they're inside)
  const fences = new Graphics();
  drawZooFences(fences, w, h);
  kit.under.addChild(fences);
  kiosk(ctx);
  signposts(ctx);
  frontPlants(ctx);

  // the drifting clouds rain (or snow) when tapped
  cloudRain(kit, cleanups, () => h * 0.8);
}

interface Ctx {
  kit: EggKit;
  cleanups: Cleanups;
  w: number;
  h: number;
  S: number;
  L: ReturnType<typeof zooLayout>;
  clock: { t: number };
}

/** Pick one of n reactions at random, never the same one twice in a row. */
function variety(n: number) {
  let last = -1;
  return () => {
    let i = Math.floor(Math.random() * n);
    if (i === last) i = (i + 1) % n;
    last = i;
    return i;
  };
}

/** An oval turned by angle a (radians). */
function oval(g: Graphics, cx: number, cy: number, rx: number, ry: number, a: number) {
  const pts: number[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    pts.push(cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a));
  }
  return g.poly(pts);
}

/** A soft shadow that goes with an animal (inside its container). */
function shadowOf(rx: number, ry: number) {
  const g = new Graphics();
  for (let i = 4; i >= 1; i--) g.ellipse(0, 0, (rx * (3 + i)) / 7, (ry * (3 + i)) / 7).fill({ color: 0x000000, alpha: 0.045 });
  return g;
}

/** Bubbles rising from a point in the water and popping. */
function bubbles(layer: Container, x: number, y: number, n: number, spread = 20) {
  for (let i = 0; i < n; i++) {
    const b = new Graphics().circle(0, 0, rand(3, 7)).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 1.5, color: 0xffffff });
    b.position.set(x + rand(-spread, spread), y);
    b.alpha = 0;
    layer.addChild(b);
    const delay = i * 90, rise = rand(30, 70);
    tween(900 + delay, (t) => {
      const k = Math.max(0, (t * (900 + delay) - delay) / 900);
      b.alpha = k > 0 ? (k > 0.85 ? (1 - k) / 0.15 : 1) : 0;
      b.y = y - rise * k;
      b.x += Math.sin(k * 12 + i) * 0.4;
    }, () => b.destroy());
  }
}

/** A splash ring spreading on the water. */
function ripple(layer: Container, x: number, y: number, size = 50) {
  const ring = new Graphics();
  layer.addChild(ring);
  tween(700, (t) => ring.clear().ellipse(x, y, 10 + t * size, 4 + t * size * 0.28).stroke({ width: 3, color: 0xffffff, alpha: 1 - t }), () => ring.destroy());
}

/** Hide everything below the waterline (y, in room coordinates) between x0 and x1. */
function waterline(kit: EggKit, c: Container, x0: number, x1: number, y: number) {
  const m = new Graphics().rect(x0, -kit.h, x1 - x0, kit.h + y).fill(0xffffff);
  kit.under.addChild(m);
  c.mask = m;
}

// ---------------------------------------------------------------------------
// The little train, far away: it chuffs along the hills and loops round
// through the tunnels. Tap it: toot toot!
// ---------------------------------------------------------------------------
function train({ kit, cleanups, w, h, S, L }: Ctx) {
  const far = kit.far;
  if (!far) return;
  const T = L.train;
  const pal = PALETTE[kit.season];
  const sky = pal.sky;
  const s = S * 0.8;
  const tr = new Container();
  tr.scale.set(s);
  far.addChild(tr);
  const wheels: Graphics[] = [];
  const wheel = (x: number, r: number) => {
    const g = new Graphics().circle(0, 0, r).fill(0x2b2d42).stroke({ width: 2, color: INK });
    g.moveTo(-r + 2, 0).lineTo(r - 2, 0).moveTo(0, -r + 2).lineTo(0, r - 2).stroke({ width: 2, color: 0xffd166 });
    g.circle(0, 0, 3).fill(0xffd166);
    g.position.set(x, -r);
    wheels.push(g);
    return g;
  };
  // the engine (at the front, facing right), and three carriages behind it
  const eng = new Graphics();
  eng.rect(-112, -26, 92, 10).fill(0x2b2d42);
  eng.roundRect(-92, -54, 64, 30, 12).fill(0xe63946).stroke({ width: 3, color: INK });
  eng.rect(-80, -54, 6, 30).rect(-56, -54, 6, 30).fill(0xffd166);
  eng.rect(-114, -76, 36, 52).fill(0xe63946).stroke({ width: 3, color: INK });
  eng.rect(-108, -70, 24, 18).fill(0xbfe8ff).stroke({ width: 2, color: INK });
  eng.rect(-120, -82, 48, 8).fill(0x2b2d42).stroke({ width: 2, color: INK });
  eng.rect(-50, -74, 14, 22).fill(0x2b2d42).stroke({ width: 2, color: INK });
  eng.rect(-54, -80, 22, 7).fill(0x2b2d42).stroke({ width: 2, color: INK });
  eng.poly([-28, -26, -14, -10, -28, -10]).fill(0xffd166).stroke({ width: 2, color: INK });
  eng.circle(-26, -44, 6).fill(0xfff3c4).stroke({ width: 2, color: INK }); // the lamp
  tr.addChild(eng, wheel(-98, 12), wheel(-70, 12), wheel(-42, 10));
  const waving: Graphics[] = [];
  const COLS = [0x4ea8ff, 0x7bd36b, 0xffd166];
  const HEADS = [0xffd6a5, 0xc68b59, 0xf1c27d, 0x8d5524, 0xffe0bd, 0xe0ac69];
  for (let i = 0; i < 3; i++) {
    const cx = -120 - i * 82;
    const car = new Graphics();
    car.rect(cx - 74, -26, 70, 10).fill(0x2b2d42);
    car.moveTo(cx - 2, -22).lineTo(cx + 6, -22).stroke({ width: 4, color: INK });
    for (const px of [-70, -8]) car.rect(cx + px - 2, -70, 4, 30).fill(0xadb5bd);
    for (let k = 0; k < 2; k++) {
      const hx = cx - 54 + k * 30;
      car.circle(hx, -48, 9).fill(HEADS[(i * 2 + k) % HEADS.length]).stroke({ width: 2, color: INK });
      car.circle(hx - 3, -49, 1.5).circle(hx + 3, -49, 1.5).fill(INK);
      const arm = new Graphics().moveTo(0, 0).lineTo(8, -14).stroke({ width: 4, color: HEADS[(i * 2 + k) % HEADS.length], cap: 'round' });
      arm.position.set(hx + 8, -40);
      arm.visible = false;
      waving.push(arm);
    }
    car.roundRect(cx - 74, -44, 70, 22, 6).fill(COLS[i]).stroke({ width: 3, color: INK });
    for (let k = 0; k < 6; k++) car.rect(cx - 78 + k * 13, -76, 13, 8).fill(k % 2 ? 0xffffff : 0xe63946);
    car.rect(cx - 78, -76, 78, 8).stroke({ width: 2, color: INK });
    tr.addChild(car, ...waving.slice(-2), wheel(cx - 60, 9), wheel(cx - 18, 9));
  }
  const length = (120 + 3 * 82) * s;
  // the hills the tunnels go into (in front of the train)
  const r = h * 0.075;
  const hills = new Graphics();
  tunnelHill(hills, T.x0 - r * 1.75, T.y, h, pal.hillBack, sky, 1);
  tunnelHill(hills, T.x1 + r * 1.75, T.y, h, pal.hillBack, sky, -1);
  far.addChild(hills);

  let x = T.x0 + r * 0.3; // the front of the engine
  let speed = (0.1 * w) / 1000; // pixels per ms
  let boost = 1;
  let waiting = 0;
  let puffDue = 0;
  const puff = (big = false) => {
    const p = tr.toGlobal({ x: -43, y: -84 });
    const at = far.toLocal(p);
    const g = new Graphics().circle(0, 0, (big ? 16 : 9) * s).fill({ color: haze(0xffffff, sky, 0.1), alpha: 0.9 });
    g.position.set(at.x, at.y);
    far.addChildAt(g, far.getChildIndex(hills));
    const drift = rand(-10, 10);
    tween(big ? 1600 : 1100, (t) => {
      g.y = at.y - t * (big ? 90 : 50) * s;
      g.x = at.x - t * 30 * s + drift * t;
      g.scale.set(1 + t * (big ? 2.2 : 1.5));
      g.alpha = 0.9 * (1 - t);
    }, () => g.destroy());
  };
  everyFrame((dt) => {
    if (waiting > 0) {
      waiting -= dt;
      if (waiting <= 0) {
        x = T.x0 + r * 0.3;
        tr.visible = true;
      }
      return;
    }
    const dx = speed * boost * dt;
    x += dx;
    tr.position.set(x, T.y + Math.sin(x * 0.05) * 0.6);
    for (const wh of wheels) wh.rotation += dx / (11 * s);
    puffDue -= dt * boost;
    if (puffDue <= 0) {
      puffDue = 520;
      puff();
    }
    if (x - length > T.x1 - r * 0.6) {
      tr.visible = false; // in the tunnel: round it goes, and out the other side
      waiting = 2500;
    }
  }, cleanups);
  tr.position.set(x, T.y);
  const pick = variety(3);
  tappable(tr, oneAtATime((done) => {
    const wave = (ms: number) => {
      waving.forEach((a) => (a.visible = true));
      everyFrameFor(ms, (t) => waving.forEach((a, i) => (a.rotation = Math.sin(t * 0.02 + i) * 0.5)), () => waving.forEach((a) => (a.visible = false)));
    };
    const k = pick();
    if (k === 0) {
      // toot toot, a big puff of steam, and everybody waves
      sfx.toot(2);
      puff(true);
      later(300, () => puff(true), cleanups);
      wave(1600);
      later(1600, done, cleanups);
    } else if (k === 1) {
      // full steam ahead for a bit
      sfx.toot(3);
      tween(300, (t) => (boost = 1 + t * 2.5), () => later(1800, () => tween(600, (t) => (boost = 3.5 - t * 2.5), done), cleanups));
      wave(2400);
    } else {
      // the bell, and the passengers cheer
      sfx.bell();
      later(500, () => sfx.giggle(1.4), cleanups);
      wave(1400);
      hearts(far, tr.x - length / 2, tr.y - 60 * s, 5);
      later(1400, done, cleanups);
    }
  }), new Rectangle(-120 - 3 * 82, -95, 120 + 3 * 82 + 10, 100));

  function everyFrameFor(ms: number, fn: (elapsed: number) => void, end: () => void) {
    tween(ms, (t) => fn(t * ms), end);
  }
}

// ---------------------------------------------------------------------------
// Zebras: graze and swish their tails. Tap: whinny and rear up, trot,
// shake their heads, or kick up their heels.
// ---------------------------------------------------------------------------
function zebras({ kit, cleanups, S, L, clock }: Ctx) {
  for (const [i, z] of L.zebras.entries()) {
    const zebra = new Container();
    zebra.position.set(z.x, z.y);
    zebra.scale.set(z.s * S * (i === 0 ? -1 : 1), z.s * S); // the one at the back faces the other way
    const pose = new Container(); // rearing and bucking turn this round a hoof
    const shadow = shadowOf(64, 9);
    shadow.position.set(0, 2);
    zebra.addChild(shadow, pose);
    const tail = new Graphics();
    tail.moveTo(0, 0).quadraticCurveTo(-8, 18, -6, 36).stroke({ width: 4, color: INK });
    tail.ellipse(-6, 40, 5, 9).fill(INK);
    tail.position.set(-52, -74);
    const legs = new Graphics();
    for (const lx of [-42, -28, 24, 38]) {
      legs.rect(lx - 6, -52, 12, 48).fill(0xffffff).stroke({ width: 2.5, color: INK });
      legs.moveTo(lx - 6, -36).lineTo(lx + 6, -38).moveTo(lx - 6, -24).lineTo(lx + 6, -26).stroke({ width: 4, color: INK });
      legs.rect(lx - 7, -6, 14, 7).fill(INK);
    }
    const body = new Graphics();
    body.ellipse(0, -62, 54, 26).fill(0xffffff).stroke({ width: 3, color: INK });
    for (const sx of [-38, -24, -10, 4, 18, 32]) {
      const top = -62 - 26 * Math.sqrt(1 - (sx / 54) ** 2) + 3;
      body.moveTo(sx, top).quadraticCurveTo(sx + 9, -60, sx + 2, -46).stroke({ width: 6, color: INK });
    }
    const head = new Container();
    head.position.set(40, -74);
    const hg = new Graphics();
    hg.poly([-10, 6, 12, 8, 30, -34, 12, -46]).fill(0xffffff).stroke({ width: 3, color: INK });
    for (const t of [0.3, 0.55, 0.8]) hg.moveTo(-10 + 22 * t, 6 - 52 * t).lineTo(12 + 18 * t, 8 - 42 * t).stroke({ width: 4, color: INK });
    hg.moveTo(-10, 2).lineTo(12, -48).stroke({ width: 9, color: INK, cap: 'round' }); // the mane
    oval(hg, 30, -38, 24, 12, 0.75).fill(0xffffff).stroke({ width: 3, color: INK });
    oval(hg, 44, -24, 10, 9, 0.75).fill(0x3a3a3a);
    hg.circle(26, -44, 3).fill(INK);
    hg.poly([14, -48, 16, -62, 22, -50]).poly([20, -50, 26, -62, 28, -48]).fill(0xffffff).stroke({ width: 2, color: INK });
    head.addChild(hg);
    pose.addChild(tail, legs, body, head);
    kit.under.addChild(zebra);

    let graze = 0;
    let wildTail = 0;
    let headShake = 0;
    const phase = i * 2.3;
    everyFrame(() => {
      const t = clock.t * 0.001 + phase;
      tail.rotation = Math.sin(t * 3.2) * (0.25 + wildTail * 0.6);
      // grazing: head down for a while, then up to look about
      const want = Math.sin(t * 0.45) > 0.2 ? 1 : 0;
      graze += (want - graze) * 0.03;
      head.rotation = graze * 0.75 + Math.sin(clock.t * 0.03) * headShake * 0.25;
    }, cleanups);

    const turn = (px: number, to: number, ms: number, then: () => void) => {
      pose.pivot.set(px, 0);
      pose.position.set(px, 0);
      tween(ms, (t) => (pose.rotation = to * Math.sin(t * Math.PI)), () => {
        pose.rotation = 0;
        then();
      });
    };
    const pick = variety(4);
    tappable(zebra, oneAtATime((done) => {
      const k = pick();
      if (k === 0) {
        sfx.whinny();
        turn(-36, -0.35, 1100, done); // up on its back legs
      } else if (k === 1) {
        // a little trot out and back
        sfx.clipClop(8);
        const x0 = zebra.x;
        const dir = zebra.scale.x > 0 ? 1 : -1;
        tween(1300, (t) => {
          zebra.x = x0 + dir * Math.sin(t * Math.PI) * 60 * S;
          pose.y = -Math.abs(Math.sin(t * Math.PI * 8)) * 6;
        }, () => {
          pose.y = 0;
          done();
        });
      } else if (k === 2) {
        // shakes its head and snorts; dust puffs
        sfx.brrr(1.6);
        wildTail = 1;
        tween(900, (t) => (headShake = Math.sin(t * Math.PI)), () => {
          headShake = 0;
          wildTail = 0;
          done();
        });
        for (let j = 0; j < 5; j++) {
          const d = new Graphics().circle(0, 0, rand(6, 11)).fill({ color: 0xd4a373, alpha: 0.6 });
          tumble(kit, d, zebra.x + rand(-40, 40) * S, zebra.y - 4, zebra.y, { vy: -0.12, float: true });
        }
      } else {
        // kicks up its back heels
        sfx.boing(0.8);
        later(250, () => sfx.clipClop(2), cleanups);
        turn(34, -0.28, 700, done);
      }
    }), new Rectangle(-64, -132, 140, 136));
  }
}

// ---------------------------------------------------------------------------
// Meerkats: pop up out of their burrows on lookout, then duck back down.
// ---------------------------------------------------------------------------
function meerkats({ kit, cleanups, S, L }: Ctx) {
  const M = L.meerkats;
  const kats = M.holes.map((hx, i) => {
    const c = new Container();
    c.position.set(hx, M.y);
    const inner = new Container();
    inner.scale.set(S * (i === 1 ? 1.08 : 0.95));
    const g = new Graphics();
    g.ellipse(0, -30, 13, 32).fill(0xd4a373).stroke({ width: 2.5, color: INK });
    g.ellipse(3, -26, 8, 22).fill(0xf1d6a8);
    g.ellipse(7, -46, 5, 9).ellipse(-4, -46, 5, 9).fill(0xd4a373).stroke({ width: 2, color: INK }); // little arms
    const head = new Graphics();
    head.ellipse(0, 0, 12, 11).fill(0xd4a373).stroke({ width: 2.5, color: INK });
    head.ellipse(9, 3, 8, 5).fill(0xe6c08f).stroke({ width: 2, color: INK });
    head.circle(16, 2, 2.6).fill(INK);
    head.ellipse(2, -2, 4.5, 3.5).fill(0x6b4226);
    head.circle(3, -2.5, 1.6).fill(0xffffff);
    head.circle(-8, -5, 3.5).fill(0x6b4226);
    head.position.set(2, -64);
    inner.addChild(g, head);
    c.addChild(inner);
    kit.under.addChild(c);
    waterline(kit, c, hx - 40, hx + 40, M.y + 1); // (only above the hole shows)
    const kat = { c, inner, head, up: 0, set: (_v: number) => {} };
    kat.set = (v: number) => {
      kat.up = v;
      inner.y = (1 - v) * 92 * S;
    };
    kat.set(0);
    return kat;
  });

  const popUp = (k: (typeof kats)[number], ms = 320) => new Promise<void>((res) => tween(ms, (t) => k.set(ease.outBack(t)), res));
  const duck = (k: (typeof kats)[number], ms = 260) => new Promise<void>((res) => tween(ms, (t) => k.set(1 - t), res));
  const look = (dir: number) => kats.forEach((k) => (k.head.scale.x = dir));
  const wait = (ms: number) => new Promise<void>((res) => later(ms, res, cleanups));

  // now and then one has a look about by itself
  let busy = false; // (tapped: they're all doing something)
  let peeking = false;
  const peek = async () => {
    if (!busy && !peeking) {
      const k = kats[Math.floor(Math.random() * kats.length)];
      if (k.up < 0.1) {
        peeking = true;
        sfx.chirp();
        await popUp(k);
        k.head.scale.x = Math.random() < 0.5 ? 1 : -1;
        await wait(700);
        k.head.scale.x *= -1;
        await wait(700);
        if (!busy) await duck(k);
        peeking = false;
      }
    }
    later(rand(2500, 5000), () => void peek(), cleanups);
  };
  later(1500, () => void peek(), cleanups);

  const pick = variety(4);
  const area = new Container();
  kit.under.addChild(area);
  tappable(area, async () => {
    if (busy) return;
    busy = true;
    const k = pick();
    try {
      if (k === 0) {
        // all up on lookout, looking this way, then that way
        sfx.chirp();
        await Promise.all(kats.map((m) => popUp(m)));
        look(-1);
        await wait(600);
        sfx.chirp();
        look(1);
        await wait(700);
        for (const m of kats) await duck(m, 180);
      } else if (k === 1) {
        // up and down in a wave
        for (const [i, m] of kats.entries()) {
          sfx.squeak(1.2 + i * 0.25);
          await popUp(m, 200);
          void duck(m, 220);
        }
        await wait(300);
      } else if (k === 2) {
        // peekaboo: pops up from a different hole each time
        let at = Math.floor(Math.random() * 3);
        for (let n = 0; n < 4; n++) {
          sfx.pop(1.4 + n * 0.1);
          await popUp(kats[at], 220);
          await wait(250);
          await duck(kats[at], 150);
          at = (at + 1 + Math.floor(Math.random() * 2)) % 3;
        }
      } else {
        // everyone up, and the middle one has a little dance
        await Promise.all(kats.map((m) => popUp(m)));
        sfx.giggle(1.6);
        await new Promise<void>((res) => tween(1200, (t) => (kats[1].inner.rotation = Math.sin(t * Math.PI * 6) * 0.2), res));
        kats[1].inner.rotation = 0;
        for (const m of kats) await duck(m, 180);
      }
    } finally {
      look(1);
      busy = false;
    }
  }, new Rectangle(M.x0, M.y - 110 * S, M.x1 - M.x0, 130 * S));
}

// ---------------------------------------------------------------------------
// The animals the zoo always had: the giraffe, the monkey, the elephant,
// the penguins and the lion.
// ---------------------------------------------------------------------------
function classics({ kit, cleanups, w, h, L, clock }: Ctx) {
  const gy = L.gy;
  const time = () => clock.t;

  // --- the giraffe: nibbles the tree; tap for a big munch ---
  const gx = -0.6 * w, gfeet = h * 0.74;
  const giraffe = new Container();
  giraffe.position.set(gx, gfeet);
  giraffe.scale.set(Math.max(1, (h * 0.5) / 260)); // tall enough to reach the leaves
  const gb = new Graphics();
  for (const lx of [-34, -18, 18, 34]) gb.rect(lx - 5, -60, 10, 60).fill(0xffd166).stroke({ width: 2.5, color: INK });
  gb.ellipse(0, -66, 50, 26).fill(0xffd166).stroke({ width: 3, color: INK });
  for (const [sx, sy] of [[-20, -70], [4, -60], [24, -72], [-6, -78]]) gb.circle(sx, sy, 7).fill(0xc68b59);
  const neck = new Container();
  neck.position.set(34, -78);
  const ng = new Graphics();
  ng.roundRect(-10, -150, 20, 156, 10).fill(0xffd166).stroke({ width: 3, color: INK });
  for (const ny of [-40, -80, -120]) ng.circle(0, ny, 6).fill(0xc68b59);
  ng.ellipse(10, -156, 24, 14).fill(0xffd166).stroke({ width: 3, color: INK });
  ng.circle(14, -160, 3).fill(INK);
  ng.moveTo(-4, -168).lineTo(-6, -184).moveTo(6, -168).lineTo(8, -184).stroke({ width: 3, color: INK });
  neck.addChild(ng);
  neck.rotation = -0.25;
  giraffe.addChild(gb, neck);
  kit.under.addChild(giraffe);
  let reach = 0;
  everyFrame(() => (neck.rotation = -0.25 + Math.sin(time() * 0.0012) * 0.05 - reach * 0.35), cleanups);
  tappable(giraffe, oneAtATime((done) => {
    sfx.pop(0.8);
    tween(600, (t) => (reach = ease.inOutSine(t)), () => {
      for (let i = 0; i < 4; i++) {
        const leaf = new Graphics().ellipse(0, 0, 8, 5).fill(0x52b788).stroke({ width: 1.5, color: INK });
        tumble(kit, leaf, -0.48 * w + rand(-60, 60), h * 0.24, gfeet, { float: true });
      }
      later(300, () => sfx.pop(1.2), cleanups);
      later(900, () => tween(600, (t) => (reach = 1 - ease.inOutSine(t)), done), cleanups);
    });
  }), new Rectangle(-60, -280, 160, 290));

  // --- the monkey: swinging from the bar; tap for an ooh-ooh and a banana ---
  const mx = -0.16 * w, my = h * 0.24;
  const monkey = new Container();
  monkey.position.set(mx, my);
  const mg = new Graphics();
  mg.moveTo(-6, 0).lineTo(-12, 40).stroke({ width: 6, color: 0x8d5524 });
  mg.ellipse(-12, 60, 18, 24).fill(0x8d5524).stroke({ width: 2.5, color: INK });
  mg.circle(-12, 30, 16).fill(0x8d5524).stroke({ width: 2.5, color: INK });
  mg.ellipse(-12, 34, 10, 8).fill(0xffd6a5);
  mg.circle(-17, 27, 2.5).circle(-7, 27, 2.5).fill(INK);
  mg.circle(-28, 28, 6).circle(4, 28, 6).fill(0xffd6a5).stroke({ width: 2, color: INK });
  mg.moveTo(0, 74).quadraticCurveTo(30, 90, 22, 60).stroke({ width: 5, color: 0x8d5524 });
  monkey.addChild(mg);
  kit.under.addChild(monkey);
  let wild = 0;
  everyFrame(() => (monkey.rotation = Math.sin(time() * 0.002) * (0.25 + wild * 0.5)), cleanups);
  tappable(monkey, oneAtATime((done) => {
    sfx.giggle(1.9);
    later(250, () => sfx.giggle(2.1), cleanups);
    tween(1600, (t) => (wild = Math.sin(t * Math.PI)), () => {
      wild = 0;
      done();
    });
    const banana = new Graphics().moveTo(-14, -4).quadraticCurveTo(0, 14, 14, -4).stroke({ width: 8, color: 0xffd60a, cap: 'round' });
    tumble(kit, banana, mx, my + 60, h * 0.76, { vx: rand(-0.15, 0.15) });
  }), new Rectangle(-50, -10, 80, 110));

  // --- the elephant: flaps its ears; tap to spray water and trumpet ---
  const ex = 0.42 * w, ey = h * 0.72;
  const el = new Container();
  el.position.set(ex, ey);
  const eb = new Graphics();
  for (const lx of [-60, -30, 30, 60]) eb.roundRect(lx - 14, -50, 28, 52, 6).fill(0xadb5bd).stroke({ width: 3, color: INK });
  eb.ellipse(0, -80, 90, 54).fill(0xadb5bd).stroke({ width: 3, color: INK });
  eb.moveTo(-88, -86).quadraticCurveTo(-110, -60, -100, -40).stroke({ width: 4, color: INK });
  const ear = new Graphics().ellipse(0, 0, 34, 42).fill(0x9aa5b1).stroke({ width: 3, color: INK });
  ear.position.set(70, -96);
  const headG = new Graphics();
  headG.circle(100, -96, 40).fill(0xadb5bd).stroke({ width: 3, color: INK });
  headG.circle(112, -104, 4).fill(INK);
  headG.moveTo(124, -86).lineTo(140, -78).stroke({ width: 6, color: 0xfff3e6 }); // tusk
  const trunk = new Container();
  trunk.position.set(128, -80);
  const tg = new Graphics();
  tg.moveTo(0, 0).bezierCurveTo(14, 30, 4, 60, 10, 80).stroke({ width: 18, color: INK, cap: 'round' });
  tg.moveTo(0, 0).bezierCurveTo(14, 30, 4, 60, 10, 80).stroke({ width: 12, color: 0xadb5bd, cap: 'round' });
  trunk.addChild(tg);
  el.addChild(eb, ear, headG, trunk);
  kit.under.addChild(el);
  let lift = 0;
  everyFrame(() => {
    ear.scale.x = 1 - Math.abs(Math.sin(time() * 0.002)) * 0.25;
    trunk.rotation = Math.sin(time() * 0.0015) * 0.08 - lift * 2.4;
  }, cleanups);
  tappable(el, oneAtATime((done) => {
    sfx.slideWhistle(0.6);
    later(200, () => sfx.honk(), cleanups);
    tween(500, (t) => (lift = ease.inOutSine(t)), () => {
      sfx.water(1.5);
      const tip = trunk.toGlobal({ x: 10, y: 80 });
      const p = kit.over.toLocal(tip);
      spray(kit, p.x, p.y, 0.18, -0.55, 1300, 0x6ec6ff, h * 0.85);
      later(1500, () => tween(500, (t) => (lift = 1 - ease.inOutSine(t)), done), cleanups);
    });
  }), new Rectangle(-110, -150, 260, 160));

  // --- penguins: waddling on the ice; tap and one dives in ---
  const pens: Container[] = [];
  for (const [i, ppx] of [1.12, 1.2, 1.38].entries()) {
    const p = new Container();
    const pg = new Graphics();
    pg.ellipse(0, 1, 18, 4).fill({ color: 0x000000, alpha: 0.12 }); // a little shadow
    pg.ellipse(0, -26, 16, 26).fill(0x1f1f1f).stroke({ width: 2.5, color: INK });
    pg.ellipse(2, -22, 10, 18).fill(0xffffff);
    pg.circle(4, -42, 2.5).fill(INK);
    pg.poly([10, -40, 20, -37, 10, -34]).fill(0xffa94d);
    pg.ellipse(-6, 0, 7, 3).ellipse(8, 0, 7, 3).fill(0xffa94d);
    p.addChild(pg);
    p.position.set(ppx * w, gy + (i === 2 ? h * 0.02 : 0));
    kit.under.addChild(p);
    pens.push(p);
  }
  everyFrame(() => pens.forEach((p, i) => (p.rotation = Math.sin(time() * 0.006 + i * 2) * 0.12)), cleanups);
  let next = 0;
  for (const p of pens) {
    tappable(p, oneAtATime((done) => {
      const diver = pens[next % pens.length];
      next++;
      const x0 = diver.x, y0 = diver.y;
      const poolX = 1.26 * w, poolY = gy + h * 0.08;
      sfx.slideWhistle(1.3);
      tween(700, (t) => {
        diver.x = x0 + (poolX - x0) * t;
        diver.y = y0 + (poolY - y0) * t - Math.sin(t * Math.PI) * 50;
        diver.rotation = t * 1.6;
      }, () => {
        sfx.blub();
        diver.visible = false;
        ripple(kit.under, poolX, poolY);
        later(1100, () => {
          if (diver.destroyed) return;
          diver.visible = true;
          diver.rotation = 0;
          tween(500, (t) => {
            diver.x = poolX + (x0 - poolX) * t;
            diver.y = poolY + (y0 - poolY) * t - Math.sin(t * Math.PI) * 40;
          }, done);
        }, cleanups);
      });
    }), new Rectangle(-22, -56, 44, 60));
  }

  // --- the lion: swishes its tail; tap for a big ROAR ---
  const lx = 1.62 * w, ly = gy - h * 0.06;
  const lion = new Container();
  lion.position.set(lx, ly);
  const tail = new Graphics().moveTo(0, 0).quadraticCurveTo(-30, -10, -46, -36).stroke({ width: 5, color: 0xe0a458 });
  tail.circle(-46, -36, 7).fill(0x9c4f1e);
  tail.position.set(-44, -20);
  const lb = new Graphics();
  lb.ellipse(4, 2, 56, 7).fill({ color: 0x000000, alpha: 0.1 }); // its shadow on the rock
  lb.ellipse(0, -24, 52, 26).fill(0xe0a458).stroke({ width: 3, color: INK });
  for (const lxx of [-34, 30]) lb.roundRect(lxx - 8, -8, 16, 12, 4).fill(0xe0a458).stroke({ width: 2, color: INK });
  const mane = new Container();
  mane.position.set(44, -44);
  const mg2 = new Graphics();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    mg2.circle(Math.cos(a) * 26, Math.sin(a) * 26, 14).fill(0x9c4f1e);
  }
  mg2.circle(0, 0, 26).fill(0x9c4f1e).stroke({ width: 2, color: INK });
  mg2.circle(0, 2, 20).fill(0xe0a458).stroke({ width: 2, color: INK });
  mg2.circle(-7, -2, 3).circle(7, -2, 3).fill(INK);
  mg2.poly([-5, 6, 5, 6, 0, 11]).fill(0x6b4226);
  mane.addChild(mg2);
  lion.addChild(tail, lb, mane);
  kit.under.addChild(lion);
  everyFrame(() => (tail.rotation = Math.sin(time() * 0.003) * 0.3), cleanups);
  tappable(lion, oneAtATime((done) => {
    sfx.rawr();
    tween(900, (t) => {
      mane.scale.set(1 + Math.sin(t * Math.PI) * 0.3);
      mane.rotation = Math.sin(t * Math.PI * 8) * 0.1 * (1 - t);
    }, () => later(300, done, cleanups));
  }), new Rectangle(-80, -90, 160, 100));
}

// ---------------------------------------------------------------------------
// Flamingos: stand on one leg in the lagoon. Tap: flap, dip for a snack,
// all flap together, or hop onto the other leg.
// ---------------------------------------------------------------------------
function flamingos({ kit, cleanups, S, L, clock }: Ctx) {
  const F = L.flamingos.lagoon;
  const spots = [[-0.78, -0.2, 0.85], [0.25, -0.4, 0.82], [-0.28, 0.3, 1], [0.72, 0.25, 0.95]] as const;
  const birds = spots.map(([fx, fy, sc], i) => {
    const c = new Container();
    c.position.set(F.x + F.rx * fx, F.y + F.ry * fy);
    c.scale.set(S * sc * (i % 2 ? -1 : 1), S * sc);
    const legUp = new Graphics().moveTo(0, -60).lineTo(14, -46).lineTo(4, -40).stroke({ width: 4, color: 0xff8fab, cap: 'round', join: 'round' });
    const legDown = new Graphics().moveTo(0, -60).lineTo(2, -32).lineTo(0, 0).stroke({ width: 4, color: 0xff8fab, cap: 'round', join: 'round' });
    const body = new Graphics();
    body.poly([-26, -74, -38, -80, -34, -66]).fill(0xff5d8f).stroke({ width: 2, color: INK });
    body.ellipse(0, -72, 27, 15).fill(0xff8fab).stroke({ width: 2.5, color: INK });
    const wing = new Graphics();
    wing.ellipse(-8, 0, 20, 10).fill(0xff5d8f).stroke({ width: 2, color: INK });
    wing.ellipse(-24, 2, 7, 5).fill(INK);
    wing.position.set(2, -74);
    const neck = new Container();
    neck.position.set(18, -78);
    const ng = new Graphics();
    const path = (gg: Graphics) => gg.moveTo(0, 0).bezierCurveTo(18, -18, -14, -36, 4, -58);
    path(ng).stroke({ width: 12, color: INK, cap: 'round' });
    path(ng).stroke({ width: 8, color: 0xff8fab, cap: 'round' });
    ng.circle(8, -62, 9).fill(0xff8fab).stroke({ width: 2, color: INK });
    ng.poly([14, -66, 28, -60, 24, -48, 16, -56]).fill(0xfff3e6).stroke({ width: 2, color: INK });
    ng.poly([28, -60, 24, -48, 21, -53]).fill(INK);
    ng.circle(7, -64, 2).fill(INK);
    neck.addChild(ng);
    const ring = new Graphics().ellipse(0, 0, 14, 4).stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
    c.addChild(ring, legDown, legUp, body, wing, neck);
    kit.under.addChild(c);
    return { c, legUp, legDown, wing, neck, body, baseY: c.y, flap: 0, dip: 0, hop: 0 };
  });
  everyFrame(() => {
    birds.forEach((b, i) => {
      const t = clock.t * 0.001 + i * 1.7;
      b.neck.rotation = Math.sin(t * 0.9) * 0.06 + b.dip * 1.25;
      b.wing.rotation = -b.flap * 1.1;
      b.wing.scale.y = 1 + b.flap * 0.5;
      b.body.y = Math.sin(t * 1.3) * 1.2;
      b.c.y = b.baseY - b.hop * 22 * S;
      b.wing.y = -74 + b.body.y;
      b.neck.y = -78 + b.body.y;
      b.legUp.y = b.body.y;
    });
  }, cleanups);
  // now and then one swaps legs
  const swap = (b: (typeof birds)[number]) => {
    b.c.scale.x *= -1; // (it turns round as it changes legs)
  };
  const anim = (ms: number, fn: (t: number) => void) => new Promise<void>((res) => tween(ms, fn, res));
  const flapOnce = (b: (typeof birds)[number], pitch: number) => {
    sfx.squawk(pitch);
    sfx.flutter();
    return anim(900, (t) => (b.flap = Math.abs(Math.sin(t * Math.PI * 3))));
  };
  const pick = variety(4);
  for (const b of birds) {
    tappable(b.c, oneAtATime((done) => {
      const k = pick();
      if (k === 0) void flapOnce(b, rand(0.55, 0.7)).then(done);
      else if (k === 1) {
        // a dip for a snack: bubbles in the water
        void anim(500, (t) => (b.dip = ease.inOutSine(t))).then(() => {
          sfx.blub();
          const p = kit.under.toLocal(b.neck.toGlobal({ x: 26, y: -54 }));
          bubbles(kit.under, p.x, F.y + F.ry * 0.2, 6, 14);
          later(700, () => void anim(500, (t) => (b.dip = 1 - ease.inOutSine(t))).then(done), cleanups);
        });
      } else if (k === 2) {
        // everybody flaps, one after another
        birds.forEach((o, i) => later(i * 180, () => void flapOnce(o, 0.5 + i * 0.07), cleanups));
        later(900 + birds.length * 180, done, cleanups);
      } else {
        sfx.boing(1.4);
        void anim(500, (t) => (b.hop = Math.sin(t * Math.PI))).then(() => {
          swap(b);
          done();
        });
      }
    }), new Rectangle(-40, -150, 80, 152));
  }
  const swapper = () => {
    const b = birds[Math.floor(Math.random() * birds.length)];
    void anim(400, (t) => (b.hop = Math.sin(t * Math.PI) * 0.5)).then(() => swap(b));
    later(rand(6000, 10000), swapper, cleanups);
  };
  later(5000, swapper, cleanups);
}

// ---------------------------------------------------------------------------
// The hippo: lurks in its pool (eyes, ears and nose showing). Tap: it comes
// up for a huge yawn, blows bubbles, hides and pops up somewhere else, or
// wiggles its ears.
// ---------------------------------------------------------------------------
function hippo({ kit, cleanups, w, S, L, clock }: Ctx) {
  const P = L.hippo.pool;
  const c = new Container();
  const inner = new Container();
  inner.scale.set(S * 1.2);
  c.addChild(inner);
  const PURPLE = 0x9d8ba7;
  const body = new Graphics();
  body.ellipse(40, 12, 80, 36).fill(PURPLE).stroke({ width: 3, color: INK });
  body.ellipse(-62, 26, 40, 16).fill(0xb8a9c2).stroke({ width: 3, color: INK }); // the lower jaw
  const mouth = new Graphics();
  mouth.ellipse(-60, 14, 36, 18).fill(0xff8fab).stroke({ width: 2.5, color: INK });
  mouth.ellipse(-56, 20, 18, 7).fill(0xff5d8f); // its tongue
  mouth.rect(-88, 6, 9, 16).rect(-42, 6, 9, 16).fill(0xffffff).stroke({ width: 2, color: INK }); // two big teeth
  const upper = new Container(); // the top of the head opens for a yawn
  upper.pivot.set(-14, 16);
  upper.position.set(-14, 16);
  const head = new Graphics();
  head.ellipse(-36, -2, 46, 26).fill(PURPLE).stroke({ width: 3, color: INK });
  head.ellipse(-72, 2, 34, 22).fill(0xb8a9c2).stroke({ width: 3, color: INK });
  for (const nx of [-84, -68]) head.ellipse(nx, -17, 7, 5).fill(0xb8a9c2).stroke({ width: 2, color: INK });
  head.ellipse(-84, -18, 3, 2).ellipse(-68, -18, 3, 2).fill(0x5a4a66); // nostrils
  for (const [ex, ey] of [[-44, -26], [-24, -28]]) {
    head.circle(ex, ey, 11).fill(PURPLE).stroke({ width: 3, color: INK });
    head.circle(ex - 2, ey - 2, 4).fill(INK);
    head.circle(ex - 3, ey - 3, 1.4).fill(0xffffff);
  }
  const ears = [-12, 0].map((ex) => {
    const e = new Graphics().ellipse(0, -6, 6, 9).fill(PURPLE).stroke({ width: 2.5, color: INK });
    e.ellipse(0, -6, 3, 5).fill(0xff8fab);
    e.position.set(ex, -30);
    return e;
  });
  upper.addChild(...ears, head);
  inner.addChild(body, mouth, upper);
  const ring = new Graphics().ellipse(-40 * S, 0, 70 * S, 7 * S).stroke({ width: 3, color: 0xffffff, alpha: 0.6 });
  c.addChild(ring);
  kit.under.addChild(c);
  waterline(kit, inner, P.x - P.rx - 140 * S, P.x + P.rx + 140 * S, P.y);

  const home = P.x - 0.02 * w;
  let baseX = home;
  let sink = 16; // how far under the water (16: just eyes, ears and nose; -20: right up; 60: gone)
  let open = 0;
  let wiggle = 0;
  everyFrame(() => {
    const t = clock.t * 0.001;
    c.position.set(baseX + Math.sin(t * 0.3) * 0.02 * w, P.y);
    inner.y = sink * S * 1.2;
    upper.rotation = -open * 0.75;
    ears.forEach((e, i) => (e.rotation = Math.sin(t * (2 + wiggle * 20) + i) * (0.15 + wiggle * 0.5)));
    ring.visible = sink < 50;
  }, cleanups);
  const nose = () => kit.under.toLocal(head.toGlobal({ x: -76, y: -18 }));
  // a few bubbles now and then
  const bubbler = () => {
    if (sink >= 10 && sink < 40) {
      const p = nose();
      bubbles(kit.under, p.x, P.y, 3, 8);
    }
    later(rand(3000, 6000), bubbler, cleanups);
  };
  later(2000, bubbler, cleanups);

  const anim = (ms: number, fn: (t: number) => void) => new Promise<void>((res) => tween(ms, fn, res));
  const wait = (ms: number) => new Promise<void>((res) => later(ms, res, cleanups));
  const pick = variety(4);
  tappable(c, oneAtATime(async (done) => {
    const k = pick();
    try {
      if (k === 0) {
        // up it comes, for a great big yawn
        sfx.water(0.8);
        ripple(kit.under, c.x - 30 * S, P.y, 70);
        await anim(500, (t) => (sink = 16 - 36 * ease.outCubic(t)));
        sfx.grunt(0.8);
        await anim(600, (t) => (open = ease.outBack(t)));
        await wait(900);
        await anim(300, (t) => (open = 1 - t));
        sfx.blub();
        await anim(700, (t) => (sink = -20 + 36 * ease.inOutSine(t)));
      } else if (k === 1) {
        // lots of bubbles, and a little fountain
        sfx.blub();
        later(200, () => sfx.blub(), cleanups);
        const p = nose();
        bubbles(kit.under, p.x, P.y, 14, 30);
        await wait(600);
        sfx.water(1);
        spray(kit, p.x, P.y - 6, 0.05, -0.4, 700, 0x9bd0ff, P.y + 10);
        await wait(900);
      } else if (k === 2) {
        // hides... and pops up somewhere else
        sfx.blub();
        await anim(500, (t) => (sink = 16 + 44 * t));
        const to = home + (baseX === home ? (Math.random() < 0.5 ? -1 : 1) * 0.08 * w : 0);
        const from = baseX;
        for (let i = 0; i < 4; i++) later(i * 200, () => bubbles(kit.under, from + ((to - from) * i) / 4 - 70 * S, P.y, 2, 6), cleanups);
        await anim(900, (t) => (baseX = from + (to - from) * t));
        sfx.water(0.6);
        sfx.pop(0.7);
        ripple(kit.under, c.x - 30 * S, P.y, 80);
        await anim(400, (t) => (sink = 60 - 44 * ease.outBack(t)));
      } else {
        // ear wiggle: drops fly off
        sfx.grunt(1.25);
        await anim(900, (t) => {
          wiggle = Math.sin(t * Math.PI);
        });
        for (const e of ears) {
          const p = kit.under.toLocal(e.toGlobal({ x: 0, y: -10 }));
          spray(kit, p.x, p.y, rand(-0.1, 0.1), -0.25, 300, 0x9bd0ff, P.y);
        }
        wiggle = 0;
      }
    } finally {
      done();
    }
  }), new Rectangle(-150 * S, -70 * S, 300 * S, 90 * S));
}

// ---------------------------------------------------------------------------
// The crocodile: lies in its swamp, blinking. Tap: SNAP, a tail slap,
// sinks and pops up somewhere else, or a big toothy grin.
// ---------------------------------------------------------------------------
function crocodile({ kit, cleanups, w, S, L, clock }: Ctx) {
  const P = L.croc.pool;
  const c = new Container();
  const inner = new Container();
  inner.scale.set(S);
  c.addChild(inner);
  const GREEN = 0x52b788, DARK = 0x2d6a4f;
  const tail = new Graphics();
  tail.poly([0, -10, 110, -2, 116, 4, 0, 12]).fill(GREEN).stroke({ width: 3, color: INK });
  for (let x = 12; x < 100; x += 18) tail.poly([x, -8 + x * 0.06, x + 7, -16 + x * 0.08, x + 14, -6 + x * 0.06]).fill(DARK);
  tail.pivot.set(0, 0);
  tail.position.set(60, 4);
  const body = new Graphics();
  body.ellipse(10, 6, 68, 18).fill(GREEN).stroke({ width: 3, color: INK });
  for (let x = -40; x <= 52; x += 15) body.circle(x, -8, 6).fill(DARK);
  // the jaws (the top one opens)
  const lower = new Graphics();
  lower.poly([-48, 10, -140, 12, -136, 22, -48, 22]).fill(GREEN).stroke({ width: 3, color: INK });
  for (let x = -130; x < -56; x += 12) lower.poly([x, 12, x + 5, 4, x + 10, 12]).fill(0xffffff).stroke({ width: 1, color: INK });
  const inside = new Graphics().poly([-48, 2, -134, 6, -134, 12, -48, 12]).fill(0xff8fab);
  const upper = new Container();
  upper.pivot.set(-46, 6);
  upper.position.set(-46, 6);
  const top = new Graphics();
  top.poly([-46, -10, -138, -2, -144, 4, -138, 8, -46, 8]).fill(GREEN).stroke({ width: 3, color: INK });
  for (let x = -132; x < -56; x += 12) top.poly([x, 7, x + 5, 15, x + 10, 7]).fill(0xffffff).stroke({ width: 1, color: INK });
  top.circle(-132, -4, 5).circle(-122, -5, 5).fill(DARK);
  top.circle(-58, -14, 13).fill(GREEN).stroke({ width: 3, color: INK });
  top.circle(-58, -16, 7).fill(0xffd166);
  top.rect(-59.5, -22, 3, 12).fill(INK);
  const lid = new Graphics().circle(-58, -16, 8).fill(GREEN);
  lid.visible = false;
  const sparkle = new Graphics().star(-96, 18, 4, 9, 3).fill(0xffffff).stroke({ width: 1.5, color: 0xffd166 });
  sparkle.visible = false;
  upper.addChild(top, lid);
  inner.addChild(tail, body, inside, lower, upper, sparkle);
  const ring = new Graphics().ellipse(-50 * S, 0, 100 * S, 7 * S).stroke({ width: 3, color: 0xffffff, alpha: 0.5 });
  c.addChild(ring);
  kit.under.addChild(c);
  waterline(kit, inner, P.x - P.rx - 200 * S, P.x + P.rx + 200 * S, P.y + 2);

  const home = P.x + 0.02 * w;
  let baseX = home;
  let sink = -2; // -2: lying in the water; 18: only eyes; 50: gone
  let open = 0;
  let slap = 0;
  everyFrame(() => {
    const t = clock.t * 0.001;
    c.position.set(baseX, P.y + Math.sin(t * 0.8) * 1.5);
    inner.y = sink * S;
    upper.rotation = open * 0.55;
    tail.rotation = Math.sin(t * 0.7) * 0.06 - slap * 0.6;
    ring.visible = sink < 40;
    lid.visible = t % 4.5 < 0.15; // a blink
  }, cleanups);
  const anim = (ms: number, fn: (t: number) => void) => new Promise<void>((res) => tween(ms, fn, res));
  const wait = (ms: number) => new Promise<void>((res) => later(ms, res, cleanups));
  const pick = variety(4);
  tappable(c, oneAtATime(async (done) => {
    const k = pick();
    try {
      if (k === 0) {
        // up it comes, opens wide... SNAP!
        await anim(450, (t) => {
          open = ease.outCubic(t);
          sink = -2 - 12 * t;
        });
        await wait(350);
        await anim(80, (t) => (open = 1 - t));
        sfx.snap();
        void anim(500, (t) => (sink = -14 + 12 * t));
        const p = kit.under.toLocal(top.toGlobal({ x: -120, y: 0 }));
        spray(kit, p.x, P.y, -0.1, -0.3, 300, 0x9bd0ff, P.y + 10);
        ripple(kit.under, p.x, P.y, 40);
        await wait(500);
      } else if (k === 1) {
        // a big tail slap
        await anim(400, (t) => (slap = ease.outCubic(t)));
        await anim(150, (t) => (slap = 1 - t * 1.2));
        sfx.water(0.9);
        sfx.drop(0.6);
        const p = kit.under.toLocal(tail.toGlobal({ x: 110, y: 0 }));
        spray(kit, p.x, P.y, 0.08, -0.5, 600, 0x9bd0ff, P.y + 12);
        ripple(kit.under, p.x, P.y, 60);
        await anim(300, (t) => (slap = -0.2 * (1 - t)));
      } else if (k === 2) {
        // under it goes... and the eyes pop up somewhere else
        sfx.blub();
        await anim(500, (t) => (sink = -2 + 52 * t));
        const to = baseX === home ? home - 0.08 * w : home;
        const from = baseX;
        for (let i = 0; i < 5; i++) later(i * 180, () => bubbles(kit.under, from + ((to - from) * i) / 5 - 60 * S, P.y, 2, 6), cleanups);
        await anim(900, (t) => (baseX = from + (to - from) * t));
        await anim(500, (t) => (sink = 50 - 32 * ease.outCubic(t)));
        sfx.pop(1.1);
        await wait(900);
        await anim(500, (t) => (sink = 18 - 20 * t));
      } else {
        // a big toothy grin, with a twinkle
        await anim(300, (t) => {
          open = 0.35 * t;
          sink = -2 - 8 * t;
        });
        sparkle.visible = true;
        sfx.twinkle();
        await anim(800, (t) => (sparkle.rotation = t * 3));
        sparkle.visible = false;
        await anim(300, (t) => {
          open = 0.35 * (1 - t);
          sink = -10 + 8 * t;
        });
      }
    } finally {
      done();
    }
  }), new Rectangle(-150 * S, -40 * S, 290 * S, 60 * S));
}

// ---------------------------------------------------------------------------
// Parrots in the aviary. Tap: squawk and flap, fly a loop round the
// aviary, sing a little song, or hang upside down.
// ---------------------------------------------------------------------------
function parrots({ kit, cleanups, h, S, L, clock }: Ctx) {
  const A = L.aviary;
  const looks = [
    { body: 0xe63946, wing: 0x3a86ff, stripe: 0xffd166, tail: 0xe63946 },
    { body: 0x3a86ff, wing: 0x1d4ed8, stripe: 0xffd166, tail: 0x3a86ff, belly: 0xffd166 },
    { body: 0x52b788, wing: 0x2d6a4f, stripe: 0xe63946, tail: 0x3a86ff, head: 0xe63946 },
  ];
  const birds = A.perches.map((p, i) => {
    const look = looks[i];
    const c = new Container();
    c.position.set(p.x, p.y);
    const inner = new Container();
    inner.scale.set(S * (i % 2 ? -1 : 1), S);
    const g = new Graphics();
    g.poly([-6, -12, -16, 40, -6, 44, 4, -10]).fill(look.tail).stroke({ width: 2, color: INK });
    g.ellipse(0, -24, 13, 20).fill(look.body).stroke({ width: 2.5, color: INK });
    if (look.belly) g.ellipse(4, -20, 8, 13).fill(look.belly);
    g.moveTo(-6, 0).lineTo(-4, 4).moveTo(4, 0).lineTo(6, 4).stroke({ width: 3, color: 0x6c757d });
    const wing = new Graphics();
    wing.ellipse(0, 12, 9, 17).fill(look.wing).stroke({ width: 2, color: INK });
    wing.ellipse(0, 8, 5, 8).fill(look.stripe);
    wing.position.set(-4, -36);
    const head = new Graphics();
    head.circle(0, 0, 11).fill(look.head ?? look.body).stroke({ width: 2.5, color: INK });
    head.ellipse(5, 0, 6, 7).fill(0xffffff);
    head.circle(6, -1, 2.3).fill(INK);
    head.poly([9, -5, 20, 0, 15, 11, 10, 5]).fill(0xfff3c4).stroke({ width: 2, color: INK });
    head.position.set(4, -46);
    inner.addChild(g, wing, head);
    c.addChild(inner);
    kit.under.addChild(c);
    return { c, inner, wing, head, home: { x: p.x, y: p.y }, facing: i % 2 ? -1 : 1, flap: 0 };
  });
  // the netting, in front of the birds
  const net = new Graphics();
  const by = A.base - h * 0.03, ry = by - A.top;
  const arc = (rx: number) => {
    net.moveTo(A.x - rx, by);
    for (let k = 1; k <= 24; k++) {
      const t = Math.PI + (k / 24) * Math.PI;
      net.lineTo(A.x + Math.cos(t) * rx, by + Math.sin(t) * ry);
    }
  };
  for (let k = 1; k < 6; k++) arc((A.rx * k) / 6);
  for (let k = 1; k < 7; k++) {
    const y = by - (ry * k) / 7;
    const half = A.rx * Math.sqrt(1 - ((by - y) / ry) ** 2);
    net.moveTo(A.x - half, y).lineTo(A.x + half, y);
  }
  net.stroke({ width: 1.5, color: INK, alpha: 0.3 });
  arc(A.rx);
  net.stroke({ width: 4, color: INK });
  net.circle(A.x, A.top - 8, 8).fill(0xffd166).stroke({ width: 2, color: INK }); // a knob on the top
  kit.under.addChild(net);

  everyFrame(() => {
    birds.forEach((b, i) => {
      const t = clock.t * 0.001 + i * 2.1;
      b.head.rotation = Math.sin(t * 2.2) * 0.12;
      b.wing.rotation = -b.flap * 1.2;
    });
  }, cleanups);
  const anim = (ms: number, fn: (t: number) => void) => new Promise<void>((res) => tween(ms, fn, res));
  const flap = (b: (typeof birds)[number], ms: number) => anim(ms, (t) => (b.flap = Math.abs(Math.sin(t * Math.PI * (ms / 150)))));
  const pick = variety(4);
  for (const b of birds) {
    tappable(b.c, oneAtATime(async (done) => {
      const k = pick();
      try {
        if (k === 0) {
          sfx.squawk(rand(1, 1.3));
          await flap(b, 700);
        } else if (k === 1) {
          // a loop round the aviary, and back to its perch
          sfx.flutter();
          sfx.squawk(1.2);
          const dir = Math.random() < 0.5 ? -1 : 1;
          const fl = flap(b, 1800);
          await anim(1800, (t) => {
            const a = t * Math.PI * 2;
            b.c.x = b.home.x + dir * Math.sin(a) * A.rx * 0.55;
            b.c.y = b.home.y - Math.sin(a / 2) * h * 0.12 + (1 - Math.cos(a)) * h * 0.02;
            b.inner.scale.x = Math.abs(b.inner.scale.x) * (Math.cos(a) * dir >= 0 ? 1 : -1);
          });
          await fl;
          b.c.position.set(b.home.x, b.home.y);
          b.inner.scale.x = Math.abs(b.inner.scale.x) * b.facing;
          const feather = new Graphics().ellipse(0, 0, 4, 10).fill(0xffd166).stroke({ width: 1.5, color: INK });
          tumble(kit, feather, b.home.x, b.home.y - 20, A.base - h * 0.03, { float: true });
        } else if (k === 2) {
          // a little song, bobbing along
          sfx.tune([1568, 1760, 1568, 2093, 1976, 1568], 0.14);
          await anim(900, (t) => (b.inner.y = -Math.abs(Math.sin(t * Math.PI * 6)) * 6));
        } else {
          // upside down from the perch
          sfx.giggle(2);
          await anim(400, (t) => (b.inner.rotation = Math.PI * ease.inOutSine(t)));
          await anim(700, (t) => (b.inner.x = Math.sin(t * Math.PI * 2) * 4));
          await anim(400, (t) => (b.inner.rotation = Math.PI * (1 - ease.inOutSine(t))));
          b.inner.rotation = 0;
        }
      } finally {
        b.flap = 0;
        b.inner.y = 0;
        done();
      }
    }), new Rectangle(-34, -70, 68, 74));
  }
}

// ---------------------------------------------------------------------------
// The tortoise: plods slowly up and down. Tap: hides in its shell, munches
// a leaf, goes ZOOM, or has a sleepy yawn.
// ---------------------------------------------------------------------------
function tortoise({ kit, cleanups, w, S, L }: Ctx) {
  const T = L.tortoise;
  const c = new Container();
  c.position.set(T.x0 + 0.06 * w, T.y + 4);
  const inner = new Container();
  inner.scale.set(S);
  c.addChild(shadowOf(46 * S, 7 * S), inner);
  const legs = [-22, -8, 12, 24].map((lx) => {
    const l = new Graphics().ellipse(0, -4, 8, 9).fill(0xb5c99a).stroke({ width: 2.5, color: INK });
    l.position.set(lx, 0);
    return l;
  });
  const head = new Container();
  head.position.set(30, -14);
  const hg = new Graphics();
  hg.roundRect(-6, -8, 20, 14, 7).fill(0xb5c99a).stroke({ width: 2.5, color: INK });
  hg.ellipse(18, -10, 13, 11).fill(0xb5c99a).stroke({ width: 2.5, color: INK });
  hg.circle(21, -13, 2.6).fill(INK);
  hg.moveTo(22, -4).quadraticCurveTo(26, -1, 30, -6).stroke({ width: 2, color: INK });
  head.addChild(hg);
  const shell = new Graphics();
  shell.moveTo(-36, -8).quadraticCurveTo(-34, -52, 0, -52).quadraticCurveTo(34, -52, 36, -8).closePath().fill(0x8a9a5b).stroke({ width: 3, color: INK });
  for (const [px, py] of [[-16, -28], [0, -38], [16, -28], [0, -20]]) shell.poly([px - 8, py, px - 4, py - 8, px + 4, py - 8, px + 8, py, px + 4, py + 8, px - 4, py + 8]).fill(0x6b7d47).stroke({ width: 1.5, color: 0x4a5a2e });
  shell.roundRect(-38, -12, 76, 9, 4).fill(0x6b7d47).stroke({ width: 2, color: INK });
  inner.addChild(...legs, head, shell);
  kit.under.addChild(c);

  const left = T.x0 + 0.04 * w, right = T.x1 - 0.1 * w;
  let dir = 1;
  const speed = 0.012 * S; // very slow
  let walking = true;
  let tucked = 0;
  let step = 0;
  everyFrame((dt) => {
    if (walking) {
      c.x += dir * speed * dt;
      step += speed * dt;
      if ((dir > 0 && c.x > right) || (dir < 0 && c.x < left)) {
        dir = -dir as 1 | -1;
        inner.scale.x = Math.abs(inner.scale.x) * dir;
      }
    }
    legs.forEach((l, i) => {
      l.y = walking ? -Math.max(0, Math.sin(step * 0.25 + i * Math.PI * 0.5)) * 3 : 0;
      l.scale.set(1 - tucked * 0.8);
    });
    head.x = 30 - tucked * 26;
    head.scale.set(1 - tucked * 0.7);
    head.y = -14 + (walking ? Math.sin(step * 0.12) * 1.5 : 0);
  }, cleanups);
  const anim = (ms: number, fn: (t: number) => void) => new Promise<void>((res) => tween(ms, fn, res));
  const wait = (ms: number) => new Promise<void>((res) => later(ms, res, cleanups));
  const pick = variety(4);
  tappable(c, oneAtATime(async (done) => {
    const k = pick();
    walking = false;
    try {
      if (k === 0) {
        // in it goes... and out it peeks
        sfx.drop(1.2);
        await anim(250, (t) => (tucked = t));
        await wait(1600);
        await anim(400, (t) => (tucked = 1 - t * 0.5));
        sfx.pop(1.3);
        await wait(500);
        await anim(250, (t) => (tucked = 0.5 * (1 - t)));
      } else if (k === 1) {
        // a crunchy leaf
        const leaf = new Graphics().ellipse(0, 0, 12, 8).fill(0x95d5b2).stroke({ width: 2, color: INK });
        leaf.position.set(56, -20);
        inner.addChild(leaf);
        sfx.munch();
        await anim(900, (t) => leaf.scale.set(1 - t));
        leaf.destroy();
        hearts(kit.sparkles, c.x, c.y - 60 * S, 4);
      } else if (k === 2) {
        // ZOOM! (just this once)
        sfx.whoosh();
        const to = dir > 0 ? right : left;
        const from = c.x;
        await anim(500, (t) => {
          c.x = from + (to - from) * ease.outCubic(t);
          step += 6;
        });
        for (let i = 0; i < 3; i++) {
          const line = new Graphics().rect(0, 0, 30, 3).fill({ color: INK, alpha: 0.5 });
          line.position.set(c.x - dir * (60 + i * 10) * S, c.y - (14 + i * 12) * S);
          kit.under.addChild(line);
          tween(500, (t) => (line.alpha = 1 - t), () => line.destroy());
        }
        sfx.boing(1.5);
        await wait(400);
      } else {
        // a big sleepy yawn
        sfx.dizzy(0.6);
        await anim(700, (t) => (head.rotation = -Math.sin(t * Math.PI) * 0.4));
        for (let i = 0; i < 3; i++) {
          const z = new Graphics().moveTo(0, 0).lineTo(12, 0).lineTo(0, 12).lineTo(12, 12).stroke({ width: 3, color: INK });
          z.position.set(c.x + 20 * S, c.y - 70 * S);
          kit.over.addChild(z);
          const d = i * 300;
          tween(1500 + d, (t) => {
            const q = Math.max(0, (t * (1500 + d) - d) / 1500);
            z.alpha = q > 0 ? 1 - q : 0;
            z.y = c.y - 70 * S - q * 60;
            z.x = c.x + 20 * S + q * 30;
          }, () => z.destroy());
        }
        await wait(1500);
      }
    } finally {
      walking = true;
      tucked = 0;
      head.rotation = 0;
      done();
    }
  }), new Rectangle(-50 * S, -60 * S, 110 * S, 66 * S));
}

// ---------------------------------------------------------------------------
// The snack kiosk: tap for popcorn, an ice cream, a balloon, or a wave.
// ---------------------------------------------------------------------------
function kiosk({ kit, cleanups, w, h, L }: Ctx) {
  const K = L.kiosk;
  const kw = 0.085 * w, kh = h * 0.17;
  const ct = K.base - kh * 0.4; // the counter
  const keeper = new Container();
  const kg = new Graphics();
  kg.circle(0, 0, 22).fill(0xf1c27d).stroke({ width: 2.5, color: INK });
  kg.circle(-7, -3, 2.5).circle(7, -3, 2.5).fill(INK);
  kg.moveTo(-7, 7).quadraticCurveTo(0, 13, 7, 7).stroke({ width: 2, color: INK });
  kg.roundRect(-24, -26, 48, 12, 6).fill(0xffffff).stroke({ width: 2, color: INK }); // a little white hat
  const arm = new Graphics().moveTo(0, 0).lineTo(14, -22).stroke({ width: 7, color: 0xf1c27d, cap: 'round' });
  arm.position.set(20, 10);
  keeper.addChild(arm, kg);
  keeper.position.set(K.x - kw * 0.1, ct + 6);
  keeper.visible = false;
  kit.under.addChild(keeper);
  // (the counter in front of the shopkeeper)
  const counter = new Graphics().rect(K.x - kw - 6, ct, kw * 2 + 12, 14).fill(0xc68b59).stroke({ width: 3, color: INK });
  kit.under.addChild(counter);
  const pick = variety(4);
  const area = new Container();
  kit.under.addChild(area);
  tappable(area, oneAtATime((done) => {
    const k = pick();
    if (k === 0) {
      // popcorn!
      for (let i = 0; i < 9; i++) {
        later(i * 90, () => {
          sfx.pop(rand(1.6, 2.2));
          const p = new Graphics().circle(0, 0, 7).fill(0xfff3c4).stroke({ width: 1.5, color: INK });
          tumble(kit, p, K.x + kw * 0.45, ct - 40, K.base + h * 0.06, { vx: rand(-0.2, 0.2), vy: -0.45 });
        }, cleanups);
      }
      later(1100, done, cleanups);
    } else if (k === 1) {
      // an ice cream pops out of the window
      sfx.ding();
      const ice = new Graphics();
      face(ice, 'icecream', 0, 0, 18);
      tumble(kit, ice, K.x, ct - 30, K.base + h * 0.06, { vx: rand(-0.12, 0.12), vy: -0.4, spin: rand(-2, 2) });
      later(900, done, cleanups);
    } else if (k === 2) {
      // a balloon floats up from behind the kiosk
      sfx.pling();
      const col = [0xe63946, 0x4ea8ff, 0xffd166, 0x7bd36b][Math.floor(Math.random() * 4)];
      const b = new Graphics();
      b.moveTo(0, 22).quadraticCurveTo(6, 40, 0, 60).stroke({ width: 2, color: INK });
      b.ellipse(0, 0, 18, 22).fill(col).stroke({ width: 2.5, color: INK });
      b.ellipse(-6, -8, 4, 7).fill({ color: 0xffffff, alpha: 0.6 });
      const x0 = K.x + kw * 0.6, y0 = K.base - kh - 40;
      b.position.set(x0, y0);
      kit.over.addChild(b);
      tween(4500, (t) => {
        b.y = y0 - t * h * 0.75;
        b.x = x0 + Math.sin(t * 9) * 20 + t * 60;
        b.alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
      }, () => b.destroy());
      later(800, done, cleanups);
    } else {
      // the shopkeeper says hello
      sfx.dingDong();
      keeper.visible = true;
      tween(1600, (t) => {
        keeper.y = ct + 6 - Math.min(1, t * 5, (1 - t) * 5) * 34;
        arm.rotation = Math.sin(t * Math.PI * 8) * 0.4;
      }, () => {
        keeper.visible = false;
        done();
      });
    }
  }), new Rectangle(K.x - kw - 10, K.base - kh - 92, kw * 2 + 20, kh + 92));
}

/** The noise each animal on a sign makes. */
const VOICE: Record<Face, () => void> = {
  giraffe: () => sfx.pop(0.8),
  zebra: () => sfx.whinny(),
  monkey: () => sfx.giggle(1.9),
  elephant: () => sfx.honk(),
  flamingo: () => sfx.squawk(0.6),
  penguin: () => sfx.squeak(1.6),
  lion: () => sfx.rawr(),
  hippo: () => sfx.grunt(),
  croc: () => sfx.snap(),
  parrot: () => sfx.squawk(1.2),
  tortoise: () => sfx.munch(),
  meerkat: () => sfx.chirp(),
  icecream: () => sfx.ding(),
};

// ---------------------------------------------------------------------------
// Picture signposts on the path: an arrow each way, with the animal that
// way. Tap: the arrows spin round, and that animal calls.
// ---------------------------------------------------------------------------
function signposts({ kit, h, S, L }: Ctx) {
  for (const s of L.signs) {
    const c = new Container();
    c.position.set(s.x, h * 0.86);
    const k = S * 0.95;
    const post = new Graphics();
    for (let i = 4; i >= 1; i--) post.ellipse(4, 0, (26 * (3 + i)) / 7, (6 * (3 + i)) / 7).fill({ color: 0x000000, alpha: 0.05 });
    post.rect(-6 * k, -170 * k, 12 * k, 172 * k).fill(0xa47e4b).stroke({ width: 2.5, color: INK });
    c.addChild(post);
    const boards = ([[-1, s.left, -150], [1, s.right, -104]] as const).map(([dir, kind, y]) => {
      const b = new Container();
      b.position.set(0, y * k);
      const g = new Graphics();
      const L0 = -14 * k, L1 = 80 * k, hh = 22 * k;
      g.poly([dir * L0, -hh, dir * L1, -hh, dir * (L1 + 22 * k), 0, dir * L1, hh, dir * L0, hh]).fill(0xfff8e7).stroke({ width: 3, color: INK });
      face(g, kind, dir * 42 * k, 0, 17 * k);
      b.addChild(g);
      c.addChild(b);
      return b;
    });
    kit.under.addChild(c);
    let turn = 0;
    tappable(c, oneAtATime((done) => {
      sfx.whoosh();
      const which = turn++ % 2;
      const b = boards[which];
      VOICE[which ? s.right : s.left]();
      tween(700, (t) => (b.scale.x = Math.cos(t * Math.PI * 2)), () => {
        b.scale.x = 1;
        done();
      });
    }), new Rectangle(-130 * k, -180 * k, 260 * k, 184 * k));
  }
}

// ---------------------------------------------------------------------------
// Big leafy plants at the very front (at the zoo's ends, and a few low ones
// along the bottom). They sway; tap one and it rustles, and a butterfly
// (or in winter a little bird) flutters out.
// ---------------------------------------------------------------------------
function frontPlants({ kit, cleanups, w, h, clock }: Ctx) {
  const x0 = -ZOO.left * w, x1 = (1 + ZOO.right) * w;
  const season = kit.season;
  const colors: [number, number] = season === 'winter' ? [0x6a9a7f, 0x84a98c] : season === 'autumn' ? [0x6a994e, 0xa7c957] : [0x2d6a4f, 0x40916c];
  const plants: [number, number, number][] = [
    [x0 + 0.005 * w, 0.36, 0.6],
    [x0 + 0.06 * w, 0.2, 0.85],
    [x1 - 0.005 * w, 0.36, -0.6],
    [x1 - 0.06 * w, 0.2, -0.85],
    [-0.98 * w, 0.15, 0.2],
    [0.64 * w, 0.14, -0.2],
    [1.5 * w, 0.15, 0.3],
    [2.26 * w, 0.14, -0.3],
  ];
  const all = plants.map(([x, size, lean], i) => {
    const c = new Container();
    c.position.set(x, h + 8);
    const g = new Graphics();
    frontLeaves(g, 0, 0, h * size, colors, lean);
    c.addChild(g);
    kit.over.addChild(c);
    return { c, size, phase: i * 1.3, rustle: 0 };
  });
  everyFrame(() => {
    const t = clock.t * 0.001;
    for (const p of all) p.c.rotation = Math.sin(t * 0.9 + p.phase) * 0.02 + Math.sin(t * 30) * p.rustle * 0.06;
  }, cleanups);
  for (const p of all) {
    tappable(p.c, oneAtATime((done) => {
      sfx.flutter();
      tween(800, (t) => (p.rustle = Math.sin(t * Math.PI)), () => {
        p.rustle = 0;
        done();
      });
      flyOut(kit, p.c.x, h - h * p.size * 0.6, season === 'winter');
    }), new Rectangle(-h * p.size * 0.45, -h * p.size * 0.85, h * p.size * 0.9, h * p.size * 0.85));
  }
}

/** A butterfly (or a little bird) flutters up and away. */
function flyOut(kit: EggKit, x: number, y: number, bird: boolean) {
  const f = new Container();
  const g = new Graphics();
  if (bird) {
    g.ellipse(0, 0, 10, 7).fill(0xe63946).stroke({ width: 2, color: INK });
    g.circle(8, -5, 5).fill(0xe63946).stroke({ width: 2, color: INK });
    g.poly([12, -6, 17, -4, 12, -2]).fill(0xffa94d);
  } else {
    const col = [0xffd166, 0xff8fab, 0x4ea8ff, 0xb07de8][Math.floor(Math.random() * 4)];
    g.ellipse(-8, -6, 9, 11).ellipse(8, -6, 9, 11).fill(col).stroke({ width: 2, color: INK });
    g.ellipse(-6, 6, 6, 7).ellipse(6, 6, 6, 7).fill(col).stroke({ width: 2, color: INK });
    g.roundRect(-2, -10, 4, 22, 2).fill(INK);
  }
  f.addChild(g);
  f.position.set(x, y);
  kit.over.addChild(f);
  const dx = rand(-1, 1) * 200;
  if (bird) sfx.chirp();
  tween(2600, (t) => {
    f.x = x + dx * t + Math.sin(t * 14) * 18;
    f.y = y - t * kit.h * 0.6;
    g.scale.x = bird ? 1 : 0.4 + Math.abs(Math.sin(t * 40)) * 0.6;
    f.alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
  }, () => f.destroy());
}
