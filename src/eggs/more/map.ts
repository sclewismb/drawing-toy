import { Container, Graphics, Rectangle } from 'pixi.js';
import { sfx } from '../../sound';
import { tween } from '../../tween';
import { everyFrame, INK, later, oneAtATime, rand, tappable, type Cleanups, type EggKit } from '../common';
import type { StreetGeom } from '../views';
import { bird, bunny, drawn, moleFace, opener, peeker, type Draw } from '../hidden';

/**
 * Five more hidden things on the town map: a duck family on the pond, a kite
 * over a field, a bunny burrow, a picnic basket and a scarecrow with crows.
 * Spots are fractions of the map's length (x) and the screen height (y),
 * in the fields below the road.
 */
const line = (s: number, width = 2.5) => ({ width: width * s, color: INK });

const duck = (s: number, baby: boolean): Draw => (g) => {
  const k = baby ? 0.6 : 1;
  g.ellipse(0, -8 * s * k, 16 * s * k, 9 * s * k).fill(baby ? 0xffe066 : 0xffffff).stroke(line(s, 2));
  g.circle(11 * s * k, -18 * s * k, 7 * s * k).fill(baby ? 0xffe066 : 0xffffff).stroke(line(s, 2));
  g.poly([16 * s * k, -18 * s * k, 24 * s * k, -16 * s * k, 16 * s * k, -14 * s * k]).fill(0xffa94d);
  g.circle(12 * s * k, -20 * s * k, 1.5 * s).fill(INK);
};

export function moreStreet(kit: EggKit, geom: StreetGeom, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800;
  // 1. a duck family going round the pond: tap them and they quack and turn round
  {
    const p = geom.pond;
    const c = new Container();
    kit.under.addChild(c);
    const ducks = [false, true, true, true].map((baby) => {
      const d = new Container();
      drawn(duck(s, baby), d);
      c.addChild(d);
      return d;
    });
    let a = 0, dir = 1, bob = 0;
    everyFrame((dt) => {
      a += dir * dt * 0.00025;
      if (bob > 0) bob -= dt;
      ducks.forEach((d, i) => {
        const t = a - dir * i * 0.32;
        d.position.set(p.x + Math.cos(t) * p.rx * 0.6, p.y + Math.sin(t) * p.ry * 0.5 + 6 * s - (bob > 0 ? Math.abs(Math.sin(bob / 60 + i)) * 6 * s : 0));
        d.scale.x = -Math.sin(t) * dir > 0 ? 1 : -1;
      });
    }, cleanups);
    tappable(c, oneAtATime((done) => {
      sfx.quack();
      later(250, () => sfx.quack(), cleanups);
      dir = -dir;
      bob = 900;
      later(900, done, cleanups);
    }));
  }
  // 2. a kite flying over the field by the zoo: tap for a loop-the-loop
  {
    const ax = 0.442 * w, ay = 0.95 * h;
    const kite = new Container();
    drawn((g) => {
      g.poly([0, -26 * s, 18 * s, 0, 0, 30 * s, -18 * s, 0]).fill(0xff6b6b).stroke(line(s, 2));
      g.poly([0, -26 * s, 18 * s, 0, 0, 0]).fill(0xffd43b);
      g.poly([0, 30 * s, -18 * s, 0, 0, 0]).fill(0x4dabf7);
      g.moveTo(0, 30 * s).quadraticCurveTo(10 * s, 46 * s, -4 * s, 60 * s).stroke(line(s, 1.5));
      for (const [x, y] of [[4, 42], [0, 54]]) g.poly([x * s, y * s, (x + 6) * s, (y - 3) * s, (x + 6) * s, (y + 3) * s]).fill(0xb197fc);
    }, kite);
    const string = new Graphics();
    kit.under.addChild(string, kite);
    let t = 0, loop = 0;
    everyFrame((dt) => {
      t += dt;
      let kx = ax + 90 * s + Math.sin(t / 1300) * 30 * s, ky = ay - 210 * s + Math.sin(t / 900) * 14 * s;
      if (loop > 0) {
        loop -= dt;
        const k = 1 - loop / 1400;
        kx += Math.sin(k * Math.PI * 2) * 50 * s;
        ky += (1 - Math.cos(k * Math.PI * 2)) * -40 * s;
        kite.rotation = k * Math.PI * 2;
      } else kite.rotation = Math.sin(t / 700) * 0.15;
      kite.position.set(kx, ky);
      string.clear().moveTo(ax, ay).quadraticCurveTo((ax + kx) / 2 + 20 * s, (ay + ky) / 2 + 30 * s, kx, ky + 28 * s).stroke({ width: 1.5 * s, color: 0x495057 });
    }, cleanups);
    tappable(kite, () => {
      if (loop > 0) return;
      sfx.whoosh();
      loop = 1400;
    }, new Rectangle(-26 * s, -32 * s, 52 * s, 70 * s));
  }
  // 3. a bunny burrow in the field by the ninja gym (sometimes it's a mole)
  peeker(kit, cleanups, {
    x: 0.604 * w, y: 0.805 * h, rise: 46 * s, who: bunny(s), rare: moleFace(s),
    back: (g) => g.ellipse(0, 0, 22 * s, 8 * s).fill(0x5c4033).stroke(line(s, 2)),
    hole: (g) => g.rect(-40 * s, -90 * s, 80 * s, 90 * s).fill(0xffffff),
    front: (g) => g.ellipse(0, 4 * s, 28 * s, 7 * s).fill(0x8b5e3c).stroke(line(s, 1.5)).ellipse(0, 1 * s, 20 * s, 5 * s).fill(0x5c4033),
    hit: new Rectangle(-30 * s, -50 * s, 60 * s, 60 * s), sound: () => sfx.pop(0.9), rareSound: () => sfx.giggle(0.9),
  });
  // 4. a picnic in the field by the police station
  {
    const x = 0.154 * w, y = 0.8 * h;
    drawn((g) => {
      g.poly([-70 * s, 0, 60 * s, 0, 80 * s, 40 * s, -60 * s, 40 * s]).fill(0xff8787).stroke(line(s, 2));
      for (let i = 1; i < 4; i++) g.moveTo(-70 * s + i * 32 * s, 0).lineTo(-60 * s + i * 34 * s, 40 * s);
      g.moveTo(-66 * s, 13 * s).lineTo(67 * s, 13 * s).moveTo(-63 * s, 27 * s).lineTo(73 * s, 27 * s);
      g.stroke({ width: 3 * s, color: 0xffffff });
    }, kit.under, x, y);
    const cup = (g: Graphics) => g.poly([-7 * s, -16 * s, 7 * s, -16 * s, 5 * s, 0, -5 * s, 0]).fill(0x74c0fc).stroke(line(s, 1.5));
    const sandwich = (g: Graphics) => g.poly([-14 * s, 0, 14 * s, 0, 0, -22 * s]).fill(0xf4c27a).stroke(line(s, 2)).poly([-10 * s, -3 * s, 10 * s, -3 * s, 0, -18 * s]).fill(0x8ce99a);
    const apple = (g: Graphics) => g.circle(0, -11 * s, 11 * s).fill(0xe5383b).stroke(line(s, 2)).moveTo(0, -22 * s).lineTo(2 * s, -28 * s).stroke(line(s, 2));
    drawn(cup, kit.under, x - 40 * s, y + 24 * s);
    opener(kit, cleanups, {
      x: x + 14 * s, y: y + 26 * s, from: { x: 0, y: -24 * s }, up: 34 * s,
      closed: (g) => g.roundRect(-24 * s, -26 * s, 48 * s, 26 * s, 4 * s).fill(0xc68b59).stroke(line(s, 2)).moveTo(-14 * s, -26 * s).quadraticCurveTo(0, -44 * s, 14 * s, -26 * s).stroke(line(s, 3)).rect(-24 * s, -16 * s, 48 * s, 3 * s).fill(0xa0703e),
      open: (g) => g.poly([-24 * s, -26 * s, 24 * s, -26 * s, 20 * s, -46 * s, -20 * s, -46 * s]).fill(0xd9a066).stroke(line(s, 2)).roundRect(-24 * s, -26 * s, 48 * s, 26 * s, 4 * s).fill(0xc68b59).stroke(line(s, 2)),
      inside: [sandwich, apple, sandwich],
      hit: new Rectangle(-30 * s, -50 * s, 60 * s, 54 * s), sound: () => (sfx.shelfOpen(), later(600, () => sfx.munch(), cleanups)),
    });
  }
  // 5. a scarecrow in the field, with two crows who fly off when he's tapped
  {
    const x = 0.904 * w, y = 0.86 * h;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const man = drawn((g) => {
      g.rect(-3 * s, -110 * s, 6 * s, 110 * s).fill(0x8d5a3b);
      g.rect(-44 * s, -84 * s, 88 * s, 6 * s).fill(0x8d5a3b);
      g.poly([-22 * s, -86 * s, 22 * s, -86 * s, 18 * s, -40 * s, -18 * s, -40 * s]).fill(0x4dabf7).stroke(line(s, 2));
      g.rect(-8 * s, -70 * s, 8 * s, 8 * s).fill(0xffd43b);
      g.circle(0, -100 * s, 14 * s).fill(0xf3d9b1).stroke(line(s, 2));
      g.circle(-5 * s, -102 * s, 1.8 * s).fill(INK).circle(5 * s, -102 * s, 1.8 * s).fill(INK).arc(0, -97 * s, 5 * s, 0.3, Math.PI - 0.3).stroke(line(s, 1.5));
      g.poly([-22 * s, -110 * s, 22 * s, -110 * s, 0, -134 * s]).fill(0xc68b59).stroke(line(s, 2)).rect(-26 * s, -112 * s, 52 * s, 5 * s).fill(0xa0703e);
      for (const sx of [-1, 1]) g.moveTo(sx * 44 * s, -84 * s).lineTo(sx * 50 * s, -78 * s).moveTo(sx * 44 * s, -80 * s).lineTo(sx * 50 * s, -74 * s).stroke({ width: 2 * s, color: 0xe0c070 });
    }, c);
    const crows = [-36, 34].map((dx) => {
      const b = new Container();
      drawn(bird(s * 0.8, 0x343a40), b);
      b.position.set(dx * s, -86 * s);
      if (dx < 0) b.scale.x = -1;
      c.addChild(b);
      return b;
    });
    tappable(c, oneAtATime((done) => {
      sfx.squawk(1.1);
      tween(700, (k) => (man.rotation = Math.sin(k * Math.PI * 4) * 0.08 * (1 - k)), () => (man.rotation = 0));
      crows.forEach((b, i) => {
        const home = { x: b.x, y: b.y }, fx = rand(-160, 160) * s;
        tween(2600, (k) => {
          const q = Math.sin(k * Math.PI);
          b.position.set(home.x + fx * q + Math.sin(k * Math.PI * 2) * 40 * s * (i ? 1 : -1), home.y - q * 160 * s);
          b.scale.y = 1 - Math.abs(Math.sin(k * 60)) * 0.3;
        }, () => (b.scale.y = 1));
      });
      later(2700, () => (sfx.squawk(1.3), done()), cleanups);
    }), new Rectangle(-50 * s, -136 * s, 100 * s, 138 * s));
  }
}
