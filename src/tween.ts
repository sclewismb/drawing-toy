import { Ticker } from 'pixi.js';

/** Easing curves: take t from 0..1 and return a shaped 0..1 value. */
export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Run a tiny animation. `update` is called every frame with progress t (0..1).
 * Returns a function that cancels the animation.
 */
export function tween(
  durationMs: number,
  update: (t: number) => void,
  done?: () => void,
): () => void {
  const ticker = Ticker.shared;
  let elapsed = 0;
  const step = (tk: Ticker) => {
    elapsed += tk.deltaMS;
    const t = Math.min(1, elapsed / durationMs);
    try {
      update(t);
    } catch (err) {
      // Usually something that was taken away mid-animation (e.g. we left the
      // room). Stop this animation quietly: an error here would otherwise
      // repeat every frame and freeze every other animation, like the fade
      // between places, leaving the screen stuck on white.
      ticker.remove(step);
      if (import.meta.env.DEV) console.warn('Animation stopped:', err);
      return;
    }
    if (t >= 1) {
      ticker.remove(step);
      try {
        done?.();
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Animation end failed:', err);
      }
    }
  };
  ticker.add(step);
  return () => ticker.remove(step);
}
