import { Container, Graphics } from 'pixi.js';
import type { Motion } from './library';
import { ease, tween } from './tween';

const INK = 0x3a3a3a;

/**
 * A round button beside a selected drawing that chooses how it gets about
 * by itself. Each tap moves on to the next one, shown as a picture (no
 * words): sleepy face = stays still, footprints = walks, springy bounce =
 * hops, wings = flies.
 */
export class MoveButton extends Container {
  static readonly SIZE = 72;
  private face = new Graphics();
  private icon = new Graphics();

  constructor(onTap: () => void) {
    super();
    const r = MoveButton.SIZE / 2;
    this.face.circle(0, 4, r).fill({ color: 0x000000, alpha: 0.18 });
    this.face.circle(0, 0, r).fill(0xffffff).stroke({ width: 4, color: INK });
    this.addChild(this.face, this.icon);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.visible = false;
    this.on('pointerdown', (e) => {
      e.stopPropagation(); // not "a tap on empty space"
      tween(260, (t) => this.scale.set(1 - 0.2 * Math.sin(Math.PI * t)));
      onTap();
    });
  }

  show(m: Motion) {
    this.draw(m);
    if (this.visible) return;
    this.visible = true;
    tween(220, (t) => this.scale.set(ease.outBack(t)));
  }

  hide() {
    this.visible = false;
  }

  draw(m: Motion) {
    const g = this.icon.clear();
    switch (m) {
      case 'still': {
        // a sleepy face: closed eyes and a little "z"
        g.circle(-2, 4, 20).fill(0xffe8a3).stroke({ width: 3, color: INK });
        g.moveTo(-12, 2).quadraticCurveTo(-8, 6, -4, 2).moveTo(2, 2).quadraticCurveTo(6, 6, 10, 2).stroke({ width: 3, color: INK });
        g.moveTo(-6, 13).lineTo(4, 13).stroke({ width: 3, color: INK });
        g.moveTo(14, -24).lineTo(24, -24).lineTo(14, -14).lineTo(24, -14).stroke({ width: 3, color: 0x4ea8ff, cap: 'round', join: 'round' });
        break;
      }
      case 'walk': {
        // two footprints
        const foot = (x: number, y: number, a: number) => {
          const c = Math.cos(a), s = Math.sin(a);
          const at = (px: number, py: number) => [x + px * c - py * s, y + px * s + py * c] as const;
          const [fx, fy] = at(0, 4);
          g.ellipse(fx, fy, 7, 10).fill(0xff7a59);
          for (const [tx, ty] of [[-6, -10], [-1, -13], [4, -12], [8, -9]]) {
            const [px, py] = at(tx, ty);
            g.circle(px, py, 2.6).fill(0xff7a59);
          }
        };
        foot(-10, 8, -0.2);
        foot(10, -6, 0.2);
        break;
      }
      case 'hop': {
        // a bouncy path with a ball at the top
        g.moveTo(-24, 18).quadraticCurveTo(-14, -18, -4, 18).quadraticCurveTo(6, -6, 16, 18).stroke({ width: 3, color: 0x9a9a9a, cap: 'round' });
        g.circle(-14, -4, 7).fill(0x7bd36b).stroke({ width: 3, color: INK });
        g.moveTo(-26, 21).lineTo(24, 21).stroke({ width: 3, color: INK, cap: 'round' });
        break;
      }
      case 'fly': {
        // a pair of wings
        g.ellipse(-12, -6, 13, 9).fill(0xbde0fe).stroke({ width: 3, color: INK });
        g.ellipse(12, -6, 13, 9).fill(0xbde0fe).stroke({ width: 3, color: INK });
        g.ellipse(-9, 8, 9, 6).fill(0xbde0fe).stroke({ width: 3, color: INK });
        g.ellipse(9, 8, 9, 6).fill(0xbde0fe).stroke({ width: 3, color: INK });
        g.roundRect(-4, -14, 8, 30, 4).fill(0xffd166).stroke({ width: 3, color: INK });
        break;
      }
    }
  }
}
