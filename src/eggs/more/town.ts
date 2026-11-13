import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../../fx';
import { sfx } from '../../sound';
import { ease, tween } from '../../tween';
import { everyFrame, INK, later, oneAtATime, rand, roomSpan, spray, tappable, type Cleanups, type EggKit } from '../common';
import {
  bearFace, bunny, catFace, crawler, dangler, drawn, frog, hider, jiggler, moleFace, mouseFace, opener, peeker, puppy,
  raccoonFace, rocket, wallClock, worm, type Draw,
} from '../hidden';

/** Five more hidden things in the fire station, the police station, the school and the park. */

const line = (s: number, width = 2.5) => ({ width: width * s, color: INK });

/** A cardboard box, closed or with its flaps open (bottom middle at 0, 0). */
const box = (bw: number, bh: number, s: number, open: boolean): Draw => (g) => {
  if (open) {
    g.poly([-bw / 2, -bh, -bw / 2 - bw * 0.3, -bh - bh * 0.35, -bw * 0.1, -bh - bh * 0.3, 0, -bh]).fill(0xc9935a).stroke(line(s, 2));
    g.poly([bw / 2, -bh, bw / 2 + bw * 0.3, -bh - bh * 0.35, bw * 0.1, -bh - bh * 0.3, 0, -bh]).fill(0xc9935a).stroke(line(s, 2));
  }
  g.rect(-bw / 2, -bh, bw, bh).fill(0xd9a066).stroke(line(s));
  if (!open) g.moveTo(0, -bh).lineTo(0, -bh * 0.7).stroke(line(s, 2));
  g.rect(-bw * 0.18, -bh * 0.55, bw * 0.36, bh * 0.16).fill(0xf1e0c5);
};

// ---------------------------------------------------------------------------
export function moreFire(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.74;
  // 1. a fire extinguisher by the garage: whoosh, foam!
  {
    const x = 0.95 * w, y = h * 0.66;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => {
      g.rect(-16 * s, -50 * s, 32 * s, 8 * s).fill(0x868e96).stroke(line(s, 2));
      g.roundRect(-12 * s, -74 * s, 24 * s, 74 * s, 9 * s).fill(0xe5383b).stroke(line(s));
      g.rect(-12 * s, -40 * s, 24 * s, 14 * s).fill(0xf8f9fa);
      g.roundRect(-6 * s, -86 * s, 12 * s, 14 * s, 3 * s).fill(0x343a40);
      g.moveTo(5 * s, -82 * s).quadraticCurveTo(26 * s, -84 * s, 22 * s, -50 * s).stroke({ width: 5 * s, color: 0x343a40 });
    }, c);
    tappable(c, oneAtATime((done) => {
      sfx.hiss();
      spray(kit, x + 22 * s, y - 50 * s, 0.42, -0.12, 900, 0xffffff, fy + h * 0.12);
      tween(1000, (k) => (c.rotation = Math.sin(k * Math.PI * 8) * 0.05), () => ((c.rotation = 0), done()));
    }), new Rectangle(-22 * s, -92 * s, 50 * s, 94 * s));
  }
  // 2. a kitten up the fire pole: down it slides
  dangler(kit, cleanups, { x: 0.167 * w, top: 0, drop: h * 0.6, who: catFace(s, 0xf4a261), size: 30 * s, color: 0xffc94d, sound: () => sfx.meow() });
  // 3. a dalmatian puppy playing hide and seek
  hider(kit, cleanups, {
    spots: [{ x: -0.37 * w, y: fy + 4 * s }, { x: 0.9 * w, y: fy + 4 * s }, { x: 1.3 * w, y: fy + 4 * s }, { x: 0.26 * w, y: fy + 4 * s }],
    who: puppy(s * 1.2), size: 40 * s, sound: () => sfx.woof(),
  });
  // 4. a big red warning light over the garage
  {
    const x = 0.63 * w, y = h * 0.12;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const beams = new Graphics();
    for (const a of [0, Math.PI]) beams.poly([0, 0, Math.cos(a - 0.25) * 340 * s, Math.sin(a - 0.25) * 340 * s, Math.cos(a + 0.25) * 340 * s, Math.sin(a + 0.25) * 340 * s]).fill({ color: 0xff6b6b, alpha: 0.28 });
    beams.position.set(x, y - 14 * s);
    beams.visible = false;
    kit.over.addChild(beams);
    drawn((g) => {
      g.roundRect(-20 * s, -6 * s, 40 * s, 10 * s, 3 * s).fill(0x495057).stroke(line(s, 2));
      g.moveTo(-15 * s, -6 * s).arc(0, -6 * s, 15 * s, Math.PI, 0).closePath().fill(0xff4d4d).stroke(line(s, 2));
      g.ellipse(-5 * s, -13 * s, 4 * s, 3 * s).fill({ color: 0xffffff, alpha: 0.7 });
    }, c);
    let on = 0;
    everyFrame((dt) => {
      if (on <= 0) return;
      on -= dt;
      beams.rotation += dt * 0.008;
      if (on <= 0) beams.visible = false;
    }, cleanups);
    tappable(c, () => {
      if (on <= 0) sfx.siren();
      beams.visible = true;
      on = 2600;
    }, new Rectangle(-26 * s, -26 * s, 52 * s, 34 * s));
  }
  // 5. big boots by the coats: someone's in one
  {
    const boot = (g: Graphics, dx: number) => {
      g.roundRect(dx - 12 * s, -44 * s, 24 * s, 44 * s, 4 * s).fill(0x343a40).stroke(line(s, 2));
      g.roundRect(dx - 12 * s, -12 * s, 36 * s, 12 * s, 5 * s).fill(0x343a40).stroke(line(s, 2));
      g.rect(dx - 12 * s, -26 * s, 24 * s, 6 * s).fill(0xffd43b);
    };
    peeker(kit, cleanups, {
      x: -0.13 * w, y: fy + 2 * s, rise: 34 * s, who: frog(s), rare: mouseFace(s),
      hole: (g) => g.rect(-40 * s, -80 * s, 80 * s, 80 * s).fill(0xffffff),
      back: (g) => boot(g, 34 * s), front: (g) => boot(g, 0),
      hit: new Rectangle(-20 * s, -50 * s, 72 * s, 52 * s), sound: () => sfx.boing(1.4), rareSound: () => sfx.squeak(1.8),
    });
  }
}

// ---------------------------------------------------------------------------
export function morePolice(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.72;
  // 1. a security camera that looks round the room; tap: flash!
  {
    const c = new Container();
    c.position.set(0.6 * w, h * 0.04);
    kit.under.addChild(c);
    drawn((g) => g.rect(-4 * s, 0, 8 * s, 16 * s).fill(0x868e96).stroke(line(s, 1.5)), c);
    const cam = new Container();
    c.addChild(cam);
    drawn((g) => {
      g.roundRect(-30 * s, 10 * s, 44 * s, 20 * s, 5 * s).fill(0xe9ecef).stroke(line(s, 2));
      g.rect(-36 * s, 13 * s, 8 * s, 14 * s).fill(0x343a40);
      g.circle(-34 * s, 20 * s, 3 * s).fill(0x74c0fc);
    }, cam);
    const led = drawn((g) => g.circle(8 * s, 16 * s, 2.5 * s).fill(0xff6b6b), cam);
    let t = 0;
    everyFrame((dt) => {
      t += dt;
      cam.scale.x = Math.sin(t / 2200) > 0 ? 1 : -1;
      led.alpha = Math.sin(t / 300) > 0 ? 1 : 0.2;
    }, cleanups);
    tappable(c, oneAtATime((done) => {
      sfx.click();
      const span = roomSpan(kit);
      const flash = new Graphics().rect(span.x, 0, span.w, h).fill(0xffffff);
      kit.over.addChild(flash);
      tween(500, (k) => (flash.alpha = 0.8 * (1 - k)), () => (flash.destroy(), sfx.pling(), done()));
    }), new Rectangle(-42 * s, -4 * s, 64 * s, 38 * s));
  }
  // 2. a filing cabinet: the top drawer has surprises in it
  {
    const cw = 0.06 * w, ch = h * 0.2;
    const cabinet = (g: Graphics) => {
      g.rect(-cw / 2, -ch, cw, ch).fill(0x8d99ae).stroke(line(s));
      for (let i = 0; i < 3; i++) g.rect(-cw / 2 + 5 * s, -ch + 6 * s + (i * (ch - 12 * s)) / 3, cw - 10 * s, (ch - 24 * s) / 3).fill(0xadb5bd).stroke(line(s, 1.5)).rect(-8 * s, -ch + 18 * s + (i * (ch - 12 * s)) / 3, 16 * s, 4 * s).fill(INK);
    };
    const donut = (g: Graphics) => g.circle(0, -12 * s, 13 * s).fill(0xf4c27a).stroke(line(s, 2)).circle(0, -12 * s, 10 * s).fill(0xff8fab).circle(0, -12 * s, 4 * s).fill(0xffffff).stroke(line(s, 1.5));
    const papers = (g: Graphics) => g.rect(-12 * s, -30 * s, 24 * s, 30 * s).fill(0xffffff).stroke(line(s, 1.5)).rect(-8 * s, -22 * s, 16 * s, 3 * s).fill(0xadb5bd).rect(-8 * s, -14 * s, 12 * s, 3 * s).fill(0xadb5bd);
    opener(kit, cleanups, {
      x: 0.33 * w, y: fy, closed: cabinet, from: { x: 0, y: -ch + 4 * s }, up: 36 * s,
      open: (g) => (cabinet(g), g.rect(-cw / 2 - 6 * s, -ch + 2 * s, cw + 12 * s, (ch - 12 * s) / 3 + 6 * s).fill(0xced4da).stroke(line(s, 2))),
      inside: [donut, papers, mouseFace(s, 0xc9b8a6), donut],
      hit: new Rectangle(-cw / 2 - 6 * s, -ch - 10 * s, cw + 12 * s, ch + 10 * s), sound: () => sfx.drawer(),
    });
  }
  // 3. a raccoon (the one in the cell has a friend) in the air vent
  peeker(kit, cleanups, {
    x: 0.5 * w, y: h * 0.62, rise: 40 * s, who: raccoonFace(s),
    back: (g) => {
      g.rect(-26 * s, -40 * s, 52 * s, 40 * s).fill(0x343a40).stroke(line(s, 2));
      for (let i = 1; i < 5; i++) g.rect(-24 * s, -40 * s + i * 8 * s, 48 * s, 2 * s).fill(0x6c757d);
    },
    hole: (g) => g.rect(-26 * s, -40 * s, 52 * s, 40 * s).fill(0xffffff),
    hit: new Rectangle(-30 * s, -46 * s, 60 * s, 50 * s), sound: () => sfx.giggle(0.9),
  });
  // 4. keys on a hook: jingle jangle
  jiggler(kit, cleanups, {
    x: 1.005 * w, y: h * 0.4, how: 'swing', sound: () => sfx.jingle(),
    hit: new Rectangle(-30 * s, -6 * s, 60 * s, 84 * s),
    draw: (g) => {
      const s = (kit.h / 800) * 1.4;
      g.circle(0, 0, 3 * s).fill(INK);
      g.circle(0, 12 * s, 9 * s).stroke({ width: 3 * s, color: 0xadb5bd });
      for (const [dx, rot, col] of [[-8, 0.3, 0xffd43b], [0, 0, 0xced4da], [8, -0.3, 0xffa94d]] as const) {
        const kx = dx * s, ky = 20 * s;
        g.circle(kx, ky + 4 * s, 5 * s).fill(col).stroke(line(s, 1.5));
        g.moveTo(kx, ky + 8 * s).lineTo(kx - rot * 30 * s, ky + 32 * s).stroke({ width: 4 * s, color: col });
      }
    },
  });
  // 5. the station clock
  wallClock(kit, cleanups, -0.02 * w, h * 0.14, 0.03 * w, 0x1c3d6e);
}

// ---------------------------------------------------------------------------
export function moreSchool(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = h / 800, fy = h * 0.72, shelf = h * 0.497;
  // 1. a science-project volcano on the bookcase: it erupts!
  {
    const x = -0.33 * w;
    const c = new Container();
    c.position.set(x, shelf);
    kit.under.addChild(c);
    drawn((g) => {
      g.rect(-34 * s, -6 * s, 68 * s, 6 * s).fill(0x8d5a3b).stroke(line(s, 2));
      g.poly([-28 * s, -6 * s, -8 * s, -46 * s, 8 * s, -46 * s, 28 * s, -6 * s]).fill(0x8b6f47).stroke(line(s));
      g.poly([-8 * s, -46 * s, 8 * s, -46 * s, 5 * s, -38 * s, 0, -42 * s, -5 * s, -36 * s]).fill(0xff6b1a).stroke(line(s, 1.5));
      g.circle(-10 * s, -18 * s, 3 * s).fill(0x7bd36b);
      g.circle(12 * s, -22 * s, 3 * s).fill(0x7bd36b);
    }, c);
    tappable(c, oneAtATime((done) => {
      sfx.rawr();
      sfx.puff(0.7);
      tween(500, (k) => (c.scale.y = 1 + Math.sin(k * Math.PI * 4) * 0.06 * (1 - k)), () => (c.scale.y = 1));
      for (const col of [0xff6b1a, 0xffd43b, 0xe5383b]) spray(kit, x, shelf - 48 * s, rand(-0.06, 0.06), -0.5, 700, col, fy);
      later(600, () => burst(kit.sparkles, x, shelf - 140 * s, 10, 60), cleanups);
      later(1400, done, cleanups);
    }), new Rectangle(-36 * s, -56 * s, 72 * s, 58 * s));
  }
  // 2. a lunch box on the bookcase
  opener(kit, cleanups, {
    x: -0.48 * w, y: shelf, from: { x: 0, y: -20 * s }, up: 36 * s,
    closed: (g) => g.roundRect(-26 * s, -34 * s, 52 * s, 34 * s, 6 * s).fill(0x4dabf7).stroke(line(s)).moveTo(-10 * s, -34 * s).quadraticCurveTo(0, -48 * s, 10 * s, -34 * s).stroke(line(s, 3)).circle(-10 * s, -18 * s, 5 * s).fill(0xffd43b),
    open: (g) => g.poly([-26 * s, -34 * s, 26 * s, -34 * s, 22 * s, -60 * s, -22 * s, -60 * s]).fill(0x74c0fc).stroke(line(s, 2)).roundRect(-26 * s, -34 * s, 52 * s, 34 * s, 6 * s).fill(0x4dabf7).stroke(line(s)),
    inside: [
      (g) => g.poly([-16 * s, 0, 16 * s, 0, 0, -26 * s]).fill(0xf4c27a).stroke(line(s, 2)).poly([-12 * s, -4 * s, 12 * s, -4 * s, 0, -22 * s]).fill(0x8ce99a),
      (g) => g.circle(0, -12 * s, 12 * s).fill(0xe5383b).stroke(line(s, 2)).moveTo(0, -24 * s).lineTo(2 * s, -30 * s).stroke(line(s, 2)),
      mouseFace(s),
    ],
    hit: new Rectangle(-30 * s, -52 * s, 60 * s, 54 * s), sound: () => sfx.click(),
  });
  // 3. the lost property box: odd things come out of it
  {
    const bw = 0.07 * w, bh = 0.09 * h;
    opener(kit, cleanups, {
      x: 1.375 * w, y: fy, closed: box(bw, bh, s, false), open: box(bw, bh, s, true), from: { x: 0, y: -bh + 10 * s }, up: 44 * s,
      inside: [
        (g) => g.moveTo(-6 * s, -34 * s).lineTo(-6 * s, -10 * s).lineTo(10 * s, -4 * s).lineTo(12 * s, 6 * s).lineTo(-12 * s, 4 * s).lineTo(-16 * s, -34 * s).closePath().fill(0x9775fa).stroke(line(s, 2)),
        (g) => g.roundRect(-18 * s, -16 * s, 36 * s, 16 * s, 7 * s).fill(0xff6b6b).stroke(line(s, 2)).rect(-18 * s, -6 * s, 36 * s, 6 * s).fill(0xffffff).stroke(line(s, 1.5)),
        bearFace(s * 0.9, 0xff8fab, 0xffe3ec),
        (g) => g.circle(0, -12 * s, 12 * s).fill(0x69db7c).stroke(line(s, 2)).moveTo(-12 * s, -12 * s).quadraticCurveTo(0, -4 * s, 12 * s, -12 * s).stroke(line(s, 1.5)),
      ],
      hit: new Rectangle(-bw / 2 - 4 * s, -bh - 20 * s, bw + 8 * s, bh + 22 * s), sound: () => sfx.shelfOpen(),
    });
  }
  // 4. a model rocket hanging from the ceiling
  dangler(kit, cleanups, { x: 0.995 * w, top: 0, drop: h * 0.3, who: rocket(s), size: 30 * s, sound: () => sfx.whoosh() });
  // 5. a paint palette: tap for a splat of paint on the wall
  {
    const x = 1.375 * w, y = h * 0.3;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    const splats = new Container();
    kit.under.addChildAt(splats, kit.under.getChildIndex(c));
    const colors = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xb197fc, 0xff922b];
    drawn((g) => {
      g.circle(0, -30 * s, 3 * s).fill(INK);
      g.moveTo(0, -30 * s).lineTo(-14 * s, -14 * s).moveTo(0, -30 * s).lineTo(14 * s, -14 * s).stroke(line(s, 1.5));
      g.ellipse(0, 0, 34 * s, 24 * s).fill(0xf3d9b1).stroke(line(s));
      g.circle(14 * s, 6 * s, 6 * s).fill(0xffffff).stroke(line(s, 1.5));
      colors.forEach((col, i) => {
        const a = Math.PI * 0.75 + (i / colors.length) * Math.PI * 1.4;
        g.circle(Math.cos(a) * 20 * s, Math.sin(a) * 13 * s, 5 * s).fill(col);
      });
    }, c);
    tappable(c, () => {
      sfx.squish();
      const col = colors[Math.floor(Math.random() * colors.length)];
      const sx = rand(-80, 80) * s, sy = rand(-150, 150) * s;
      const sp = new Graphics();
      for (let i = 0; i < 7; i++) sp.circle(rand(-22, 22) * s, rand(-22, 22) * s, rand(4, 10) * s).fill(col);
      sp.circle(0, 0, 18 * s).fill(col);
      sp.position.set(x + sx, y + sy);
      splats.addChild(sp);
      tween(260, (k) => sp.scale.set(ease.outBack(k)));
      if (splats.children.length > 9) {
        const old = splats.children[0];
        tween(400, (k) => (old.alpha = 1 - k), () => old.destroy());
      }
    }, new Rectangle(-38 * s, -34 * s, 76 * s, 60 * s));
  }
}

// ---------------------------------------------------------------------------
export function morePark(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const s = (h / 800) * 1.2;
  const winter = kit.season === 'winter';
  // 1. a frog on a lily pad in the pond
  peeker(kit, cleanups, {
    x: 0.79 * w, y: h * 0.865, rise: 30 * s, who: frog(s),
    back: (g) => g.ellipse(0, 0, 22 * s, 7 * s).fill(winter ? 0xe7f5ff : 0x51cf66).stroke(line(s, 1.5)).poly([0, 0, 22 * s, -2 * s, 18 * s, 4 * s]).fill(winter ? 0xd0ebff : 0x74c0fc),
    hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 70 * s).fill(0xffffff),
    hit: new Rectangle(-30 * s, -40 * s, 60 * s, 48 * s), sound: () => (sfx.blub(), sfx.boing(0.7)),
  });
  // 2. a dandelion clock: blow its seeds away (it grows back)
  {
    const x = -0.08 * w, y = h * 0.95;
    const c = new Container();
    c.position.set(x, y);
    kit.under.addChild(c);
    drawn((g) => g.moveTo(0, 0).quadraticCurveTo(-4 * s, -24 * s, 0, -48 * s).stroke({ width: 3 * s, color: 0x2f9e44 }).ellipse(-8 * s, -6 * s, 9 * s, 3 * s).fill(0x51cf66), c);
    const head = drawn((g) => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.moveTo(0, -48 * s).lineTo(Math.cos(a) * 16 * s, -48 * s + Math.sin(a) * 16 * s);
      }
      g.stroke({ width: 1.2 * s, color: 0xdee2e6 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.circle(Math.cos(a) * 16 * s, -48 * s + Math.sin(a) * 16 * s, 2.4 * s).fill(0xffffff);
      }
      g.circle(0, -48 * s, 4 * s).fill(0xced4da);
    }, c);
    tappable(c, oneAtATime((done) => {
      sfx.puff(1.4);
      head.visible = false;
      for (let i = 0; i < 16; i++) {
        const seed = new Graphics().moveTo(0, 0).lineTo(0, 8 * s).stroke({ width: 1, color: 0xadb5bd }).circle(0, 0, 3 * s).fill(0xffffff);
        seed.position.set(x + rand(-14, 14) * s, y - 48 * s + rand(-14, 14) * s);
        kit.over.addChild(seed);
        const vx = rand(60, 160) * s, vy = rand(-90, -20) * s, wob = rand(0, 6);
        tween(rand(2600, 3600), (k) => {
          seed.position.set(seed.x + vx / 60, seed.y + vy / 60 + Math.sin(k * 10 + wob) * 0.6);
          seed.alpha = 1 - k;
        }, () => seed.destroy());
      }
      later(6000, () => {
        head.visible = true;
        head.scale.set(0.2);
        tween(600, (k) => head.scale.set(0.2 + 0.8 * ease.outBack(k)), done);
      }, cleanups);
    }), new Rectangle(-24 * s, -70 * s, 48 * s, 72 * s));
  }
  // 3. a hot air balloon drifting far away
  crawler(kit, cleanups, {
    from: { x: -0.6 * w, y: h * 0.17 }, to: { x: 1.6 * w, y: h * 0.13 }, size: 40 * s, speed: 14 * s, how: 'hop', sound: () => sfx.burner(),
    who: (g) => {
      const r = 26 * s;
      g.moveTo(-r, -r * 2.4).arc(0, -r * 2.4, r, Math.PI, 0).quadraticCurveTo(r, -r * 1.4, 6 * s, -r * 0.8).lineTo(-6 * s, -r * 0.8).quadraticCurveTo(-r, -r * 1.4, -r, -r * 2.4).fill(0xff6b6b).stroke(line(s, 2));
      g.moveTo(-r * 0.35, -r * 3.35).quadraticCurveTo(-r * 0.5, -r * 1.8, -4 * s, -r * 0.8).lineTo(4 * s, -r * 0.8).quadraticCurveTo(r * 0.5, -r * 1.8, r * 0.35, -r * 3.35).fill(0xffd43b).stroke(line(s, 1.5));
      g.moveTo(-6 * s, -r * 0.8).lineTo(-6 * s, -10 * s).moveTo(6 * s, -r * 0.8).lineTo(6 * s, -10 * s).stroke(line(s, 1.5));
      g.roundRect(-9 * s, -10 * s, 18 * s, 10 * s, 2 * s).fill(0x8d5a3b).stroke(line(s, 2));
    },
  });
  // 4. something wriggly in the flower bed
  peeker(kit, cleanups, {
    x: 1.05 * w, y: h * 0.9, rise: 32 * s, who: worm(s), rare: moleFace(s),
    hole: (g) => g.rect(-40 * s, -70 * s, 80 * s, 70 * s).fill(0xffffff),
    hit: new Rectangle(-30 * s, -40 * s, 60 * s, 46 * s), sound: () => sfx.pop(0.9), rareSound: () => sfx.giggle(0.9),
  });
  // 5. a bunny playing hide and seek round the park
  hider(kit, cleanups, {
    spots: [{ x: -0.7 * w, y: h * 0.8 }, { x: -0.12 * w, y: h * 0.73 }, { x: 1.06 * w, y: h * 0.76 }, { x: 1.42 * w, y: h * 0.77 }, { x: 1.62 * w, y: h * 0.74 }, { x: 0.58 * w, y: h * 0.77 }],
    who: bunny(s, winter ? 0xffffff : 0xe9d8c4), size: 40 * s,
  });
}
