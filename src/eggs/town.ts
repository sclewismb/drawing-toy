import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { PALETTE } from '../seasons';
import { swayAt } from '../sky';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import {
  bezier,
  drawBird,
  everyFrame,
  glow,
  hotspot,
  INK,
  later,
  oneAtATime,
  cloudRain,
  rainFrom,
  rand,
  spray,
  tappable,
  tumble,
  type Cleanups,
  type EggKit,
} from './common';

/** Surprises in the fire station, police station, school and park. */

/** A flashing coloured light over the whole place (alarms and sirens). */
function flash(kit: EggKit, colours: number[], ms: number) {
  const f = new Graphics();
  f.eventMode = 'none';
  kit.over.addChild(f);
  tween(ms, (t) => {
    const i = Math.floor(t * 10) % colours.length;
    const on = Math.floor(t * 10) % 2 === 0;
    f.clear().rect(0, 0, kit.w, kit.h).fill({ color: colours[i], alpha: on ? 0.18 : 0.05 });
  }, () => f.destroy());
}

// ---------------------------------------------------------------------------
// Fire station
// ---------------------------------------------------------------------------
export function fireStation(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.74;

  // --- the big roller door rolls down and up ---
  const gx = w * 0.38, gy = h * 0.18, gw = w * 0.5, gh = h * 0.56;
  const door = new Graphics();
  kit.under.addChild(door);
  let down = 0;
  let isDown = false;
  const drawDoor = () => {
    const bottom = gy + gh * down;
    door.clear();
    if (down > 0.01) {
      door.rect(gx + 6, gy, gw - 12, gh * down).fill(0xf1f1f1);
      for (let y = gy + 22; y < bottom - 4; y += 22) door.moveTo(gx + 6, y).lineTo(gx + gw - 6, y);
      door.stroke({ width: 3, color: 0xadb5bd });
    }
    door.roundRect(gx - 4, Math.max(gy - 10, bottom - 16), gw + 8, 22, 10).fill(0xc1121f).stroke({ width: 4, color: INK });
  };
  drawDoor();
  tappable(door, () => {
    isDown = !isDown;
    sfx.clank();
    sfx.zip();
    const from = down;
    tween(900, (t) => ((down = from + ((isDown ? 1 : 0) - from) * ease.inOutSine(t)), drawDoor()));
  }, new Rectangle(gx, gy - 12, gw, gh + 12));

  // --- a firefighter slides down the pole ---
  const poleX = w * 0.16 + 9;
  hotspot(kit, new Rectangle(poleX - 30, 0, 60, fy), oneAtATime((done) => {
    sfx.slideWhistle(0.8);
    const ff = new Graphics();
    ff.rect(-12, 18, 10, 26).rect(2, 18, 10, 26).fill(0x343a40); // legs
    ff.roundRect(-16, -14, 32, 36, 8).fill(0xd4a017).stroke({ width: 3, color: INK }); // coat
    ff.rect(-16, 4, 32, 5).fill(0xf1fa8c);
    ff.circle(0, -24, 11).fill(0xf1c27d).stroke({ width: 3, color: INK }); // head
    ff.ellipse(0, -32, 17, 6).fill(0xe5383b).stroke({ width: 3, color: INK }); // helmet brim
    ff.roundRect(-11, -46, 22, 16, 8).fill(0xe5383b).stroke({ width: 3, color: INK });
    ff.circle(-4, -25, 1.8).circle(4, -25, 1.8).fill(INK);
    const arm = new Graphics().roundRect(-4, 0, 8, 24, 4).fill(0xd4a017).stroke({ width: 2, color: INK });
    const guy = new Container();
    guy.addChild(ff, arm);
    arm.position.set(14, -10);
    arm.rotation = -2.6; // holding the pole above
    guy.position.set(poleX + 10, -70);
    kit.over.addChild(guy);
    tween(900, (t) => (guy.y = -70 + (fy - 44 + 70) * ease.inOutSine(t)), () => {
      sfx.boing(1.2);
      tween(900, (t) => (arm.rotation = -2.4 + Math.sin(t * Math.PI * 6) * 0.5), () => {
        tween(900, (t) => ((guy.x = poleX + 10 + t * w * 0.2), (guy.alpha = 1 - t)), () => {
          guy.destroy({ children: true });
          done();
        });
      });
    });
  }));

  // --- the alarm bell ---
  const bx = w * 0.29, by = h * 0.12;
  const bell = new Graphics();
  bell.circle(0, 0, 26).fill(0xe5383b).stroke({ width: 4, color: INK });
  bell.circle(0, 0, 8).fill(0xffd166).stroke({ width: 3, color: INK });
  bell.position.set(bx, by);
  kit.under.addChild(bell);
  tappable(bell, oneAtATime((done) => {
    sfx.bell();
    flash(kit, [0xff0000, 0xff4d4d], 1200);
    tween(1000, (t) => (bell.rotation = Math.sin(t * Math.PI * 16) * 0.25 * (1 - t)), done);
  }), new Rectangle(-40, -40, 80, 80));

  // --- a spotty dog in its bed ---
  const dx = w * 0.92, dy = h * 0.9;
  const bed = new Graphics().ellipse(dx, dy, w * 0.06, h * 0.03).fill(0xe5383b).stroke({ width: 3, color: INK });
  kit.under.addChild(bed);
  const dog = new Container();
  const tail = new Graphics().roundRect(0, -4, 26, 8, 4).fill(0xffffff).stroke({ width: 2, color: INK });
  tail.position.set(16, -14);
  const body = new Graphics();
  body.ellipse(0, -18, 24, 18).fill(0xffffff).stroke({ width: 3, color: INK });
  body.circle(-18, -40, 14).fill(0xffffff).stroke({ width: 3, color: INK });
  body.ellipse(-28, -42, 6, 11).ellipse(-8, -42, 6, 11).fill(0x1f1f1f);
  body.circle(-22, -42, 2).circle(-14, -42, 2).fill(INK);
  body.circle(-18, -34, 3).fill(INK);
  for (const [a, b] of [[-4, -22], [8, -12], [10, -26], [-12, -10]]) body.circle(a, b, 4).fill(0x1f1f1f);
  dog.addChild(tail, body);
  dog.position.set(dx, dy);
  kit.under.addChild(dog);
  tappable(dog, oneAtATime((done) => {
    sfx.woof();
    tween(1200, (t) => {
      tail.rotation = Math.sin(t * Math.PI * 12) * 0.6;
      dog.y = dy - Math.abs(Math.sin(t * Math.PI * 2)) * 18;
    }, () => {
      dog.y = dy;
      done();
    });
  }), new Rectangle(-50, -60, 100, 70));

  // --- the hose reel sprays water ---
  const hx = w * 0.07, hy = h * 0.42;
  const reel = new Graphics();
  reel.circle(hx, hy, 34).fill(0xe5383b).stroke({ width: 4, color: INK });
  for (let r = 10; r < 30; r += 6) reel.circle(hx, hy, r).stroke({ width: 3, color: 0xffd166 });
  reel.rect(hx + 30, hy + 20, 26, 10).fill(0x6c757d).stroke({ width: 2, color: INK });
  kit.under.addChild(reel);
  tappable(reel, oneAtATime((done) => {
    sfx.water(1.6);
    spray(kit, hx + 58, hy + 25, 0.5, -0.35, 1500, 0x6ec6ff, fy + h * 0.1);
    later(1500, done, cleanups);
  }), new Rectangle(hx - 44, hy - 44, 110, 88));
}

// ---------------------------------------------------------------------------
// Police station
// ---------------------------------------------------------------------------
export function policeStation(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * 0.72;

  // --- a cheeky raccoon in the jail cell; tap the door to open it ---
  const x0 = w * 0.66, x1 = w * 0.97, y0 = h * 0.12, y1 = fy;
  const dx0 = x0 + (x1 - x0) * 0.28, dx1 = x0 + (x1 - x0) * 0.78;
  const coon = new Container();
  const cg = new Graphics();
  cg.ellipse(0, -30, 26, 30).fill(0x9a9a9a).stroke({ width: 3, color: INK }); // body
  for (let i = 0; i < 4; i++) cg.roundRect(18 + i * 6, -14 - i * 8, 10, 10, 4).fill(i % 2 ? 0x3a3a3a : 0xbdbdbd); // stripy tail
  cg.circle(0, -70, 22).fill(0xbdbdbd).stroke({ width: 3, color: INK }); // head
  cg.poly([-20, -82, -14, -98, -6, -86]).poly([20, -82, 14, -98, 6, -86]).fill(0x9a9a9a).stroke({ width: 2, color: INK });
  cg.roundRect(-20, -78, 40, 12, 6).fill(0x1f1f1f); // the mask!
  cg.circle(-8, -72, 3.5).circle(8, -72, 3.5).fill(0xffffff);
  cg.circle(0, -62, 4).fill(INK);
  cg.ellipse(0, -18, 14, 16).fill(0xe9ecef);
  coon.addChild(cg);
  const home = { x: (dx0 + dx1) / 2, y: y1 };
  coon.position.set(home.x, home.y);
  kit.under.addChild(coon);
  const door = new Graphics();
  kit.under.addChild(door);
  let open = 0;
  let isOpen = false;
  const drawDoor = () => {
    const left = dx0 + (dx1 - dx0) * 0.85 * open;
    door.clear().rect(left, y0 + 20, dx1 - left, y1 - y0 - 20).fill({ color: 0x9aa5b1, alpha: 0.001 });
    for (let x = left + 8; x < dx1 - 6; x += 30) door.rect(x, y0 + 20, 10, y1 - y0 - 20).fill(0x2b2b2b);
    door.rect(left, y0 + 20, dx1 - left, 10).rect(left, y1 - 30, dx1 - left, 10).fill(0x495057);
    door.circle(left + 14, (y0 + y1) / 2, 7).fill(0xffd166).stroke({ width: 2, color: INK });
    // when open, keep a finger-sized strip to tap to close it again
    door.hitArea = isOpen
      ? new Rectangle(dx1 - 70, y0 + 20, 70, y1 - y0 - 20)
      : new Rectangle(dx0, y0 + 20, dx1 - dx0, y1 - y0 - 20);
  };
  drawDoor();
  tappable(door, () => {
    isOpen = !isOpen;
    sfx.clank();
    const from = open;
    tween(500, (t) => ((open = from + ((isOpen ? 1 : 0) - from) * ease.inOutSine(t)), drawDoor()));
  });
  tappable(coon, oneAtATime((done) => {
    sfx.giggle(1.3);
    if (!isOpen) {
      tween(900, (t) => (cg.rotation = Math.sin(t * Math.PI * 6) * 0.12), () => ((cg.rotation = 0), done()));
      return;
    }
    // out it pops for a little dance, then back to bed
    tween(2200, (t) => {
      const k = Math.sin(t * Math.PI);
      coon.x = home.x - w * 0.22 * k;
      coon.y = home.y + h * 0.12 * k - Math.abs(Math.sin(t * Math.PI * 6)) * 25;
      cg.rotation = Math.sin(t * Math.PI * 4) * 0.2;
    }, () => {
      coon.position.set(home.x, home.y);
      cg.rotation = 0;
      done();
    });
  }), new Rectangle(-30, -100, 60, 100));

  // --- the badge spins and shines ---
  const bx = w * 0.42, by = h * 0.26, r = Math.min(w, h) * 0.07;
  const badge = new Graphics();
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  badge.poly(pts).fill(0xffd93d).stroke({ width: 5, color: INK });
  badge.circle(0, 0, r * 0.25).fill(0xffe873).stroke({ width: 3, color: INK });
  badge.position.set(bx, by);
  kit.under.addChild(badge);
  tappable(badge, oneAtATime((done) => {
    sfx.twinkle();
    tween(900, (t) => (badge.scale.x = Math.cos(t * Math.PI * 4)), () => {
      badge.scale.x = 1;
      burst(kit.sparkles, bx, by, 10, 80);
      done();
    });
  }), new Rectangle(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4));

  // --- the siren light ---
  const sx = w * 0.54, sy = h * 0.1;
  const siren = new Graphics();
  const drawSiren = (lit: number) => {
    siren.clear().rect(sx - 24, sy, 48, 12).fill(0x495057).stroke({ width: 3, color: INK });
    siren.moveTo(sx - 20, sy).arc(sx, sy, 20, Math.PI, Math.PI * 1.5).lineTo(sx, sy).fill(lit === 1 ? 0xff4d4d : 0xb02a2a).stroke({ width: 3, color: INK });
    siren.moveTo(sx, sy - 20).arc(sx, sy, 20, Math.PI * 1.5, Math.PI * 2).lineTo(sx, sy).fill(lit === 2 ? 0x4dabff : 0x1d4f91).stroke({ width: 3, color: INK });
  };
  drawSiren(0);
  kit.under.addChild(siren);
  hotspot(kit, new Rectangle(sx - 40, sy - 36, 80, 56), oneAtATime((done) => {
    sfx.siren();
    flash(kit, [0xff0000, 0x0066ff], 1600);
    tween(1600, (t) => drawSiren(Math.floor(t * 10) % 2 ? 1 : 2), () => {
      drawSiren(0);
      done();
    });
  }));

  // --- a pigeon visits the window sill ---
  const wx = w * 0.08, wy = h * 0.14, ww = w * 0.2, wh = h * 0.26;
  hotspot(kit, new Rectangle(wx, wy, ww, wh), oneAtATime((done) => {
    const pigeon = drawBird(new Graphics(), 0x9aa5b1);
    pigeon.scale.set(1.3);
    kit.over.addChild(pigeon);
    const sill = { x: wx + ww * 0.5, y: wy + wh - 4 };
    const from = { x: wx + ww + 60, y: wy - 40 };
    tween(700, (t) => ((pigeon.x = from.x + (sill.x - from.x) * t), (pigeon.y = from.y + (sill.y - from.y) * t)), () => {
      sfx.coo();
      tween(1200, (t) => (pigeon.rotation = Math.sin(t * Math.PI * 6) * 0.15), () => {
        tween(700, (t) => ((pigeon.x = sill.x - t * 160), (pigeon.y = sill.y - t * 200), (pigeon.alpha = 1 - t)), () => {
          pigeon.destroy();
          done();
        });
      });
    });
  }));
  void cleanups;
}

// ---------------------------------------------------------------------------
// School
// ---------------------------------------------------------------------------
export function school(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;

  // --- cuckoo! (a little roof and door above the clock) ---
  const cx = w * 0.9, cy = h * 0.2, cr = Math.min(w, h) * 0.075;
  const roof = new Graphics();
  roof.poly([cx - cr * 0.9, cy - cr * 0.95, cx, cy - cr * 1.75, cx + cr * 0.9, cy - cr * 0.95]).fill(0xa0522d).stroke({ width: 4, color: INK });
  roof.rect(cx - 10, cy - cr * 1.4, 20, 18).fill(0x5c3d2e).stroke({ width: 2, color: INK });
  kit.under.addChild(roof);
  const cuckoo = drawBird(new Graphics(), 0xffd166);
  cuckoo.scale.set(0.9);
  cuckoo.position.set(cx, cy - cr * 1.32);
  cuckoo.visible = false;
  kit.under.addChild(cuckoo);
  hotspot(kit, new Rectangle(cx - cr * 1.1, cy - cr * 1.8, cr * 2.2, cr * 2.9), oneAtATime((done) => {
    cuckoo.visible = true;
    sfx.cuckoo();
    tween(1300, (t) => (cuckoo.x = cx + Math.abs(Math.sin(t * Math.PI * 2)) * 26), () => {
      cuckoo.visible = false;
      done();
    });
  }));

  // --- the school bell ---
  const bx = w * 0.08, by = h * 0.14;
  const bell = new Graphics();
  bell.moveTo(-22, 22).quadraticCurveTo(-22, -24, 0, -26).quadraticCurveTo(22, -24, 22, 22).lineTo(-22, 22).fill(0xe9c46a).stroke({ width: 4, color: INK });
  bell.circle(0, 26, 6).fill(INK);
  bell.position.set(bx, by);
  kit.under.addChild(bell);
  tappable(bell, oneAtATime((done) => {
    sfx.bell();
    tween(1000, (t) => (bell.rotation = Math.sin(t * Math.PI * 14) * 0.3 * (1 - t)), done);
  }), new Rectangle(-40, -40, 80, 80));

  // --- the class goldfish (it jumps!) ---
  const fx = w * 0.09, fy = h * 0.5;
  const shelf = new Graphics().rect(fx - w * 0.06, fy + h * 0.06, w * 0.12, 12).fill(0xc68b59).stroke({ width: 3, color: INK });
  const bowl = new Graphics();
  bowl.circle(fx, fy, h * 0.065).fill({ color: 0xbde0fe, alpha: 0.75 }).stroke({ width: 3, color: INK });
  bowl.rect(fx - h * 0.04, fy - h * 0.065, h * 0.08, 6).fill(0xffffff);
  kit.under.addChild(shelf, bowl);
  const fish = new Graphics();
  fish.ellipse(0, 0, 10, 7).fill(0xff9f1c).stroke({ width: 2, color: INK });
  fish.poly([-9, 0, -18, -6, -18, 6]).fill(0xff9f1c).stroke({ width: 2, color: INK });
  fish.circle(5, -2, 1.5).fill(INK);
  kit.under.addChild(fish);
  let jumping = false;
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    if (jumping) return;
    fish.x = fx + Math.sin(time * 0.0015) * h * 0.03;
    fish.y = fy + Math.sin(time * 0.003) * h * 0.012;
    fish.scale.x = Math.cos(time * 0.0015) > 0 ? 1 : -1;
  }, cleanups);
  tappable(bowl, () => {
    if (jumping) return;
    jumping = true;
    sfx.blub();
    const sx = fish.x;
    tween(900, (t) => {
      fish.x = sx + (fx + 10 - sx) * t;
      fish.y = fy - Math.sin(t * Math.PI) * h * 0.16;
      fish.rotation = (t - 0.5) * 3;
    }, () => {
      fish.rotation = 0;
      sfx.blub();
      burst(kit.sparkles, fx, fy - h * 0.05, 6, 30);
      jumping = false;
    });
  }, new Rectangle(fx - h * 0.08, fy - h * 0.08, h * 0.16, h * 0.16));

  // --- a book flies off the shelf ---
  const sx = w * 0.84, sy = h * 0.44;
  const bookShelf = new Graphics().rect(sx, sy, w * 0.13, 12).fill(0xc68b59).stroke({ width: 3, color: INK });
  const spines = [0xe5383b, 0x4ea8ff, 0x7bd36b, 0xffd166, 0xb07de8];
  spines.forEach((c, i) => bookShelf.rect(sx + 6 + i * w * 0.022, sy - h * 0.08, w * 0.018, h * 0.08).fill(c).stroke({ width: 2, color: INK }));
  kit.under.addChild(bookShelf);
  hotspot(kit, new Rectangle(sx - 6, sy - h * 0.1, w * 0.14, h * 0.12), oneAtATime((done) => {
    sfx.flutter();
    sfx.twinkle();
    const book = new Graphics();
    const leftPage = new Graphics().rect(-24, -14, 24, 28).fill(0xffffff).stroke({ width: 2, color: INK });
    const rightPage = new Graphics().rect(0, -14, 24, 28).fill(0xffffff).stroke({ width: 2, color: INK });
    book.rect(-26, -16, 52, 32).fill(0x4ea8ff).stroke({ width: 2, color: INK });
    const flyer = new Container();
    flyer.addChild(book, leftPage, rightPage);
    kit.over.addChild(flyer);
    const p0 = { x: sx + w * 0.04, y: sy - h * 0.04 };
    const p1 = { x: w * 0.6, y: h * 0.05 };
    const p2 = { x: w * 0.1, y: h * 0.7 };
    tween(2600, (t) => {
      const p = bezier(p0, p1, p2, p0, t);
      flyer.position.set(p.x, p.y);
      const flap = Math.abs(Math.cos(t * Math.PI * 10));
      leftPage.scale.x = flap;
      rightPage.scale.x = flap;
      if (Math.random() < 0.08) burst(kit.sparkles, p.x, p.y, 2, 20);
    }, () => {
      flyer.destroy({ children: true });
      done();
    });
  }));
}

// ---------------------------------------------------------------------------
// Park (the season changes what happens)
// ---------------------------------------------------------------------------
export function park(kit: EggKit, cleanups: Cleanups) {
  const { w, h, season } = kit;
  const pal = PALETTE[season];
  const ground = h * 0.72;

  // --- the tree: shake it ---
  const tx = w * 0.3, treeTop = h * 0.3;
  const tree = new Container();
  const trunk = new Graphics().roundRect(-14, -h * 0.25, 28, h * 0.25, 6).fill(0x8d5524).stroke({ width: 4, color: INK });
  const crown = new Graphics();
  const leaf = { spring: 0x7bd36b, summer: 0x52b788, autumn: 0xf4a261, winter: 0x000000 }[season];
  if (season === 'winter') {
    crown.moveTo(0, -h * 0.24).lineTo(-40, -h * 0.36).moveTo(0, -h * 0.28).lineTo(36, -h * 0.4).moveTo(-20, -h * 0.31).lineTo(-50, -h * 0.3).stroke({ width: 8, color: 0x8d5524 });
    crown.ellipse(-40, -h * 0.365, 16, 6).ellipse(36, -h * 0.405, 16, 6).fill(0xffffff);
  } else {
    crown.circle(0, -h * 0.34, h * 0.12).circle(-h * 0.08, -h * 0.28, h * 0.09).circle(h * 0.08, -h * 0.28, h * 0.09).fill(leaf).stroke({ width: 4, color: INK });
    const dots = season === 'spring' ? 0xffb3c6 : season === 'summer' ? 0xe5383b : 0xd62828;
    for (let i = 0; i < 9; i++) crown.circle(rand(-h * 0.13, h * 0.13), -h * 0.32 + rand(-h * 0.08, h * 0.08), season === 'summer' ? 7 : 5).fill(dots);
  }
  tree.addChild(trunk, crown);
  tree.position.set(tx, ground);
  kit.under.addChild(tree);
  // swaying gently in the breeze (the trunk stays put), the bird going with it
  const sway = { phase: 0.4, speed: 0.001, amount: 0.022 };
  let swayTime = 0;
  let birdFlying = false;
  tappable(tree, oneAtATime((done) => {
    sfx.whoosh();
    tween(700, (t) => (crown.rotation = Math.sin(t * Math.PI * 8) * 0.06 * (1 - t)), () => {
      crown.rotation = 0;
      done();
    });
    for (let i = 0; i < 9; i++) {
      later(i * 80, () => {
        const piece = new Graphics();
        const x = tx + rand(-h * 0.13, h * 0.13), y = ground - h * 0.32 + rand(-h * 0.06, h * 0.06);
        if (season === 'summer') {
          piece.circle(0, 0, 8).fill(0xe5383b).stroke({ width: 2, color: INK });
          piece.rect(-1, -12, 2, 5).fill(0x5c3d2e);
          tumble(kit, piece, x, y, ground + h * 0.05);
          if (i === 0) later(500, () => sfx.pop(0.9), cleanups);
        } else if (season === 'winter') {
          piece.circle(0, 0, rand(5, 9)).fill(0xffffff);
          tumble(kit, piece, x, y, ground + h * 0.05);
        } else {
          piece.ellipse(0, 0, 8, 5).fill(season === 'spring' ? 0xffb3c6 : [0xe76f51, 0xf4a261, 0xe9c46a][i % 3]).stroke({ width: 1.5, color: INK });
          tumble(kit, piece, x, y, ground + h * 0.05, { float: true });
        }
      }, cleanups);
    }
  }), new Rectangle(-h * 0.2, -h * 0.48, h * 0.4, h * 0.48));

  // --- a bird on the tree flies a loop ---
  const bird = drawBird(new Graphics(), 0xff595e);
  const perch = { x: tx + h * 0.06, y: ground - h * 0.43 };
  bird.position.set(perch.x, perch.y);
  kit.under.addChild(bird);
  everyFrame((dt) => {
    const s = swayAt((swayTime += dt), sway);
    tree.skew.x = s;
    if (!birdFlying) bird.x = perch.x + Math.sin(s) * (perch.y - ground);
  }, cleanups);
  tappable(bird, oneAtATime((done) => {
    sfx.chirp();
    birdFlying = true;
    tween(2200, (t) => {
      const p = bezier(perch, { x: w * 0.7, y: -h * 0.1 }, { x: w * 0.9, y: h * 0.4 }, perch, t);
      bird.position.set(p.x, p.y);
      bird.scale.y = 0.6 + 0.4 * Math.abs(Math.cos(t * Math.PI * 16));
    }, () => {
      bird.scale.y = 1;
      birdFlying = false;
      done();
    });
  }), new Rectangle(-24, -24, 50, 40));

  // --- the pond and its duck ---
  const px = w * 0.72, py = h * 0.86, prx = w * 0.13, pry = h * 0.05;
  const pond = new Graphics().ellipse(px, py, prx, pry).fill(season === 'winter' ? 0xd7ecff : 0x4ea8ff).stroke({ width: 4, color: INK });
  if (season === 'winter') pond.moveTo(px - prx * 0.5, py - 4).lineTo(px - prx * 0.2, py - 8).moveTo(px + prx * 0.1, py + 6).lineTo(px + prx * 0.45, py + 2).stroke({ width: 3, color: 0xffffff });
  kit.under.addChild(pond);
  const duck = new Graphics();
  duck.ellipse(0, 0, 20, 13).fill(0xffd60a).stroke({ width: 3, color: INK });
  duck.circle(14, -14, 10).fill(0xffd60a).stroke({ width: 3, color: INK });
  duck.circle(17, -16, 2).fill(INK);
  duck.poly([22, -14, 32, -11, 22, -9]).fill(0xff9f1c).stroke({ width: 2, color: INK });
  duck.position.set(px - prx * 0.4, py - 4);
  kit.under.addChild(duck);
  let duckSide = -1;
  tappable(duck, oneAtATime((done) => {
    sfx.quack();
    const from = duck.x;
    duckSide = -duckSide;
    const to = px + prx * 0.4 * duckSide;
    tween(1400, (t) => {
      duck.x = from + (to - from) * ease.inOutSine(t);
      duck.rotation = season === 'winter' ? t * Math.PI * 4 : Math.sin(t * Math.PI * 6) * 0.08;
    }, () => {
      duck.rotation = 0;
      duck.scale.x = -duckSide;
      done();
    });
  }), new Rectangle(-30, -30, 70, 46));

  // --- a bush with a bunny hiding in it (at the edge, clear of the characters) ---
  const bx = w * 0.93, by = ground + 6;
  const bunny = new Graphics();
  bunny.ellipse(-8, -46, 7, 18).ellipse(8, -46, 7, 18).fill(0xffffff).stroke({ width: 3, color: INK });
  bunny.circle(0, -24, 16).fill(0xffffff).stroke({ width: 3, color: INK });
  bunny.circle(-6, -27, 2.5).circle(6, -27, 2.5).fill(INK);
  bunny.circle(0, -20, 3).fill(0xff8fb1);
  bunny.position.set(bx, by + 30);
  kit.under.addChild(bunny);
  const bush = new Graphics();
  const bushColour = { spring: 0x52b788, summer: 0x2d6a4f, autumn: 0x9c6644, winter: 0xdfe7ee }[season];
  bush.circle(bx - 30, by - 10, 30).circle(bx + 30, by - 10, 30).circle(bx, by - 30, 34).fill(bushColour).stroke({ width: 4, color: INK });
  bush.rect(bx - 60, by - 4, 120, 14).fill(pal.grass);
  kit.under.addChild(bush);
  hotspot(kit, new Rectangle(bx - 66, by - 70, 132, 80), oneAtATime((done) => {
    sfx.boing(1.5);
    tween(1800, (t) => {
      const up = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
      bunny.y = by + 30 - 60 * ease.outBack(Math.min(1, up));
      bunny.x = bx + Math.sin(t * Math.PI * 4) * 20 * (up > 0.9 ? 1 : 0);
    }, () => {
      bunny.position.set(bx, by + 30);
      done();
    });
  }));

  // --- the sun: tap for night-time (tap the moon for day) ---
  const sunX = w * 0.85, sunY = h * 0.15, sunR = Math.min(w, h) * 0.08 * pal.sunSize;
  const night = new Graphics();
  night.eventMode = 'none';
  kit.over.addChild(night);
  let dark = 0;
  let isNight = false;
  const starSpots = Array.from({ length: 30 }, () => [rand(0, 1) * w, rand(0, 0.55) * h, rand(1.5, 3)]);
  const drawNight = () => {
    night.clear();
    if (dark < 0.01) return;
    night.rect(0, 0, w, h).fill({ color: 0x0b1026, alpha: 0.55 * dark });
    for (const [x, y, r] of starSpots) night.circle(x, y, r).fill({ color: 0xffffff, alpha: dark });
    night.circle(sunX, sunY, sunR * 0.9).fill({ color: 0xfff3c4, alpha: dark });
    night.circle(sunX + sunR * 0.35, sunY - sunR * 0.2, sunR * 0.75).fill({ color: 0x1b2347, alpha: dark });
    glow(night, sunX, sunY, sunR * 2.2, 0xfff3c4, 0.8 * dark);
  };
  hotspot(kit, new Rectangle(sunX - sunR * 1.3, sunY - sunR * 1.3, sunR * 2.6, sunR * 2.6), () => {
    isNight = !isNight;
    if (isNight) sfx.twinkle();
    else sfx.chirp();
    const from = dark;
    tween(800, (t) => ((dark = from + ((isNight ? 1 : 0) - from) * t), drawNight(), kit.events?.emit('dark', 'night', dark)));
  });

  // --- the drifting clouds rain (or snow) when tapped ---
  cloudRain(kit, cleanups, () => ground + h * 0.08);
}
