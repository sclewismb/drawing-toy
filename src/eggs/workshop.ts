import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { burst, hearts } from '../fx';
import { randomGlow, renderGlow, type GlowRecipe, type GlowShape } from '../glowArt';
import { randomBear, randomSquishy, renderToy } from '../makerArt';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { workshopLayout } from '../workshop';
import { everyFrame, glow, hotspot, INK, later, lightSwitch, oneAtATime, rand, roomLights, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Surprises in the teddy and squishy workshop:
 *  - the stuffing machine: fluff whirls round inside; tap it and it puffs, then the teddy maker opens
 *  - the big teddy button on the maker table: opens the teddy maker
 *  - the squishy machine on the bar: turn the handle, a squishy rolls out, and the squishy maker opens
 *  - teddies on the display shelves: tap for a hug and hearts
 *  - jars of squishies: tap one and it squishes
 *  - floppy unstuffed teddies on the pegboard: they flap
 *  - the heart box: hearts float out
 *  - the glow stick den: see glowDen below
 * The maker itself opens via kit.events ('make', 'bear' | 'squishy' | 'glow'), see main.ts.
 */
export function workshop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = workshopLayout(w, h);
  const make = (what: 'bear' | 'squishy' | 'glow') => kit.events?.emit('make', what);
  glowDen(kit, cleanups, make);

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

/**
 * The glow stick den (far right): it's dark in here. A light switch for the
 * whole shop (lights off and every glow stick glows), glowing things hanging
 * on a rail (tap: it swings and turns into another), the glow machine on the
 * glow bar (tap: crack! and the glow stick maker opens) and a neon heart.
 * They're all on the layer in front of the darkness, so they always glow.
 */
function glowDen(kit: EggKit, cleanups: Cleanups, make: (what: 'glow') => void) {
  const { w, h } = kit;
  const gd = workshopLayout(w, h).glow;
  const lights = roomLights(kit);
  lightSwitch(kit, gd.lightSwitch.x, gd.lightSwitch.y, lights);
  const textures: Texture[] = [];
  cleanups.push(() => textures.forEach((t) => t.destroy(true)));

  // --- glowing bracelets, necklaces, headbands... on the rail ---
  const rl = gd.rail;
  const kinds: GlowShape[] = ['bracelet', 'headband', 'necklace', 'glasses', 'bunny-ears', 'crown', 'bracelet'];
  const n = 5;
  const scale = h * 0.00026;
  for (let i = 0; i < n; i++) {
    const x = rl.x0 + ((rl.x1 - rl.x0) * (i + 0.5)) / n;
    const holder = new Container();
    holder.position.set(x, rl.y);
    holder.addChild(new Graphics().moveTo(0, 0).lineTo(0, 12).stroke({ width: 3, color: 0xced4da }));
    const item = new Sprite();
    item.anchor.set(0.5);
    holder.addChild(item);
    let k = i;
    const show = () => {
      const r: GlowRecipe = { ...randomGlow(), shape: kinds[k++ % kinds.length] };
      const { picture, glow } = renderGlow(r, scale);
      const t = Texture.from(glow);
      textures.push(t);
      item.texture = t;
      item.y = 10 + picture.height / 2;
    };
    show();
    kit.over.addChild(holder);
    tappable(holder, oneAtATime((done) => {
      sfx.crack();
      burst(kit.sparkles, x, rl.y + h * 0.08, 8, 60);
      tween(900, (t) => (holder.rotation = Math.sin(t * Math.PI * 4) * 0.35 * (1 - t)), () => {
        holder.rotation = 0;
        done();
      });
      later(250, show, cleanups);
    }), new Rectangle(-h * 0.06, 0, h * 0.12, h * 0.15));
  }

  // --- the glow machine: a jar full of glowing glow sticks on a purple box with a big button ---
  const m = gd.machine;
  const R = h * 0.07;
  const machine = new Container();
  machine.position.set(m.x, m.base);
  const box = new Graphics();
  box.roundRect(-R, -R * 3.3, R * 2, R * 2.3, R * 0.4).fill({ color: 0xbfe8ff, alpha: 0.18 }).stroke({ width: 4, color: INK });
  box.roundRect(-R * 0.75, -R * 3.55, R * 1.5, R * 0.3, 6).fill(0x8a5cf6).stroke({ width: 3, color: INK });
  box.roundRect(-R * 1.25, -R * 1.05, R * 2.5, R * 1.05, 10).fill(0x8a5cf6).stroke({ width: 4, color: INK });
  box.rect(R * 0.45, -R * 0.45, R * 0.6, R * 0.22).fill(0x1e1b3a); // where a glow stick comes out
  const sticks = new Graphics();
  const neon = [0xff4fd8, 0xffe94d, 0x3dfcff, 0x8cff4d, 0xff9f1c, 0xb45cff, 0xff4d6d];
  const drawSticks = (flash: number) => {
    sticks.clear();
    for (let i = 0; i < 11; i++) {
      const cx = -R * 0.6 + ((i * 37) % 11) / 10 * R * 1.2, cy = -R * (1.35 + ((i * 53) % 7) / 7 * 1.6), a = ((i * 71) % 10) / 10 * Math.PI;
      const dx = Math.cos(a) * R * 0.35, dy = Math.sin(a) * R * 0.35, col = neon[i % neon.length];
      sticks.moveTo(cx - dx, cy - dy).lineTo(cx + dx, cy + dy).stroke({ width: 14 + flash * 10, color: col, alpha: 0.25 + flash * 0.25, cap: 'round' });
      sticks.moveTo(cx - dx, cy - dy).lineTo(cx + dx, cy + dy).stroke({ width: 7, color: col, cap: 'round' });
      sticks.moveTo(cx - dx, cy - dy).lineTo(cx + dx, cy + dy).stroke({ width: 2.5, color: 0xffffff, cap: 'round' });
    }
  };
  drawSticks(0);
  const button = new Graphics().circle(0, 0, R * 0.28).fill(0xff4fd8).stroke({ width: 3, color: INK });
  button.circle(-R * 0.08, -R * 0.08, R * 0.08).fill({ color: 0xffffff, alpha: 0.7 });
  button.position.set(-R * 0.45, -R * 0.52);
  machine.addChild(box, sticks, button);
  kit.over.addChild(machine);
  tappable(machine, oneAtATime((done) => {
    sfx.crack();
    tween(250, (t) => button.scale.set(1 - 0.25 * Math.sin(t * Math.PI)));
    tween(900, (t) => {
      drawSticks(Math.sin(t * Math.PI));
      machine.rotation = Math.sin(t * Math.PI * 6) * 0.04 * (1 - t);
    }, () => {
      drawSticks(0);
      machine.rotation = 0;
    });
    // out pops a glow stick
    const pop = new Graphics().moveTo(-12, 0).lineTo(12, 0).stroke({ width: 12, color: 0x8cff4d, alpha: 0.4, cap: 'round' }).moveTo(-12, 0).lineTo(12, 0).stroke({ width: 6, color: 0x8cff4d, cap: 'round' });
    pop.position.set(m.x + R * 0.75, m.base - R * 0.34);
    kit.over.addChild(pop);
    tween(700, (t) => {
      pop.x = m.x + R * 0.75 + t * R * 1.2;
      pop.y = m.base - R * 0.34 - Math.sin(t * Math.PI) * R * 1.2 + t * R * 0.3;
      pop.rotation = t * 6;
    }, () => pop.destroy());
    later(250, () => burst(kit.sparkles, m.x, m.base - R * 2.2, 12, 90), cleanups);
    later(900, () => {
      make('glow');
      done();
    }, cleanups);
  }), new Rectangle(-R * 1.3, -R * 3.6, R * 2.6, R * 3.6));

  // --- a neon heart on the wall: tap and it flickers into a new colour ---
  const s = gd.sign, hs = h * 0.065;
  const heart = new Graphics();
  let ci = 0;
  const drawHeart = (on: number) => {
    heart.clear();
    const col = neon[ci % neon.length];
    const path = () => heart.moveTo(0, hs * 0.35).bezierCurveTo(-hs * 1.1, -hs * 0.3, -hs * 0.5, -hs * 1.05, 0, -hs * 0.45).bezierCurveTo(hs * 0.5, -hs * 1.05, hs * 1.1, -hs * 0.3, 0, hs * 0.35).closePath();
    for (const [lw, a] of [[22, 0.12], [14, 0.25], [8, 1]] as const) path().stroke({ width: lw, color: col, alpha: a * on, join: 'round' });
    path().stroke({ width: 2.5, color: 0xffffff, alpha: on, join: 'round' });
  };
  drawHeart(1);
  heart.position.set(s.x, s.y);
  kit.over.addChild(heart);
  tappable(heart, oneAtATime((done) => {
    sfx.tinkle();
    let t = 0;
    const flicker = [0, 1, 0, 1, 0.3, 1];
    const step = () => {
      if (heart.destroyed) return;
      if (t === 3) ci++;
      drawHeart(flicker[t]);
      if (++t < flicker.length) later(90, step, cleanups);
      else done();
    };
    step();
  }), new Rectangle(-hs * 1.2, -hs * 1.1, hs * 2.4, hs * 1.7));
}
