import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { SHOP_FLOOR } from '../shops';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/** Surprises at the vet, the restaurant and the toy shop (see shops.ts for where things are). */

const COLOURS = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];

// ---------------------------------------------------------------------------
// The vet
// ---------------------------------------------------------------------------
export function vet(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * SHOP_FLOOR;

  // --- a sleepy puppy in its basket: tap to wake it up ---
  const px = -0.12 * w, py = fy + h * 0.06;
  const pup = new Container();
  pup.position.set(px, py);
  const body = new Graphics().ellipse(0, 0, 42, 18).fill(0xffd6a5).stroke({ width: 3, color: INK });
  body.ellipse(-30, -4, 10, 8).fill(0x8d5524);
  const head = new Container();
  head.position.set(30, -10);
  const face = new Graphics();
  head.addChild(face);
  pup.addChild(body, head);
  kit.under.addChild(pup);
  let awake = false;
  const drawFace = () => {
    face.clear();
    face.ellipse(-14, -4, 9, 14).ellipse(14, -4, 9, 14).fill(0x8d5524).stroke({ width: 2, color: INK });
    face.circle(0, 0, 18).fill(0xffd6a5).stroke({ width: 3, color: INK });
    if (awake) face.circle(-6, -3, 3).circle(6, -3, 3).fill(INK);
    else face.moveTo(-9, -2).quadraticCurveTo(-6, 1, -3, -2).moveTo(3, -2).quadraticCurveTo(6, 1, 9, -2).stroke({ width: 2, color: INK });
    face.circle(0, 6, 4).fill(INK);
  };
  drawFace();
  const zzz = new Graphics();
  kit.over.addChild(zzz);
  let zt = 0;
  everyFrame((dt) => {
    zt += dt;
    zzz.clear();
    if (awake) return;
    const k = (zt * 0.0006) % 1;
    const s = 6 + k * 6;
    zzz.moveTo(-s, -s).lineTo(s, -s).lineTo(-s, s).lineTo(s, s).stroke({ width: 3, color: 0x4ea8ff, alpha: 1 - k });
    zzz.position.set(px + 50 + k * 20, py - 40 - k * 50);
  }, cleanups);
  tappable(pup, oneAtATime((done) => {
    awake = true;
    drawFace();
    sfx.woof();
    tween(300, (t) => (head.y = -10 - 16 * ease.outBack(t)));
    tween(1600, (t) => (body.rotation = Math.sin(t * Math.PI * 10) * 0.03));
    later(2400, () => {
      if (pup.destroyed) return;
      tween(400, (t) => (head.y = -26 + 16 * t), () => {
        awake = false;
        drawFace();
        done();
      });
    }, cleanups);
  }), new Rectangle(-50, -40, 110, 60));

  // --- squeaky toys on the shelf ---
  hotspot(kit, new Rectangle(-0.52 * w, h * 0.42, 0.28 * w, h * 0.1), oneAtATime((done) => {
    sfx.squeak(1.5 + Math.random());
    const t = new Graphics().circle(0, 0, 14).fill(COLOURS[Math.floor(rand(0, 6))]).stroke({ width: 2, color: INK });
    tumble(kit, t, -0.52 * w + rand(0.05, 0.23) * w, h * 0.48, fy + h * 0.05, { vy: -0.6, vx: rand(-0.15, 0.15) });
    later(700, done, cleanups);
  }));

  // --- the weighing scale: how heavy? ---
  const sx = 0.7 * w, sy = fy + h * 0.05;
  const scale = new Graphics();
  scale.rect(sx - 60, sy - 12, 120, 16).fill(0xadb5bd).stroke({ width: 3, color: INK });
  scale.rect(sx + 44, sy - 110, 10, 100).fill(0x8d99ae).stroke({ width: 2, color: INK });
  scale.circle(sx + 49, sy - 126, 26).fill(0xffffff).stroke({ width: 3, color: INK });
  kit.under.addChild(scale);
  const needle = new Graphics().moveTo(0, 0).lineTo(0, -20).stroke({ width: 3, color: 0xe5383b });
  needle.position.set(sx + 49, sy - 126);
  needle.rotation = -1.2;
  kit.under.addChild(needle);
  hotspot(kit, new Rectangle(sx - 64, sy - 160, 128, 170), oneAtATime((done) => {
    sfx.boing(1.4);
    const to = rand(-0.9, 1.2);
    tween(1100, (t) => (needle.rotation = -1.2 + (to + 1.2) * ease.outBack(t) + Math.sin(t * 20) * 0.1 * (1 - t)), () => {
      sfx.ding();
      later(1400, () => tween(500, (t) => (needle.rotation = to + (-1.2 - to) * t), done), cleanups);
    });
  }));

  // --- the fish tank: fish swim round; tap for bubbles and a dash ---
  const tx = 0.79 * w, ty = h * 0.3, tw = 0.16 * w, th = h * 0.22;
  const tank = new Graphics();
  tank.rect(tx, ty, tw, th).fill(0x7fdde0).stroke({ width: 4, color: INK });
  tank.rect(tx + 3, ty + th - 14, tw - 6, 11).fill(0xe9c46a);
  tank.moveTo(tx + 20, ty + th - 14).quadraticCurveTo(tx + 10, ty + th * 0.5, tx + 22, ty + th * 0.3).stroke({ width: 5, color: 0x2d6a4f });
  kit.under.addChild(tank);
  const fish = new Graphics();
  kit.under.addChild(fish);
  let ft = 0, fast = 1;
  everyFrame((dt) => {
    ft += dt * fast;
    fish.clear();
    [0xffa94d, 0xff8fb1, 0xffd166].forEach((c, i) => {
      const a = ft * 0.0008 * (1 + i * 0.3) + i * 2;
      const x = tx + tw / 2 + Math.cos(a) * (tw / 2 - 22);
      const y = ty + th * (0.3 + i * 0.18) + Math.sin(a * 2) * 6;
      const dir = -Math.sin(a) > 0 ? 1 : -1;
      fish.ellipse(x, y, 11, 7).fill(c).stroke({ width: 2, color: INK });
      fish.poly([x - dir * 9, y, x - dir * 18, y - 6, x - dir * 18, y + 6]).fill(c).stroke({ width: 2, color: INK });
      fish.circle(x + dir * 5, y - 2, 1.6).fill(INK);
    });
  }, cleanups);
  hotspot(kit, new Rectangle(tx, ty, tw, th), oneAtATime((done) => {
    sfx.blub();
    fast = 5;
    for (let i = 0; i < 6; i++) {
      const b = new Graphics().circle(0, 0, rand(3, 6)).stroke({ width: 2, color: 0xffffff });
      const bx = tx + rand(0.2, 0.8) * tw;
      b.position.set(bx, ty + th - 16);
      kit.over.addChild(b);
      tween(900 + i * 100, (t) => (b.y = ty + th - 16 - t * (th - 20)), () => b.destroy());
    }
    later(1200, () => {
      fast = 1;
      done();
    }, cleanups);
  }));

  // --- the X-ray light box: see the bones! ---
  const xx = 1.32 * w, xy = h * 0.14, xw = 0.15 * w, xh = h * 0.24;
  const xray = new Graphics();
  kit.under.addChild(xray);
  let showing = -1;
  const drawXray = () => {
    xray.clear().rect(xx, xy, xw, xh).fill(showing < 0 ? 0x2b2d42 : 0x1d3557).stroke({ width: 6, color: 0xdee2e6 });
    if (showing === 0) {
      // a dog's skeleton
      const cy = xy + xh * 0.5;
      xray.moveTo(xx + xw * 0.2, cy).lineTo(xx + xw * 0.75, cy).stroke({ width: 5, color: 0xffffff });
      for (let i = 0; i < 6; i++) xray.moveTo(xx + xw * (0.3 + i * 0.07), cy - 14).lineTo(xx + xw * (0.3 + i * 0.07), cy + 14).stroke({ width: 3, color: 0xffffff });
      xray.circle(xx + xw * 0.82, cy - 10, 14).stroke({ width: 4, color: 0xffffff });
      for (const lx of [0.28, 0.36, 0.62, 0.7]) xray.moveTo(xx + xw * lx, cy + 10).lineTo(xx + xw * lx, xy + xh * 0.9).stroke({ width: 4, color: 0xffffff });
      xray.moveTo(xx + xw * 0.2, cy).lineTo(xx + xw * 0.1, cy - 20).stroke({ width: 3, color: 0xffffff });
    } else if (showing === 1) {
      // a fish's bones
      const cy = xy + xh * 0.5;
      xray.moveTo(xx + xw * 0.15, cy).lineTo(xx + xw * 0.75, cy).stroke({ width: 4, color: 0xffffff });
      for (let i = 0; i < 7; i++) xray.moveTo(xx + xw * (0.25 + i * 0.07), cy - 18).lineTo(xx + xw * (0.25 + i * 0.07), cy + 18).stroke({ width: 3, color: 0xffffff });
      xray.circle(xx + xw * 0.82, cy, 12).stroke({ width: 4, color: 0xffffff });
      xray.poly([xx + xw * 0.15, cy, xx + xw * 0.05, cy - 16, xx + xw * 0.05, cy + 16]).stroke({ width: 3, color: 0xffffff });
    }
  };
  drawXray();
  tappable(xray, () => {
    showing = showing === 1 ? -1 : showing + 1;
    sfx.click();
    if (showing >= 0) sfx.twinkle();
    drawXray();
  }, new Rectangle(xx - 8, xy - 8, xw + 16, xh + 16));

  // --- the medicine cabinet: plasters and bandages ---
  const cx = 1.52 * w, cy = h * 0.16, cw = 0.1 * w, ch = h * 0.2;
  const cab = new Graphics().rect(cx, cy, cw, ch).fill(0xffffff).stroke({ width: 3, color: INK });
  cab.moveTo(cx + cw / 2 - 10, cy + ch / 2).lineTo(cx + cw / 2 + 10, cy + ch / 2).moveTo(cx + cw / 2, cy + ch / 2 - 10).lineTo(cx + cw / 2, cy + ch / 2 + 10).stroke({ width: 6, color: 0xe5383b });
  kit.under.addChild(cab);
  hotspot(kit, new Rectangle(cx - 6, cy - 6, cw + 12, ch + 12), oneAtATime((done) => {
    sfx.drawer();
    for (let i = 0; i < 3; i++) {
      const p = new Graphics().roundRect(-14, -6, 28, 12, 6).fill(0xffd6a5).stroke({ width: 2, color: INK });
      p.rect(-5, -6, 10, 12).fill(0xffffff);
      tumble(kit, p, cx + cw / 2, cy + ch, h * 0.48, { vy: -0.4, vx: rand(-0.2, 0.2) });
    }
    later(900, done, cleanups);
  }));
}

// ---------------------------------------------------------------------------
// The restaurant
// ---------------------------------------------------------------------------
export function restaurant(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * SHOP_FLOOR;

  // --- the chef's bell: ding! Something's ready ---
  const bx = -0.06 * w, by = h * 0.44;
  const bell = new Graphics();
  bell.moveTo(-14, 0).arc(0, 0, 14, Math.PI, 0).lineTo(-14, 0).fill(0xffd166).stroke({ width: 2.5, color: INK });
  bell.circle(0, -16, 4).fill(INK);
  bell.position.set(bx, by);
  kit.under.addChild(bell);
  const plate = new Graphics();
  kit.under.addChild(plate);
  const dishes: ((g: Graphics, x: number, y: number) => void)[] = [
    (g, x, y) => g.roundRect(x - 22, y - 30, 44, 14, 8).fill(0xe0a458).stroke({ width: 2, color: INK }).rect(x - 24, y - 18, 48, 8).fill(0x7bd36b).rect(x - 22, y - 12, 44, 8).fill(0x8d5524).roundRect(x - 22, y - 6, 44, 10, 5).fill(0xe0a458).stroke({ width: 2, color: INK }),
    (g, x, y) => g.moveTo(x - 30, y - 6).lineTo(x + 30, y - 6).lineTo(x, y - 46).closePath().fill(0xffd166).stroke({ width: 2, color: INK }).circle(x - 6, y - 18, 5).circle(x + 8, y - 14, 5).circle(x, y - 30, 4).fill(0xe5383b),
    (g, x, y) => g.ellipse(x, y - 14, 26, 12).fill(0xf6d365).stroke({ width: 2, color: INK }).circle(x - 6, y - 20, 6).circle(x + 8, y - 16, 6).fill(0x9c2f2f),
    (g, x, y) => g.moveTo(x - 28, y - 18).arc(x, y - 18, 28, 0, Math.PI).closePath().fill(0xffffff).stroke({ width: 2, color: INK }).ellipse(x, y - 18, 26, 6).fill(0xe76f51),
  ];
  let dish = -1;
  hotspot(kit, new Rectangle(bx - 26, by - 30, 52, 40), oneAtATime((done) => {
    sfx.ding();
    dish = (dish + 1) % dishes.length;
    plate.clear().ellipse(-0.2 * w, by + 2, 36, 9).fill(0xffffff).stroke({ width: 2, color: INK });
    dishes[dish](plate, -0.2 * w, by);
    burst(kit.sparkles, -0.2 * w, by - 30, 8, 50);
    tween(300, (t) => (bell.scale.set(1 + 0.2 * Math.sin(t * Math.PI))), done);
  }));

  // --- the pizza oven: the fire flickers; tap for a pizza ---
  const ox = -0.45 * w, oy = h * 0.56;
  const fire = new Graphics();
  kit.under.addChild(fire);
  let fireT = 0;
  everyFrame((dt) => {
    fireT += dt;
    fire.clear();
    for (let i = -2; i <= 2; i++) {
      const fh = 18 + Math.sin(fireT * 0.012 + i * 1.7) * 6;
      fire.ellipse(ox + i * 12, oy - fh / 2 - 4, 8, fh / 2).fill(i % 2 ? 0xffb703 : 0xe85d04);
    }
  }, cleanups);
  hotspot(kit, new Rectangle(ox - 0.11 * w, h * 0.27, 0.22 * w, fy - h * 0.27), oneAtATime((done) => {
    sfx.burner();
    const pizza = new Graphics();
    pizza.rect(-6, 0, 80, 8).fill(0xa47e4b).stroke({ width: 2, color: INK });
    pizza.circle(-30, 0, 30).fill(0xe0a458).stroke({ width: 2, color: INK });
    pizza.circle(-30, 0, 24).fill(0xe5383b);
    for (const [a, b] of [[-38, -8], [-22, 6], [-30, -14], [-40, 10], [-18, -6]]) pizza.circle(a, b, 5).fill(0xfff3b0);
    pizza.position.set(ox, oy);
    pizza.scale.set(0.2);
    kit.over.addChild(pizza);
    tween(700, (t) => {
      pizza.scale.set(0.2 + 0.8 * ease.outBack(t));
      pizza.x = ox + t * 0.06 * w;
    }, () => {
      sfx.ding();
      burst(kit.sparkles, pizza.x - 30, pizza.y - 10, 8, 50);
      later(1200, () => {
        pizza.destroy();
        done();
      }, cleanups);
    });
  }));

  // --- lamps over the tables: tap to switch them on and off ---
  for (const tx of [0.17, 0.5, 0.83]) {
    const lx = tx * w, ly = h * 0.38;
    const lamp = new Graphics();
    const glowG = new Graphics();
    glowG.eventMode = 'none';
    let on = true;
    const draw = () => {
      lamp.clear().moveTo(lx, 0).lineTo(lx, ly - 24).stroke({ width: 3, color: INK });
      lamp.poly([lx - 26, ly, lx + 26, ly, lx + 12, ly - 26, lx - 12, ly - 26]).fill(0xe76f51).stroke({ width: 3, color: INK });
      glowG.clear();
      if (on) glow(glowG, lx, ly + 10, 90, 0xffd27a, 1);
    };
    draw();
    kit.under.addChild(lamp);
    kit.over.addChild(glowG);
    tappable(lamp, () => {
      on = !on;
      sfx.click();
      draw();
    }, new Rectangle(lx - 36, ly - 40, 72, 52));
  }

  // --- the dessert counter: a slice of cake ---
  const dx = 1.05 * w, dy = h * 0.3, dw = 0.22 * w;
  const cakes = new Graphics();
  for (const [i, cx] of [0.2, 0.5, 0.8].entries()) {
    const x = dx + dw * cx, y = dy + h * 0.16;
    cakes.rect(x - 24, y - 30, 48, 30).fill([0xffb3c6, 0x8d5524, 0xfff3b0][i]).stroke({ width: 2, color: INK });
    cakes.rect(x - 24, y - 34, 48, 8).fill(0xffffff).stroke({ width: 2, color: INK });
    cakes.circle(x, y - 40, 6).fill(0xe5383b);
  }
  kit.under.addChild(cakes);
  hotspot(kit, new Rectangle(dx, dy, dw, h * 0.3), oneAtATime((done) => {
    sfx.pop(1.2);
    const slice = new Graphics().poly([-20, 10, 20, 10, 20, -10]).fill(0xffb3c6).stroke({ width: 2, color: INK });
    slice.rect(-20, 10, 40, 4).fill(0xffffff);
    slice.circle(14, -14, 5).fill(0xe5383b);
    slice.position.set(dx + dw / 2, dy + h * 0.1);
    kit.over.addChild(slice);
    tween(1100, (t) => {
      slice.y = dy + h * 0.1 - Math.sin(t * Math.PI) * 60;
      slice.rotation = t * Math.PI * 2;
    }, () => {
      burst(kit.sparkles, slice.x, slice.y, 8, 40);
      slice.destroy();
      done();
    });
  }));

  // --- the drinks fridge: fizzy bubbles ---
  const fx = 1.48 * w, fyy = h * 0.16, fw = 0.1 * w;
  const fridge = new Graphics();
  fridge.rect(fx + 8, fyy + 10, fw - 16, fy - fyy - 30).fill({ color: 0xbfe8ff, alpha: 0.6 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fridge.roundRect(fx + 14 + c * (fw - 28) / 3, fyy + 30 + r * (fy - fyy) * 0.26, 14, 34, 5).fill(COLOURS[(r * 3 + c) % 6]).stroke({ width: 1.5, color: INK });
  kit.under.addChild(fridge);
  hotspot(kit, new Rectangle(fx, fyy, fw, fy - fyy), oneAtATime((done) => {
    sfx.pop(1.6);
    later(150, () => sfx.blub(), cleanups);
    for (let i = 0; i < 12; i++) {
      const b = new Graphics().circle(0, 0, rand(3, 6)).fill({ color: 0xffffff, alpha: 0.7 });
      const x = fx + rand(0.2, 0.8) * fw;
      b.position.set(x, fyy + (fy - fyy) * 0.6);
      kit.over.addChild(b);
      tween(900 + i * 60, (t) => {
        b.y = fyy + (fy - fyy) * 0.6 - t * h * 0.35;
        b.x = x + Math.sin(t * 9 + i) * 8;
        b.alpha = 1 - t;
      }, () => b.destroy());
    }
    later(1200, done, cleanups);
  }));

  // --- the jukebox: music! ---
  const jx = 1.38 * w, jy = fy + 4;
  const juke = new Graphics();
  kit.under.addChild(juke);
  let jt = 0, playing = 0;
  everyFrame((dt) => {
    jt += dt;
    juke.clear();
    juke.roundRect(jx - 44, jy - 130, 88, 130, 40).fill(0x9d0208).stroke({ width: 4, color: INK });
    juke.roundRect(jx - 32, jy - 112, 64, 44, 20).fill(playing ? COLOURS[Math.floor(jt / 150) % 6] : 0xffd166).stroke({ width: 3, color: INK });
    for (let i = 0; i < 4; i++) juke.rect(jx - 30, jy - 58 + i * 12, 60, 6).fill(0xffd166);
  }, cleanups);
  hotspot(kit, new Rectangle(jx - 50, jy - 136, 100, 140), oneAtATime((done) => {
    playing = 1;
    sfx.tune([392, 523, 659, 523, 587, 494, 392, 440], 0.22);
    for (let i = 0; i < 6; i++) {
      later(i * 280, () => {
        const n = new Graphics().circle(0, 0, 7).fill(0x3a3a3a);
        n.rect(5, -24, 3, 24).fill(0x3a3a3a);
        n.position.set(jx + rand(-30, 30), jy - 130);
        kit.over.addChild(n);
        tween(1300, (t) => {
          n.y = jy - 130 - t * 90;
          n.x += Math.sin(t * 8) * 1.2;
          n.alpha = 1 - t;
        }, () => n.destroy());
      }, cleanups);
    }
    later(1900, () => {
      playing = 0;
      done();
    }, cleanups);
  }));
}

// ---------------------------------------------------------------------------
// The toy shop
// ---------------------------------------------------------------------------
export function toyshop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * SHOP_FLOOR;

  // --- the train set: round and round; tap for a toot and a speedy lap ---
  const cx = -0.34 * w, cy = h * 0.47, rx = 0.17 * w, ry = h * 0.035;
  const track = new Graphics().ellipse(cx, cy, rx, ry).stroke({ width: 6, color: 0x6b4226 }).ellipse(cx, cy, rx, ry).stroke({ width: 2, color: 0xadb5bd });
  kit.under.addChild(track);
  const train = new Graphics();
  kit.under.addChild(train);
  let ta = 0, tspeed = 0.0009;
  everyFrame((dt) => {
    ta += tspeed * dt;
    train.clear();
    const cars = [0, -0.35, -0.7].map((off, i) => {
      const a = ta + off;
      return { i, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, front: Math.sin(a) > 0, dir: -Math.sin(a) < 0 ? 1 : -1 };
    }).sort((p, q) => p.y - q.y);
    for (const c of cars) {
      const s = c.front ? 1 : 0.8;
      const col = c.i === 0 ? 0xe5383b : [0x4ea8ff, 0x7bd36b][c.i - 1];
      train.roundRect(c.x - 16 * s, c.y - 22 * s, 32 * s, 18 * s, 4).fill(col).stroke({ width: 2, color: INK });
      if (c.i === 0) train.rect(c.x + c.dir * 6 * s - 4, c.y - 32 * s, 8 * s, 10 * s).fill(0x2b2d42);
      train.circle(c.x - 9 * s, c.y - 3, 4 * s).circle(c.x + 9 * s, c.y - 3, 4 * s).fill(INK);
    }
  }, cleanups);
  hotspot(kit, new Rectangle(cx - rx - 10, cy - 60, rx * 2 + 20, 80), oneAtATime((done) => {
    sfx.honk();
    tween(2200, (t) => (tspeed = 0.0009 + Math.sin(t * Math.PI) * 0.005), () => {
      tspeed = 0.0009;
      done();
    });
  }));

  // --- the till: ka-ching! ---
  const tx = 0.5 * w, ty = h * 0.5;
  const till = new Graphics();
  till.roundRect(tx - 34, ty - 40, 68, 40, 6).fill(0x8d99ae).stroke({ width: 3, color: INK });
  till.rect(tx - 24, ty - 34, 48, 14).fill(0x7bd36b);
  kit.under.addChild(till);
  hotspot(kit, new Rectangle(tx - 44, ty - 50, 88, 56), oneAtATime((done) => {
    sfx.ding();
    later(120, () => sfx.pop(1.4), cleanups);
    const coin = new Graphics().circle(0, 0, 12).fill(0xffd166).stroke({ width: 2, color: INK });
    coin.circle(0, 0, 6).stroke({ width: 2, color: 0xe0a800 });
    coin.position.set(tx, ty - 40);
    kit.over.addChild(coin);
    tween(900, (t) => {
      coin.y = ty - 40 - Math.sin(t * Math.PI) * 70;
      coin.scale.x = Math.cos(t * Math.PI * 6);
    }, () => {
      coin.destroy();
      done();
    });
  }));

  // --- the shelves: a toy hops out to say hello ---
  for (const [sx, sw] of [[0.04, 0.4], [0.56, 0.4]]) {
    hotspot(kit, new Rectangle(sx * w, h * 0.14, sw * w, h * 0.5), oneAtATime((done) => {
      sfx.boing(1.5);
      const t = new Graphics().star(0, 0, 5, 16, 8).fill(COLOURS[Math.floor(rand(0, 6))]).stroke({ width: 2, color: INK });
      tumble(kit, t, (sx + rand(0.2, 0.8) * sw) * w, h * rand(0.25, 0.55), fy + h * 0.08, { vy: -0.6, vx: rand(-0.2, 0.2) });
      later(500, done, cleanups);
    }));
  }

  // --- the dolls' house: switch the lights on in each room ---
  const dx = 1.1 * w, dw = 0.2 * w, dh = h * 0.36;
  const rooms = [[dx, fy - dh], [dx + dw / 2, fy - dh], [dx, fy - dh / 2], [dx + dw / 2, fy - dh / 2]];
  const lit = [false, false, false, false];
  const lights = new Graphics();
  kit.under.addChild(lights);
  const drawLights = () => {
    lights.clear();
    rooms.forEach(([x, y], i) => {
      lights.rect(x + 6, y + 6, dw / 2 - 12, dh / 2 - 12).fill(lit[i] ? 0xfff3b0 : 0xffd6a5);
      lights.rect(x + dw / 4 - 10, y + dh / 4 - 8, 20, 16).fill(lit[i] ? 0xffd166 : 0x8d99ae).stroke({ width: 1.5, color: INK });
    });
  };
  drawLights();
  rooms.forEach(([x, y], i) => {
    hotspot(kit, new Rectangle(x, y, dw / 2, dh / 2), () => {
      lit[i] = !lit[i];
      sfx.click();
      drawLights();
    });
  });

  // --- the jack-in-the-box: wind it up... BOING! ---
  const jx = 1.48 * w, jy = h * 0.56;
  const clown = new Container();
  const cg = new Graphics();
  for (let k = 0; k < 5; k++) cg.ellipse(0, -k * 10, 12, 4).stroke({ width: 3, color: 0xadb5bd });
  cg.circle(0, -62, 18).fill(0xfff3e6).stroke({ width: 2.5, color: INK });
  cg.circle(-6, -64, 2.5).circle(6, -64, 2.5).fill(INK);
  cg.circle(0, -58, 5).fill(0xe5383b);
  cg.poly([-16, -74, 0, -100, 16, -74]).fill(0x4ea8ff).stroke({ width: 2, color: INK });
  cg.circle(0, -100, 5).fill(0xffd166);
  clown.addChild(cg);
  clown.position.set(jx, jy - 10);
  clown.scale.y = 0.05;
  kit.under.addChild(clown);
  const box = new Graphics();
  box.rect(jx - 28, jy - 50, 56, 50).fill(0xe5383b).stroke({ width: 3, color: INK });
  box.rect(jx - 18, jy - 40, 36, 30).fill(0xffd166);
  box.moveTo(jx + 28, jy - 26).lineTo(jx + 40, jy - 26).stroke({ width: 4, color: INK });
  kit.under.addChild(box);
  const lid = new Graphics().rect(0, -6, 60, 8).fill(0x4ea8ff).stroke({ width: 2, color: INK });
  lid.position.set(jx - 30, jy - 50);
  kit.under.addChild(lid);
  hotspot(kit, new Rectangle(jx - 36, jy - 60, 84, 64), oneAtATime((done) => {
    sfx.tune([523, 587, 659, 523, 659, 523, 659], 0.14);
    later(1050, () => {
      sfx.boing(1.3);
      later(80, () => sfx.giggle(1.4), cleanups);
      tween(200, (t) => (lid.rotation = -2 * t));
      tween(500, (t) => (clown.scale.y = 0.05 + 0.95 * ease.outBack(t)), () => {
        tween(900, (t) => (clown.rotation = Math.sin(t * Math.PI * 4) * 0.25 * (1 - t)), () => {
          tween(300, (t) => (clown.scale.y = 1 - 0.95 * t), () => {
            tween(200, (t) => (lid.rotation = -2 * (1 - t)), done);
          });
        });
      });
    }, cleanups);
  }));

  // --- a spinning top: whirr across the floor ---
  const sx = 1.3 * w, sy = fy + h * 0.12;
  const top = new Graphics();
  top.poly([-28, 0, 28, 0, 0, 30]).fill(0xb07de8).stroke({ width: 3, color: INK });
  top.ellipse(0, 0, 28, 8).fill(0xff8fb1).stroke({ width: 3, color: INK });
  top.rect(-3, -18, 6, 18).fill(0x6b4226);
  top.position.set(sx, sy - 30);
  kit.under.addChild(top);
  tappable(top, oneAtATime((done) => {
    sfx.whirr();
    const dir = Math.random() < 0.5 ? -1 : 1;
    tween(2200, (t) => {
      top.x = sx + dir * Math.sin(t * Math.PI) * 0.12 * w;
      top.rotation = Math.sin(t * 60) * 0.12 * (1 - t * 0.7);
      top.skew.x = Math.sin(t * 120) * 0.05;
    }, () => {
      top.rotation = 0;
      top.skew.x = 0;
      done();
    });
  }), new Rectangle(-34, -24, 68, 58));
}
