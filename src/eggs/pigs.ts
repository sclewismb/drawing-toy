import { Container, Graphics, Rectangle } from 'pixi.js';
import { pigsLayout } from '../pigs';
import { sfx } from '../sound';
import { tween } from '../tween';
import { cloudRain, everyFrame, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Surprises at the pig family's cottage:
 *  - the mud puddle: tap it to splash; drop anyone in it and they come out muddy!
 *  - the bath tub: bubbles; drop a muddy one in and they come out clean
 *  - the door: a piglet peeks out and oinks
 *  - smoke from the chimney; pumpkins that grow (tap three times); the tyre swing;
 *    clothes flapping on the washing line (a sock flies off); rain from the clouds
 */
const MUD = 0xb08d6a;

export function pigs(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = pigsLayout(w, h);
  let time = 0;
  everyFrame((dt) => (time += dt), cleanups);

  // --- smoke puffs from the chimney ---
  const ch = L.chimney;
  later(500, function puff() {
    const p = new Graphics().circle(0, 0, rand(10, 16)).fill({ color: 0xe9ecef, alpha: 0.8 });
    tumble(kit, p, ch.x + rand(-6, 6), ch.y - 10, -100, { vy: -0.08, vx: rand(0.01, 0.04), float: true, spin: 0 });
    later(900, puff, cleanups);
  }, cleanups);

  // --- the mud puddle: splash! ---
  const m = L.puddle;
  const splash = (x: number, y: number, n = 14) => {
    sfx.squish(0.7);
    later(80, () => sfx.blub(), cleanups);
    for (let i = 0; i < n; i++) {
      const d = new Graphics().circle(0, 0, rand(3, 7)).fill(kit.season === 'winter' ? 0xdce6ee : 0x7a5230);
      tumble(kit, d, x, y, y + rand(-10, 20), { vx: rand(-0.35, 0.35), vy: rand(-0.7, -0.35), spin: 0 });
    }
  };
  hotspot(kit, new Rectangle(m.x - m.rx, m.y - m.ry, m.rx * 2, m.ry * 2), oneAtATime((done) => {
    splash(m.x + rand(-0.4, 0.4) * m.rx, m.y);
    later(500, done, cleanups);
  }));
  // drop anyone in it: they come out muddy
  kit.secrets?.lock({
    accepts: ['*'],
    area: () => ({ x: m.x - m.rx, y: m.y - m.ry * 2.5, w: m.rx * 2, h: m.ry * 3.5 }),
    open: (_name, ch) => {
      const c = ch as { x: number; y: number; sprite?: { tint: number } } | undefined;
      splash(c?.x ?? m.x, m.y, 20);
      if (c?.sprite) c.sprite.tint = MUD;
      return true;
    },
  });

  // --- the bath tub: bubbles, and drop a muddy one in to clean them ---
  const t = L.tub;
  const bubbles = (n = 10) => {
    sfx.blub();
    for (let i = 0; i < n; i++) {
      const b = new Graphics().circle(0, 0, rand(5, 11)).stroke({ width: 2, color: 0x4dabf7 }).circle(-2, -2, 2).fill(0xffffff);
      tumble(kit, b, t.x + rand(-70, 70), t.y - 60, -50, { vy: -0.12, vx: rand(-0.03, 0.03), float: true, spin: 0 });
    }
  };
  hotspot(kit, new Rectangle(t.x - 95, t.y - 70, 190, 90), oneAtATime((done) => {
    bubbles();
    later(700, done, cleanups);
  }));
  kit.secrets?.lock({
    accepts: ['*'],
    area: () => ({ x: t.x - 95, y: t.y - 140, w: 190, h: 160 }),
    open: (_name, ch) => {
      const c = ch as { sprite?: { tint: number } } | undefined;
      bubbles(18);
      sfx.twinkle();
      if (c?.sprite) c.sprite.tint = 0xffffff;
      return true;
    },
  });

  // --- the cottage door: a piglet peeks out ---
  const d = L.door;
  const peek = new Container();
  const pg = new Graphics();
  pg.circle(0, 0, 26).fill(0xffd1dc).stroke({ width: 3, color: INK });
  pg.poly([-18, -16, -24, -36, -6, -24]).poly([18, -16, 24, -36, 6, -24]).fill(0xf5a3bb).stroke({ width: 2.5, color: INK });
  pg.ellipse(0, 8, 12, 9).fill(0xf5a3bb).stroke({ width: 2.5, color: INK });
  pg.circle(-4, 8, 2.5).circle(4, 8, 2.5).fill(INK);
  pg.circle(-10, -6, 3).circle(10, -6, 3).fill(INK);
  peek.addChild(pg);
  peek.position.set(d.x, d.base - 40);
  peek.visible = false;
  const door = new Graphics();
  door.roundRect(-d.w / 2, 0, d.w, d.base - d.top, 6).fill(0x52b788).stroke({ width: 3, color: INK });
  door.circle(d.w * 0.3, (d.base - d.top) * 0.55, 6).fill(0xffd166).stroke({ width: 2, color: INK });
  door.position.set(d.x, d.top);
  kit.under.addChild(peek, door);
  tappable(door, oneAtATime((done) => {
    sfx.click();
    tween(400, (k) => (door.scale.x = 1 - k * 1.6));
    later(350, () => {
      peek.visible = true;
      sfx.oink(1.5);
      tween(1600, (k) => (peek.rotation = Math.sin(k * Math.PI * 4) * 0.2), () => {
        peek.visible = false;
        tween(400, (k) => (door.scale.x = -0.6 + k * 1.6), done);
      });
    }, cleanups);
  }), new Rectangle(-d.w / 2 - 6, 0, d.w + 12, d.base - d.top));

  // --- pumpkins in the vegetable patch: tap and they grow (third time: boing!) ---
  const p = L.patch;
  for (const fx of [0.25, 0.65]) {
    const pk = new Container();
    const pkg = new Graphics();
    pkg.ellipse(-12, 0, 16, 20).ellipse(12, 0, 16, 20).ellipse(0, 0, 18, 22).fill(0xff922b).stroke({ width: 2.5, color: INK });
    pkg.rect(-3, -28, 6, 10).fill(0x52b788).stroke({ width: 2, color: INK });
    pk.addChild(pkg);
    pk.position.set(p.x0 + (p.x1 - p.x0) * fx, p.y);
    pkg.y = -20;
    kit.under.addChild(pk);
    let size = 1;
    tappable(pk, oneAtATime((done) => {
      const from = size;
      size = size >= 2.2 ? 1 : size + 0.6;
      if (size === 1) {
        sfx.boing(0.8);
        tween(800, (k) => {
          pk.y = p.y - Math.sin(k * Math.PI) * 60;
          pk.scale.set(from + (1 - from) * k);
        }, done);
        return;
      }
      sfx.pop(0.9);
      tween(400, (k) => pk.scale.set(from + (size - from) * k), done);
    }), new Rectangle(-30, -48, 60, 56));
  }

  // --- the tyre swing ---
  const s = L.swing;
  const swing = new Container();
  const sg = new Graphics();
  sg.moveTo(0, 0).lineTo(0, s.seat - s.branch).stroke({ width: 3, color: 0x8d5524 });
  sg.ellipse(0, s.seat - s.branch + 20, 30, 24).stroke({ width: 12, color: 0x2b2d42 });
  swing.addChild(sg);
  swing.position.set(s.x, s.branch);
  kit.under.addChild(swing);
  let push = 0;
  everyFrame(() => (swing.rotation = Math.sin(time * 0.004) * (0.05 + push * 0.4)), cleanups);
  tappable(swing, oneAtATime((done) => {
    sfx.whoosh();
    tween(2400, (k) => (push = Math.sin(k * Math.PI)), () => {
      push = 0;
      done();
    });
  }), new Rectangle(-40, s.seat - s.branch - 10, 80, 60));

  // --- the washing line: clothes flap; a sock flies off and comes back ---
  const ln = L.line;
  const cols = [0xff8fab, 0x4dabf7, 0xffd43b, 0x52b788];
  ['shirt', 'sock', 'shorts', 'sock'].forEach((kind, i) => {
    const x = ln.x0 + ((ln.x1 - ln.x0) * (i + 1)) / 5;
    const c = new Graphics();
    if (kind === 'shirt') c.poly([-26, 0, 26, 0, 34, 16, 20, 20, 20, 56, -20, 56, -20, 20, -34, 16]).fill(cols[i]).stroke({ width: 2.5, color: INK });
    else if (kind === 'shorts') c.poly([-22, 0, 22, 0, 24, 40, 4, 40, 0, 20, -4, 40, -24, 40]).fill(cols[i]).stroke({ width: 2.5, color: INK });
    else c.poly([-8, 0, 8, 0, 8, 30, 20, 34, 18, 44, -8, 42]).fill(cols[i]).stroke({ width: 2.5, color: INK });
    c.rect(-3, -6, 6, 10).fill(0xa47e4b);
    c.position.set(x, ln.y + Math.sin(((i + 1) / 5) * Math.PI) * 22);
    kit.under.addChild(c);
    tappable(c, oneAtATime((done) => {
      sfx.flutter();
      const home = { x: c.x, y: c.y };
      if (kind === 'sock') {
        tween(1800, (k) => {
          c.x = home.x + Math.sin(k * Math.PI) * w * 0.15;
          c.y = home.y - Math.sin(k * Math.PI) * h * 0.15;
          c.rotation = k * Math.PI * 4;
        }, () => {
          c.position.set(home.x, home.y);
          c.rotation = 0;
          done();
        });
      } else tween(900, (k) => (c.skew.x = Math.sin(k * Math.PI * 6) * 0.3 * (1 - k)), done);
    }), new Rectangle(-36, -8, 72, 66));
  });

  cloudRain(kit, cleanups, () => h * 0.8);
}
