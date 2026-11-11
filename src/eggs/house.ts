import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import {
  everyFrame,
  glow,
  hotspot,
  INK,
  later,
  oneAtATime,
  raisableBlinds,
  rand,
  tumble,
  type Cleanups,
  type EggKit,
} from './common';

/** Surprises in the kitchen and the lounge room. */

// ---------------------------------------------------------------------------
// Kitchen
// ---------------------------------------------------------------------------
export function kitchen(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;

  // --- the blind over the sink goes up (set up first: the middle pendant
  // light hangs in front of the window and must win the tap) ---
  raisableBlinds(kit, w * 0.42, h * 0.15, w * 0.18, h * 0.22, 0xffffff, 'slats');

  // --- three pendant lights, each switches on and off ---
  const cones = new Graphics();
  cones.eventMode = 'none';
  kit.over.addChild(cones);
  const lit = [false, false, false];
  const xs = [0.3, 0.47, 0.64];
  const drawCones = () => {
    cones.clear();
    xs.forEach((px, i) => {
      if (!lit[i]) return;
      const x = w * px, y = h * 0.24;
      cones.poly([x - 22, y, x + 22, y, x + w * 0.09, h * 0.6, x - w * 0.09, h * 0.6]).fill({ color: 0xffe08a, alpha: 0.32 });
      glow(cones, x, y + 2, 60, 0xffd166, 3);
      cones.ellipse(x, y, 22, 6).fill(0xfff8d6);
    });
  };
  // The lights themselves: drawn here (not in the background) so nothing,
  // like the window blind behind the middle one, can hide them.
  const pendantSpots = xs.map((px, i) => {
    const spot = hotspot(kit, new Rectangle(w * px - 34, h * 0.12, 68, h * 0.14), () => {
      lit[i] = !lit[i];
      sfx.click();
      drawLamp();
      drawCones();
    });
    const lamp = new Graphics();
    const drawLamp = () => {
      const x = w * px;
      lamp.clear().moveTo(x, 0).lineTo(x, h * 0.16).stroke({ width: 3, color: 0x1f1f1f });
      lamp.poly([x - 26, h * 0.24, x + 26, h * 0.24, x + 14, h * 0.16, x - 14, h * 0.16]).fill(0x2b2b2b).stroke({ width: 3, color: INK });
      lamp.ellipse(x, h * 0.24, 22, 5).fill(lit[i] ? 0xfffbe6 : 0xd9d2b8);
    };
    drawLamp();
    spot.addChild(lamp);
    return spot;
  });

  // --- microwave: hums, dings, and popcorn pops out ---
  const mx = w * 0.675, my = h * 0.195, mw = w * 0.09, mh = h * 0.07;
  const micro = new Graphics();
  kit.under.addChild(micro);
  hotspot(kit, new Rectangle(w * 0.66, h * 0.17, w * 0.14, h * 0.12), oneAtATime((done) => {
    sfx.whirr();
    tween(1600, (t) => {
      micro.clear().rect(mx, my, mw, mh).fill(0xfff3b0);
      micro.ellipse(mx + mw / 2 + Math.sin(t * Math.PI * 6) * mw * 0.2, my + mh * 0.75, mw * 0.25, mh * 0.12).fill(0xffffff).stroke({ width: 2, color: INK });
    }, () => {
      sfx.ding();
      micro.clear();
      for (let i = 0; i < 10; i++) {
        later(i * 70, () => {
          sfx.pop(rand(1.4, 1.9));
          const corn = new Graphics();
          for (let k = 0; k < 3; k++) corn.circle(rand(-5, 5), rand(-5, 5), rand(5, 8)).fill(0xfff8e1);
          corn.circle(0, 0, 3).fill(0xffd166);
          tumble(kit, corn, mx + mw / 2, my + mh, h * 0.46, { vx: rand(-0.35, 0.1), vy: rand(-0.6, -0.3) });
        }, cleanups);
      }
      later(1200, done, cleanups);
    });
  }));

  // --- oven: glows, a cake rises, ding, steam ---
  const ox = w * 0.615, oy = h * 0.56, ow = w * 0.09, oh = h * 0.12;
  const oven = new Graphics();
  kit.under.addChild(oven);
  hotspot(kit, new Rectangle(w * 0.6, h * 0.47, w * 0.12, h * 0.27), oneAtATime((done) => {
    sfx.whirr();
    tween(2000, (t) => {
      oven.clear().roundRect(ox, oy, ow, oh, 6).fill(0xff9f43);
      glow(oven, ox + ow / 2, oy + oh / 2, ow * 0.6, 0xffd166, 2);
      const ch = oh * 0.55 * ease.outCubic(t);
      oven.rect(ox + ow * 0.2, oy + oh - 8 - ch, ow * 0.6, ch).fill(0xc68b59).stroke({ width: 2, color: INK });
      if (ch > 6) oven.rect(ox + ow * 0.2, oy + oh - 8 - ch, ow * 0.6, 6).fill(0xff8fb1);
    }, () => {
      sfx.ding();
      for (let i = 0; i < 6; i++) {
        later(i * 150, () => {
          const puff = new Graphics().circle(0, 0, rand(8, 14)).fill({ color: 0xffffff, alpha: 0.8 });
          puff.position.set(ox + rand(0, ow), h * 0.47);
          kit.over.addChild(puff);
          tween(1200, (t) => ((puff.y = h * 0.47 - 80 * t), (puff.alpha = 0.8 * (1 - t)), puff.scale.set(1 + t)), () => puff.destroy());
        }, cleanups);
      }
      later(1500, () => {
        oven.clear();
        done();
      }, cleanups);
    });
  }));

  // --- the tap runs ---
  const water = new Graphics();
  kit.under.addChild(water);
  hotspot(kit, new Rectangle(w * 0.49, h * 0.37, w * 0.07, h * 0.11), oneAtATime((done) => {
    sfx.water(2);
    tween(2000, (t) => {
      water.clear();
      const x = w * 0.535 - 6, top = h * 0.41 + 4;
      water.roundRect(x, top, 12, h * 0.06, 6).fill({ color: 0x4ea8ff, alpha: 0.9 }).stroke({ width: 2, color: 0x2b6cb0 });
      water.rect(x + 3, top + rand(0, h * 0.04), 3, 10).fill(0xffffff);
      for (let i = 0; i < 5; i++) water.circle(x + 6 + rand(-14, 14), h * 0.47 - rand(0, 8), rand(3, 5)).fill({ color: 0xbde0fe, alpha: 0.95 }).stroke({ width: 1.5, color: 0x4ea8ff });
      if (t > 0.97) water.clear();
    }, done);
  }));

  // --- top-left cupboard: opens, and a cookie jumps out ---
  const cx = w * 0.2, cy = h * 0.08, cw = w * 0.11, ch = h * 0.22;
  const inside = new Graphics();
  inside.rect(cx, cy, cw, ch).fill(0x3d405b);
  inside.rect(cx, cy + ch * 0.5, cw, 5).fill(0xf8f9fa);
  inside.roundRect(cx + cw * 0.15, cy + ch * 0.18, cw * 0.25, ch * 0.3, 6).fill(0xe5383b).stroke({ width: 2, color: INK });
  inside.roundRect(cx + cw * 0.55, cy + ch * 0.6, cw * 0.32, ch * 0.32, 8).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 2, color: INK });
  kit.under.addChild(inside);
  const door = new Graphics();
  kit.under.addChild(door);
  let open = 0;
  const drawDoor = () => {
    const dw = cw * (1 - 0.85 * open);
    door.clear().rect(cx, cy, dw, ch).fill(0xfbfbf8).stroke({ width: 3, color: 0xadb5bd });
    door.rect(cx + 6, cy + 6, Math.max(0, dw - 12), ch - 12).stroke({ width: 2, color: 0xced4da });
    if (dw > 20) door.rect(cx + dw - 14, cy + ch * 0.35, 4, ch * 0.3).fill(0x8d99ae);
  };
  drawDoor();
  // (only the left part is tappable: the first pendant light hangs in front of the right edge)
  hotspot(kit, new Rectangle(cx, cy, cw * 0.7, ch), oneAtATime((done) => {
    sfx.drawer();
    tween(300, (t) => ((open = t), drawDoor()), () => {
      sfx.boing(1.4);
      const cookie = new Graphics().circle(0, 0, 14).fill(0xd4a373).stroke({ width: 2, color: INK });
      for (const [a, b] of [[-5, -4], [4, -6], [2, 5], [-6, 5]]) cookie.circle(a, b, 2.5).fill(0x5c3d2e);
      tumble(kit, cookie, cx + cw * 0.7, cy + ch * 0.75, h * 0.465, { vx: 0.12, vy: -0.45, spin: 6 });
      later(900, () => burst(kit.sparkles, cx + cw * 0.7 + 0.12 * 900, h * 0.46, 6, 40), cleanups);
      later(1800, () => tween(300, (t) => ((open = 1 - t), drawDoor()), done), cleanups);
    });
  }));

  // pendant lights last, so they're on top for tapping
  for (const spot of pendantSpots) kit.under.addChild(spot);
}

// ---------------------------------------------------------------------------
// Lounge room
// ---------------------------------------------------------------------------
export function lounge(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;

  // --- TV: tap to change channel ---
  const sx = w * 0.165, sy = h * 0.26, sw = w * 0.14, sh = h * 0.2;
  const tv = new Graphics();
  kit.under.addChild(tv);
  let channel = 0;
  let time = 0;
  const stars = Array.from({ length: 20 }, () => [rand(0, 1), rand(0, 1)]);
  everyFrame((dt) => {
    time += dt;
    tv.clear();
    if (channel === 0) return;
    if (channel === 1) {
      const cols = [0xffffff, 0xffd93d, 0x4cc9f0, 0x7bd36b, 0xff8fb1, 0xe5383b, 0x4361ee];
      cols.forEach((c, i) => tv.rect(sx + (sw * i) / cols.length, sy, sw / cols.length + 1, sh).fill(c));
    } else if (channel === 2) {
      // fish tank
      tv.rect(sx, sy, sw, sh).fill(0x0096c7);
      const fx = sx + ((time * 0.05) % (sw + 60)) - 30;
      const fy = sy + sh * 0.5 + Math.sin(time * 0.003) * sh * 0.2;
      tv.ellipse(fx, fy, 16, 10).fill(0xffa94d).stroke({ width: 2, color: INK });
      tv.poly([fx - 14, fy, fx - 26, fy - 8, fx - 26, fy + 8]).fill(0xffa94d).stroke({ width: 2, color: INK });
      tv.circle(fx + 7, fy - 2, 2).fill(INK);
      for (let i = 0; i < 4; i++) tv.circle(sx + sw * (0.2 + i * 0.2), sy + sh - ((time * 0.04 + i * 40) % sh), 3).stroke({ width: 1.5, color: 0xffffff });
    } else if (channel === 3) {
      // space
      tv.rect(sx, sy, sw, sh).fill(0x0b1026);
      for (const [a, b] of stars) tv.circle(sx + a * sw, sy + b * sh, 1.5).fill(0xffffff);
      const px = sx + sw * 0.5 + Math.cos(time * 0.001) * sw * 0.25;
      tv.circle(px, sy + sh * 0.5, sh * 0.18).fill(0xb07de8).stroke({ width: 2, color: INK });
      tv.ellipse(px, sy + sh * 0.5, sh * 0.3, sh * 0.06).stroke({ width: 3, color: 0xffd166 });
    } else {
      // a bouncing ball cartoon
      tv.rect(sx, sy, sw, sh).fill(0xcaf0f8);
      const bx = sx + sw * 0.5 + Math.sin(time * 0.002) * sw * 0.3;
      const by = sy + sh * 0.85 - Math.abs(Math.sin(time * 0.006)) * sh * 0.6;
      tv.rect(sx, sy + sh * 0.9, sw, sh * 0.1).fill(0x7bd36b);
      tv.circle(bx, by, sh * 0.1).fill(0xe5383b).stroke({ width: 2, color: INK });
    }
  }, cleanups);
  hotspot(kit, new Rectangle(sx - 10, sy - 10, sw + 20, sh + 20), () => {
    channel = (channel + 1) % 5;
    sfx.tvStatic();
    if (channel === 0) sfx.click();
  });

  // --- the dog picture: woof! ---
  const dcx = w * 0.075, dcy = h * 0.28, r = Math.min(w * 0.04, h * 0.08);
  const dog = new Graphics();
  kit.under.addChild(dog);
  hotspot(kit, new Rectangle(w * 0.02, h * 0.08, w * 0.11, h * 0.42), oneAtATime((done) => {
    sfx.woof();
    tween(1400, (t) => {
      const k = Math.sin(t * Math.PI);
      dog.clear();
      dog.ellipse(dcx, dcy + r * 0.62 + k * r * 0.25, r * 0.22, r * 0.18 + k * r * 0.3).fill(0xff8fa3).stroke({ width: 2, color: INK });
      const wig = Math.sin(t * Math.PI * 8) * 0.4;
      dog.ellipse(dcx - r * 0.8, dcy - r * 0.6 - Math.abs(wig) * r * 0.3, r * 0.45, r * 0.7).ellipse(dcx + r * 0.8, dcy - r * 0.6 - Math.abs(wig) * r * 0.3, r * 0.45, r * 0.7).fill(0x1f1f1f);
    }, () => {
      dog.clear();
      done();
    });
  }));

  // --- the mirror shines ---
  const mx = w * 0.35, my = h * 0.14, mw = w * 0.06, mh = h * 0.34;
  const shine = new Graphics();
  kit.under.addChild(shine);
  hotspot(kit, new Rectangle(mx - 8, my - 8, mw + 16, mh + 16), oneAtATime((done) => {
    sfx.twinkle();
    tween(700, (t) => {
      shine.clear();
      const y = my + mh * (1.2 - 1.4 * t);
      shine.poly([mx + 4, y, mx + mw - 4, y - mw * 0.8, mx + mw - 4, y - mw * 0.8 + 18, mx + 4, y + 18]).fill({ color: 0xffffff, alpha: 0.85 });
    }, () => {
      shine.clear();
      burst(kit.sparkles, mx + mw / 2, my + mh * 0.3, 8, 50);
      done();
    });
  }));

  // --- floor lamp ---
  const glows = new Graphics();
  glows.eventMode = 'none';
  kit.over.addChild(glows);
  let lampOn = false;
  hotspot(kit, new Rectangle(w * 0.578, h * 0.28, w * 0.075, h * 0.44), () => {
    lampOn = !lampOn;
    sfx.click();
    glows.clear();
    if (lampOn) glow(glows, w * 0.615, h * 0.34, w * 0.1, 0xfff3c4, 1.8);
  });

  // --- the ceiling light: disco time! ---
  const light = new Graphics();
  light.ellipse(w * 0.5, 0, w * 0.06, h * 0.035).fill(0xdee2e6).stroke({ width: 4, color: INK });
  light.ellipse(w * 0.5, 0, w * 0.04, h * 0.02).fill(0xf8f9fa);
  kit.under.addChild(light);
  const party = new Graphics();
  party.eventMode = 'none';
  kit.over.addChild(party);
  const spotColours = [0xff4d6d, 0x4cc9f0, 0xffd60a, 0x7bd36b, 0xb07de8];
  hotspot(kit, new Rectangle(w * 0.43, 0, w * 0.14, h * 0.07), oneAtATime((done) => {
    sfx.tune();
    later(1500, () => sfx.tune([659, 784, 988, 784, 1047, 988, 784, 659]), cleanups);
    tween(3200, (t) => {
      party.clear().rect(0, 0, w, h).fill({ color: 0x0b1026, alpha: 0.35 * Math.sin(t * Math.PI) });
      spotColours.forEach((c, i) => {
        const a = t * Math.PI * 4 + (i * Math.PI * 2) / spotColours.length;
        const x = w * 0.5 + Math.cos(a) * w * 0.32;
        const y = h * 0.45 + Math.sin(a * 1.3) * h * 0.25;
        party.circle(x, y, h * 0.09).fill({ color: c, alpha: 0.4 * Math.sin(t * Math.PI) });
      });
      light.tint = spotColours[Math.floor(t * 20) % spotColours.length];
    }, () => {
      party.clear();
      light.tint = 0xffffff;
      done();
    });
  }));

  // --- the big window blinds go up ---
  raisableBlinds(kit, w * 0.66, h * 0.1, w * 0.32, h * 0.4, 0xffffff, 'slats');
  void Container;
}
