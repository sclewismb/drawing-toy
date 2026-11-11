import type { Container } from 'pixi.js';
import type { SoundName } from './sound';
import { ease, tween } from './tween';

/**
 * Tap reactions. Each one animates the character's "fx" layer (squash,
 * stretch and wobble around its feet) and/or its body (spins), and has a
 * matching sound.
 */
export interface Reactable {
  fx: Container; // scales/rotates around the bottom of the drawing
  body: Container; // rotates around the middle (for spins)
  restY: number; // fx.y when at rest
  size: number; // height of the drawing, in the character's own units
}

type Anim = (r: Reactable, t: number, dir: number) => void;

const decay = (t: number) => (1 - t) * (1 - t);
const elasticSettle = (t: number, wobbles = 3) => Math.cos(t * Math.PI * wobbles) * decay(t);

const anims = {
  // Jelly wobble from the feet.
  wobble: (r, t) => {
    r.fx.rotation = 0.32 * Math.sin(t * Math.PI * 6) * decay(t);
    r.fx.scale.set(1 + 0.05 * Math.sin(t * Math.PI * 12) * decay(t), 1);
  },
  // Crouch, jump, land with a squish.
  bounce: (r, t) => {
    let y = 0, sx = 1, sy = 1;
    if (t < 0.15) {
      const k = Math.sin((t / 0.15) * Math.PI);
      sx = 1 + 0.18 * k;
      sy = 1 - 0.22 * k;
    } else if (t < 0.75) {
      const k = (t - 0.15) / 0.6;
      y = Math.sin(k * Math.PI) * r.size * 0.55;
      sx = 0.92;
      sy = 1.1;
    } else {
      const k = (t - 0.75) / 0.25;
      sy = 1 - 0.25 * elasticSettle(k, 2);
      sx = 1 + 0.2 * elasticSettle(k, 2);
    }
    r.fx.y = r.restY - y;
    r.fx.scale.set(sx, sy);
  },
  // Full spin with a little hop.
  spin: (r, t, dir) => {
    r.body.rotation = dir * Math.PI * 2 * ease.inOutSine(t);
    r.fx.y = r.restY - Math.sin(t * Math.PI) * r.size * 0.15;
  },
  // Squashed flat, then springs back.
  squish: (r, t) => {
    const squash = t < 0.18 ? ease.outCubic(t / 0.18) : elasticSettle((t - 0.18) / 0.82, 3);
    r.fx.scale.set(1 + 0.32 * squash, 1 - 0.38 * squash);
  },
  // Shiver side to side.
  jiggle: (r, t) => {
    r.fx.x = Math.sin(t * Math.PI * 16) * r.size * 0.05 * (1 - t);
    r.fx.skew.x = Math.sin(t * Math.PI * 16 + 1) * 0.08 * (1 - t);
  },
  // Lots of tiny happy hops.
  giggle: (r, t) => {
    r.fx.y = r.restY - Math.abs(Math.sin(t * Math.PI * 5)) * r.size * 0.07 * (1 - t * 0.5);
    r.fx.rotation = Math.sin(t * Math.PI * 5) * 0.08;
  },
  // Stretch up tall... then snap back (with a pop).
  stretch: (r, t) => {
    const k = t < 0.5 ? ease.inOutSine(t / 0.5) : elasticSettle((t - 0.5) / 0.5, 3);
    r.fx.scale.set(1 - 0.18 * k, 1 + 0.4 * k);
  },
  // Rare surprise: huge jump with a double spin.
  super: (r, t, dir) => {
    r.fx.y = r.restY - Math.sin(t * Math.PI) * r.size * 1.3;
    r.body.rotation = dir * Math.PI * 4 * ease.inOutSine(t);
    const land = t > 0.85 ? (t - 0.85) / 0.15 : 0;
    r.fx.scale.set(1 + 0.15 * Math.sin(land * Math.PI), 1 - 0.2 * Math.sin(land * Math.PI));
  },
  // When shaken hard while being carried.
  dizzy: (r, t) => {
    r.fx.rotation = 0.25 * Math.sin(t * Math.PI * 10) * decay(t);
    r.body.rotation = 0.3 * Math.sin(t * Math.PI * 4) * decay(t);
  },
} satisfies Record<string, Anim>;

export type ReactionName = keyof typeof anims;

const DURATION: Record<ReactionName, number> = {
  wobble: 750,
  bounce: 700,
  spin: 700,
  squish: 650,
  jiggle: 500,
  giggle: 650,
  stretch: 650,
  super: 1200,
  dizzy: 900,
};

export const SOUND_FOR: Record<ReactionName, SoundName> = {
  wobble: 'boing',
  bounce: 'spring',
  spin: 'slideWhistle',
  squish: 'squeak',
  jiggle: 'brrr',
  giggle: 'giggle',
  stretch: 'pop',
  super: 'yippee',
  dizzy: 'dizzy',
};

/** The everyday tap reactions (super and dizzy are special). */
export const TAP_REACTIONS: ReactionName[] = ['wobble', 'bounce', 'spin', 'squish', 'jiggle', 'giggle', 'stretch'];

export function resetFx(r: Reactable) {
  r.fx.position.set(0, r.restY);
  r.fx.scale.set(1);
  r.fx.rotation = 0;
  r.fx.skew.set(0);
  r.body.rotation = 0;
}

/** Play a reaction; returns a function that stops it early. */
export function playReaction(r: Reactable, name: ReactionName): () => void {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const anim: Anim = anims[name];
  resetFx(r);
  return tween(
    DURATION[name],
    (t) => anim(r, t, dir),
    () => resetFx(r),
  );
}
