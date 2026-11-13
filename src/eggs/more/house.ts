import { Container, Graphics, Rectangle } from 'pixi.js';
import { sfx } from '../../sound';
import { ease, tween } from '../../tween';
import { everyFrame, INK, later, oneAtATime, rand, spray, tappable, type Cleanups, type EggKit } from '../common';
import {
  bearFace, bird, bug, catFace, cheer, wallClock, crawler, dangler, drawn, fairy, flier, ghost, gnome, hider, jiggler, moleFace,
  mouseFace, mouseHole, opener, paperPlane, peeker, pick, snail, snailShell, spider, squirrel, tinyDoor, tinyDoorOpen, worm,
} from '../hidden';

/**
 * Five more hidden things in each room of the house and the backyard.
 * Positions are fractions of the room (x of the panel width, y of the height),
 * picked to sit in empty spots beside the older surprises.
 */

const line = (s: number, width = 2.5) => ({ width: width * s, color: INK });
const star = (s: number): ((g: Graphics) => void) => (g) => g.star(0, -10 * s, 5, 10 * s, 4.5 * s).fill(0xffd43b).stroke(line(s, 1.5));

// ---------------------------------------------------------------------------
export function moreBedroomA(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.74;
  // 1. a mouse hole under the map (sometimes a tiny dragon lives there)
  mouseHole(kit, cleanups, -0.17 * w, fy, s);
  // 2. a spider tucked up by the ceiling over the laundry basket
  dangler(kit, cleanups, { x: -0.49 * w, top: 0, drop: h * 0.4, who: spider(s), size: 24 * s, sound: () => sfx.boing(1.7) });
  // 3. a fairy door between the doors
  opener(kit, cleanups, {
    x: 1.32 * w, y: fy, closed: tinyDoor(s * 1.3), open: tinyDoorOpen(s * 1.3), inside: [fairy(s * 1.2), fairy(s * 1.2), star(s)],
    from: { x: 0, y: -16 * s }, up: 50 * s, hit: new Rectangle(-24 * s, -48 * s, 48 * s, 50 * s),
    sound: () => sfx.tinkle(), onOpen: () => later(500, () => cheer(kit, 1.32 * w, fy - 60 * s), cleanups),
  });
  // 4. a clock that tells the real time
  wallClock(kit, cleanups, 1.32 * w, h * 0.17, 0.032 * w);
  // 5. a planets mobile hanging over the bed
  jiggler(kit, cleanups, {
    x: 0.72 * w, y: 0, how: 'twirl', sound: () => sfx.tune([784, 988, 1175, 988, 784], 0.16),
    hit: new Rectangle(-0.07 * w, h * 0.04, 0.14 * w, h * 0.13),
    draw: (g) => {
      const bar = h * 0.07;
      g.moveTo(0, 0).lineTo(0, bar).moveTo(-0.055 * w, bar).lineTo(0.055 * w, bar).stroke(line(s, 2));
      for (const [dx, len] of [[-0.05, 0.05], [0, 0.08], [0.05, 0.04]]) g.moveTo(dx * w, bar).lineTo(dx * w, bar + h * len).stroke({ width: 1.5 * s, color: 0x868e96 });
      g.ellipse(-0.05 * w, bar + h * 0.07, 22 * s, 6 * s).stroke({ width: 4 * s, color: 0xffd43b });
      g.circle(-0.05 * w, bar + h * 0.07, 13 * s).fill(0xf4a261).stroke(line(s, 2));
      g.ellipse(-0.05 * w, bar + h * 0.07 + 2 * s, 22 * s, 6 * s).stroke({ width: 3 * s, color: 0xffd43b, alpha: 0.6 });
      g.circle(0, bar + h * 0.1, 15 * s).fill(0x4dabf7).stroke(line(s, 2));
      g.ellipse(-4 * s, bar + h * 0.1 - 3 * s, 6 * s, 4 * s).fill(0x69db7c);
      g.star(0.05 * w, bar + h * 0.055, 5, 13 * s, 6 * s).fill(0xffd43b).stroke(line(s, 2));
    },
  });
}

// ---------------------------------------------------------------------------
export function moreBedroomB(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.74;
  // 1. fairy lights along the top of the teal wall: tap and they chase in new colours
  {
    const x0 = 0.01 * w, x1 = 0.44 * w, n = 15;
    const palettes = [[0xff8fab, 0xffd43b, 0x74c0fc, 0x8ce99a], [0xffd43b, 0xfff3bf], [0xb197fc, 0x74c0fc, 0x63e6be], [0xff6b6b, 0x8ce99a]];
    let pal = 0, chase = -1;
    const at = (i: number) => {
      const t = i / (n - 1);
      return { x: x0 + (x1 - x0) * t, y: h * 0.03 + Math.sin(t * Math.PI * 3) ** 2 * h * 0.035 };
    };
    const g = new Graphics();
    kit.under.addChild(g);
    let t = 0;
    everyFrame((dt) => {
      t += dt;
      if (chase >= 0) chase += dt / 70;
      if (chase > n + 6) chase = -1;
      g.clear();
      for (let i = 0; i <= 60; i++) {
        const p = at((i / 60) * (n - 1));
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
      g.stroke(line(s, 1.5));
      const colors = palettes[pal];
      for (let i = 0; i < n; i++) {
        const p = at(i);
        const lit = chase < 0 ? 0.75 + 0.25 * Math.sin(t / 400 + i) : Math.abs(chase - i) < 2 ? 1 : 0.35;
        g.circle(p.x, p.y + 7 * s, 9 * s * lit).fill({ color: colors[i % colors.length], alpha: 0.25 * lit });
        g.ellipse(p.x, p.y + 7 * s, 4 * s, 6 * s).fill({ color: colors[i % colors.length], alpha: 0.4 + 0.6 * lit }).stroke(line(s, 1));
      }
    }, cleanups);
    const hit = new Container();
    kit.under.addChild(hit);
    tappable(hit, () => {
      pal = (pal + 1) % palettes.length;
      chase = 0;
      sfx.twinkle();
    }, new Rectangle(x0, 0, x1 - x0, h * 0.09));
  }
  // 2. a music box on the desk with a tiny dancer
  {
    const bw = 0.05 * w, bh = 0.035 * h;
    const box = (g: Graphics) => g.roundRect(-bw / 2, -bh, bw, bh, 4 * s).fill(0xffa8c5).stroke(line(s, 2)).rect(-bw / 2, -bh * 0.55, bw, 3 * s).fill(0xffd43b);
    opener(kit, cleanups, {
      x: 0.855 * w, y: h * 0.505, still: true, shutAfter: 3200, up: 30 * s, from: { x: 0, y: -bh },
      closed: (g) => (box(g), g.roundRect(-bw / 2 - 2 * s, -bh - 7 * s, bw + 4 * s, 9 * s, 3 * s).fill(0xff8fab).stroke(line(s, 2))),
      open: (g) => (g.poly([-bw / 2, -bh, bw / 2, -bh, bw / 2 - 4 * s, -bh - 26 * s, -bw / 2 + 4 * s, -bh - 26 * s]).fill(0xd0ebff).stroke(line(s, 2)), box(g)),
      inside: [(g) => {
        g.poly([-9 * s, 0, 9 * s, 0, 0, -12 * s]).fill(0xb197fc).stroke(line(s, 1.2));
        g.moveTo(0, -12 * s).lineTo(0, -20 * s).moveTo(-7 * s, -18 * s).lineTo(7 * s, -21 * s).stroke(line(s, 1.5));
        g.circle(0, -23 * s, 4 * s).fill(0xffd8b5).stroke(line(s, 1.2));
      }],
      hit: new Rectangle(-bw / 2 - 6 * s, -bh - 30 * s, bw + 12 * s, bh + 32 * s),
      sound: () => sfx.tune([1047, 1319, 1568, 1319, 1175, 1397, 1175, 1047], 0.22),
      onOpen: (p) => p && tween(2600, (k) => !p.destroyed && (p.scale.x = Math.cos(k * Math.PI * 8))),
    });
  }
  // 3. fluffy slippers by the doors: someone's hiding in one
  {
    const s = (kit.h / 800) * 1.5;
    const slipper = (g: Graphics, dx: number) => {
      g.roundRect(dx - 26 * s, -16 * s, 52 * s, 16 * s, 8 * s).fill(0xffc9de).stroke(line(s, 2));
      g.ellipse(dx + 14 * s, -14 * s, 13 * s, 7 * s).fill(0xffffff).stroke(line(s, 1.5));
    };
    peeker(kit, cleanups, {
      x: -0.21 * w, y: h * 0.87, rise: 26 * s, who: mouseFace(s * 0.8), rare: catFace(s * 0.7, 0xadb5bd),
      hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 66 * s).fill(0xffffff),
      back: (g) => slipper(g, 38 * s), front: (g) => slipper(g, 0),
      hit: new Rectangle(-30 * s, -40 * s, 100 * s, 44 * s),
      sound: () => sfx.squeak(1.9), rareSound: () => sfx.meow(),
    });
  }
  // 4. a purple spider in the corner by the door
  dangler(kit, cleanups, { x: 1.665 * w, top: 0, drop: h * 0.3, who: spider(s, 0x9775fa), size: 24 * s, sound: () => sfx.boing(1.9) });
  // 5. a paper plane: tap it and it glides off and lands somewhere else
  flier(kit, cleanups, {
    rests: [{ x: 1.52 * w, y: h * 0.07 }, { x: -0.2 * w, y: h * 0.06 }, { x: 1.255 * w, y: h * 0.465 }, { x: 0.22 * w, y: h * 0.67 }],
    who: paperPlane(s * 1.5, 0xe7f5ff), size: 36 * s, glide: true, ms: 3000,
    area: { x0: -0.5 * w, x1: 1.8 * w, y0: h * 0.1, y1: h * 0.55 }, sound: () => sfx.whoosh(),
  });
  void fy;
}

// ---------------------------------------------------------------------------
export function moreKitchen(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.74, top = h * 0.47;
  // 1. a mouse hole beside the fridge
  mouseHole(kit, cleanups, 0.175 * w, fy, s, 0xc9b8a6);
  // 2. the cookie jar: a cookie pops out (or the mouse, who's been helping himself)
  {
    const jar = (g: Graphics) => {
      g.roundRect(-24 * s, -48 * s, 48 * s, 48 * s, 14 * s).fill({ color: 0xe7f5ff, alpha: 0.95 }).stroke(line(s));
      g.roundRect(-14 * s, -34 * s, 28 * s, 18 * s, 6 * s).fill(0xffc078).stroke(line(s, 1.5));
      g.circle(-6 * s, -25 * s, 2 * s).fill(0x8d5a3b);
      g.circle(5 * s, -28 * s, 2 * s).fill(0x8d5a3b);
    };
    const cookie = (g: Graphics) => {
      g.circle(0, -12 * s, 13 * s).fill(0xe0a458).stroke(line(s, 2));
      for (const [x, y] of [[-5, -15], [4, -18], [3, -8], [-4, -7]]) g.circle(x * s, y * s, 2.2 * s).fill(0x5c3a21);
    };
    opener(kit, cleanups, {
      x: 0.27 * w, y: top, from: { x: 0, y: -40 * s }, up: 46 * s,
      closed: (g) => (jar(g), g.roundRect(-26 * s, -56 * s, 52 * s, 10 * s, 5 * s).fill(0xff8787).stroke(line(s, 2)).circle(0, -60 * s, 5 * s).fill(0xff8787).stroke(line(s, 2))),
      open: (g) => (jar(g), g.roundRect(18 * s, -66 * s, 52 * s, 10 * s, 5 * s).fill(0xff8787).stroke(line(s, 2))),
      inside: [cookie, cookie, cookie, mouseFace(s * 0.8, 0xc9b8a6)],
      hit: new Rectangle(-30 * s, -70 * s, 60 * s, 72 * s),
      sound: () => (sfx.shelfOpen(), later(700, () => sfx.munch(), cleanups)),
    });
  }
  // 3. the toaster on the counter: press it and up pops the toast
  {
    const c = new Container();
    c.position.set(0.765 * w, top);
    kit.under.addChild(c);
    const toast = [-11, 11].map((dx) => {
      const g = new Graphics()
        .roundRect(-10 * s, -26 * s, 20 * s, 26 * s, 6 * s).fill(0xf4c27a).stroke(line(s, 2))
        .roundRect(-6 * s, -22 * s, 12 * s, 18 * s, 4 * s).fill(0xffe8b0);
      g.position.set(dx * s, -24 * s);
      c.addChild(g);
      return g;
    });
    c.addChild(new Graphics().roundRect(-30 * s, -40 * s, 60 * s, 40 * s, 10 * s).fill(0xced4da).stroke(line(s)).rect(-30 * s, -12 * s, 60 * s, 4 * s).fill(0xadb5bd));
    const lever = new Graphics().roundRect(28 * s, -30 * s, 9 * s, 6 * s, 2 * s).fill(INK);
    c.addChild(lever);
    tappable(c, oneAtATime((done) => {
      sfx.click();
      lever.y = 16 * s;
      toast.forEach((t) => (t.y = -10 * s));
      later(1100, () => {
        sfx.ding();
        sfx.boing(1.2);
        lever.y = 0;
        const flip = Math.random() < 0.5;
        tween(1100, (k) => {
          toast.forEach((t, i) => {
            t.y = -24 * s - Math.sin(k * Math.PI) * (110 + i * 40) * s;
            t.rotation = flip ? k * Math.PI * 2 * (i ? -1 : 1) : 0;
          });
        }, () => (toast.forEach((t) => ((t.y = -24 * s), (t.rotation = 0))), done()));
      }, cleanups);
    }), new Rectangle(-34 * s, -50 * s, 74 * s, 52 * s));
  }
  // 4. a cat flap in the back door
  peeker(kit, cleanups, {
    x: -0.72 * w, y: fy - 2 * s, rise: 34 * s, who: catFace(s * 0.9, 0x868e96), rare: catFace(s * 0.9, 0x343a40),
    back: (g) => g.rect(-20 * s, -35 * s, 40 * s, 35 * s).fill(0x868e96).stroke(line(s, 2)).rect(-15 * s, -30 * s, 30 * s, 26 * s).fill(0xadb5bd).stroke({ width: 1.5 * s, color: 0x495057 }),
    hole: (g) => g.rect(-17 * s, -32 * s, 34 * s, 32 * s).fill(0xffffff),
    hit: new Rectangle(-24 * s, -40 * s, 48 * s, 42 * s), sound: () => sfx.meow(), stay: 1800,
  });
  // 5. a fly: tap it and it buzzes off somewhere else
  flier(kit, cleanups, {
    rests: [{ x: -0.36 * w, y: h * 0.3 }, { x: 0.47 * w, y: h * 0.21 }, { x: -0.2 * w, y: h * 0.545 }, { x: 0.74 * w, y: h * 0.13 }],
    who: bug(s * 1.1, 'fly'), size: 26 * s, area: { x0: -0.6 * w, x1: 0.9 * w, y0: h * 0.08, y1: h * 0.6 }, sound: () => sfx.buzz(1.4),
  });
}

// ---------------------------------------------------------------------------
export function moreLounge(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.72, landY = h * 0.42;
  // 1. a slinky on the stairs: tap and it walks down them (and boings back up)
  {
    const steps = 5, sx0 = -0.16 * w, stepW = (0.14 * w) / steps, stepH = (fy - landY) / steps;
    const spots = [...Array(steps).keys()].map((i) => ({ x: sx0 + (i + 0.5) * stepW, y: landY + i * stepH })).concat([{ x: 0.02 * w, y: fy + 0.02 * h }]);
    const c = new Container();
    const coil = new Graphics();
    for (let i = 0; i < 9; i++) coil.ellipse(0, -4 * s - i * 3.2 * s, 13 * s, 4 * s).stroke({ width: 3.2 * s, color: [0xff6b6b, 0xffa94d, 0xffd43b, 0x69db7c, 0x4dabf7, 0x9775fa][i % 6] });
    c.addChild(coil);
    kit.under.addChild(c);
    let at = 0;
    c.position.set(spots[0].x, spots[0].y);
    tappable(c, oneAtATime((done) => {
      const dir = at === 0 ? 1 : -1;
      const go = () => {
        const from = spots[at], to = spots[at + dir];
        if (!to) return done();
        sfx.spring(dir > 0 ? 1 + at * 0.1 : 1.6);
        tween(dir > 0 ? 420 : 260, (k) => {
          c.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 30 * s);
          coil.scale.y = 1 + Math.sin(k * Math.PI) * 0.8;
          coil.rotation = Math.sin(k * Math.PI) * 0.5 * dir;
        }, () => {
          at += dir;
          coil.scale.y = 1;
          coil.rotation = 0;
          if (at === steps) (sfx.boing(0.9), done());
          else go();
        });
      };
      go();
    }), new Rectangle(-20 * s, -40 * s, 40 * s, 44 * s));
  }
  // 2. a little cupboard under the stairs: a friendly ghost lives there
  opener(kit, cleanups, {
    x: -0.125 * w, y: fy, from: { x: 0, y: -4 * s }, up: 30 * s, inFront: true,
    closed: (g) => g.roundRect(-0.018 * w, -0.12 * h, 0.036 * w, 0.12 * h, 4 * s).fill(0xdee2e6).stroke(line(s, 2)).circle(0.01 * w, -0.06 * h, 3 * s).fill(INK),
    open: (g) => g.roundRect(-0.018 * w, -0.12 * h, 0.036 * w, 0.12 * h, 4 * s).fill(0x212529).stroke(line(s, 2)).poly([-0.018 * w, 0, -0.03 * w, 5 * s, -0.03 * w, -0.12 * h - 6 * s, -0.018 * w, -0.12 * h]).fill(0xdee2e6).stroke(line(s, 2)),
    inside: [ghost(s * 1.1), ghost(s * 1.1), bearFace(s)],
    hit: new Rectangle(-0.025 * w, -0.13 * h, 0.05 * w, 0.13 * h),
    sound: () => (sfx.drawer(), later(400, () => sfx.giggle(1.5), cleanups)), shutAfter: 2600,
  });
  // 3. the letterbox in the front door: post comes through (or a nose!)
  {
    const x = 1.28 * w, y = h * 0.37;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    c.addChild(new Graphics().roundRect(-24 * s, -7 * s, 48 * s, 14 * s, 4 * s).fill(0xd4a017).stroke(line(s, 2)));
    const flap = new Graphics().roundRect(-20 * s, -4 * s, 40 * s, 8 * s, 3 * s).fill(0xf0c419).stroke(line(s, 1.5));
    c.addChild(flap);
    tappable(c, oneAtATime((done) => {
      sfx.clank();
      flap.scale.y = -0.3;
      if (Math.random() < 0.2) {
        const nose = drawn((g) => g.ellipse(0, 0, 10 * s, 7 * s).fill(INK).circle(-3 * s, -2 * s, 2 * s).fill(0x868e96), c, 0, 0);
        nose.scale.set(0.2);
        sfx.woof();
        tween(1400, (k) => nose.scale.set(Math.sin(k * Math.PI) * 1.2), () => (nose.destroy(), (flap.scale.y = 1), done()));
        return;
      }
      const post = new Graphics();
      const kind = pick(['letter', 'heart', 'card']);
      post.rect(-16 * s, -11 * s, 32 * s, 22 * s).fill(kind === 'card' ? 0xffec99 : 0xffffff).stroke(line(s, 2));
      if (kind === 'card') post.circle(-6 * s, 0, 6 * s).fill(0x74c0fc);
      else post.moveTo(-16 * s, -11 * s).lineTo(0, 2 * s).lineTo(16 * s, -11 * s).stroke(line(s, 1.5));
      if (kind === 'heart') post.circle(0, 4 * s, 4 * s).fill(0xff6b6b);
      post.position.set(x, y);
      kit.under.addChild(post);
      const floorY = fy + 0.06 * h, drift = rand(-60, 60) * s;
      tween(1700, (k) => {
        post.position.set(x + drift * k + Math.sin(k * 10) * 14 * s, y + (floorY - y) * k);
        post.rotation = Math.sin(k * 12) * 0.5;
      }, () => {
        post.rotation = 0.2;
        flap.scale.y = 1;
        sfx.flutter();
        later(1800, () => tween(500, (k) => (post.alpha = 1 - k), () => post.destroy()), cleanups);
        done();
      });
    }), new Rectangle(-30 * s, -14 * s, 60 * s, 28 * s));
  }
  // 4. a teddy peeking round the half wall at the top of the stairs
  peeker(kit, cleanups, {
    x: -0.2 * w, y: landY, rise: 40 * s, sideways: -1, who: bearFace(s), rare: ghost(s),
    hole: (g) => g.rect(-90 * s, -70 * s, 90 * s, 70 * s).fill(0xffffff),
    hit: new Rectangle(-50 * s, -46 * s, 50 * s, 46 * s), sound: () => sfx.giggle(1.2), rareSound: () => sfx.giggle(1.6),
  });
  // 5. a moth that loves the lamp
  flier(kit, cleanups, {
    rests: [{ x: 0.615 * w, y: h * 0.28 }, { x: 1.07 * w, y: h * 0.11 }, { x: 0.38 * w, y: h * 0.12 }],
    who: bug(s * 1.2, 'moth'), size: 26 * s, area: { x0: 0.3 * w, x1: 1.15 * w, y0: h * 0.08, y1: h * 0.45 }, sound: () => sfx.flutter(),
  });
}

// ---------------------------------------------------------------------------
export function moreBackyard(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.3;
  const winter = kit.season === 'winter';
  // 1. a molehill on the lawn (sometimes it's a worm)
  peeker(kit, cleanups, {
    x: 0.05 * w, y: h * 0.92, rise: 32 * s, who: moleFace(s), rare: worm(s),
    hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 70 * s).fill(0xffffff),
    front: (g) => g.ellipse(0, 0, 30 * s, 13 * s).fill(winter ? 0xf8f9fa : 0x8b5e3c).stroke(line(s, 2)).circle(-12 * s, -4 * s, 3 * s).fill(winter ? 0xdee2e6 : 0x6b4226).circle(9 * s, -6 * s, 2.5 * s).fill(winter ? 0xdee2e6 : 0x6b4226),
    hit: new Rectangle(-34 * s, -46 * s, 68 * s, 58 * s), sound: () => (sfx.pop(0.8), sfx.giggle(0.9)), rareSound: () => sfx.squeak(1.2),
  });
  // 2. a squirrel scampering along the fence
  crawler(kit, cleanups, { from: { x: -0.55 * w, y: h * 0.49 }, to: { x: 0.42 * w, y: h * 0.49 }, who: squirrel(s), size: 30 * s, speed: 70 * s, how: 'zoom', sound: () => sfx.chirp() });
  // 3. a bird bath: a bird drops in for a splash (frozen in winter: it slides!)
  {
    const x = 0.93 * w, y = h * 0.66;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => {
      g.poly([-10 * s, 0, 10 * s, 0, 6 * s, -60 * s, -6 * s, -60 * s]).fill(0xced4da).stroke(line(s, 2));
      g.roundRect(-22 * s, -6 * s, 44 * s, 8 * s, 4 * s).fill(0xadb5bd).stroke(line(s, 2));
      g.moveTo(-40 * s, -70 * s).quadraticCurveTo(0, -48 * s, 40 * s, -70 * s).closePath().fill(0xced4da).stroke(line(s, 2));
      g.ellipse(0, -70 * s, 36 * s, 6 * s).fill(winter ? 0xe7f5ff : 0x74c0fc).stroke(line(s, 1.5));
    }, c);
    const b = new Container();
    drawn(bird(s, pick([0xff8787, 0x4ea8ff, 0xffd43b])), b);
    b.visible = false;
    c.addChild(b);
    tappable(c, oneAtATime((done) => {
      b.visible = true;
      const from = { x: 160 * s, y: -220 * s };
      sfx.flutter();
      tween(900, (k) => b.position.set(from.x * (1 - k), from.y * (1 - k) - 72 * s * k), () => {
        b.scale.x = -1;
        sfx.chirp();
        if (winter) {
          sfx.slideWhistle(1.2);
          tween(1200, (k) => (b.x = Math.sin(k * Math.PI * 2) * 26 * s), () => leave());
        } else {
          sfx.water(0.8);
          for (let i = 0; i < 3; i++) later(i * 300, () => spray(kit, x + rand(-10, 10) * s, y - 76 * s, rand(-0.12, 0.12), -rand(0.3, 0.45), 260, 0x74c0fc, y), cleanups);
          tween(1100, (k) => (b.rotation = Math.sin(k * Math.PI * 6) * 0.25), () => leave());
        }
      });
      const leave = () => {
        b.rotation = 0;
        sfx.chirp();
        tween(900, (k) => b.position.set(-200 * s * k, -72 * s - 200 * s * k), () => ((b.visible = false), (b.scale.x = 1), done()));
      };
    }), new Rectangle(-44 * s, -84 * s, 88 * s, 86 * s));
  }
  // 4. a snail slowly going along the fence
  crawler(kit, cleanups, { from: { x: -0.35 * w, y: h * 0.54 }, to: { x: -0.12 * w, y: h * 0.54 }, who: snail(s), hiding: snailShell(s), size: 24 * s, speed: 7 * s, how: 'hide', sound: () => sfx.pop(0.7) });
  // 5. a garden gnome who hides somewhere else each time he's found
  hider(kit, cleanups, {
    spots: [{ x: -0.05 * w, y: h * 0.62 }, { x: 0.42 * w, y: h * 0.6 }, { x: 1.85 * w, y: h * 0.93 }, { x: 0.83 * w, y: h * 0.6 }, { x: 1.03 * w, y: h * 0.6 }],
    who: gnome(s * 1.2), size: 46 * s,
  });
}
