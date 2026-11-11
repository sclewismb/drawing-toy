import { Container, Graphics, Rectangle, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js';
import { tween } from './tween';

/** One chalk line. Points are 0..1 across and down the board, so it fits any screen size. */
export interface ChalkStroke {
  c: string; // colour
  w: number; // thickness, as a fraction of the board's height
  p: number[]; // x0, y0, x1, y1, ...
}

export interface BoardRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLOURS = ['#ffffff', '#ffe066', '#ff8fb1', '#8ecdf5'];
const WIDTH = 0.018;
const MAX_POINTS = 40000; // plenty; stops a board growing forever

/**
 * A blackboard you can draw on with a finger, with chalk sticks to pick a
 * colour and a duster to wipe it clean.
 */
export class Chalkboard extends Container {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private board = new Sprite();
  private ledge = new Container();
  private sticks: Graphics[] = [];
  private duster = new Graphics();
  private rect: BoardRect = { x: 0, y: 0, w: 1, h: 1 };
  private strokes: ChalkStroke[] = [];
  private active = new Map<number, ChalkStroke>();
  private colour = COLOURS[0];
  private wiping = false;

  onChange: () => void = () => {};
  onScritch: () => void = () => {};
  onWipe: () => void = () => {};
  onPickChalk: () => void = () => {};

  constructor() {
    super();
    this.board.eventMode = 'static';
    this.board.cursor = 'crosshair';
    this.addChild(this.board, this.ledge);

    this.board.on('pointerdown', (e) => this.down(e));
    this.board.on('globalpointermove', (e) => this.move(e));
    this.board.on('pointerup', (e) => this.up(e));
    this.board.on('pointerupoutside', (e) => this.up(e));

    COLOURS.forEach((c, i) => {
      const stick = new Graphics();
      stick.eventMode = 'static';
      stick.cursor = 'pointer';
      stick.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.colour = c;
        this.drawLedge();
        this.onPickChalk();
      });
      this.sticks.push(stick);
      this.ledge.addChild(stick);
      void i;
    });
    this.duster.eventMode = 'static';
    this.duster.cursor = 'pointer';
    this.duster.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.wipe();
    });
    this.ledge.addChild(this.duster);
  }

  /** Fit the board to where the background draws it. */
  layout(rect: BoardRect, resolution: number) {
    this.rect = rect;
    const old = this.board.texture;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.max(1, Math.round(rect.w * resolution));
    this.canvas.height = Math.max(1, Math.round(rect.h * resolution));
    this.ctx = this.canvas.getContext('2d')!;
    this.board.texture = Texture.from(this.canvas);
    if (old && old !== Texture.EMPTY) old.destroy(true);
    this.board.position.set(rect.x, rect.y);
    this.board.width = rect.w;
    this.board.height = rect.h;
    this.board.hitArea = new Rectangle(0, 0, this.canvas.width, this.canvas.height);
    this.redraw();
    this.drawLedge();
  }

  setStrokes(strokes: ChalkStroke[]) {
    this.strokes = strokes;
    this.redraw();
  }

  getStrokes() {
    return this.strokes;
  }

  // --- drawing ---------------------------------------------------------------

  private toBoard(e: FederatedPointerEvent) {
    return {
      x: Math.min(1, Math.max(0, (e.global.x - this.rect.x) / this.rect.w)),
      y: Math.min(1, Math.max(0, (e.global.y - this.rect.y) / this.rect.h)),
    };
  }

  private down(e: FederatedPointerEvent) {
    e.stopPropagation(); // drawing, not "tapping empty space"
    if (this.wiping) return;
    const p = this.toBoard(e);
    const s: ChalkStroke = { c: this.colour, w: WIDTH, p: [round(p.x), round(p.y)] };
    this.strokes.push(s);
    this.active.set(e.pointerId, s);
    this.segment(s, p.x, p.y, p.x + 0.0001, p.y);
    this.board.texture.source.update();
    this.onScritch();
  }

  private move(e: FederatedPointerEvent) {
    const s = this.active.get(e.pointerId);
    if (!s) return;
    const p = this.toBoard(e);
    const n = s.p.length;
    const lx = s.p[n - 2], ly = s.p[n - 1];
    // Only add a point once the finger has moved a little.
    const dx = (p.x - lx) * this.rect.w, dy = (p.y - ly) * this.rect.h;
    if (dx * dx + dy * dy < 9) return;
    if (this.pointCount() > MAX_POINTS) return;
    s.p.push(round(p.x), round(p.y));
    this.segment(s, lx, ly, p.x, p.y);
    this.board.texture.source.update();
    this.onScritch();
  }

  private up(e: FederatedPointerEvent) {
    if (this.active.delete(e.pointerId)) this.onChange();
  }

  private pointCount() {
    let n = 0;
    for (const s of this.strokes) n += s.p.length / 2;
    return n;
  }

  /** One bit of chalk line, with a slightly dusty edge. */
  private segment(s: ChalkStroke, x0: number, y0: number, x1: number, y1: number) {
    const { ctx, canvas } = this;
    const lw = s.w * canvas.height;
    const ax = x0 * canvas.width, ay = y0 * canvas.height;
    const bx = x1 * canvas.width, by = y1 * canvas.height;
    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = s.c;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = s.c;
    for (let i = 0; i < 3; i++) {
      const t = Math.random();
      ctx.fillRect(ax + (bx - ax) * t + (Math.random() - 0.5) * lw * 1.4, ay + (by - ay) * t + (Math.random() - 0.5) * lw * 1.4, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  private redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const s of this.strokes) {
      const p = s.p;
      if (p.length === 2) this.segment(s, p[0], p[1], p[0] + 0.0001, p[1]);
      for (let i = 2; i < p.length; i += 2) this.segment(s, p[i - 2], p[i - 1], p[i], p[i + 1]);
    }
    this.board.texture.source.update();
  }

  /** Wipe the board clean with a sweep of the duster. */
  wipe() {
    if (this.wiping || this.strokes.length === 0) return;
    this.wiping = true;
    this.active.clear();
    this.onWipe();
    const { ctx, canvas } = this;
    let last = 0;
    tween(
      450,
      (t) => {
        // clear a widening band from left to right
        const x = canvas.width * t;
        ctx.clearRect(last, 0, x - last + 2, canvas.height);
        last = x;
        this.board.texture.source.update();
      },
      () => {
        this.strokes = [];
        this.redraw();
        this.wiping = false;
        this.onChange();
      },
    );
  }

  // --- chalk sticks and the duster on the ledge --------------------------------

  private drawLedge() {
    const { x, y, w, h } = this.rect;
    const ledgeY = y + h + 6;
    const stickW = Math.min(60, w * 0.08);
    const stickH = Math.max(12, Math.min(18, h * 0.05));
    this.sticks.forEach((stick, i) => {
      const c = COLOURS[i];
      const chosen = c === this.colour;
      const sx = x + w * 0.05 + i * (stickW + 18);
      stick.clear().roundRect(0, 0, stickW, stickH, stickH / 2).fill(c).stroke({ width: 3, color: 0x3a3a3a });
      stick.position.set(sx, ledgeY - (chosen ? 14 : 0));
      stick.rotation = chosen ? -0.15 : 0;
      // big enough to tap with a small finger
      stick.hitArea = new Rectangle(-8, -14, stickW + 16, stickH + 28);
    });
    const dw = Math.min(90, w * 0.12), dh = Math.max(22, stickH * 1.6);
    this.duster
      .clear()
      .roundRect(0, 0, dw, dh * 0.55, 6)
      .fill(0xa0522d)
      .stroke({ width: 3, color: 0x3a3a3a })
      .roundRect(0, dh * 0.5, dw, dh * 0.5, 4)
      .fill(0x9aa5b1)
      .stroke({ width: 3, color: 0x3a3a3a });
    this.duster.position.set(x + w - dw - w * 0.05, ledgeY - dh * 0.4);
    this.duster.hitArea = new Rectangle(-10, -12, dw + 20, dh + 24);
  }
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** The doodles that are on the board the first time (so they can be wiped off). */
export function startingDoodles(aspect: number): ChalkStroke[] {
  const circle = (cx: number, cy: number, r: number, from = 0, to = Math.PI * 2, steps = 28) => {
    const p: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      p.push(round(cx + (Math.cos(a) * r) / aspect), round(cy + Math.sin(a) * r));
    }
    return p;
  };
  const line = (...pts: number[]) => pts.map(round);
  const white = (p: number[]): ChalkStroke => ({ c: '#ffffff', w: WIDTH, p });
  const yellow = (p: number[]): ChalkStroke => ({ c: '#ffe066', w: WIDTH, p });
  const strokes: ChalkStroke[] = [];
  // sun
  strokes.push(yellow(circle(0.2, 0.42, 0.14)));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    strokes.push(yellow(line(0.2 + (Math.cos(a) * 0.19) / aspect, 0.42 + Math.sin(a) * 0.19, 0.2 + (Math.cos(a) * 0.27) / aspect, 0.42 + Math.sin(a) * 0.27)));
  }
  // smiley
  strokes.push(white(circle(0.55, 0.5, 0.22)));
  strokes.push(white(circle(0.55 - 0.08 / aspect, 0.43, 0.012, 0, Math.PI * 2, 6)));
  strokes.push(white(circle(0.55 + 0.08 / aspect, 0.43, 0.012, 0, Math.PI * 2, 6)));
  strokes.push(white(circle(0.55, 0.5, 0.12, 0.3, Math.PI - 0.3, 12)));
  // little house
  strokes.push(white(line(0.76, 0.75, 0.76, 0.48, 0.88, 0.48, 0.88, 0.75, 0.76, 0.75)));
  strokes.push(white(line(0.74, 0.5, 0.82, 0.28, 0.9, 0.5)));
  return strokes;
}
