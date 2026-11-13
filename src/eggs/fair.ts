import { Container, Graphics, Rectangle } from 'pixi.js';
import { FAIR } from '../fair';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { cloudRain, everyFrame, frontPiece, glow, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/** A tub of flowers at the very front (tap: it wobbles and a petal or two flies off). */
function flowerTub(kit: EggKit, cleanups: Cleanups, x: number, colour: number) {
  const S = kit.h / 768;
  const petals = [0xff8fb1, 0xffd166, 0xffffff, 0xb07de8];
  frontPiece(kit, cleanups, x, kit.h + 6, (g) => {
    g.scale.set(S * 1.2);
    for (const [fx, fy, r] of [[-40, -120, 1], [0, -150, 1.2], [40, -118, 1], [-20, -100, 0.8], [24, -96, 0.8]]) {
      g.moveTo(fx * 0.4, -60).lineTo(fx, fy).stroke({ width: 4, color: 0x2d6a4f });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.circle(fx + Math.cos(a) * 11 * r, fy + Math.sin(a) * 11 * r, 9 * r).fill(petals[(k + Math.abs(fx)) % petals.length]).stroke({ width: 2, color: INK });
      }
      g.circle(fx, fy, 7 * r).fill(0xffb703).stroke({ width: 2, color: INK });
    }
    g.ellipse(0, -66, 70, 16).fill(0x40916c).stroke({ width: 3, color: INK });
    g.poly([-66, -66, 66, -66, 52, 0, -52, 0]).fill(colour).stroke({ width: 4, color: INK });
    g.rect(-70, -74, 140, 14).fill(0xffffff).stroke({ width: 3, color: INK });
  }, new Rectangle(-80 * S * 1.2, -180 * S * 1.2, 160 * S * 1.2, 180 * S * 1.2), () => sfx.pling());
}

const COLOURS = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];

/** The fairground's rides and stalls (see fair.ts for where things are). */
export function fair(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const gy = h * FAIR.ground;
  flowerTub(kit, cleanups, -FAIR.left * w + 0.06 * w, 0xe5383b);
  flowerTub(kit, cleanups, (1 + FAIR.right) * w - 0.06 * w, 0x4ea8ff);

  // --- the Ferris wheel: always turning; tap it for a fast whizz with flashing lights ---
  const fx = 0.5 * w, fy = h * 0.37, R = h * 0.27;
  const wheel = new Container();
  wheel.position.set(fx, fy);
  const rim = new Graphics();
  rim.circle(0, 0, R).stroke({ width: 10, color: INK });
  rim.circle(0, 0, R - 6).stroke({ width: 5, color: 0xff8fb1 });
  rim.circle(0, 0, R * 0.55).stroke({ width: 4, color: 0xffd166 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rim.moveTo(0, 0).lineTo(Math.cos(a) * R, Math.sin(a) * R);
  }
  rim.stroke({ width: 4, color: INK });
  const lights = new Graphics();
  const turning = new Container(); // the rim and its lights turn together
  turning.addChild(rim, lights);
  const hub = new Graphics().circle(0, 0, 16).fill(0xffd166).stroke({ width: 4, color: INK });
  const cabins: Graphics[] = [];
  for (let i = 0; i < 8; i++) {
    const c = new Graphics();
    c.moveTo(0, -18).lineTo(0, -6).stroke({ width: 3, color: INK });
    c.roundRect(-20, -8, 40, 30, 8).fill(COLOURS[i % COLOURS.length]).stroke({ width: 3, color: INK });
    c.rect(-14, -2, 28, 10).fill(0xbfe8ff).stroke({ width: 2, color: INK });
    cabins.push(c);
  }
  wheel.addChild(turning, ...cabins, hub);
  kit.under.addChild(wheel);
  let angle = 0, spin = 0.00022, flash = 0, time = 0;
  everyFrame((dt) => {
    time += dt;
    angle += spin * dt;
    turning.rotation = angle;
    cabins.forEach((c, i) => {
      const a = angle + (i / 8) * Math.PI * 2;
      c.position.set(Math.cos(a) * R, Math.sin(a) * R + 16);
      c.rotation = Math.sin(a * 2 + time * 0.004) * 0.05 * (spin / 0.00022) ** 0.5; // a little swing
    });
    lights.clear();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const on = flash > 0 ? (Math.floor(time / 120) + i) % 2 === 0 : true;
      lights.circle(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6), 5).fill(on ? COLOURS[i % COLOURS.length] : 0xffffff);
    }
  }, cleanups);
  tappable(wheel, oneAtATime((done) => {
    sfx.tune([523, 659, 784, 1047, 784, 659], 0.16);
    kit.events?.emit('wheel');
    flash = 1;
    tween(3000, (t) => (spin = 0.00022 + Math.sin(t * Math.PI) * 0.0035), () => {
      spin = 0.00022;
      flash = 0;
      done();
    });
  }), new Rectangle(-R - 20, -R - 20, (R + 20) * 2, (R + 20) * 2));

  // --- the ticket booth: a ticket pops out ---
  const tb = -0.47 * w;
  hotspot(kit, new Rectangle(tb - 60, gy - h * 0.36, 120, h * 0.36), oneAtATime((done) => {
    sfx.ding();
    const t = new Graphics().roundRect(-22, -12, 44, 24, 4).fill(0xffd166).stroke({ width: 2, color: INK });
    t.circle(-22, 0, 5).circle(22, 0, 5).fill(0xffffff);
    t.star(0, 0, 5, 7, 3).fill(0xe5383b);
    tumble(kit, t, tb, gy - h * 0.15, gy + h * 0.15, { vy: -0.5, vx: rand(0.1, 0.25), float: true });
    later(900, done, cleanups);
  }));

  // --- the candy floss stall: a big pink cloud of candy floss spins up ---
  const cf = { x: -0.33 * w + 0.075 * w, y: gy - h * 0.32 * 0.3 - 6 };
  const floss = new Graphics();
  kit.under.addChild(floss);
  hotspot(kit, new Rectangle(-0.33 * w - 10, gy - h * 0.32, 0.15 * w + 20, h * 0.32), oneAtATime((done) => {
    sfx.whirr();
    tween(1400, (t) => {
      const s = ease.outBack(t);
      floss.clear().moveTo(cf.x, cf.y).lineTo(cf.x, cf.y - 30).stroke({ width: 4, color: 0xfff3e6 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + t * 6;
        floss.circle(cf.x + Math.cos(a) * 16 * s, cf.y - 52 * s + Math.sin(a) * 12 * s, 16 * s).fill(i % 2 ? 0xff8fb1 : 0xffb3c6);
      }
    }, () => {
      later(700, () => {
        sfx.pop(1.2);
        burst(kit.sparkles, cf.x, cf.y - 52, 10, 60);
        floss.clear();
        done();
      }, cleanups);
    });
  }));

  // --- the balloon seller: one balloon floats away ---
  const bx = -0.1 * w, by = gy - h * 0.2;
  const bunch = new Container();
  bunch.position.set(bx, by);
  const bunchArt = new Graphics();
  const spots: [number, number][] = [[-24, -60], [0, -78], [24, -60], [-12, -100], [14, -102]];
  for (const [i, [px, py]] of spots.entries()) bunchArt.moveTo(0, 0).lineTo(px, py + 20).stroke({ width: 2, color: INK });
  for (const [i, [px, py]] of spots.entries()) bunchArt.ellipse(px, py, 15, 20).fill(COLOURS[i]).stroke({ width: 3, color: INK });
  bunch.addChild(bunchArt);
  kit.under.addChild(bunch);
  let bt = 0;
  everyFrame((dt) => (bunch.rotation = Math.sin((bt += dt) * 0.0015) * 0.06), cleanups);
  tappable(bunch, oneAtATime((done) => {
    sfx.pop(1.5);
    const b = new Graphics();
    b.moveTo(0, 20).quadraticCurveTo(8, 40, 0, 60).stroke({ width: 2, color: INK });
    b.ellipse(0, 0, 15, 20).fill(COLOURS[Math.floor(rand(0, COLOURS.length))]).stroke({ width: 3, color: INK });
    b.position.set(bx, by - 80);
    kit.over.addChild(b);
    const drift = rand(-100, 100);
    tween(4000, (t) => {
      b.x = bx + drift * t + Math.sin(t * 9) * 14;
      b.y = by - 80 - t * h * 0.8;
    }, () => b.destroy());
    later(600, done, cleanups);
  }), new Rectangle(-50, -130, 100, 140));

  // --- the carousel: horses go round (and up and down); tap for a fast turn with music ---
  const cx = 1.22 * w, cr = 0.32 * w / 2 - 18;
  const horses = new Graphics();
  kit.under.addChild(horses);
  let ca = 0, cspin = 0.0004;
  const horseCols = [0xffffff, 0xffd6a5, 0xcaffbf, 0xa0c4ff, 0xffadad, 0xbdb2ff];
  everyFrame((dt) => {
    ca += cspin * dt;
    horses.clear();
    // back ones first, then the front ones
    const list = horseCols.map((col, i) => {
      const a = ca + (i / horseCols.length) * Math.PI * 2;
      return { col, x: cx + Math.cos(a) * cr, depth: Math.sin(a), bob: Math.sin(a * 3 + i) };
    }).sort((p, q) => p.depth - q.depth);
    for (const p of list) {
      const s = 0.75 + 0.25 * (p.depth + 1) / 2;
      const base = gy - h * 0.04 - h * 0.07 - p.bob * h * 0.025;
      horses.moveTo(p.x, h * 0.335).lineTo(p.x, gy - 8).stroke({ width: 4 * s, color: 0xffd166 });
      // a little horse
      horses.ellipse(p.x, base, 26 * s, 13 * s).fill(p.col).stroke({ width: 3, color: INK });
      horses.ellipse(p.x + 26 * s, base - 16 * s, 9 * s, 14 * s).fill(p.col).stroke({ width: 3, color: INK });
      horses.moveTo(p.x - 14 * s, base + 10 * s).lineTo(p.x - 18 * s, base + 26 * s).moveTo(p.x + 14 * s, base + 10 * s).lineTo(p.x + 18 * s, base + 26 * s).stroke({ width: 4 * s, color: INK });
      horses.rect(p.x - 10 * s, base - 14 * s, 20 * s, 6 * s).fill(0xe5383b);
      horses.circle(p.x + 30 * s, base - 20 * s, 2.5 * s).fill(INK);
    }
  }, cleanups);
  hotspot(kit, new Rectangle(cx - cr - 30, h * 0.17, (cr + 30) * 2, gy - h * 0.17), oneAtATime((done) => {
    sfx.tune([784, 659, 784, 880, 784, 659, 587, 659], 0.2);
    tween(3200, (t) => (cspin = 0.0004 + Math.sin(t * Math.PI) * 0.0028), () => {
      cspin = 0.0004;
      done();
    });
  }));

  // --- hook-a-duck: ducks bob round the water; tap one to win a prize ---
  const sx = 1.47 * w, sw = 0.17 * w, wy = gy - h * 0.34 * 0.3 - 18;
  const water = new Graphics().roundRect(sx - 4, wy - 4, sw + 8, 22, 8).fill(0x6ec6ff).stroke({ width: 3, color: INK });
  kit.under.addChild(water);
  const ducks: { g: Graphics; x: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Graphics();
    d.ellipse(0, 0, 13, 9).fill(0xffd60a).stroke({ width: 2, color: INK });
    d.circle(8, -10, 7).fill(0xffd60a).stroke({ width: 2, color: INK });
    d.circle(10, -12, 1.8).fill(INK);
    d.poly([14, -10, 21, -8, 14, -6]).fill(0xff8c00);
    kit.under.addChild(d);
    ducks.push({ g: d, x: (i / 6) * sw });
  }
  let dt0 = 0;
  everyFrame((dt) => {
    dt0 += dt;
    for (const [i, d] of ducks.entries()) {
      d.x = (d.x + dt * 0.03) % sw;
      d.g.position.set(sx + d.x, wy + Math.sin(dt0 * 0.006 + i) * 2);
    }
  }, cleanups);
  hotspot(kit, new Rectangle(sx - 10, wy - 40, sw + 20, 70), oneAtATime((done) => {
    // the duck nearest the middle pops up with a star
    const mid = sw / 2;
    const d = ducks.reduce((a, b) => (Math.abs(b.x - mid) < Math.abs(a.x - mid) ? b : a));
    sfx.quack();
    const x0 = d.g.x, y0 = d.g.y;
    tween(600, (t) => (d.g.y = y0 - Math.sin(t * Math.PI) * 40), () => {
      sfx.ding();
      const prize = new Graphics().star(0, 0, 5, 16, 8).fill(0xffd166).stroke({ width: 2, color: INK });
      tumble(kit, prize, x0, y0 - 30, gy + h * 0.12, { vy: -0.6, vx: rand(-0.15, 0.15) });
      kit.events?.emit('duck-prize', x0, y0);
      burst(kit.sparkles, x0, y0 - 30, 8, 50);
      done();
    });
  }));

  // --- the big top: a fanfare, and confetti from the top ---
  const tx = 1.74 * w;
  const flag = new Graphics().poly([0, 0, 30, 8, 0, 16]).fill(0xffd166).stroke({ width: 2, color: INK });
  flag.position.set(tx, gy - h * 0.42);
  kit.under.addChild(flag);
  let ft = 0;
  everyFrame((dt) => (flag.skew.y = Math.sin((ft += dt) * 0.006) * 0.25), cleanups);
  hotspot(kit, new Rectangle(tx - 0.11 * w, gy - h * 0.44, 0.22 * w, h * 0.44), oneAtATime((done) => {
    sfx.tune([523, 523, 659, 784, 1047], 0.13);
    for (let i = 0; i < 24; i++) {
      const c = new Graphics().rect(-4, -6, 8, 12).fill(COLOURS[i % COLOURS.length]);
      tumble(kit, c, tx, gy - h * 0.38, gy + h * 0.1, { vx: rand(-0.3, 0.3), vy: rand(-0.6, -0.2), float: true, spin: rand(-10, 10) });
    }
    later(1500, done, cleanups);
  }));

  // the drifting clouds rain (or snow) when tapped
  cloudRain(kit, cleanups, () => gy + h * 0.2);
  void glow;
}
