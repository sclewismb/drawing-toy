import { Container, Graphics, Rectangle } from 'pixi.js';
import { burst } from '../fx';
import { sfx } from '../sound';
import { ease, tween } from '../tween';
import { everyFrame, glow, INK, later, oneAtATime, rand, roomSpan, tappable, tumble, type Cleanups, type EggKit } from './common';
import type { StreetGeom } from './views';

/**
 * Christmas (the winter season): fairy lights on every building, a big tree
 * in the town square (tap it: the star lights up and the bells ring), Santa's
 * sleigh flying across the sky now and then (tap it: ho ho ho, and presents
 * fall), snowmen. Indoors: a garland of lights along the top, and in the
 * lounge a tree with presents to unwrap.
 */
const BULBS = [0xe5383b, 0x2fb36b, 0xffd43b, 0x4dabf7, 0xff8fab];

/** A string of twinkling fairy lights through these points. */
function fairyLights(kit: EggKit, points: { x: number; y: number }[][], cleanups: Cleanups) {
  const wire = new Graphics();
  wire.eventMode = 'none';
  const bulbs = new Graphics();
  bulbs.eventMode = 'none';
  kit.under.addChild(wire, bulbs);
  for (const line of points) {
    wire.moveTo(line[0].x, line[0].y);
    for (const p of line) wire.lineTo(p.x, p.y);
  }
  wire.stroke({ width: 2, color: 0x2b2d42 });
  const all = points.flat();
  let t = 0, phase = 0;
  const draw = () => {
    bulbs.clear();
    all.forEach((p, i) => {
      const on = (i + phase) % 3 !== 0;
      bulbs.circle(p.x, p.y + 4, 4).fill({ color: BULBS[i % BULBS.length], alpha: on ? 1 : 0.35 });
    });
  };
  draw();
  everyFrame((dt) => {
    t += dt;
    if (t > 380) {
      t = 0;
      phase = (phase + 1) % 3;
      draw();
    }
  }, cleanups);
}

/** A Christmas tree drawn into g, standing at (x, y), `ht` tall. Returns where its star is. */
function drawTree(g: Graphics, x: number, y: number, ht: number) {
  const wdt = ht * 0.62;
  g.rect(x - ht * 0.06, y - ht * 0.12, ht * 0.12, ht * 0.12).fill(0x8d5524).stroke({ width: 3, color: INK });
  for (let i = 0; i < 3; i++) {
    const ty = y - ht * 0.1 - i * ht * 0.26, tw = wdt * (1 - i * 0.24);
    g.poly([x - tw / 2, ty, x, ty - ht * 0.42, x + tw / 2, ty]).fill(i % 2 ? 0x2d9a5a : 0x248a4f).stroke({ width: 3, color: INK });
  }
  // tinsel and baubles
  for (let i = 0; i < 3; i++) {
    const ty = y - ht * 0.22 - i * ht * 0.24;
    g.moveTo(x - wdt * (0.34 - i * 0.08), ty).quadraticCurveTo(x, ty + ht * 0.06, x + wdt * (0.34 - i * 0.08), ty - ht * 0.04).stroke({ width: 3, color: 0xffd43b });
  }
  return { x, y: y - ht * 0.92 };
}

export function christmasStreet(kit: EggKit, geom: StreetGeom, cleanups: Cleanups) {
  const { buildings, h } = geom;
  const screenW = geom.sun.x / 0.86; // the sky is set out by the screen's width (see street.ts)

  // --- fairy lights strung across every building ---
  const lines: { x: number; y: number }[][] = [];
  for (const b of Object.values(buildings)) {
    if (!b || b.h < 60) continue;
    const y = b.y - b.h * 0.6, x0 = b.x - b.w * 0.44, x1 = b.x + b.w * 0.44;
    const n = Math.max(6, Math.round((x1 - x0) / 16));
    const line: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      line.push({ x: x0 + (x1 - x0) * t, y: y + Math.abs(Math.sin(t * Math.PI * 2)) * 14 });
    }
    lines.push(line);
  }
  fairyLights(kit, lines, cleanups);

  // --- the big tree in the town square ---
  const sq = geom.square;
  if (sq && sq.x1 > sq.x0) {
    const tree = new Container();
    const tg = new Graphics();
    const ht = Math.min((sq.y1 - sq.y0) * 1.1, h * 0.32);
    const tx = sq.x0 + (sq.x1 - sq.x0) * 0.22, ty = sq.y1 - 16;
    const star = drawTree(tg, tx, ty, ht);
    const glowG = new Graphics();
    glowG.eventMode = 'none';
    const baubles = new Graphics();
    const starG = new Graphics().star(0, 0, 5, 16, 7).fill(0xffd43b).stroke({ width: 2.5, color: INK });
    starG.position.set(star.x, star.y);
    tree.addChild(glowG, tg, baubles, starG);
    kit.under.addChild(tree);
    const spots = Array.from({ length: 12 }, (_, i) => ({ x: tx + rand(-0.5, 0.5) * ht * 0.5 * (1 - (i % 4) * 0.2), y: ty - ht * (0.15 + (i % 4) * 0.18) }));
    let flash = 0;
    const drawBaubles = () => {
      baubles.clear();
      spots.forEach((p, i) => baubles.circle(p.x, p.y, 5).fill(BULBS[(i + Math.floor(flash * 10)) % BULBS.length]).stroke({ width: 1.5, color: INK }));
    };
    drawBaubles();
    tappable(tree, oneAtATime((done) => {
      sfx.jingle();
      later(600, () => sfx.sleighBells(), cleanups);
      burst(kit.sparkles, star.x, star.y, 14, 80);
      tween(2600, (t) => {
        flash = t * 3;
        drawBaubles();
        glowG.clear();
        glow(glowG, star.x, star.y, 60, 0xfff3b0, 3 * Math.sin(t * Math.PI));
        starG.rotation = Math.sin(t * Math.PI * 6) * 0.2;
        starG.scale.set(1 + Math.sin(t * Math.PI) * 0.6);
      }, () => {
        glowG.clear();
        done();
      });
    }), new Rectangle(tx - ht * 0.35, ty - ht, ht * 0.7, ht));
  }

  // --- snowmen by the big trees at the front ---
  for (const tr of geom.trees.slice(0, 4)) {
    const sm = new Container();
    const g = new Graphics();
    const r = tr.r * 0.5;
    g.circle(0, -r, r).circle(0, -r * 2.6, r * 0.75).circle(0, -r * 3.8, r * 0.55).fill(0xffffff).stroke({ width: 2.5, color: INK });
    g.poly([0, -r * 3.8, r * 0.6, -r * 3.7, 0, -r * 3.6]).fill(0xff922b);
    g.circle(-r * 0.2, -r * 4, 2).circle(r * 0.2, -r * 4, 2).fill(INK);
    g.rect(-r * 0.6, -r * 3.3, r * 1.2, r * 0.25).fill(0xe5383b);
    const hat = new Graphics().rect(-r * 0.5, -r * 0.6, r, r * 0.6).rect(-r * 0.75, 0, r * 1.5, r * 0.15).fill(0x2b2d42).stroke({ width: 2, color: INK });
    hat.position.set(0, -r * 4.3);
    sm.addChild(g, hat);
    sm.position.set(tr.x + tr.r * 1.9, tr.y + tr.r * 1.15);
    kit.under.addChild(sm);
    tappable(sm, oneAtATime((done) => {
      sfx.boing(1.3);
      tween(900, (t) => {
        hat.y = -r * 4.3 - Math.sin(t * Math.PI) * r * 2;
        hat.rotation = t * Math.PI * 2;
      }, () => {
        hat.rotation = 0;
        done();
      });
      for (let i = 0; i < 6; i++) tumble(kit, new Graphics().circle(0, 0, 3).fill(0xffffff), sm.x, sm.y - r * 2, sm.y, { vy: rand(-0.3, -0.1), vx: rand(-0.1, 0.1), float: true });
    }), new Rectangle(-r * 1.2, -r * 5, r * 2.4, r * 5));
  }

  // --- Santa's sleigh, flying across the sky now and then (it lives in the sky, which stays put) ---
  const sky = kit.sky;
  if (!sky) return;
  const sleigh = new Container();
  const sg = new Graphics();
  // two reindeer (one with a shiny red nose)
  for (const [i, dx] of [[0, 70], [1, 130]] as const) {
    sg.ellipse(dx, 0, 22, 12).fill(0x9c6644).stroke({ width: 2, color: INK });
    sg.circle(dx + 22, -12, 9).fill(0x9c6644).stroke({ width: 2, color: INK });
    sg.moveTo(dx + 20, -20).lineTo(dx + 16, -32).lineTo(dx + 10, -36).moveTo(dx + 16, -32).lineTo(dx + 22, -38).stroke({ width: 2.5, color: 0x6b4226 });
    sg.circle(dx + 31, -10, 3.5).fill(i === 1 ? 0xe5383b : 0x2b2118);
    sg.moveTo(dx - 12, 10).lineTo(dx - 18, 22).moveTo(dx + 12, 10).lineTo(dx + 18, 22).stroke({ width: 3, color: 0x6b4226 });
  }
  sg.moveTo(40, -2).lineTo(130, -6).stroke({ width: 1.5, color: INK });
  // the sleigh, Santa and his sack
  sg.moveTo(-40, -14).lineTo(30, -14).quadraticCurveTo(44, -14, 44, 0).lineTo(30, 10).lineTo(-40, 10).closePath().fill(0xe5383b).stroke({ width: 2.5, color: INK });
  sg.moveTo(-46, 16).lineTo(40, 16).quadraticCurveTo(52, 16, 52, 6).stroke({ width: 3, color: 0xffd43b });
  sg.circle(-26, -26, 14).fill(0xc68b59).stroke({ width: 2, color: INK }); // the sack
  sg.circle(4, -28, 13).fill(0xe5383b).stroke({ width: 2, color: INK });
  sg.circle(6, -42, 9).fill(0xf6cfb3).stroke({ width: 2, color: INK });
  sg.ellipse(8, -36, 9, 6).fill(0xffffff);
  sg.poly([-2, -48, 6, -62, 14, -48]).fill(0xe5383b).stroke({ width: 2, color: INK });
  sg.circle(6, -63, 3).fill(0xffffff);
  sleigh.addChild(sg);
  sleigh.visible = false;
  sky.addChild(sleigh);
  cleanups.push(() => sleigh.destroy({ children: true }));
  let flying = false;
  const fly = () => {
    if (flying) return;
    flying = true;
    sleigh.visible = true;
    sfx.sleighBells();
    const y0 = h * rand(0.1, 0.18);
    tween(11000, (t) => {
      sleigh.x = -200 + (screenW + 400) * t;
      sleigh.y = y0 + Math.sin(t * Math.PI * 4) * 12;
      sleigh.rotation = Math.cos(t * Math.PI * 4) * 0.05;
    }, () => {
      sleigh.visible = false;
      flying = false;
    });
    later(rand(22000, 32000), fly, cleanups);
  };
  later(4000, fly, cleanups);
  tappable(sleigh, oneAtATime((done) => {
    sfx.hoHo();
    for (let i = 0; i < 3; i++) {
      const p = new Graphics().rect(-9, -9, 18, 18).fill(BULBS[i]).stroke({ width: 2, color: INK });
      p.rect(-2, -9, 4, 18).fill(0xffffff);
      p.position.set(sleigh.x - 20 + i * 18, sleigh.y);
      sky.addChild(p);
      const x0 = p.x, y0 = p.y;
      tween(1600, (t) => {
        p.x = x0 + t * 30;
        p.y = y0 + ease.inOutSine(t) * h * 0.3;
        p.rotation = t * 3;
        p.alpha = t > 0.8 ? (1 - t) * 5 : 1;
      }, () => p.destroy());
    }
    later(1200, done, cleanups);
  }), new Rectangle(-60, -70, 220, 100));
}

/** Indoors at Christmas: a garland of lights along the top of the room (and a tree in the lounge). */
export function christmasIndoors(kit: EggKit, cleanups: Cleanups, id: string) {
  const { w, h } = kit;
  const span = roomSpan(kit);
  const g = new Graphics();
  g.eventMode = 'none';
  kit.under.addChild(g);
  const lines: { x: number; y: number }[][] = [];
  for (let x = span.x; x < span.x + span.w; x += 0.3 * w) {
    const line: { x: number; y: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      line.push({ x: x + 0.3 * w * t, y: h * 0.03 + Math.sin(t * Math.PI) * h * 0.05 });
    }
    // the green garland itself
    g.moveTo(line[0].x, line[0].y);
    for (const p of line) g.lineTo(p.x, p.y);
    g.stroke({ width: 12, color: 0x2d9a5a, cap: 'round' });
    // a red bow where the swags meet
    g.poly([x, h * 0.03, x - 14, h * 0.03 - 9, x - 14, h * 0.03 + 9]).poly([x, h * 0.03, x + 14, h * 0.03 - 9, x + 14, h * 0.03 + 9]).fill(0xe5383b).stroke({ width: 2, color: INK });
    lines.push(line);
  }
  fairyLights(kit, lines, cleanups);

  if (id !== 'lounge') return;
  // --- the lounge's Christmas tree, with presents to unwrap ---
  const tx = 0.9 * w, ty = h * 0.74, ht = h * 0.46;
  const tg = new Graphics();
  const star = drawTree(tg, tx, ty, ht);
  tg.star(star.x, star.y, 5, 16, 7).fill(0xffd43b).stroke({ width: 2.5, color: INK });
  kit.under.addChild(tg);
  const glowG = new Graphics();
  glowG.eventMode = 'none';
  kit.under.addChild(glowG);
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    glowG.clear();
    glow(glowG, star.x, star.y, 40, 0xfff3b0, 1 + Math.sin(time * 0.004) * 0.6);
  }, cleanups);
  const toys = ['teddy', 'rocket', 'dinosaur', 'drum', 'race-car', 'castle', 'ball', 'kite', 'robot', 'building-blocks'];
  [-0.03, 0.03, 0.09].forEach((dx, i) => {
    const box = new Container();
    const s = 26 + i * 4;
    const body = new Graphics().rect(-s, -s * 1.4, s * 2, s * 1.4).fill(BULBS[i]).stroke({ width: 3, color: INK });
    body.rect(-5, -s * 1.4, 10, s * 1.4).fill(0xffffff);
    const lid = new Graphics().rect(-s - 4, -12, s * 2 + 8, 12).fill(BULBS[i]).stroke({ width: 3, color: INK });
    lid.rect(-5, -12, 10, 12).fill(0xffffff);
    lid.poly([0, -12, -14, -24, -14, -8]).poly([0, -12, 14, -24, 14, -8]).fill(0xffffff).stroke({ width: 2, color: INK });
    lid.y = -s * 1.4;
    box.addChild(body, lid);
    box.position.set(tx + dx * w, ty + 10 + i * 6);
    kit.under.addChild(box);
    let opened = false;
    tappable(box, () => {
      if (opened) {
        sfx.click();
        return;
      }
      opened = true;
      sfx.pop(1.2);
      tween(500, (t) => {
        lid.y = -s * 1.4 - Math.sin(t * Math.PI * 0.5) * 50;
        lid.rotation = -t * 0.8;
      });
      burst(kit.sparkles, box.x, box.y - s, 12, 70);
      const toy = toys[Math.floor(Math.random() * toys.length)];
      later(400, () => kit.secrets?.find('xmas-present', toy, { x: box.x, y: box.y - s * 3 }), cleanups);
      // wrapped up again after a while, ready for another surprise
      later(40000, () => {
        opened = false;
        lid.rotation = 0;
        lid.y = -s * 1.4;
      }, cleanups);
    }, new Rectangle(-s - 8, -s * 1.4 - 26, s * 2 + 16, s * 1.4 + 30));
  });
}
