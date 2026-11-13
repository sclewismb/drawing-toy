import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst, hearts } from '../../fx';
import { sfx } from '../../sound';
import { ease, tween } from '../../tween';
import { everyFrame, INK, later, oneAtATime, rand, tappable, type Cleanups, type EggKit } from '../common';
import { bird, catFace, crawler, dangler, drawn, flier, jiggler, mouseFace, mouseHole, opener, peeker, pick, type Draw } from '../hidden';

/** Five more hidden things in the vet, the restaurant, the toy shop and the teddy workshop. */

const line = (s: number, width = 2.5) => ({ width: width * s, color: INK });

/** A floppy-eared dog face (front on). */
const dogFace = (s: number, fur = 0xd9a066, ear = 0x8d5a3b): Draw => (g) => {
  g.ellipse(-15 * s, -20 * s, 7 * s, 13 * s).fill(ear).stroke(line(s));
  g.ellipse(15 * s, -20 * s, 7 * s, 13 * s).fill(ear).stroke(line(s));
  g.circle(0, -18 * s, 15 * s).fill(fur).stroke(line(s));
  g.ellipse(0, -11 * s, 8 * s, 6 * s).fill(0xfff3e0).stroke(line(s, 1.5));
  g.ellipse(0, -14 * s, 4 * s, 3 * s).fill(INK);
  g.circle(-6 * s, -22 * s, 2.2 * s).fill(INK);
  g.circle(6 * s, -22 * s, 2.2 * s).fill(INK);
  g.ellipse(0, -4 * s, 3 * s, 4 * s).fill(0xff8fab).stroke(line(s, 1.2));
};

// ---------------------------------------------------------------------------
export function moreVet(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.72;
  // 1. a stethoscope on a hook: listen to a heartbeat
  {
    const x = 1.01 * w, y = h * 0.36;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => {
      g.circle(0, 0, 3 * s).fill(INK);
      g.moveTo(-10 * s, 4 * s).quadraticCurveTo(-18 * s, 40 * s, 0, 56 * s).quadraticCurveTo(18 * s, 40 * s, 10 * s, 4 * s).stroke({ width: 4 * s, color: 0x343a40 });
      g.moveTo(0, 56 * s).quadraticCurveTo(-4 * s, 80 * s, 14 * s, 88 * s).stroke({ width: 4 * s, color: 0x343a40 });
      g.circle(18 * s, 90 * s, 8 * s).fill(0xced4da).stroke(line(s, 2));
    }, c);
    const heart = drawn((g) => g.moveTo(0, 6 * s).bezierCurveTo(-16 * s, -6 * s, -8 * s, -18 * s, 0, -8 * s).bezierCurveTo(8 * s, -18 * s, 16 * s, -6 * s, 0, 6 * s).fill(0xff6b6b).stroke(line(s, 1.5)), c, 0, 30 * s);
    heart.visible = false;
    tappable(c, oneAtATime((done) => {
      heart.visible = true;
      let n = 0;
      const beat = () => {
        sfx.drum();
        later(180, () => sfx.drum(), cleanups);
        tween(360, (k) => heart.scale.set(1 + Math.sin(k * Math.PI) * 0.6));
        if (++n < 4) later(700, beat, cleanups);
        else later(500, () => ((heart.visible = false), hearts(kit.sparkles, x, y + 30 * s, 4), done()), cleanups);
      };
      beat();
    }), new Rectangle(-24 * s, -6 * s, 52 * s, 106 * s));
  }
  // 2. a cat asleep on top of the shelves (wake it up!)
  {
    const cat = (awake: boolean): Draw => (g) => {
      g.moveTo(26 * s, -8 * s).quadraticCurveTo(44 * s, 6 * s, 34 * s, 30 * s).stroke({ width: 7 * s, color: 0x868e96 });
      g.ellipse(0, -14 * s, 30 * s, 14 * s).fill(0x868e96).stroke(line(s));
      g.poly([-34 * s, -22 * s, -30 * s, -40 * s, -20 * s, -28 * s]).fill(0x868e96).stroke(line(s, 2));
      g.poly([-14 * s, -26 * s, -10 * s, -40 * s, -4 * s, -24 * s]).fill(0x868e96).stroke(line(s, 2));
      g.circle(-20 * s, -18 * s, 14 * s).fill(0x868e96).stroke(line(s));
      if (awake) g.circle(-25 * s, -20 * s, 2.6 * s).fill(INK).circle(-15 * s, -20 * s, 2.6 * s).fill(INK);
      else g.moveTo(-29 * s, -20 * s).lineTo(-22 * s, -20 * s).moveTo(-18 * s, -20 * s).lineTo(-11 * s, -20 * s).stroke(line(s, 2));
      g.poly([-22 * s, -14 * s, -18 * s, -14 * s, -20 * s, -11 * s]).fill(0xff8fab);
    };
    opener(kit, cleanups, {
      x: -0.38 * w, y: h * 0.2, closed: cat(false), open: cat(true), shutAfter: 2000,
      hit: new Rectangle(-40 * s, -42 * s, 84 * s, 44 * s),
      sound: () => sfx.meow(), onOpen: () => hearts(kit.sparkles, -0.38 * w - 20 * s, h * 0.2 - 40 * s, 3),
    });
  }
  // 3. a dog peeking out from behind the counter
  peeker(kit, cleanups, {
    x: 0.372 * w, y: h * 0.67, rise: 44 * s, sideways: 1, who: dogFace(s), rare: catFace(s, 0xf4a261),
    hole: (g) => g.rect(0, -60 * s, 70 * s, 64 * s).fill(0xffffff),
    hit: new Rectangle(-10 * s, -46 * s, 40 * s, 50 * s), sound: () => sfx.woof(), rareSound: () => sfx.meow(),
  });
  // 4. a bandage roll on the examining table: it unrolls (and rolls back up)
  {
    const x = 1.29 * w, y = h * 0.55;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const strip = new Graphics();
    c.addChild(strip);
    const roll = drawn((g) => g.circle(0, -11 * s, 11 * s).fill(0xffffff).stroke(line(s, 2)).circle(0, -11 * s, 4 * s).fill(0xdee2e6).stroke(line(s, 1.2)), c);
    tappable(c, oneAtATime((done) => {
      sfx.zip();
      const far = 0.17 * w;
      const draw = (d: number) => {
        roll.x = -d;
        roll.rotation = -d / (11 * s);
        strip.clear();
        if (d > 1) strip.rect(-d, -5 * s, d, 5 * s).fill(0xffffff).stroke(line(s, 1.2)).rect(-d * 0.6, -5 * s, 8 * s, 5 * s).fill(0xff8787);
      };
      tween(900, (k) => draw(far * ease.outCubic(k)), () => later(900, () => {
        sfx.zip();
        tween(700, (k) => draw(far * (1 - k)), done);
      }, cleanups));
    }), new Rectangle(-16 * s, -26 * s, 32 * s, 28 * s));
  }
  // 5. a budgie who flies from lamp to lamp
  flier(kit, cleanups, {
    rests: [-0.32, 0.3, 0.9, 1.4].map((f) => ({ x: f * w, y: h * 0.032 })),
    who: bird(s * 0.8, 0x69db7c), size: 26 * s, area: { x0: -0.5 * w, x1: 1.6 * w, y0: h * 0.06, y1: h * 0.4 }, sound: () => sfx.chirp(),
  });
  void fy;
}

// ---------------------------------------------------------------------------
export function moreRestaurant(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.72;
  // 1. a pepper mill on the shelf: achoo!
  {
    const x = -0.25 * w, y = h * 0.45;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => g.roundRect(-8 * s, -40 * s, 16 * s, 40 * s, 6 * s).fill(0x5c3a21).stroke(line(s, 2)).circle(0, -44 * s, 5 * s).fill(0x8d5a3b).stroke(line(s, 2)), c);
    tappable(c, oneAtATime((done) => {
      sfx.whirr();
      tween(600, (k) => (c.rotation = Math.sin(k * Math.PI * 6) * 0.15), () => (c.rotation = 0));
      for (let i = 0; i < 14; i++) {
        const d = new Graphics().circle(0, 0, rand(1.5, 3) * s).fill(0x343a40);
        d.position.set(x, y - 2 * s);
        kit.over.addChild(d);
        const vx = rand(-30, 30) * s;
        tween(700, (k) => d.position.set(x + vx * k, y + 60 * s * k * k), () => d.destroy());
      }
      later(800, () => {
        sfx.poof();
        sfx.giggle(1.1);
        burst(kit.sparkles, x + 60 * s, y - 40 * s, 10, 70);
        done();
      }, cleanups);
    }), new Rectangle(-14 * s, -52 * s, 28 * s, 54 * s));
  }
  // 2. a mouse hole in the panelling
  mouseHole(kit, cleanups, 0.99 * w, fy, s);
  // 3. a string of chillies: hot hot hot!
  jiggler(kit, cleanups, {
    x: 1.38 * w, y: h * 0.1, how: 'sway', hit: new Rectangle(-18 * s, -4 * s, 36 * s, 140 * s),
    sound: () => {
      sfx.puff(1.8);
      later(200, () => burst(kit.sparkles, 1.38 * w, h * 0.1 + 120 * s, 8, 50), cleanups);
    },
    draw: (g) => {
      g.circle(0, 0, 3 * s).fill(INK);
      g.moveTo(0, 0).lineTo(0, 130 * s).stroke({ width: 2 * s, color: 0xc9a46b });
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, cy = 14 * s + i * 20 * s;
        g.moveTo(0, cy).quadraticCurveTo(side * 22 * s, cy + 2 * s, side * 26 * s, cy + 18 * s).quadraticCurveTo(side * 12 * s, cy + 10 * s, 0, cy + 6 * s).fill(i === 3 ? 0x40c057 : 0xe5383b).stroke(line(s, 1.5));
      }
    },
  });
  // 4. a gumball machine: out rolls a gumball
  {
    const x = 0.015 * w, y = fy;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const colors = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x69db7c, 0xb197fc, 0xff922b];
    drawn((g) => {
      g.poly([-14 * s, 0, 14 * s, 0, 9 * s, -50 * s, -9 * s, -50 * s]).fill(0xe5383b).stroke(line(s, 2));
      g.roundRect(-18 * s, -70 * s, 36 * s, 22 * s, 4 * s).fill(0xe5383b).stroke(line(s, 2));
      g.rect(-5 * s, -62 * s, 10 * s, 8 * s).fill(INK);
      g.circle(0, -96 * s, 28 * s).fill({ color: 0xe7f5ff, alpha: 0.9 }).stroke(line(s));
      for (let i = 0; i < 16; i++) g.circle(rand(-18, 18) * s, -96 * s + rand(-4, 20) * s, 6 * s).fill(colors[i % colors.length]).stroke(line(s, 1));
      g.roundRect(-8 * s, -130 * s, 16 * s, 8 * s, 3 * s).fill(0xe5383b).stroke(line(s, 2));
    }, c);
    tappable(c, oneAtATime((done) => {
      sfx.clank();
      const ball = new Graphics().circle(0, 0, 6 * s).fill(pick(colors)).stroke(line(s, 1));
      ball.position.set(x, y - 56 * s);
      kit.under.addChild(ball);
      const dir = Math.random() < 0.5 ? -1 : 1;
      tween(1600, (k) => {
        const bounce = Math.abs(Math.cos(k * Math.PI * 3)) * (1 - k);
        ball.position.set(x + dir * k * 0.12 * w, y + 6 * s - bounce * 50 * s - (k < 0.15 ? (0.15 - k) * 300 * s : 0));
        ball.rotation = k * 12 * dir;
      }, () => {
        sfx.pop(1.4);
        later(1500, () => tween(400, (k) => (ball.alpha = 1 - k), () => ball.destroy()), cleanups);
        done();
      });
      later(300, () => sfx.boing(1.8), cleanups);
    }), new Rectangle(-30 * s, -132 * s, 60 * s, 134 * s));
  }
  // 5. someone outside, looking in at the window
  peeker(kit, cleanups, {
    x: 0.79 * w, y: h * 0.365, rise: 46 * s, who: catFace(s * 1.3, 0xadb5bd), rare: dogFace(s * 1.3),
    hole: (g) => g.rect(-0.04 * w, -0.25 * h, 0.08 * w, 0.25 * h).fill(0xffffff),
    hit: new Rectangle(-0.04 * w, -60 * s, 0.08 * w, 62 * s), sound: () => sfx.meow(), rareSound: () => sfx.woof(), stay: 2000,
  });
}

// ---------------------------------------------------------------------------
export function moreToyshop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.72;
  // 1. a wind-up robot marching along the top of the shelves
  crawler(kit, cleanups, {
    from: { x: 0.08 * w, y: h * 0.137 }, to: { x: 0.4 * w, y: h * 0.137 }, size: 26 * s, speed: 30 * s, how: 'spin', sound: () => sfx.whirr(),
    who: (g) => {
      g.rect(-6 * s, -6 * s, 4 * s, 6 * s).fill(INK).rect(2 * s, -6 * s, 4 * s, 6 * s).fill(INK);
      g.roundRect(-11 * s, -26 * s, 22 * s, 20 * s, 3 * s).fill(0xadb5bd).stroke(line(s, 2));
      g.circle(0, -16 * s, 3 * s).fill(0xff6b6b);
      g.roundRect(-9 * s, -42 * s, 18 * s, 15 * s, 3 * s).fill(0xced4da).stroke(line(s, 2));
      g.circle(-4 * s, -35 * s, 2.5 * s).fill(0x4dabf7).circle(4 * s, -35 * s, 2.5 * s).fill(0x4dabf7);
      g.moveTo(0, -42 * s).lineTo(0, -48 * s).stroke(line(s, 1.5)).circle(0, -49 * s, 2.5 * s).fill(0xffd43b);
      g.moveTo(-11 * s, -18 * s).lineTo(-18 * s, -18 * s).stroke(line(s, 1.5)).circle(-20 * s, -18 * s, 3 * s).stroke(line(s, 1.5));
    },
  });
  // 2. a yo-yo going up and down on its string
  dangler(kit, cleanups, {
    x: -0.05 * w, top: 0, drop: h * 0.45, size: 22 * s, color: 0x495057, sound: () => sfx.spring(1.4),
    who: (g) => g.circle(0, 0, 16 * s).fill(0xff6b6b).stroke(line(s, 2)).circle(0, 0, 8 * s).fill(0xffd43b).stroke(line(s, 1.5)).circle(0, 0, 2.5 * s).fill(INK),
  });
  // 3. a snow globe on the counter: shake it!
  {
    const x = 0.565 * w, y = h * 0.452;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const r = 24 * s;
    drawn((g) => {
      g.circle(0, -r - 10 * s, r).fill(0xd0ebff);
      g.ellipse(0, -16 * s, r * 0.8, 6 * s).fill(0xffffff);
      g.poly([-8 * s, -18 * s, 8 * s, -18 * s, 0, -40 * s]).fill(0x2f9e44).stroke(line(s, 1.5));
    }, c);
    const flakes = new Graphics();
    c.addChild(flakes);
    drawn((g) => g.circle(0, -r - 10 * s, r).stroke(line(s, 2)).ellipse(-8 * s, -r - 20 * s, 6 * s, 4 * s).fill({ color: 0xffffff, alpha: 0.7 }).roundRect(-r * 0.9, -12 * s, r * 1.8, 12 * s, 4 * s).fill(0xb197fc).stroke(line(s, 2)), c);
    const snow = Array.from({ length: 18 }, () => ({ x: rand(-1, 1), y: rand(0.2, 1), vy: 0 }));
    let shake = 0;
    everyFrame((dt) => {
      if (shake > 0) shake -= dt;
      flakes.clear();
      for (const f of snow) {
        if (shake > 0) (f.x = rand(-0.9, 0.9)), (f.y = rand(-0.9, 0.9));
        else f.y = Math.min(0.85, f.y + dt * 0.00025);
        const fx = f.x * r * Math.sqrt(Math.max(0, 1 - f.y * f.y)) * 0.85;
        flakes.circle(fx, -r - 10 * s + f.y * r * 0.8, 1.8 * s).fill(0xffffff);
      }
    }, cleanups);
    tappable(c, () => {
      sfx.tinkle();
      shake = 500;
      tween(500, (k) => (c.rotation = Math.sin(k * Math.PI * 6) * 0.2 * (1 - k)), () => (c.rotation = 0));
    }, new Rectangle(-r - 6 * s, -2 * r - 16 * s, 2 * r + 12 * s, 2 * r + 18 * s));
  }
  // 4. a bubble machine: bubbles float all round the shop
  {
    const x = 1.02 * w, y = fy;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => {
      g.roundRect(-26 * s, -30 * s, 52 * s, 30 * s, 6 * s).fill(0x74c0fc).stroke(line(s));
      g.circle(-10 * s, -15 * s, 6 * s).fill(0xffffff).stroke(line(s, 1.5));
      g.circle(12 * s, -36 * s, 10 * s).fill(0xffd43b).stroke(line(s, 2));
      for (let i = 0; i < 6; i++) g.moveTo(12 * s, -36 * s).lineTo(12 * s + Math.cos(i) * 10 * s, -36 * s + Math.sin(i) * 10 * s);
      g.stroke(line(s, 1));
    }, c);
    tappable(c, oneAtATime((done) => {
      sfx.whirr();
      for (let i = 0; i < 14; i++) later(i * 120, () => {
        const b = new Graphics().circle(0, 0, rand(8, 18) * s).fill({ color: 0xd0ebff, alpha: 0.35 }).stroke({ width: 1.5 * s, color: 0x74c0fc }).circle(-4 * s, -4 * s, 3 * s).fill({ color: 0xffffff, alpha: 0.8 });
        b.position.set(x + 12 * s, y - 40 * s);
        kit.over.addChild(b);
        const vx = rand(-160, 160) * s, rise = rand(200, 420) * s, wob = rand(0, 6);
        tween(rand(2400, 3600), (k) => b.position.set(x + 12 * s + vx * k + Math.sin(k * 8 + wob) * 14 * s, y - 40 * s - rise * k), () => {
          sfx.pop(1.6);
          b.destroy();
        });
      }, cleanups);
      later(1800, done, cleanups);
    }), new Rectangle(-30 * s, -48 * s, 60 * s, 50 * s));
  }
  // 5. a toy plane on a string, flying round and round
  jiggler(kit, cleanups, {
    x: -0.32 * w, y: 0, how: 'twirl', ms: 1500, hit: new Rectangle(-50 * s, h * 0.06, 100 * s, 50 * s), sound: () => sfx.vroom(),
    draw: (g) => {
      g.moveTo(0, 0).lineTo(0, h * 0.08).stroke({ width: 1.5 * s, color: 0x868e96 });
      const y = h * 0.08 + 14 * s;
      g.roundRect(-30 * s, y - 7 * s, 60 * s, 14 * s, 7 * s).fill(0xffd43b).stroke(line(s, 2));
      g.roundRect(-8 * s, y - 20 * s, 16 * s, 40 * s, 4 * s).fill(0xff6b6b).stroke(line(s, 2));
      g.poly([-30 * s, y, -40 * s, y - 14 * s, -32 * s, y - 14 * s]).fill(0xff6b6b).stroke(line(s, 1.5));
      g.circle(14 * s, y - 2 * s, 4 * s).fill(0x74c0fc);
    },
  });
}

// ---------------------------------------------------------------------------
export function moreWorkshop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.74;
  // 1. a sewing machine on a little table: it stitches a heart
  {
    const s = (kit.h / 800) * 1.4;
    const x = -0.43 * w;
    const c = new Container();
    c.position.set(x, fy);
    kit.under.addChild(c);
    drawn((g) => {
      g.rect(-40 * s, -70 * s, 80 * s, 8 * s).fill(0xc68b59).stroke(line(s, 2));
      g.rect(-34 * s, -62 * s, 6 * s, 62 * s).fill(0xa0703e).rect(28 * s, -62 * s, 6 * s, 62 * s).fill(0xa0703e);
      g.roundRect(-34 * s, -84 * s, 68 * s, 14 * s, 4 * s).fill(0xff8fab).stroke(line(s, 2));
      g.roundRect(14 * s, -120 * s, 20 * s, 40 * s, 5 * s).fill(0xff8fab).stroke(line(s, 2));
      g.roundRect(-34 * s, -122 * s, 66 * s, 16 * s, 6 * s).fill(0xff8fab).stroke(line(s, 2));
      g.circle(24 * s, -100 * s, 5 * s).fill(0xffffff).stroke(line(s, 1.5));
    }, c);
    const needle = drawn((g) => g.rect(-26 * s, -106 * s, 3 * s, 18 * s).fill(0xadb5bd), c);
    const cloth = new Graphics();
    c.addChildAt(cloth, 1);
    tappable(c, oneAtATime((done) => {
      for (let i = 0; i < 10; i++) later(i * 70, () => sfx.click(), cleanups);
      tween(800, (k) => {
        needle.y = Math.abs(Math.sin(k * Math.PI * 10)) * 6 * s;
        cloth.clear().rect(-30 * s - 40 * s * k, -90 * s, 40 * s, 8 * s).fill(0xffe3ec).stroke(line(s, 1.2));
        for (let i = 0; i < 6; i++) cloth.rect(-28 * s - 40 * s * k + i * 6 * s, -87 * s, 3 * s, 1.5 * s).fill(0xff6b6b);
      }, () => {
        needle.y = 0;
        hearts(kit.sparkles, x - 60 * s, fy - 100 * s, 4);
        sfx.pling();
        later(1200, () => (cloth.clear(), done()), cleanups);
      });
    }), new Rectangle(-44 * s, -126 * s, 88 * s, 128 * s));
  }
  // 2. a basket of wool: a kitten's been playing in it
  {
  const s = (kit.h / 800) * 1.35;
  peeker(kit, cleanups, {
    x: 0.92 * w, y: fy - 32 * s, rise: 36 * s, who: catFace(s, 0xf4a261), rare: mouseFace(s),
    hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 70 * s).fill(0xffffff),
    front: (g) => {
      g.circle(-14 * s, -2 * s, 11 * s).fill(0xff8fab).stroke(line(s, 1.5));
      g.circle(10 * s, -4 * s, 12 * s).fill(0x74c0fc).stroke(line(s, 1.5));
      g.poly([-34 * s, -4 * s, 34 * s, -4 * s, 28 * s, 32 * s, -28 * s, 32 * s]).fill(0xc68b59).stroke(line(s));
      for (let i = 0; i < 3; i++) g.moveTo(-31 * s, 6 * s + i * 9 * s).lineTo(31 * s, 6 * s + i * 9 * s);
      g.stroke({ width: 1.5 * s, color: 0x8d5a3b });
    },
    hit: new Rectangle(-36 * s, -44 * s, 72 * s, 78 * s), sound: () => sfx.meow(), rareSound: () => sfx.squeak(1.8),
  });
  }
  // 3. a tape measure on a hook: whizz down, zip back
  {
    const x = 1.01 * w, y = h * 0.28;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const tape = new Graphics();
    c.addChild(tape);
    drawn((g) => g.circle(0, -18 * s, 3 * s).fill(INK).roundRect(-14 * s, -14 * s, 28 * s, 28 * s, 8 * s).fill(0xffd43b).stroke(line(s, 2)).circle(0, 0, 5 * s).fill(0xffffff).stroke(line(s, 1.2)), c);
    const pull = (len: number) => {
      tape.clear();
      if (len < 2) return;
      tape.rect(8 * s, 6 * s, 8 * s, len).fill(0xfff3bf).stroke(line(s, 1.2));
      for (let yy = 16 * s; yy < len; yy += 12 * s) tape.rect(8 * s, 6 * s + yy, 4 * s, 1.2 * s).fill(INK);
      tape.rect(6 * s, 6 * s + len, 12 * s, 4 * s).fill(0x868e96);
    };
    tappable(c, oneAtATime((done) => {
      sfx.zip();
      const len = fy - y - 14 * s;
      tween(700, (k) => pull(len * ease.outCubic(k)), () => later(900, () => {
        sfx.zip();
        tween(300, (k) => pull(len * (1 - k)), () => (sfx.click(), done()));
      }, cleanups));
    }), new Rectangle(-18 * s, -24 * s, 36 * s, 42 * s));
  }
  // 4. a hedgehog pincushion on the table
  jiggler(kit, cleanups, {
    x: 0.345 * w, y: h * 0.582, how: 'squash', sound: () => sfx.squeak(1.4),
    hit: new Rectangle(-26 * s, -34 * s, 52 * s, 36 * s),
    draw: (g) => {
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        g.moveTo(Math.cos(a) * 14 * s - 4 * s, -10 * s + Math.sin(a) * 12 * s).lineTo(Math.cos(a) * 24 * s - 4 * s, -10 * s + Math.sin(a) * 22 * s);
      }
      g.stroke({ width: 2 * s, color: 0xadb5bd });
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        g.circle(Math.cos(a) * 24 * s - 4 * s, -10 * s + Math.sin(a) * 22 * s, 3 * s).fill([0xff6b6b, 0xffd43b, 0x4dabf7][i % 3]);
      }
      g.ellipse(-4 * s, -10 * s, 18 * s, 11 * s).fill(0x8d5a3b).stroke(line(s, 2));
      g.ellipse(14 * s, -6 * s, 9 * s, 6 * s).fill(0xf3d9b1).stroke(line(s, 1.5));
      g.circle(14 * s, -9 * s, 1.8 * s).fill(INK);
      g.circle(22 * s, -6 * s, 2 * s).fill(INK);
    },
  });
  // 5. bubble wrap on the floor: pop pop pop!
  {
    const x = 0.12 * w, y = h * 0.85, cols = 7, rows = 3, gap = 18 * s;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const sheet = new Graphics();
    c.addChild(sheet);
    let popped = new Set<number>();
    const draw = () => {
      sheet.clear().roundRect(-cols * gap * 0.5 - 6 * s, -rows * gap * 0.5 - 6 * s, cols * gap + 12 * s, rows * gap + 12 * s, 4 * s).fill({ color: 0xe7f5ff, alpha: 0.85 }).stroke({ width: 1.5 * s, color: 0x74c0fc });
      for (let i = 0; i < cols * rows; i++) {
        const bx = -cols * gap * 0.5 + (i % cols) * gap + gap / 2, by = -rows * gap * 0.5 + Math.floor(i / cols) * gap + gap / 2;
        if (popped.has(i)) sheet.circle(bx, by, 6 * s).stroke({ width: 1.2 * s, color: 0xa5d8ff });
        else sheet.circle(bx, by, 7 * s).fill({ color: 0xffffff, alpha: 0.9 }).stroke({ width: 1.5 * s, color: 0x74c0fc });
      }
    };
    draw();
    tappable(c, () => {
      const left = [...Array(cols * rows).keys()].filter((i) => !popped.has(i));
      if (!left.length) {
        popped = new Set();
        sfx.pling();
        draw();
        return;
      }
      for (let n = 0; n < 3 && left.length; n++) {
        const i = left.splice(Math.floor(Math.random() * left.length), 1)[0];
        popped.add(i);
        later(n * 90, () => sfx.pop(1.2 + Math.random()), cleanups);
      }
      draw();
    }, new Rectangle(-cols * gap * 0.5 - 8 * s, -rows * gap * 0.5 - 8 * s, cols * gap + 16 * s, rows * gap + 16 * s));
  }
}
