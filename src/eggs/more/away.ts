import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst, hearts } from '../../fx';
import { sfx } from '../../sound';
import { ease, tween } from '../../tween';
import { INK, later, oneAtATime, rand, spray, tappable, type Cleanups, type EggKit } from '../common';
import { bearFace, bird, bug, crawler, dangler, drawn, fish, flier, frog, hider, jiggler, mouseFace, opener, peeker, pick, type Draw } from '../hidden';

/** Five more hidden things in the zoo, the fair, Niagara Falls, the ninja gym, the butterfly house, the arena and the pigs' cottage. */

const line = (s: number, width = 2.5) => ({ width: width * s, color: INK });

// --- art ---
const peacock = (s: number, fanned: boolean): Draw => (g) => {
  if (fanned) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + 0.15 + (i / 8) * (Math.PI - 0.3);
      const x = -6 * s + Math.cos(a) * 44 * s, y = -26 * s + Math.sin(a) * 44 * s;
      g.moveTo(-6 * s, -24 * s).lineTo(x, y).stroke({ width: 10 * s, color: 0x2b8a3e });
      g.circle(x, y, 7 * s).fill(0x2f9e44).stroke(line(s, 1.5)).circle(x, y, 3.5 * s).fill(0x1c7ed6).circle(x, y, 1.5 * s).fill(0xffd43b);
    }
  } else g.moveTo(-8 * s, -14 * s).quadraticCurveTo(-40 * s, -10 * s, -50 * s, -2 * s).lineTo(-36 * s, -18 * s).closePath().fill(0x2f9e44).stroke(line(s, 2));
  g.moveTo(-2 * s, 0).lineTo(-2 * s, -8 * s).moveTo(4 * s, 0).lineTo(4 * s, -8 * s).stroke({ width: 2 * s, color: 0x868e96 });
  g.ellipse(0, -16 * s, 12 * s, 10 * s).fill(0x1971c2).stroke(line(s));
  g.moveTo(4 * s, -20 * s).quadraticCurveTo(12 * s, -30 * s, 8 * s, -40 * s).stroke({ width: 7 * s, color: 0x1c7ed6 });
  g.circle(9 * s, -42 * s, 6 * s).fill(0x1c7ed6).stroke(line(s, 2));
  g.circle(11 * s, -43 * s, 1.6 * s).fill(INK);
  g.poly([14 * s, -43 * s, 19 * s, -41 * s, 14 * s, -40 * s]).fill(0xffa94d);
  for (const dx of [-3, 0, 3]) g.moveTo(8 * s, -48 * s).lineTo((8 + dx) * s, -55 * s).stroke(line(s, 1)).circle((8 + dx) * s, -56 * s, 1.6 * s).fill(0x1c7ed6);
};
const penguin = (s: number, chick = true): Draw => (g) => {
  g.ellipse(0, -16 * s, 13 * s, 16 * s).fill(chick ? 0x868e96 : 0x212529).stroke(line(s));
  g.ellipse(0, -13 * s, 8 * s, 11 * s).fill(chick ? 0xdee2e6 : 0xffffff);
  g.circle(0, -34 * s, 10 * s).fill(chick ? 0x868e96 : 0x212529).stroke(line(s));
  g.ellipse(0, -33 * s, 7 * s, 6 * s).fill(0xffffff);
  g.circle(-3 * s, -34 * s, 1.6 * s).fill(INK).circle(3 * s, -34 * s, 1.6 * s).fill(INK);
  g.poly([-2 * s, -30 * s, 2 * s, -30 * s, 0, -27 * s]).fill(0xffa94d);
  g.ellipse(-5 * s, 0, 5 * s, 2.5 * s).fill(0xffa94d).ellipse(5 * s, 0, 5 * s, 2.5 * s).fill(0xffa94d);
};
const sloth = (s: number): Draw => (g) => {
  g.moveTo(-10 * s, -6 * s).lineTo(-6 * s, -22 * s).moveTo(10 * s, -6 * s).lineTo(6 * s, -22 * s).stroke({ width: 6 * s, color: 0x8d6e52 });
  g.ellipse(0, 4 * s, 16 * s, 14 * s).fill(0xa98467).stroke(line(s));
  g.ellipse(0, 6 * s, 10 * s, 8 * s).fill(0xe6ccb2).stroke(line(s, 1.5));
  g.ellipse(-4 * s, 5 * s, 3.5 * s, 2.5 * s).fill(0x5c3d2e).ellipse(4 * s, 5 * s, 3.5 * s, 2.5 * s).fill(0x5c3d2e);
  g.circle(-4 * s, 5 * s, 1.2 * s).fill(0xffffff).circle(4 * s, 5 * s, 1.2 * s).fill(0xffffff);
  g.circle(0, 9 * s, 1.8 * s).fill(INK);
  g.arc(0, 10 * s, 3 * s, 0.3, Math.PI - 0.3).stroke(line(s, 1.2));
};
const koala = (s: number, awake: boolean): Draw => (g) => {
  g.ellipse(0, -18 * s, 15 * s, 18 * s).fill(0xadb5bd).stroke(line(s));
  g.moveTo(-14 * s, -24 * s).lineTo(-4 * s, -16 * s).moveTo(14 * s, -24 * s).lineTo(4 * s, -16 * s).stroke({ width: 5 * s, color: 0x868e96 });
  g.circle(-14 * s, -46 * s, 8 * s).fill(0xadb5bd).stroke(line(s, 2)).circle(14 * s, -46 * s, 8 * s).fill(0xadb5bd).stroke(line(s, 2));
  g.circle(-14 * s, -46 * s, 4 * s).fill(0xf1f3f5).circle(14 * s, -46 * s, 4 * s).fill(0xf1f3f5);
  g.circle(0, -40 * s, 13 * s).fill(0xadb5bd).stroke(line(s));
  g.ellipse(0, -37 * s, 4.5 * s, 6 * s).fill(0x495057);
  if (awake) g.circle(-6 * s, -43 * s, 2 * s).fill(INK).circle(6 * s, -43 * s, 2 * s).fill(INK).moveTo(8 * s, -28 * s).lineTo(18 * s, -34 * s).stroke({ width: 3 * s, color: 0x2f9e44 }).ellipse(19 * s, -36 * s, 5 * s, 3 * s).fill(0x69db7c);
  else g.moveTo(-9 * s, -43 * s).lineTo(-4 * s, -43 * s).moveTo(4 * s, -43 * s).lineTo(9 * s, -43 * s).stroke(line(s, 1.8));
};
/** A whole teddy, sitting (the fair's lost prize). */
const teddy = (s: number, fur = 0xc68b59): Draw => (g) => {
  g.ellipse(0, -14 * s, 14 * s, 14 * s).fill(fur).stroke(line(s));
  g.ellipse(0, -12 * s, 8 * s, 8 * s).fill(0xf3d9b1);
  g.circle(-11 * s, -50 * s, 6 * s).fill(fur).stroke(line(s)).circle(11 * s, -50 * s, 6 * s).fill(fur).stroke(line(s));
  g.circle(0, -38 * s, 14 * s).fill(fur).stroke(line(s));
  g.ellipse(0, -33 * s, 7 * s, 5 * s).fill(0xf3d9b1).stroke(line(s, 1.5));
  g.circle(0, -35 * s, 2.2 * s).fill(INK).circle(-5 * s, -41 * s, 2 * s).fill(INK).circle(5 * s, -41 * s, 2 * s).fill(INK);
  g.poly([-6 * s, -24 * s, 6 * s, -24 * s, 0, -20 * s]).fill(0x4dabf7);
};
const clownFace = (s: number): Draw => (g) => {
  g.circle(-16 * s, -18 * s, 8 * s).fill(0xff922b).stroke(line(s, 1.5)).circle(16 * s, -18 * s, 8 * s).fill(0xff922b).stroke(line(s, 1.5));
  g.circle(0, -18 * s, 16 * s).fill(0xfdfdfd).stroke(line(s));
  g.circle(-6 * s, -22 * s, 2.2 * s).fill(INK).circle(6 * s, -22 * s, 2.2 * s).fill(INK);
  g.circle(0, -16 * s, 5 * s).fill(0xe5383b).stroke(line(s, 1.5));
  g.arc(0, -11 * s, 7 * s, 0.3, Math.PI - 0.3).stroke({ width: 2.5 * s, color: 0xe5383b });
  g.poly([-6 * s, -33 * s, 6 * s, -33 * s, 0, -48 * s]).fill(0x4dabf7).stroke(line(s, 1.5)).circle(0, -49 * s, 3 * s).fill(0xffd43b);
};
const mooseFace = (s: number): Draw => (g) => {
  for (const side of [-1, 1]) g.moveTo(side * 10 * s, -40 * s).quadraticCurveTo(side * 30 * s, -44 * s, side * 34 * s, -60 * s).lineTo(side * 28 * s, -52 * s).lineTo(side * 24 * s, -62 * s).lineTo(side * 20 * s, -50 * s).lineTo(side * 14 * s, -56 * s).quadraticCurveTo(side * 14 * s, -46 * s, side * 8 * s, -44 * s).closePath().fill(0xe6ccb2).stroke(line(s, 1.8));
  g.ellipse(-16 * s, -36 * s, 7 * s, 4 * s).fill(0x7f5539).stroke(line(s, 1.5)).ellipse(16 * s, -36 * s, 7 * s, 4 * s).fill(0x7f5539).stroke(line(s, 1.5));
  g.roundRect(-12 * s, -42 * s, 24 * s, 42 * s, 11 * s).fill(0x7f5539).stroke(line(s));
  g.ellipse(0, -8 * s, 13 * s, 10 * s).fill(0x9c6644).stroke(line(s, 1.8));
  g.circle(-5 * s, -9 * s, 2 * s).fill(INK).circle(5 * s, -9 * s, 2 * s).fill(INK);
  g.circle(-6 * s, -30 * s, 2.2 * s).fill(INK).circle(6 * s, -30 * s, 2.2 * s).fill(INK);
};
const ninjaKid = (s: number): Draw => (g) => {
  g.roundRect(-11 * s, -26 * s, 22 * s, 26 * s, 6 * s).fill(0x212529).stroke(line(s));
  g.circle(0, -36 * s, 12 * s).fill(0x212529).stroke(line(s));
  g.roundRect(-9 * s, -40 * s, 18 * s, 7 * s, 3 * s).fill(0xffd8b5);
  g.circle(-4 * s, -36.5 * s, 1.6 * s).fill(INK).circle(4 * s, -36.5 * s, 1.6 * s).fill(INK);
  g.rect(-12 * s, -45 * s, 24 * s, 4 * s).fill(0xe5383b);
  g.moveTo(-12 * s, -43 * s).lineTo(-22 * s, -48 * s).moveTo(-12 * s, -43 * s).lineTo(-21 * s, -38 * s).stroke({ width: 3 * s, color: 0xe5383b });
};
const chameleon = (s: number, skin: number, tongue: boolean): Draw => (g) => {
  g.moveTo(-14 * s, -6 * s).quadraticCurveTo(-28 * s, -4 * s, -24 * s, -14 * s).quadraticCurveTo(-20 * s, -18 * s, -18 * s, -12 * s).stroke({ width: 4 * s, color: skin });
  g.ellipse(0, -9 * s, 15 * s, 8 * s).fill(skin).stroke(line(s, 2));
  g.poly([10 * s, -16 * s, 22 * s, -8 * s, 10 * s, -2 * s]).fill(skin).stroke(line(s, 2));
  g.circle(13 * s, -11 * s, 4 * s).fill(0xffffff).stroke(line(s, 1.2)).circle(14 * s, -11 * s, 1.6 * s).fill(INK);
  g.moveTo(-6 * s, -2 * s).lineTo(-8 * s, 2 * s).moveTo(6 * s, -2 * s).lineTo(8 * s, 2 * s).stroke(line(s, 2));
  if (tongue) g.moveTo(22 * s, -8 * s).lineTo(40 * s, -12 * s).stroke({ width: 2.5 * s, color: 0xff6b9d }).circle(41 * s, -12 * s, 3 * s).fill(0xff6b9d);
};
const hummingbird = (s: number): Draw => (g) => {
  g.ellipse(-4 * s, -14 * s, 8 * s, 4 * s).fill({ color: 0xd0ebff, alpha: 0.9 }).stroke(line(s, 1));
  g.ellipse(0, -8 * s, 9 * s, 6 * s).fill(0x20c997).stroke(line(s, 1.8));
  g.circle(8 * s, -10 * s, 5 * s).fill(0xe64980).stroke(line(s, 1.5));
  g.moveTo(12 * s, -10 * s).lineTo(24 * s, -9 * s).stroke(line(s, 1.5));
  g.circle(9 * s, -11 * s, 1.2 * s).fill(INK);
  g.poly([-8 * s, -8 * s, -18 * s, -4 * s, -16 * s, -10 * s]).fill(0x0ca678);
};
const sealFace = (s: number): Draw => (g) => {
  g.ellipse(0, -16 * s, 16 * s, 18 * s).fill(0x868e96).stroke(line(s));
  g.circle(-6 * s, -22 * s, 3.5 * s).fill(INK).circle(6 * s, -22 * s, 3.5 * s).fill(INK);
  g.circle(-5 * s, -23 * s, 1.2 * s).fill(0xffffff).circle(7 * s, -23 * s, 1.2 * s).fill(0xffffff);
  g.ellipse(0, -13 * s, 7 * s, 5 * s).fill(0xadb5bd);
  g.circle(0, -15 * s, 2.5 * s).fill(INK);
  g.moveTo(-4 * s, -12 * s).lineTo(-15 * s, -14 * s).moveTo(4 * s, -12 * s).lineTo(15 * s, -14 * s).stroke(line(s, 1));
};
const pigFace = (s: number): Draw => (g) => {
  g.poly([-14 * s, -26 * s, -16 * s, -40 * s, -4 * s, -32 * s]).fill(0xffa8c5).stroke(line(s, 2));
  g.poly([14 * s, -26 * s, 16 * s, -40 * s, 4 * s, -32 * s]).fill(0xffa8c5).stroke(line(s, 2));
  g.circle(0, -20 * s, 17 * s).fill(0xffc9de).stroke(line(s));
  g.ellipse(0, -14 * s, 8 * s, 6 * s).fill(0xffa8c5).stroke(line(s, 1.8));
  g.circle(-3 * s, -14 * s, 1.6 * s).fill(0xd6336c).circle(3 * s, -14 * s, 1.6 * s).fill(0xd6336c);
  g.circle(-6 * s, -25 * s, 2 * s).fill(INK).circle(6 * s, -25 * s, 2 * s).fill(INK);
};
const hen = (s: number): Draw => (g) => {
  g.ellipse(0, -16 * s, 20 * s, 15 * s).fill(0xc2703d).stroke(line(s));
  g.circle(14 * s, -30 * s, 9 * s).fill(0xc2703d).stroke(line(s));
  g.poly([12 * s, -39 * s, 15 * s, -45 * s, 18 * s, -39 * s, 21 * s, -43 * s, 21 * s, -36 * s]).fill(0xe5383b).stroke(line(s, 1.2));
  g.poly([22 * s, -31 * s, 28 * s, -29 * s, 22 * s, -27 * s]).fill(0xffa94d);
  g.circle(16 * s, -32 * s, 1.6 * s).fill(INK);
  g.ellipse(-4 * s, -16 * s, 10 * s, 6 * s).fill(0xa85a2a);
};
const chick = (s: number): Draw => (g) => {
  g.circle(0, -10 * s, 10 * s).fill(0xffe066).stroke(line(s, 2));
  g.circle(3 * s, -12 * s, 1.5 * s).fill(INK);
  g.poly([8 * s, -11 * s, 12 * s, -10 * s, 8 * s, -8 * s]).fill(0xffa94d);
  g.poly([-8 * s, -16 * s, -4 * s, -21 * s, 0, -16 * s]).fill(0xffffff).stroke(line(s, 1.2));
};

// ---------------------------------------------------------------------------
export function moreZoo(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.1;
  // 1. a peacock strolling the path: tap and it fans its tail
  crawler(kit, cleanups, { from: { x: -1.2 * w, y: h * 0.865 }, to: { x: 2.9 * w, y: h * 0.865 }, who: peacock(s * 1.5, false), hiding: peacock(s * 1.5, true), size: 56 * s, speed: 22 * s, how: 'hide', sound: () => sfx.squawk(1.3) });
  // 2. a sleepy koala hugging the tree (tap: awake, munching a leaf)
  opener(kit, cleanups, {
    x: 0.1 * w, y: h * 0.53, closed: koala(s, false), open: koala(s, true), shutAfter: 2400,
    hit: new Rectangle(-24 * s, -58 * s, 48 * s, 60 * s), sound: () => sfx.munch(), onOpen: () => hearts(kit.sparkles, 0.1 * w, h * 0.53 - 60 * s, 3),
  });
  // 3. a baby penguin who's wandered off, hiding round the zoo
  hider(kit, cleanups, {
    spots: [{ x: -1.3 * w, y: h * 0.95 }, { x: -0.9 * w, y: h * 0.86 }, { x: 0.32 * w, y: h * 0.95 }, { x: 1.1 * w, y: h * 0.86 }, { x: 2.0 * w, y: h * 0.95 }, { x: 3.0 * w, y: h * 0.86 }],
    who: penguin(s), size: 40 * s, sound: () => sfx.squeak(1.5),
  });
  // 4. a sloth hanging from the big flat-topped tree
  dangler(kit, cleanups, { x: -0.39 * w, top: h * 0.27, drop: h * 0.2, who: sloth(s), size: 30 * s, color: 0x2f9e44, sound: () => sfx.giggle(0.7) });
  // 5. a lion cub peeking out from behind the bush by the lion's rock
  peeker(kit, cleanups, {
    x: 1.81 * w, y: h * 0.7, rise: 34 * s, sideways: 1, who: bearFace(s, 0xe8a24a, 0xfff3e0), rare: mouseFace(s),
    hole: (g) => g.rect(0, -70 * s, 70 * s, 72 * s).fill(0xffffff),
    hit: new Rectangle(-6 * s, -40 * s, 34 * s, 44 * s), sound: () => sfx.rawr(), rareSound: () => sfx.squeak(1.8),
  });
}

// ---------------------------------------------------------------------------
export function moreFair(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.4, gy = h * 0.66;
  // 1. the strongman bell: ring it (or not quite)
  {
    const x = 0.85 * w, top = gy - h * 0.38;
    const c = new Container();
    c.position.set(x, gy);
    kit.under.addChild(c);
    drawn((g) => {
      g.rect(-7 * s, -h * 0.38, 14 * s, h * 0.38).fill(0xffffff).stroke(line(s, 2));
      for (let i = 1; i < 6; i++) g.rect(-7 * s, -h * 0.38 * (i / 6), 14 * s, 3 * s).fill([0x69db7c, 0xffd43b, 0xffa94d, 0xff6b6b, 0xe64980][i - 1]);
      g.circle(0, -h * 0.38 - 12 * s, 13 * s).fill(0xffd43b).stroke(line(s, 2));
      g.roundRect(-30 * s, -10 * s, 60 * s, 12 * s, 4 * s).fill(0xe5383b).stroke(line(s, 2));
    }, c);
    const puck = drawn((g) => g.roundRect(-11 * s, -6 * s, 22 * s, 10 * s, 4 * s).fill(0x343a40), c, 0, -14 * s);
    tappable(c, oneAtATime((done) => {
      sfx.clank();
      const rings = Math.random() < 0.5;
      const peak = rings ? h * 0.38 - 6 * s : h * 0.38 * rand(0.35, 0.85);
      tween(1300, (k) => (puck.y = -14 * s - peak * Math.sin(k * Math.PI)), () => done());
      if (rings) later(640, () => {
        sfx.ding();
        sfx.yippee(1.1);
        burst(kit.sparkles, x, top - 10 * s, 14, 80);
      }, cleanups);
    }), new Rectangle(-32 * s, -h * 0.38 - 28 * s, 64 * s, h * 0.38 + 32 * s));
  }
  // 2. a clown peeking out of the big tent
  peeker(kit, cleanups, {
    x: 1.74 * w, y: gy, rise: 52 * s, who: clownFace(s), rare: bearFace(s),
    hole: (g) => g.poly([-0.03 * w, 0, 0.03 * w, 0, 0, -0.17 * h]).fill(0xffffff),
    hit: new Rectangle(-0.03 * w, -60 * s, 0.06 * w, 62 * s), sound: () => (sfx.honk(), sfx.giggle(1.1)), rareSound: () => sfx.giggle(1.3),
  });
  // 3. a popcorn cart: pop pop pop
  {
    const x = 0.08 * w;
    const c = new Container();
    c.position.set(x, gy);
    kit.under.addChild(c);
    drawn((g) => {
      g.circle(-16 * s, -6 * s, 6 * s).fill(0x343a40).circle(16 * s, -6 * s, 6 * s).fill(0x343a40);
      g.roundRect(-26 * s, -36 * s, 52 * s, 28 * s, 4 * s).fill(0xe5383b).stroke(line(s, 2));
      g.rect(-22 * s, -80 * s, 44 * s, 44 * s).fill({ color: 0xfff9db, alpha: 0.9 }).stroke(line(s, 2));
      for (let i = 0; i < 18; i++) g.circle(rand(-18, 18) * s, -40 * s - rand(0, 18) * s, 4 * s).fill(0xfff3bf).stroke({ width: 1, color: 0xe0c070 });
      g.poly([-28 * s, -80 * s, 28 * s, -80 * s, 18 * s, -94 * s, -18 * s, -94 * s]).fill(0xe5383b).stroke(line(s, 2));
    }, c);
    tappable(c, oneAtATime((done) => {
      for (let i = 0; i < 16; i++) later(i * 70, () => {
        sfx.pop(1.3 + Math.random());
        const p = new Graphics().circle(0, 0, 5 * s).fill(0xfff3bf).stroke({ width: 1.2 * s, color: 0xe0c070 });
        p.position.set(x + rand(-12, 12) * s, gy - 80 * s);
        kit.over.addChild(p);
        const vx = rand(-90, 90) * s, up = rand(60, 140) * s;
        tween(900, (k) => p.position.set(x + vx * k, gy - 80 * s - up * Math.sin(k * Math.PI) + k * 70 * s), () => p.destroy());
      }, cleanups);
      later(1300, done, cleanups);
    }), new Rectangle(-30 * s, -96 * s, 60 * s, 98 * s));
  }
  // 4. a lost prize teddy, hiding round the fair
  hider(kit, cleanups, {
    spots: [{ x: -0.66 * w, y: gy + 6 * s }, { x: -0.12 * w, y: gy + 16 * s }, { x: 0.48 * w, y: gy + 22 * s }, { x: 1.0 * w, y: gy + 6 * s }, { x: 1.45 * w, y: gy + 10 * s }, { x: -0.77 * w, y: h * 0.94 }],
    who: teddy(s, 0xff8fab), size: 38 * s,
  });
  // 5. a pinwheel in the grass
  drawn((g) => g.moveTo(0.3 * w, h * 0.9).lineTo(0.3 * w, h * 0.9 + 60 * s).stroke({ width: 4 * s, color: 0x8d5a3b }), kit.under);
  jiggler(kit, cleanups, {
    x: 0.3 * w, y: h * 0.9, how: 'spin', ms: 1600, sound: () => sfx.whirr(),
    hit: new Rectangle(-30 * s, -30 * s, 60 * s, 60 * s),
    draw: (g) => {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.poly([0, 0, Math.cos(a) * 24 * s, Math.sin(a) * 24 * s, Math.cos(a + 0.9) * 18 * s, Math.sin(a + 0.9) * 18 * s]).fill([0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c][i]).stroke(line(s, 1.5));
      }
      g.circle(0, 0, 3.5 * s).fill(0xffffff).stroke(line(s, 1.5));
    },
  });
}

// ---------------------------------------------------------------------------
export function moreNiagara(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.5;
  // 1. a fish leaping out of the river
  peeker(kit, cleanups, {
    x: -0.05 * w, y: h * 0.66, rise: 60 * s, who: fish(s * 1.3, 0xff922b), rare: fish(s * 1.3, 0xb197fc),
    hole: (g) => g.rect(-50 * s, -90 * s, 100 * s, 90 * s).fill(0xffffff),
    hit: new Rectangle(-40 * s, -30 * s, 80 * s, 50 * s), stay: 600,
    sound: () => (sfx.blub(), spray(kit, -0.05 * w, h * 0.66, 0, -0.35, 200, 0x74c0fc, h * 0.7)),
  });
  // 2. a canoe paddling along the river
  crawler(kit, cleanups, {
    from: { x: -0.7 * w, y: h * 0.69 }, to: { x: 1.8 * w, y: h * 0.69 }, size: 40 * s, speed: 18 * s, how: 'hop', sound: () => sfx.water(0.6),
    who: (g) => {
      g.circle(2 * s, -26 * s, 6 * s).fill(0xffd8b5).stroke(line(s, 1.5));
      g.roundRect(-4 * s, -20 * s, 12 * s, 12 * s, 3 * s).fill(0xffd43b).stroke(line(s, 1.5));
      g.moveTo(14 * s, -24 * s).lineTo(-6 * s, 6 * s).stroke({ width: 3 * s, color: 0x8d5a3b });
      g.moveTo(-34 * s, -10 * s).quadraticCurveTo(0, 6 * s, 34 * s, -10 * s).lineTo(28 * s, -6 * s).lineTo(-28 * s, -6 * s).closePath().fill(0xe5383b).stroke(line(s, 2));
    },
  });
  // 3. a seagull on the railing
  flier(kit, cleanups, {
    rests: [-0.6, 0.1, 0.95, 1.35, 1.8].map((f) => ({ x: f * w, y: h * 0.715 })),
    who: bird(s, 0xf8f9fa), size: 30 * s, area: { x0: -0.8 * w, x1: 1.9 * w, y0: h * 0.1, y1: h * 0.55 }, sound: () => sfx.squawk(1.6),
  });
  // 4. an umbrella on the path: pop! (handy in the mist)
  opener(kit, cleanups, {
    x: 1.2 * w, y: h * 0.95, shutAfter: 2600,
    closed: (g) => g.moveTo(0, 0).lineTo(0, -60 * s).stroke(line(s, 2.5)).poly([-6 * s, -24 * s, 6 * s, -24 * s, 2 * s, -64 * s, -2 * s, -64 * s]).fill(0x9775fa).stroke(line(s, 2)).arc(-5 * s, 0, 5 * s, 0, Math.PI).stroke(line(s, 2.5)),
    open: (g) => {
      g.moveTo(0, 0).lineTo(0, -66 * s).stroke(line(s, 2.5)).arc(-5 * s, 0, 5 * s, 0, Math.PI).stroke(line(s, 2.5));
      g.moveTo(-42 * s, -60 * s).quadraticCurveTo(0, -112 * s, 42 * s, -60 * s).closePath().fill(0x9775fa).stroke(line(s, 2));
      g.moveTo(-14 * s, -60 * s).quadraticCurveTo(-8 * s, -90 * s, 0, -86 * s).quadraticCurveTo(8 * s, -90 * s, 14 * s, -60 * s).fill(0xffd43b).stroke(line(s, 1.5));
    },
    hit: new Rectangle(-44 * s, -110 * s, 88 * s, 112 * s),
    sound: () => sfx.poof(),
    onOpen: () => {
      for (let i = 0; i < 4; i++) later(i * 300, () => spray(kit, 1.2 * w + rand(-30, 30) * s, h * 0.95 - 230 * s, 0, 0.05, 100, 0x74c0fc, h * 0.95 - 90 * s), cleanups);
    },
  });
  // 5. a moose peeking over the bushes at the top of the falls
  peeker(kit, cleanups, {
    x: 1.32 * w, y: h * 0.175, rise: 56 * s, who: mooseFace(s), rare: bearFace(s * 1.2, 0x5c3d2e, 0xa98467),
    hole: (g) => g.rect(-60 * s, -100 * s, 120 * s, 100 * s).fill(0xffffff),
    front: (g) => {
      for (const dx of [-22, 0, 22]) g.circle(dx * s, 2 * s, 13 * s).fill(0x2f7d4f).stroke(line(s, 1.5));
    },
    hit: new Rectangle(-36 * s, -50 * s, 72 * s, 64 * s), sound: () => sfx.grunt(0.7), rareSound: () => sfx.rawr(), stay: 2000,
  });
}

// ---------------------------------------------------------------------------
export function moreNinja(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.74;
  // 1. a punching bag
  jiggler(kit, cleanups, {
    x: 1.0 * w, y: h * 0.06, how: 'swing', ms: 1000, sound: () => (sfx.drum(), sfx.grunt(1.2)),
    hit: new Rectangle(-26 * s, h * 0.12, 52 * s, 110 * s),
    draw: (g) => {
      g.moveTo(0, 0).lineTo(0, h * 0.12).stroke({ width: 3 * s, color: 0xadb5bd });
      g.roundRect(-22 * s, h * 0.12, 44 * s, 110 * s, 14 * s).fill(0xe5383b).stroke(line(s));
      g.rect(-22 * s, h * 0.12 + 20 * s, 44 * s, 8 * s).fill(0x212529).rect(-22 * s, h * 0.12 + 82 * s, 44 * s, 8 * s).fill(0x212529);
    },
  });
  // 2. a little ninja who vanishes in a puff and pops up somewhere else
  hider(kit, cleanups, {
    spots: [{ x: 0.8 * w, y: h * 0.296 }, { x: 0.3 * w, y: h * 0.205 }, { x: -0.43 * w, y: h * 0.56 }, { x: 1.48 * w, y: h * 0.14 }, { x: 1.66 * w, y: h * 0.66 }, { x: 0.56 * w, y: fy }],
    who: ninjaKid(s * 1.1), size: 42 * s, sound: () => (sfx.whoosh(), sfx.giggle(1.2)),
  });
  // 3. a target: foam stars fly in and stick
  {
    const x = 1.28 * w, y = h * 0.32, r = 40 * s;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => {
      for (let i = 4; i >= 1; i--) g.circle(0, 0, (r * i) / 4).fill(i % 2 ? 0xe5383b : 0xffffff);
      g.circle(0, 0, r).stroke(line(s));
    }, c);
    const stuck = new Container();
    c.addChild(stuck);
    tappable(c, oneAtATime((done) => {
      sfx.whoosh();
      const star = new Graphics().star(0, 0, 4, 12 * s, 4 * s).fill(pick([0xffd43b, 0x4dabf7, 0x69db7c])).stroke(line(s, 1.5));
      const to = { x: rand(-0.6, 0.6) * r, y: rand(-0.6, 0.6) * r };
      star.position.set(260 * s, -120 * s);
      stuck.addChild(star);
      tween(380, (k) => {
        star.position.set(260 * s + (to.x - 260 * s) * k, -120 * s + (to.y + 120 * s) * k);
        star.rotation = k * 12;
      }, () => {
        sfx.snap();
        sfx.boing(1.5);
        tween(300, (k) => (c.rotation = Math.sin(k * Math.PI * 4) * 0.05 * (1 - k)), () => (c.rotation = 0));
        if (stuck.children.length > 6) stuck.children[0].destroy();
        done();
      });
    }), new Rectangle(-r - 4 * s, -r - 4 * s, 2 * r + 8 * s, 2 * r + 8 * s));
  }
  // 4. a big gong: BONG
  {
    const x = 1.16 * w;
    const c = new Container();
    c.position.set(x, fy);
    kit.under.addChild(c);
    drawn((g) => {
      g.rect(-40 * s, -130 * s, 8 * s, 130 * s).fill(0x8d5a3b).stroke(line(s, 1.5)).rect(32 * s, -130 * s, 8 * s, 130 * s).fill(0x8d5a3b).stroke(line(s, 1.5));
      g.rect(-46 * s, -136 * s, 92 * s, 10 * s).fill(0x8d5a3b).stroke(line(s, 1.5));
    }, c);
    const disc = drawn((g) => g.moveTo(0, -126 * s).lineTo(0, -110 * s).stroke(line(s, 1.5)).circle(0, -76 * s, 32 * s).fill(0xe0a800).stroke(line(s)).circle(0, -76 * s, 12 * s).fill(0xffd43b).stroke(line(s, 1.5)), c);
    tappable(c, oneAtATime((done) => {
      sfx.bell();
      sfx.clank();
      tween(1400, (k) => (disc.x = Math.sin(k * 80) * 3 * s * (1 - k)), () => ((disc.x = 0), done()));
    }), new Rectangle(-48 * s, -138 * s, 96 * s, 140 * s));
  }
  // 5. a chalk bag: a puff of chalk
  {
    const s = (h / 800) * 1.4;
    const x = 0.01 * w, y = h * 0.48;
    jiggler(kit, cleanups, {
      x, y, how: 'sway', hit: new Rectangle(-20 * s, -6 * s, 40 * s, 46 * s),
      sound: () => {
        sfx.puff(1.5);
        for (let i = 0; i < 3; i++) spray(kit, x + rand(-6, 6) * s, y + 12 * s, rand(-0.1, 0.1), -0.25, 150, 0xf8f9fa, y + 80 * s);
      },
      draw: (g) => g.circle(0, 0, 3 * s).fill(INK).moveTo(0, 0).lineTo(0, 8 * s).stroke(line(s, 1.5)).roundRect(-14 * s, 8 * s, 28 * s, 30 * s, 8 * s).fill(0x4dabf7).stroke(line(s, 2)).ellipse(0, 10 * s, 12 * s, 4 * s).fill(0xffffff),
    });
  }
}

// ---------------------------------------------------------------------------
export function moreConservatory(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.3, fy = h * 0.74;
  // 1. a chameleon climbing the palm: tap and it changes colour (and flicks its tongue)
  crawler(kit, cleanups, {
    from: { x: 0.42 * w, y: h * 0.66 }, to: { x: 0.42 * w, y: h * 0.4 }, size: 26 * s, speed: 6 * s, how: 'hide',
    who: chameleon(s, 0x51cf66, false), hiding: chameleon(s, pick([0xff6b9d, 0xffa94d, 0x9775fa]), true), sound: () => sfx.pling(),
  });
  // 2. a little blue frog in the koi pond
  peeker(kit, cleanups, {
    x: 1.3 * w, y: h * 0.82, rise: 28 * s, who: frog(s, 0x4dabf7, 0x1c7ed6), rare: frog(s, 0xff6b6b, 0xe03131),
    back: (g) => g.ellipse(0, 0, 20 * s, 6 * s).fill(0x51cf66).stroke(line(s, 1.5)),
    hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 70 * s).fill(0xffffff),
    hit: new Rectangle(-28 * s, -36 * s, 56 * s, 44 * s), sound: () => (sfx.blub(), sfx.boing(0.8)),
  });
  // 3. a hummingbird, darting from flower to flower
  flier(kit, cleanups, {
    rests: [0.07, 0.29, 0.56, 0.79].map((f) => ({ x: f * w, y: h * 0.55 })),
    who: hummingbird(s * 1.2), size: 26 * s, ms: 1300, area: { x0: -0.1 * w, x1: 0.95 * w, y0: h * 0.25, y1: h * 0.55 }, sound: () => sfx.buzz(1.8),
  });
  // 4. a (friendly) snappy plant in a pot
  {
    const x = 0.885 * w;
    const c = new Container();
    c.position.set(x, fy);
    kit.under.addChild(c);
    drawn((g) => g.poly([-16 * s, 0, 16 * s, 0, 20 * s, -24 * s, -20 * s, -24 * s]).fill(0xe8590c).stroke(line(s, 2)).moveTo(0, -24 * s).quadraticCurveTo(-8 * s, -44 * s, 0, -58 * s).stroke({ width: 3 * s, color: 0x2f9e44 }), c);
    const jaws = [-1, 1].map((side) => {
      const j = new Graphics();
      j.moveTo(0, 0).quadraticCurveTo(side * 6 * s, -18 * s, side * 22 * s, -20 * s).quadraticCurveTo(side * 16 * s, -4 * s, 0, 0).fill(side < 0 ? 0x69db7c : 0x51cf66).stroke(line(s, 1.8));
      j.moveTo(side * 22 * s, -20 * s).quadraticCurveTo(side * 8 * s, -16 * s, 0, 0).stroke({ width: 2 * s, color: 0xe03131 });
      for (let i = 1; i < 4; i++) j.moveTo(side * (5 + i * 5) * s, (-8 - i * 3) * s).lineTo(side * (7 + i * 5) * s, (-12 - i * 3) * s);
      j.stroke(line(s, 1));
      j.position.set(0, -58 * s);
      j.rotation = side * -0.5;
      c.addChild(j);
      return j;
    });
    tappable(c, oneAtATime((done) => {
      sfx.snap();
      tween(160, (k) => jaws.forEach((j, i) => (j.rotation = (i ? 1 : -1) * -0.5 * (1 - k) + (i ? -1 : 1) * 0.6 * k)), () => later(700, () => {
        sfx.munch();
        later(400, () => (sfx.giggle(0.8), burst(kit.sparkles, x, fy - 80 * s, 6, 40)), cleanups);
        tween(500, (k) => jaws.forEach((j, i) => (j.rotation = (i ? -1 : 1) * 0.6 * (1 - k) + (i ? 1 : -1) * -0.5 * k)), done);
      }, cleanups));
    }), new Rectangle(-26 * s, -90 * s, 52 * s, 92 * s));
  }
  // 5. a sunflower that grows bigger each tap (then starts again from a seed)
  {
    const x = 1.39 * w;
    const c = new Container();
    c.position.set(x, fy);
    kit.under.addChild(c);
    drawn((g) => g.poly([-14 * s, 0, 14 * s, 0, 17 * s, -20 * s, -17 * s, -20 * s]).fill(0xc68b59).stroke(line(s, 2)), c);
    const plant = new Graphics();
    c.addChild(plant);
    let stage = 0;
    const draw = () => {
      plant.clear();
      const tall = [10, 40, 80, 120][stage] * s;
      plant.moveTo(0, -20 * s).lineTo(0, -20 * s - tall).stroke({ width: 4 * s, color: 0x2f9e44 });
      if (stage >= 1) plant.ellipse(-10 * s, -20 * s - tall * 0.5, 9 * s, 4 * s).fill(0x51cf66).ellipse(10 * s, -20 * s - tall * 0.6, 9 * s, 4 * s).fill(0x51cf66);
      const top = -20 * s - tall;
      if (stage === 2) plant.circle(0, top, 8 * s).fill(0x69db7c).stroke(line(s, 1.5));
      if (stage === 3) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          plant.ellipse(Math.cos(a) * 20 * s, top + Math.sin(a) * 20 * s, 9 * s, 5 * s).fill(0xffd43b).stroke(line(s, 1));
        }
        plant.circle(0, top, 13 * s).fill(0x7f5539).stroke(line(s, 1.5));
        plant.circle(-4 * s, top - 2 * s, 1.8 * s).fill(INK).circle(4 * s, top - 2 * s, 1.8 * s).fill(INK).arc(0, top + 2 * s, 5 * s, 0.3, Math.PI - 0.3).stroke(line(s, 1.5));
      }
    };
    draw();
    tappable(c, () => {
      stage = (stage + 1) % 4;
      if (stage === 0) sfx.poof();
      else if (stage === 3) (sfx.tada(), burst(kit.sparkles, x, fy - 140 * s, 12, 70));
      else sfx.pop(0.8 + stage * 0.3);
      draw();
      plant.scale.set(0.8);
      tween(300, (k) => plant.scale.set(0.8 + 0.2 * ease.outBack(k)));
    }, new Rectangle(-30 * s, -170 * s, 60 * s, 172 * s));
  }
}

// ---------------------------------------------------------------------------
export function moreArena(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.25;
  // 1. a penguin skating across the ice
  crawler(kit, cleanups, { from: { x: -0.3 * w, y: h * 0.94 }, to: { x: 1.3 * w, y: h * 0.94 }, who: penguin(s * 1.1, false), size: 34 * s, speed: 70 * s, how: 'spin', sound: () => sfx.slideWhistle(1.3) });
  // 2. a t-shirt cannon: fire one into the crowd
  {
    const x = 0.22 * w, y = h * 0.57;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => {
      g.circle(-8 * s, -6 * s, 8 * s).fill(0x343a40).circle(14 * s, -6 * s, 8 * s).fill(0x343a40);
      g.roundRect(-20 * s, -38 * s, 52 * s, 20 * s, 8 * s).fill(0x868e96).stroke(line(s, 2));
      g.circle(34 * s, -28 * s, 10 * s).fill(0x495057).stroke(line(s, 2));
    }, c);
    c.rotation = -0.4;
    tappable(c, oneAtATime((done) => {
      sfx.poof();
      const shirt = new Graphics().poly([-14 * s, -10 * s, -6 * s, -14 * s, 6 * s, -14 * s, 14 * s, -10 * s, 18 * s, -2 * s, 10 * s, 0, 10 * s, 14 * s, -10 * s, 14 * s, -10 * s, 0, -18 * s, -2 * s]).fill(pick([0xe5383b, 0x4dabf7, 0xffd43b, 0x20c997])).stroke(line(s, 1.5));
      kit.over.addChild(shirt);
      const to = { x: x + rand(-260, 260) * s, y: h * rand(0.12, 0.3) };
      tween(900, (k) => {
        shirt.position.set(x + (to.x - x) * k, y - 40 * s + (to.y - y + 40 * s) * k - Math.sin(k * Math.PI) * 140 * s);
        shirt.rotation = k * 8;
        shirt.scale.set(1 - k * 0.5);
      }, () => {
        sfx.yippee(1.1);
        burst(kit.sparkles, to.x, to.y, 10, 60);
        shirt.destroy();
        done();
      });
    }), new Rectangle(-24 * s, -52 * s, 72 * s, 56 * s));
  }
  // 3. a big foam finger waving up in the stands
  peeker(kit, cleanups, {
    x: 1.08 * w, y: h * 0.4, rise: 70 * s, stay: 1800,
    who: (g) => {
      g.roundRect(-14 * s, -40 * s, 28 * s, 40 * s, 6 * s).fill(0xffd43b).stroke(line(s, 2));
      g.roundRect(-6 * s, -72 * s, 12 * s, 36 * s, 6 * s).fill(0xffd43b).stroke(line(s, 2));
      g.roundRect(-20 * s, -36 * s, 10 * s, 16 * s, 5 * s).fill(0xffd43b).stroke(line(s, 1.5));
    },
    hole: (g) => g.rect(-40 * s, -100 * s, 80 * s, 100 * s).fill(0xffffff),
    hit: new Rectangle(-24 * s, -50 * s, 48 * s, 50 * s), sound: () => sfx.yippee(1.2),
  });
  // 4. a seal popping up through a hole in the ice
  peeker(kit, cleanups, {
    x: -0.2 * w, y: h * 0.95, rise: 36 * s, who: sealFace(s * 1.1), rare: penguin(s),
    back: (g) => g.ellipse(0, 0, 26 * s, 8 * s).fill(0x1c3d6e).stroke({ width: 2 * s, color: 0xa5d8ff }),
    hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 70 * s).fill(0xffffff),
    hit: new Rectangle(-30 * s, -40 * s, 60 * s, 50 * s), sound: () => (sfx.blub(), sfx.honk()), rareSound: () => sfx.squeak(1.4),
  });
  // 5. a disco ball that comes down from the roof
  dangler(kit, cleanups, {
    x: 0.9 * w, top: 0, drop: h * 0.24, size: 28 * s, color: 0xced4da,
    sound: () => (sfx.tune([523, 659, 784, 1047, 784, 659], 0.14), burst(kit.sparkles, 0.9 * w, h * 0.24, 16, 160)),
    who: (g) => {
      g.circle(0, 0, 20 * s).fill(0xced4da).stroke(line(s, 2));
      for (let i = -2; i <= 2; i++) g.moveTo(-20 * s, i * 7 * s).lineTo(20 * s, i * 7 * s).moveTo(i * 7 * s, -20 * s).lineTo(i * 7 * s, 20 * s);
      g.stroke({ width: 1, color: 0x868e96 });
      g.circle(-7 * s, -7 * s, 4 * s).fill(0xffffff).circle(6 * s, 4 * s, 3 * s).fill(0xd0ebff);
    },
  });
}

// ---------------------------------------------------------------------------
export function morePigs(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.4;
  // 1. a piglet peeking out of the round window
  {
    const r = 0.035 * w;
    peeker(kit, cleanups, {
      x: -0.47 * w, y: h * 0.44 + r, rise: 2 * r, who: pigFace(s), rare: mouseFace(s),
      hole: (g) => g.circle(0, -r, r).fill(0xffffff),
      hit: new Rectangle(-r, -2 * r, 2 * r, 2 * r), sound: () => sfx.oink(1.4), rareSound: () => sfx.squeak(1.8),
    });
  }
  // 2. the chimney: puffs of smoke (and sometimes a heart)
  {
    const x = -0.183 * w, y = h * 0.1;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    tappable(c, oneAtATime((done) => {
      sfx.puff(0.9);
      const heart = Math.random() < 0.3;
      for (let i = 0; i < 5; i++) later(i * 220, () => {
        const p = new Graphics();
        if (heart && i === 4) p.moveTo(0, 8 * s).bezierCurveTo(-18 * s, -6 * s, -8 * s, -20 * s, 0, -9 * s).bezierCurveTo(8 * s, -20 * s, 18 * s, -6 * s, 0, 8 * s).fill({ color: 0xff8fab, alpha: 0.9 });
        else p.circle(0, 0, 10 * s).fill({ color: 0xdee2e6, alpha: 0.9 });
        p.position.set(x, y - 6 * s);
        kit.over.addChild(p);
        tween(1600, (k) => {
          p.position.set(x + Math.sin(k * 5) * 10 * s + k * 30 * s, y - 6 * s - k * 120 * s);
          p.scale.set(1 + k * 1.2);
          p.alpha = 1 - k;
        }, () => p.destroy());
      }, cleanups);
      later(1300, done, cleanups);
    }), new Rectangle(-24 * s, -16 * s, 48 * s, 56 * s));
  }
  // 3. a hen on her nest: up she gets, and there's a chick
  opener(kit, cleanups, {
    x: 0.0 * w, y: h * 0.69, shutAfter: 2600, inside: [chick(s), chick(s), (g) => g.ellipse(0, -9 * s, 8 * s, 10 * s).fill(0xfff9db).stroke(line(s, 1.5))], from: { x: 0, y: -8 * s }, up: 6 * s, inFront: true,
    closed: (g) => (g.ellipse(0, -4 * s, 26 * s, 8 * s).fill(0xd9a066).stroke(line(s, 2)), hen(s)(g)),
    open: (g) => {
      g.ellipse(0, -4 * s, 26 * s, 8 * s).fill(0xd9a066).stroke(line(s, 2));
      g.ellipse(0, -6 * s, 18 * s, 5 * s).fill(0xa0703e);
      g.moveTo(34 * s, 0).lineTo(34 * s, -6 * s).moveTo(40 * s, 0).lineTo(40 * s, -6 * s).stroke({ width: 2 * s, color: 0xffa94d });
      g.ellipse(38 * s, -20 * s, 16 * s, 13 * s).fill(0xc2703d).stroke(line(s));
      g.circle(50 * s, -34 * s, 8 * s).fill(0xc2703d).stroke(line(s));
      g.poly([48 * s, -42 * s, 51 * s, -47 * s, 55 * s, -41 * s]).fill(0xe5383b);
      g.poly([57 * s, -35 * s, 63 * s, -33 * s, 57 * s, -31 * s]).fill(0xffa94d);
      g.circle(52 * s, -36 * s, 1.6 * s).fill(INK);
    },
    hit: new Rectangle(-30 * s, -48 * s, 62 * s, 52 * s), sound: () => (sfx.squawk(1.8), later(500, () => sfx.chirp(), cleanups)),
  });
  // 4. a bumblebee visiting the pumpkins and the window boxes
  flier(kit, cleanups, {
    rests: [{ x: 0.17 * w, y: h * 0.575 }, { x: 0.26 * w, y: h * 0.575 }, { x: -0.47 * w, y: h * 0.495 }, { x: -0.24 * w, y: h * 0.495 }],
    who: bug(s * 1.3, 'bee'), size: 26 * s, area: { x0: -0.6 * w, x1: 0.5 * w, y0: h * 0.3, y1: h * 0.68 }, sound: () => sfx.buzz(),
  });
  // 5. apples in the tree: tap the leaves and one drops
  {
    const cx = 1.04 * w, cy = h * 0.11, r = 0.085 * w, ground = h * 0.74;
    const spots = [{ x: -0.5, y: -0.2 }, { x: 0.3, y: -0.45 }, { x: 0.45, y: 0.25 }, { x: -0.2, y: 0.4 }, { x: 0.05, y: 0.05 }];
    const apples = spots.map((p) => {
      const a = new Graphics().circle(0, 0, 9 * s).fill(0xe5383b).stroke(line(s, 1.5)).moveTo(0, -9 * s).lineTo(2 * s, -14 * s).stroke(line(s, 1.5)).ellipse(5 * s, -12 * s, 4 * s, 2 * s).fill(0x51cf66);
      a.position.set(cx + p.x * r, cy + p.y * r);
      kit.under.addChild(a);
      return { a, home: { x: cx + p.x * r, y: cy + p.y * r }, down: false };
    });
    const c = new Container();
    kit.under.addChild(c);
    tappable(c, () => {
      const left = apples.filter((p) => !p.down);
      if (!left.length) return;
      const p = pick(left);
      p.down = true;
      sfx.flutter();
      const from = { ...p.home }, roll = rand(-60, 60) * s;
      tween(900, (k) => {
        const fall = Math.min(1, k * 1.6);
        const y = from.y + (ground - from.y) * fall * fall - (k > 0.62 ? Math.sin(((k - 0.62) / 0.38) * Math.PI) * 30 * s : 0);
        p.a.position.set(from.x + (k > 0.62 ? roll * ((k - 0.62) / 0.38) : 0), y);
      }, () => {
        sfx.boing(1.6);
        later(3500, () => tween(400, (k) => (p.a.alpha = 1 - k), () => {
          p.a.position.set(p.home.x, p.home.y);
          p.a.scale.set(0.2);
          p.a.alpha = 1;
          tween(500, (k) => p.a.scale.set(0.2 + 0.8 * ease.outBack(k)), () => (p.down = false));
        }), cleanups);
      });
    }, new Rectangle(cx - r, cy - r, 2 * r, 2 * r));
  }
}
