import { Container, Graphics, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import { tween, ease } from './tween';

/**
 * Sliding sideways along a wide room.
 *
 * Everything in the room (background, surprises, characters) lives in
 * `view`, in room coordinates: the room's original screen-sized view is
 * x = 0..panel, and the new parts either side carry on to the left
 * (negative x) and to the right (beyond panel).
 *
 * Drag empty space to slide along, and let go to glide. Arrows at the
 * screen edges show there's more to see (tap one to slide that way).
 */
export class Camera {
  readonly view = new Container();
  /** Fixed on the screen, on top: the arrows. */
  readonly arrows = new Container();
  /** Room x at the left edge of the screen. */
  x = 0;
  /** Left and right edges of the room, in room coordinates. */
  private x0 = 0;
  private x1 = 0;
  private screenW = 0;
  private screenH = 0;
  private vel = 0; // pixels per ms, while gliding
  private sliding = false; // gliding to a spot (after an arrow tap)
  private left = new Graphics();
  private right = new Graphics();
  private time = 0;
  /** Called after the view moves (so held characters can follow the finger). */
  onMove: () => void = () => {};

  constructor() {
    for (const [arrow, dir] of [[this.left, -1], [this.right, 1]] as const) {
      arrow.eventMode = 'static';
      arrow.cursor = 'pointer';
      arrow.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation());
      arrow.on('pointertap', () => this.nudge(dir));
      this.arrows.addChild(arrow);
    }
  }

  /** Set the room's size and the screen's size. Keeps the view in range. */
  setRoom(x0: number, x1: number, screenW: number, screenH: number) {
    this.x0 = x0;
    this.x1 = x1;
    this.screenW = screenW;
    this.screenH = screenH;
    this.drawArrows();
    this.set(this.x);
  }

  /** True when the room is wider than the screen. */
  get scrolls() {
    return this.x1 - this.x0 > this.screenW + 1;
  }

  get min() {
    return this.x0;
  }
  get max() {
    return Math.max(this.x0, this.x1 - this.screenW);
  }

  set(x: number) {
    this.x = Math.min(this.max, Math.max(this.min, x));
    this.view.x = -Math.round(this.x);
    this.left.visible = this.scrolls && this.x > this.min + 4;
    this.right.visible = this.scrolls && this.x < this.max - 4;
    this.onMove();
  }

  /** Stop any glide (a finger went down). */
  hold() {
    this.vel = 0;
    this.sliding = false;
  }

  /** Slide by a finger's movement (screen pixels). */
  drag(dx: number) {
    this.hold();
    this.set(this.x - dx);
  }

  /** Let go: keep gliding at the finger's speed (pixels per ms), slowing down. */
  fling(vx: number) {
    this.vel = Math.max(-4, Math.min(4, -vx));
  }

  /** Slide most of a screen to the left (-1) or right (1). */
  nudge(dir: -1 | 1) {
    this.hold();
    this.sliding = true;
    const from = this.x;
    const to = Math.min(this.max, Math.max(this.min, from + dir * this.screenW * 0.7));
    tween(520, (t) => {
      if (this.sliding) this.set(from + (to - from) * ease.inOutSine(t));
    }, () => (this.sliding = false));
  }

  /** Every frame: the glide, and the arrows' gentle bob. */
  update(dtMs: number) {
    this.time += dtMs;
    if (Math.abs(this.vel) > 0.02) {
      this.set(this.x + this.vel * dtMs);
      this.vel *= Math.pow(0.994, dtMs);
      if (this.x <= this.min || this.x >= this.max) this.vel = 0;
    } else {
      this.vel = 0;
    }
    const bob = Math.sin(this.time * 0.004) * 4;
    this.left.x = -bob;
    this.right.x = bob;
  }

  private drawArrows() {
    const r = 26;
    const y = this.screenH * 0.5;
    const draw = (g: Graphics, cx: number, dir: number) => {
      g.clear();
      g.circle(cx, y, r).fill({ color: 0xffffff, alpha: 0.75 }).stroke({ width: 3, color: 0x3a3a3a, alpha: 0.6 });
      g.poly([cx + dir * 9, y, cx - dir * 6, y - 13, cx - dir * 6, y + 13]).fill(0x3a3a3a);
      g.hitArea = new Rectangle(cx - r - 14, y - r - 20, (r + 14) * 2, (r + 20) * 2);
    };
    draw(this.left, 8 + r, -1);
    draw(this.right, this.screenW - 8 - r, 1);
  }
}
