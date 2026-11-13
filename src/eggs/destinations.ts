import { Container, Graphics, Rectangle } from 'pixi.js';
import { frontLeaves } from '../depth';
import { falls, NIAGARA, NINJA } from '../destinations';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { cloudRain, drawBird, everyFrame, frontPiece, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';

/** Leafy bushes at the very front, at both ends of the path (they rustle when tapped). */
function frontBushes(kit: EggKit, cleanups: Cleanups, xs: [number, number, number][]) {
  const colors: [number, number] = kit.season === 'winter' ? [0x6a9a7f, 0x84a98c] : kit.season === 'autumn' ? [0xbc6c25, 0xdda15e] : [0x2d6a4f, 0x40916c];
  for (const [x, size, lean] of xs) {
    const s = kit.h * size;
    frontPiece(kit, cleanups, x, kit.h + 8, (g) => frontLeaves(g, 0, 0, s, colors, lean), new Rectangle(-s * 0.45, -s * 0.85, s * 0.9, s * 0.85));
  }
}

/** Big soft foam blocks at the front of the gym (boing!). */
function foamBlocks(kit: EggKit, cleanups: Cleanups, x: number, flip: number) {
  const S = kit.h / 768;
  frontPiece(kit, cleanups, x, kit.h + 6, (g) => {
    g.scale.set(S * flip, S);
    g.roundRect(-70, -90, 120, 90, 14).fill(0xe5383b).stroke({ width: 4, color: INK });
    g.roundRect(-40, -170, 100, 80, 14).fill(0xffb703).stroke({ width: 4, color: INK });
    g.roundRect(-60, -230, 70, 60, 12).fill(0x7bd36b).stroke({ width: 4, color: INK });
  }, new Rectangle(-80 * S, -235 * S, 160 * S, 235 * S), () => sfx.boing(0.9));
}

const COLOURS = [0xe5383b, 0xffd166, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];
/** Remainder that's never negative (for things that go round and round). */
const wrap = (v: number, n: number) => ((v % n) + n) % n;

// ---------------------------------------------------------------------------
// Niagara Falls
// ---------------------------------------------------------------------------
export function niagara(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  frontBushes(kit, cleanups, [[-NIAGARA.left * w + 0.01 * w, 0.32, 0.6], [-NIAGARA.left * w + 0.07 * w, 0.18, 0.85], [(1 + NIAGARA.right) * w - 0.01 * w, 0.32, -0.6], [0.5 * w, 0.12, 0]]);
  const winter = kit.season === 'winter';
  const f = falls(w, h);
  let time = 0;
  everyFrame((dt) => (time += dt), cleanups);

  // --- the falls: water rushing down all the time, mist and a rainbow at the bottom ---
  const water = new Graphics();
  const mist = new Graphics();
  const rainbow = new Graphics();
  mist.eventMode = rainbow.eventMode = 'none';
  kit.under.addChild(water, rainbow);
  kit.over.addChild(mist);
  let roar = 0; // a tap makes it roar: more mist, a brighter rainbow
  const small = { x0: -0.62 * w, x1: -0.4 * w, top: h * 0.3 };
  everyFrame(() => {
    water.clear();
    const fallH = f.bottom - f.top;
    const speed = winter ? 0.04 : 0.25;
    for (let x = f.x0 + 8; x < f.x1 - 4; x += 14) {
      const k = (x - f.x0) / (f.x1 - f.x0);
      const lip = f.top - Math.sin(k * Math.PI) * f.bulge * 2 * 0.5; // follow the curved edge
      for (let s = 0; s < 3; s++) {
        const off = wrap(time * speed + s * fallH / 3 + x * 7, fallH);
        const y = lip + off;
        if (y + 26 > f.bottom) continue;
        water.moveTo(x, y).lineTo(x, y + 26);
      }
    }
    for (let x = small.x0 + 8; x < small.x1; x += 14) {
      const off = wrap(time * speed + x * 5, f.bottom - small.top);
      water.moveTo(x, small.top + off).lineTo(x, Math.min(f.bottom, small.top + off + 22));
    }
    water.stroke({ width: 4, color: 0xffffff, alpha: 0.85 });
    if (winter) water.rect(f.x0, f.top - 6, f.x1 - f.x0, 14).fill({ color: 0xffffff, alpha: 0.9 }); // icy edge
    // mist rising at the bottom
    mist.clear();
    for (let i = 0; i < 14; i++) {
      const x = f.x0 + ((i + 0.5) / 14) * (f.x1 - f.x0);
      const r = 26 + Math.sin(time * 0.002 + i) * 8 + roar * 18;
      mist.circle(x, f.bottom - 4 - Math.abs(Math.sin(time * 0.0015 + i * 1.3)) * 20, r).fill({ color: 0xffffff, alpha: 0.35 + roar * 0.2 });
    }
    // a rainbow in the spray
    rainbow.clear();
    const cx = 0.5 * w, cy = f.bottom + 10;
    [0xe5383b, 0xffb703, 0xffd166, 0x52b788, 0x4ea8ff, 0x9b5de5].forEach((c, i) => {
      rainbow.moveTo(cx - (0.3 * w - i * 9), cy).arc(cx, cy, 0.3 * w - i * 9, Math.PI, 0).stroke({ width: 8, color: c, alpha: 0.25 + roar * 0.5 });
    });
  }, cleanups);
  hotspot(kit, new Rectangle(f.x0, f.top - f.bulge, f.x1 - f.x0, f.bottom - f.top + f.bulge), oneAtATime((done) => {
    sfx.water(2.6);
    kit.events?.emit('roar');
    tween(3000, (t) => (roar = Math.sin(t * Math.PI)), done);
  }));

  // --- the sightseeing boat: off towards the falls and back; tap for its horn ---
  const boat = new Container();
  const bg = new Graphics();
  bg.poly([-70, 0, 70, 0, 56, 26, -56, 26]).fill(0xffffff).stroke({ width: 3, color: INK });
  bg.rect(-70, 6, 140, 6).fill(0x1d3557);
  bg.rect(-40, -26, 70, 26).fill(0x1d3557).stroke({ width: 3, color: INK });
  for (let i = 0; i < 5; i++) {
    bg.circle(-56 + i * 26, -6, 9).fill(0xffd6a5).stroke({ width: 2, color: INK });
    bg.moveTo(-56 + i * 26 - 11, 2).arc(-56 + i * 26, -6, 11, Math.PI * 0.9, Math.PI * 0.1).stroke({ width: 5, color: 0x4ea8ff }); // blue ponchos
  }
  boat.addChild(bg);
  kit.under.addChild(boat);
  let bt = 0, boost = 1;
  everyFrame((dt) => {
    bt += dt * 0.00012 * boost;
    const k = (Math.sin(bt * Math.PI * 2) + 1) / 2; // 0..1..0
    boat.x = 0.25 * w + k * 0.5 * w;
    boat.y = h * 0.66 - k * h * 0.03 + Math.sin(time * 0.004) * 3;
    boat.scale.set(1 - k * 0.35);
    boat.scale.x *= Math.cos(bt * Math.PI * 2) >= 0 ? 1 : -1;
  }, cleanups);
  tappable(boat, oneAtATime((done) => {
    sfx.honk();
    tween(2000, (t) => (boost = 1 + Math.sin(t * Math.PI) * 4), () => {
      boost = 1;
      done();
    });
  }), new Rectangle(-80, -40, 160, 70));

  // --- the lookout tower: the lift goes up to the top ---
  const tx = -0.32 * w;
  const lift = new Graphics().roundRect(-10, -14, 20, 18, 4).fill(0xe5383b).stroke({ width: 2, color: INK });
  lift.position.set(tx + 5, h * 0.7);
  kit.under.addChild(lift);
  hotspot(kit, new Rectangle(tx - 0.08 * w, h * 0.06, 0.16 * w, h * 0.68), oneAtATime((done) => {
    sfx.whirr();
    tween(2200, (t) => (lift.y = h * 0.7 - Math.sin(t * Math.PI) * h * 0.55), () => done());
    later(1100, () => {
      sfx.ding();
      burst(kit.sparkles, tx, h * 0.12, 10, 60);
    }, cleanups);
  }));

  // --- coin binoculars on the path: an eagle flies past the falls ---
  const nx = -0.08 * w, ny = h * 0.84;
  const bino = new Container();
  bino.position.set(nx, ny);
  const big = new Graphics();
  big.rect(-5, 0, 10, h * 0.1).fill(0x2b2d42);
  big.roundRect(-30, -26, 60, 30, 10).fill(0x4ea8ff).stroke({ width: 3, color: INK });
  big.circle(-14, -26, 9).circle(14, -26, 9).fill(0x1f1f1f).stroke({ width: 2, color: INK });
  bino.addChild(big);
  kit.under.addChild(bino);
  tappable(bino, oneAtATime((done) => {
    sfx.click();
    tween(500, (t) => (bino.rotation = Math.sin(t * Math.PI * 2) * 0.2));
    const eagle = drawBird(new Graphics(), 0x6b4226);
    eagle.scale.set(1.4);
    kit.over.addChild(eagle);
    later(300, () => sfx.chirp(), cleanups);
    tween(2600, (t) => {
      eagle.x = f.x0 - 60 + t * (f.x1 - f.x0 + 120);
      eagle.y = f.top + h * 0.12 + Math.sin(t * Math.PI * 2) * h * 0.06;
    }, () => {
      eagle.destroy();
      done();
    });
  }), new Rectangle(-40, -40, 80, h * 0.14));

  // --- seagulls gliding round the bridge: tap one and it squawks ---
  for (let i = 0; i < 3; i++) {
    const gull = new Graphics();
    gull.moveTo(-20, 0).quadraticCurveTo(-10, -12, 0, 0).quadraticCurveTo(10, -12, 20, 0).stroke({ width: 5, color: INK });
    gull.moveTo(-20, 0).quadraticCurveTo(-10, -12, 0, 0).quadraticCurveTo(10, -12, 20, 0).stroke({ width: 3, color: 0xffffff });
    kit.over.addChild(gull);
    const cx = (1.25 + i * 0.18) * w, cy = h * (0.14 + i * 0.04);
    let spin = 1;
    everyFrame(() => {
      const a = time * 0.0006 * spin + i * 2;
      gull.position.set(cx + Math.cos(a) * 0.1 * w, cy + Math.sin(a * 2) * h * 0.03);
      gull.scale.y = 0.8 + 0.3 * Math.sin(time * 0.01 * spin + i);
    }, cleanups);
    tappable(gull, oneAtATime((done) => {
      sfx.squeak(2.4);
      later(200, () => sfx.squeak(2.6), cleanups);
      tween(1200, (t) => (spin = 1 + Math.sin(t * Math.PI) * 6), () => {
        spin = 1;
        done();
      });
    }), new Rectangle(-30, -20, 60, 30));
  }

  // --- the poncho stall: a snow globe of the falls, shaken up ---
  const sx = 1.57 * w, sy = h * 0.92 - h * 0.26 * 0.3 - 6;
  const globe = new Graphics();
  globe.circle(sx, sy - 22, 20).fill({ color: 0xbfe8ff, alpha: 0.85 }).stroke({ width: 3, color: INK });
  globe.rect(sx - 4, sy - 32, 8, 18).fill(0x4ea8ff);
  globe.rect(sx - 16, sy - 6, 32, 8).fill(0x8d5524).stroke({ width: 2, color: INK });
  kit.under.addChild(globe);
  const flakes = new Graphics();
  flakes.eventMode = 'none';
  kit.over.addChild(flakes);
  let shake = 0;
  everyFrame(() => {
    flakes.clear();
    if (shake <= 0) return;
    for (let i = 0; i < 10; i++) flakes.circle(sx + Math.sin(time * 0.01 + i * 7) * 14, sy - 22 + Math.cos(time * 0.012 + i * 3) * 12, 2).fill(0xffffff);
  }, cleanups);
  hotspot(kit, new Rectangle(sx - 0.07 * w, h * 0.92 - h * 0.26, 0.14 * w, h * 0.26), oneAtATime((done) => {
    sfx.twinkle();
    shake = 1;
    tween(500, (t) => (globe.x = Math.sin(t * Math.PI * 6) * 6), () => {
      later(2000, () => {
        shake = 0;
        done();
      }, cleanups);
    });
  }));

  // the drifting clouds rain (or snow) when tapped
  cloudRain(kit, cleanups, () => h * 0.75);
}

// ---------------------------------------------------------------------------
// The ninja kids gym
// ---------------------------------------------------------------------------

/** A little ninja kid in a black suit and a red headband (drawn round its feet). */
function drawNinjaKid(g: Graphics, suit = 0x1f1f1f) {
  g.moveTo(-6, -20).lineTo(-9, 0).moveTo(6, -20).lineTo(9, 0).stroke({ width: 7, color: suit, cap: 'round' });
  g.roundRect(-11, -46, 22, 28, 8).fill(suit).stroke({ width: 2, color: INK });
  g.moveTo(-10, -40).lineTo(-20, -52).moveTo(10, -40).lineTo(20, -52).stroke({ width: 6, color: suit, cap: 'round' });
  g.circle(0, -58, 12).fill(0xffd6a5).stroke({ width: 2, color: INK });
  g.rect(-12, -64, 24, 6).fill(0xe5383b);
  g.moveTo(12, -61).lineTo(22, -66).moveTo(12, -61).lineTo(22, -56).stroke({ width: 3, color: 0xe5383b });
  g.circle(-4, -57, 1.8).circle(4, -57, 1.8).fill(INK);
  return g;
}

export function ninjaGym(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const fy = h * NINJA.floor;
  foamBlocks(kit, cleanups, -NINJA.left * w + 0.06 * w, 1);
  foamBlocks(kit, cleanups, (1 + NINJA.right) * w - 0.06 * w, -1);

  // --- monkey bars: a little ninja swings across ---
  const mb0 = 0.08 * w, mb1 = 0.52 * w, top = h * 0.22;
  hotspot(kit, new Rectangle(mb0, top - 20, mb1 - mb0, h * 0.2), oneAtATime((done) => {
    const kid = drawNinjaKid(new Graphics());
    kid.scale.set(1.3, -1.3); // hanging by the hands
    kit.over.addChild(kid);
    const bars = Math.floor((mb1 - mb0 - 30) / (0.04 * w));
    let i = 0;
    const swing = () => {
      if (i >= bars) {
        // let go, and land on the mats
        sfx.boing(1.2);
        tween(500, (t) => {
          kid.y = top + 10 + t * (fy - top);
          kid.scale.y = -1.3 + t * 2.6;
        }, () => tween(400, (t) => (kid.alpha = 1 - t), () => {
          kid.destroy();
          done();
        }));
        return;
      }
      const x0 = mb0 + 20 + i * 0.04 * w, x1 = x0 + 0.04 * w;
      i++;
      sfx.whoosh();
      tween(220, (t) => {
        kid.position.set(x0 + (x1 - x0) * t, top + 10 + Math.sin(t * Math.PI) * 10);
        kid.rotation = Math.sin(t * Math.PI) * 0.3;
      }, swing);
    };
    swing();
  }));

  // --- the warped wall: a ninja runs up and rings the bell! ---
  const wx0 = 0.6 * w, wx1 = 0.82 * w, wtop = h * 0.3;
  const bellX = wx1 + 0.1 * w, bellY = wtop - 70;
  const bell = new Graphics();
  bell.moveTo(-16, 0).arc(0, 0, 16, Math.PI, 0).lineTo(-16, 0).fill(0xffd166).stroke({ width: 2.5, color: INK });
  bell.circle(0, 4, 4).fill(INK);
  bell.position.set(bellX, bellY);
  kit.under.addChild(bell);
  const ring = () => {
    sfx.bell();
    kit.events?.emit('bell');
    tween(600, (t) => (bell.rotation = Math.sin(t * Math.PI * 6) * 0.4 * (1 - t)));
    for (let i = 0; i < 18; i++) {
      const c = new Graphics().rect(-4, -6, 8, 12).fill(COLOURS[i % COLOURS.length]);
      tumble(kit, c, bellX, bellY, fy, { vx: rand(-0.3, 0.3), vy: rand(-0.5, -0.2), float: true, spin: rand(-10, 10) });
    }
  };
  tappable(bell, oneAtATime((done) => {
    ring();
    later(600, done, cleanups);
  }), new Rectangle(-30, -30, 60, 44));
  hotspot(kit, new Rectangle(wx0, wtop, wx1 - wx0 + 0.12 * w, fy - wtop), oneAtATime((done) => {
    const kid = drawNinjaKid(new Graphics());
    kid.scale.set(1.3);
    kit.over.addChild(kid);
    sfx.slideWhistle(1.4);
    tween(1200, (t) => {
      const e = ease.inOutSine(t);
      const x = (1 - e) * (1 - e) * (wx0 - 60) + 2 * (1 - e) * e * wx1 + e * e * wx1;
      const y = (1 - e) * (1 - e) * fy + 2 * (1 - e) * e * fy + e * e * wtop;
      kid.position.set(x, y);
      kid.rotation = -e * 0.5;
    }, () => {
      kid.rotation = 0;
      kid.position.set(wx1 + 0.05 * w, wtop - 10);
      sfx.yippee(1.3);
      ring();
      later(1400, () => tween(400, (t) => (kid.alpha = 1 - t), () => {
        kid.destroy();
        done();
      }), cleanups);
    });
  }));

  // --- rope swings ---
  for (const rx of [-0.53, -0.44, -0.35]) {
    const rope = new Container();
    rope.position.set(rx * w, h * 0.1 + 16);
    const rg = new Graphics();
    const len = h * 0.42;
    rg.moveTo(0, 0).lineTo(0, len).stroke({ width: 7, color: 0xc68b59 });
    for (let y = 30; y < len; y += 30) rg.ellipse(0, y, 6, 3).fill(0xa47e4b);
    rg.circle(0, len, 10).fill(0xa47e4b).stroke({ width: 2, color: INK });
    rope.addChild(rg);
    kit.under.addChild(rope);
    tappable(rope, oneAtATime((done) => {
      sfx.whoosh();
      tween(2000, (t) => (rope.rotation = Math.sin(t * Math.PI * 5) * 0.5 * (1 - t)), done);
    }), new Rectangle(-24, len * 0.2, 48, len * 0.85));
  }

  // --- the foam pit: cubes go flying ---
  const px0 = -0.25 * w, pw = 0.22 * w;
  const cubes: Graphics[] = [];
  for (let i = 0; i < 14; i++) {
    const c = new Graphics().rect(-12, -12, 24, 24).fill(COLOURS[i % COLOURS.length]).stroke({ width: 2, color: INK });
    c.position.set(px0 + 16 + (i % 7) * (pw - 32) / 6, fy + 8 + Math.floor(i / 7) * 22);
    c.rotation = rand(-0.4, 0.4);
    kit.under.addChild(c);
    cubes.push(c);
  }
  hotspot(kit, new Rectangle(px0, fy - 20, pw, h * 0.2), oneAtATime((done) => {
    sfx.poof();
    for (const c of cubes) {
      const x0 = c.x, y0 = c.y, vx = rand(-0.12, 0.12), up = rand(0.6, 1);
      tween(1100, (t) => {
        c.x = x0 + vx * t * 1100 * (1 - t);
        c.y = y0 - Math.sin(t * Math.PI) * h * 0.25 * up;
        c.rotation += 0.15;
      });
    }
    later(1200, done, cleanups);
  }));

  // --- trampolines: a ninja bounces and flips ---
  for (const tx of [1.06, 1.2]) {
    const cx = tx * w + 0.06 * w;
    hotspot(kit, new Rectangle(tx * w, fy + h * 0.02, 0.12 * w, h * 0.12), oneAtATime((done) => {
      const kid = drawNinjaKid(new Graphics());
      kid.scale.set(1.2);
      kid.position.set(cx, fy + h * 0.08);
      kit.over.addChild(kid);
      let n = 0;
      const bounce = () => {
        if (n++ >= 3) {
          tween(300, (t) => (kid.alpha = 1 - t), () => {
            kid.destroy();
            done();
          });
          return;
        }
        sfx.boing(1.3 + n * 0.1);
        const flip = n === 3;
        tween(800, (t) => {
          kid.y = fy + h * 0.08 - Math.sin(t * Math.PI) * h * 0.3;
          kid.rotation = flip ? t * Math.PI * 2 : 0;
        }, bounce);
      };
      bounce();
    }));
  }

  // --- the climbing wall: tap and the holds light up ---
  const cw0 = 1.36 * w, cw = 0.22 * w, ch0 = h * 0.12;
  const holds: { x: number; y: number; c: number }[] = [];
  for (let i = 0; i < 16; i++) holds.push({ x: cw0 + 16 + ((i * 37) % 100) / 100 * (cw - 32), y: ch0 + 20 + (i / 16) * (fy - ch0 - 40), c: COLOURS[i % COLOURS.length] });
  const holdG = new Graphics();
  kit.under.addChild(holdG);
  let lit = -1;
  const drawHolds = () => {
    holdG.clear();
    holds.forEach((p, i) => {
      holdG.ellipse(p.x, p.y, 13, 10).fill(p.c).stroke({ width: 2, color: INK });
      if (lit >= 0 && Math.abs(i - lit) < 2) holdG.circle(p.x, p.y, 20).stroke({ width: 4, color: 0xffffff, alpha: 0.8 });
    });
  };
  drawHolds();
  hotspot(kit, new Rectangle(cw0, ch0, cw, fy - ch0), oneAtATime((done) => {
    sfx.twinkle();
    tween(1400, (t) => {
      lit = Math.floor((1 - t) * holds.length);
      drawHolds();
    }, () => {
      lit = -1;
      drawHolds();
      burst(kit.sparkles, cw0 + cw / 2, ch0 + 20, 10, 60);
      done();
    });
  }));

  // --- the salmon ladder: the bar jumps up rung by rung ---
  const lx0 = 1.62 * w + 10, lx1 = 1.69 * w - 10;
  const bar = new Graphics().rect(lx0 - 16, -5, lx1 - lx0 + 32, 10).fill(0xe5383b).stroke({ width: 2, color: INK });
  const rungs: number[] = [];
  for (let y = h * 0.2; y < fy - 10; y += h * 0.08) rungs.push(y);
  bar.y = rungs[rungs.length - 1] - 8;
  kit.under.addChild(bar);
  hotspot(kit, new Rectangle(1.6 * w, h * 0.12, 0.11 * w, fy - h * 0.12), oneAtATime((done) => {
    let i = rungs.length - 1;
    const up = () => {
      if (i <= 0) {
        later(500, () => tween(600, (t) => (bar.y = rungs[0] - 8 + (rungs[rungs.length - 1] - rungs[0]) * t), done), cleanups);
        return;
      }
      const from = rungs[i] - 8, to = rungs[i - 1] - 8;
      i--;
      tween(180, (t) => (bar.y = from + (to - from) * t - Math.sin(t * Math.PI) * 16), () => {
        sfx.clank();
        later(80, up, cleanups);
      });
    };
    up();
  }));
}
