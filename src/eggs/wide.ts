import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { windowView } from '../places';
import { PALETTE } from '../seasons';
import { fireWideEggs, parkWideEggs, policeWideEggs, schoolWideEggs } from './townWide';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, raisableBlinds, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Surprises in the new parts of the wide rooms (to the left and right of
 * each room's original view: see wideRooms.ts for where things are).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DoorOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Which side the hinges are on ('both' = a pair of doors opening from the middle). */
  hinge: 'left' | 'right' | 'both';
  /** Draw what's behind the door. */
  inside: (g: Graphics, x: number, y: number, w: number, h: number) => void;
  /** Just opened: add things to `layer` (cleared when the door closes). */
  onOpen?: (layer: Container) => void;
  /** A window with a blind in the top half (outside doors). */
  window?: boolean;
  /** A dark towel hanging over the top. */
  towel?: boolean;
}

/** A door that swings open when tapped (and shut again on the next tap). */
function swingDoor(kit: EggKit, o: DoorOptions) {
  const inside = new Graphics();
  o.inside(inside, o.x, o.y, o.w, o.h);
  kit.under.addChild(inside);
  const layer = new Container(); // things that appear in the doorway
  const mask = new Graphics().rect(o.x, o.y, o.w, o.h).fill(0xffffff);
  layer.mask = mask;
  kit.under.addChild(mask, layer);

  const leaves: Container[] = [];
  const parts: { hinge: 'left' | 'right'; x: number; w: number }[] =
    o.hinge === 'both'
      ? [{ hinge: 'left', x: o.x, w: o.w / 2 }, { hinge: 'right', x: o.x + o.w / 2, w: o.w / 2 }]
      : [{ hinge: o.hinge, x: o.x, w: o.w }];
  for (const p of parts) {
    const leaf = new Container();
    const art = new Graphics();
    drawLeaf(art, p.w, o.h, p.hinge === 'left' ? 1 : -1, o);
    leaf.addChild(art);
    leaf.position.set(p.hinge === 'left' ? p.x : p.x + p.w, o.y);
    kit.under.addChild(leaf);
    leaves.push(leaf);
  }

  let open = false;
  let busy = false;
  const swing = (to: number, done?: () => void) => {
    const from = open ? 1 : 0;
    tween(380, (t) => {
      const a = from + (to - from) * ease.inOutSine(t);
      for (const leaf of leaves) {
        leaf.scale.x = 1 - 0.8 * a;
        const shade = Math.round(255 - 50 * a);
        (leaf.children[0] as Graphics).tint = (shade << 16) | (shade << 8) | shade;
      }
    }, done);
  };
  const close = () => {
    if (!open || busy) return;
    busy = true;
    sfx.drawer();
    swing(0, () => {
      open = false;
      busy = false;
      for (const c of layer.removeChildren()) c.destroy({ children: true });
    });
  };
  const openUp = () => {
    if (busy || open) return;
    busy = true;
    sfx.zip();
    swing(1, () => {
      open = true;
      busy = false;
      o.onOpen?.(layer);
    });
  };
  hotspot(kit, new Rectangle(o.x - 6, o.y - 6, o.w + 12, o.h + 6), () => {
    if (busy) return;
    if (open) return close();
    openUp();
  });
  return { close, show: openUp, get open() { return open; } };
}

/**
 * The bedroom closets are wardrobes. Open one and, after its surprise, the
 * dress-up screen opens (for whoever stands nearest). Walk someone who can be
 * dressed into one and they go in and change. The door shuts again after.
 */
function wardrobeCloset(kit: EggKit, cleanups: Cleanups, o: Omit<DoorOptions, 'onOpen'> & { surprise: (layer: Container) => void; wait: number }) {
  const at = { x: o.x + o.w / 2, y: o.y + o.h };
  let who: unknown; // who walked in
  let dressing = false;
  const dress = () => {
    if (dressing || !door.open || !kit.wardrobe) return;
    dressing = true;
    const ok = kit.wardrobe.open(at, who, () => {
      dressing = false;
      later(450, door.close, cleanups);
    });
    who = undefined;
    if (!ok) dressing = false;
  };
  const door = swingDoor(kit, {
    ...o,
    onOpen(layer) {
      o.surprise(layer);
      later(who ? 250 : o.wait, dress, cleanups);
    },
  });
  kit.secrets?.lock({
    accepts: ['*'],
    wants: (ch) => !!kit.wardrobe?.canDress(ch),
    area: () => ({ x: o.x, y: o.y, w: o.w, h: kit.h - o.y }), // (and the floor in front, where people stand)
    open: (_name, ch) => {
      if (dressing) return true;
      who = ch;
      if (door.open) dress();
      else door.show();
      return true;
    },
  });
}

function drawLeaf(g: Graphics, w: number, h: number, dir: 1 | -1, o: DoorOptions) {
  const x0 = dir > 0 ? 0 : -w;
  g.rect(x0, 0, w, h).fill(0xfbfbfb).stroke({ width: 3, color: INK });
  const px = x0 + w * 0.15, pw = w * 0.7;
  if (o.window) {
    g.rect(px, h * 0.06, pw, h * 0.3).fill(0xf4f4f4).stroke({ width: 3, color: 0xadb5bd });
    for (let y = h * 0.06 + 8; y < h * 0.36 - 6; y += 14) g.rect(px + 4, y, pw - 8, 6).fill(0xc9cdd2);
  } else {
    g.roundRect(px, h * 0.06, pw, h * 0.38, 4).stroke({ width: 3, color: 0xd5d9de });
  }
  g.roundRect(px, h * 0.54, pw, h * 0.4, 4).stroke({ width: 3, color: 0xd5d9de });
  // handle on the side away from the hinges
  const hx = dir > 0 ? w * 0.88 : -w * 0.88;
  g.circle(hx, h * 0.52, 7).fill(0xadb5bd).stroke({ width: 2, color: INK });
  g.roundRect(dir > 0 ? hx - 18 : hx, h * 0.52 - 3, 18, 6, 3).fill(0x8d99ae);
  if (o.towel) {
    const tx = dir > 0 ? w * 0.18 : -w * 0.6;
    g.roundRect(tx, -10, w * 0.42, h * 0.55, 6).fill(0x1f1f1f).stroke({ width: 2, color: 0x000000 });
    g.moveTo(tx + 6, h * 0.12).lineTo(tx + w * 0.42 - 6, h * 0.12).stroke({ width: 2, color: 0x3a3a3a });
  }
}

/** Behind a bedroom door: the hallway. */
function hallway(g: Graphics, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h).fill(0xd5dae0);
  g.rect(x, y + h * 0.82, w, h * 0.18).fill(0x3b2620);
  g.rect(x + w * 0.55, y + h * 0.15, w * 0.3, h * 0.25).fill(0xffffff).stroke({ width: 3, color: INK }); // a picture
  g.rect(x + w * 0.6, y + h * 0.19, w * 0.2, h * 0.17).fill(0x9fd8e8);
}

/** Behind a closet door: a rail of clothes. */
function closet(colours: number[]) {
  return (g: Graphics, x: number, y: number, w: number, h: number) => {
    g.rect(x, y, w, h).fill(0x3d405b);
    g.rect(x, y + h * 0.18, w, 6).fill(0xadb5bd);
    g.rect(x + 4, y + h * 0.08, w - 8, 8).fill(0x6d6875); // shelf
    g.roundRect(x + w * 0.1, y + h * 0.02, w * 0.3, h * 0.06, 3).fill(0xffd166);
    g.roundRect(x + w * 0.5, y + h * 0.03, w * 0.35, h * 0.05, 3).fill(0x9fd8e8);
    const n = Math.max(3, Math.round(w / 34));
    for (let i = 0; i < n; i++) {
      const cx = x + (w * (i + 0.5)) / n, cw = (w / n) * 0.9;
      g.moveTo(cx, y + h * 0.18).lineTo(cx, y + h * 0.21).stroke({ width: 2, color: 0xadb5bd });
      g.poly([cx - cw * 0.3, y + h * 0.21, cx + cw * 0.3, y + h * 0.21, cx + cw / 2, y + h * 0.55, cx - cw / 2, y + h * 0.55])
        .fill(colours[i % colours.length])
        .stroke({ width: 2, color: INK });
    }
    g.rect(x, y + h * 0.88, w, h * 0.12).fill(0x2b2d42);
  };
}

/** A border collie puppy's head and chest (drawn round 0, 0). */
function drawPuppy(g: Graphics) {
  g.ellipse(0, 36, 30, 26).fill(0xffffff).stroke({ width: 3, color: INK });
  g.poly([-22, -8, -16, -34, -4, -20]).poly([22, -8, 16, -34, 4, -20]).fill(0x1f1f1f).stroke({ width: 3, color: INK });
  g.circle(0, 0, 26).fill(0x1f1f1f).stroke({ width: 3, color: INK });
  g.poly([-5, -26, 5, -26, 11, 12, -11, 12]).fill(0xffffff);
  g.ellipse(0, 12, 15, 11).fill(0xffffff).stroke({ width: 2, color: INK });
  g.circle(0, 6, 5).fill(INK);
  g.ellipse(0, 22, 5, 7).fill(0xff8fa3).stroke({ width: 1.5, color: INK });
  g.circle(-10, -6, 4.5).circle(10, -6, 4.5).fill(0xffffff);
  g.circle(-10, -6, 2.4).circle(10, -6, 2.4).fill(INK);
  return g;
}

/** Open a bedroom door: a puppy pops up to say hello, wagging. */
function puppyVisit(o: { x: number; y: number; w: number; h: number }) {
  return (layer: Container) => {
    const pup = new Container();
    const tail = new Graphics().roundRect(-4, -26, 8, 28, 4).fill(0x1f1f1f).stroke({ width: 2, color: INK });
    tail.circle(0, -26, 5).fill(0xffffff);
    tail.position.set(28, 44);
    pup.addChild(tail, drawPuppy(new Graphics()));
    const x = o.x + o.w * 0.45, top = o.y + o.h - 100, bottom = o.y + o.h + 90;
    pup.scale.set(1.45);
    pup.position.set(x, bottom);
    layer.addChild(pup);
    tween(420, (t) => (pup.y = bottom + (top - bottom) * ease.outBack(t)), () => {
      sfx.woof();
      tween(1600, (t) => {
        if (pup.destroyed) return;
        tail.rotation = Math.sin(t * Math.PI * 14) * 0.6;
        pup.rotation = Math.sin(t * Math.PI * 4) * 0.06;
      });
    });
  };
}

/** A dream catcher: tap it to set it swaying and send dreams floating up. */
function dreamCatcher(kit: EggKit, x: number, y: number, r: number, beads: number[]) {
  const c = new Container();
  c.position.set(x, y - r - 14);
  const g = new Graphics();
  g.moveTo(0, 0).lineTo(0, 14).stroke({ width: 2, color: INK });
  g.circle(0, 14 + r, r).stroke({ width: 4, color: 0xc68b59 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.moveTo(0, 14 + r).lineTo(Math.cos(a) * r, 14 + r + Math.sin(a) * r);
  }
  g.circle(0, 14 + r, r * 0.45).stroke({ width: 1.5, color: 0xdee2e6 });
  g.stroke({ width: 1.5, color: 0xdee2e6 });
  for (const [i, dx] of [-0.6, 0, 0.6].entries()) {
    const sx = dx * r, sy = 14 + r * (dx === 0 ? 2 : 1.8);
    const len = r * (i === 1 ? 2.2 : 1.7);
    g.moveTo(sx, sy).lineTo(sx, sy + len * 0.5).stroke({ width: 1.5, color: INK });
    for (let b = 0; b < 3; b++) g.circle(sx, sy + 6 + b * 8, 3.5).fill(beads[(i + b) % beads.length]);
    g.ellipse(sx, sy + len * 0.75, 5, len * 0.3).fill(0xf8f9fa).stroke({ width: 1.5, color: INK });
    g.moveTo(sx, sy + len * 0.5).lineTo(sx, sy + len * 1.02).stroke({ width: 1, color: 0x6c757d });
  }
  c.addChild(g);
  kit.under.addChild(c);
  tappable(c, oneAtATime((done) => {
    sfx.twinkle();
    tween(1800, (t) => (c.rotation = Math.sin(t * Math.PI * 5) * 0.22 * (1 - t)), done);
    const shapes = ['star', 'heart', 'moon'];
    for (let i = 0; i < 6; i++) {
      const d = new Graphics();
      const kind = shapes[i % 3];
      const col = beads[i % beads.length];
      if (kind === 'star') d.star(0, 0, 5, 9, 4).fill(0xffd166).stroke({ width: 1.5, color: INK });
      else if (kind === 'heart') d.circle(-4, -2, 5).circle(4, -2, 5).poly([-9, 0, 9, 0, 0, 10]).fill(col);
      else d.circle(0, 0, 8).fill(0xfff3c4).stroke({ width: 1.5, color: INK });
      const sx = x + rand(-r, r), sy = y + rand(0, r);
      d.position.set(sx, sy);
      d.alpha = 0;
      kit.over.addChild(d);
      const drift = rand(-40, 40);
      tween(1700 + i * 150, (t) => {
        d.x = sx + drift * t + Math.sin(t * 9) * 8;
        d.y = sy - t * kit.h * 0.22;
        d.alpha = t < 0.2 ? t * 5 : 1 - (t - 0.2) / 0.8;
      }, () => d.destroy());
    }
  }), new Rectangle(-r - 10, 0, r * 2 + 20, r * 5));
}

/** Tap a map: a little plane flies a loop around it. */
function mapPlane(kit: EggKit, mx: number, my: number, mw: number, mh: number) {
  hotspot(kit, new Rectangle(mx, my, mw, mh), oneAtATime((done) => {
    sfx.whirr();
    const plane = new Graphics();
    plane.ellipse(0, 0, 16, 5).fill(0xffffff).stroke({ width: 2, color: INK });
    plane.poly([-4, -2, 4, -2, -2, -16, -8, -16]).poly([-4, 2, 4, 2, -2, 16, -8, 16]).fill(0xe5383b).stroke({ width: 2, color: INK });
    plane.poly([-14, 0, -18, -8, -12, -1]).fill(0xe5383b).stroke({ width: 1.5, color: INK });
    kit.over.addChild(plane);
    const cx = mx + mw / 2, cy = my + mh / 2, rx = mw * 0.38, ry = mh * 0.32;
    const at = (t: number) => ({ x: cx + Math.cos(t * Math.PI * 2 - Math.PI) * rx, y: cy + Math.sin(t * Math.PI * 4) * ry * 0.6 });
    let lastDot = 0;
    tween(2400, (t) => {
      const a = at(t), b = at(Math.min(1, t + 0.01));
      plane.position.set(a.x, a.y);
      plane.rotation = Math.atan2(b.y - a.y, b.x - a.x);
      if (t - lastDot > 0.04 && t < 0.97) {
        lastDot = t;
        const dot = new Graphics().circle(0, 0, 2.5).fill(0xe5383b);
        dot.position.set(a.x, a.y);
        kit.over.addChildAt(dot, kit.over.getChildIndex(plane));
        tween(1600, (k) => (dot.alpha = 1 - k), () => dot.destroy());
      }
    }, () => {
      plane.destroy();
      burst(kit.sparkles, at(1).x, at(1).y, 8, 50);
      sfx.pop(1.3);
      done();
    });
  }));
}

/** A mirror (rectangle or oval) that shimmers with a rainbow when tapped. */
function shimmerMirror(kit: EggKit, x: number, y: number, mw: number, mh: number, oval: boolean) {
  const g = new Graphics();
  const shape = () => (oval ? g.ellipse(x + mw / 2, y + mh / 2, mw / 2, mh / 2) : g.rect(x, y, mw, mh));
  if (oval) {
    shape().fill(0xd6e4ee).stroke({ width: 4, color: 0x1f1f1f });
    g.moveTo(x + mw * 0.25, y + mh * 0.35).lineTo(x + mw * 0.4, y + mh * 0.18).stroke({ width: 4, color: 0xffffff, alpha: 0.8 });
    kit.under.addChild(g);
  }
  const band = new Graphics();
  const mask = new Graphics();
  if (oval) mask.ellipse(x + mw / 2, y + mh / 2, mw / 2 - 3, mh / 2 - 3).fill(0xffffff);
  else mask.rect(x, y, mw, mh).fill(0xffffff);
  band.mask = mask;
  kit.under.addChild(mask, band);
  const cols = [0xff8fa3, 0xffd166, 0x7bd36b, 0x4cc9f0, 0xb07de8];
  hotspot(kit, new Rectangle(x - 8, y - 8, mw + 16, mh + 16), oneAtATime((done) => {
    sfx.twinkle();
    tween(900, (t) => {
      band.clear();
      const bx = x - mw + t * mw * 2.4;
      cols.forEach((c, i) => {
        const ox = bx + i * 10;
        band.poly([ox, y + mh, ox + 10, y + mh, ox + 10 + mh * 0.6, y, ox + mh * 0.6, y]).fill({ color: c, alpha: 0.7 });
      });
    }, () => {
      band.clear();
      burst(kit.sparkles, x + mw / 2, y + mh * 0.4, 8, 50);
      done();
    });
  }));
}

/** Swing something hanging from a point (a coat, a gown...). */
function swingIt(c: Container, ms = 1500, amount = 0.25) {
  return new Promise<void>((resolve) => tween(ms, (t) => (c.rotation = Math.sin(t * Math.PI * 5) * amount * (1 - t)), resolve));
}

// ---------------------------------------------------------------------------
// First bedroom
// ---------------------------------------------------------------------------
export function bedroomAWide(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;

  // --- the closet (a wardrobe): a teddy pops up and waves ---
  const cl = { x: -0.72 * w, y: h * 0.1, w: 0.16 * w, h: fy - h * 0.1 };
  wardrobeCloset(kit, cleanups, {
    ...cl,
    hinge: 'left',
    inside: closet([0xe5383b, 0x4ea8ff, 0x52b788, 0xffd166]),
    wait: 1300,
    surprise(layer) {
      const bear = new Container();
      const g = new Graphics();
      g.ellipse(0, 40, 30, 32).fill(0xb5835a).stroke({ width: 3, color: INK });
      g.ellipse(0, 46, 17, 18).fill(0xe9c79f);
      g.circle(-20, -26, 11).circle(20, -26, 11).fill(0xb5835a).stroke({ width: 3, color: INK });
      g.circle(0, 0, 28).fill(0xb5835a).stroke({ width: 3, color: INK });
      g.ellipse(0, 9, 12, 9).fill(0xe9c79f).stroke({ width: 2, color: INK });
      g.circle(0, 5, 4).fill(INK);
      g.circle(-10, -6, 3.5).circle(10, -6, 3.5).fill(INK);
      const arm = new Graphics().roundRect(-8, -36, 16, 40, 8).fill(0xb5835a).stroke({ width: 3, color: INK });
      arm.position.set(26, 32);
      bear.addChild(arm, g);
      const x = cl.x + cl.w / 2, top = cl.y + cl.h - 90, bottom = cl.y + cl.h + 40;
      bear.position.set(x, bottom);
      layer.addChild(bear);
      tween(450, (t) => (bear.y = bottom + (top - bottom) * ease.outBack(t)), () => {
        sfx.squeak(1.2);
        later(250, () => sfx.giggle(1.1), cleanups);
        tween(1500, (t) => !arm.destroyed && (arm.rotation = 0.6 + Math.sin(t * Math.PI * 8) * 0.5));
      });
    },
  });

  // --- the laundry hamper: a ball bounces out ---
  const hx = -0.52 * w, hw = 0.065 * w, hy = h * 0.56;
  const hamper = new Container();
  const hg = new Graphics();
  hg.ellipse(hx + hw / 2, hy, hw / 2 - 4, 8).fill(0xff7a59); // laundry on top
  hg.rect(hx, hy, hw, fy + 8 - hy).fill(0xffffff).stroke({ width: 3, color: INK });
  for (let y = hy + 10; y < fy; y += 12) hg.rect(hx + 2, y, hw - 4, 3).fill(0x3a3a3a);
  hg.roundRect(hx - 6, hy - 10, 10, 22, 4).roundRect(hx + hw - 4, hy - 10, 10, 22, 4).stroke({ width: 3, color: 0xc68b59 });
  hamper.addChild(hg);
  kit.under.addChild(hamper);
  tappable(hamper, oneAtATime((done) => {
    sfx.boing(1.2);
    tween(400, (t) => (hamper.skew.x = Math.sin(t * Math.PI * 4) * 0.06 * (1 - t)));
    const ball = new Graphics().circle(0, 0, 14).fill(0xffd93d).stroke({ width: 3, color: INK });
    ball.moveTo(-14, 0).lineTo(14, 0).stroke({ width: 2, color: 0xe5383b });
    const x0 = hx + hw / 2, y0 = hy;
    ball.position.set(x0, y0);
    kit.over.addChild(ball);
    let lastN = 0;
    tween(2200, (t) => {
      const ms = t * 2200;
      ball.x = x0 + ms * 0.12;
      // bounces, getting smaller each time
      const phase = (ms / 520) % 1;
      const n = Math.floor(ms / 520);
      const height = (h * 0.16) / (n + 1);
      ball.y = fy + h * 0.06 - Math.sin(phase * Math.PI) * height - (n === 0 ? (y0 - fy) * (1 - phase) * -1 : 0);
      ball.rotation = ms * 0.01;
      ball.alpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      if (n > lastN) {
        lastN = n;
        sfx.boing(1.6 + n * 0.1);
      }
    }, () => {
      ball.destroy();
      done();
    });
  }), new Rectangle(hx - 8, hy - 14, hw + 16, fy - hy + 24));

  // --- the growth chart: a star climbs up to see how tall it is ---
  const rx = -0.43 * w, ry = h * 0.18, rw = Math.max(18, 0.03 * w), rh = h * 0.52;
  hotspot(kit, new Rectangle(rx - 14, ry, rw + 28, rh), oneAtATime((done) => {
    const marker = new Graphics().star(0, 0, 5, 14, 6).fill(0xffd166).stroke({ width: 2, color: INK });
    kit.over.addChild(marker);
    const target = ry + rh * rand(0.05, 0.6);
    sfx.slideWhistle(1.2);
    tween(900, (t) => {
      marker.position.set(rx + rw + 10, ry + rh - (ry + rh - target) * ease.outCubic(t));
      marker.rotation = t * 6;
    }, () => {
      sfx.spring(1.3);
      burst(kit.sparkles, marker.x, marker.y, 10, 60);
      tween(700, (t) => (marker.alpha = 1 - t), () => {
        marker.destroy();
        done();
      });
    });
  }));

  // --- book ledges: a book flaps out like a bird and flies back ---
  const lx = -0.37 * w, lw = 0.14 * w;
  for (const ly of [h * 0.24, h * 0.4, h * 0.56]) {
    hotspot(kit, new Rectangle(lx, ly - 60, lw, 70), oneAtATime((done) => {
      sfx.flutter();
      const colour = [0xe5383b, 0x4ea8ff, 0x52b788, 0xb07de8][Math.floor(rand(0, 4))];
      const book = new Container();
      const left = new Graphics().poly([0, 0, -24, -6, -24, 22, 0, 28]).fill(colour).stroke({ width: 2, color: INK });
      const right = new Graphics().poly([0, 0, 24, -6, 24, 22, 0, 28]).fill(colour).stroke({ width: 2, color: INK });
      left.poly([-4, 4, -20, 0, -20, 4, -4, 8]).fill(0xffffff);
      right.poly([4, 4, 20, 0, 20, 4, 4, 8]).fill(0xffffff);
      book.addChild(left, right);
      kit.over.addChild(book);
      const sx = lx + rand(0.2, 0.8) * lw, sy = ly - 30;
      tween(2000, (t) => {
        book.x = sx + Math.sin(t * Math.PI * 2) * lw * 0.9;
        book.y = sy - Math.sin(t * Math.PI) * h * 0.14;
        const flap = Math.abs(Math.sin(t * Math.PI * 10));
        left.scale.x = 0.3 + flap * 0.7;
        right.scale.x = 0.3 + flap * 0.7;
        book.alpha = t > 0.9 ? (1 - t) * 10 : 1;
      }, () => {
        book.destroy();
        sfx.pop(1.4);
        done();
      });
    }));
  }

  // --- the dream catcher and the scratch map ---
  dreamCatcher(kit, -0.205 * w, h * 0.3, Math.min(0.025 * w, h * 0.04), [0x9fd8e8, 0xffffff, 0x52b788]);
  mapPlane(kit, -0.17 * w, h * 0.18, 0.15 * w, h * 0.22);

  // --- the air purifier: whoosh, bubbles float off ---
  const px = -0.08 * w, pw = 0.045 * w, py = h * 0.55;
  const purifier = new Graphics();
  let purifying = false;
  const drawPurifier = () => {
    purifier.clear().roundRect(px, py, pw, fy + 6 - py, pw / 2).fill(0xfbfbfb).stroke({ width: 3, color: INK });
    for (let y = py + 30; y < fy - 10; y += 10) purifier.moveTo(px + 8, y).lineTo(px + pw - 8, y);
    purifier.stroke({ width: 1.5, color: 0xced4da });
    purifier.circle(px + pw / 2, py + 14, 5).fill(purifying ? 0x4cc9f0 : 0xadb5bd);
  };
  drawPurifier();
  kit.under.addChild(purifier);
  tappable(purifier, oneAtATime((done) => {
    purifying = true;
    drawPurifier();
    sfx.whirr();
    for (let i = 0; i < 9; i++) {
      later(i * 140, () => {
        const b = new Graphics().circle(0, 0, rand(5, 10)).stroke({ width: 2, color: 0x9fd8e8 });
        const sx = px + pw / 2, sy = py;
        b.position.set(sx, sy);
        kit.over.addChild(b);
        const dx = rand(-60, 160);
        tween(1600, (t) => {
          b.x = sx + dx * t + Math.sin(t * 10) * 6;
          b.y = sy - t * h * 0.25;
          b.alpha = 1 - t;
        }, () => b.destroy());
      }, cleanups);
    }
    later(1700, () => {
      purifying = false;
      drawPurifier();
      done();
    }, cleanups);
  }), new Rectangle(px - 10, py - 10, pw + 20, fy - py + 20));

  // --- right: the bedroom door (a puppy says hello) and another closet ---
  const door = { x: 1.08 * w, y: h * 0.09, w: 0.18 * w, h: fy - h * 0.09 };
  swingDoor(kit, { ...door, hinge: 'right', towel: true, inside: hallway, onOpen: puppyVisit(door) });
  const cl2 = { x: 1.38 * w, y: h * 0.09, w: 0.18 * w, h: fy - h * 0.09 };
  wardrobeCloset(kit, cleanups, {
    ...cl2,
    hinge: 'right',
    inside: closet([0x264653, 0x6c757d, 0x2a9d8f, 0xe76f51]),
    wait: 2000,
    surprise(layer) {
      // two eyes blink in the dark... then a friendly fuzzy monster pops up
      const eyes = new Graphics();
      const ex = cl2.x + cl2.w / 2, ey = cl2.y + cl2.h * 0.68;
      eyes.circle(ex - 12, ey, 7).circle(ex + 12, ey, 7).fill(0xfff3b0);
      eyes.circle(ex - 12, ey, 3).circle(ex + 12, ey, 3).fill(INK);
      layer.addChild(eyes);
      tween(700, (t) => (eyes.scale.y = Math.abs(Math.cos(t * Math.PI * 2)) * 0.9 + 0.1));
      eyes.pivot.set(0, ey);
      eyes.y = ey;
      later(800, () => {
        if (eyes.destroyed) return;
        eyes.visible = false;
        const m = new Graphics();
        const r = cl2.w * 0.3;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          m.circle(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.32).fill(0x9b5de5);
        }
        m.circle(0, 0, r).fill(0x9b5de5).stroke({ width: 3, color: INK });
        m.circle(-r * 0.35, -r * 0.2, r * 0.22).circle(r * 0.35, -r * 0.2, r * 0.22).fill(0xffffff).stroke({ width: 2, color: INK });
        m.circle(-r * 0.35, -r * 0.15, r * 0.1).circle(r * 0.35, -r * 0.15, r * 0.1).fill(INK);
        m.moveTo(-r * 0.4, r * 0.3).quadraticCurveTo(0, r * 0.65, r * 0.4, r * 0.3).stroke({ width: 4, color: INK });
        const bottom = cl2.y + cl2.h + r, top = cl2.y + cl2.h - r * 1.1;
        m.position.set(ex, bottom);
        layer.addChild(m);
        sfx.giggle(0.8);
        tween(400, (t) => !m.destroyed && (m.y = bottom + (top - bottom) * ease.outBack(t)), () => {
          tween(1200, (t) => !m.destroyed && (m.rotation = Math.sin(t * Math.PI * 6) * 0.12));
        });
      }, cleanups);
    },
  });
}

// ---------------------------------------------------------------------------
// Second bedroom
// ---------------------------------------------------------------------------
export function bedroomBWide(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;

  // --- the double closet (a wardrobe): a cat was hiding in there! ---
  const cl = { x: -0.36 * w, y: h * 0.08, w: 0.32 * w, h: fy - h * 0.08 };
  wardrobeCloset(kit, cleanups, {
    ...cl,
    hinge: 'both',
    inside: closet([0xff8fb1, 0xc3b1ff, 0x7fdde0, 0xffd166, 0xb07de8]),
    wait: 1400,
    surprise(layer) {
      const cat = new Container();
      const g = new Graphics();
      g.poly([-22, -14, -16, -40, -4, -22]).poly([22, -14, 16, -40, 4, -22]).fill(0xf4a261).stroke({ width: 3, color: INK });
      g.circle(0, 0, 26).fill(0xf4a261).stroke({ width: 3, color: INK });
      g.moveTo(-14, -18).lineTo(-12, -8).moveTo(0, -22).lineTo(0, -12).moveTo(14, -18).lineTo(12, -8).stroke({ width: 3, color: 0xd9822b });
      g.circle(-9, -2, 4).circle(9, -2, 4).fill(INK);
      g.poly([-4, 6, 4, 6, 0, 11]).fill(0xff8fa3);
      g.moveTo(-6, 14).lineTo(-26, 10).moveTo(-6, 16).lineTo(-26, 20).moveTo(6, 14).lineTo(26, 10).moveTo(6, 16).lineTo(26, 20).stroke({ width: 1.5, color: INK });
      cat.addChild(g);
      const x = cl.x + cl.w * rand(0.3, 0.7), top = cl.y + cl.h - 70, bottom = cl.y + cl.h + 60;
      cat.scale.set(1.5);
      cat.position.set(x, bottom);
      layer.addChild(cat);
      tween(400, (t) => (cat.y = bottom + (top - bottom) * ease.outBack(t)), () => {
        sfx.meow();
        tween(1200, (t) => !cat.destroyed && (cat.rotation = Math.sin(t * Math.PI * 3) * 0.15));
      });
    },
  });

  // --- the dream catcher and a pennant that flutters ---
  dreamCatcher(kit, -0.53 * w, h * 0.27, Math.min(0.03 * w, h * 0.045), [0xff8fb1, 0x7fdde0, 0xffffff, 0xb07de8]);
  const pen = new Container();
  pen.position.set(-0.48 * w, h * 0.16);
  const pg = new Graphics();
  const pl = 0.065 * w, ph = h * 0.11;
  pg.poly([0, 0, pl, ph * 0.5, 0, ph]).fill(0xffffff).stroke({ width: 3, color: INK });
  pg.poly([0, 0, pl * 0.3, ph * 0.15, pl * 0.3, ph * 0.85, 0, ph]).fill(0xe5383b);
  pg.star(pl * 0.5, ph * 0.5, 5, ph * 0.13, ph * 0.07).fill(0xe5383b);
  pg.rect(-4, -6, 6, ph + 12).fill(0x8d5a3b);
  pen.addChild(pg);
  kit.under.addChild(pen);
  tappable(pen, oneAtATime((done) => {
    sfx.flutter();
    tween(1200, (t) => (pg.skew.y = Math.sin(t * Math.PI * 8) * 0.18 * (1 - t)), done);
  }), new Rectangle(-10, -10, pl + 20, ph + 20));

  // --- the white dresser: every drawer hides something ---
  const dx = 1.03 * w, dy = h * 0.5, dw = 0.26 * w;
  const rows = 3, dh = (fy - dy - 10) / rows;
  const things = [bow, beads, gem, sock, starPop];
  let next = Math.floor(rand(0, things.length));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const x0 = dx + 6 + (c * (dw - 12)) / 2, y0 = dy + 8 + r * dh, ww = (dw - 12) / 2 - 4, hh = dh - 6;
      const front = new Graphics();
      let open = 0;
      const draw = () => {
        const drop = hh * 0.35 * open;
        front.clear();
        if (open > 0) front.rect(x0 + 3, y0, ww - 6, drop).fill(0x6d6875);
        front.rect(x0, y0 + drop, ww, hh).fill(0xffffff).stroke({ width: 2, color: INK });
        front.circle(x0 + ww / 2, y0 + drop + hh / 2, 5).fill(0xadb5bd).stroke({ width: 1.5, color: INK });
      };
      draw();
      kit.under.addChild(front);
      tappable(front, oneAtATime((done) => {
        sfx.drawer();
        tween(200, (t) => ((open = t), draw()), () => {
          things[next](x0 + ww / 2, y0);
          next = (next + 1) % things.length;
          later(500, () => tween(220, (t) => ((open = 1 - t), draw()), done), cleanups);
        });
      }), new Rectangle(x0, y0, ww, hh));
    }
  }
  function popOut(piece: Graphics, x: number, y: number) {
    tumble(kit, piece, x, y, fy + h * 0.08, { vy: -0.7, vx: rand(-0.2, 0.2) });
  }
  function bow(x: number, y: number) {
    sfx.pop(1.4);
    const g = new Graphics().poly([0, 0, -18, -12, -18, 12]).poly([0, 0, 18, -12, 18, 12]).fill(0xff8fb1).stroke({ width: 2, color: INK });
    g.circle(0, 0, 5).fill(0xff4d6d).stroke({ width: 2, color: INK });
    popOut(g, x, y);
  }
  function beads(x: number, y: number) {
    sfx.twinkle();
    const cols = [0xff8fb1, 0x7fdde0, 0xffd166, 0xb07de8, 0x7bd36b];
    for (let i = 0; i < 8; i++) popOut(new Graphics().circle(0, 0, 6).fill(cols[i % cols.length]).stroke({ width: 1.5, color: INK }), x, y);
  }
  function gem(x: number, y: number) {
    sfx.ding();
    const g = new Graphics().poly([-12, -6, -6, -14, 6, -14, 12, -6, 0, 12]).fill(0x9fd8e8).stroke({ width: 2, color: INK });
    g.moveTo(-12, -6).lineTo(12, -6).stroke({ width: 1.5, color: INK });
    popOut(g, x, y);
    later(600, () => burst(kit.sparkles, x, y - 30, 6, 40), cleanups);
  }
  function sock(x: number, y: number) {
    sfx.pop(1.2);
    const g = new Graphics().roundRect(-8, -24, 16, 32, 6).roundRect(-8, 2, 28, 14, 7).fill(0xc3b1ff).stroke({ width: 2, color: INK });
    g.rect(-8, -24, 16, 6).fill(0xffffff);
    popOut(g, x, y);
  }
  function starPop(x: number, y: number) {
    sfx.pling();
    popOut(new Graphics().star(0, 0, 5, 14, 7).fill(0xffd166).stroke({ width: 2, color: INK }), x, y);
  }

  // --- the oval mirror shimmers ---
  shimmerMirror(kit, 1.075 * w, h * 0.17, 0.17 * w, h * 0.24, true);

  // --- the basket: a bunny pops up ---
  const bx = 1.32 * w, bw = 0.08 * w, by = h * 0.6;
  const bunny = new Graphics();
  bunny.ellipse(-9, -34, 7, 20).ellipse(9, -34, 7, 20).fill(0xffffff).stroke({ width: 2, color: INK });
  bunny.ellipse(-9, -34, 3, 13).ellipse(9, -34, 3, 13).fill(0xffb3c6);
  bunny.circle(0, 0, 20).fill(0xffffff).stroke({ width: 2, color: INK });
  bunny.circle(-7, -3, 3).circle(7, -3, 3).fill(INK);
  bunny.circle(0, 5, 3).fill(0xff8fa3);
  bunny.position.set(bx + bw / 2, by + 30);
  kit.under.addChild(bunny);
  const basketFront = new Graphics();
  basketFront.poly([bx, by, bx + bw, by, bx + bw * 0.9, fy + 8, bx + bw * 0.1, fy + 8]).fill(0xd4b483).stroke({ width: 3, color: INK });
  for (let i = 1; i < 6; i++) basketFront.moveTo(bx + bw * 0.04 * i, by + ((fy + 8 - by) * i) / 6).lineTo(bx + bw - bw * 0.04 * i, by + ((fy + 8 - by) * i) / 6);
  basketFront.stroke({ width: 2, color: 0xa47e4b });
  kit.under.addChild(basketFront);
  tappable(basketFront, oneAtATime((done) => {
    tween(320, (t) => (bunny.y = by + 30 - 50 * ease.outBack(t)), () => {
      sfx.squeak(1.8);
      tween(900, (t) => (bunny.rotation = Math.sin(t * Math.PI * 4) * 0.2), () => {
        tween(260, (t) => (bunny.y = by - 20 + 50 * t), done);
      });
    });
  }), new Rectangle(bx - 8, by - 30, bw + 16, fy - by + 40));

  // --- the bedroom door (a puppy says hello) ---
  const door = { x: 1.44 * w, y: h * 0.1, w: 0.18 * w, h: fy - h * 0.1 };
  swingDoor(kit, { ...door, hinge: 'right', towel: true, inside: hallway, onOpen: puppyVisit(door) });

  // --- the spotty dressing gown on its hook: swish... rawr! ---
  const gown = new Container();
  gown.position.set(1.655 * w, h * 0.36);
  const gg = new Graphics();
  const gw = 0.045 * w, gh = h * 0.3;
  gg.circle(0, 0, 5).fill(0x8d99ae).stroke({ width: 2, color: INK });
  gg.poly([-gw * 0.3, 4, gw * 0.3, 4, gw * 0.6, gh, -gw * 0.6, gh]).fill(0xfff1d6).stroke({ width: 3, color: INK });
  const spots: [number, number][] = [[-0.25, 0.25], [0.15, 0.35], [-0.1, 0.55], [0.3, 0.7], [-0.35, 0.8], [0.05, 0.85], [0.2, 0.15]];
  for (const [sx, sy] of spots) gg.circle(gw * sx, gh * sy, 4).fill(0x8d5a3b);
  gg.moveTo(-gw * 0.5, gh * 0.5).lineTo(gw * 0.5, gh * 0.48).stroke({ width: 3, color: 0xe9c79f });
  gown.addChild(gg);
  kit.under.addChild(gown);
  tappable(gown, oneAtATime((done) => {
    sfx.whoosh();
    later(300, () => sfx.rawr(), cleanups);
    void swingIt(gown, 1500, 0.3).then(done);
  }), new Rectangle(-gw * 0.7, -10, gw * 1.4, gh + 10));

  // --- the world map: fly round the world ---
  mapPlane(kit, 1.7 * w, h * 0.14, 0.14 * w, h * 0.36);
}

// ---------------------------------------------------------------------------
// Kitchen
// ---------------------------------------------------------------------------
export function kitchenWide(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;

  // --- the back door: open it and a bird flies in (or snow blows in) ---
  const bd = { x: -0.82 * w, y: h * 0.12, w: 0.16 * w, h: fy - h * 0.12 };
  const backDoor = swingDoor(kit, {
    ...bd,
    hinge: 'right',
    window: true,
    inside(g, x, y, ww, hh) {
      windowView(g, x, y, ww, hh * 0.7);
      g.rect(x, y + hh * 0.55, ww, hh * 0.45).fill(PALETTE[kit.season].grass);
      for (let fx = x + 6; fx < x + ww; fx += 16) g.rect(fx, y + hh * 0.45, 10, hh * 0.14).fill(0xc68b59);
      g.rect(x, y + hh * 0.5, ww, 5).fill(0xa47e4b);
    },
    onOpen() {
      if (kit.season === 'winter') {
        sfx.brrr();
        for (let i = 0; i < 18; i++) {
          later(i * 70, () => {
            const s = new Graphics().circle(0, 0, rand(3, 5)).fill(0xffffff).stroke({ width: 1, color: 0xc9d6e3 });
            const sx = bd.x + bd.w * 0.5, sy = bd.y + rand(0.1, 0.8) * bd.h;
            s.position.set(sx, sy);
            kit.over.addChild(s);
            const vx = rand(0.15, 0.35);
            tween(2000, (t) => {
              s.x = sx + vx * t * 2000;
              s.y = sy + Math.sin(t * 8 + i) * 20 + t * 60;
              s.alpha = 1 - t;
            }, () => s.destroy());
          }, cleanups);
        }
        return;
      }
      const bird = new Graphics();
      bird.ellipse(0, 0, 14, 10).fill(0x4ea8ff).stroke({ width: 2.5, color: INK });
      bird.circle(10, -8, 7).fill(0x4ea8ff).stroke({ width: 2.5, color: INK });
      bird.circle(12, -9, 2).fill(INK);
      bird.poly([16, -8, 23, -6, 16, -4]).fill(0xffa94d);
      const wing = new Graphics().ellipse(-2, -4, 10, 5).fill(0x8fd3ff).stroke({ width: 2, color: INK });
      const b = new Container();
      b.addChild(bird, wing);
      kit.over.addChild(b);
      const p0 = { x: bd.x + bd.w / 2, y: bd.y + bd.h * 0.35 };
      sfx.chirp();
      tween(3400, (t) => {
        const a = t * Math.PI * 2;
        b.x = p0.x + Math.sin(a * 0.5) * w * 0.45;
        b.y = p0.y - Math.sin(a) * h * 0.12;
        b.scale.x = Math.cos(a * 0.5) >= 0 ? 1 : -1;
        wing.scale.y = Math.sin(t * 80) > 0 ? 1 : -0.6;
        if (Math.abs(t - 0.5) < 0.01) sfx.chirp();
      }, () => {
        b.destroy();
        later(300, () => backDoor.close(), cleanups);
      });
    },
  });

  // --- boots on the mat: stomp, stomp ---
  const boots: Graphics[] = [];
  for (const [i, bx] of [-0.8 * w, -0.75 * w].entries()) {
    const g = new Graphics();
    g.roundRect(0, -36, 22, 36, 5).fill(0xc68b59).stroke({ width: 2.5, color: INK });
    g.roundRect(0, -10, 38, 14, 6).fill(0xb5835a).stroke({ width: 2.5, color: INK });
    g.rect(0, 0, 38, 5).fill(0x3a3a3a);
    g.moveTo(5, -30).lineTo(17, -30).moveTo(5, -22).lineTo(17, -22).stroke({ width: 2, color: 0xffd166 });
    g.position.set(bx, fy + h * 0.07 + i * 6);
    g.scale.set(1.5);
    kit.under.addChild(g);
    boots.push(g);
  }
  hotspot(kit, new Rectangle(-0.81 * w, fy + h * 0.07 - 70, 0.12 * w, 90), oneAtATime((done) => {
    let n = 0;
    const stomp = () => {
      if (n >= 4) return done();
      const boot = boots[n % 2];
      const y0 = boot.y;
      n++;
      tween(260, (t) => (boot.y = y0 - Math.sin(t * Math.PI) * 26), () => {
        sfx.drop(0.7);
        later(60, stomp, cleanups);
      });
    };
    stomp();
  }));

  // --- coats on the hooks: they swing, and a woolly hat drops off ---
  const coats = new Container();
  coats.position.set(-0.555 * w, h * 0.19);
  const cg = new Graphics();
  cg.poly([-0.04 * w, 0, -0.005 * w, 0, 0, h * 0.36, -0.045 * w, h * 0.36]).fill(0x1d3557).stroke({ width: 2, color: INK });
  cg.poly([0.0, 0, 0.035 * w, 0, 0.042 * w, h * 0.32, -0.004 * w, h * 0.32]).fill(0x1f1f1f).stroke({ width: 2, color: INK });
  cg.roundRect(-0.012 * w, h * 0.24, 0.05 * w, h * 0.12, 6).fill(0x52b788).stroke({ width: 2, color: INK }); // shopping bag
  coats.addChild(cg);
  const hat = new Graphics();
  const drawHat = (g: Graphics) => g.moveTo(-16, 0).arc(0, 0, 16, Math.PI, 0).lineTo(-16, 0).fill(0xe5383b).stroke({ width: 2, color: INK }).circle(0, -18, 6).fill(0xffffff).stroke({ width: 2, color: INK }).rect(-17, -2, 34, 7).fill(0xffffff);
  drawHat(hat);
  hat.position.set(0.015 * w, -2);
  coats.addChild(hat);
  kit.under.addChild(coats);
  tappable(coats, oneAtATime((done) => {
    sfx.whoosh();
    void swingIt(coats, 1300, 0.12);
    if (hat.visible) {
      hat.visible = false;
      const falling = new Graphics();
      drawHat(falling);
      tumble(kit, falling, coats.x + hat.x, coats.y + hat.y, fy + h * 0.05, { vx: rand(-0.08, 0.08) });
      later(400, () => sfx.pop(0.9), cleanups);
      later(2600, () => !hat.destroyed && (hat.visible = true), cleanups);
    }
    later(1300, done, cleanups);
  }), new Rectangle(-0.05 * w, -30, 0.1 * w, h * 0.4));

  // --- the dining window: blinds go up ---
  raisableBlinds(kit, -0.48 * w, h * 0.16, 0.2 * w, h * 0.26, 0xffffff, 'slats');

  // --- the dining table: dinner's served! (tap again to eat it up) ---
  const tx = -0.2 * w, ty = h * 0.57;
  const meal = new Graphics();
  meal.position.set(tx, ty);
  kit.under.addChild(meal);
  const steam = new Graphics();
  steam.eventMode = 'none';
  kit.under.addChild(steam);
  const meals = [pancakes, spaghetti, cake, fruit];
  let which = -1;
  let bites = 0;
  let hot = false;
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    steam.clear();
    if (!hot || which < 0) return;
    for (let i = 0; i < 3; i++) {
      const sx = tx - 14 + i * 14, k = ((time * 0.0012 + i * 0.33) % 1);
      steam.moveTo(sx + Math.sin(k * 8) * 4, ty - 30 - k * 40).lineTo(sx + Math.sin(k * 8 + 1) * 4, ty - 40 - k * 40);
      steam.stroke({ width: 3, color: 0xffffff, alpha: 1 - k });
    }
  }, cleanups);
  hotspot(kit, new Rectangle(tx - 0.1 * w, ty - 70, 0.2 * w, 90), () => {
    if (which < 0 || bites >= 3) {
      which = (which + 1) % meals.length;
      bites = 0;
      sfx.ding();
      meal.clear();
      meals[which]();
      meal.scale.set(1);
      tween(300, (t) => meal.scale.set(ease.outBack(t)));
      burst(kit.sparkles, tx, ty - 20, 8, 50);
      return;
    }
    // nom!
    bites++;
    sfx.pop(0.8 + bites * 0.2);
    for (let i = 0; i < 4; i++) tumble(kit, new Graphics().circle(0, 0, 3).fill(0xf4d35e), tx + rand(-20, 20), ty - 10, ty + 4, { vy: -0.3 });
    meal.scale.set(1 - bites * 0.3);
    if (bites >= 3) {
      sfx.giggle(1.3);
      meal.clear();
      hot = false;
    }
  });
  function plate() {
    meal.ellipse(0, -4, 34, 9).fill(0xffffff).stroke({ width: 2, color: INK });
  }
  function pancakes() {
    plate();
    for (let i = 0; i < 4; i++) meal.ellipse(0, -10 - i * 7, 26, 7).fill(0xe0a458).stroke({ width: 2, color: INK });
    meal.rect(-7, -40, 14, 8).fill(0xfff3b0).stroke({ width: 1.5, color: INK });
    meal.moveTo(-18, -36).quadraticCurveTo(0, -30, 20, -16).stroke({ width: 4, color: 0x9c4f1e });
    hot = true;
  }
  function spaghetti() {
    plate();
    meal.ellipse(0, -12, 26, 12).fill(0xf6d365).stroke({ width: 2, color: INK });
    for (let i = 0; i < 5; i++) meal.moveTo(-20 + i * 9, -10).quadraticCurveTo(-14 + i * 9, -22, -8 + i * 9, -10);
    meal.stroke({ width: 2, color: 0xd4a017 });
    meal.circle(-6, -18, 6).circle(8, -14, 6).circle(0, -8, 5).fill(0x9c2f2f).stroke({ width: 1.5, color: INK });
    meal.ellipse(0, -16, 14, 5).fill({ color: 0xe5383b, alpha: 0.6 });
    hot = true;
  }
  function cake() {
    plate();
    meal.rect(-24, -36, 48, 30).fill(0xffb3c6).stroke({ width: 2, color: INK });
    meal.rect(-24, -36, 48, 8).fill(0xffffff);
    for (const cx of [-12, 0, 12]) {
      meal.rect(cx - 2, -50, 4, 14).fill(0x4ea8ff);
      meal.ellipse(cx, -54, 3, 5).fill(0xffd166);
    }
    sfx.tune([523, 523, 587, 523, 698, 659], 0.22);
    hot = false;
  }
  function fruit() {
    meal.moveTo(-30, -14).arc(0, -14, 30, Math.PI, 0).lineTo(-30, -14).fill(0xfbfbfb).stroke({ width: 2, color: INK });
    meal.circle(-14, -18, 10).fill(0xe5383b).circle(2, -22, 10).fill(0x7bd36b).circle(16, -16, 9).fill(0xffa94d).stroke({ width: 1.5, color: INK });
    meal.moveTo(-8, -28).quadraticCurveTo(6, -44, 20, -30).stroke({ width: 8, color: 0xffe066, cap: 'round' });
    hot = false;
  }

  // --- the bin: the lid pops up and a fish bone jumps out ---
  const bx = -0.075 * w, bw = Math.max(36, 0.045 * w), by = h * 0.58;
  const bin = new Graphics();
  bin.roundRect(bx, by, bw, fy + 6 - by, 8).fill(0xb8bec5).stroke({ width: 3, color: INK });
  bin.rect(bx + bw * 0.3, by + 10, bw * 0.4, 4).fill(0x8d99ae);
  bin.rect(bx + bw * 0.25, fy - 4, bw * 0.5, 8).fill(0x495057);
  kit.under.addChild(bin);
  const lid = new Graphics();
  lid.moveTo(0, 0).arc(bw / 2, 0, bw / 2, Math.PI, 0).lineTo(0, 0).fill(0xc9cdd2).stroke({ width: 3, color: INK });
  lid.position.set(bx, by);
  kit.under.addChild(lid);
  hotspot(kit, new Rectangle(bx - 8, by - 24, bw + 16, fy - by + 30), oneAtATime((done) => {
    sfx.clank();
    tween(200, (t) => (lid.rotation = -1.2 * t), () => {
      const bone = new Graphics();
      bone.moveTo(-18, 0).lineTo(14, 0).stroke({ width: 3, color: 0xffffff });
      for (let i = -12; i <= 8; i += 6) bone.moveTo(i, -8).lineTo(i, 8).stroke({ width: 2.5, color: 0xffffff });
      bone.circle(18, 0, 6).fill(0xffffff).stroke({ width: 2, color: INK });
      bone.poly([-18, 0, -28, -9, -28, 9]).fill(0xffffff).stroke({ width: 2, color: INK });
      const x0 = bx + bw / 2;
      bone.position.set(x0, by);
      kit.under.addChildAt(bone, kit.under.getChildIndex(bin));
      sfx.boing(1.4);
      tween(800, (t) => {
        bone.y = by - Math.sin(t * Math.PI) * h * 0.14;
        bone.rotation = t * Math.PI * 2;
      }, () => {
        bone.destroy();
        tween(200, (t) => (lid.rotation = -1.2 * (1 - t)), () => {
          sfx.clank();
          done();
        });
      });
    });
  }));

  // --- right: the laundry door, with the washing machine going round ---
  const ld = { x: 1.04 * w, y: h * 0.1, w: 0.18 * w, h: fy - h * 0.1 };
  swingDoor(kit, {
    ...ld,
    hinge: 'right',
    inside(g, x, y, ww, hh) {
      g.rect(x, y, ww, hh).fill(0xdfe7ef);
      g.rect(x, y + hh * 0.85, ww, hh * 0.15).fill(0xb8c4d0);
      g.rect(x + 6, y + hh * 0.2, ww - 12, 10).fill(0xffffff).stroke({ width: 2, color: INK }); // shelf
      g.roundRect(x + ww * 0.15, y + hh * 0.08, ww * 0.25, hh * 0.12, 4).fill(0x4ea8ff).stroke({ width: 2, color: INK }); // soap
      g.roundRect(x + ww * 0.12, y + hh * 0.42, ww * 0.76, hh * 0.5, 8).fill(0xfbfbfb).stroke({ width: 3, color: INK });
      g.rect(x + ww * 0.12, y + hh * 0.42, ww * 0.76, hh * 0.08).fill(0xe9ecef).stroke({ width: 2, color: INK });
      g.circle(x + ww * 0.75, y + hh * 0.46, 4).fill(0x7bd36b);
    },
    onOpen(layer) {
      const cx = ld.x + ld.w / 2, cy = ld.y + ld.h * 0.72, r = Math.min(ld.w * 0.28, ld.h * 0.15);
      const drum = new Container();
      drum.position.set(cx, cy);
      const rim = new Graphics().circle(cx, cy, r + 6).fill(0xadb5bd).stroke({ width: 3, color: INK });
      const g = new Graphics();
      g.circle(0, 0, r).fill(0x9fd8e8);
      const cols = [0xe5383b, 0xffd166, 0x52b788, 0xb07de8];
      cols.forEach((c, i) => {
        const a = (i / cols.length) * Math.PI * 2;
        g.roundRect(Math.cos(a) * r * 0.5 - 10, Math.sin(a) * r * 0.5 - 7, 20, 14, 5).fill(c);
      });
      drum.addChild(g);
      const glass = new Graphics().circle(cx, cy, r).stroke({ width: 4, color: 0xffffff, alpha: 0.7 });
      layer.addChild(rim, drum, glass);
      sfx.whirr();
      tween(2600, (t) => !drum.destroyed && (drum.rotation = t * t * 30));
      for (let i = 0; i < 8; i++) {
        later(300 + i * 220, () => {
          if (drum.destroyed) return;
          if (i % 3 === 0) sfx.blub();
          const bub = new Graphics().circle(0, 0, rand(5, 11)).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 2, color: 0x9fd8e8 });
          const sx = cx + rand(-r, r), sy = cy - r;
          bub.position.set(sx, sy);
          kit.over.addChild(bub);
          const vx = rand(-0.05, 0.08);
          tween(2000, (t) => {
            bub.x = sx + vx * t * 2000 + Math.sin(t * 9) * 8;
            bub.y = sy - t * h * 0.35;
            bub.alpha = 1 - t * t;
          }, () => {
            burst(kit.sparkles, bub.x, bub.y, 4, 20);
            bub.destroy();
          });
        }, cleanups);
      }
    },
  });

  // --- the stairs: a paper plane glides down from upstairs ---
  const sx = 1.28 * w, sw = 0.27 * w, top = h * 0.16;
  hotspot(kit, new Rectangle(sx, top - 20, sw, fy - top + 20), oneAtATime((done) => {
    sfx.whoosh();
    const plane = new Graphics();
    plane.poly([22, 0, -16, -12, -8, 0]).fill(0xffffff).stroke({ width: 2, color: INK });
    plane.poly([22, 0, -8, 0, -16, 10]).fill(0xdee2e6).stroke({ width: 2, color: INK });
    kit.over.addChild(plane);
    const p0 = { x: sx + sw, y: top - 30 }, p3 = { x: sx - 0.25 * w, y: fy + h * 0.08 };
    const at = (t: number) => ({
      x: p0.x + (p3.x - p0.x) * t,
      y: p0.y + (p3.y - p0.y) * t + Math.sin(t * Math.PI * 3) * h * 0.06,
    });
    plane.scale.x = -1; // flying to the left
    tween(2600, (t) => {
      const a = at(t), b = at(Math.min(1, t + 0.01));
      plane.position.set(a.x, a.y);
      plane.rotation = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI;
      plane.alpha = t > 0.85 ? (1 - t) / 0.15 : 1;
    }, () => {
      plane.destroy();
      sfx.pling();
      done();
    });
  }));
}

// ---------------------------------------------------------------------------
// Lounge
// ---------------------------------------------------------------------------
export function loungeWide(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.72;
  const landY = h * 0.42;

  // --- upstairs: the bathroom door (a rubber duck!) ---
  const bath = { x: -0.56 * w, y: h * 0.12, w: 0.1 * w, h: landY - h * 0.12 };
  swingDoor(kit, {
    ...bath,
    hinge: 'left',
    inside(g, x, y, ww, hh) {
      g.rect(x, y, ww, hh).fill(0xe0f2fe);
      for (let ty = y + 12; ty < y + hh; ty += 16) g.moveTo(x, ty).lineTo(x + ww, ty);
      g.stroke({ width: 1, color: 0xbae6fd });
      g.roundRect(x - 4, y + hh * 0.62, ww + 8, hh * 0.38, 10).fill(0xffffff).stroke({ width: 3, color: INK }); // bath
      g.rect(x + 2, y + hh * 0.62, ww - 4, 8).fill(0x7dd3fc);
    },
    onOpen(layer) {
      const duck = new Graphics();
      duck.ellipse(0, 0, 16, 11).fill(0xffd60a).stroke({ width: 2, color: INK });
      duck.circle(10, -12, 8).fill(0xffd60a).stroke({ width: 2, color: INK });
      duck.circle(12, -14, 2).fill(INK);
      duck.poly([17, -12, 25, -10, 17, -8]).fill(0xff8c00);
      const x = bath.x + bath.w * 0.4, y = bath.y + bath.h * 0.6;
      duck.position.set(x, y);
      layer.addChild(duck);
      sfx.quack();
      tween(1600, (t) => {
        if (duck.destroyed) return;
        duck.y = y + Math.sin(t * Math.PI * 6) * 4;
        duck.rotation = Math.sin(t * Math.PI * 6) * 0.15;
      });
    },
  });

  // --- upstairs: a bedroom door left open: tap the light on and off ---
  const bed = { x: -0.4 * w, y: h * 0.12, w: 0.1 * w, h: landY - h * 0.12 };
  const room = new Graphics();
  let lit = false;
  const drawRoom = () => {
    room.clear().rect(bed.x, bed.y, bed.w, bed.h).fill(lit ? 0xfff1c1 : 0x2b2d42);
    room.rect(bed.x + bed.w * 0.2, bed.y + bed.h * 0.62, bed.w * 0.8, bed.h * 0.25).fill(lit ? 0xc3b1ff : 0x3d405b); // a bed
    room.rect(bed.x + bed.w * 0.2, bed.y + bed.h * 0.56, bed.w * 0.25, bed.h * 0.1).fill(lit ? 0xffffff : 0x4a4e69);
    room.rect(bed.x, bed.y, bed.w * 0.16, bed.h).fill(0xd5d9de).stroke({ width: 2, color: INK }); // the open door
  };
  drawRoom();
  kit.under.addChild(room);
  tappable(room, () => {
    lit = !lit;
    sfx.click();
    drawRoom();
    if (!lit) {
      for (let i = 0; i < 3; i++) {
        later(200 + i * 350, () => {
          const z = new Graphics();
          const s = 8 + i * 3;
          z.moveTo(-s, -s).lineTo(s, -s).lineTo(-s, s).lineTo(s, s).stroke({ width: 3, color: 0xffffff });
          const sx = bed.x + bed.w * 0.6, sy = bed.y + bed.h * 0.5;
          z.position.set(sx, sy);
          kit.over.addChild(z);
          tween(1500, (t) => {
            z.x = sx + t * 40 + Math.sin(t * 6) * 8;
            z.y = sy - t * 70;
            z.alpha = 1 - t;
          }, () => z.destroy());
        }, cleanups);
      }
    }
  }, new Rectangle(bed.x, bed.y, bed.w, bed.h));

  // --- the stairs: a slinky walks down them ---
  const steps = 5, sx0 = -0.16 * w, sx1 = -0.02 * w, stepW = (sx1 - sx0) / steps, stepH = (fy - landY) / steps;
  hotspot(kit, new Rectangle(sx0 - 10, landY - 30, sx1 - sx0 + 20, fy - landY + 30), oneAtATime((done) => {
    const cols = [0xe5383b, 0xff9f1c, 0xffd60a, 0x52b788, 0x4ea8ff, 0x9b5de5];
    const slinky = new Graphics();
    cols.forEach((c, i) => slinky.ellipse(0, -i * 4, 14, 5).stroke({ width: 4, color: c }));
    kit.over.addChild(slinky);
    let i = 0;
    const hop = () => {
      if (i > steps) {
        tween(500, (t) => (slinky.alpha = 1 - t), () => {
          slinky.destroy();
          done();
        });
        return;
      }
      const ax = sx0 + (i - 0.5) * stepW + stepW / 2, ay = landY + Math.max(0, i - 1) * stepH - 2;
      const bx = ax + stepW, by = landY + i * stepH - 2;
      i++;
      sfx.spring(1.4 + i * 0.06);
      tween(380, (t) => {
        slinky.x = ax + (bx - ax) * t;
        slinky.y = ay + (by - ay) * t - Math.sin(t * Math.PI) * 30;
        slinky.scale.y = 1 + Math.sin(t * Math.PI) * 0.8;
        slinky.rotation = Math.sin(t * Math.PI) * 0.5;
      }, () => later(80, hop, cleanups));
    };
    slinky.position.set(sx0, landY - 2);
    hop();
  }));

  // --- the little mirror shimmers ---
  shimmerMirror(kit, 1.03 * w, h * 0.12, 0.08 * w, h * 0.2, false);

  // --- candles on the little table: light them, blow them out ---
  const tx = 1.02 * w, ty = h * 0.5, tw = 0.12 * w;
  const candles = [
    { x: tx + tw * 0.22, hgt: h * 0.07 },
    { x: tx + tw * 0.5, hgt: h * 0.1 },
    { x: tx + tw * 0.78, hgt: h * 0.05 },
  ];
  const cg = new Graphics();
  for (const c of candles) {
    cg.rect(c.x - 9, ty - 8, 18, 8).fill(0x1f1f1f);
    cg.rect(c.x - 7, ty - 8 - c.hgt, 14, c.hgt).fill(0xfbfbf8).stroke({ width: 2, color: INK });
    cg.moveTo(c.x, ty - 8 - c.hgt).lineTo(c.x, ty - 14 - c.hgt).stroke({ width: 2, color: INK });
  }
  kit.under.addChild(cg);
  const flames = new Graphics();
  flames.eventMode = 'none';
  kit.over.addChild(flames);
  let alight = false;
  let flick = 0;
  everyFrame((dt) => {
    flick += dt;
    flames.clear();
    if (!alight) return;
    candles.forEach((c, i) => {
      const fx = c.x + Math.sin(flick * 0.012 + i) * 1.5, fyy = ty - 22 - c.hgt;
      glow(flames, fx, fyy, 40, 0xffd27a, 0.9);
      flames.ellipse(fx, fyy, 5, 9 + Math.sin(flick * 0.02 + i * 2) * 1.5).fill(0xffb703);
      flames.ellipse(fx, fyy + 2, 2.5, 5).fill(0xfff3b0);
    });
  }, cleanups);
  hotspot(kit, new Rectangle(tx, ty - h * 0.18, tw, h * 0.18), () => {
    alight = !alight;
    if (alight) {
      sfx.pling();
      return;
    }
    sfx.whoosh();
    for (const c of candles) {
      const puff = new Graphics().circle(0, 0, 6).fill({ color: 0xadb5bd, alpha: 0.7 });
      puff.position.set(c.x, ty - 22 - c.hgt);
      kit.over.addChild(puff);
      tween(1000, (t) => {
        puff.y = ty - 22 - c.hgt - t * 40;
        puff.scale.set(1 + t * 1.5);
        puff.alpha = 0.7 * (1 - t);
      }, () => puff.destroy());
    }
  });

  // --- the front door: ding-dong! A parcel. What's inside? Balloons! ---
  const fd = { x: 1.2 * w, y: h * 0.1, w: 0.17 * w, h: fy - h * 0.1 };
  let parcel: Container | null = null;
  const frontDoor = swingDoor(kit, {
    ...fd,
    hinge: 'right',
    window: true,
    inside(g, x, y, ww, hh) {
      windowView(g, x, y, ww, hh * 0.65);
      g.rect(x, y + hh * 0.6, ww, hh * 0.4).fill(PALETTE[kit.season].grass);
      g.poly([x + ww * 0.35, y + hh, x + ww * 0.65, y + hh, x + ww * 0.55, y + hh * 0.6, x + ww * 0.45, y + hh * 0.6]).fill(0xd6ccc2);
    },
    onOpen() {
      if (parcel) return;
      sfx.dingDong();
      const p = new Container();
      const g = new Graphics();
      g.rect(-28, -40, 56, 40).fill(0xc68b59).stroke({ width: 3, color: INK });
      g.rect(-28, -40, 56, 10).fill(0xd4a373).stroke({ width: 2, color: INK });
      g.rect(-5, -40, 10, 40).fill(0xe5383b);
      g.poly([0, -40, -14, -54, -4, -40]).poly([0, -40, 14, -54, 4, -40]).fill(0xe5383b).stroke({ width: 2, color: INK });
      p.addChild(g);
      const x0 = fd.x + fd.w / 2, y = fy + h * 0.07;
      p.position.set(x0, y);
      p.alpha = 0;
      kit.under.addChild(p);
      parcel = p;
      tween(500, (t) => {
        p.alpha = t;
        p.x = x0 - 40 * (1 - t);
      }, () => later(700, () => frontDoor.close(), cleanups));
      tappable(p, () => {
        if (!parcel) return;
        parcel = null;
        sfx.pop();
        later(150, () => sfx.tada(), cleanups);
        const cols = [0xff4d6d, 0x4ea8ff, 0xffd60a, 0x7bd36b, 0xb07de8];
        for (let i = 0; i < 5; i++) {
          const b = new Graphics();
          b.moveTo(0, 22).quadraticCurveTo(6, 40, 0, 60).stroke({ width: 1.5, color: INK });
          b.ellipse(0, 0, 16, 21).fill(cols[i]).stroke({ width: 2, color: INK });
          b.ellipse(-5, -7, 4, 6).fill({ color: 0xffffff, alpha: 0.6 });
          const bx = p.x + rand(-20, 20), by = p.y - 40;
          b.position.set(bx, by);
          kit.over.addChild(b);
          const drift = rand(-80, 80);
          tween(3200 + i * 200, (t) => {
            b.x = bx + drift * t + Math.sin(t * 7 + i) * 12;
            b.y = by - t * (by + 80);
          }, () => b.destroy());
        }
        tween(400, (t) => (p.alpha = 1 - t), () => p.destroy());
      }, new Rectangle(-34, -60, 68, 64));
    },
  });

  // --- fluffy slippers: they waddle about ---
  const slippers = new Container();
  const sg = new Graphics();
  for (const [ox, oy] of [[0, 0], [30, 6]]) {
    sg.roundRect(ox, oy - 14, 34, 16, 8).fill(0xfdf6ec).stroke({ width: 2.5, color: INK });
    for (let i = 0; i < 5; i++) sg.circle(ox + 5 + i * 6, oy - 14, 4).fill(0xfdf6ec);
  }
  slippers.addChild(sg);
  const slx = 1.06 * w, sly = fy + h * 0.1;
  slippers.position.set(slx, sly);
  slippers.scale.set(1.5);
  kit.under.addChild(slippers);
  tappable(slippers, oneAtATime((done) => {
    sfx.squeak(1.6);
    later(500, () => sfx.squeak(1.8), cleanups);
    tween(1400, (t) => {
      slippers.x = slx + Math.sin(t * Math.PI) * 60;
      slippers.y = sly - Math.abs(Math.sin(t * Math.PI * 6)) * 8;
      slippers.rotation = Math.sin(t * Math.PI * 6) * 0.12;
    }, () => {
      slippers.rotation = 0;
      done();
    });
  }), new Rectangle(-10, -26, 80, 40));
}

export const WIDE_EGGS: Partial<Record<string, (kit: EggKit, cleanups: Cleanups) => void>> = {
  'bedroom-a': bedroomAWide,
  'bedroom-b': bedroomBWide,
  kitchen: kitchenWide,
  lounge: loungeWide,
  fire: fireWideEggs,
  police: policeWideEggs,
  school: schoolWideEggs,
  park: parkWideEggs,
};
