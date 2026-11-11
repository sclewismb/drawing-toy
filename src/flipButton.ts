import { Container, Graphics } from 'pixi.js';
import { ease, tween } from './tween';

/**
 * A big round button with a "mirror" picture (two arrows pointing apart
 * around a line). It floats beside the selected character. No words.
 */
export class FlipButton extends Container {
  static readonly SIZE = 72; // big enough for small fingers

  constructor(onTap: () => void) {
    super();
    const r = FlipButton.SIZE / 2;

    const g = new Graphics();
    // soft shadow
    g.circle(0, 4, r).fill({ color: 0x000000, alpha: 0.18 });
    // button face
    g.circle(0, 0, r).fill(0xffffff).stroke({ width: 4, color: 0x3a3a3a });
    // middle "mirror" line
    g.moveTo(0, -r * 0.5).lineTo(0, r * 0.5).stroke({ width: 4, color: 0x9a9a9a, cap: 'round' });
    // left arrow
    const a = r * 0.62;
    const h = r * 0.3;
    g.poly([-a, 0, -r * 0.18, -h, -r * 0.18, h]).fill(0xff7a59);
    // right arrow
    g.poly([a, 0, r * 0.18, -h, r * 0.18, h]).fill(0x4ea8ff);
    this.addChild(g);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.visible = false;

    this.on('pointerdown', (e) => {
      e.stopPropagation(); // don't let the scene treat this as "tap on empty space"
      this.boing();
      onTap();
    });
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    tween(220, (t) => this.scale.set(ease.outBack(t)));
  }

  hide() {
    this.visible = false;
  }

  private boing() {
    tween(260, (t) => this.scale.set(1 - 0.2 * Math.sin(Math.PI * t)));
  }
}
