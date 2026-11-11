import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { windowView } from '../places';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { everyFrame, hotspot, INK, later, oneAtATime, rand, spray, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Surprises in the new parts of the town places (see townWide.ts for where
 * things are).
 */

const COLOURS = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];

/** Something pops up from behind a spot, waits, and goes back down. */
function popUp(parent: Container, art: Graphics, x: number, y: number, rise: number, sound: () => void, done: () => void) {
  art.position.set(x, y);
  parent.addChild(art);
  tween(300, (t) => (art.y = y - rise * ease.outBack(t)), () => {
    sound();
    tween(900, (t) => (art.rotation = Math.sin(t * Math.PI * 4) * 0.15), () => {
      tween(250, (t) => (art.y = y - rise * (1 - t)), () => {
        art.destroy();
        done();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Fire station
// ---------------------------------------------------------------------------
export function fireWideEggs(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;

  // --- three lockers: open one and see what's inside ---
  const inside = [cat, duck, spring];
  for (let i = 0; i < 3; i++) {
    const lx = -0.58 * w + i * 0.09 * w, ly = h * 0.18, lw = 0.08 * w, lh = h * 0.4;
    const back = new Graphics().rect(lx, ly, lw, lh).fill(0x343a40).stroke({ width: 3, color: INK });
    kit.under.addChild(back);
    const peek = new Container();
    const mask = new Graphics().rect(lx, ly, lw, lh).fill(0xffffff);
    peek.mask = mask;
    kit.under.addChild(mask, peek);
    const door = new Container();
    door.position.set(lx, ly);
    const art = new Graphics();
    art.rect(0, 0, lw, lh).fill(0xe5383b).stroke({ width: 3, color: INK });
    for (let k = 0; k < 4; k++) art.rect(lw * 0.2, 12 + k * 9, lw * 0.6, 4).fill(0x9d0208);
    art.rect(lw * 0.78, lh * 0.45, 6, 26).fill(0xdee2e6).stroke({ width: 1.5, color: INK });
    door.addChild(art);
    kit.under.addChild(door);
    hotspot(kit, new Rectangle(lx, ly, lw, lh), oneAtATime((done) => {
      sfx.drawer();
      tween(250, (t) => (door.scale.x = 1 - 0.85 * t), () => {
        inside[i](peek, lx + lw / 2, ly + lh, () => {
          tween(250, (t) => (door.scale.x = 0.15 + 0.85 * t), done);
        });
      });
    }));
  }
  function cat(layer: Container, x: number, y: number, done: () => void) {
    const g = new Graphics();
    g.poly([-20, -10, -14, -34, -2, -18]).poly([20, -10, 14, -34, 2, -18]).fill(0x6c757d).stroke({ width: 2.5, color: INK });
    g.circle(0, 0, 22).fill(0x6c757d).stroke({ width: 2.5, color: INK });
    g.moveTo(-12, -2).quadraticCurveTo(-8, 2, -4, -2).moveTo(4, -2).quadraticCurveTo(8, 2, 12, -2).stroke({ width: 2, color: INK }); // sleepy eyes
    popUp(layer, g, x, y + 24, 60, () => sfx.meow(), done);
  }
  function duck(layer: Container, x: number, y: number, done: () => void) {
    const g = new Graphics();
    g.ellipse(0, 0, 18, 13).fill(0xffd60a).stroke({ width: 2, color: INK });
    g.circle(11, -14, 10).fill(0xffd60a).stroke({ width: 2, color: INK });
    g.circle(13, -16, 2).fill(INK);
    g.poly([19, -14, 28, -11, 19, -8]).fill(0xff8c00);
    popUp(layer, g, x, y + 20, 50, () => sfx.quack(), done);
  }
  function spring(layer: Container, x: number, y: number, done: () => void) {
    const g = new Graphics();
    for (let k = 0; k < 6; k++) g.ellipse(0, -k * 10, 14, 5).stroke({ width: 4, color: COLOURS[k] });
    g.circle(0, -66, 14).fill(0xffd166).stroke({ width: 2, color: INK });
    g.circle(-5, -68, 2.5).circle(5, -68, 2.5).fill(INK);
    popUp(layer, g, x, y + 10, 70, () => sfx.spring(1.2), done);
  }

  // --- firefighters' jackets: they swing, and a helmet drops off ---
  const coats = new Container();
  coats.position.set(-0.12 * w, h * 0.23);
  const cg = new Graphics();
  for (const [i, ox] of [-0.06, 0, 0.06].entries()) {
    cg.poly([ox * w - 24, 0, ox * w + 24, 0, ox * w + 30, h * 0.3, ox * w - 30, h * 0.3]).fill(0xffb703).stroke({ width: 3, color: INK });
    cg.rect(ox * w - 30, h * 0.18, 60, 8).rect(ox * w - 30, h * 0.24, 60, 8).fill(0xdee2e6);
    void i;
  }
  coats.addChild(cg);
  const helmet = new Graphics();
  const drawHelmet = (g: Graphics) => g.moveTo(-22, 0).arc(0, 0, 22, Math.PI, 0).lineTo(-22, 0).fill(0xe5383b).stroke({ width: 2.5, color: INK }).roundRect(-30, -2, 60, 8, 4).fill(0xe5383b).stroke({ width: 2, color: INK });
  drawHelmet(helmet);
  helmet.position.set(0, -4);
  coats.addChild(helmet);
  kit.under.addChild(coats);
  tappable(coats, oneAtATime((done) => {
    sfx.whoosh();
    tween(1300, (t) => (coats.rotation = Math.sin(t * Math.PI * 5) * 0.06 * (1 - t)));
    if (helmet.visible) {
      helmet.visible = false;
      const f = new Graphics();
      drawHelmet(f);
      tumble(kit, f, coats.x, coats.y - 4, fy + h * 0.05, { vx: rand(-0.08, 0.08) });
      later(450, () => sfx.clank(), cleanups);
      later(2600, () => !helmet.destroyed && (helmet.visible = true), cleanups);
    }
    later(1300, done, cleanups);
  }), new Rectangle(-0.1 * w, -20, 0.2 * w, h * 0.34));

  // --- the big pot on the stove: bubbles and steam ---
  const px = 1.06 * w, py = h * 0.46;
  const pot = new Graphics();
  pot.roundRect(px - 34, py - 46, 68, 46, 6).fill(0xadb5bd).stroke({ width: 3, color: INK });
  pot.rect(px - 40, py - 50, 80, 8).fill(0x8d99ae).stroke({ width: 2, color: INK });
  kit.under.addChild(pot);
  hotspot(kit, new Rectangle(px - 50, py - 70, 100, 80), oneAtATime((done) => {
    sfx.burner();
    for (let i = 0; i < 10; i++) {
      later(i * 120, () => {
        if (i % 3 === 0) sfx.blub();
        const b = new Graphics().circle(0, 0, rand(5, 10)).fill({ color: 0xffffff, alpha: 0.7 });
        const sx = px + rand(-24, 24);
        b.position.set(sx, py - 50);
        kit.over.addChild(b);
        tween(1200, (t) => {
          b.y = py - 50 - t * h * 0.18;
          b.x = sx + Math.sin(t * 8) * 8;
          b.alpha = 0.7 * (1 - t);
          b.scale.set(1 + t);
        }, () => b.destroy());
      }, cleanups);
    }
    later(1500, done, cleanups);
  }));

  // --- the toaster: pop! ---
  const tx = 1.19 * w, ty = h * 0.46;
  const toaster = new Graphics().roundRect(tx - 26, ty - 34, 52, 34, 8).fill(0xdee2e6).stroke({ width: 3, color: INK });
  toaster.rect(tx - 16, ty - 36, 10, 4).rect(tx + 6, ty - 36, 10, 4).fill(INK);
  kit.under.addChild(toaster);
  hotspot(kit, new Rectangle(tx - 36, ty - 50, 72, 56), oneAtATime((done) => {
    sfx.pop(0.9);
    for (const dx of [-11, 11]) {
      const toast = new Graphics().roundRect(-10, -12, 20, 24, 5).fill(0xe0a458).stroke({ width: 2, color: INK });
      toast.roundRect(-7, -9, 14, 18, 4).fill(0xf6d7a7);
      tumble(kit, toast, tx + dx, ty - 40, ty - 6, { vy: -0.7, vx: dx * 0.004 });
    }
    later(1600, done, cleanups);
  }));

  // --- the fire dog's bed: a squeaky bone ---
  const bone = new Graphics();
  bone.roundRect(-18, -5, 36, 10, 5).fill(0xffffff).stroke({ width: 2, color: INK });
  for (const [cx, cy] of [[-18, -5], [-18, 5], [18, -5], [18, 5]]) bone.circle(cx, cy, 6).fill(0xffffff).stroke({ width: 2, color: INK });
  const bx = 1.63 * w, by = fy + h * 0.045;
  bone.position.set(bx, by);
  kit.under.addChild(bone);
  tappable(bone, oneAtATime((done) => {
    sfx.squeak(1.6);
    tween(500, (t) => {
      bone.y = by - Math.sin(t * Math.PI) * 30;
      bone.rotation = t * Math.PI * 2;
    }, done);
  }), new Rectangle(-30, -16, 60, 32));
}

// ---------------------------------------------------------------------------
// Police station
// ---------------------------------------------------------------------------
export function policeWideEggs(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.72;

  // --- the bell on the front desk: ding! ---
  const bx = -0.32 * w, by = h * 0.48;
  const bell = new Graphics();
  bell.moveTo(-16, 0).arc(0, 0, 16, Math.PI, 0).lineTo(-16, 0).fill(0xffd166).stroke({ width: 2.5, color: INK });
  bell.rect(-20, 0, 40, 5).fill(0x8d99ae).stroke({ width: 2, color: INK });
  bell.circle(0, -18, 4).fill(INK);
  bell.position.set(bx, by);
  kit.under.addChild(bell);
  tappable(bell, oneAtATime((done) => {
    sfx.ding();
    burst(kit.sparkles, bx, by - 20, 6, 40);
    tween(300, (t) => bell.scale.set(1 + 0.2 * Math.sin(t * Math.PI)), done);
  }), new Rectangle(-30, -30, 60, 40));

  // --- the water cooler: glug glug ---
  const cx = -0.48 * w, cy = h * 0.4;
  const cooler = new Graphics();
  cooler.rect(cx - 28, cy, 56, fy - cy).fill(0xf8f9fa).stroke({ width: 3, color: INK });
  cooler.roundRect(cx - 24, cy - 70, 48, 70, 14).fill({ color: 0x9fd8e8, alpha: 0.85 }).stroke({ width: 3, color: INK });
  cooler.rect(cx + 10, cy + 30, 10, 8).fill(0x4ea8ff);
  kit.under.addChild(cooler);
  tappable(cooler, oneAtATime((done) => {
    sfx.blub();
    later(300, () => sfx.blub(), cleanups);
    for (let i = 0; i < 6; i++) {
      later(i * 150, () => {
        const b = new Graphics().circle(0, 0, rand(3, 6)).stroke({ width: 2, color: 0xffffff });
        const sx = cx + rand(-14, 14);
        b.position.set(sx, cy - 6);
        kit.over.addChild(b);
        tween(800, (t) => {
          b.y = cy - 6 - t * 56;
          b.alpha = 1 - t * 0.8;
        }, () => b.destroy());
      }, cleanups);
    }
    later(1200, done, cleanups);
  }), new Rectangle(cx - 34, cy - 76, 68, fy - cy + 80));

  // --- lost and found: what's in the box today? ---
  const lx = -0.07 * w, ly = fy + h * 0.06;
  const box = new Graphics();
  box.rect(lx - 40, ly - 50, 80, 50).fill(0xc68b59).stroke({ width: 3, color: INK });
  box.poly([lx - 40, ly - 50, lx - 54, ly - 66, lx - 10, ly - 66, lx, ly - 50]).fill(0xd4a373).stroke({ width: 2, color: INK });
  box.rect(lx - 18, ly - 32, 36, 12).fill(0xfff3e6).stroke({ width: 2, color: INK });
  kit.under.addChild(box);
  const things: ((g: Graphics) => void)[] = [
    (g) => g.circle(0, 0, 16).fill(0xb5835a).stroke({ width: 2, color: INK }).circle(-12, -12, 7).circle(12, -12, 7).fill(0xb5835a).stroke({ width: 2, color: INK }).circle(-5, -2, 2).circle(5, -2, 2).fill(INK),
    (g) => g.moveTo(-24, 0).arc(0, 0, 24, Math.PI, 0).lineTo(-24, 0).fill(0x4ea8ff).stroke({ width: 2, color: INK }).moveTo(0, 0).lineTo(0, 24).stroke({ width: 3, color: INK }),
    (g) => g.roundRect(-8, -18, 16, 28, 6).roundRect(-8, 2, 26, 12, 6).fill(0x7bd36b).stroke({ width: 2, color: INK }),
    (g) => g.roundRect(-20, -8, 40, 14, 6).fill(0xe5383b).stroke({ width: 2, color: INK }).circle(-12, 8, 6).circle(12, 8, 6).fill(INK),
    (g) => g.circle(-8, 0, 9).stroke({ width: 4, color: 0xffd166 }).rect(0, -3, 22, 6).fill(0xffd166),
  ];
  let next = 0;
  hotspot(kit, new Rectangle(lx - 56, ly - 72, 112, 76), oneAtATime((done) => {
    sfx.pop(1.2);
    const g = new Graphics();
    things[next](g);
    next = (next + 1) % things.length;
    tumble(kit, g, lx, ly - 60, ly + 10, { vy: -0.8, vx: rand(-0.2, 0.2) });
    later(1200, done, cleanups);
  }));

  // --- the garage door rolls up: the police motorbike! ---
  const gx = 1.15 * w, gy = h * 0.12, gw = 0.34 * w, gh = fy - gy;
  const outside = new Graphics();
  windowView(outside, gx, gy, gw, gh * 0.7);
  outside.rect(gx, gy + gh * 0.7, gw, gh * 0.3).fill(0x8d99ae);
  // the motorbike
  const mx = gx + gw / 2, my = gy + gh - 20;
  outside.circle(mx - 50, my, 22).circle(mx + 50, my, 22).fill(0x2b2d42).stroke({ width: 3, color: INK });
  outside.roundRect(mx - 46, my - 40, 92, 26, 10).fill(0xffffff).stroke({ width: 3, color: INK });
  outside.rect(mx - 46, my - 30, 92, 8).fill(0x1d4f86);
  outside.moveTo(mx + 30, my - 40).lineTo(mx + 44, my - 66).stroke({ width: 5, color: INK });
  outside.rect(mx - 6, my - 58, 20, 10).fill(0x4ea8ff).stroke({ width: 2, color: INK });
  kit.under.addChild(outside);
  const door = new Graphics();
  kit.under.addChild(door);
  let up = 0, isUp = false;
  const drawDoor = () => {
    door.clear();
    const dh = gh * (1 - up * 0.92);
    door.rect(gx, gy, gw, dh).fill(0x6c757d).stroke({ width: 4, color: INK });
    for (let y = gy + 16; y < gy + dh - 4; y += 22) door.moveTo(gx, y).lineTo(gx + gw, y);
    door.stroke({ width: 2, color: 0x495057 });
  };
  drawDoor();
  let siren = 0;
  const lightG = new Graphics();
  kit.over.addChild(lightG);
  let lt = 0;
  everyFrame((dt) => {
    lt += dt;
    lightG.clear();
    if (siren > 0 && up > 0.5) lightG.circle(mx + 4, my - 62, 14).fill({ color: Math.floor(lt / 200) % 2 ? 0xe5383b : 0x4ea8ff, alpha: 0.7 });
  }, cleanups);
  hotspot(kit, new Rectangle(gx, gy, gw, gh), () => {
    isUp = !isUp;
    sfx.zip();
    const from = up;
    tween(700, (t) => ((up = from + ((isUp ? 1 : 0) - from) * ease.inOutSine(t)), drawDoor()), () => {
      if (isUp) {
        sfx.siren();
        siren = 1;
        later(1600, () => (siren = 0), cleanups);
      }
    });
  });

  // --- the traffic light: red, green, amber ---
  const tlx = 1.06 * w, tly = h * 0.18;
  const light = new Graphics();
  kit.under.addChild(light);
  let state = 0;
  const drawLight = () => {
    light.clear().roundRect(tlx - 22, tly, 44, 112, 10).fill(0x2b2d42).stroke({ width: 3, color: INK });
    const cols = [0xe5383b, 0xffb703, 0x52b788];
    const on = [0, 2, 1][state];
    cols.forEach((c, i) => light.circle(tlx, tly + 20 + i * 36, 13).fill(i === on ? c : 0x495057));
  };
  drawLight();
  tappable(light, () => {
    state = (state + 1) % 3;
    sfx.click();
    if (state === 1) sfx.pling();
    drawLight();
  }, new Rectangle(tlx - 34, tly - 10, 68, 132));

  // --- a stack of cones: they wobble ---
  const cones = new Container();
  const cg = new Graphics();
  for (let i = 0; i < 3; i++) {
    const y = -i * 16;
    cg.poly([-24, y, 24, y, 8, y - 54, -8, y - 54]).fill(0xff7a00).stroke({ width: 3, color: INK });
    cg.rect(-17, y - 30, 34, 8).fill(0xffffff);
  }
  cg.rect(-30, 0, 60, 8).fill(0x2b2d42).stroke({ width: 2, color: INK });
  cones.addChild(cg);
  cones.position.set(1.56 * w, fy + h * 0.08);
  kit.under.addChild(cones);
  tappable(cones, oneAtATime((done) => {
    sfx.boing(1.3);
    tween(900, (t) => (cones.skew.x = Math.sin(t * Math.PI * 6) * 0.12 * (1 - t)), done);
  }), new Rectangle(-34, -110, 68, 120));
}

// ---------------------------------------------------------------------------
// School
// ---------------------------------------------------------------------------
export function schoolWideEggs(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.72;

  // --- backpacks on the pegs: wiggle, and pencils spill out ---
  for (let i = 0; i < 4; i++) {
    const px = -0.54 * w + (i * 1.5 + 0.3) * 0.052 * w, py = h * 0.2 + 22;
    const bag = new Container();
    bag.position.set(px, py);
    const g = new Graphics();
    g.moveTo(-10, 0).lineTo(-12, 16).moveTo(10, 0).lineTo(12, 16).stroke({ width: 3, color: INK });
    g.roundRect(-24, 12, 48, 58, 12).fill(COLOURS[(i * 2) % COLOURS.length]).stroke({ width: 3, color: INK });
    g.roundRect(-16, 40, 32, 22, 6).fill(COLOURS[(i * 2 + 1) % COLOURS.length]).stroke({ width: 2, color: INK });
    bag.addChild(g);
    kit.under.addChild(bag);
    tappable(bag, oneAtATime((done) => {
      sfx.zip();
      for (let k = 0; k < 4; k++) {
        const pencil = new Graphics().rect(-3, -18, 6, 30).fill(COLOURS[k]).stroke({ width: 1.5, color: INK });
        pencil.poly([-3, 12, 3, 12, 0, 20]).fill(0xf6d7a7);
        tumble(kit, pencil, px, py + 40, fy + h * 0.06, { vy: rand(-0.6, -0.3), vx: rand(-0.25, 0.25) });
      }
      tween(600, (t) => (bag.rotation = Math.sin(t * Math.PI * 6) * 0.2 * (1 - t)), done);
    }), new Rectangle(-28, 0, 56, 74));
  }

  // --- the class hamster runs on its wheel ---
  const hx = -0.12 * w, hy = h * 0.52;
  const cage = new Graphics();
  cage.roundRect(hx - 70, hy - 90, 140, 90, 10).fill({ color: 0xe9f5ff, alpha: 0.6 }).stroke({ width: 3, color: INK });
  for (let x = hx - 60; x < hx + 70; x += 14) cage.moveTo(x, hy - 88).lineTo(x, hy);
  cage.stroke({ width: 1.5, color: 0x8d99ae });
  cage.rect(hx - 70, hy - 10, 140, 10).fill(0xf6d7a7);
  kit.under.addChild(cage);
  const wheel = new Graphics();
  wheel.circle(0, 0, 32).stroke({ width: 4, color: 0xb07de8 });
  for (let i = 0; i < 8; i++) wheel.moveTo(0, 0).lineTo(Math.cos((i / 8) * Math.PI * 2) * 32, Math.sin((i / 8) * Math.PI * 2) * 32);
  wheel.stroke({ width: 2, color: 0xb07de8 });
  wheel.position.set(hx + 20, hy - 44);
  kit.under.addChild(wheel);
  const hamster = new Graphics();
  hamster.ellipse(0, 0, 16, 12).fill(0xf4a261).stroke({ width: 2, color: INK });
  hamster.circle(10, -6, 7).fill(0xf4a261).stroke({ width: 2, color: INK });
  hamster.circle(12, -7, 1.6).fill(INK);
  hamster.circle(6, -12, 3).fill(0xffb4a2);
  hamster.position.set(hx + 20, hy - 22);
  kit.under.addChild(hamster);
  let speed = 0.002, ht = 0;
  everyFrame((dt) => {
    ht += dt;
    wheel.rotation += speed * dt;
    hamster.y = hy - 22 - Math.abs(Math.sin(ht * speed * 3)) * 4;
  }, cleanups);
  hotspot(kit, new Rectangle(hx - 70, hy - 90, 140, 90), oneAtATime((done) => {
    sfx.squeak(2);
    tween(2000, (t) => (speed = 0.002 + Math.sin(t * Math.PI) * 0.02), () => {
      speed = 0.002;
      done();
    });
  }));

  // --- the easel: a new painting every time ---
  const ex = 1.27 * w, ey = h * 0.26, ew = 0.12 * w, eh = h * 0.24;
  const easel = new Graphics();
  easel.moveTo(ex, ey - 20).lineTo(ex - ew * 0.5, fy).moveTo(ex, ey - 20).lineTo(ex + ew * 0.5, fy).moveTo(ex, ey - 20).lineTo(ex, fy).stroke({ width: 8, color: 0xa47e4b });
  easel.rect(ex - ew / 2 - 8, ey + eh, ew + 16, 10).fill(0xa47e4b).stroke({ width: 2, color: INK });
  kit.under.addChild(easel);
  const canvas = new Graphics();
  kit.under.addChild(canvas);
  const paintings: ((g: Graphics, x: number, y: number) => void)[] = [
    (g, x, y) => g.circle(x + ew * 0.5, y + eh * 0.45, eh * 0.2).fill(0xffd166).stroke({ width: 2, color: INK }),
    (g, x, y) => [0xe5383b, 0xffb703, 0xffd166, 0x52b788, 0x4ea8ff, 0xb07de8].forEach((c, i) => g.moveTo(x + ew * 0.1, y + eh * 0.8).arc(x + ew * 0.5, y + eh * 0.8, ew * 0.4 - i * 7, Math.PI, 0).stroke({ width: 6, color: c })),
    (g, x, y) => {
      g.moveTo(x + ew * 0.5, y + eh * 0.9).lineTo(x + ew * 0.5, y + eh * 0.5).stroke({ width: 4, color: 0x52b788 });
      for (let i = 0; i < 6; i++) g.circle(x + ew * 0.5 + Math.cos(i) * 14, y + eh * 0.4 + Math.sin(i) * 14, 9).fill(0xff8fb1);
      g.circle(x + ew * 0.5, y + eh * 0.4, 8).fill(0xffd166);
    },
    (g, x, y) => {
      g.rect(x + ew * 0.25, y + eh * 0.45, ew * 0.5, eh * 0.4).fill(0xffadad).stroke({ width: 2, color: INK });
      g.poly([x + ew * 0.18, y + eh * 0.45, x + ew * 0.5, y + eh * 0.2, x + ew * 0.82, y + eh * 0.45]).fill(0xe5383b).stroke({ width: 2, color: INK });
    },
    (g, x, y) => {
      g.circle(x + ew * 0.5, y + eh * 0.5, eh * 0.3).fill(0xffd166).stroke({ width: 2, color: INK });
      g.circle(x + ew * 0.42, y + eh * 0.44, 4).circle(x + ew * 0.58, y + eh * 0.44, 4).fill(INK);
      g.moveTo(x + ew * 0.38, y + eh * 0.58).quadraticCurveTo(x + ew * 0.5, y + eh * 0.7, x + ew * 0.62, y + eh * 0.58).stroke({ width: 3, color: INK });
    },
  ];
  let pic = -1;
  const drawCanvas = () => {
    canvas.clear().rect(ex - ew / 2, ey, ew, eh).fill(0xffffff).stroke({ width: 4, color: INK });
    if (pic >= 0) paintings[pic](canvas, ex - ew / 2, ey);
  };
  drawCanvas();
  hotspot(kit, new Rectangle(ex - ew / 2 - 10, ey - 10, ew + 20, eh + 20), oneAtATime((done) => {
    sfx.pop(0.8);
    pic = (pic + 1) % paintings.length;
    drawCanvas();
    burst(kit.sparkles, ex, ey + eh / 2, 8, 50);
    later(300, done, cleanups);
  }));

  // --- the xylophone: play a tune! ---
  const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
  const tx0 = 1.44 * w, tx1 = 1.64 * w, ty = h * 0.56;
  const barW = (tx1 - tx0) / notes.length;
  const frameG = new Graphics().rect(tx0 - 6, ty - 12, tx1 - tx0 + 12, 10).fill(0x8d5524).stroke({ width: 2, color: INK });
  kit.under.addChild(frameG);
  notes.forEach((f, i) => {
    const bar = new Graphics();
    const bh = 70 - i * 5;
    bar.roundRect(-barW / 2 + 2, -bh, barW - 4, bh, 4).fill(COLOURS[i % COLOURS.length]).stroke({ width: 2, color: INK });
    bar.circle(0, -bh + 8, 3).circle(0, -10, 3).fill(0xffffff);
    bar.position.set(tx0 + barW * (i + 0.5), ty - 8);
    kit.under.addChild(bar);
    tappable(bar, () => {
      sfx.tune([f], 0.2);
      kit.events?.emit('note', i);
      tween(220, (t) => (bar.y = ty - 8 + Math.sin(t * Math.PI) * 6));
    }, new Rectangle(-barW / 2, -bh - 10, barW, bh + 14));
  });

  // --- the drum: boom! ---
  const dx = 1.33 * w, dy = h * 0.86;
  const drum = new Graphics();
  drum.rect(dx - 40, dy - 40, 80, 40).fill(0xe5383b).stroke({ width: 3, color: INK });
  drum.moveTo(dx - 40, dy - 40).lineTo(dx - 20, dy).lineTo(dx, dy - 40).lineTo(dx + 20, dy).lineTo(dx + 40, dy - 40).stroke({ width: 2, color: 0xffd166 });
  const skin = new Graphics().ellipse(0, 0, 40, 10).fill(0xfff3e6).stroke({ width: 3, color: INK });
  skin.position.set(dx, dy - 40);
  kit.under.addChild(drum, skin);
  tappable(skin, () => {
    sfx.drop(0.45);
    tween(300, (t) => skin.scale.set(1, 1 - 0.5 * Math.sin(t * Math.PI * 3) * (1 - t)));
  }, new Rectangle(-48, -20, 96, 70));
}

// ---------------------------------------------------------------------------
// Park
// ---------------------------------------------------------------------------
export function parkWideEggs(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;

  // --- two swings: whee! ---
  const top = h * 0.36;
  for (const sx of [-0.52 * w, -0.4 * w]) {
    const swing = new Container();
    swing.position.set(sx, top);
    const g = new Graphics();
    const len = h * 0.4;
    g.moveTo(-18, 0).lineTo(-18, len).moveTo(18, 0).lineTo(18, len).stroke({ width: 3, color: 0x6c757d });
    g.roundRect(-26, len - 4, 52, 12, 4).fill(0x4ea8ff).stroke({ width: 2.5, color: INK });
    swing.addChild(g);
    kit.under.addChild(swing);
    tappable(swing, oneAtATime((done) => {
      sfx.whoosh();
      later(300, () => sfx.yippee(1.3), cleanups);
      tween(2400, (t) => (swing.rotation = Math.sin(t * Math.PI * 6) * 0.6 * (1 - t)), done);
    }), new Rectangle(-34, len * 0.4, 68, len * 0.7));
  }

  // --- the seesaw: up and down ---
  const plank = new Graphics();
  plank.roundRect(-0.1 * w, -6, 0.2 * w, 12, 5).fill(0xffd166).stroke({ width: 3, color: INK });
  plank.rect(-0.1 * w + 6, -26, 8, 20).rect(0.1 * w - 14, -26, 8, 20).fill(0xe5383b);
  plank.position.set(-0.14 * w, h * 0.8);
  plank.rotation = 0.18;
  kit.under.addChild(plank);
  tappable(plank, oneAtATime((done) => {
    sfx.boing(1.1);
    tween(1600, (t) => (plank.rotation = Math.cos(t * Math.PI * 3) * 0.18), () => {
      plank.rotation = -0.18;
      done();
    });
  }), new Rectangle(-0.11 * w, -40, 0.22 * w, 60));

  // --- the fountain: whoosh, water! ---
  const fx = 1.25 * w, fy = h * 0.67;
  hotspot(kit, new Rectangle(fx - 0.12 * w, fy - 30, 0.24 * w, h * 0.18), oneAtATime((done) => {
    sfx.water(1.8);
    spray(kit, fx, fy, 0.12, -0.6, 1600, 0x6ec6ff, h * 0.8);
    spray(kit, fx, fy, -0.12, -0.6, 1600, 0x6ec6ff, h * 0.8);
    later(1900, () => {
      sfx.pling();
      done();
    }, cleanups);
  }));

  // --- the ice-cream cart: a cone with a scoop on top ---
  const ix = 1.52 * w, iy = h * 0.74;
  const cart = new Graphics();
  cart.rect(ix - 50, iy - 60, 100, 50).fill(0xffffff).stroke({ width: 3, color: INK });
  cart.rect(ix - 50, iy - 40, 100, 10).fill(0xff8fb1);
  cart.circle(ix - 32, iy - 6, 12).circle(ix + 32, iy - 6, 12).fill(0x2b2d42).stroke({ width: 2, color: INK });
  cart.moveTo(ix, iy - 60).lineTo(ix, iy - 110).stroke({ width: 4, color: INK });
  cart.moveTo(ix - 48, iy - 110).arc(ix, iy - 110, 48, Math.PI, 0).lineTo(ix - 48, iy - 110).fill(0x7fdde0).stroke({ width: 3, color: INK });
  kit.under.addChild(cart);
  const scoops = [0xffb3c6, 0xfff3b0, 0x8d5524, 0xcaffbf];
  hotspot(kit, new Rectangle(ix - 56, iy - 160, 112, 160), oneAtATime((done) => {
    sfx.ding();
    const cone = new Graphics();
    cone.poly([-14, 0, 14, 0, 0, 40]).fill(0xe0a458).stroke({ width: 2, color: INK });
    const n = 1 + Math.floor(rand(0, 3));
    for (let i = 0; i < n; i++) cone.circle(0, -8 - i * 18, 15).fill(scoops[Math.floor(rand(0, scoops.length))]).stroke({ width: 2, color: INK });
    cone.position.set(ix, iy - 70);
    kit.over.addChild(cone);
    tween(1400, (t) => {
      cone.y = iy - 70 - Math.sin(t * Math.PI) * 50;
      cone.rotation = Math.sin(t * Math.PI * 4) * 0.15;
    }, () => {
      burst(kit.sparkles, cone.x, cone.y - 20, 8, 40);
      cone.destroy();
      done();
    });
  }));
}
