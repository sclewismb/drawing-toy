import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { PALETTE, type Season } from '../seasons';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import {
  bezier,
  drawBird,
  everyFrame,
  glow,
  INK,
  later,
  oneAtATime,
  rainFrom,
  rand,
  spray,
  tappable,
  type Cleanups,
  type EggKit,
} from './common';

/** Surprises on the street and outside the house (the "parent" views). */

export interface StreetGeom {
  w: number;
  h: number;
  ground: number; // where buildings stand
  roadTop: number;
  roadH: number;
  slot: number; // width given to each building
  xs: number[]; // centre of each building, left to right (house first)
}

function car(colour: number) {
  const g = new Graphics();
  g.roundRect(-44, -22, 88, 26, 10).fill(colour).stroke({ width: 3, color: INK });
  g.roundRect(-24, -40, 46, 22, 8).fill(colour).stroke({ width: 3, color: INK });
  g.rect(-18, -35, 16, 12).rect(2, -35, 15, 12).fill(0xbfe8ff);
  g.circle(-26, 6, 10).circle(26, 6, 10).fill(0x2b2b2b).stroke({ width: 2, color: INK });
  g.circle(-26, 6, 4).circle(26, 6, 4).fill(0xc9c9c9);
  g.circle(42, -12, 4).fill(0xffe066);
  return g;
}

export function streetEggs(kit: EggKit, geom: StreetGeom, cleanups: Cleanups) {
  const { w, h, ground, roadTop, roadH, slot, xs } = geom;
  const pal = PALETTE[kit.season];

  // --- cars driving along the road; tap one to honk ---
  const lanes = [
    { y: roadTop + roadH * 0.32, dir: 1, colour: 0xe5383b, x: w * 0.1 },
    { y: roadTop + roadH * 0.8, dir: -1, colour: 0x4ea8ff, x: w * 0.7 },
  ];
  for (const lane of lanes) {
    const c = car(lane.colour);
    c.scale.set(Math.min(1.2, slot / 200));
    c.scale.x *= lane.dir;
    c.position.set(lane.x, lane.y);
    kit.over.addChild(c);
    let boost = 1;
    let hop = 0;
    everyFrame((dt) => {
      c.x += lane.dir * 0.07 * boost * dt;
      if (c.x > w + 80) c.x = -80;
      if (c.x < -80) c.x = w + 80;
      c.y = lane.y - hop;
    }, cleanups);
    tappable(c, oneAtATime((done) => {
      sfx.honk();
      tween(1200, (t) => {
        boost = 1 + 3 * Math.sin(t * Math.PI);
        hop = Math.abs(Math.sin(t * Math.PI * 3)) * 10;
      }, () => {
        boost = 1;
        hop = 0;
        done();
      });
    }), new Rectangle(-55, -50, 110, 66));
  }

  // --- a mailbox in front of the house: a letter pops out ---
  const mx = xs[0] - slot * 0.36, my = ground + h * 0.05;
  const box = new Container();
  const post = new Graphics().rect(-4, -34, 8, 34).fill(0x5c3d2e).stroke({ width: 2, color: INK });
  const body = new Graphics().roundRect(-16, -54, 32, 22, 8).fill(0x1f1f1f).stroke({ width: 2, color: INK });
  const flag = new Graphics().rect(0, -10, 4, 14).rect(0, -10, 12, 7).fill(0xe5383b);
  flag.position.set(14, -44);
  flag.rotation = Math.PI / 2;
  box.addChild(post, body, flag);
  box.position.set(mx, my);
  kit.under.addChild(box);
  tappable(box, oneAtATime((done) => {
    sfx.pop(1.3);
    tween(250, (t) => (flag.rotation = (Math.PI / 2) * (1 - t)));
    const letter = new Graphics();
    letter.rect(-14, -9, 28, 18).fill(0xffffff).stroke({ width: 2, color: INK });
    letter.moveTo(-14, -9).lineTo(0, 2).lineTo(14, -9).stroke({ width: 2, color: INK });
    letter.circle(-2, 2, 3).circle(2, 2, 3).fill(0xe5383b);
    letter.position.set(mx, my - 50);
    kit.over.addChild(letter);
    tween(1600, (t) => {
      letter.y = my - 50 - t * h * 0.25;
      letter.x = mx + Math.sin(t * Math.PI * 3) * 20;
      letter.alpha = 1 - t * t;
    }, () => {
      letter.destroy();
      tween(250, (t) => (flag.rotation = (Math.PI / 2) * t), done);
    });
  }), new Rectangle(-26, -64, 52, 70));

  // --- a cat on the pavement ---
  const catX = (xs[2] + xs[3]) / 2, catY = ground + h * 0.045;
  const cat = new Container();
  const catTail = new Graphics().roundRect(0, -3, 22, 6, 3).fill(0xffa94d).stroke({ width: 2, color: INK });
  catTail.position.set(10, -8);
  const catBody = new Graphics();
  catBody.ellipse(0, -10, 16, 11).fill(0xffa94d).stroke({ width: 2, color: INK });
  catBody.circle(-12, -24, 10).fill(0xffa94d).stroke({ width: 2, color: INK });
  catBody.poly([-20, -30, -18, -40, -12, -32]).poly([-4, -30, -6, -40, -12, -32]).fill(0xffa94d).stroke({ width: 2, color: INK });
  catBody.circle(-15, -25, 1.8).circle(-9, -25, 1.8).fill(INK);
  cat.addChild(catTail, catBody);
  cat.position.set(catX, catY);
  kit.under.addChild(cat);
  tappable(cat, oneAtATime((done) => {
    sfx.meow();
    tween(1000, (t) => {
      catTail.rotation = Math.sin(t * Math.PI * 6) * 0.7;
      cat.y = catY - Math.sin(t * Math.PI) * 30;
    }, () => {
      cat.y = catY;
      done();
    });
  }), new Rectangle(-30, -46, 60, 50));

  // --- the sun puts on sunglasses ---
  const sunX = w * 0.9, sunY = h * 0.13, sunR = Math.min(w, h) * 0.07 * pal.sunSize;
  const shades = new Graphics();
  shades.roundRect(-sunR * 0.75, -sunR * 0.2, sunR * 0.65, sunR * 0.42, 8).roundRect(sunR * 0.1, -sunR * 0.2, sunR * 0.65, sunR * 0.42, 8).fill(0x1f1f1f);
  shades.rect(-sunR * 0.12, -sunR * 0.12, sunR * 0.24, 5).fill(0x1f1f1f);
  shades.moveTo(-sunR * 0.3, sunR * 0.4).quadraticCurveTo(0, sunR * 0.62, sunR * 0.3, sunR * 0.4).stroke({ width: 5, color: 0x1f1f1f });
  shades.position.set(sunX, sunY);
  shades.visible = false;
  kit.under.addChild(shades);
  const sunHit = new Container();
  kit.under.addChild(sunHit);
  tappable(sunHit, oneAtATime((done) => {
    sfx.twinkle();
    shades.visible = true;
    tween(500, (t) => (shades.rotation = Math.sin(t * Math.PI * 2) * 0.3));
    later(3000, () => {
      shades.visible = false;
      done();
    }, cleanups);
  }), new Rectangle(sunX - sunR * 1.3, sunY - sunR * 1.3, sunR * 2.6, sunR * 2.6));

  // --- clouds that rain (or snow in winter) ---
  for (const [cx, cy, s] of [[0.12, 0.12, 1], [0.48, 0.08, 0.8]]) {
    const x = w * cx, y = h * cy, r = Math.min(w, h) * 0.045 * s;
    const hit = new Container();
    kit.under.addChild(hit);
    tappable(hit, oneAtATime((done) => {
      rainFrom(kit, x + r, y + r * 0.5, r * 3, ground - 4, 2200);
      later(2400, done, cleanups);
    }), new Rectangle(x - r, y - r * 1.6, r * 4.2, r * 2.8));
  }

  // --- a hot-air balloon drifting across the sky ---
  const balloon = new Container();
  const bg = new Graphics();
  const stripes = [0xe5383b, 0xffd93d, 0x4ea8ff, 0x7bd36b];
  bg.circle(0, 0, 28).fill(stripes[0]).stroke({ width: 3, color: INK });
  bg.ellipse(0, 0, 18, 28).fill(stripes[1]);
  bg.ellipse(0, 0, 7, 28).fill(stripes[2]);
  bg.circle(0, 0, 28).stroke({ width: 3, color: INK });
  bg.moveTo(-14, 22).lineTo(-8, 40).moveTo(14, 22).lineTo(8, 40).stroke({ width: 2, color: INK });
  bg.rect(-9, 40, 18, 12).fill(0xa0522d).stroke({ width: 2, color: INK });
  const flame = new Graphics().poly([-5, 38, 0, 24, 5, 38]).fill(0xff9f1c);
  flame.visible = false;
  balloon.addChild(flame, bg);
  const balloonY = h * 0.06;
  balloon.position.set(-60, balloonY + 20);
  kit.over.addChild(balloon);
  let lift = 0;
  let bt = 0;
  everyFrame((dt) => {
    bt += dt;
    balloon.x += 0.012 * dt;
    if (balloon.x > w + 60) balloon.x = -60;
    balloon.y = balloonY + 20 + Math.sin(bt * 0.001) * 6 - lift;
  }, cleanups);
  tappable(balloon, oneAtATime((done) => {
    sfx.burner();
    flame.visible = true;
    tween(1800, (t) => (lift = Math.sin(t * Math.PI) * 30), () => {
      flame.visible = false;
      lift = 0;
      done();
    });
  }), new Rectangle(-34, -34, 68, 92));
}

// ---------------------------------------------------------------------------
// Outside the house (the cut-away view)
// ---------------------------------------------------------------------------
export interface HouseGeom {
  w: number;
  h: number;
  x0: number; // left of the house
  houseW: number;
  ridgeY: number; // top of the roof
  ground: number; // bottom of the house / start of the lawn
  rooms: Rectangle[]; // where each room is (for lights at night)
  season: Season;
}

/** behind: behind the house (trees); front: in front (everything else). */
export function houseEggs(kit: EggKit, behind: Container, geom: HouseGeom, cleanups: Cleanups) {
  const { w, h, x0, houseW, ridgeY, ground, rooms } = geom;
  const pal = PALETTE[geom.season];

  // --- tall pines either side, with a squirrel ---
  for (const side of [-1, 1]) {
    const tx = side < 0 ? x0 - 10 : x0 + houseW + 10;
    const pine = new Container();
    const art = new Graphics();
    art.rect(-8, -40, 16, 40).fill(0x8d5524).stroke({ width: 3, color: INK });
    const green = geom.season === 'winter' ? 0x40916c : 0x2d6a4f;
    for (let i = 0; i < 3; i++) {
      const y = -40 - i * h * 0.12;
      art.poly([-h * 0.11 + i * 10, y, 0, y - h * 0.2, h * 0.11 - i * 10, y]).fill(green).stroke({ width: 3, color: INK });
      if (geom.season === 'winter') art.ellipse(0, y - h * 0.17, 10, 5).fill(0xffffff);
    }
    pine.addChild(art);
    pine.position.set(tx, ground);
    behind.addChild(pine);
    const squirrel = new Graphics();
    squirrel.ellipse(0, 0, 9, 12).fill(0xa0522d).stroke({ width: 2, color: INK });
    squirrel.circle(0, -14, 7).fill(0xa0522d).stroke({ width: 2, color: INK });
    squirrel.ellipse(10, -4, 6, 14).fill(0xc68b59).stroke({ width: 2, color: INK });
    squirrel.circle(2, -15, 1.5).fill(INK);
    squirrel.visible = false;
    kit.over.addChild(squirrel);
    tappable(pine, oneAtATime((done) => {
      sfx.squeak(1.8);
      squirrel.visible = true;
      tween(1600, (t) => {
        const k = Math.sin(t * Math.PI);
        squirrel.position.set(tx + 4, ground - 20 - k * h * 0.4);
        squirrel.rotation = t < 0.5 ? 0 : Math.PI;
      }, () => {
        squirrel.visible = false;
        done();
      });
    }), new Rectangle(-h * 0.12, -h * 0.45, h * 0.24, h * 0.45));
  }

  // --- a bird on the roof hops along the ridge ---
  const r0 = x0 + houseW * 0.22, r1 = x0 + houseW * 0.78;
  const bird = drawBird(new Graphics(), 0x4ea8ff);
  bird.position.set(r0, ridgeY - 8);
  kit.over.addChild(bird);
  let atLeft = true;
  tappable(bird, oneAtATime((done) => {
    sfx.chirp();
    const from = bird.x;
    const to = atLeft ? r1 : r0;
    atLeft = !atLeft;
    tween(1200, (t) => {
      bird.x = from + (to - from) * t;
      bird.y = ridgeY - 8 - Math.abs(Math.sin(t * Math.PI * 5)) * 18;
    }, () => {
      bird.scale.x = atLeft ? 1 : -1;
      done();
    });
  }), new Rectangle(-24, -26, 50, 40));

  // --- hydrangea bushes on the lawn: a butterfly flutters out ---
  for (const fx of [0.18, 0.78]) {
    const bx = x0 + houseW * fx, by = ground + 6;
    const bush = new Graphics();
    const leafy = geom.season === 'winter' ? 0xdfe9f3 : geom.season === 'autumn' ? 0xb5835a : 0x5cb85c;
    bush.circle(bx - 18, by, 20).circle(bx + 18, by, 20).circle(bx, by - 14, 22).fill(leafy).stroke({ width: 3, color: INK });
    if (geom.season === 'spring' || geom.season === 'summer') {
      for (const [a, b] of [[-16, -6], [0, -22], [16, -4], [8, -14]]) bush.circle(bx + a, by + b, 6).fill(0xf1f7e6).stroke({ width: 2, color: INK });
    }
    kit.over.addChild(bush);
    tappable(bush, oneAtATime((done) => {
      sfx.flutter();
      const fly = new Graphics();
      const c = [0xff8fb1, 0xffd166, 0xb07de8][Math.floor(rand(0, 3))];
      fly.ellipse(-6, -3, 6, 8).ellipse(6, -3, 6, 8).fill(c).stroke({ width: 2, color: INK });
      kit.over.addChild(fly);
      const p0 = { x: bx, y: by - 20 };
      tween(2200, (t) => {
        const p = bezier(p0, { x: bx + rand(-1, 1) * 80, y: by - 160 }, { x: w * 0.5, y: h * 0.05 }, { x: w * rand(0.2, 0.8), y: -40 }, t);
        fly.position.set(p.x, p.y);
        fly.scale.x = 0.3 + 0.7 * Math.abs(Math.cos(t * Math.PI * 14));
      }, () => {
        fly.destroy();
        done();
      });
    }), new Rectangle(bx - 40, by - 38, 80, 56));
  }

  // --- a garden sprinkler ---
  const sx = x0 + houseW * 0.5, sy = ground + (h - ground) * 0.55;
  const sprinkler = new Graphics();
  sprinkler.ellipse(sx, sy, 16, 6).fill(0x6c757d).stroke({ width: 2, color: INK });
  sprinkler.rect(sx - 3, sy - 14, 6, 14).fill(0xe9ecef).stroke({ width: 2, color: INK });
  kit.over.addChild(sprinkler);
  tappable(sprinkler, oneAtATime((done) => {
    sfx.water(2);
    spray(kit, sx, sy - 14, 0.25, -0.45, 1800, 0x6ec6ff, h);
    spray(kit, sx, sy - 14, -0.25, -0.45, 1800, 0x6ec6ff, h);
    later(2000, done, cleanups);
  }), new Rectangle(sx - 30, sy - 30, 60, 40));

  // --- the sun: tap for night-time, and the rooms light up ---
  const sunX = w * 0.92, sunY = h * 0.1, sunR = Math.min(w, h) * 0.06 * pal.sunSize;
  const night = new Graphics();
  night.eventMode = 'none';
  kit.over.addChildAt(night, 0);
  let dark = 0;
  let isNight = false;
  const starSpots = Array.from({ length: 24 }, () => [rand(0, 1) * w, rand(0, 0.08) * h + rand(0, 1) * h * 0.1, rand(1.5, 3)]);
  const drawNight = () => {
    night.clear();
    if (dark < 0.01) return;
    night.rect(0, 0, w, h).fill({ color: 0x0b1026, alpha: 0.55 * dark });
    for (const [x, y, r] of starSpots) night.circle(x, y, r).fill({ color: 0xffffff, alpha: dark });
    night.circle(sunX, sunY, sunR).fill({ color: 0xfff3c4, alpha: dark });
    night.circle(sunX + sunR * 0.35, sunY - sunR * 0.2, sunR * 0.8).fill({ color: 0x1b2347, alpha: dark });
    // every room's lights are on
    for (const r of rooms) night.rect(r.x, r.y, r.width, r.height).fill({ color: 0xffd27a, alpha: 0.25 * dark });
  };
  const sunHit = new Container();
  kit.over.addChild(sunHit);
  tappable(sunHit, () => {
    isNight = !isNight;
    if (isNight) sfx.twinkle();
    else sfx.chirp();
    const from = dark;
    tween(800, (t) => ((dark = from + ((isNight ? 1 : 0) - from) * t), drawNight()));
  }, new Rectangle(sunX - sunR * 1.4, sunY - sunR * 1.4, sunR * 2.8, sunR * 2.8));
  void glow;
  void burst;
  void ease;
}
