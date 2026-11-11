import { Container, Sprite, Texture } from 'pixi.js';
import { playReaction, TAP_REACTIONS, type Reactable, type ReactionName } from './reactions';
import { ease, tween } from './tween';

/**
 * Which parts of a picture count as "touchable": a coarse grid of cells that
 * contain drawing, grown a little so small fingers don't have to be exact.
 * Touching the see-through space around a drawing doesn't grab it.
 */
class TouchMap {
  private constructor(
    private cell: number,
    private cols: number,
    private rows: number,
    private bits: Uint8Array,
  ) {}

  static fromCanvas(canvas: HTMLCanvasElement): TouchMap {
    const { width: w, height: h } = canvas;
    const cell = Math.max(4, Math.round(Math.max(w, h) / 48));
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const raw = new Uint8Array(cols * rows);
    const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 64) raw[Math.floor(y / cell) * cols + Math.floor(x / cell)] = 1;
      }
    }
    // Grow by 2 cells: a generous target for fingers.
    const bits = new Uint8Array(cols * rows);
    const grow = 2;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        if (!raw[cy * cols + cx]) continue;
        for (let dy = -grow; dy <= grow; dy++) {
          for (let dx = -grow; dx <= grow; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x >= 0 && y >= 0 && x < cols && y < rows) bits[y * cols + x] = 1;
          }
        }
      }
    }
    return new TouchMap(cell, cols, rows, bits);
  }

  /** px, py are in picture pixels, (0,0) = top-left. */
  hit(px: number, py: number) {
    const cx = Math.floor(px / this.cell);
    const cy = Math.floor(py / this.cell);
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows && this.bits[cy * this.cols + cx] === 1;
  }
}

/**
 * One of Matilda's drawings, living in the scene.
 *
 * Layers (outside to inside):
 *   Character (this)  - position, rotation and pinch size. Moved by gestures.
 *     body            - flip (mirror), "picked up" lift, spins. Animated.
 *       fx            - tap reactions: squash, stretch, wobble from the feet.
 *         sprite      - the picture itself, scaled to a sensible starting size.
 */
export class Character extends Container implements Reactable {
  readonly body = new Container();
  readonly fx = new Container();
  readonly sprite: Sprite;
  readonly restY: number;
  readonly size: number;
  /** The cut-out drawing itself (transparent background). */
  readonly picture: HTMLCanvasElement;
  /** What this is, for saving: one of the photo characters, or a sample. */
  ref: { kind: 'photo'; id: string } | { kind: 'sample'; name: string } = { kind: 'sample', name: '' };
  private lastReaction: ReactionName | null = null;
  private cancelReaction?: () => void;
  private touchMap: TouchMap;
  private picW: number;
  private picH: number;

  /** 1 = facing the way it was drawn, -1 = mirrored. */
  facing = 1;
  private flipX = 1; // animated value travelling between 1 and -1
  private lift = 1; // grows a little while held
  private hop = 0; // little jump during a flip
  private cancelLift?: () => void;
  private cancelFlip?: () => void;

  static readonly MIN_SCALE = 0.3;
  static readonly MAX_SCALE = 4;

  constructor(picture: HTMLCanvasElement, startSize: number) {
    super();
    this.picture = picture;
    this.picW = picture.width;
    this.picH = picture.height;
    this.sprite = new Sprite(Texture.from(picture));
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(startSize / Math.max(this.picW, this.picH));

    // fx pivots on the bottom-middle of the drawing, so squashes and wobbles
    // happen "from the feet" like a jelly.
    this.size = this.picH * this.sprite.scale.y;
    this.restY = this.size / 2;
    this.fx.pivot.set(0, this.restY);
    this.fx.position.set(0, this.restY);

    this.fx.addChild(this.sprite);
    this.body.addChild(this.fx);
    this.addChild(this.body);

    // Touchable only where there's drawing, not the see-through corners.
    this.touchMap = TouchMap.fromCanvas(picture);
    this.eventMode = 'static';
    this.interactiveChildren = false;
    this.hitArea = { contains: (x: number, y: number) => this.touches(x, y) };
    this.cursor = 'grab';
  }

  /** Is the point (in this character's own coordinates) on the drawing? */
  private touches(x: number, y: number) {
    const sx = this.body.scale.x;
    const sy = this.body.scale.y;
    if (Math.abs(sx) < 0.05) return false; // edge-on, mid-flip
    const px = (x - this.body.x) / sx / this.sprite.scale.x + this.picW / 2;
    const py = (y - this.body.y) / sy / this.sprite.scale.y + this.picH / 2;
    return this.touchMap.hit(px, py);
  }

  private applyBody() {
    this.body.scale.set(this.flipX * this.lift, this.lift);
    this.body.y = -this.hop;
  }

  /** Grow slightly when picked up, settle back when let go. */
  setHeld(held: boolean) {
    this.cursor = held ? 'grabbing' : 'grab';
    this.cancelLift?.();
    const from = this.lift;
    const to = held ? 1.08 : 1;
    this.cancelLift = tween(held ? 180 : 260, (t) => {
      this.lift = from + (to - from) * ease.outBack(t);
      this.applyBody();
    });
  }

  /** Face a direction straight away (no animation), e.g. when restoring. */
  setFacing(f: 1 | -1) {
    this.cancelFlip?.();
    this.facing = f;
    this.flipX = f;
    this.hop = 0;
    this.applyBody();
  }

  /** Mirror the character with a squish-and-hop animation. */
  flip() {
    this.facing *= -1;
    this.cancelFlip?.();
    const from = this.flipX;
    const to = this.facing;
    const hopHeight = 30 / Math.max(this.scale.x, 0.5);
    this.cancelFlip = tween(320, (t) => {
      this.flipX = from + (to - from) * ease.inOutSine(t);
      this.hop = Math.sin(Math.PI * t) * hopHeight;
      this.applyBody();
    });
  }

  /**
   * React to a tap. Picks a different reaction from last time, with a rare
   * surprise now and then. Returns which one, so the right sound can play.
   */
  react(force?: ReactionName): ReactionName {
    let name = force;
    if (!name) {
      if (Math.random() < 1 / 12) name = 'super';
      else {
        const options = TAP_REACTIONS.filter((r) => r !== this.lastReaction);
        name = options[Math.floor(Math.random() * options.length)];
      }
    }
    this.lastReaction = name;
    this.cancelReaction?.();
    this.cancelReaction = playReaction(this, name);
    return name;
  }

  /** Arrive with a springy pop and a little twist. */
  popIn() {
    this.scale.set(0.01);
    tween(600, (t) => {
      this.scale.set(Math.max(0.01, ease.outBack(t)));
      this.rotation = -0.6 * (1 - ease.outCubic(t));
    });
  }
}
