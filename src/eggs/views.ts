import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { PALETTE, type Season } from '../seasons';
import { swayAt } from '../sky';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import {
  bezier,
  drawBird,
  everyFrame,
  glow,
  hotspot,
  INK,
  later,
  oneAtATime,
  cloudRain,
  rainFrom,
  rand,
  spray,
  tappable,
  type Cleanups,
  type EggKit,
} from './common';

/** Surprises on the street and outside the house (the "parent" views). */

type Pt = { x: number; y: number };

export interface StreetGeom {
  w: number;
  h: number;
  road: Pt[]; // the winding main road, left to right
  roadW: number;
  branch: Pt[]; // the road up to the tunnel (from the main road to the tunnel)
  buildings: Partial<Record<string, { x: number; y: number; w: number; h: number }>>; // bottom-centre and size
  sun: { x: number; y: number; r: number };
  clouds: [number, number, number][];
  tunnel: { x: number; y: number; r: number };
  pond: { x: number; y: number; rx: number; ry: number };
  trees: { x: number; y: number; r: number }[]; // the big trees at the front
  ground: number; // roughly where the town is (for rain to land)
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

/** Walk along a path: where you are after going `d` pixels, and which way you're heading. */
function along(path: Pt[]) {
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const total = lens[lens.length - 1];
  return {
    total,
    at(d: number) {
      d = Math.max(0, Math.min(total, d));
      let i = 1;
      while (i < lens.length - 1 && lens[i] < d) i++;
      const a = path[i - 1], b = path[i];
      const t = (d - lens[i - 1]) / Math.max(0.001, lens[i] - lens[i - 1]);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    },
  };
}

export function streetEggs(kit: EggKit, geom: StreetGeom, cleanups: Cleanups) {
  const { w, h, road, roadW, buildings } = geom;
  const u = Math.min(w, h);
  const pal = PALETTE[kit.season];
  if (road.length < 2) return;

  // --- cars driving along the winding road, one each way; tap one to honk ---
  const route = along(road);
  const lanes = [
    { dir: 1, colour: 0xe5383b, start: 0.15 },
    { dir: -1, colour: 0x4ea8ff, start: 0.6 },
  ];
  const carScale = (roadW * 0.85) / 50;
  for (const lane of lanes) {
    const c = car(lane.colour);
    kit.over.addChild(c);
    let d = route.total * lane.start;
    let boost = 1;
    let hop = 0;
    everyFrame((dt) => {
      d += lane.dir * 0.06 * boost * dt;
      if (d > route.total) d = 0;
      if (d < 0) d = route.total;
      const p = route.at(d);
      // keep to your own side of the road
      const off = roadW * 0.22 * lane.dir;
      const nx = -Math.sin(p.angle), ny = Math.cos(p.angle);
      c.position.set(p.x + nx * off, p.y + ny * off - hop);
      const travel = lane.dir > 0 ? p.angle : p.angle + Math.PI;
      const facingLeft = Math.cos(travel) < 0;
      c.scale.set(facingLeft ? -carScale : carScale, carScale);
      c.rotation = facingLeft ? travel - Math.PI : travel;
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
  const house = buildings.house;
  if (house) {
    const mx = house.x - house.w * 0.5, my = house.y + 6;
    const box = new Container();
    const post = new Graphics().rect(-4, -34, 8, 34).fill(0x5c3d2e).stroke({ width: 2, color: INK });
    const body = new Graphics().roundRect(-16, -54, 32, 22, 8).fill(0x1f1f1f).stroke({ width: 2, color: INK });
    const flag = new Graphics().rect(0, -10, 4, 14).rect(0, -10, 12, 7).fill(0xe5383b);
    flag.position.set(14, -44);
    flag.rotation = Math.PI / 2;
    box.addChild(post, body, flag);
    box.position.set(mx, my);
    box.scale.set(Math.max(0.6, Math.min(1, u / 900)));
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
  }

  // --- a cat sunning itself on the hill by the school ---
  const school = buildings.school;
  if (school) {
    const catX = school.x - school.w * 0.62, catY = school.y + 4;
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
  }

  // --- the sun puts on sunglasses ---
  const { x: sunX, y: sunY, r: sunR } = geom.sun;
  const shades = new Graphics();
  shades.roundRect(-sunR * 0.75, -sunR * 0.2, sunR * 0.65, sunR * 0.42, 8).roundRect(sunR * 0.1, -sunR * 0.2, sunR * 0.65, sunR * 0.42, 8).fill(0x1f1f1f);
  shades.rect(-sunR * 0.12, -sunR * 0.12, sunR * 0.24, 5).fill(0x1f1f1f);
  shades.moveTo(-sunR * 0.3, sunR * 0.4).quadraticCurveTo(0, sunR * 0.62, sunR * 0.3, sunR * 0.4).stroke({ width: 5, color: 0x1f1f1f });
  shades.position.set(sunX, sunY);
  shades.visible = false;
  // the sun lives in the sky (which stays put while the map slides)
  const sunLayer = kit.sky ?? kit.under;
  sunLayer.addChild(shades);
  const sunHit = new Container();
  sunLayer.addChild(sunHit);
  cleanups.push(() => {
    shades.destroy();
    sunHit.destroy();
  });
  tappable(sunHit, oneAtATime((done) => {
    sfx.twinkle();
    shades.visible = true;
    tween(500, (t) => (shades.rotation = Math.sin(t * Math.PI * 2) * 0.3));
    later(3000, () => {
      shades.visible = false;
      done();
    }, cleanups);
  }), new Rectangle(sunX - sunR * 1.6, sunY - sunR * 1.6, sunR * 3.2, sunR * 3.2));

  // --- the drifting clouds rain (or snow in winter) when tapped ---
  cloudRain(kit, cleanups, (y) => y + h * 0.4);

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
  const balloonY = h * 0.16;
  balloon.position.set(w * 0.2, balloonY);
  kit.over.addChild(balloon);
  let lift = 0;
  let bt = 0;
  everyFrame((dt) => {
    bt += dt;
    balloon.x += 0.012 * dt;
    if (balloon.x > w + 60) balloon.x = -60;
    balloon.y = balloonY + Math.sin(bt * 0.001) * 6 - lift;
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

  // --- the tunnel: a little train toots its way out, and back in ---
  const { tunnel } = geom;
  const track = along([...geom.branch].reverse());
  hotspot(kit, new Rectangle(tunnel.x - tunnel.r - 14, tunnel.y - tunnel.r - 14, (tunnel.r + 14) * 2, tunnel.r + 30), oneAtATime((done) => {
    // an engine and two carriages, each following the road out of the tunnel
    const s = (roadW * 0.9) / 30;
    const cars = [0xe5383b, 0x4ea8ff, 0xffd166].map((c, i) => {
      const t = new Graphics();
      if (i === 0) {
        t.roundRect(-22, -26, 44, 26, 6).fill(c).stroke({ width: 2.5, color: INK });
        t.rect(6, -40, 12, 16).fill(0x2b2d42).stroke({ width: 2, color: INK }); // chimney
        t.roundRect(-20, -42, 20, 18, 4).fill(c).stroke({ width: 2.5, color: INK }); // cab
      } else t.roundRect(-20, -24, 40, 24, 5).fill(c).stroke({ width: 2.5, color: INK });
      t.circle(-12, 2, 6).circle(12, 2, 6).fill(0x2b2b2b);
      t.scale.set(s);
      t.visible = false;
      kit.over.addChild(t);
      return t;
    });
    sfx.honk();
    const gap = 50 * s;
    const out = Math.min(track.total, u * 0.2) + gap * 2;
    tween(3600, (t) => {
      const k = t < 0.5 ? ease.inOutSine(t * 2) : ease.inOutSine((1 - t) * 2);
      const head = out * k;
      cars.forEach((c, i) => {
        const d = head - i * gap;
        c.visible = d > 0; // still inside the tunnel
        const p = track.at(d);
        c.position.set(p.x, p.y);
        c.rotation = Math.max(-0.35, Math.min(0.35, Math.cos(p.angle) >= 0 ? p.angle : p.angle - Math.PI)) * 0.6;
      });
      if (Math.abs(t - 0.5) < 0.01) sfx.honk();
    }, () => {
      for (const c of cars) c.destroy();
      done();
    });
  }));

  // --- the pond: a fish jumps (or, in winter, a penguin slides across the ice) ---
  const { pond } = geom;
  hotspot(kit, new Rectangle(pond.x - pond.rx, pond.y - pond.ry, pond.rx * 2, pond.ry * 2), oneAtATime((done) => {
    if (kit.season === 'winter') {
      const p = new Graphics();
      p.ellipse(0, 0, 13, 18).fill(0x1f1f1f).stroke({ width: 2, color: INK });
      p.ellipse(2, 3, 8, 12).fill(0xffffff);
      p.circle(4, -8, 2).fill(INK);
      p.poly([10, -6, 17, -4, 10, -2]).fill(0xffa94d);
      kit.over.addChild(p);
      sfx.slideWhistle(1.2);
      tween(1600, (t) => {
        p.position.set(pond.x - pond.rx * 0.8 + t * pond.rx * 1.6, pond.y - 10);
        p.rotation = Math.PI / 2 * 0.9;
      }, () => {
        p.destroy();
        done();
      });
      return;
    }
    sfx.blub();
    const fish = new Graphics();
    fish.ellipse(0, 0, 14, 8).fill(0xffa94d).stroke({ width: 2, color: INK });
    fish.poly([-12, 0, -22, -8, -22, 8]).fill(0xffa94d).stroke({ width: 2, color: INK });
    fish.circle(7, -2, 2).fill(INK);
    kit.over.addChild(fish);
    const x0 = pond.x + rand(-0.5, 0.2) * pond.rx;
    tween(900, (t) => {
      fish.position.set(x0 + t * 60, pond.y - Math.sin(t * Math.PI) * h * 0.1);
      fish.rotation = -0.9 + t * 1.8;
    }, () => {
      fish.destroy();
      sfx.blub();
      const ring = new Graphics();
      kit.under.addChild(ring);
      tween(700, (t) => ring.clear().ellipse(x0 + 60, pond.y, 8 + t * 30, 3 + t * 10).stroke({ width: 2, color: 0xffffff, alpha: 1 - t }), () => {
        ring.destroy();
        done();
      });
    });
  }));

  // --- the big trees at the front: a bird flies out ---
  for (const tr of geom.trees) {
    hotspot(kit, new Rectangle(tr.x - tr.r, tr.y - tr.r, tr.r * 2, tr.r * 2), oneAtATime((done) => {
      sfx.chirp();
      const bird = drawBird(new Graphics(), [0x4ea8ff, 0xe5383b, 0xffd166][Math.floor(rand(0, 3))]);
      bird.scale.set(0.8);
      kit.over.addChild(bird);
      const p0 = { x: tr.x, y: tr.y }, dir = tr.x > w / 2 ? -1 : 1;
      tween(1800, (t) => {
        const p = bezier(p0, { x: p0.x + dir * 60, y: p0.y - 80 }, { x: p0.x + dir * w * 0.2, y: h * 0.25 }, { x: p0.x + dir * w * 0.4, y: -40 }, t);
        bird.position.set(p.x, p.y);
        bird.scale.x = dir * 0.8;
      }, () => {
        bird.destroy();
        done();
      });
    }));
  }
  void pal;
  void burst;
  void spray;
  void glow;
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
    // swaying gently in the breeze (the trunk stays put)
    const sway = { phase: side * 1.7, speed: 0.0011 + side * 0.0001, amount: 0.03 };
    let time = 0;
    everyFrame((dt) => (art.skew.x = swayAt((time += dt), sway)), cleanups);
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

  // --- the drifting clouds rain (or snow) when tapped ---
  cloudRain(kit, cleanups, () => ground);
  void glow;
  void burst;
  void ease;
}
