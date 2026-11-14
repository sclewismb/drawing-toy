import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { burst, hearts } from '../fx';
import { BOWS, bowSwatch, PAPERS, paperStrip, randomWrap, renderGift, RIBBONS } from '../giftArt';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { wrapShopLayout } from '../wrapShop';
import { everyFrame, glow, hotspot, INK, later, oneAtATime, rand, tappable, tumble, type Cleanups, type EggKit } from './common';
import { bird, catFace, dangler, flier, mouseFace, peeker, pick, puppy, spider, wallClock } from './hidden';

/**
 * The Christmas wrapping shop:
 *  - the empty box on the counter: drop anything in (or tap the box and the
 *    nearest thing hops in) and the wrapping screen opens. Once it's wrapped
 *    the present pops up, then flies into the sleigh's sack, off to the
 *    house's Christmas tree (main.ts puts it under the tree in the lounge).
 *  - the elf behind the counter: hops, jingles, throws confetti, and cheers
 *    every present
 *  - the sleigh rocks and jingles; the sack wiggles and rattles
 *  - snow falls past the window: tap for a flurry, a snowball, or a snowman peeking in
 *  - ribbon spools spin and drop a curl of ribbon; paper rolls jump in their bin;
 *    the barrel of bows pops bows up into the air
 *  - the paper roll on the counter unrolls a sheet (a new paper each time),
 *    the tape zips, the scissors snip
 *  - shelves of wrapped presents rattle (a puppy is hiding behind one)
 *  - hidden: a mouse in a little box, a spider, a cat in the box by the door,
 *    a robin that flies about, the clock
 */
export function wrapShop(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = wrapShopLayout(w, h);
  const fy = L.fy;
  const s = h / 800;
  const top = L.counter.top - 14; // the counter's top
  const pictureSprite = (pic: HTMLCanvasElement, height: number) => {
    const sp = new Sprite(Texture.from(pic));
    sp.anchor.set(0.5, 1);
    sp.scale.set(height / pic.height);
    return sp;
  };

  window_(kit, cleanups, L);
  const elf = shopElf(kit, cleanups, L.elf.x, top, h * 0.24);

  // --- the sleigh, with its sack (presents fly into it) ---
  const sl = L.sleigh;
  const sw = sl.x1 - sl.x0, sh = h * 0.12;
  const sleigh = new Container();
  sleigh.position.set((sl.x0 + sl.x1) / 2, sl.y);
  kit.under.addChild(sleigh);
  const runners = new Graphics();
  const runner = (g: Graphics) => {
    g.moveTo(-sw * 0.46, 0).lineTo(sw * 0.36, 0).quadraticCurveTo(sw * 0.52, 0, sw * 0.5, -sh * 0.38).quadraticCurveTo(sw * 0.48, -sh * 0.55, sw * 0.42, -sh * 0.42);
  };
  runner(runners);
  runners.stroke({ width: 13, color: INK, cap: 'round', join: 'round' });
  runner(runners);
  runners.stroke({ width: 8, color: 0xf2c94c, cap: 'round', join: 'round' });
  for (const x of [-sw * 0.32, 0, sw * 0.26]) runners.rect(x - 4, -sh * 0.3, 8, sh * 0.3).fill(0xf2c94c).stroke({ width: 2.5, color: INK });
  sleigh.addChild(runners);
  // the sack sits in the back
  const sack = new Container();
  const sackW = sw * 0.34, sackH = sh * 1.25;
  sack.position.set(-sw * 0.2, -sh * 0.6);
  const sackG = new Graphics();
  sackG.moveTo(-sackW * 0.15, -sackH * 0.92).bezierCurveTo(-sackW * 0.75, -sackH * 0.75, -sackW * 0.62, 0, 0, 0).bezierCurveTo(sackW * 0.62, 0, sackW * 0.75, -sackH * 0.75, sackW * 0.15, -sackH * 0.92).closePath().fill(0xb07d4f).stroke({ width: 4, color: INK });
  sackG.moveTo(-sackW * 0.3, -sackH * 0.55).quadraticCurveTo(-sackW * 0.1, -sackH * 0.4, -sackW * 0.25, -sackH * 0.2).stroke({ width: 2.5, color: 0x8d5a3b });
  sackG.moveTo(sackW * 0.32, -sackH * 0.6).quadraticCurveTo(sackW * 0.15, -sackH * 0.45, sackW * 0.3, -sackH * 0.25).stroke({ width: 2.5, color: 0x8d5a3b });
  // presents peeking out of the top
  for (const [dx, col, k] of [[-0.18, 0x4ea8ff, 1], [0.12, 0x2f9e44, 0.8], [-0.02, 0xd64550, 0.9]] as const) {
    const pw = sackW * 0.26 * k;
    sackG.rect(sackW * dx - pw / 2, -sackH * 0.92 - pw * 0.9, pw, pw).fill(col).stroke({ width: 2.5, color: INK });
    sackG.rect(sackW * dx - 3, -sackH * 0.92 - pw * 0.9, 6, pw).fill(0xf2c94c);
  }
  sackG.ellipse(0, -sackH * 0.88, sackW * 0.2, 7).fill(0x8d5a3b).stroke({ width: 3, color: INK }); // the gathered neck
  sackG.moveTo(-sackW * 0.12, -sackH * 0.86).quadraticCurveTo(-sackW * 0.3, -sackH * 0.7, -sackW * 0.22, -sackH * 0.6).stroke({ width: 4, color: 0xd64550 }); // its tie
  sack.addChild(sackG);
  sleigh.addChild(sack);
  const body = new Graphics();
  body.moveTo(-sw * 0.45, -sh * 0.25).lineTo(sw * 0.3, -sh * 0.25)
    .quadraticCurveTo(sw * 0.47, -sh * 0.3, sw * 0.43, -sh * 0.8)
    .quadraticCurveTo(sw * 0.41, -sh * 1.08, sw * 0.3, -sh * 0.96)
    .quadraticCurveTo(sw * 0.1, -sh * 0.62, -sw * 0.05, -sh * 0.58)
    .lineTo(-sw * 0.36, -sh * 0.58)
    .quadraticCurveTo(-sw * 0.44, -sh * 0.9, -sw * 0.43, -sh * 1.3)
    .quadraticCurveTo(-sw * 0.52, -sh * 1.36, -sw * 0.5, -sh * 1.05)
    .closePath().fill(0xd64550).stroke({ width: 4, color: INK });
  body.moveTo(-sw * 0.4, -sh * 0.42).bezierCurveTo(-sw * 0.2, -sh * 0.32, sw * 0.05, -sh * 0.5, sw * 0.32, -sh * 0.4).stroke({ width: 5, color: 0xf2c94c, cap: 'round' });
  body.circle(sw * 0.33, -sh * 0.86, 7).stroke({ width: 4, color: 0xf2c94c });
  for (const x of [-sw * 0.25, -sw * 0.05, sw * 0.15]) body.circle(x, -sh * 0.38, 4.5).fill(0xf2c94c).stroke({ width: 1.5, color: INK }); // little bells
  sleigh.addChild(body);
  const sackTop = () => ({ x: sleigh.x + sack.x, y: sleigh.y + sack.y - sackH * 0.95 });
  const wiggleSack = (big = false) => {
    tween(big ? 900 : 650, (t) => {
      const k = Math.sin(t * Math.PI * (big ? 5 : 4)) * (1 - t);
      sack.scale.set(1 + k * (big ? 0.14 : 0.08), 1 - k * (big ? 0.1 : 0.06));
      sack.rotation = k * 0.08;
    }, () => (sack.scale.set(1), (sack.rotation = 0)));
  };
  hotspot(kit, new Rectangle(sl.x0, sl.y - sh * 1.4, sw, sh * 1.5), oneAtATime((done) => {
    sfx.sleighBells();
    tween(1100, (t) => (sleigh.rotation = Math.sin(t * Math.PI * 4) * 0.06 * (1 - t)), () => ((sleigh.rotation = 0), done()));
  }));
  // the sack on its own (added after the sleigh's spot, so it wins)
  const sackHit = new Container();
  kit.under.addChild(sackHit);
  tappable(sackHit, oneAtATime((done) => {
    sfx.rattle();
    wiggleSack();
    // a present pops up out of the top and drops back in
    const p = pictureSprite(renderGift(randomWrap(rand(0.8, 1.3))), h * 0.07);
    const st = sackTop();
    p.position.set(st.x, st.y + 10);
    kit.under.addChildAt(p, kit.under.getChildIndex(sleigh));
    tween(900, (t) => (p.y = st.y + 10 - Math.sin(t * Math.PI) * h * 0.1), () => (p.destroy(), done()));
  }), new Rectangle(sleigh.x + sack.x - sackW * 0.6, sleigh.y + sack.y - sackH * 1.1, sackW * 1.2, sackH * 1.1));

  // --- the box on the counter: drop something in to wrap it ---
  const B = L.box;
  const bw = Math.min(0.11 * w, h * 0.17), bh = bw * 0.6;
  const boxC = new Container();
  boxC.position.set(B.x, top);
  const hint = new Graphics();
  boxC.addChild(hint);
  const boxG = new Graphics();
  const d = bw * 0.22;
  boxG.poly([-bw / 2, -bh, -bw / 2 + d, -bh - d * 0.6, bw / 2 + d, -bh - d * 0.6, bw / 2, -bh]).fill(0x8a5a2b).stroke({ width: 3, color: INK }); // the inside
  boxG.poly([-bw / 2, -bh, -bw / 2 - bw * 0.22, -bh - bh * 0.45, -bw / 2 + d * 0.3, -bh - bh * 0.5, -bw / 2 + d, -bh - d * 0.6]).fill(0xe6b981).stroke({ width: 3, color: INK }); // flaps open
  boxG.poly([bw / 2 + d, -bh - d * 0.6, bw / 2 + d + bw * 0.2, -bh - bh * 0.5, bw / 2 + bw * 0.12, -bh - bh * 0.2, bw / 2, -bh]).fill(0xe6b981).stroke({ width: 3, color: INK });
  boxG.poly([bw / 2, -bh, bw / 2 + d, -bh - d * 0.6, bw / 2 + d, -d * 0.6, bw / 2, 0]).fill(0xc29158).stroke({ width: 3, color: INK }); // its side
  boxG.rect(-bw / 2, -bh, bw, bh).fill(0xd9a86c).stroke({ width: 3, color: INK }); // its front
  boxG.rect(-bw * 0.08, -bh, bw * 0.16, bh * 0.25).fill({ color: 0xfff0c8, alpha: 0.7 }); // tape
  boxC.addChild(boxG);
  kit.under.addChild(boxC);
  // a soft glow round the box now and then: put something in here!
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    hint.clear();
    const k = Math.max(0, Math.sin(time * 0.0025));
    if (k > 0.01 && !busy) glow(hint, d * 0.5, -bh * 0.9, bw * 0.75, 0xfff3b0, k * 1.6);
  }, cleanups);

  let busy = false;
  const hopBox = () => tween(500, (t) => boxC.scale.set(1 + Math.sin(t * Math.PI) * 0.12, 1 - Math.sin(t * Math.PI * 2) * 0.1 * (1 - t)), () => boxC.scale.set(1));
  /** Fly the wrapped present into the sleigh's sack. */
  const send = (pic: HTMLCanvasElement) => {
    const p = pictureSprite(pic, h * 0.15);
    p.position.set(B.x, top - bh * 0.4);
    p.scale.set(0.01);
    const full = (h * 0.15) / pic.height;
    kit.over.addChild(p);
    sfx.pop(1.1);
    elf.cheer();
    tween(380, (t) => p.scale.set(full * ease.outBack(t)), () => {
      burst(kit.sparkles, p.x, p.y - h * 0.08, 12, 90);
      later(650, () => {
        busy = false;
        const from = { x: p.x, y: p.y };
        const to = sackTop();
        sfx.whoosh();
        tween(1100, (t) => {
          const e = ease.inOutSine(t);
          p.x = from.x + (to.x - from.x) * e;
          p.y = from.y + (to.y - from.y) * e - Math.sin(t * Math.PI) * h * 0.3;
          p.rotation = t * Math.PI * 2;
          p.scale.set(full * (1 - 0.55 * t));
        }, () => {
          p.destroy();
          sfx.sleighBells();
          wiggleSack(true);
          burst(kit.sparkles, to.x, to.y, 14, 100);
          hearts(kit.sparkles, to.x, to.y - 20, 5);
          trailHome(to);
        });
      }, cleanups);
    });
  };
  /** A twinkle flies from the sack up to the picture of the house over the door. */
  const trailHome = (from: { x: number; y: number }) => {
    const star = new Graphics().star(0, 0, 5, 14, 6).fill(0xffd43b).stroke({ width: 2, color: INK });
    kit.over.addChild(star);
    const to = L.house;
    tween(1400, (t) => {
      star.x = from.x + (to.x - from.x) * t;
      star.y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * h * 0.12;
      star.rotation = t * 6;
    }, () => {
      star.destroy();
      sfx.twinkle();
      burst(kit.sparkles, to.x, to.y, 10, 70);
    });
  };
  const start = (ch: unknown) => {
    if (busy || !kit.gifts) return false;
    busy = true;
    hopBox();
    const ok = kit.gifts.wrap(ch, { x: B.x + d * 0.5, y: top - bh * 0.7 }, (pic) => {
      if (pic) send(pic);
      else busy = false;
    });
    if (!ok) busy = false;
    return ok;
  };
  kit.secrets?.lock({
    accepts: ['*'],
    wants: (ch) => !busy && !!kit.gifts?.canWrap(ch),
    area: () => ({ x: B.x - bw * 1.2, y: top - h * 0.34, w: bw * 2.4, h: h * 0.34 + 20 }),
    open: (_name, ch) => {
      start(ch);
      return true; // (it's ours now: main hides it in the box, it isn't used up)
    },
  });
  hotspot(kit, new Rectangle(B.x - bw * 0.75, top - bh - d - 10, bw * 1.5, bh + d + 14), () => {
    if (busy) return;
    // the nearest thing hops in; with nothing about, the box just bounces (put something in me!)
    const near = kit.gifts?.nearest({ x: B.x, y: top }, w * 0.55);
    if (near && start(near)) return;
    sfx.boing(1.3);
    hopBox();
    burst(kit.sparkles, B.x, top - bh, 8, 60);
  });

  // --- the paper roll on its stand at the end of the counter: a sheet unrolls (a new paper each time) ---
  const rl = L.roll;
  const rollH = h * 0.06, rollW = Math.min(0.09 * w, h * 0.14);
  const stand = new Graphics();
  for (const k of [-1, 1]) stand.poly([rl.x + k * rollW * 0.55, top, rl.x + k * rollW * 0.48, top - rollH * 1.3, rl.x + k * rollW * 0.42, top]).fill(0x8d5a3b).stroke({ width: 2.5, color: INK });
  kit.under.addChild(stand);
  let paperIx = 0;
  const sheet = new Container();
  kit.under.addChild(sheet);
  const roll = new Container();
  roll.position.set(rl.x, top - rollH * 1.2);
  kit.under.addChild(roll);
  const drawRoll = () => {
    for (const c of roll.removeChildren()) c.destroy();
    const sp = new Sprite(Texture.from(paperStrip(PAPERS[paperIx].id, rollW, rollH)));
    sp.anchor.set(0.5);
    const outline = new Graphics().rect(-rollW / 2, -rollH / 2, rollW, rollH).stroke({ width: 3, color: INK });
    outline.ellipse(rollW / 2, 0, 6, rollH / 2).fill(0xf1f3f5).stroke({ width: 2.5, color: INK });
    roll.addChild(sp, outline);
  };
  drawRoll();
  hotspot(kit, new Rectangle(rl.x - rollW * 0.6, top - rollH * 2, rollW * 1.2, rollH * 2), oneAtATime((done) => {
    paperIx = (paperIx + 1) % PAPERS.length;
    drawRoll();
    sfx.crinkle();
    const long = (B.x - bw * 0.7) - rl.x;
    const strip = new Sprite(Texture.from(paperStrip(PAPERS[paperIx].id, long, 8)));
    strip.anchor.set(0, 1);
    strip.position.set(rl.x, top);
    sheet.addChild(strip);
    tween(500, (t) => (strip.scale.x = ease.outCubic(t)), () => later(700, () => {
      sfx.zip();
      tween(300, (t) => (strip.scale.x = 1 - t), () => (strip.destroy(), done()));
    }, cleanups));
  }));

  // --- the tape dispenser and the scissors ---
  const tp = L.tape;
  const tape = new Graphics();
  tape.roundRect(tp.x - 22 * s * 1.4, top - 26 * s * 1.4, 44 * s * 1.4, 26 * s * 1.4, 8).fill(0x3d5a98).stroke({ width: 3, color: INK });
  tape.circle(tp.x - 4, top - 18 * s * 1.4, 12 * s * 1.4).fill({ color: 0xf1f3f5, alpha: 0.9 }).stroke({ width: 2.5, color: INK });
  tape.poly([tp.x + 18 * s * 1.4, top - 24 * s * 1.4, tp.x + 34 * s * 1.4, top - 26 * s * 1.4, tp.x + 31 * s * 1.4, top - 16 * s * 1.4]).fill(0xadb5bd).stroke({ width: 2, color: INK });
  kit.under.addChild(tape);
  hotspot(kit, new Rectangle(tp.x - 40 * s, top - 50 * s, 90 * s, 54 * s), oneAtATime((done) => {
    sfx.zip();
    const bit = new Graphics().rect(-16, -5, 32, 10).fill({ color: 0xfff8dc, alpha: 0.85 }).stroke({ width: 1.5, color: 0xbfb08a });
    tumble(kit, bit, tp.x + 30 * s, top - 30 * s, fy + h * 0.1, { vx: 0.12, vy: -0.45, spin: 6 });
    later(500, done, cleanups);
  }));
  const sc = L.scissors;
  const blades = [new Graphics(), new Graphics()];
  const scissors = new Container();
  scissors.position.set(sc.x + 18 * s, top - 8 * s);
  for (const [i, b] of blades.entries()) {
    b.circle(-22 * s, i ? 8 * s : -8 * s, 9 * s).stroke({ width: 5, color: 0xe03131 });
    b.poly([-14 * s, i ? 4 * s : -4 * s, 30 * s, 0, -12 * s, 0]).fill(0xced4da).stroke({ width: 2, color: INK });
    scissors.addChild(b);
  }
  scissors.addChild(new Graphics().circle(-12 * s, 0, 3).fill(INK));
  kit.under.addChild(scissors);
  hotspot(kit, new Rectangle(sc.x - 20 * s, top - 30 * s, 70 * s, 36 * s), oneAtATime((done) => {
    sfx.snip();
    tween(500, (t) => {
      const a = Math.abs(Math.sin(t * Math.PI * 2)) * 0.45;
      blades[0].rotation = -a;
      blades[1].rotation = a;
    }, () => {
      blades[0].rotation = blades[1].rotation = 0;
      const p = pick(PAPERS);
      for (let i = 0; i < 4; i++) {
        const bit = new Graphics().rect(-7, -5, 14, 10).fill(p.colours[i % p.colours.length]).stroke({ width: 1.5, color: INK });
        tumble(kit, bit, sc.x + 30 * s, top - 10, fy + h * rand(0.05, 0.2), { vx: rand(-0.1, 0.15), vy: rand(-0.4, -0.2) });
      }
      done();
    });
  }));

  // --- shelves of wrapped presents (they rattle; a puppy is hiding behind one) ---
  let n = 0;
  for (const side of [L.shelfL, L.shelfR]) {
    for (const y of L.shelves) {
      for (let i = 0; i < 2; i++) {
        const x = side.x0 + ((side.x1 - side.x0) * (i + 0.5)) / 2;
        const holder = new Container();
        holder.position.set(x, y + 1);
        const puppyHere = n++ === 7;
        let pup: Container | null = null;
        if (puppyHere) {
          pup = new Container();
          const pg = new Graphics();
          puppy(s * 0.9)(pg);
          pup.addChild(pg);
          pup.y = 0;
          holder.addChild(pup);
        }
        const gift = pictureSprite(renderGift(randomWrap(rand(0.75, 1.4))), h * rand(0.075, 0.1));
        holder.addChild(gift);
        kit.under.addChild(holder);
        tappable(holder, oneAtATime((done) => {
          if (pup && Math.random() < 0.6) {
            sfx.woof();
            tween(1500, (t) => (pup!.y = -Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) * h * 0.06 * (t > 0.75 ? (1 - t) / 0.25 : 1)), done);
            return;
          }
          sfx.rattle();
          tween(700, (t) => {
            const k = Math.sin(t * Math.PI * 6) * (1 - t);
            gift.rotation = k * 0.18;
            gift.y = -Math.abs(k) * 8;
          }, () => ((gift.rotation = 0), (gift.y = 0), done()));
        }), new Rectangle(-h * 0.06, -h * 0.11, h * 0.12, h * 0.11));
      }
    }
  }

  // --- the ribbon wall: spools on pegs (they spin and drop a curl of ribbon) ---
  const pb = L.pegboard;
  const spoolR = Math.min(pb.w / 10, pb.h / 6);
  for (let i = 0; i < 8; i++) {
    const rib = RIBBONS[i];
    const x = pb.x + pb.w * (0.14 + (i % 4) * 0.24), y = pb.y + pb.h * (i < 4 ? 0.3 : 0.74);
    const spool = new Graphics();
    spool.circle(0, 0, spoolR).fill(rib.fill).stroke({ width: 3, color: INK });
    spool.circle(0, 0, spoolR * 0.7).stroke({ width: 1.5, color: rib.dark });
    spool.circle(0, 0, spoolR * 0.35).fill(0xdeb887).stroke({ width: 2.5, color: INK });
    spool.circle(0, 0, spoolR * 0.1).fill(INK);
    spool.rect(-2, -spoolR * 0.95, 4, spoolR * 0.25).fill(rib.shine); // a mark, to see it spin
    spool.position.set(x, y);
    kit.under.addChild(spool);
    const tail = new Graphics().moveTo(spoolR * 0.9, 0).quadraticCurveTo(spoolR * 1.2, spoolR * 0.8, spoolR * 0.8, spoolR * 1.3).stroke({ width: 5, color: rib.fill });
    tail.position.set(x, y);
    kit.under.addChild(tail);
    tappable(spool, oneAtATime((done) => {
      sfx.whirr();
      tween(900, (t) => (spool.rotation = ease.outCubic(t) * Math.PI * 6), () => {
        spool.rotation = 0;
        done();
      });
      const curl = new Graphics();
      curl.moveTo(0, 0);
      for (let k = 0; k <= 40; k++) curl.lineTo(k * 1.8, Math.sin(k * 0.45) * 10);
      curl.stroke({ width: 6, color: rib.fill });
      tumble(kit, curl, x + spoolR, y, fy + h * rand(0.05, 0.2), { vx: rand(-0.05, 0.12), vy: -0.1, spin: rand(-3, 3) });
    }), new Rectangle(-spoolR * 1.2, -spoolR * 1.2, spoolR * 2.4, spoolR * 2.4));
  }

  // --- the bin of paper rolls (they jump) ---
  const bin = L.bin;
  const binW = bin.x1 - bin.x0;
  for (let i = 0; i < 7; i++) {
    const p = PAPERS[(i * 3 + 2) % PAPERS.length];
    const rw = binW / 9, rh = h * rand(0.26, 0.34);
    const x = bin.x0 + binW * (0.1 + i * 0.13);
    const c = new Container();
    c.position.set(x, fy);
    const sp = new Sprite(Texture.from(paperStrip(p.id, rw, rh)));
    sp.anchor.set(0.5, 1);
    c.addChild(sp, new Graphics().rect(-rw / 2, -rh, rw, rh).stroke({ width: 2.5, color: INK }).ellipse(0, -rh, rw / 2, 4).fill(0xf1f3f5).stroke({ width: 2, color: INK }));
    c.rotation = rand(-0.08, 0.08);
    kit.under.addChild(c);
    const r0 = c.rotation;
    tappable(c, oneAtATime((done) => {
      sfx.crinkle();
      tween(700, (t) => {
        c.y = fy - Math.sin(t * Math.PI) * h * 0.1;
        c.rotation = r0 + Math.sin(t * Math.PI * 2) * 0.25;
      }, () => ((c.y = fy), (c.rotation = r0), done()));
    }), new Rectangle(-rw, -rh, rw * 2, rh));
  }
  const binFront = new Graphics();
  binFront.rect(bin.x0 - 6, bin.top, binW + 12, fy - bin.top + 4).fill(0xa0703c).stroke({ width: 4, color: INK });
  for (const k of [0.25, 0.7]) binFront.rect(bin.x0 - 6, bin.top + (fy - bin.top) * k, binW + 12, 7).fill(0x6c757d).stroke({ width: 2, color: INK });
  kit.under.addChild(binFront);

  // --- the barrel of bows: they pop up into the air ---
  const bb = L.bows;
  const barrel = new Graphics();
  barrel.moveTo(bb.x - bb.r, bb.y - bb.r * 1.3).quadraticCurveTo(bb.x - bb.r * 1.2, bb.y - bb.r * 0.6, bb.x - bb.r, bb.y).lineTo(bb.x + bb.r, bb.y).quadraticCurveTo(bb.x + bb.r * 1.2, bb.y - bb.r * 0.6, bb.x + bb.r, bb.y - bb.r * 1.3).closePath().fill(0xb7794a).stroke({ width: 4, color: INK });
  for (const k of [0.3, 0.95]) barrel.rect(bb.x - bb.r * 1.08, bb.y - bb.r * k - 4, bb.r * 2.16, 8).fill(0x868e96).stroke({ width: 2, color: INK });
  const bowsOnTop = new Container();
  const tops: Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const b = pictureSprite(bowSwatch(BOWS[i % BOWS.length], RIBBONS[(i * 3) % RIBBONS.length].id, 100), bb.r * 0.75);
    b.anchor.set(0.5, 0.6);
    b.position.set(bb.x - bb.r * 0.65 + i * bb.r * 0.33, bb.y - bb.r * 1.3 + (i % 2 ? -4 : 4));
    b.rotation = rand(-0.4, 0.4);
    tops.push(b);
    bowsOnTop.addChild(b);
  }
  kit.under.addChild(bowsOnTop, barrel);
  hotspot(kit, new Rectangle(bb.x - bb.r * 1.2, bb.y - bb.r * 1.8, bb.r * 2.4, bb.r * 1.8), oneAtATime((done) => {
    tops.forEach((b, i) => {
      const x0 = b.x, y0 = b.y, vx = rand(-0.12, 0.12), up = h * rand(0.2, 0.35), spin = rand(-8, 8);
      later(i * 90, () => {
        sfx.pop(1 + i * 0.1);
        tween(1000, (t) => {
          b.x = x0 + vx * t * 1000 * (1 - t);
          b.y = y0 - Math.sin(t * Math.PI) * up;
          b.rotation = spin * t * (1 - t);
        }, () => ((b.x = x0), (b.y = y0)));
      }, cleanups);
    });
    later(1500, done, cleanups);
  }));

  // --- the wreath on the door ---
  const dr = L.door;
  const wreath = new Graphics();
  const wx = dr.x + dr.w / 2, wy = dr.y + (fy - dr.y) * 0.22, wr = dr.w * 0.17;
  wreath.circle(wx, wy, wr).stroke({ width: wr * 0.5, color: 0x2f7a4f });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    wreath.circle(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr, 4).fill(i % 2 ? 0xe03131 : 0xffd43b);
  }
  wreath.circle(wx, wy, wr * 1.25).stroke({ width: 2, color: INK, alpha: 0.4 });
  kit.under.addChild(wreath);
  const bow = pictureSprite(bowSwatch('classic', 'red', 100), wr * 0.9);
  bow.position.set(wx, wy + wr * 1.15);
  kit.under.addChild(bow);
  tappable(wreath, oneAtATime((done) => {
    sfx.jingle();
    burst(kit.sparkles, wx, wy, 10, 70);
    later(800, done, cleanups);
  }), new Rectangle(wx - wr * 1.4, wy - wr * 1.4, wr * 2.8, wr * 2.8));

  // --- hidden things ---
  // a mouse in a little open box on the floor
  peeker(kit, cleanups, {
    x: -0.3 * w, y: fy + h * 0.1 - 30 * s, rise: 46 * s, // (y = the top of the little box)
    who: mouseFace(s),
    back: (g) => g.rect(-28 * s, -5 * s, 56 * s, 6 * s).fill(0x8a5a2b),
    front: (g) => g.rect(-30 * s, 0, 60 * s, 30 * s).fill(0xd9a86c).stroke({ width: 3, color: INK }).rect(-30 * s, 0, 60 * s, 8 * s).fill(0x4ea8ff),
    hole: (g) => g.rect(-60 * s, -120 * s, 120 * s, 120 * s).fill(0xffffff),
    hit: new Rectangle(-36 * s, -50 * s, 72 * s, 82 * s),
    sound: () => sfx.squeak(1.6),
  });
  // a spider comes down on its thread over the ribbon wall
  dangler(kit, cleanups, { x: -0.05 * w, top: 0, drop: h * 0.3, who: spider(s), size: 30 * s, sound: () => sfx.giggle(1.6) });
  // a cat in the box by the door
  peeker(kit, cleanups, {
    x: 1.3 * w, y: fy + h * 0.08 - 54 * s, rise: 70 * s, // (y = the top of the box)
    who: catFace(s, 0x868e96),
    rare: (g) => {
      bird(s, 0xe03131)(g);
    },
    back: (g) => g.poly([-46 * s, 0, -30 * s, -12 * s, 54 * s, -12 * s, 40 * s, 0]).fill(0x8a5a2b).stroke({ width: 3, color: INK }),
    front: (g) => g.rect(-46 * s, 0, 86 * s, 54 * s).fill(0xd9a86c).stroke({ width: 3, color: INK }),
    hole: (g) => g.rect(-80 * s, -200 * s, 160 * s, 200 * s).fill(0xffffff),
    hit: new Rectangle(-50 * s, -70 * s, 100 * s, 126 * s),
    sound: () => sfx.meow(),
    rareSound: () => sfx.chirp(),
  });
  // a robin flits about the shop
  flier(kit, cleanups, {
    rests: [
      { x: L.window.x + 24, y: L.window.y + L.window.h + 4 },
      { x: L.shelfL.x0 + 14, y: L.shelves[0] },
      { x: L.door.x + L.door.w * 0.8, y: L.door.y - 12 },
      { x: L.pegboard.x + L.pegboard.w * 0.8, y: L.pegboard.y },
    ],
    who: bird(s, 0xd64550),
    size: 26 * s,
    area: { x0: -0.5 * w, x1: 1.6 * w, y0: h * 0.05, y1: h * 0.5 },
    sound: () => sfx.chirp(),
  });
  wallClock(kit, cleanups, 1.25 * w, h * 0.24, Math.min(0.04 * w, h * 0.06), 0xd64550);
}

/** Snow falling past the window: tap for a flurry, a snowball, or a snowman peeking in. */
function window_(kit: EggKit, cleanups: Cleanups, L: ReturnType<typeof wrapShopLayout>) {
  const wn = L.window;
  const outside = new Container();
  const mask = new Graphics().rect(wn.x, wn.y, wn.w, wn.h).fill(0xffffff);
  outside.mask = mask;
  kit.under.addChild(mask, outside);
  const snowman = new Container();
  const sm = new Graphics();
  const r = wn.h * 0.2;
  sm.circle(0, 0, r).fill(0xffffff).stroke({ width: 3, color: INK });
  sm.circle(-r * 0.35, -r * 0.15, r * 0.1).circle(r * 0.35, -r * 0.15, r * 0.1).fill(INK);
  sm.poly([0, 0, r * 0.6, r * 0.12, 0, r * 0.2]).fill(0xff922b).stroke({ width: 1.5, color: INK });
  for (let i = -2; i <= 2; i++) sm.circle(i * r * 0.16, r * 0.5 - Math.abs(i) * r * 0.05, r * 0.05).fill(INK);
  sm.rect(-r * 0.6, -r * 1.05, r * 1.2, r * 0.14).fill(0x212529);
  sm.rect(-r * 0.4, -r * 1.75, r * 0.8, r * 0.75).fill(0x212529).rect(-r * 0.4, -r * 1.2, r * 0.8, r * 0.12).fill(0xd64550);
  snowman.addChild(sm);
  const smX = wn.x + wn.w * 0.3, smDown = wn.y + wn.h + r * 2;
  snowman.position.set(smX, smDown);
  outside.addChild(snowman);
  const snow = new Graphics();
  outside.addChild(snow);
  const splats = new Container();
  kit.under.addChild(splats);
  const flakes = Array.from({ length: 28 }, () => ({ x: Math.random(), y: Math.random(), r: rand(2, 4.5), sp: rand(0.00004, 0.00009), ph: rand(0, 6) }));
  let flurry = 0;
  everyFrame((dt) => {
    flurry = Math.max(0, flurry - dt / 2500);
    snow.clear();
    for (const f of flakes) {
      f.y += f.sp * dt * (1 + flurry * 5);
      f.x += (0.00002 + flurry * 0.0003) * dt;
      if (f.y > 1) (f.y = 0), (f.x = Math.random());
      const fx = (((f.x + Math.sin(f.y * 8 + f.ph) * 0.03) % 1) + 1) % 1;
      snow.circle(wn.x + fx * wn.w, wn.y + f.y * wn.h, f.r).fill(0xffffff);
    }
  }, cleanups);
  let turn = 0;
  hotspot(kit, new Rectangle(wn.x, wn.y, wn.w, wn.h), oneAtATime((done) => {
    const what = turn++ % 3;
    if (what === 0) {
      sfx.whoosh();
      flurry = 1;
      later(1200, done, cleanups);
    } else if (what === 1) {
      // splat! a snowball hits the glass and slides down
      sfx.puff(0.8);
      later(250, () => sfx.giggle(1.5), cleanups);
      const x = wn.x + wn.w * rand(0.25, 0.75), y = wn.y + wn.h * rand(0.25, 0.55);
      const splat = new Graphics();
      splat.circle(0, 0, 20).fill(0xffffff);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        splat.circle(Math.cos(a) * 22, Math.sin(a) * 22, rand(5, 9)).fill(0xffffff);
      }
      splat.position.set(x, y);
      splats.addChild(splat);
      tween(2200, (t) => {
        splat.y = y + t * 30;
        splat.scale.set(1, 1 + t * 0.3);
        splat.alpha = t > 0.6 ? (1 - t) / 0.4 : 1;
      }, () => (splat.destroy(), done()));
    } else {
      // a snowman peeks in
      sfx.giggle(1.1);
      tween(1800, (t) => {
        const up = t < 0.25 ? ease.outBack(t / 0.25) : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
        snowman.y = smDown - up * r * 2.4;
        snowman.rotation = Math.sin(t * Math.PI * 4) * 0.08;
      }, () => ((snowman.y = smDown), done()));
    }
  }));
}

/** The shop's elf, behind the counter (only the top half shows). */
function shopElf(kit: EggKit, cleanups: Cleanups, x: number, counterTop: number, size: number) {
  const c = new Container();
  c.position.set(x, counterTop);
  const mask = new Graphics().rect(x - size, counterTop - size * 2, size * 2, size * 2 - 2).fill(0xffffff);
  c.mask = mask;
  kit.under.addChild(mask, c);
  const e = size;
  const g = new Graphics();
  // body: a red top with a fluffy white collar and a belt
  g.roundRect(-e * 0.24, -e * 0.48, e * 0.48, e * 0.62, e * 0.12).fill(0xd64550).stroke({ width: 3, color: INK });
  g.rect(-e * 0.24, -e * 0.12, e * 0.48, e * 0.07).fill(0x212529);
  g.rect(-e * 0.05, -e * 0.13, e * 0.1, e * 0.09).fill(0xf2c94c).stroke({ width: 2, color: INK });
  // arms resting on the counter
  for (const k of [-1, 1]) {
    g.moveTo(k * e * 0.2, -e * 0.4).quadraticCurveTo(k * e * 0.34, -e * 0.2, k * e * 0.3, -e * 0.02).stroke({ width: e * 0.1, color: INK, cap: 'round' });
    g.moveTo(k * e * 0.2, -e * 0.4).quadraticCurveTo(k * e * 0.34, -e * 0.2, k * e * 0.3, -e * 0.02).stroke({ width: e * 0.07, color: 0xd64550, cap: 'round' });
    g.circle(k * e * 0.3, -e * 0.01, e * 0.05).fill(0xffd9b8).stroke({ width: 2, color: INK });
  }
  // collar
  for (let i = -3; i <= 3; i++) g.circle(i * e * 0.06, -e * 0.47, e * 0.05).fill(0xffffff).stroke({ width: 1.5, color: 0xced4da });
  // ears, head, face
  for (const k of [-1, 1]) g.poly([k * e * 0.13, -e * 0.7, k * e * 0.3, -e * 0.82, k * e * 0.14, -e * 0.6]).fill(0xffd9b8).stroke({ width: 2.5, color: INK });
  g.circle(0, -e * 0.68, e * 0.16).fill(0xffd9b8).stroke({ width: 3, color: INK });
  g.circle(-e * 0.06, -e * 0.7, e * 0.022).circle(e * 0.06, -e * 0.7, e * 0.022).fill(INK);
  g.circle(-e * 0.1, -e * 0.63, e * 0.03).circle(e * 0.1, -e * 0.63, e * 0.03).fill({ color: 0xff8fab, alpha: 0.7 });
  g.moveTo(-e * 0.05, -e * 0.6).quadraticCurveTo(0, -e * 0.55, e * 0.05, -e * 0.6).stroke({ width: 2.5, color: INK, cap: 'round' });
  g.circle(0, -e * 0.655, e * 0.022).fill(0xf4a582);
  // hair peeking out
  g.circle(-e * 0.12, -e * 0.78, e * 0.04).circle(e * 0.12, -e * 0.78, e * 0.04).fill(0xa0522d);
  c.addChild(g);
  // the hat (it flops about by itself)
  const hat = new Graphics();
  hat.moveTo(-e * 0.17, 0).quadraticCurveTo(-e * 0.05, -e * 0.42, e * 0.3, -e * 0.3).quadraticCurveTo(e * 0.05, -e * 0.2, e * 0.17, 0).closePath().fill(0x2f9e44).stroke({ width: 3, color: INK });
  hat.roundRect(-e * 0.2, -e * 0.05, e * 0.4, e * 0.08, e * 0.04).fill(0xffffff).stroke({ width: 2, color: INK });
  hat.circle(e * 0.31, -e * 0.3, e * 0.045).fill(0xf2c94c).stroke({ width: 2, color: INK });
  hat.position.set(0, -e * 0.8);
  c.addChild(hat);
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    hat.rotation = Math.sin(time * 0.002) * 0.06;
  }, cleanups);
  const hop = (times: number, height: number, done?: () => void) =>
    tween(400 * times, (t) => (c.y = counterTop - Math.abs(Math.sin(t * Math.PI * times)) * height), () => ((c.y = counterTop), done?.()));
  let turn = 0;
  tappable(c, oneAtATime((done) => {
    const what = turn++ % 3;
    if (what === 0) {
      sfx.giggle(1.5);
      hop(1, e * 0.18, done);
    } else if (what === 1) {
      sfx.sleighBells();
      tween(900, (t) => (c.rotation = Math.sin(t * Math.PI * 4) * 0.12 * (1 - t)), () => ((c.rotation = 0), done()));
    } else {
      sfx.yippee(1.5);
      burst(kit.sparkles, x, counterTop - e * 0.9, 16, 120);
      hop(2, e * 0.14, done);
    }
  }), new Rectangle(-e * 0.35, -e * 1.25, e * 0.7, e * 1.25));
  return {
    /** A present's been wrapped: hooray! */
    cheer() {
      sfx.yippee(1.6);
      hearts(kit.sparkles, x, counterTop - e, 4);
      hop(2, e * 0.16);
    },
  };
}
