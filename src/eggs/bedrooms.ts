import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { everyFrame, glow, INK, lightSwitch, MultiHit, rand, roomLights, tappable, type Cleanups, type EggKit } from './common';

/**
 * Surprises in the two bedrooms (drawn after the family's photos).
 */

// ---------------------------------------------------------------------------
// First bedroom: geometric wall, blackout blind, turquoise dresser, daybed
// ---------------------------------------------------------------------------
export function bedroomA(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;
  const glows = new Graphics();
  glows.eventMode = 'none';
  let lampOn = false;
  let nightColour = 0;
  const NIGHT = [0x7fdde0, 0x7bd36b, 0xc3b1ff, 0xffb347, 0xff8fb1];
  const lights = roomLights(kit, () => drawGlows());
  kit.over.addChild(glows);

  // --- the blackout blind rolls up (under the spotty valance) ---
  const wx = w * 0.15, wy = h * 0.16, ww = w * 0.24, wh = h * 0.34;
  const top = wy - 30 + h * 0.11; // bottom of the valance
  const blind = new Graphics();
  kit.under.addChild(blind);
  let down = 1;
  let isDown = true;
  const drawBlind = () => {
    const bottom = top + (wy + wh - top) * down;
    blind.clear().rect(wx + 3, top, ww - 6, Math.max(2, bottom - top)).fill(0x1f1f1f);
    blind.roundRect(wx - 6, bottom - 7, ww + 12, 14, 6).fill(0x2b2b2b).stroke({ width: 3, color: INK });
    const cx = wx + ww - 20;
    blind.moveTo(cx, bottom + 6).lineTo(cx, bottom + 36).stroke({ width: 2, color: INK });
    blind.circle(cx, bottom + 41, 6).fill(0xffffff).stroke({ width: 2, color: INK });
  };
  drawBlind();
  tappable(
    blind,
    () => {
      isDown = !isDown;
      sfx.zip();
      const from = down;
      const to = isDown ? 1 : 0.06;
      tween(550, (t) => {
        down = from + (to - from) * ease.inOutSine(t);
        drawBlind();
      });
    },
    new Rectangle(wx - 10, top - 10, ww + 20, wy + wh - top + 70),
  );

  // --- light switch by the window ---
  lightSwitch(kit, wx + ww + 34, h * 0.4, lights);

  // --- the dresser: three drawers, each hiding something ---
  const dx = 0, dy = h * 0.46, dw = w * 0.17, dh = fy - dy;
  const drawerH = (dh - 16) / 3;
  const surprises = [socks, mouse, dino];
  for (let i = 0; i < 3; i++) {
    const y0 = dy + 16 + i * drawerH;
    const peek = new Container(); // things that peek out sit behind the drawer front
    kit.under.addChild(peek);
    const front = new Graphics();
    kit.under.addChild(front);
    let open = 0;
    let busy = false;
    const draw = () => {
      const drop = drawerH * 0.4 * open;
      front.clear();
      if (open > 0) front.rect(dx + 4, y0, dw - 8, drop).fill(0x264653);
      front.rect(dx, y0 + drop, dw, drawerH).fill(0x8ecdd0).stroke({ width: 3, color: INK });
      front.circle(dx + dw / 2, y0 + drop + drawerH / 2, 7).fill(0xffffff).stroke({ width: 2, color: INK });
    };
    draw();
    tappable(front, () => {
      if (busy) return;
      busy = true;
      sfx.drawer();
      tween(220, (t) => ((open = t), draw()), () => {
        surprises[i](peek, dx + dw / 2, y0, () =>
          tween(220, (t) => ((open = 1 - t), draw()), () => (busy = false)),
        );
      });
    }, new Rectangle(dx, y0, dw, drawerH));
  }

  function socks(_peek: Container, x: number, y: number, done: () => void) {
    sfx.pop(1.3);
    const colours = [0xff8fb1, 0x7bd36b, 0x4ea8ff];
    for (let i = 0; i < 3; i++) {
      const s = new Graphics()
        .roundRect(-10, -28, 20, 40, 8)
        .roundRect(-10, 4, 34, 18, 9)
        .fill(colours[i])
        .stroke({ width: 3, color: INK });
      s.rect(-10, -28, 20, 8).fill(0xffffff); // stripy top
      s.position.set(x, y);
      kit.over.addChild(s);
      const vx = rand(-0.25, 0.35), vy = rand(-0.9, -0.6), spin = rand(-8, 8);
      tween(1500, (t) => {
        const ms = t * 1500;
        s.x = x + vx * ms;
        s.y = Math.min(fy + 20, y + vy * ms + 0.0011 * ms * ms);
        s.rotation = spin * t;
        s.alpha = t > 0.75 ? 1 - (t - 0.75) * 4 : 1;
      }, () => s.destroy());
    }
    setTimeout(done, 600);
  }

  function mouse(peek: Container, x: number, y: number, done: () => void) {
    const m = new Graphics();
    m.circle(-14, -14, 9).circle(14, -14, 9).fill(0xadb5bd).stroke({ width: 2, color: INK });
    m.circle(-14, -14, 4).circle(14, -14, 4).fill(0xffb3c6);
    m.ellipse(0, 0, 18, 15).fill(0xadb5bd).stroke({ width: 2, color: INK });
    m.circle(-6, -3, 3).circle(6, -3, 3).fill(INK);
    m.circle(0, 6, 3.5).fill(0xff8fb1);
    m.moveTo(-4, 7).lineTo(-20, 3).moveTo(-4, 9).lineTo(-20, 11).moveTo(4, 7).lineTo(20, 3).moveTo(4, 9).lineTo(20, 11).stroke({ width: 1.5, color: INK });
    m.position.set(x, y + 20);
    peek.addChild(m);
    tween(300, (t) => (m.y = y + 20 - 30 * ease.outBack(t)), () => {
      sfx.squeak(1.7);
      tween(900, (t) => (m.rotation = Math.sin(t * Math.PI * 6) * 0.15), () => {
        tween(250, (t) => (m.y = y - 10 + 30 * t), () => {
          m.destroy();
          done();
        });
      });
    });
  }

  function dino(peek: Container, x: number, y: number, done: () => void) {
    const d = new Graphics();
    d.roundRect(-20, -34, 44, 30, 12).fill(0x52b788).stroke({ width: 3, color: INK }); // head
    d.roundRect(-10, -8, 24, 30, 8).fill(0x52b788).stroke({ width: 3, color: INK }); // neck
    d.circle(10, -24, 4).fill(INK);
    d.poly([-10, -10, 20, -10, 14, -4, -4, -4]).fill(0xffffff); // teeth
    d.poly([-16, -34, -10, -44, -4, -34, 2, -44, 8, -34]).fill(0xffd166).stroke({ width: 2, color: INK }); // spikes
    d.position.set(x, y + 30);
    peek.addChild(d);
    tween(280, (t) => (d.y = y + 30 - 40 * ease.outBack(t)), () => {
      sfx.rawr();
      tween(700, (t) => (d.x = x + Math.sin(t * Math.PI * 10) * 4 * (1 - t)), () => {
        tween(260, (t) => (d.y = y - 10 + 40 * t), () => {
          d.destroy();
          done();
        });
      });
    });
  }

  // --- fox lamp on the dresser ---
  const lampX = dx + dw * 0.4, lampTop = dy - h * 0.22;
  const lamp = new Graphics();
  lamp.rect(lampX - 4, dy - h * 0.12, 8, h * 0.12).fill(0xf6f7f2).stroke({ width: 2, color: INK });
  lamp.poly([lampX - dw * 0.22, dy - h * 0.12, lampX + dw * 0.22, dy - h * 0.12, lampX + dw * 0.14, lampTop, lampX - dw * 0.14, lampTop])
    .fill(0xfff1c1)
    .stroke({ width: 4, color: INK });
  lamp.poly([lampX - dw * 0.08, dy - h * 0.14, lampX, dy - h * 0.19, lampX + dw * 0.05, dy - h * 0.14]).fill(0xf4a261); // fox
  lamp.circle(lampX - dw * 0.02, dy - h * 0.16, 2).fill(INK);
  kit.under.addChild(lamp);
  tappable(lamp, () => {
    lampOn = !lampOn;
    sfx.click();
    drawGlows();
  }, new Rectangle(lampX - dw * 0.3, lampTop - 10, dw * 0.6, h * 0.24));

  // --- star projector on the dresser ---
  const px = dx + dw * 0.82, py = dy;
  const projector = new Graphics();
  projector.moveTo(px - 18, py).arc(px, py, 18, Math.PI, 0).lineTo(px - 18, py).fill(0x1d1d3b).stroke({ width: 3, color: INK });
  for (const [ox, oy] of [[-8, -6], [0, -12], [8, -5], [-2, -3]]) projector.circle(px + ox, py + oy, 2.5).fill(0xff4d4d);
  kit.under.addChild(projector);
  const sky = new Container();
  sky.eventMode = 'none';
  sky.visible = false;
  kit.over.addChild(sky);
  const dim = new Graphics().rect(0, 0, w, h).fill({ color: 0x0b1026, alpha: 0.5 });
  sky.addChild(dim);
  const starField = new Container();
  starField.position.set(px, py);
  sky.addChild(starField);
  const starList: Graphics[] = [];
  for (let i = 0; i < 160; i++) {
    const r = Math.max(w, h) * Math.sqrt(Math.random()) * 1.15;
    const a = Math.random() * Math.PI * 2;
    const c = [0xff4d4d, 0xff9f43, 0xffffff, 0xffd166, 0xff6b9d][i % 5];
    const s = new Graphics();
    if (i % 5 === 0) {
      const k = rand(1, 1.8);
      s.poly([0, -9 * k, 2.5 * k, -2.5 * k, 9 * k, 0, 2.5 * k, 2.5 * k, 0, 9 * k, -2.5 * k, 2.5 * k, -9 * k, 0, -2.5 * k, -2.5 * k]).fill(c);
    } else {
      s.circle(0, 0, rand(2.5, 5)).fill(c);
    }
    s.position.set(Math.cos(a) * r, Math.sin(a) * r);
    starField.addChild(s);
    starList.push(s);
  }
  let projecting = false;
  let skyLevel = 0;
  tappable(projector, () => {
    projecting = !projecting;
    if (projecting) sfx.twinkle();
    else sfx.click();
    const from = skyLevel;
    sky.visible = true;
    tween(400, (t) => {
      skyLevel = from + ((projecting ? 1 : 0) - from) * t;
      sky.alpha = skyLevel;
    }, () => (sky.visible = projecting));
  }, new Rectangle(px - 34, py - 36, 68, 50));
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    if (!sky.visible) return;
    starField.rotation += dt * 0.00008;
    starList.forEach((s, i) => (s.alpha = 0.55 + 0.45 * Math.sin(time * 0.003 + i)));
  }, cleanups);

  // --- night light in the wall socket: tap to change colour ---
  const nlx = w * 0.42 + 9, nly = h * 0.64 + 13;
  const nightLight = new Graphics();
  const drawNight = () => {
    nightLight.clear().roundRect(nlx - 14, nly - 18, 28, 30, 8).fill(0xffffff).stroke({ width: 3, color: INK });
    nightLight.circle(nlx, nly - 4, 9).fill(NIGHT[nightColour]).stroke({ width: 2, color: INK });
  };
  drawNight();
  kit.under.addChild(nightLight);
  tappable(nightLight, () => {
    nightColour = (nightColour + 1) % NIGHT.length;
    sfx.pling();
    drawNight();
    drawGlows();
  }, new Rectangle(nlx - 34, nly - 38, 68, 70));

  function drawGlows() {
    glows.clear();
    const boost = 1 + lights.level * 3;
    glow(glows, nlx, nly - 4, 70, NIGHT[nightColour], 0.7 * boost);
    if (lampOn) glow(glows, lampX, dy - h * 0.16, w * 0.12, 0xffd27a, 1.2 * boost);
  }
  drawGlows();

  // --- toy bin in the corner: a toy rocket blasts off ---
  const bx = w * 0.84, by = h * 0.6, bw2 = w * 0.14;
  const bin = new Container();
  const binArt = new Graphics();
  // toys poking out of the top
  binArt.circle(bx + bw2 * 0.25, by - 4, 16).fill(0xffd93d).stroke({ width: 3, color: INK });
  binArt.roundRect(bx + bw2 * 0.45, by - 18, 34, 18, 5).fill(0xe5383b).stroke({ width: 3, color: INK });
  binArt.poly([bx + bw2 * 0.78, by - 34, bx + bw2 * 0.86, by - 6, bx + bw2 * 0.7, by - 6]).fill(0xc3b1ff).stroke({ width: 3, color: INK });
  // the bin
  binArt.poly([bx, by, bx + bw2, by, bx + bw2 * 0.92, fy + 6, bx + bw2 * 0.08, fy + 6]).fill(0x4ea8ff).stroke({ width: 4, color: INK });
  binArt.rect(bx - 4, by - 2, bw2 + 8, 10).fill(0x2b6cb0).stroke({ width: 3, color: INK });
  bin.addChild(binArt);
  kit.under.addChild(bin);
  let flying = false;
  tappable(bin, () => {
    if (flying) return;
    flying = true;
    sfx.whoosh();
    const rocket = new Graphics();
    rocket.roundRect(-8, -22, 16, 36, 8).fill(0xffffff).stroke({ width: 3, color: INK });
    rocket.poly([-8, -16, 0, -32, 8, -16]).fill(0xe5383b).stroke({ width: 3, color: INK });
    rocket.poly([-8, 6, -16, 18, -8, 14]).poly([8, 6, 16, 18, 8, 14]).fill(0xe5383b).stroke({ width: 2, color: INK });
    rocket.circle(0, -6, 4).fill(0x4ea8ff).stroke({ width: 2, color: INK });
    kit.over.addChild(rocket);
    const p0 = { x: bx + bw2 / 2, y: by };
    const p1 = { x: w * 0.9, y: -h * 0.2 };
    const p2 = { x: w * 0.05, y: h * 0.05 };
    const p3 = { x: bx + bw2 / 2, y: by };
    const at = (t: number) => {
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      };
    };
    let lastPuff = 0;
    tween(2200, (t) => {
      const a = at(t), b = at(Math.min(1, t + 0.01));
      rocket.position.set(a.x, a.y);
      rocket.rotation = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      if (t - lastPuff > 0.03 && t < 0.95) {
        lastPuff = t;
        const puff = new Graphics().circle(0, 0, rand(5, 9)).fill({ color: 0xdee2e6, alpha: 0.8 });
        puff.position.set(a.x, a.y);
        kit.over.addChildAt(puff, Math.max(0, kit.over.getChildIndex(rocket)));
        tween(700, (k) => ((puff.alpha = 0.8 * (1 - k)), puff.scale.set(1 + k)), () => puff.destroy());
      }
    }, () => {
      rocket.destroy();
      sfx.pop(1.2);
      burst(kit.sparkles, p3.x, p3.y, 10, 70);
      tween(300, (t) => (bin.y = -Math.sin(t * Math.PI) * 10));
      flying = false;
    });
  }, new Rectangle(bx - 10, by - 40, bw2 + 20, fy - by + 50));
}

// ---------------------------------------------------------------------------
// Second bedroom: turquoise wall, butterflies, curtains, ceiling fan, desk
// ---------------------------------------------------------------------------
export function bedroomB(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;
  const glows = new Graphics();
  glows.eventMode = 'none';
  let lampOn = false;
  const glowStars = new Container();
  glowStars.eventMode = 'none';
  const lights = roomLights(kit, (level) => {
    glowStars.alpha = Math.min(1, level * 1.8);
    drawGlows();
  });
  kit.over.addChild(glowStars, glows);
  for (let i = 0; i < 26; i++) {
    const s = new Graphics();
    const r = rand(5, 10);
    const pts: number[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      pts.push(Math.cos(a) * (k % 2 ? r * 0.45 : r), Math.sin(a) * (k % 2 ? r * 0.45 : r));
    }
    s.poly(pts).fill(0xd8ff8a);
    s.position.set(rand(0.02, 0.98) * w, rand(0.02, 0.4) * h);
    glowStars.addChild(s);
  }
  glowStars.alpha = 0;

  // --- the window: a penguin hides on the sill behind the curtains ---
  const wx = w * 0.18, wy = h * 0.12, ww = w * 0.2, wh = h * 0.38;
  const penguin = new Container();
  const pg = new Graphics();
  pg.ellipse(0, -26, 20, 27).fill(0x22223b).stroke({ width: 3, color: INK });
  pg.ellipse(0, -20, 13, 19).fill(0xffffff);
  pg.circle(-6, -38, 3).circle(6, -38, 3).fill(INK);
  pg.poly([-5, -32, 5, -32, 0, -26]).fill(0xffa94d);
  pg.ellipse(-9, 0, 8, 4).ellipse(9, 0, 8, 4).fill(0xffa94d).stroke({ width: 2, color: INK });
  penguin.addChild(pg);
  const sill = { x: wx + ww * 0.5, y: wy + wh };
  penguin.position.set(sill.x, sill.y);
  kit.under.addChild(penguin);

  const curtains = new Graphics();
  kit.under.addChild(curtains);
  let open = 0;
  let isOpen = false;
  let sway = 0;
  const drawCurtains = () => {
    const leftW = ww * (0.58 - 0.4 * open) + 26;
    const rightW = ww * (0.58 - 0.4 * open) + 26;
    const ch = wh + h * 0.2;
    const s = sway;
    curtains.clear();
    curtains.poly([wx - 26, wy - 6, wx - 26 + leftW, wy - 6, wx - 26 + leftW + s, wy - 6 + ch, wx - 26 + s * 0.5, wy - 6 + ch]).fill({ color: 0xffffff, alpha: 0.88 });
    curtains.poly([wx + ww + 26 - rightW, wy - 6, wx + ww + 26, wy - 6, wx + ww + 26 + s * 0.5, wy - 6 + ch, wx + ww + 26 - rightW + s, wy - 6 + ch]).fill({ color: 0xffffff, alpha: 0.88 });
    for (let i = 1; i < 4; i++) {
      const lx = wx - 26 + (leftW * i) / 4, rx = wx + ww + 26 - (rightW * i) / 4;
      curtains.moveTo(lx, wy).lineTo(lx + s, wy - 6 + ch).moveTo(rx, wy).lineTo(rx + s, wy - 6 + ch);
    }
    curtains.stroke({ width: 2, color: 0xdee2e6 });
    // closed: the whole window is the button; open: only the curtains, so the penguin can be tapped
    curtains.hitArea = isOpen
      ? new MultiHit(new Rectangle(wx - 26, wy - 6, leftW, ch), new Rectangle(wx + ww + 26 - rightW, wy - 6, rightW, ch))
      : new Rectangle(wx - 30, wy - 10, ww + 60, ch + 10);
  };
  drawCurtains();
  tappable(curtains, () => {
    isOpen = !isOpen;
    sfx.whoosh();
    const from = open;
    tween(500, (t) => ((open = from + ((isOpen ? 1 : 0) - from) * ease.inOutSine(t)), drawCurtains()));
  });

  let sliding = false;
  tappable(penguin, () => {
    if (sliding || !isOpen) return;
    sliding = true;
    sfx.slideWhistle(1.2);
    kit.over.addChild(penguin); // in front of the furniture while it slides
    const floorY = fy + h * 0.14;
    const far = w * 0.62;
    tween(2600, (t) => {
      if (t < 0.15) {
        const k = t / 0.15; // hop down
        penguin.x = sill.x + (w * 0.05) * k;
        penguin.y = sill.y + (floorY - sill.y) * k - Math.sin(k * Math.PI) * 60;
        penguin.rotation = 0;
      } else if (t < 0.85) {
        const k = (t - 0.15) / 0.7; // belly slide there and back
        const out = k < 0.5 ? ease.outCubic(k * 2) : 1 - ease.inOutSine((k - 0.5) * 2);
        penguin.x = sill.x + w * 0.05 + (far - sill.x - w * 0.05) * out;
        penguin.y = floorY;
        penguin.rotation = k < 0.5 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        const k = (t - 0.85) / 0.15; // hop back up
        penguin.x = sill.x + (w * 0.05) * (1 - k);
        penguin.y = floorY + (sill.y - floorY) * k - Math.sin(k * Math.PI) * 60;
        penguin.rotation = 0;
      }
    }, () => {
      penguin.position.set(sill.x, sill.y);
      penguin.rotation = 0;
      kit.under.addChildAt(penguin, kit.under.getChildIndex(curtains));
      sfx.squeak(1.5);
      sliding = false;
    });
  }, new Rectangle(-26, -58, 52, 66));

  // --- butterflies that fly away and land somewhere else ---
  const flyers: Container[] = [];
  const colours = [0xff4d8d, 0x9b5de5, 0x00bbf9, 0xfee440, 0x00f5d4];
  let fanSpin = 0;
  const homes = [[0.58, 0.14], [0.66, 0.3], [0.76, 0.2], [0.86, 0.12], [0.9, 0.28]];
  homes.forEach(([hx, hy], i) => {
    const b = new Container();
    const wings = new Graphics();
    wings.ellipse(-9, -5, 9, 12).ellipse(9, -5, 9, 12).fill(colours[i]).stroke({ width: 2, color: INK });
    wings.ellipse(-7, 9, 6, 7).ellipse(7, 9, 6, 7).fill(colours[i]).stroke({ width: 2, color: INK });
    wings.rect(-2, -12, 4, 26).fill(INK);
    b.addChild(wings);
    b.position.set(w * hx, h * hy);
    kit.under.addChild(b);
    flyers.push(b);
    let flying = false;
    const fly = () => {
      if (flying) return;
      flying = true;
      sfx.flutter();
      const from = { x: b.x, y: b.y };
      const to = { x: w * rand(0.5, 0.95), y: h * rand(0.08, 0.45) };
      const ctrl = { x: rand(0.1, 0.9) * w, y: rand(0, 0.3) * h };
      tween(1800, (t) => {
        const u = 1 - t;
        b.x = u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x;
        b.y = u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y - Math.sin(t * Math.PI * 4) * 12;
        wings.scale.x = 0.3 + 0.7 * Math.abs(Math.cos(t * Math.PI * 14));
      }, () => {
        wings.scale.x = 1;
        flying = false;
      });
    };
    (b as Container & { fly?: () => void }).fly = fly;
    tappable(b, fly, new Rectangle(-24, -24, 48, 48));
  });

  // --- ceiling fan: tap to spin it up (the butterflies love it) ---
  const fanX = w * 0.62, fanY = h * 0.07;
  const fan = new Container();
  const rod = new Graphics().rect(fanX - 4, 0, 8, fanY).fill(0xadb5bd).stroke({ width: 2, color: INK });
  const bladeTilt = new Container(); // squashed so the blades look seen from below
  bladeTilt.position.set(fanX, fanY);
  bladeTilt.scale.y = 0.28;
  const blades = new Graphics();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    blades.poly([
      Math.cos(a - 0.12) * 20, Math.sin(a - 0.12) * 20,
      Math.cos(a - 0.08) * w * 0.12, Math.sin(a - 0.08) * w * 0.12,
      Math.cos(a + 0.08) * w * 0.12, Math.sin(a + 0.08) * w * 0.12,
      Math.cos(a + 0.12) * 20, Math.sin(a + 0.12) * 20,
    ]).fill(0xf8f9fa).stroke({ width: 4, color: INK });
  }
  bladeTilt.addChild(blades);
  const housing = new Graphics();
  housing.ellipse(fanX, fanY, 30, 12).fill(0xced4da).stroke({ width: 3, color: INK });
  housing.ellipse(fanX, fanY + 16, 18, 12).fill(0xfff3c4).stroke({ width: 3, color: INK });
  fan.addChild(rod, bladeTilt, housing);
  kit.under.addChild(fan);
  let spinning = false;
  tappable(fan, () => {
    if (spinning) return;
    spinning = true;
    sfx.whirr();
    tween(4000, (t) => (fanSpin = Math.sin(t * Math.PI) * 0.35), () => {
      fanSpin = 0;
      spinning = false;
    });
    // the breeze sends the butterflies flying
    flyers.forEach((b, i) => setTimeout(() => (b as Container & { fly?: () => void }).fly?.(), 500 + i * 250));
  }, new Rectangle(fanX - w * 0.13, 0, w * 0.26, fanY + 34));
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    blades.rotation += fanSpin * (dt / 16);
    const target = fanSpin > 0.05 ? Math.sin(time * 0.006) * 14 * fanSpin * 3 : 0;
    if (Math.abs(target - sway) > 0.2) {
      sway += (target - sway) * 0.1;
      drawCurtains();
    }
    glowStars.children.forEach((s, i) => (s.scale.set(0.85 + 0.15 * Math.sin(time * 0.002 + i))));
  }, cleanups);

  // --- the sparkly purple lamp on the desk ---
  const lx = w * 0.82 + w * 0.13, ly = h * 0.52;
  const lamp = new Graphics();
  lamp.ellipse(lx, ly - 4, w * 0.02, 6).fill(0xced4da).stroke({ width: 2, color: INK });
  lamp.ellipse(lx, ly - h * 0.07, w * 0.03, h * 0.06).fill(0xd0a8ff).stroke({ width: 3, color: INK });
  for (let i = 0; i < 7; i++) lamp.circle(lx + rand(-1, 1) * w * 0.018, ly - h * 0.07 + rand(-1, 1) * h * 0.04, 2.5).fill(0xffffff);
  kit.under.addChild(lamp);
  tappable(lamp, () => {
    lampOn = !lampOn;
    sfx.click();
    if (lampOn) sfx.twinkle();
    drawGlows();
  }, new Rectangle(lx - w * 0.05, ly - h * 0.15, w * 0.1, h * 0.16));

  function drawGlows() {
    glows.clear();
    if (lampOn) glow(glows, lx, ly - h * 0.07, w * 0.14, 0xd0a8ff, 1.3 * (1 + lights.level * 3));
  }

  // --- the rainbow drawing pinned up: a real rainbow appears ---
  const rx = w * 0.555, ry = h * 0.47, rw = w * 0.06, rh = h * 0.07;
  const drawing = new Graphics();
  drawing.rect(rx, ry, rw, rh).fill(0xffffff).stroke({ width: 3, color: INK });
  const mini = [0xe5383b, 0xff9f1c, 0xffd93d, 0x7bd36b, 0x4ea8ff, 0x9b5de5];
  mini.forEach((c, i) => {
    const r = rw * 0.38 - i * 3;
    drawing.moveTo(rx + rw / 2 - r, ry + rh * 0.85).arc(rx + rw / 2, ry + rh * 0.85, r, Math.PI, 0).stroke({ width: 3, color: c });
  });
  drawing.circle(rx + rw / 2, ry + 4, 3).fill(0xe5383b); // the pin
  kit.under.addChild(drawing);
  let showing = false;
  tappable(drawing, () => {
    if (showing) return;
    showing = true;
    sfx.twinkle();
    const rainbow = new Graphics();
    kit.under.addChildAt(rainbow, kit.under.getChildIndex(drawing));
    const cx = w * 0.73, cy = h * 0.55, R = w * 0.24;
    const band = R * 0.07;
    tween(3200, (t) => {
      const grow = Math.min(1, t / 0.2);
      const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
      rainbow.clear();
      mini.forEach((c, i) => {
        const r = (R - i * band) * ease.outBack(grow);
        if (r > 0) rainbow.moveTo(cx - r, cy).arc(cx, cy, r, Math.PI, 0).stroke({ width: band, color: c, alpha: 0.85 * fade });
      });
    }, () => {
      rainbow.destroy();
      showing = false;
    });
    setTimeout(() => {
      burst(kit.sparkles, cx - R, cy, 8, 60);
      burst(kit.sparkles, cx + R, cy, 8, 60);
    }, 500);
  }, new Rectangle(rx - 14, ry - 14, rw + 28, rh + 28));

  // --- light switch on the turquoise wall ---
  lightSwitch(kit, w * 0.07, h * 0.42, lights);
}

