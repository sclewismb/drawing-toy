import { Container, Graphics } from 'pixi.js';
import { ease, tween } from './tween';

const COLORS = [0xff7a59, 0xffd93d, 0x4ea8ff, 0x7bd36b, 0xb07de8, 0xff8fb1];

/** A burst of little stars flying out from a point. The "ta-da!" moment. */
export function burst(layer: Container, x: number, y: number, count = 16, reach = 160) {
  for (let i = 0; i < count; i++) {
    const star = new Graphics()
      .star(0, 0, 5, 12 + Math.random() * 8, 6)
      .fill(COLORS[i % COLORS.length]);
    star.position.set(x, y);
    layer.addChild(star);

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = reach * (0.6 + Math.random() * 0.6);
    const spin = (Math.random() - 0.5) * 8;
    tween(
      700 + Math.random() * 300,
      (t) => {
        const e = ease.outCubic(t);
        star.x = x + Math.cos(angle) * dist * e;
        star.y = y + Math.sin(angle) * dist * e;
        star.rotation = spin * t;
        star.alpha = 1 - t * t;
        star.scale.set(1 - 0.5 * t);
      },
      () => star.destroy(),
    );
  }
}
