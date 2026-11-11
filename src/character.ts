import { Container, Sprite, Texture } from 'pixi.js';
import { ease, tween } from './tween';

/**
 * One of Matilda's drawings, living in the scene.
 *
 * Layers (outside to inside):
 *   Character (this)  - position, rotation and pinch size. Moved by gestures.
 *     body            - flip (mirror) and the "picked up" lift. Animated.
 *       sprite        - the picture itself, scaled to a sensible starting size.
 */
export class Character extends Container {
  readonly body = new Container();
  readonly sprite: Sprite;

  /** 1 = facing the way it was drawn, -1 = mirrored. */
  facing = 1;
  private flipX = 1; // animated value travelling between 1 and -1
  private lift = 1; // grows a little while held
  private hop = 0; // little jump during a flip
  private cancelLift?: () => void;
  private cancelFlip?: () => void;

  static readonly MIN_SCALE = 0.3;
  static readonly MAX_SCALE = 4;

  constructor(texture: Texture, startSize: number) {
    super();
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    const fit = startSize / Math.max(texture.width, texture.height);
    this.sprite.scale.set(fit);

    this.body.addChild(this.sprite);
    this.addChild(this.body);

    // Let the event system know this can be touched.
    this.eventMode = 'static';
    this.cursor = 'grab';
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
}
