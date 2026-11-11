import { Container, Graphics, Rectangle } from 'pixi.js';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { ZOO } from '../zoo';
import { cloudRain, everyFrame, INK, later, oneAtATime, rand, spray, tappable, tumble, type Cleanups, type EggKit } from './common';

/** The zoo's animals: they move about a little, and do something when tapped. */
export function zoo(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const gy = h * ZOO.ground;
  let time = 0;
  everyFrame((dt) => (time += dt), cleanups);

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
  everyFrame(() => (neck.rotation = -0.25 + Math.sin(time * 0.0012) * 0.05 - reach * 0.35), cleanups);
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
  everyFrame(() => (monkey.rotation = Math.sin(time * 0.002) * (0.25 + wild * 0.5)), cleanups);
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
    ear.scale.x = 1 - Math.abs(Math.sin(time * 0.002)) * 0.25;
    trunk.rotation = Math.sin(time * 0.0015) * 0.08 - lift * 2.4;
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
  everyFrame(() => pens.forEach((p, i) => (p.rotation = Math.sin(time * 0.006 + i * 2) * 0.12)), cleanups);
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
        const ring = new Graphics();
        kit.under.addChild(ring);
        tween(600, (t) => ring.clear().ellipse(poolX, poolY, 10 + t * 50, 4 + t * 14).stroke({ width: 3, color: 0xffffff, alpha: 1 - t }), () => ring.destroy());
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
  everyFrame(() => (tail.rotation = Math.sin(time * 0.003) * 0.3), cleanups);
  tappable(lion, oneAtATime((done) => {
    sfx.rawr();
    tween(900, (t) => {
      mane.scale.set(1 + Math.sin(t * Math.PI) * 0.3);
      mane.rotation = Math.sin(t * Math.PI * 8) * 0.1 * (1 - t);
    }, () => later(300, done, cleanups));
  }), new Rectangle(-80, -90, 160, 100));

  // the drifting clouds rain (or snow) when tapped
  cloudRain(kit, cleanups, () => h * 0.8);
}
