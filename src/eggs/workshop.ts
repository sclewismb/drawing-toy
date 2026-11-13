import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { hearts } from '../fx';
import { randomBear, randomSquishy, renderToy } from '../makerArt';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { workshopLayout } from '../workshop';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Surprises in the teddy and squishy workshop:
 *  - the stuffing machine: fluff whirls round inside; tap it and it puffs, then the teddy maker opens
 *  - the big teddy button on the maker table: opens the teddy maker
 *  - the squishy machine on the bar: turn the handle, a squishy rolls out, and the squishy maker opens
 *  - teddies on the display shelves: tap for a hug and hearts
 *  - jars of squishies: tap one and it squishes
 *  - floppy unstuffed teddies on the pegboard: they flap
 *  - the heart box: hearts float out
 * The maker itself opens via kit.events ('make', 'bear' | 'squishy'), see main.ts.
 */
export function workshop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = workshopLayout(w, h);
  const make = (what: 'bear' | 'squishy') => kit.events?.emit('make', what);

  // --- finished teddies on the display shelves (new ones every visit) ---
  const toySprite = (pic: HTMLCanvasElement, height: number) => {
    const s = new Sprite(Texture.from(pic));
    s.anchor.set(0.5, 1);
    s.scale.set(height / pic.height);
    return s;
  };
  for (const side of [L.shelfL, L.shelfR]) {
    for (const y of L.shelves) {
      const n = 2;
      for (let i = 0; i < n; i++) {
        const x = side.x0 + ((side.x1 - side.x0) * (i + 0.5)) / n;
        const holder = new Container();
        const teddy = toySprite(renderToy('bear', { ...randomBear(), heart: true }, 0.3), h * 0.13);
        holder.addChild(teddy);
        holder.position.set(x, y + 2);
        kit.under.addChild(holder);
        tappable(holder, oneAtATime((done) => {
          sfx.giggle(1.3);
          hearts(kit.sparkles, x, y - h * 0.12, 4);
          tween(900, (t) => {
            const k = Math.sin(t * Math.PI);
            holder.scale.set(1 - 0.1 * k, 1 + 0.06 * k);
            holder.rotation = Math.sin(t * Math.PI * 4) * 0.15 * k;
          }, () => {
            holder.scale.set(1);
            holder.rotation = 0;
            done();
          });
        }), new Rectangle(-h * 0.06, -h * 0.13, h * 0.12, h * 0.13));
      }
    }
  }

  // --- floppy unstuffed teddies hanging on the pegboard ---
  const pb = L.pegboard;
  const skinCols = [0xb5835a, 0xffb3c6, 0x9bd0ff, 0xc8b6ff, 0xffe08a, 0xa8e6cf];
  for (let i = 0; i < 6; i++) {
    const x = pb.x + pb.w * (0.18 + (i % 3) * 0.32), y = pb.y + pb.h * (i < 3 ? 0.12 : 0.56);
    const skin = new Graphics();
    const col = skinCols[i];
    skin.circle(0, 0, 4).fill(INK); // the peg
    skin.circle(0, 22, 18).fill(col).stroke({ width: 2.5, color: INK }); // a flat head
    skin.circle(-14, 8, 7).circle(14, 8, 7).fill(col).stroke({ width: 2, color: INK });
    skin.moveTo(-16, 36).quadraticCurveTo(-22, 70, -10, 82).lineTo(10, 82).quadraticCurveTo(22, 70, 16, 36).closePath().fill(col).stroke({ width: 2.5, color: INK }); // a floppy body
    skin.moveTo(-14, 42).lineTo(-30, 64).moveTo(14, 42).lineTo(30, 64).stroke({ width: 7, color: col, cap: 'round' });
    skin.circle(-6, 20, 2).circle(6, 20, 2).fill(INK);
    skin.position.set(x, y);
    kit.under.addChild(skin);
    tappable(skin, oneAtATime((done) => {
      sfx.flutter();
      tween(1000, (t) => (skin.rotation = Math.sin(t * Math.PI * 5) * 0.4 * (1 - t)), done);
    }), new Rectangle(-30, -6, 60, 92));
  }

  // --- the stuffing machine: fluff whirls round in the glass drum ---
  const m = L.machine;
  const drum = new Graphics();
  drum.circle(m.x, m.y, m.r).fill({ color: 0xe3f2fd, alpha: 0.9 }).stroke({ width: 5, color: INK });
  drum.rect(m.x - m.r * 0.35, m.y - m.r * 1.45, m.r * 0.7, m.r * 0.5).fill(0xe5383b).stroke({ width: 4, color: INK }); // the chute
  kit.under.addChild(drum);
  const fluff = new Graphics();
  kit.under.addChild(fluff);
  const shine = new Graphics().ellipse(m.x - m.r * 0.4, m.y - m.r * 0.45, m.r * 0.22, m.r * 0.1).fill({ color: 0xffffff, alpha: 0.7 });
  shine.rotation = -0.6;
  kit.under.addChild(shine);
  const puffs = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: rand(0.2, 0.75), s: rand(0.6, 1) }));
  let whirl = 0.0015, time = 0;
  everyFrame((dt) => {
    time += dt;
    fluff.clear();
    for (const p of puffs) {
      p.a += whirl * dt * (1 + p.r);
      const x = m.x + Math.cos(p.a) * m.r * p.r, y = m.y + Math.sin(p.a) * m.r * p.r * 0.8;
      fluff.circle(x, y, m.r * 0.16 * p.s).fill(0xffffff).stroke({ width: 1.5, color: 0xdddddd });
    }
  }, cleanups);
  hotspot(kit, new Rectangle(m.x - m.r * 1.2, m.y - m.r * 1.6, m.r * 2.4, m.r * 2.8), oneAtATime((done) => {
    sfx.whirr();
    tween(1100, (t) => (whirl = 0.0015 + Math.sin(t * Math.PI) * 0.012), () => (whirl = 0.0015));
    later(500, () => {
      sfx.puff(1.2);
      for (let i = 0; i < 10; i++) tumble(kit, new Graphics().circle(0, 0, rand(8, 14)).fill(0xffffff).stroke({ width: 1.5, color: 0xdddddd }), m.x, m.y - m.r * 1.4, L.fy, { vx: rand(-0.12, 0.12), vy: rand(-0.4, -0.2), float: true });
    }, cleanups);
    later(1000, () => {
      make('bear');
      done();
    }, cleanups);
  }));

  // --- the big teddy button on the maker table (it glows: press me!) ---
  const t = L.table;
  const bx = (t.x0 + t.x1) / 2, by = t.top - 46;
  const glowG = new Graphics();
  glowG.eventMode = 'none';
  kit.under.addChild(glowG);
  const btn = new Container();
  const face = toySprite(renderToy('bear', { animal: 'bear', fur: 0, pattern: 'plain', eyes: 'sparkle', mouth: 'smile', tummy: 'heart', extra: 'bow', heart: true }, 0.4), h * 0.15);
  btn.addChild(face);
  btn.position.set(bx, by + h * 0.04);
  kit.under.addChild(btn);
  everyFrame(() => {
    glowG.clear();
    glow(glowG, bx, by - h * 0.03, h * 0.12, 0xfff3b0, 1.2 + Math.sin(time * 0.004) * 0.5);
    btn.scale.set(1 + Math.sin(time * 0.004) * 0.03);
  }, cleanups);
  tappable(btn, () => {
    sfx.pop(1.2);
    tween(300, (k) => btn.scale.set(1 + Math.sin(k * Math.PI) * 0.15));
    later(250, () => make('bear'), cleanups);
  }, new Rectangle(-h * 0.08, -h * 0.16, h * 0.16, h * 0.17));

  // --- jars of squishies behind the bar ---
  const j = L.jars;
  const squishyPics = Array.from({ length: 5 }, () => renderToy('squishy', randomSquishy(), 0.2));
  for (const [row, y] of j.rows.entries()) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = j.x0 + ((j.x1 - j.x0) * (i + 0.5)) / n;
      const base = y + h * 0.1;
      const jar = new Graphics();
      jar.roundRect(x - 26, base - 62, 52, 62, 10).fill({ color: 0xe3f2fd, alpha: 0.6 }).stroke({ width: 3, color: INK });
      jar.roundRect(x - 22, base - 70, 44, 10, 4).fill([0xff8fab, 0xffd166, 0x9bd0ff, 0xa8e6cf, 0xc8b6ff][(i + row) % 5]).stroke({ width: 2, color: INK });
      kit.under.addChild(jar);
      const sq = toySprite(squishyPics[(i + row * 2) % squishyPics.length], 42);
      sq.position.set(x, base - 6);
      kit.under.addChild(sq);
      tappable(sq, oneAtATime((done) => {
        sfx.squish(1.3);
        const sx = sq.scale.x, sy = sq.scale.y;
        tween(900, (k) => {
          const e = k < 0.15 ? ease.outCubic(k / 0.15) : Math.cos((k - 0.15) * Math.PI * 4) * (1 - k) * (1 - k);
          sq.scale.set(sx * (1 + 0.4 * e), sy * (1 - 0.45 * e));
        }, () => {
          sq.scale.set(sx, sy);
          done();
        });
      }), new Rectangle(-30, -60, 60, 64));
    }
  }

  // --- the squishy machine: turn the handle, out rolls a squishy, and the maker opens ---
  const gm = L.gumball;
  const machine = new Container();
  const mg = new Graphics();
  const R = Math.min(0.06 * w, h * 0.085);
  mg.rect(-R * 0.6, R * 0.7, R * 1.2, R * 1.1).fill(0xe5383b).stroke({ width: 4, color: INK });
  mg.circle(0, 0, R).fill({ color: 0xe3f2fd, alpha: 0.85 }).stroke({ width: 4, color: INK });
  const cols = [0xffc2d4, 0xfdffb6, 0xcaffbf, 0x9bf6ff, 0xbdb2ff, 0xffd6a5];
  for (let i = 0; i < 12; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0, R * 0.7);
    mg.circle(Math.cos(a) * r, Math.sin(a) * r * 0.8 + R * 0.15, R * 0.18).fill(cols[i % cols.length]).stroke({ width: 1.5, color: INK });
  }
  mg.rect(-R * 0.2, R * 1.4, R * 0.4, R * 0.25).fill(0x2b2d42);
  mg.circle(-R * 0.5, -R * 0.5, R * 0.15).fill({ color: 0xffffff, alpha: 0.8 });
  const handle = new Graphics().circle(0, 0, R * 0.2).fill(0xffd166).stroke({ width: 3, color: INK });
  handle.rect(-R * 0.06, -R * 0.35, R * 0.12, R * 0.35).fill(0xffd166).stroke({ width: 2, color: INK });
  handle.position.set(R * 0.9, R * 1.15);
  machine.addChild(mg, handle);
  machine.position.set(gm.x, gm.y);
  kit.under.addChild(machine);
  tappable(machine, oneAtATime((done) => {
    sfx.click();
    tween(700, (k) => (handle.rotation = k * Math.PI * 2), () => {
      sfx.pop(1.4);
      const ball = new Graphics().circle(0, 0, R * 0.2).fill(cols[Math.floor(rand(0, cols.length))]).stroke({ width: 2, color: INK });
      ball.position.set(gm.x, gm.y + R * 1.5);
      kit.over.addChild(ball);
      tween(600, (k) => {
        ball.x = gm.x - k * R * 1.2;
        ball.y = gm.y + R * 1.5 + Math.sin(k * Math.PI) * -R * 0.6;
      }, () => {
        ball.destroy();
        sfx.squish(1.3);
        make('squishy');
        done();
      });
    });
  }), new Rectangle(-R * 1.2, -R * 1.2, R * 2.6, R * 3.2));

  // --- the heart box: hearts float out ---
  const hb = L.heartBox;
  const lid = new Graphics().roundRect(-44, -12, 88, 14, 6).fill(0xff8fab).stroke({ width: 3, color: INK });
  lid.position.set(hb.x, hb.y - 34);
  kit.under.addChild(lid);
  hotspot(kit, new Rectangle(hb.x - 50, hb.y - 60, 100, 70), oneAtATime((done) => {
    sfx.twinkle();
    tween(400, (k) => (lid.rotation = -0.6 * Math.sin(k * Math.PI)));
    hearts(kit.sparkles, hb.x, hb.y - 40, 9);
    later(1200, done, cleanups);
  }));
}
