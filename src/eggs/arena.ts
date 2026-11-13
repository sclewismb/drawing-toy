import { Container, Graphics, Rectangle } from 'pixi.js';
import { arenaLayout } from '../arena';
import { burst } from '../fx';
import { sfx } from '../sound';
import { tween } from '../tween';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Surprises at the hockey arena:
 *  - the crowd: tap the stands and they do a wave (and cheer)
 *  - the scoreboard: lights, hearts and stars (no numbers); tap for fireworks
 *  - the ice machine: drives along now and then, leaving shiny ice; tap it to honk
 *  - the polar bear mascot: tap for a dance
 *  - the organ: da-da-da-DA-da-DAAA... charge!
 *  - the nets: get the puck (or a ball) in one: GOAL! Three goals win a trophy.
 */
const SKINS = [0xffe3d3, 0xf6cfb3, 0xe8b48a, 0xc68b59, 0x8d5524, 0x5c3a21];
const SHIRTS = [0xe5383b, 0x4dabf7, 0xffd43b, 0x20c997, 0x9775fa, 0xff8fab, 0xffffff];

export function arena(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = arenaLayout(w, h);
  const x0 = kit.x0 ?? 0, x1 = kit.x1 ?? w;

  // --- the crowd, in rows, bobbing a little ---
  const fans: { c: Container; base: number; x: number }[] = [];
  const st = L.stands;
  for (let row = 0; row < 4; row++) {
    const y = st.y0 + ((st.y1 - st.y0) * (row + 1)) / 4 - 10;
    for (let x = x0 + 30 + (row % 2) * 24; x < x1 - 20; x += 48) {
      if (Math.abs(x - L.organ.x) < 70 && row >= 1 && row <= 2) continue; // (the organ booth)
      const c = new Container();
      const g = new Graphics();
      const shirt = SHIRTS[Math.floor(rand(0, SHIRTS.length))];
      g.roundRect(-14, -16, 28, 18, 8).fill(shirt).stroke({ width: 2, color: INK });
      g.circle(0, -26, 11).fill(SKINS[Math.floor(rand(0, SKINS.length))]).stroke({ width: 2, color: INK });
      if (Math.random() < 0.35) g.rect(-11, -40, 22, 6).fill(shirt).stroke({ width: 1.5, color: INK }); // a woolly hat
      g.circle(-4, -27, 1.5).circle(4, -27, 1.5).fill(INK);
      c.addChild(g);
      c.position.set(x, y);
      kit.under.addChild(c);
      fans.push({ c, base: y, x });
    }
  }
  let time = 0, waveAt = -1e9;
  everyFrame((dt) => {
    time += dt;
    const front = x0 + ((time - waveAt) / 1600) * (x1 - x0); // the wave rolls across the stands
    for (const f of fans) {
      const d = Math.abs(f.x - front);
      const up = d < 160 ? Math.cos((d / 160) * (Math.PI / 2)) * 22 : 0;
      f.c.y = f.base - up - Math.max(0, Math.sin(time * 0.004 + f.x)) * 1.5;
      f.c.scale.y = 1 + up / 60;
    }
  }, cleanups);
  const cheer = () => {
    sfx.yippee(1.1);
    later(200, () => sfx.yippee(1.3), cleanups);
    later(400, () => sfx.giggle(1.2), cleanups);
  };
  const doWave = () => {
    waveAt = time;
    cheer();
  };
  hotspot(kit, new Rectangle(x0, st.y0, x1 - x0, st.y1 - st.y0), oneAtATime((done) => {
    doWave();
    later(1700, done, cleanups);
  }));

  // --- the scoreboard: twinkling pictures ---
  const sb = L.scoreboard;
  const board = new Graphics();
  board.eventMode = 'none';
  kit.under.addChild(board);
  let fireworks = 0;
  everyFrame(() => {
    board.clear();
    const cols = [0xe5383b, 0xffd43b, 0x4dabf7, 0x20c997, 0xff8fab];
    for (let i = 0; i < 12; i++) {
      const x = sb.x + 14 + (i % 6) * ((sb.w - 28) / 5), y = sb.y + (i < 6 ? sb.h * 0.28 : sb.h * 0.72);
      const on = (Math.floor(time / 250) + i) % 3 !== 0 || fireworks > 0;
      board.circle(x, y, 5).fill({ color: cols[(i + Math.floor(time / 500)) % cols.length], alpha: on ? 1 : 0.25 });
    }
    // a heart in the middle that beats
    const k = 1 + Math.sin(time * 0.008) * 0.12 + fireworks * 0.4;
    const hx = sb.x + sb.w / 2, hy = sb.y + sb.h / 2, s = 13 * k;
    board.moveTo(hx, hy + s * 0.5).bezierCurveTo(hx - s * 1.2, hy - s * 0.2, hx - s * 0.5, hy - s * 1.1, hx, hy - s * 0.4).bezierCurveTo(hx + s * 0.5, hy - s * 1.1, hx + s * 1.2, hy - s * 0.2, hx, hy + s * 0.5).fill(0xff4d6d);
  }, cleanups);
  const fireworksOn = () => {
    for (let i = 0; i < 6; i++) {
      later(i * 250, () => burst(kit.sparkles, sb.x + rand(0, sb.w), sb.y + sb.h + rand(10, 80), 12, 70), cleanups);
    }
    tween(1800, (t) => (fireworks = Math.sin(t * Math.PI)), () => (fireworks = 0));
  };
  hotspot(kit, new Rectangle(sb.x, sb.y, sb.w, sb.h), oneAtATime((done) => {
    sfx.tada();
    fireworksOn();
    later(1800, done, cleanups);
  }));

  // --- the organ: the old "charge!" call, and everyone cheers ---
  const o = L.organ;
  hotspot(kit, new Rectangle(o.x - 64, o.y - 24, 128, 68), oneAtATime((done) => {
    sfx.tune([392, 523, 659, 784, 659, 784], 0.14);
    later(1000, doWave, cleanups);
    later(2600, done, cleanups);
  }));

  // --- the ice machine: along the ice now and then, leaving it shiny ---
  const machine = new Container();
  const mg = new Graphics();
  mg.roundRect(-60, -46, 120, 44, 10).fill(0xffffff).stroke({ width: 3, color: INK });
  mg.rect(-60, -26, 120, 10).fill(0x4dabf7);
  mg.roundRect(-20, -78, 46, 34, 6).fill({ color: 0xbfe8ff, alpha: 0.9 }).stroke({ width: 3, color: INK });
  mg.circle(2, -66, 8).fill(0xf6cfb3).stroke({ width: 2, color: INK }); // the driver
  mg.circle(-36, -2, 12).circle(36, -2, 12).fill(0x2b2d42).stroke({ width: 2, color: INK });
  mg.rect(-68, -10, 10, 14).fill(0x6c757d);
  machine.addChild(mg);
  const shine = new Graphics();
  shine.eventMode = 'none';
  kit.under.addChild(shine, machine);
  const my = L.ice + (h - L.ice) * 0.22;
  machine.position.set(x0 - 100, my);
  let driving = false, boost = 1, trail: { x: number; t: number }[] = [];
  const drive = () => {
    if (driving) return;
    driving = true;
    machine.x = x0 - 100;
    machine.scale.x = 1;
    sfx.whirr();
  };
  everyFrame((dt) => {
    if (driving) {
      machine.x += 0.12 * boost * dt;
      trail.push({ x: machine.x - 60, t: time });
      if (machine.x > x1 + 100) driving = false;
    }
    trail = trail.filter((p) => time - p.t < 6000);
    shine.clear();
    for (const p of trail) shine.rect(p.x, my - 6, 4, 14).fill({ color: 0xffffff, alpha: 0.7 * (1 - (time - p.t) / 6000) });
  }, cleanups);
  later(3000, drive, cleanups);
  const again = () => {
    drive();
    later(rand(25000, 35000), again, cleanups);
  };
  later(30000, again, cleanups);
  tappable(machine, oneAtATime((done) => {
    sfx.honk();
    tween(1200, (t) => (boost = 1 + Math.sin(t * Math.PI) * 3), () => {
      boost = 1;
      done();
    });
  }), new Rectangle(-70, -84, 140, 100));

  // --- the polar bear mascot, by the boards ---
  const bear = new Container();
  const bg = new Graphics();
  bg.roundRect(-26, -70, 52, 64, 20).fill(0xe5383b).stroke({ width: 3, color: INK }); // jersey
  bg.rect(-26, -40, 52, 8).fill(0xffffff);
  bg.roundRect(-20, -8, 16, 18, 6).roundRect(4, -8, 16, 18, 6).fill(0xffffff).stroke({ width: 2.5, color: INK });
  bg.circle(-18, -98, 10).circle(18, -98, 10).fill(0xffffff).stroke({ width: 2.5, color: INK });
  bg.circle(0, -84, 26).fill(0xffffff).stroke({ width: 3, color: INK });
  bg.ellipse(0, -76, 12, 9).fill(0xf1f3f5).stroke({ width: 2, color: INK });
  bg.circle(0, -80, 4).fill(INK);
  bg.circle(-9, -90, 3).circle(9, -90, 3).fill(INK);
  const arm = new Graphics().roundRect(-7, -40, 14, 40, 7).fill(0xffffff).stroke({ width: 2.5, color: INK });
  arm.position.set(30, -58);
  bear.addChild(arm, bg);
  bear.position.set(0.72 * w, L.ice + 30);
  kit.under.addChild(bear);
  everyFrame(() => (arm.rotation = -0.6 + Math.sin(time * 0.006) * 0.5), cleanups);
  tappable(bear, oneAtATime((done) => {
    sfx.boing(1.1);
    later(300, () => sfx.boing(1.3), cleanups);
    tween(1600, (t) => {
      bear.rotation = Math.sin(t * Math.PI * 6) * 0.2;
      bear.y = L.ice + 30 - Math.abs(Math.sin(t * Math.PI * 4)) * 40;
      bear.scale.x = Math.sin(t * Math.PI * 2) >= 0 ? 1 : -1;
    }, () => {
      bear.rotation = 0;
      bear.scale.x = 1;
      bear.y = L.ice + 30;
      done();
    });
  }), new Rectangle(-40, -112, 80, 124));

  // --- the nets: score a goal! (three goals: a trophy) ---
  let goals = 0;
  const lamps = L.nets.map((n) => {
    const lamp = new Graphics();
    lamp.eventMode = 'none';
    kit.over.addChild(lamp);
    return { lamp, x: n.x + n.w / 2, y: n.y - n.h - 30 };
  });
  L.nets.forEach((n, i) => {
    const l = lamps[i];
    const lampGfx = new Graphics().rect(l.x - 10, l.y - 10, 20, 22).fill(0x6c757d).stroke({ width: 2, color: INK });
    kit.under.addChild(lampGfx);
    kit.secrets?.lock({
      accepts: ['puck', 'ball'],
      area: () => ({ x: n.x - 10, y: n.y - n.h - 10, w: n.w + 20, h: n.h + 30 }),
      open() {
        sfx.honk();
        later(150, () => sfx.honk(), cleanups);
        later(300, doWave, cleanups);
        fireworksOn();
        for (let k = 0; k < 24; k++) {
          const c = new Graphics().rect(-4, -6, 8, 12).fill(SHIRTS[k % SHIRTS.length]);
          tumble(kit, c, n.x + rand(-0.2, 0.3) * w, h * 0.1, h * 0.9, { vx: rand(-0.06, 0.06), vy: 0, float: true, spin: rand(-8, 8) });
        }
        tween(2200, (t) => {
          l.lamp.clear();
          if (Math.floor(t * 10) % 2 === 0) glow(l.lamp, l.x, l.y, 50, 0xff3b30, 2.5);
          l.lamp.circle(l.x, l.y, 8).fill(0xff3b30);
        }, () => l.lamp.clear());
        if (++goals % 3 === 0) later(900, () => kit.secrets?.find('hat-trick', 'trophy', { x: 0.5 * w, y: h * 0.5 }), cleanups);
        return true; // the puck stays in the net
      },
    });
  });
}
