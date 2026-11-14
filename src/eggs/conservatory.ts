import { Container, Graphics, Rectangle } from 'pixi.js';
import { glasshouse } from '../conservatory';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, rand, roomSpan, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * The butterfly conservatory's surprises:
 *  - butterflies everywhere, fluttering about and resting on the flowers (tap one: off it loops)
 *  - the hatching case: tap a chrysalis (it wiggles), tap again: a new butterfly comes out!
 *    Hatch all five and a rare golden butterfly appears... catch it for a treasure.
 *  - the fruit stump: tap it and butterflies come for a snack
 *  - the flowers bloom when tapped, and a butterfly comes to land
 *  - the waterfall splashes (a rainbow in the spray), koi swim and jump in the pond
 *  - the misting pipe sprays a fine mist
 *  - a caterpillar munches its way along the banana leaf
 *  - the picture board: tap a picture and that butterfly flies off the board
 *  - tap the sun through the glass for dusk: glowing moths and fireflies
 */

/** Butterfly kinds: wing colour, edge/spot colour. */
const KINDS: [number, number][] = [
  [0xff8c00, 0x1f1f1f], // orange with black edges
  [0x4ea8ff, 0x1d3557], // big blue
  [0xffd166, 0x3a3a3a], // yellow with stripes
  [0xff8fb1, 0xb07de8], // pink and purple
  [0x7bd36b, 0x2d6a4f], // green
  [0xffffff, 0x4ea8ff], // white with blue spots
];
const GOLD: [number, number] = [0xffd60a, 0xffb703];

function drawWings(g: Graphics, [a, b]: [number, number], s = 1) {
  g.clear();
  g.ellipse(-11 * s, -6 * s, 12 * s, 13 * s).ellipse(11 * s, -6 * s, 12 * s, 13 * s).fill(a).stroke({ width: 2, color: INK });
  g.ellipse(-8 * s, 9 * s, 8 * s, 8 * s).ellipse(8 * s, 9 * s, 8 * s, 8 * s).fill(a).stroke({ width: 2, color: INK });
  g.circle(-13 * s, -9 * s, 3.5 * s).circle(13 * s, -9 * s, 3.5 * s).circle(-9 * s, 10 * s, 2.5 * s).circle(9 * s, 10 * s, 2.5 * s).fill(b);
  g.roundRect(-2 * s, -14 * s, 4 * s, 28 * s, 2 * s).fill(INK);
  g.moveTo(-1, -14 * s).lineTo(-6 * s, -22 * s).moveTo(1, -14 * s).lineTo(6 * s, -22 * s).stroke({ width: 1.5, color: INK });
}

interface Fly {
  c: Container;
  wings: Graphics;
  tx: number;
  ty: number;
  speed: number;
  phase: number;
  rest: number;
  hurry: number;
  golden?: boolean;
}

export function conservatory(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const G = glasshouse(w, h);
  const span = roomSpan(kit);
  const air = { x0: span.x + 40, x1: span.x + span.w - 40, y0: h * 0.12, y1: h * 0.66 };
  const flies: Fly[] = [];
  /** Places a butterfly can land (flowers get added below). */
  const perches: { x: number; y: number }[] = [];

  const newTarget = (f: Fly) => {
    if (perches.length && Math.random() < 0.3) {
      const p = perches[Math.floor(Math.random() * perches.length)];
      f.tx = p.x;
      f.ty = p.y - 6;
    } else {
      // mostly flit about nearby, now and then cross the room
      const far = Math.random() < 0.2;
      f.tx = Math.max(air.x0, Math.min(air.x1, f.c.x + (far ? rand(-1, 1) * w : rand(-0.25, 0.25) * w)));
      f.ty = rand(air.y0, air.y1);
    }
  };
  const addFly = (kind: [number, number], x: number, y: number, golden = false) => {
    const c = new Container();
    const wings = new Graphics();
    drawWings(wings, kind, golden ? 1.25 : rand(0.8, 1.1));
    c.addChild(wings);
    c.position.set(x, y);
    kit.over.addChild(c);
    const f: Fly = { c, wings, tx: x, ty: y, speed: rand(0.05, 0.08), phase: rand(0, 6), rest: 0, hurry: 0, golden };
    newTarget(f);
    flies.push(f);
    tappable(c, () => {
      sfx.flutter();
      f.rest = 0;
      f.hurry = 1500;
      f.tx = Math.max(air.x0, Math.min(air.x1, c.x + rand(-0.4, 0.4) * w));
      f.ty = rand(air.y0, air.y1 * 0.7);
      if (f.golden) caughtGold(f);
    }, new Rectangle(-26, -26, 52, 52));
    // too many? the oldest ordinary one flies up out of the roof vent
    if (flies.length > 24) {
      const old = flies.find((o) => !o.golden && o !== f);
      if (old) {
        flies.splice(flies.indexOf(old), 1);
        const from = { x: old.c.x, y: old.c.y };
        tween(1500, (t) => {
          old.c.y = from.y - t * (from.y + 60);
          old.wings.scale.x = 0.3 + 0.7 * Math.abs(Math.cos(t * 30));
        }, () => old.c.destroy({ children: true }));
      }
    }
    return f;
  };
  for (let i = 0; i < 14; i++) addFly(KINDS[i % KINDS.length], rand(air.x0, air.x1), rand(air.y0, air.y1));

  let dusk = 0; // 0 = day .. 1 = evening (they settle down)
  everyFrame((dt) => {
    for (const f of flies) {
      f.phase += dt * (f.rest > 0 ? 0.004 : 0.03 + (f.hurry > 0 ? 0.02 : 0));
      if (f.rest > 0) {
        f.rest -= dt;
        f.wings.scale.x = 0.55 + 0.45 * Math.abs(Math.cos(f.phase)); // slowly opening and closing
        if (f.rest <= 0) newTarget(f);
        continue;
      }
      if (f.hurry > 0) f.hurry -= dt;
      const dx = f.tx - f.c.x, dy = f.ty - f.c.y;
      const d = Math.hypot(dx, dy);
      const v = f.speed * (f.hurry > 0 ? 3 : 1) * (1 - dusk * 0.6) * dt;
      if (d < 8) {
        const onPerch = perches.some((p) => Math.abs(p.x - f.tx) < 2 && Math.abs(p.y - 6 - f.ty) < 2);
        if (onPerch || f.ty > air.y1 - 4) f.rest = rand(2000, 5000) * (1 + dusk * 2);
        else if (Math.random() < 0.15) f.rest = rand(800, 1600);
        else newTarget(f);
        f.c.rotation = 0;
        continue;
      }
      f.c.x += (dx / d) * Math.min(v, d);
      f.c.y += (dy / d) * Math.min(v, d) + Math.sin(f.phase * 0.5) * 0.6;
      f.c.rotation = Math.max(-0.4, Math.min(0.4, dx / d * 0.35));
      f.wings.scale.x = 0.2 + 0.8 * Math.abs(Math.cos(f.phase));
      if (f.golden && Math.random() < dt * 0.01) {
        const s = new Graphics().star(0, 0, 4, 5, 2).fill(0xfff3b0);
        tumble(kit, s, f.c.x, f.c.y + 10, f.c.y + 60, { vy: 0.02, vx: rand(-0.03, 0.03), float: true });
      }
    }
  }, cleanups);

  /** Send the n nearest butterflies to a spot for a while. */
  const callOver = (x: number, y: number, n: number, spread = 30) => {
    const near = [...flies].filter((f) => !f.golden).sort((a, b) => Math.hypot(a.c.x - x, a.c.y - y) - Math.hypot(b.c.x - x, b.c.y - y)).slice(0, n);
    near.forEach((f, i) => {
      f.rest = 0;
      f.tx = x + (i - (n - 1) / 2) * spread;
      f.ty = y - Math.abs(i - (n - 1) / 2) * 6;
      f.hurry = 1200;
    });
  };

  // --- the flowers on the bushes: tap and they bloom, and a butterfly comes ---
  const PETALS = [0xff4d6d, 0xffd166, 0xff8fb1, 0xff8c00, 0xb07de8, 0xffffff];
  G.bushes.forEach((b, i) => {
    for (const [j, [dx, dy]] of [[-0.55, -0.35], [0.1, -0.85], [0.6, -0.3]].entries()) {
      const fx = b.x + b.r * dx, fy = b.y + b.r * dy;
      const flower = new Container();
      const pg = new Graphics();
      const col = PETALS[(i * 2 + j) % PETALS.length];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        pg.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 9, 7).fill(col).stroke({ width: 1.5, color: INK });
      }
      pg.circle(0, 0, 5).fill(0xffd60a).stroke({ width: 1.5, color: INK });
      flower.addChild(pg);
      flower.position.set(fx, fy);
      kit.under.addChild(flower);
      perches.push({ x: fx, y: fy });
      tappable(flower, oneAtATime((done) => {
        sfx.pop(1.5);
        tween(700, (t) => flower.scale.set(1 + Math.sin(t * Math.PI) * 0.6), () => {
          flower.scale.set(1);
          done();
        });
        for (let k = 0; k < 8; k++) tumble(kit, new Graphics().circle(0, 0, 2.5).fill(0xffe066), fx, fy, fy + 70, { vy: rand(-0.25, -0.05), vx: rand(-0.12, 0.12), float: true });
        callOver(fx, fy, 1);
      }), new Rectangle(-22, -22, 44, 44));
    }
  });

  // --- the fruit stump: snack time! ---
  const st = G.stump;
  const plate = new Graphics();
  plate.ellipse(st.x, st.top - 6, st.r * 0.85, st.r * 0.25).fill(0xffffff).stroke({ width: 2.5, color: INK });
  for (let k = 0; k < 4; k++) {
    const ox = st.x - st.r * 0.5 + k * st.r * 0.33;
    plate.moveTo(ox - 9, st.top - 8).arc(ox, st.top - 8, 9, Math.PI, 0).lineTo(ox - 9, st.top - 8).fill(k % 2 ? 0xff8c00 : 0xff4d6d).stroke({ width: 1.5, color: INK });
  }
  kit.under.addChild(plate);
  hotspot(kit, new Rectangle(st.x - st.r - 10, st.top - 40, st.r * 2 + 20, 80), oneAtATime((done) => {
    sfx.chirp();
    callOver(st.x, st.top - 20, 4, 22);
    later(1200, done, cleanups);
  }));

  // --- the hatching case: five chrysalises on a twig ---
  const hc = G.hatchery;
  let hatched = 0;
  for (let i = 0; i < 5; i++) {
    const cx = hc.x + hc.w * (0.16 + i * 0.17), cy = hc.y + hc.h * 0.16 + 4;
    const pod = new Container();
    const pg = new Graphics();
    const drawPod = (open: boolean) => {
      pg.clear();
      pg.moveTo(0, 0).lineTo(0, 8).stroke({ width: 2, color: INK });
      if (open) {
        pg.moveTo(-8, 10).quadraticCurveTo(-12, 30, -2, 42).lineTo(0, 30).lineTo(2, 42).quadraticCurveTo(12, 30, 8, 10).closePath().fill(0xd4c5a9).stroke({ width: 2, color: INK });
      } else {
        pg.moveTo(0, 8).quadraticCurveTo(-14, 22, 0, 46).quadraticCurveTo(14, 22, 0, 8).fill(0x95d5b2).stroke({ width: 2, color: INK });
        pg.circle(-4, 18, 1.8).circle(3, 16, 1.8).circle(0, 24, 1.8).fill(0xffd166);
      }
    };
    drawPod(false);
    pod.addChild(pg);
    pod.position.set(cx, cy);
    kit.under.addChild(pod);
    let state: 'whole' | 'ready' | 'empty' = 'whole';
    tappable(pod, () => {
      if (state === 'empty') {
        sfx.click();
        return;
      }
      if (state === 'whole') {
        // it wiggles... something's in there
        state = 'ready';
        sfx.squeak(1.8);
        tween(700, (t) => (pod.rotation = Math.sin(t * Math.PI * 8) * 0.25 * (1 - t)));
        return;
      }
      // it opens, and out comes a butterfly: small and crumpled, then wings open
      state = 'empty';
      drawPod(true);
      sfx.pop(1.4);
      const kind = KINDS[i % KINDS.length];
      const baby = new Graphics();
      drawWings(baby, kind, 1);
      baby.position.set(cx, cy + 30);
      baby.scale.set(0.2, 0.05);
      kit.over.addChild(baby);
      tween(1400, (t) => {
        baby.scale.set(0.2 + 0.8 * ease.outBack(Math.min(1, t * 1.2)), Math.min(1, 0.05 + t * 1.5));
        baby.y = cy + 30 + t * 10;
      }, () => {
        baby.destroy();
        sfx.flutter();
        burst(kit.sparkles, cx, cy + 40, 8, 50);
        const f = addFly(kind, cx, cy + 40);
        f.tx = hc.x + hc.w + rand(0.05, 0.3) * w;
        f.ty = rand(air.y0, air.y1 * 0.7);
        f.hurry = 1200;
        if (++hatched === 5) later(2500, goldenAppears, cleanups);
      });
      // a new chrysalis grows back after a while
      later(30000, () => {
        state = 'whole';
        drawPod(false);
        pod.scale.set(0.2);
        tween(600, (t) => pod.scale.set(0.2 + 0.8 * ease.outBack(t)));
      }, cleanups);
    }, new Rectangle(-18, -6, 36, 58));
  }

  // --- all five hatched: a rare golden butterfly! Catch it (tap it) for a treasure ---
  let gold: Fly | null = null;
  const goldenAppears = () => {
    if (gold) return;
    sfx.twinkle();
    gold = addFly(GOLD, hc.x + hc.w / 2, hc.y - 20, true);
    gold.speed = 0.06;
    burst(kit.sparkles, gold.c.x, gold.c.y, 16, 90);
  };
  let caught = false;
  const caughtGold = (f: Fly) => {
    if (caught) return;
    caught = true;
    sfx.tune([784, 988, 1175, 1568, 1319, 1568], 0.12);
    burst(kit.sparkles, f.c.x, f.c.y, 18, 110);
    kit.secrets?.find('golden-butterfly', 'gem', { x: f.c.x, y: f.c.y + 30 });
  };

  // --- the waterfall: always pouring; tap for a big splash and a rainbow ---
  const fl = G.falls;
  const water = new Graphics();
  water.eventMode = 'none';
  const bow = new Graphics();
  bow.eventMode = 'none';
  kit.under.addChild(water, bow);
  let time = 0, splash = 0;
  const p = G.pond;
  // koi in the pond
  const koi: { g: Graphics; a: number; r: number; v: number }[] = [];
  for (const [i, col] of [0xff8c00, 0xffffff, 0xe5383b].entries()) {
    const g = new Graphics();
    g.ellipse(0, 0, 14, 6).fill(col).stroke({ width: 1.5, color: INK });
    g.poly([-12, 0, -22, -6, -22, 6]).fill(col).stroke({ width: 1.5, color: INK });
    if (col === 0xffffff) g.circle(4, -1, 3).fill(0xff8c00);
    kit.under.addChild(g);
    koi.push({ g, a: i * 2, r: 0.4 + i * 0.18, v: 0.0006 + i * 0.0002 });
  }
  everyFrame((dt) => {
    time += dt;
    splash = Math.max(0, splash - dt / 2500);
    water.clear();
    const x0 = fl.x0 + 0.03 * w, x1 = fl.x1 - 0.03 * w;
    for (let x = x0 + 6; x < x1 - 4; x += 12) {
      for (let s = 0; s < 3; s++) {
        const len = fl.bottom - fl.top;
        const off = (((time * 0.2 + s * len / 3 + x * 5) % len) + len) % len;
        water.moveTo(x, fl.top + off).lineTo(x, Math.min(fl.bottom - 6, fl.top + off + 22));
      }
    }
    water.stroke({ width: 3, color: 0xffffff, alpha: 0.85 });
    for (let k = 0; k < 6; k++) water.circle(x0 + ((x1 - x0) * (k + 0.5)) / 6, fl.bottom - 4 - Math.abs(Math.sin(time * 0.003 + k)) * 10, 14 + splash * 16).fill({ color: 0xffffff, alpha: 0.5 + splash * 0.3 });
    bow.clear();
    if (splash > 0.01) {
      const cx = (fl.x0 + fl.x1) / 2, cy = fl.bottom;
      [0xff4d6d, 0xffa94d, 0xffd60a, 0x7bd36b, 0x4ea8ff, 0xb07de8].forEach((c, i) => bow.moveTo(cx - (90 - i * 7), cy).arc(cx, cy, 90 - i * 7, Math.PI, 0).stroke({ width: 7, color: c, alpha: 0.7 * splash }));
    }
    for (const k of koi) {
      k.a += k.v * dt;
      const x = p.x + Math.cos(k.a) * p.rx * k.r, y = p.y + Math.sin(k.a) * p.ry * k.r * 0.9;
      k.g.position.set(x, y);
      k.g.scale.x = Math.sin(k.a) > 0 ? -1 : 1;
      k.g.rotation = Math.sin(time * 0.01 + k.r) * 0.1;
    }
  }, cleanups);
  hotspot(kit, new Rectangle(fl.x0, fl.top, fl.x1 - fl.x0, fl.bottom - fl.top), () => {
    sfx.water(1.6);
    splash = 1;
  });
  hotspot(kit, new Rectangle(p.x - p.rx, p.y - p.ry - 10, p.rx * 2, p.ry * 2 + 20), oneAtATime((done) => {
    // a koi jumps
    const k = koi[Math.floor(Math.random() * koi.length)];
    const sx = k.g.x, sy = k.g.y;
    const v = k.v;
    k.v = 0;
    sfx.blub();
    tween(900, (t) => {
      k.g.y = sy - Math.sin(t * Math.PI) * h * 0.12;
      k.g.x = sx + t * 40 * k.g.scale.x * -1;
      k.g.rotation = -1.2 + t * 2.4;
    }, () => {
      sfx.blub();
      for (let i = 0; i < 8; i++) tumble(kit, new Graphics().circle(0, 0, rand(2, 4)).fill(0xbfe8ff), k.g.x, k.g.y, k.g.y + 4, { vy: rand(-0.5, -0.2), vx: rand(-0.2, 0.2) });
      k.v = v;
      done();
    });
  }));

  // --- the misting pipe across the roof: psssht, a fine mist ---
  const ms = G.mister;
  const pipe = new Graphics();
  pipe.rect(ms.x0, ms.y - 5, ms.x1 - ms.x0, 10).fill(0xadb5bd).stroke({ width: 2, color: INK });
  for (let x = ms.x0 + 40; x < ms.x1; x += 90) pipe.rect(x - 4, ms.y + 4, 8, 10).fill(0x6c757d).stroke({ width: 1.5, color: INK });
  kit.under.addChild(pipe);
  hotspot(kit, new Rectangle(ms.x0, ms.y - 30, ms.x1 - ms.x0, 60), oneAtATime((done) => {
    sfx.rain(2);
    for (let x = ms.x0 + 40; x < ms.x1; x += 90) {
      for (let i = 0; i < 6; i++) {
        later(i * 120, () => {
          const d = new Graphics().circle(0, 0, rand(5, 10)).fill({ color: 0xffffff, alpha: 0.6 });
          tumble(kit, d, x, ms.y + 14, h * 0.6, { vy: 0.02, vx: rand(-0.04, 0.04), float: true, spin: 0 });
        }, cleanups);
      }
    }
    later(2200, done, cleanups);
  }));

  // --- a caterpillar on the banana plant's big leaf: munch munch, along the leaf ---
  const bn = G.banana;
  const cat = new Container();
  const cg = new Graphics();
  for (let i = 0; i < 5; i++) cg.circle(-i * 9, Math.sin(i) * 2, 7).fill(i % 2 ? 0x95d5b2 : 0x52b788).stroke({ width: 1.5, color: INK });
  cg.circle(4, -2, 8).fill(0x52b788).stroke({ width: 1.5, color: INK });
  cg.circle(7, -4, 2).fill(INK);
  cg.moveTo(4, -9).lineTo(2, -16).moveTo(7, -9).lineTo(10, -15).stroke({ width: 1.5, color: INK });
  cat.addChild(cg);
  // along the leaf pointing up and right (bigLeaf at angle -0.5)
  const leafAt = (t: number) => ({ x: bn.x + Math.cos(-0.5) * h * 0.24 * t, y: bn.top + 6 + Math.sin(-0.5) * h * 0.24 * t - 4 });
  const home = leafAt(0.3);
  cat.position.set(home.x, home.y);
  cat.rotation = -0.5;
  kit.under.addChild(cat);
  tappable(cat, oneAtATime((done) => {
    sfx.giggle(1.6);
    tween(2600, (t) => {
      const q = leafAt(0.3 + Math.sin(t * Math.PI) * 0.55);
      cat.position.set(q.x, q.y);
      cg.scale.x = 1 + Math.sin(t * Math.PI * 16) * 0.12; // inch... worm
      if (Math.random() < 0.02) sfx.pop(2);
    }, () => {
      cg.scale.x = 1;
      done();
    });
  }), new Rectangle(-50, -30, 70, 50));

  // --- the picture board: four butterflies; tap one and it flies off the board ---
  const bd = G.board;
  KINDS.slice(0, 4).forEach((kind, i) => {
    const pic = new Graphics();
    drawWings(pic, kind, 0.9);
    const x = bd.x + bd.w * (i % 2 ? 0.72 : 0.28), y = bd.y + bd.h * (i < 2 ? 0.28 : 0.72);
    pic.position.set(x, y);
    kit.under.addChild(pic);
    tappable(pic, oneAtATime((done) => {
      sfx.flutter();
      pic.visible = false;
      const f = addFly(kind, x, y);
      f.hurry = 1500;
      f.tx = x - rand(0.2, 0.5) * w;
      f.ty = rand(air.y0, air.y1 * 0.6);
      // a new picture on the board after a moment
      later(4000, () => {
        pic.visible = true;
        pic.scale.set(0.1);
        tween(400, (t) => pic.scale.set(0.1 + 0.9 * ease.outBack(t)), done);
      }, cleanups);
    }), new Rectangle(-26, -26, 52, 52));
  });

  // --- the sun through the glass: tap for evening (glowing moths, fireflies); tap again for day ---
  const night = new Graphics();
  night.eventMode = 'none';
  kit.over.addChildAt(night, 0);
  const lights = new Graphics();
  lights.eventMode = 'none';
  kit.over.addChild(lights);
  const bugs = Array.from({ length: 18 }, () => ({ x: rand(span.x, span.x + span.w), y: rand(h * 0.2, h * 0.8), a: rand(0, 6) }));
  let evening = false;
  everyFrame((dt) => {
    const want = evening ? 1 : 0;
    if (Math.abs(dusk - want) < 0.001 && !evening) {
      if (night.visible) {
        night.clear();
        lights.clear();
        night.visible = false;
      }
      return;
    }
    night.visible = true;
    dusk += (want - dusk) * Math.min(1, dt / 600);
    kit.events?.emit('dark', 'dusk', dusk); // glow sticks glow
    night.clear().rect(span.x, 0, span.w, h).fill({ color: 0x1b1f4b, alpha: 0.5 * dusk });
    lights.clear();
    for (const b of bugs) {
      b.a += dt * 0.002;
      b.x += Math.cos(b.a) * 0.3;
      b.y += Math.sin(b.a * 1.3) * 0.2;
      const on = 0.5 + 0.5 * Math.sin(b.a * 3);
      glow(lights, b.x, b.y, 14, 0xfff3b0, 2 * dusk * on);
      lights.circle(b.x, b.y, 2.5).fill({ color: 0xfff3b0, alpha: dusk * on });
    }
  }, cleanups);
  hotspot(kit, new Rectangle(G.sun.x - G.sun.r * 1.6, G.sun.y - G.sun.r * 1.6, G.sun.r * 3.2, G.sun.r * 3.2), () => {
    evening = !evening;
    if (evening) sfx.coo();
    else sfx.chirp();
  });
}
