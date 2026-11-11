import { Container, Graphics, Rectangle } from 'pixi.js';
import { YARD } from '../backyard';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { drawBird, everyFrame, glow, hotspot, INK, later, oneAtATime, rand, spray, tappable, tumble, type Cleanups, type EggKit } from './common';

/** Surprises in the back garden (see backyard.ts for where things are). */
export function backyard(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const hz = h * YARD.horizon;
  const winter = kit.season === 'winter';

  // --- the big spruce: pine cones drop (or a dollop of snow) ---
  hotspot(kit, new Rectangle(w * 0.4, h * 0.06, w * 0.3, h * 0.42), oneAtATime((done) => {
    sfx.whoosh();
    for (let i = 0; i < 3; i++) {
      later(i * 180, () => {
        const piece = new Graphics();
        if (winter) piece.circle(0, 0, rand(6, 10)).fill(0xffffff).stroke({ width: 1.5, color: 0xc9d6e3 });
        else {
          piece.ellipse(0, 0, 7, 11).fill(0x8d5524).stroke({ width: 2, color: INK });
          piece.moveTo(-6, -3).lineTo(6, -3).moveTo(-6, 3).lineTo(6, 3).stroke({ width: 1.5, color: 0x5c3317 });
        }
        tumble(kit, piece, w * rand(0.45, 0.65), h * rand(0.15, 0.35), h * 0.7, { vx: rand(-0.05, 0.05) });
        sfx.drop(1.6);
      }, cleanups);
    }
    later(1200, done, cleanups);
  }));

  // --- the bird feeder on the trunk: birds come for a snack ---
  const fx = w * 0.55, fy = h * 0.4;
  const feeder = new Graphics();
  feeder.poly([fx - 20, fy - 8, fx, fy - 26, fx + 20, fy - 8]).fill(0xe5383b).stroke({ width: 2.5, color: INK });
  feeder.rect(fx - 15, fy - 8, 30, 26).fill(0xffd166).stroke({ width: 2.5, color: INK });
  feeder.circle(fx, fy + 2, 5).fill(INK);
  feeder.rect(fx - 20, fy + 18, 40, 5).fill(0x8d5524);
  kit.under.addChild(feeder);
  tappable(feeder, oneAtATime((done) => {
    sfx.chirp();
    const colours = [0x4ea8ff, 0xe5383b, 0xffd166];
    colours.forEach((c, i) => {
      const bird = drawBird(new Graphics(), c);
      bird.scale.set(0.8);
      kit.over.addChild(bird);
      const from = { x: fx + (i - 1) * w * 0.3, y: -40 }, to = { x: fx - 14 + i * 14, y: fy + 12 };
      tween(700 + i * 150, (t) => {
        const e = ease.outCubic(t);
        bird.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      }, () => {
        tween(1000, (t) => (bird.rotation = Math.sin(t * Math.PI * 6) * 0.25), () => {
          if (i === 1) sfx.chirp();
          tween(800, (t) => {
            bird.x = to.x + (i - 1) * t * w * 0.3;
            bird.y = to.y - t * h * 0.5;
            bird.alpha = 1 - t * 0.5;
          }, () => {
            bird.destroy();
            if (i === 2) done();
          });
        });
      });
    });
  }), new Rectangle(fx - 30, fy - 34, 60, 62));

  // --- the tree swing: wheee! ---
  const swing = new Container();
  swing.position.set(w * 0.66, h * 0.43);
  const sg = new Graphics();
  const ropeLen = h * 0.28;
  sg.moveTo(0, 0).lineTo(0, ropeLen).stroke({ width: 3, color: 0xe9c79f });
  sg.ellipse(0, ropeLen, 22, 7).fill(0xe5383b).stroke({ width: 2.5, color: INK });
  swing.addChild(sg);
  kit.under.addChild(swing);
  tappable(swing, oneAtATime((done) => {
    sfx.whoosh();
    later(400, () => sfx.yippee(1.3), cleanups);
    tween(2400, (t) => (swing.rotation = Math.sin(t * Math.PI * 6) * 0.7 * (1 - t)), done);
  }), new Rectangle(-40, ropeLen * 0.3, 80, ropeLen * 0.8));

  // --- the sandbox: dig for treasure ---
  const sx = w * 0.3, sy = h * 0.64, sw = w * 0.14, sh = h * 0.07;
  hotspot(kit, new Rectangle(sx, sy - 10, sw, sh + 20), oneAtATime((done) => {
    sfx.brrr();
    for (let i = 0; i < 14; i++) {
      tumble(kit, new Graphics().circle(0, 0, rand(2, 4)).fill(winter ? 0xffffff : 0xe9c46a), sx + sw / 2, sy + sh / 2, sy + sh, { vy: rand(-0.6, -0.3), vx: rand(-0.2, 0.2) });
    }
    const treasures = [
      (g: Graphics) => g.star(0, 0, 5, 14, 7).fill(0xffd166).stroke({ width: 2, color: INK }),
      (g: Graphics) => g.moveTo(-14, 8).quadraticCurveTo(0, -22, 14, 8).lineTo(-14, 8).fill(0xffb4a2).stroke({ width: 2, color: INK }),
      (g: Graphics) => g.roundRect(-16, -5, 32, 10, 5).circle(-16, -5, 6).circle(-16, 5, 6).circle(16, -5, 6).circle(16, 5, 6).fill(0xfdf6ec).stroke({ width: 2, color: INK }),
      (g: Graphics) => g.circle(0, 0, 12).fill(0xffd60a).stroke({ width: 2, color: INK }).circle(0, 0, 6).stroke({ width: 2, color: 0xe0a800 }),
    ];
    const piece = treasures[Math.floor(rand(0, treasures.length))](new Graphics());
    later(250, () => {
      sfx.pop(1.3);
      piece.position.set(sx + sw / 2, sy + sh / 2);
      kit.over.addChild(piece);
      tween(900, (t) => {
        piece.y = sy + sh / 2 - Math.sin(t * Math.PI) * h * 0.18;
        piece.rotation = t * Math.PI * 2;
      }, () => {
        burst(kit.sparkles, piece.x, piece.y, 8, 50);
        piece.destroy();
        done();
      });
    }, cleanups);
  }));

  // --- the putting green: a hole in one! ---
  const px = w * 0.62, py = h * 0.8;
  const hole = { x: px + w * 0.17, y: py + h * 0.02 };
  const flag = new Container();
  flag.position.set(hole.x, hole.y);
  const fg = new Graphics();
  fg.rect(-2, -h * 0.12, 4, h * 0.12).fill(0xf8f9fa).stroke({ width: 1.5, color: INK });
  fg.poly([2, -h * 0.12, 32, -h * 0.1, 2, -h * 0.08]).fill(0xe5383b).stroke({ width: 2, color: INK });
  flag.addChild(fg);
  kit.under.addChild(flag);
  hotspot(kit, new Rectangle(px, py - h * 0.04, w * 0.23, h * 0.19), oneAtATime((done) => {
    const ball = new Graphics().circle(0, 0, 7).fill(0xffffff).stroke({ width: 2, color: INK });
    const from = { x: px + w * 0.05, y: py + h * 0.12 };
    ball.position.set(from.x, from.y);
    kit.under.addChild(ball);
    sfx.click();
    tween(1300, (t) => {
      const e = ease.outCubic(t);
      ball.position.set(from.x + (hole.x - from.x) * e, from.y + (hole.y - from.y) * e);
    }, () => {
      sfx.pling();
      ball.destroy();
      later(200, () => sfx.yippee(1.2), cleanups);
      burst(kit.sparkles, hole.x, hole.y - h * 0.1, 12, 70);
      tween(1000, (t) => (fg.skew.y = Math.sin(t * Math.PI * 8) * 0.25 * (1 - t)), done);
    });
  }));

  // --- the trampoline far away: a ball bounces on it ---
  hotspot(kit, new Rectangle(w * 0.1, hz - h * 0.02, w * 0.12, h * 0.1), oneAtATime((done) => {
    const ball = new Graphics().circle(0, 0, 6).fill(0xffd93d).stroke({ width: 1.5, color: INK });
    kit.over.addChild(ball);
    let n = 0;
    const bounce = () => {
      if (n++ >= 3) {
        ball.destroy();
        return done();
      }
      sfx.boing(1.8);
      tween(600, (t) => ball.position.set(w * 0.16, hz + h * 0.035 - Math.sin(t * Math.PI) * h * 0.12));
      later(600, bounce, cleanups);
    };
    bounce();
  }));

  // --- left: a cat in the house window ---
  const hx = -0.75 * w, hw = 0.14 * w;
  const win = { x: hx + hw * 0.2 + 4, y: h * 0.16 + 4, w: hw * 0.55 - 8, h: h * 0.26 - 8 };
  const glass = new Graphics().rect(win.x, win.y, win.w, win.h).fill(0x9fc5e8);
  kit.under.addChild(glass);
  const catLayer = new Container();
  const mask = new Graphics().rect(win.x, win.y, win.w, win.h).fill(0xffffff);
  catLayer.mask = mask;
  kit.under.addChild(mask, catLayer);
  const shine = new Graphics();
  shine.moveTo(win.x + win.w * 0.15, win.y + win.h * 0.5).lineTo(win.x + win.w * 0.45, win.y + win.h * 0.1).stroke({ width: 5, color: 0xffffff, alpha: 0.6 });
  shine.rect(win.x + win.w / 2 - 2, win.y, 4, win.h).fill(0xffffff);
  kit.under.addChild(shine);
  hotspot(kit, new Rectangle(win.x - 10, win.y - 10, win.w + 20, win.h + 20), oneAtATime((done) => {
    const cat = new Graphics();
    cat.poly([-20, -10, -14, -34, -2, -18]).poly([20, -10, 14, -34, 2, -18]).fill(0x6c757d).stroke({ width: 2.5, color: INK });
    cat.circle(0, 0, 22).fill(0x6c757d).stroke({ width: 2.5, color: INK });
    cat.circle(-8, -2, 4).circle(8, -2, 4).fill(0xb5e48c);
    cat.circle(-8, -2, 1.8).circle(8, -2, 1.8).fill(INK);
    cat.poly([-3, 6, 3, 6, 0, 10]).fill(0xff8fa3);
    const bottom = win.y + win.h + 30, top = win.y + win.h - 18;
    cat.position.set(win.x + win.w * 0.3, bottom);
    catLayer.addChild(cat);
    tween(350, (t) => (cat.y = bottom + (top - bottom) * ease.outBack(t)), () => {
      sfx.meow();
      later(1300, () => tween(300, (t) => (cat.y = top + (bottom - top) * t), () => {
        cat.destroy();
        done();
      }), cleanups);
    });
  }));

  // --- left: the black hose by the downpipe: whoosh, water! ---
  const hoseEnd = { x: hx + hw + w * 0.12, y: h * 0.76 };
  hotspot(kit, new Rectangle(hx + hw - 20, h * 0.68, w * 0.14, h * 0.12), oneAtATime((done) => {
    sfx.water(1.6);
    spray(kit, hoseEnd.x, hoseEnd.y, 0.3, -0.25, 1500, 0x6ec6ff, h * 0.9);
    later(1700, done, cleanups);
  }));

  // --- left: the metal planter full of sand toys ---
  const tx = -0.44 * w, tw = 0.09 * w, ty = h * 0.78;
  const toys = new Container();
  const toyArt = new Graphics();
  toyArt.roundRect(tx + tw * 0.1, ty - 26, 20, 26, 3).fill(0x4ea8ff).stroke({ width: 2, color: INK }); // bucket
  toyArt.moveTo(tx + tw * 0.45, ty - 34).lineTo(tx + tw * 0.5, ty).stroke({ width: 4, color: 0xff9f1c }); // spade
  toyArt.ellipse(tx + tw * 0.45, ty - 38, 7, 9).fill(0xff9f1c).stroke({ width: 2, color: INK });
  toyArt.roundRect(tx + tw * 0.6, ty - 22, 26, 22, 6).fill(0xff8fb1).stroke({ width: 2, color: INK }); // watering can
  toyArt.moveTo(tx + tw * 0.6 + 26, ty - 14).lineTo(tx + tw * 0.6 + 40, ty - 26).stroke({ width: 4, color: 0xff8fb1 });
  toys.addChild(toyArt);
  kit.under.addChild(toys);
  const trough = new Graphics();
  trough.roundRect(tx, ty, tw, h * 0.08, 6).fill(0xadb5bd).stroke({ width: 3, color: INK });
  for (let x = tx + 10; x < tx + tw - 4; x += 10) trough.moveTo(x, ty + 3).lineTo(x, ty + h * 0.08 - 3);
  trough.stroke({ width: 1.5, color: 0x8d99ae });
  kit.under.addChild(trough);
  hotspot(kit, new Rectangle(tx - 10, ty - 50, tw + 20, h * 0.08 + 56), oneAtATime((done) => {
    sfx.boing(1.5);
    tween(700, (t) => (toys.y = -Math.abs(Math.sin(t * Math.PI * 2)) * 28), () => {
      toys.y = 0;
      done();
    });
  }));

  // --- right: fairy lights round the gazebo roof ---
  const gx = w * 1.1, gw = w * 0.3, gy = h * 0.3;
  const bulbs = new Graphics();
  bulbs.eventMode = 'none';
  kit.over.addChild(bulbs);
  let lit = false;
  let time = 0;
  const bulbCols = [0xffd166, 0xff8fa3, 0x7bd3ff, 0xb5e48c];
  const bulbY = (i: number, n: number) => gy + h * 0.09 + 10 + Math.sin((i / n) * Math.PI * 4) ** 2 * 10;
  everyFrame((dt) => {
    time += dt;
    bulbs.clear();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const x = gx - 20 + ((gw + 40) * i) / n, y = bulbY(i, n);
      if (lit) glow(bulbs, x, y, 18, bulbCols[i % 4], 0.6 + 0.4 * Math.sin(time * 0.006 + i));
      bulbs.circle(x, y, 4).fill(lit ? bulbCols[i % 4] : 0xdee2e6).stroke({ width: 1.5, color: INK });
    }
  }, cleanups);
  hotspot(kit, new Rectangle(gx - 20, gy - h * 0.06, gw + 40, h * 0.18), () => {
    lit = !lit;
    if (lit) sfx.twinkle();
    else sfx.click();
  });

  // --- right: the picnic table: a picnic... and here come the ants! ---
  const tableY = h * 0.66;
  const picnic = new Graphics();
  kit.under.addChild(picnic);
  let stage = 0;
  hotspot(kit, new Rectangle(gx + gw * 0.1, tableY - 50, gw * 0.8, 70), oneAtATime((done) => {
    if (stage === 0) {
      stage = 1;
      sfx.ding();
      const cx = gx + gw * 0.4;
      picnic.clear();
      picnic.moveTo(cx - 26, tableY).arc(cx, tableY, 26, Math.PI, 0).lineTo(cx - 26, tableY).fill(0x52b788).stroke({ width: 2, color: INK });
      picnic.moveTo(cx - 21, tableY).arc(cx, tableY, 21, Math.PI, 0).lineTo(cx - 21, tableY).fill(0xff6b6b);
      for (const dx of [-10, 0, 10]) picnic.ellipse(cx + dx, tableY - 9, 1.5, 3).fill(INK);
      const jx = gx + gw * 0.62;
      picnic.roundRect(jx - 12, tableY - 40, 24, 40, 5).fill({ color: 0xfff3b0, alpha: 0.9 }).stroke({ width: 2, color: INK });
      picnic.rect(jx - 10, tableY - 24, 20, 22).fill(0xffe066);
      burst(kit.sparkles, cx, tableY - 20, 8, 50);
      return done();
    }
    // the ants march across and carry the picnic away
    stage = 0;
    sfx.giggle(1.6);
    const ants = new Container();
    for (let i = 0; i < 6; i++) {
      const a = new Graphics();
      a.circle(0, 0, 3).circle(5, 0, 3.5).circle(10, 0, 3).fill(0x1f1f1f);
      a.moveTo(3, 0).lineTo(1, 5).moveTo(6, 0).lineTo(6, 5).moveTo(8, 0).lineTo(10, 5).stroke({ width: 1, color: 0x1f1f1f });
      a.position.set(-i * 18, 0);
      ants.addChild(a);
    }
    ants.position.set(gx + gw * 0.1, tableY - 4);
    kit.over.addChild(ants);
    tween(2600, (t) => {
      ants.x = gx + gw * 0.1 + t * gw * 1.0;
      ants.children.forEach((a, i) => (a.y = Math.sin(t * 60 + i) * 1.5));
      if (t > 0.45) picnic.alpha = Math.max(0, 1 - (t - 0.45) * 4);
    }, () => {
      ants.destroy({ children: true });
      picnic.clear();
      picnic.alpha = 1;
      done();
    });
  }));

  // --- right: the barbecue: lift the cover, sausages sizzle ---
  const bbx = w * 1.44, bby = h * 0.56, bbw = w * 0.07, bbh = h * 0.14;
  const grill = new Graphics();
  grill.roundRect(bbx, bby, bbw, bbh * 0.6, 8).fill(0x2b2d42).stroke({ width: 3, color: INK });
  grill.rect(bbx + 4, bby + 4, bbw - 8, 8).fill(0x495057);
  for (const [i, c] of [0xc1440e, 0xa63c06, 0xc1440e].entries()) grill.roundRect(bbx + 8 + i * (bbw - 16) / 3, bby - 2, (bbw - 16) / 3 - 4, 8, 4).fill(c).stroke({ width: 1.5, color: INK });
  grill.moveTo(bbx + 8, bby + bbh * 0.6).lineTo(bbx + 4, bby + bbh).moveTo(bbx + bbw - 8, bby + bbh * 0.6).lineTo(bbx + bbw - 4, bby + bbh).stroke({ width: 4, color: 0x2b2d42 });
  grill.circle(bbx + 4, bby + bbh, 6).circle(bbx + bbw - 4, bby + bbh, 6).fill(0x1f1f1f);
  kit.under.addChild(grill);
  const cover = new Graphics();
  cover.roundRect(bbx - 4, bby - h * 0.04, bbw + 8, bbh * 0.95, 14).fill(0x1f1f1f).stroke({ width: 3, color: INK });
  cover.moveTo(bbx + 6, bby).lineTo(bbx + bbw - 6, bby + 4).stroke({ width: 2, color: 0x3a3a3a });
  kit.under.addChild(cover);
  hotspot(kit, new Rectangle(bbx - 10, bby - h * 0.06, bbw + 20, bbh + h * 0.07), oneAtATime((done) => {
    sfx.whoosh();
    tween(400, (t) => {
      cover.y = -t * h * 0.12;
      cover.alpha = 1 - t * 0.9;
    }, () => {
      sfx.burner();
      for (let i = 0; i < 8; i++) {
        later(i * 200, () => {
          const puff = new Graphics().circle(0, 0, rand(6, 10)).fill({ color: 0xdee2e6, alpha: 0.8 });
          const x = bbx + rand(0.2, 0.8) * bbw;
          puff.position.set(x, bby - 6);
          kit.over.addChild(puff);
          tween(1200, (t) => {
            puff.y = bby - 6 - t * h * 0.15;
            puff.x = x + Math.sin(t * 6) * 8;
            puff.scale.set(1 + t);
            puff.alpha = 0.8 * (1 - t);
          }, () => puff.destroy());
        }, cleanups);
      }
      later(2200, () => tween(400, (t) => {
        cover.y = -(1 - t) * h * 0.12;
        cover.alpha = 0.1 + t * 0.9;
      }, done), cleanups);
    });
  }));

  // --- right: two chairs under covers on the rug: a frog hops out ---
  for (const cx of [w * 1.52, w * 1.72]) {
    const cy = h * 0.8;
    const frog = new Graphics();
    frog.ellipse(0, 0, 16, 11).fill(0x52b788).stroke({ width: 2, color: INK });
    frog.circle(-7, -10, 6).circle(7, -10, 6).fill(0x52b788).stroke({ width: 2, color: INK });
    frog.circle(-7, -10, 2.5).circle(7, -10, 2.5).fill(INK);
    frog.moveTo(-6, 3).quadraticCurveTo(0, 7, 6, 3).stroke({ width: 1.5, color: INK });
    frog.position.set(cx, cy);
    frog.visible = false;
    kit.under.addChild(frog);
    const chair = new Graphics();
    chair.roundRect(cx - w * 0.04, cy - h * 0.12, w * 0.08, h * 0.13, 18).fill(0xc9b79c).stroke({ width: 3, color: INK });
    chair.moveTo(cx - w * 0.03, cy - h * 0.06).quadraticCurveTo(cx, cy - h * 0.04, cx + w * 0.03, cy - h * 0.06).stroke({ width: 2, color: 0xa89878 });
    kit.under.addChild(chair);
    tappable(chair, oneAtATime((done) => {
      sfx.boing(0.8);
      tween(250, (t) => (chair.skew.x = Math.sin(t * Math.PI * 3) * 0.08 * (1 - t)));
      frog.visible = true;
      const x0 = cx, y0 = cy;
      tween(900, (t) => {
        frog.x = x0 + t * w * 0.08;
        frog.y = y0 + 10 - Math.sin(t * Math.PI) * h * 0.14;
      }, () => {
        sfx.blub();
        later(500, () => {
          frog.visible = false;
          frog.position.set(cx, cy);
          done();
        }, cleanups);
      });
    }), new Rectangle(cx - w * 0.05, cy - h * 0.13, w * 0.1, h * 0.15));
  }

  // --- right: the outdoor TV ---
  const rx = w * 1.62, rw = w * 0.25, ry = h * 0.32;
  const scr = { x: rx + rw * 0.42, y: ry + h * 0.06, w: rw * 0.5, h: h * 0.13 };
  const tv = new Graphics();
  kit.under.addChild(tv);
  let channel = 0;
  let tvTime = 0;
  everyFrame((dt) => {
    tvTime += dt;
    tv.clear().rect(scr.x - 5, scr.y - 5, scr.w + 10, scr.h + 10).fill(0x111111);
    if (channel === 0) {
      tv.rect(scr.x, scr.y, scr.w, scr.h).fill(0x2b2d42);
    } else if (channel === 1) {
      const cols = [0xffffff, 0xffd93d, 0x4cc9f0, 0x7bd36b, 0xff8fb1, 0xe5383b];
      cols.forEach((c, i) => tv.rect(scr.x + (scr.w * i) / cols.length, scr.y, scr.w / cols.length + 1, scr.h).fill(c));
    } else {
      tv.rect(scr.x, scr.y, scr.w, scr.h).fill(0x8fd3ff);
      tv.rect(scr.x, scr.y + scr.h * 0.75, scr.w, scr.h * 0.25).fill(0x7bd36b);
      const bx = scr.x + scr.w * 0.5 + Math.sin(tvTime * 0.002) * scr.w * 0.35;
      const by = scr.y + scr.h * 0.7 - Math.abs(Math.sin(tvTime * 0.006)) * scr.h * 0.5;
      tv.circle(bx, by, scr.h * 0.1).fill(0xe5383b).stroke({ width: 1.5, color: INK });
    }
  }, cleanups);
  hotspot(kit, new Rectangle(scr.x - 10, scr.y - 10, scr.w + 20, scr.h + 20), () => {
    channel = (channel + 1) % 3;
    sfx.tvStatic();
  });

  // --- right: the hose reel on the house wall: spray the patio ---
  const reelX = w * 1.915, reelY = h * 0.6;
  const reel = new Graphics();
  reel.circle(reelX, reelY, 24).fill(0x2d6a4f).stroke({ width: 3, color: INK });
  for (let r = 8; r < 24; r += 5) reel.circle(reelX, reelY, r).stroke({ width: 2, color: 0x40916c });
  reel.moveTo(reelX - 10, reelY + 22).bezierCurveTo(reelX - 20, reelY + 60, reelX - 50, reelY + 50, reelX - 60, reelY + 80).stroke({ width: 5, color: 0x2d6a4f });
  kit.under.addChild(reel);
  tappable(reel, oneAtATime((done) => {
    sfx.water(1.8);
    spray(kit, reelX - 60, reelY + 76, -0.35, -0.45, 1600, 0x6ec6ff, h * 0.95);
    later(1900, done, cleanups);
  }), new Rectangle(reelX - 70, reelY - 30, 100, 120));
}
