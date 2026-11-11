import { Container, Graphics, Rectangle } from 'pixi.js';
import { falls } from '../destinations';
import { burst, hearts } from '../fx';
import type { PlaceId } from '../places';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { ZOO } from '../zoo';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, rand, spray, tappable, tumble, type Cleanups, type EggKit } from './common';

/**
 * Secrets: deeper surprises, found in two or three steps (sometimes in two
 * different places). Each place's set listens to what its everyday surprises
 * say happened (kit.events), and some give a treasure toy (kit.secrets.find).
 *
 *   first bedroom:  lights off -> the map glows -> tap the X -> a golden key
 *   backyard:       dig 3 times -> a locked chest comes up -> drop the key on it -> a crown and a gem
 *                   pull a carrot top 3 times -> a carrot (feed it to the chickens, turtle, bunny...)
 *   police:         drop the golden key on the jail -> the raccoon has a party (and a gold coin)
 *   vet:            open the treat jar, tap again -> a bone (the dog loves it); the bone for the puppy
 *   toy shop:       the jack-in-the-box, 3 times -> a magic wand; a coin or gem in the till -> a toy
 *   second bedroom: tap all 5 butterflies -> a big heart (and a gem)
 *   lounge:         TV on the space channel + lamp on + disco -> a UFO visits (and leaves a gem)
 *   school:         play the xylophone from the left all the way up -> a medal
 *   fair:           3 hook-a-duck prizes -> a gold coin; the Ferris wheel 4 times -> fireworks
 *   Niagara:        make the falls roar -> a pot of gold at the rainbow's end -> a gold coin
 *                   tap the ripples 3 times -> a fish jumps out
 *   ninja gym:      ring the bell 3 times -> a medal
 *   zoo:            a fish for the penguins, a bone for the lion, a carrot for the giraffe,
 *                   a banana for the monkey, fruit for the elephant
 *   park:           a gold coin in the fountain -> a wish (and a gem back)
 */

const COLOURS = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];

const on = (kit: EggKit, name: string, fn: (...a: never[]) => void) => kit.events?.on(name, fn);

/** Paper confetti fluttering down over a stretch. */
function confetti(kit: EggKit, x: number, width: number, y: number, floorY: number, count = 30) {
  for (let i = 0; i < count; i++) {
    const c = new Graphics().rect(-4, -6, 8, 12).fill(COLOURS[i % COLOURS.length]);
    tumble(kit, c, x + rand(0, width), y + rand(-30, 10), floorY, { vx: rand(-0.08, 0.08), vy: rand(-0.15, 0.05), float: true, spin: rand(-10, 10) });
  }
}

/** A firework: a rocket whooshes up and bursts into coloured dots. */
function firework(kit: EggKit, x: number, fromY: number, y: number, colour: number) {
  const rocket = new Graphics().circle(0, 0, 4).fill(0xfff3b0);
  rocket.position.set(x, fromY);
  kit.over.addChild(rocket);
  sfx.whoosh();
  tween(550, (t) => (rocket.y = fromY + (y - fromY) * ease.outCubic(t)), () => {
    rocket.destroy();
    sfx.pop(rand(0.7, 1.1));
    const n = 16, r = rand(60, 95);
    for (let i = 0; i < n; i++) {
      const d = new Graphics().circle(0, 0, 4).fill(i % 4 === 0 ? 0xffffff : colour);
      d.position.set(x, y);
      kit.over.addChild(d);
      const a = (i / n) * Math.PI * 2;
      tween(1000, (t) => {
        const e = ease.outCubic(t);
        d.x = x + Math.cos(a) * r * e;
        d.y = y + Math.sin(a) * r * e + 40 * t * t;
        d.alpha = 1 - t * t;
      }, () => d.destroy());
    }
  });
}

/** A little musical note (for the xylophone). */
function musicNote(colour: number) {
  const g = new Graphics();
  g.ellipse(0, 0, 8, 6).fill(colour).stroke({ width: 2, color: INK });
  g.rect(6, -26, 3, 26).fill(INK);
  g.poly([9, -26, 20, -18, 9, -16]).fill(INK);
  return g;
}

/** A thought bubble over something, showing what it wants (a hint). */
function wantBubble(kit: EggKit, x: number, y: number, draw: (g: Graphics) => void) {
  const b = new Container();
  const g = new Graphics();
  g.circle(-30, 40, 5).circle(-20, 26, 8).fill(0xffffff).stroke({ width: 2, color: INK });
  g.roundRect(-34, -30, 68, 50, 22).fill(0xffffff).stroke({ width: 3, color: INK });
  const pic = new Graphics();
  draw(pic);
  pic.y = -5;
  b.addChild(g, pic);
  b.position.set(x, y);
  b.scale.set(0.01);
  b.eventMode = 'none';
  kit.over.addChild(b);
  tween(1800, (t) => b.scale.set(t < 0.15 ? ease.outBack(t / 0.15) : t > 0.85 ? (1 - t) / 0.15 : 1), () => b.destroy());
}

function miniKey(g: Graphics) {
  g.circle(-12, 0, 9).stroke({ width: 5, color: 0xffb703 });
  g.rect(-3, -3, 26, 6).rect(15, 3, 4, 7).rect(8, 3, 4, 5).fill(0xffb703);
}

// ---------------------------------------------------------------------------
// First bedroom: the treasure map
// ---------------------------------------------------------------------------
function bedroomA(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  // the scratch map on the wall to the left (see wide.ts)
  const mx = -0.17 * w, my = h * 0.18, mw = 0.15 * w, mh = h * 0.22;
  const X = { x: mx + mw * 0.7, y: my + mh * 0.62 };
  const shine = new Graphics();
  shine.eventMode = 'none';
  shine.alpha = 0;
  kit.over.addChild(shine);
  const tapX = new Container();
  tapX.visible = false;
  kit.over.addChild(tapX);
  let dark = false, taken = false, level = 0, time = 0;
  on(kit, 'lights', (lightsOn: boolean) => {
    dark = !lightsOn;
    if (dark) {
      taken = false;
      later(500, () => sfx.twinkle(), cleanups);
    }
  });
  everyFrame((dt) => {
    time += dt;
    const want = dark && !taken ? 1 : 0;
    level += (want - level) * Math.min(1, dt / 250);
    shine.alpha = level;
    tapX.visible = want === 1;
    if (level < 0.01) return;
    // the map glows in the dark, with a dotted trail to a red X
    shine.clear();
    glow(shine, mx + mw / 2, my + mh / 2, mw * 0.55, 0xfff3b0, 1.4);
    const sx = mx + mw * 0.12, sy = my + mh * 0.3;
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      shine.circle(sx + (X.x - sx) * t, sy + (X.y - sy) * t - Math.sin(t * Math.PI) * mh * 0.25, 3).fill(0xffe066);
    }
    const s = 11 + Math.sin(time * 0.006) * 3;
    glow(shine, X.x, X.y, 30, 0xff4d6d, 2);
    shine.moveTo(X.x - s, X.y - s).lineTo(X.x + s, X.y + s).moveTo(X.x + s, X.y - s).lineTo(X.x - s, X.y + s).stroke({ width: 6, color: 0xff4d6d, cap: 'round' });
  }, cleanups);
  tappable(tapX, () => {
    taken = true;
    sfx.twinkle();
    burst(kit.sparkles, X.x, X.y, 14, 80);
    kit.secrets?.find('map-key', 'golden-key', { x: X.x, y: X.y + 30 });
  }, new Rectangle(X.x - 40, X.y - 40, 80, 80));
}

// ---------------------------------------------------------------------------
// Backyard: the buried chest, and the carrot patch
// ---------------------------------------------------------------------------
function backyard(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const winter = kit.season === 'winter';

  // --- dig in the sandbox three times and a treasure chest comes up. Locked! ---
  const sx = w * 0.3, sy = h * 0.64, sw = w * 0.14, sh = h * 0.07;
  const cx = sx + sw * 0.5, cbase = sy + sh * 0.6;
  const cw = Math.min(0.09 * w, h * 0.13), ch = cw * 0.6;
  const chest = new Container();
  const body = new Graphics();
  body.roundRect(-cw / 2, -ch, cw, ch, 6).fill(0x9c6644).stroke({ width: 3, color: INK });
  body.rect(-cw / 2 + 10, -ch, 8, ch).rect(cw / 2 - 18, -ch, 8, ch).fill(0xffd166);
  body.roundRect(-9, -ch * 0.7, 18, 20, 4).fill(0xffd166).stroke({ width: 2, color: INK });
  body.circle(0, -ch * 0.7 + 8, 3).rect(-1.5, -ch * 0.7 + 8, 3, 7).fill(INK); // the keyhole
  const lid = new Graphics();
  lid.moveTo(-cw / 2, 0).lineTo(-cw / 2, -ch * 0.25).quadraticCurveTo(0, -ch * 0.75, cw / 2, -ch * 0.25).lineTo(cw / 2, 0).closePath().fill(0xb07d56).stroke({ width: 3, color: INK });
  lid.rect(-cw / 2 + 10, -ch * 0.5, 8, ch * 0.5).rect(cw / 2 - 18, -ch * 0.5, 8, ch * 0.5).fill(0xffd166);
  lid.y = -ch;
  const light = new Graphics();
  light.eventMode = 'none';
  chest.addChild(light, body, lid);
  chest.position.set(cx, cbase);
  chest.visible = false;
  kit.under.addChild(chest);
  let digs = 0, up = false, open = false;
  on(kit, 'dig', () => {
    if (up || ++digs < 3) return;
    up = true;
    later(1300, () => {
      chest.visible = true;
      chest.scale.set(1, 0.01);
      sfx.brrr();
      for (let i = 0; i < 16; i++) {
        tumble(kit, new Graphics().circle(0, 0, rand(2, 4)).fill(winter ? 0xffffff : 0xe9c46a), cx + rand(-cw / 2, cw / 2), cbase - 6, cbase + 6, { vy: rand(-0.7, -0.3), vx: rand(-0.25, 0.25) });
      }
      tween(700, (t) => chest.scale.set(1, Math.max(0.01, ease.outBack(t))), () => sfx.clank());
    }, cleanups);
  });
  tappable(chest, () => {
    if (open) {
      sfx.twinkle();
      burst(kit.sparkles, cx, cbase - ch, 8, 60);
      return;
    }
    // locked: it rattles, and wishes for a key
    sfx.clank();
    tween(500, (t) => (chest.rotation = Math.sin(t * Math.PI * 6) * 0.08 * (1 - t)));
    wantBubble(kit, cx + cw * 0.5, cbase - ch * 2.6, miniKey);
  }, new Rectangle(-cw / 2 - 10, -ch * 1.8, cw + 20, ch * 1.8 + 10));
  kit.secrets?.lock({
    accepts: ['golden-key'],
    area: () => (up && !open ? { x: cx - cw, y: cbase - ch * 2.2, w: cw * 2, h: ch * 2.6 } : { x: -1e6, y: 0, w: 0, h: 0 }),
    open() {
      open = true;
      sfx.clank();
      later(250, () => sfx.tune([523, 659, 784, 1047, 1319], 0.12), cleanups);
      tween(600, (t) => (lid.scale.y = 1 - 1.7 * ease.outBack(t)));
      tween(800, (t) => light.clear().poly([-cw * 0.4, -ch, cw * 0.4, -ch, cw * 0.9, -ch * 4, -cw * 0.9, -ch * 4]).fill({ color: 0xfff3b0, alpha: 0.5 * t }));
      later(700, () => kit.secrets?.find('chest', 'crown', { x: cx - cw * 0.2, y: cbase - ch * 2.5 }), cleanups);
      later(1300, () => kit.secrets?.find('chest-gem', 'gem', { x: cx + cw * 0.3, y: cbase - ch * 2.5 }), cleanups);
      return true; // the key can open other things too
    },
  });

  // --- the carrot patch: pull a carrot top (it's stuck... pull again... pop!) ---
  const px = 0.04 * w, py = h * 0.71, pw = 0.12 * w;
  const patch = new Graphics();
  patch.ellipse(px + pw / 2, py, pw / 2, h * 0.025).fill(winter ? 0xe9ecef : 0x8d5524).stroke({ width: 3, color: INK });
  for (const f of [0.25, 0.5, 0.75]) patch.moveTo(px + pw * (f - 0.1), py + 2).lineTo(px + pw * (f + 0.1), py + 2);
  patch.stroke({ width: 2, color: winter ? 0xced4da : 0x6b4226 });
  kit.under.addChild(patch);
  [0.25, 0.5, 0.75].forEach((f) => {
    const top = new Container();
    const g = new Graphics();
    g.ellipse(0, 2, 9, 6).fill(0xff8c00).stroke({ width: 2, color: INK });
    for (const a of [-0.5, 0, 0.5]) g.moveTo(0, -2).lineTo(Math.sin(a) * 18, -Math.cos(a) * 26).stroke({ width: 5, color: 0x52b788, cap: 'round' });
    top.addChild(g);
    top.position.set(px + pw * f, py);
    kit.under.addChild(top);
    let pulls = 0, gone = false;
    tappable(top, () => {
      if (gone) return;
      if (++pulls < 3) {
        sfx.squeak(1 + pulls * 0.25);
        top.y = py - pulls * 5;
        tween(400, (t) => (top.rotation = Math.sin(t * Math.PI * 5) * 0.3 * (1 - t)));
        return;
      }
      gone = true;
      pulls = 0;
      sfx.pop(0.8);
      top.visible = false;
      for (let i = 0; i < 8; i++) tumble(kit, new Graphics().circle(0, 0, rand(2, 4)).fill(0x8d5524), top.x, py, py + 6, { vy: rand(-0.6, -0.3), vx: rand(-0.2, 0.2) });
      kit.secrets?.find('carrot', 'carrot', { x: top.x, y: py - 70 });
      // a new one grows back after a while
      later(20000, () => {
        gone = false;
        top.y = py;
        top.visible = true;
        tween(600, (t) => top.scale.set(Math.max(0.05, ease.outBack(t))));
      }, cleanups);
    }, new Rectangle(-28, -44, 56, 58));
  });
}

// ---------------------------------------------------------------------------
// Police station: the golden key opens the jail -> raccoon party
// ---------------------------------------------------------------------------
function police(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.72;
  const x0 = w * 0.66, x1 = w * 0.97, y0 = h * 0.12;
  let partying = false;
  kit.secrets?.lock({
    accepts: ['golden-key'],
    area: () => ({ x: x0, y: y0, w: x1 - x0, h: fy - y0 }),
    open() {
      if (partying) return true;
      partying = true;
      sfx.clank();
      later(300, () => sfx.tune([523, 659, 784, 1047, 784, 1047, 1319], 0.13), cleanups);
      // balloons float up out of the cell
      for (let i = 0; i < 6; i++) {
        const b = new Graphics();
        b.moveTo(0, 18).quadraticCurveTo(6, 34, 0, 50).stroke({ width: 2, color: INK });
        b.ellipse(0, 0, 16, 20).fill(COLOURS[i]).stroke({ width: 2.5, color: INK });
        const bx = x0 + (x1 - x0) * (0.15 + i * 0.14);
        b.position.set(bx, fy);
        kit.over.addChild(b);
        const wait = i * 150;
        tween(3200 + wait, (t) => {
          const k = Math.max(0, (t * (3200 + wait) - wait) / 3200);
          b.y = fy - (fy + 80) * ease.inOutSine(k);
          b.x = bx + Math.sin(k * 8 + i) * 16;
        }, () => b.destroy());
      }
      // party lights
      const lights = new Graphics();
      lights.eventMode = 'none';
      kit.over.addChild(lights);
      tween(3500, (t) => {
        lights.clear();
        COLOURS.forEach((c, i) => {
          const a = t * Math.PI * 6 + i;
          lights.circle((x0 + x1) / 2 + Math.cos(a) * (x1 - x0) * 0.35, (y0 + fy) / 2 + Math.sin(a * 1.3) * (fy - y0) * 0.3, h * 0.07).fill({ color: c, alpha: 0.35 * Math.sin(t * Math.PI) });
        });
      }, () => lights.destroy());
      confetti(kit, x0, x1 - x0, y0, fy + h * 0.1, 36);
      later(1400, () => kit.secrets?.find('jailbreak', 'gold-coin', { x: (x0 + x1) / 2, y: h * 0.35 }), cleanups);
      later(3600, () => (partying = false), cleanups);
      return true;
    },
  });
}

// ---------------------------------------------------------------------------
// Vet: the treat jar
// ---------------------------------------------------------------------------
function vet(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const jx = 0.12 * w, base = h * 0.48, jw = Math.min(0.06 * w, h * 0.09), jh = jw * 1.2;
  const jar = new Container();
  const glass = new Graphics();
  glass.roundRect(jx - jw / 2, base - jh, jw, jh, 10).fill({ color: 0xe3f2fd, alpha: 0.9 }).stroke({ width: 3, color: INK });
  for (const [dx, dy, r] of [[-0.18, 0.25, 0.3], [0.15, 0.5, -0.4], [-0.05, 0.75, 0.1]]) {
    const bx = jx + dx * jw, by = base - dy * jh;
    const c = Math.cos(r), s = Math.sin(r);
    glass.circle(bx - c * 10 - s * 3, by - s * 10 + c * 3, 4).circle(bx - c * 10 + s * 3, by - s * 10 - c * 3, 4);
    glass.circle(bx + c * 10 - s * 3, by + s * 10 + c * 3, 4).circle(bx + c * 10 + s * 3, by + s * 10 - c * 3, 4);
    glass.fill(0xfff8e1).stroke({ width: 1.5, color: INK });
    glass.moveTo(bx - c * 10, by - s * 10).lineTo(bx + c * 10, by + s * 10).stroke({ width: 6, color: 0xfff8e1 });
  }
  glass.roundRect(jx - jw * 0.3, base - jh * 0.95, jw * 0.6, jh * 0.18, 4).fill(0xffffff).stroke({ width: 2, color: INK });
  glass.circle(jx, base - jh * 0.86, 4).fill(0xe5383b); // a paw label
  const lid = new Graphics();
  lid.roundRect(-jw * 0.56, -10, jw * 1.12, 12, 5).fill(0xe5383b).stroke({ width: 2.5, color: INK });
  lid.circle(0, -13, 6).fill(0xe5383b).stroke({ width: 2, color: INK });
  lid.position.set(jx, base - jh + 2);
  jar.addChild(glass, lid);
  kit.under.addChild(jar);
  let open = false;
  const close = () => {
    if (!open) return;
    open = false;
    sfx.click();
    tween(300, (t) => {
      lid.y = base - jh + 2 - 34 * (1 - t);
      lid.rotation = -0.6 * (1 - t);
    });
  };
  tappable(jar, oneAtATime((done) => {
    if (!open) {
      // the lid pops up (and a little sniff of treats)
      open = true;
      sfx.pop(1.2);
      tween(350, (t) => {
        lid.y = base - jh + 2 - 34 * ease.outBack(t);
        lid.rotation = -0.6 * t;
      }, done);
      later(5000, close, cleanups);
      return;
    }
    // and now a bone jumps out!
    sfx.boing(1.2);
    burst(kit.sparkles, jx, base - jh, 8, 50);
    kit.secrets?.find('treats', 'bone', { x: jx + jw, y: base - jh - 40 });
    close();
    later(400, done, cleanups);
  }), new Rectangle(jx - jw, base - jh - 50, jw * 2, jh + 54));

  // the sleepy puppy in its basket would love a bone too
  const fy = h * 0.72;
  kit.secrets?.lock({
    accepts: ['bone'],
    area: () => ({ x: -0.21 * w, y: fy - h * 0.06, w: 0.18 * w, h: h * 0.2 }),
    open() {
      sfx.woof();
      later(500, () => sfx.woof(), cleanups);
      hearts(kit.sparkles, -0.12 * w, fy, 8);
      kit.secrets?.find('fed:puppy');
    },
  });
}

// ---------------------------------------------------------------------------
// Toy shop: the jack-in-the-box's secret, and the till
// ---------------------------------------------------------------------------
function toyshop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const jx = 1.48 * w, jy = h * 0.56;
  let pops = 0;
  on(kit, 'jack', () => {
    if (++pops % 3) return;
    // the third time, something magic jumps out with the clown
    later(350, () => {
      sfx.twinkle();
      burst(kit.sparkles, jx, jy - 110, 16, 90);
      kit.secrets?.find('jack-wand', 'magic-wand', { x: jx + 40, y: jy - 140 });
    }, cleanups);
  });
  // a gold coin or a gem in the till buys a surprise toy
  const tx = 0.5 * w, ty = h * 0.5;
  kit.secrets?.lock({
    accepts: ['gold-coin', 'gem'],
    area: () => ({ x: tx - 55, y: ty - 70, w: 110, h: 80 }),
    open(name) {
      sfx.ding();
      later(150, () => sfx.tune([1047, 1319, 1568], 0.08), cleanups);
      const prizes = name === 'gem' ? ['rocking-horse', 'guitar', 'toy-train', 'robot'] : ['teddy', 'ball', 'kite', 'balloon', 'scooter'];
      const toy = prizes[Math.floor(Math.random() * prizes.length)];
      later(600, () => kit.secrets?.find('shopping', toy, { x: tx, y: ty - 100 }), cleanups);
    },
  });
}

// ---------------------------------------------------------------------------
// Second bedroom: tap all five butterflies
// ---------------------------------------------------------------------------
function bedroomB(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const tapped = new Set<number>();
  let since = 0;
  on(kit, 'butterfly', (i: number) => {
    const now = performance.now();
    if (now - since > 45000) tapped.clear();
    if (!tapped.size) since = now;
    tapped.add(i);
    if (tapped.size < 5) return;
    tapped.clear();
    later(1900, () => bigHeart(kit, w * 0.5, h * 0.38, Math.min(w, h) * 0.2, cleanups), cleanups);
  });
}

/** Little hearts gather into one big heart, then a gem drops out of it. */
function bigHeart(kit: EggKit, x: number, y: number, size: number, cleanups: Cleanups) {
  sfx.flutter();
  later(300, () => sfx.tune([659, 784, 988, 1319], 0.15), cleanups);
  const n = 22;
  const parts: Graphics[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const hx = x + (size / 17) * 16 * Math.pow(Math.sin(t), 3);
    const hy = y - (size / 17) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const p = new Graphics().circle(-5, -2, 6).circle(5, -2, 6).poly([-10.5, 0, 10.5, 0, 0, 12]).fill(COLOURS[i % COLOURS.length]);
    p.position.set(x + rand(-1, 1) * size * 2, y + rand(-1, 1) * size * 2);
    p.alpha = 0;
    kit.over.addChild(p);
    parts.push(p);
    const from = { x: p.x, y: p.y };
    tween(900 + i * 30, (k) => {
      const e = ease.outCubic(k);
      p.x = from.x + (hx - from.x) * e;
      p.y = from.y + (hy - from.y) * e;
      p.alpha = Math.min(1, k * 3);
    });
  }
  later(1700, () => {
    tween(500, (k) => parts.forEach((p) => p.scale.set(1 + Math.sin(k * Math.PI * 2) * 0.4)));
    kit.secrets?.find('butterflies', 'gem', { x, y });
  }, cleanups);
  later(2600, () => {
    tween(600, (k) => parts.forEach((p) => (p.alpha = 1 - k)), () => parts.forEach((p) => p.destroy()));
  }, cleanups);
}

// ---------------------------------------------------------------------------
// Lounge: space channel + lamp on + disco = a UFO visit
// ---------------------------------------------------------------------------
function lounge(kit: EggKit, cleanups: Cleanups) {
  let channel = 0, lamp = false;
  on(kit, 'tv', (c: number) => (channel = c));
  on(kit, 'lamp', (o: boolean) => (lamp = o));
  on(kit, 'disco', () => {
    if (channel === 3 && lamp) later(900, () => ufo(kit, cleanups), cleanups);
  });
}

function ufo(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const tv = { x: w * 0.235, y: h * 0.36 };
  const u = new Container();
  const beam = new Graphics();
  beam.eventMode = 'none';
  const g = new Graphics();
  g.ellipse(0, -10, 22, 18).fill({ color: 0x9be7ff, alpha: 0.9 }).stroke({ width: 2.5, color: INK });
  g.circle(-6, -12, 4).circle(6, -12, 4).fill(0x7bd36b).stroke({ width: 1.5, color: INK }); // a little alien
  g.ellipse(0, 2, 48, 13).fill(0xadb5bd).stroke({ width: 3, color: INK });
  for (let i = -2; i <= 2; i++) g.circle(i * 16, 4, 4).fill(COLOURS[(i + 2) % COLOURS.length]);
  u.addChild(beam, g);
  u.position.set(tv.x, tv.y);
  u.scale.set(0.15);
  kit.over.addChild(u);
  sfx.whirr();
  const loop = [tv, { x: w * 0.2, y: h * 0.05 }, { x: w * 0.9, y: h * 0.05 }, { x: w * 0.5, y: h * 0.3 }];
  tween(2400, (t) => {
    const e = ease.inOutSine(t);
    const v = 1 - e;
    const [p0, p1, p2, p3] = loop;
    u.x = v * v * v * p0.x + 3 * v * v * e * p1.x + 3 * v * e * e * p2.x + e * e * e * p3.x;
    u.y = v * v * v * p0.y + 3 * v * v * e * p1.y + 3 * v * e * e * p2.y + e * e * e * p3.y;
    u.scale.set(0.15 + 0.85 * Math.min(1, t * 3));
    u.rotation = Math.sin(t * Math.PI * 6) * 0.12;
  }, () => {
    // hover, shine a beam down... and leave a present
    sfx.twinkle();
    const floor = h * 0.85 - u.y;
    tween(1400, (t) => {
      const a = Math.sin(t * Math.PI);
      beam.clear().poly([-20, 10, 20, 10, 70, floor, -70, floor]).fill({ color: 0xfff3b0, alpha: 0.5 * a });
    }, () => beam.clear());
    later(700, () => kit.secrets?.find('ufo', 'gem', { x: u.x, y: h * 0.62 }), cleanups);
    later(1500, () => {
      sfx.whirr();
      const from = { x: u.x, y: u.y };
      tween(1300, (t) => {
        const e = ease.inOutSine(t);
        u.x = from.x + (tv.x - from.x) * e;
        u.y = from.y + (tv.y - from.y) * e - Math.sin(t * Math.PI) * h * 0.15;
        u.scale.set(1 - 0.85 * e);
      }, () => u.destroy({ children: true }));
    }, cleanups);
  });
}

// ---------------------------------------------------------------------------
// School: play the xylophone all the way up
// ---------------------------------------------------------------------------
function school(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const x0 = 1.44 * w, x1 = 1.64 * w, y = h * 0.5;
  const played: number[] = [];
  on(kit, 'note', (i: number) => {
    played.push(i);
    if (played.length > 8) played.shift();
    if (played.length < 8) return;
    const up = played.every((n, k) => n === k);
    const down = played.every((n, k) => n === 7 - k);
    if (!up && !down) return;
    played.length = 0;
    later(350, () => {
      // musical notes float up
      for (let k = 0; k < 8; k++) {
        const n = musicNote(COLOURS[k % COLOURS.length]);
        const nx = x0 + ((x1 - x0) * (up ? k : 7 - k)) / 7;
        n.position.set(nx, y);
        n.alpha = 0;
        kit.over.addChild(n);
        const wait = k * 120;
        tween(1600 + wait, (t) => {
          const q = Math.max(0, (t * (1600 + wait) - wait) / 1600);
          n.y = y - q * h * 0.3;
          n.x = nx + Math.sin(q * 8) * 12;
          n.alpha = q > 0 ? (q > 0.7 ? (1 - q) / 0.3 : 1) : 0;
        }, () => n.destroy());
      }
      if (up) {
        sfx.tune([523, 659, 784, 1047, 784, 1047, 1319], 0.12);
        confetti(kit, x0, x1 - x0, y - h * 0.2, h * 0.8, 24);
        later(900, () => kit.secrets?.find('xylophone', 'medal', { x: (x0 + x1) / 2, y: y - h * 0.15 }), cleanups);
      } else sfx.tune([1047, 988, 880, 784, 698, 659, 587, 523], 0.1);
    }, cleanups);
  });
}

// ---------------------------------------------------------------------------
// Fair: three hook-a-duck prizes, and fireworks over the Ferris wheel
// ---------------------------------------------------------------------------
function fair(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  let prizes = 0, whizzes = 0;
  on(kit, 'duck-prize', (x: number, y: number) => {
    if (++prizes % 3) return;
    later(700, () => {
      sfx.tada();
      kit.secrets?.find('ducks', 'gold-coin', { x, y: y - 70 });
    }, cleanups);
  });
  on(kit, 'wheel', () => {
    if (++whizzes % 4) return;
    for (let i = 0; i < 7; i++) {
      later(1200 + i * 380, () => firework(kit, w * rand(0.15, 0.85), h * 0.66, h * rand(0.06, 0.22), COLOURS[i % COLOURS.length]), cleanups);
    }
  });
}

// ---------------------------------------------------------------------------
// Niagara: the pot of gold at the rainbow's end, and fishing
// ---------------------------------------------------------------------------
function niagara(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const f = falls(w, h);
  // where the rainbow comes down, on a rock at the river's edge
  const px = 0.5 * w + 0.3 * w - 18, py = f.bottom + 26;
  const pot = new Container();
  const pg = new Graphics();
  pg.ellipse(0, 14, 34, 9).fill(0x8d8d8d).stroke({ width: 2.5, color: INK }); // the rock
  for (let i = 0; i < 7; i++) pg.circle(-16 + i * 5.5, -14 - Math.sin((i / 6) * Math.PI) * 10, 7).fill(0xffd166).stroke({ width: 1.5, color: INK });
  pg.moveTo(-20, -12).quadraticCurveTo(-24, 14, 0, 14).quadraticCurveTo(24, 14, 20, -12).closePath().fill(0x2b2d42).stroke({ width: 2.5, color: INK });
  pg.ellipse(0, -12, 22, 5).fill(0x1f1f1f).stroke({ width: 2.5, color: INK });
  pot.addChild(pg);
  pot.position.set(px, py);
  pot.alpha = 0;
  pot.visible = false;
  kit.under.addChild(pot);
  let showing = false, timer = 0, grabbed = false;
  on(kit, 'roar', () => {
    if (showing) return;
    showing = true;
    grabbed = false;
    timer = 9000;
    pot.visible = true;
    later(1200, () => sfx.twinkle(), cleanups);
  });
  everyFrame((dt) => {
    if (!showing) return;
    timer -= dt;
    const want = timer > 0 && !grabbed ? 1 : 0;
    pot.alpha += (want - pot.alpha) * Math.min(1, dt / 300);
    if (want === 0 && pot.alpha < 0.02) {
      showing = false;
      pot.visible = false;
    }
  }, cleanups);
  tappable(pot, () => {
    if (grabbed || pot.alpha < 0.5) return;
    grabbed = true;
    sfx.ding();
    burst(kit.sparkles, px, py - 20, 14, 80);
    kit.secrets?.find('rainbow-gold', 'gold-coin', { x: px, y: py - 60 });
  }, new Rectangle(-44, -44, 88, 66));

  // --- ripples in the river: something's down there... three taps and it jumps out ---
  const rx = -0.15 * w, ry = h * 0.69;
  const ripples = new Graphics();
  ripples.eventMode = 'none';
  kit.under.addChild(ripples);
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    ripples.clear();
    for (const k of [0, 0.5]) {
      const p = (time * 0.0004 + k) % 1;
      const r = 8 + p * 40;
      ripples.ellipse(rx, ry, r, r * 0.3).stroke({ width: 3, color: 0xffffff, alpha: (1 - p) * 0.8 });
    }
  }, cleanups);
  const fishPic = () => {
    const g = new Graphics();
    g.ellipse(0, 0, 18, 10).fill(0x4ea8ff).stroke({ width: 2, color: INK });
    g.poly([-16, 0, -28, -9, -28, 9]).fill(0x4ea8ff).stroke({ width: 2, color: INK });
    g.circle(9, -3, 2.5).fill(INK);
    return g;
  };
  let bites = 0;
  hotspot(kit, new Rectangle(rx - 70, ry - 35, 140, 70), oneAtATime((done) => {
    const fish = fishPic();
    fish.position.set(rx, ry);
    kit.over.addChild(fish);
    sfx.blub();
    if (++bites < 3) {
      // a little jump, and back in with a splash
      tween(800, (t) => {
        fish.y = ry - Math.sin(t * Math.PI) * h * 0.12;
        fish.rotation = -Math.PI / 2 + t * Math.PI;
      }, () => {
        fish.destroy();
        sfx.blub();
        for (let i = 0; i < 8; i++) tumble(kit, new Graphics().circle(0, 0, rand(2, 4)).fill(0xbfe8ff), rx, ry, ry + 4, { vy: rand(-0.5, -0.2), vx: rand(-0.2, 0.2) });
        done();
      });
      return;
    }
    bites = 0;
    // a big jump... right out onto the path!
    tween(700, (t) => {
      fish.x = rx + t * 0.05 * w;
      fish.y = ry - Math.sin(t * Math.PI * 0.6) * h * 0.2;
      fish.rotation = -1 + t;
    }, () => {
      fish.destroy();
      kit.secrets?.find('fishing', 'fish', { x: rx + 0.05 * w, y: ry - h * 0.15 });
      later(500, done, cleanups);
    });
  }));
}

// ---------------------------------------------------------------------------
// Ninja gym: ring the bell three times
// ---------------------------------------------------------------------------
function ninja(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const bellX = 0.92 * w, bellY = h * 0.3 - 70;
  let rings = 0;
  on(kit, 'bell', () => {
    if (++rings % 3) return;
    later(800, () => {
      sfx.tune([784, 784, 1047, 1319, 1047, 1319], 0.12);
      confetti(kit, bellX - 0.15 * w, 0.3 * w, bellY - 40, h * 0.9, 30);
      kit.secrets?.find('ninja-bell', 'medal', { x: bellX - 0.04 * w, y: bellY + 30 });
    }, cleanups);
  });
}

// ---------------------------------------------------------------------------
// Zoo: feeding time
// ---------------------------------------------------------------------------
function zoo(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const gy = h * ZOO.ground;
  const fed = (id: string, x: number, y: number, voice: () => void) => {
    voice();
    later(450, voice, cleanups);
    hearts(kit.sparkles, x, y, 9);
    kit.secrets?.find(`fed:${id}`);
  };
  kit.secrets?.lock({
    accepts: ['fish'],
    area: () => ({ x: 1.06 * w, y: gy - h * 0.16, w: 0.38 * w, h: h * 0.24 }),
    open: () => fed('penguins', 1.22 * w, gy - h * 0.12, () => sfx.squeak(1.6)),
  });
  const lx = 1.62 * w, ly = gy - h * 0.06;
  kit.secrets?.lock({
    accepts: ['bone', 'burger'],
    area: () => ({ x: lx - 0.1 * w, y: ly - h * 0.16, w: 0.2 * w, h: h * 0.22 }),
    open: () => fed('lion', lx + 30, ly - h * 0.1, () => sfx.brrr()),
  });
  kit.secrets?.lock({
    accepts: ['carrot', 'apple'],
    area: () => ({ x: -0.72 * w, y: h * 0.15, w: 0.26 * w, h: h * 0.6 }),
    open: () => fed('giraffe', -0.56 * w, h * 0.25, () => sfx.pop(0.9)),
  });
  // a banana for the monkey, fruit for the elephant
  kit.secrets?.lock({
    accepts: ['banana'],
    area: () => ({ x: -0.26 * w, y: h * 0.12, w: 0.2 * w, h: h * 0.4 }),
    open: () => fed('monkey', -0.17 * w, h * 0.28, () => sfx.giggle(1.5)),
  });
  kit.secrets?.lock({
    accepts: ['watermelon', 'apple', 'banana'],
    area: () => ({ x: 0.28 * w, y: h * 0.4, w: 0.28 * w, h: h * 0.36 }),
    open: () => fed('elephant', 0.42 * w, h * 0.5, () => sfx.honk()),
  });
}

// ---------------------------------------------------------------------------
// Park: a coin in the fountain makes a wish
// ---------------------------------------------------------------------------
function park(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fx = 1.25 * w, fy = h * 0.67;
  kit.secrets?.lock({
    accepts: ['gold-coin'],
    area: () => ({ x: fx - 0.13 * w, y: fy - 50, w: 0.26 * w, h: h * 0.18 }),
    open() {
      sfx.blub();
      later(400, () => {
        sfx.twinkle();
        sfx.water(1.8);
        // the fountain sprays all the colours of the rainbow
        COLOURS.forEach((c, i) => spray(kit, fx, fy, -0.15 + i * 0.06, -0.7, 1500, c, h * 0.8));
        hearts(kit.sparkles, fx, fy - h * 0.2, 8);
      }, cleanups);
      later(1600, () => kit.secrets?.find('wish', 'gem', { x: fx, y: fy - h * 0.25 }), cleanups);
    },
  });
}

export const SECRET_EGGS: Partial<Record<PlaceId, (kit: EggKit, cleanups: Cleanups) => void>> = {
  'bedroom-a': bedroomA,
  'bedroom-b': bedroomB,
  lounge,
  backyard,
  police,
  vet,
  toyshop,
  school,
  fair,
  niagara,
  ninja,
  zoo,
  park,
};
