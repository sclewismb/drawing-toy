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

/** Little hearts floating up from a point (a happy animal). */
export function hearts(layer: Container, x: number, y: number, count = 6) {
  for (let i = 0; i < count; i++) {
    const h = new Graphics()
      .circle(-6, -3, 7)
      .circle(6, -3, 7)
      .poly([-12.5, 0, 12.5, 0, 0, 14])
      .fill(i % 3 === 0 ? 0xff5d8f : i % 3 === 1 ? 0xff8fb1 : 0xe5383b);
    h.position.set(x, y);
    h.scale.set(0.01);
    layer.addChild(h);
    const dx = (Math.random() - 0.5) * 140;
    const rise = 120 + Math.random() * 90;
    const wait = i * 90;
    tween(
      1300 + wait,
      (t) => {
        const k = Math.max(0, (t * (1300 + wait) - wait) / 1300);
        h.x = x + dx * k + Math.sin(k * 9 + i) * 10;
        h.y = y - rise * ease.outCubic(k);
        h.scale.set(k < 0.2 ? k * 5 * 0.9 : 0.9);
        h.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      },
      () => h.destroy(),
    );
  }
}
