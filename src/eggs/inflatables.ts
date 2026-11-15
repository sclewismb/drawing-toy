import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { isNight } from '../places';
import { sfx } from '../sound';
import { tween } from '../tween';
import { everyFrame, glow, INK, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';
import type { StreetGeom } from './views';

/**
 * Christmas inflatables on the front lawn of the family's house on the map
 * (winter only): Santa riding a polar bear with his sack of presents, and a
 * penguin in a red scarf and bobble hat. They sway in the breeze, glow at
 * night like real ones, and do something different each time they're
 * tapped: bounce, pop out presents, or go floppy and blow back up.
 * (Our own drawings: no film or TV characters.)
 */
export function frontYardInflatables(kit: EggKit, geom: StreetGeom, cleanups: Cleanups) {
  const house = geom.buildings.house;
  if (!house) return;
  const S = (house.h / 100) * 0.85; // drawn as if the house were about 118 tall
  const ground = house.y + 3 * S;
  const night = isNight();

  // on the lawn left of the front door (between the door and the mailbox), the penguin past the mailbox
  const bear = polarBearSanta(S, night);
  bear.position.set(house.x - house.w * 0.27, ground);
  const pen = penguin(S, night);
  pen.position.set(house.x - house.w * 0.64, ground + 1.5 * S);
  kit.under.addChild(pen, bear);

  // swaying in the breeze, like real inflatables
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    bear.skew.x = Math.sin(time * 0.0011) * 0.03;
    pen.skew.x = Math.sin(time * 0.0014 + 1) * 0.05;
  }, cleanups);

  /** A squashy bounce. */
  const bounce = (c: Container, done: () => void) =>
    tween(800, (t) => {
      const k = Math.sin(t * Math.PI * 3) * (1 - t);
      c.scale.set(1 + k * 0.08, 1 - k * 0.12);
    }, () => (c.scale.set(1), done()));
  /** It goes floppy (the fan's switched off!), then blows back up. */
  const floppy = (c: Container, done: () => void) => {
    sfx.puff(0.7);
    tween(1900, (t) => {
      const k = t < 0.3 ? t / 0.3 : t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
      c.scale.set(1 + k * 0.18, 1 - k * 0.68);
      c.rotation = Math.sin(t * Math.PI * 2) * 0.08 * k;
      if (t > 0.5 && t < 0.52) sfx.whirr();
    }, () => (c.scale.set(1), (c.rotation = 0), done()));
  };

  let bearTurn = 0;
  tappable(bear, oneAtATime((done) => {
    const what = bearTurn++ % 3;
    if (what === 0) {
      sfx.hoHo();
      bounce(bear, done);
    } else if (what === 1) {
      // presents pop out of the sack
      sfx.sleighBells();
      const sx = bear.x + 13 * S, sy = bear.y - 44 * S;
      for (let i = 0; i < 3; i++) {
        const p = new Graphics().rect(-5, -5, 10, 10).fill([0xe5383b, 0x7048e8, 0x2fb36b][i]).stroke({ width: 1.5, color: INK });
        p.rect(-1.2, -5, 2.4, 10).fill(0xffd43b);
        tumble(kit, p, sx, sy, ground + rand(2, 10) * S, { vy: rand(-0.4, -0.25), vx: rand(-0.12, 0.12) });
      }
      burst(kit.sparkles, sx, sy, 8, 40);
      bounce(bear, done);
    } else {
      floppy(bear, done);
    }
  }), new Rectangle(-36 * S, -58 * S, 60 * S, 60 * S));

  let penTurn = 0;
  tappable(pen, oneAtATime((done) => {
    const what = penTurn++ % 3;
    if (what === 0) {
      sfx.squeak(1.5);
      tween(900, (t) => (pen.rotation = Math.sin(t * Math.PI * 5) * 0.2 * (1 - t)), () => ((pen.rotation = 0), done()));
    } else if (what === 1) {
      sfx.giggle(1.6);
      const y0 = pen.y;
      tween(700, (t) => (pen.y = y0 - Math.abs(Math.sin(t * Math.PI * 2)) * 8 * S), () => ((pen.y = y0), done()));
    } else {
      floppy(pen, done);
    }
  }), new Rectangle(-13 * S, -38 * S, 26 * S, 38 * S));
}

const RED = 0xe5383b;
const line = (S: number) => ({ width: Math.max(1.5, 0.9 * S), color: INK });

/** Santa riding a polar bear, with his sack of presents. Feet at (0, 0), facing left. */
function polarBearSanta(S: number, night: boolean) {
  const c = new Container();
  const g = new Graphics();
  const L = line(S);
  const p = (pts: number[]) => pts.map((v) => v * S);
  if (night) glow(g, 0, -26 * S, 34 * S, 0xfff3c4, 1.6); // lit up from inside at night
  g.ellipse(0, 0, 26 * S, 3 * S).fill({ color: 0x000000, alpha: 0.14 }); // its shadow on the lawn
  const white = 0xf6f7f9, shade = 0xdfe5ec;
  // back legs, then the body, then the front legs
  for (const x of [8, 15]) g.roundRect((x - 3.5) * S, -12 * S, 7 * S, 12 * S, 3 * S).fill(shade).stroke(L);
  g.ellipse(2 * S, -18 * S, 19 * S, 11 * S).fill(white).stroke(L);
  g.ellipse(4 * S, -9.5 * S, 14 * S, 3 * S).fill({ color: 0x9fb3c8, alpha: 0.35 }); // the shadowy tummy
  for (const x of [-12, -4]) {
    g.roundRect((x - 3.5) * S, -13 * S, 7 * S, 13 * S, 3 * S).fill(white).stroke(L);
    g.moveTo((x - 1.2) * S, -2.5 * S).lineTo((x - 1.2) * S, -0.4 * S).moveTo((x + 1.2) * S, -2.5 * S).lineTo((x + 1.2) * S, -0.4 * S).stroke({ width: 1, color: 0x9aa5b1 }); // toes
  }
  // ears, head, snout
  g.circle(-19 * S, -32 * S, 2.6 * S).circle(-25 * S, -31.5 * S, 2.4 * S).fill(white).stroke(L);
  g.ellipse(-22 * S, -25 * S, 8.5 * S, 7.5 * S).fill(white).stroke(L);
  g.ellipse(-29.5 * S, -23 * S, 4.6 * S, 3.6 * S).fill(white).stroke(L);
  g.circle(-33.6 * S, -23.8 * S, 1.4 * S).fill(INK);
  g.circle(-24.5 * S, -27.5 * S, 0.95 * S).fill(INK);
  g.moveTo(-31 * S, -21 * S).quadraticCurveTo(-29 * S, -19.6 * S, -27.5 * S, -21 * S).stroke({ width: 1, color: INK });
  // a red scarf round its neck, its end flying
  g.poly(p([-17, -31, -12.5, -20, -10.5, -21, -15, -32])).fill(RED).stroke(L);
  g.poly(p([-13.5, -21, -17.5, -8, -14.5, -8, -11.5, -20])).fill(RED).stroke(L);
  // the sack of presents on its back
  g.ellipse(13 * S, -31 * S, 8 * S, 8.5 * S).fill(0x2f9e44).stroke(L);
  g.ellipse(10 * S, -34 * S, 2.5 * S, 3.5 * S).fill({ color: 0xffffff, alpha: 0.28 });
  g.rect(8.5 * S, -47 * S, 6.5 * S, 8 * S).fill(0x7048e8).stroke(L);
  g.rect(11 * S, -47 * S, 1.6 * S, 8 * S).fill(0xffd43b);
  g.rect(14.5 * S, -45 * S, 6.5 * S, 6.5 * S).fill(RED).stroke(L);
  g.rect(17 * S, -45 * S, 1.6 * S, 6.5 * S).fill(0x2fb36b);
  g.ellipse(12.5 * S, -39 * S, 4 * S, 1.8 * S).fill(0x1e6b2e).stroke(L); // its gathered neck
  // Santa, sitting on the bear: his leg and boot hang down its side
  g.roundRect(-8 * S, -28 * S, 5 * S, 9 * S, 2 * S).fill(RED).stroke(L);
  g.roundRect(-10.5 * S, -21.5 * S, 6.5 * S, 4.2 * S, 1.8 * S).fill(0x212529).stroke(L);
  g.ellipse(-1 * S, -34.5 * S, 6.5 * S, 7.5 * S).fill(RED).stroke(L);
  g.roundRect(-7.5 * S, -29 * S, 13 * S, 2.6 * S, 1.3 * S).fill(0xffffff).stroke(L);
  g.ellipse(-3 * S, -37 * S, 1.6 * S, 3 * S).fill({ color: 0xffffff, alpha: 0.3 });
  // the little Christmas tree he's holding, and his arm round it
  g.poly(p([-10, -45, -5.5, -33.5, -14.5, -33.5])).fill(0x2f9e44).stroke(L);
  g.star(-10 * S, -45.5 * S, 5, 1.7 * S, 0.8 * S).fill(0xffd43b);
  g.roundRect(-10 * S, -38.5 * S, 8 * S, 3.4 * S, 1.7 * S).fill(RED).stroke(L);
  g.circle(-10.5 * S, -36.8 * S, 2 * S).fill(0x7048e8).stroke(L); // a purple mitten
  // his beard, face and hat
  g.circle(-2.2 * S, -40.5 * S, 4.4 * S).circle(-5 * S, -40 * S, 3 * S).circle(0.5 * S, -40 * S, 3 * S).fill(0xffffff).stroke(L);
  g.circle(-2.5 * S, -44.5 * S, 2.9 * S).fill(0xffd8c2).stroke(L);
  g.ellipse(-3 * S, -42.8 * S, 2.6 * S, 1 * S).fill(0xffffff);
  g.circle(-4 * S, -45 * S, 0.6 * S).fill(INK);
  g.poly(p([-5.8, -46.5, 1.2, -46.5, 2.5, -53, -0.5, -56.5])).fill(RED).stroke(L);
  g.circle(2 * S, -56.5 * S, 1.9 * S).fill(0xffffff).stroke(L);
  g.roundRect(-6.5 * S, -48 * S, 8.5 * S, 2.6 * S, 1.3 * S).fill(0xffffff).stroke(L);
  // tethered down to the lawn
  g.moveTo(17 * S, -20 * S).lineTo(27 * S, 0).moveTo(-9 * S, -16 * S).lineTo(-17 * S, 0).stroke({ width: 1, color: 0x6c757d, alpha: 0.7 });
  c.addChild(g);
  return c;
}

/** A penguin inflatable in a red scarf and bobble hat, waving. Feet at (0, 0). */
function penguin(S: number, night: boolean) {
  const c = new Container();
  const g = new Graphics();
  const L = line(S);
  const p = (pts: number[]) => pts.map((v) => v * S);
  if (night) glow(g, 0, -16 * S, 18 * S, 0xfff3c4, 1.4);
  g.ellipse(0, 0, 11 * S, 2 * S).fill({ color: 0x000000, alpha: 0.14 });
  g.ellipse(-3 * S, -0.8 * S, 3 * S, 1.4 * S).ellipse(3 * S, -0.8 * S, 3 * S, 1.4 * S).fill(0xff922b).stroke(L);
  g.ellipse(0, -15 * S, 8 * S, 14 * S).fill(0x2b2d42).stroke(L);
  g.ellipse(0, -12 * S, 5.6 * S, 10 * S).fill(0xffffff);
  g.ellipse(-3.6 * S, -22 * S, 1.4 * S, 3.4 * S).fill({ color: 0xffffff, alpha: 0.3 }); // shiny
  // flippers: one waving
  g.poly(p([-6.5, -21, -12.5, -30, -10.5, -31.2, -5, -23.5])).fill(0x2b2d42).stroke(L);
  g.poly(p([6.5, -20, 9.5, -10.5, 7.5, -10, 5, -18.5])).fill(0x2b2d42).stroke(L);
  // face
  g.circle(-2.6 * S, -23 * S, 1.8 * S).circle(2.6 * S, -23 * S, 1.8 * S).fill(0xffffff).stroke({ width: 1, color: INK });
  g.circle(-2.4 * S, -22.8 * S, 0.9 * S).circle(2.8 * S, -22.8 * S, 0.9 * S).fill(INK);
  g.poly(p([-1.8, -20.6, 1.8, -20.6, 0, -17.9])).fill(0xff922b).stroke({ width: 1, color: INK });
  g.circle(-4.4 * S, -19.6 * S, 1 * S).circle(4.4 * S, -19.6 * S, 1 * S).fill({ color: 0xff8fab, alpha: 0.7 });
  // red scarf, its end hanging down, with white stripes
  g.roundRect(-7.6 * S, -17.6 * S, 15.2 * S, 3 * S, 1.5 * S).fill(RED).stroke(L);
  g.poly(p([3, -16, 6.4, -7.5, 4.2, -7, 1.4, -15])).fill(RED).stroke(L);
  g.moveTo(3.9 * S, -12.5 * S).lineTo(5.4 * S, -12.7 * S).moveTo(4.6 * S, -10 * S).lineTo(6 * S, -10.2 * S).stroke({ width: 1.2, color: 0xffffff });
  // bobble hat
  g.moveTo(-6.8 * S, -26.5 * S).quadraticCurveTo(0, -37 * S, 6.8 * S, -26.5 * S).closePath().fill(RED).stroke(L);
  g.roundRect(-7.4 * S, -27.6 * S, 14.8 * S, 2.8 * S, 1.4 * S).fill(0xffffff).stroke(L);
  g.circle(0, -32.5 * S, 2.1 * S).fill(0xffffff).stroke(L);
  c.addChild(g);
  return c;
}
