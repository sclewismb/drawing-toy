import type { Container } from 'pixi.js';
import type { PitchedSound } from './sound';
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
  // --- squishies ---
  // Squashed right down, then a springy bounce back.
  flatten: (r, t) => {
    const k = t < 0.12 ? ease.outCubic(t / 0.12) : elasticSettle((t - 0.12) / 0.88, 4);
    r.fx.scale.set(1 + 0.5 * k, 1 - 0.55 * k);
  },
  // Squashed flat... and it rises back up ever so slowly (memory foam).
  slowRise: (r, t) => {
    const k = t < 0.06 ? ease.outCubic(t / 0.06) : 1 - ease.outCubic((t - 0.06) / 0.94);
    r.fx.scale.set(1 + 0.45 * k, 1 - 0.55 * k);
  },
  // Pulled up tall and thin, then boings back.
  tall: (r, t) => {
    const k = t < 0.35 ? ease.inOutSine(t / 0.35) : elasticSettle((t - 0.35) / 0.65, 4);
    r.fx.scale.set(1 - 0.3 * k, 1 + 0.6 * k);
  },
  // Jelly: wide, tall, wide, tall...
  jelly: (r, t) => {
    const k = Math.sin(t * Math.PI * 10) * decay(t);
    r.fx.scale.set(1 + 0.22 * k, 1 - 0.22 * k);
  },
  // A poke in the side: it dents in and leans over, then puffs back.
  poke: (r, t, dir) => {
    const k = t < 0.15 ? ease.outCubic(t / 0.15) : 1 - ease.inOutSine((t - 0.15) / 0.85);
    r.fx.scale.set(1 - 0.18 * k, 1 - 0.12 * k);
    r.fx.skew.x = dir * 0.35 * k;
  },
  // Twisted round like a towel, then it unwinds with a wobble.
  twist: (r, t, dir) => {
    const k = t < 0.3 ? ease.inOutSine(t / 0.3) : elasticSettle((t - 0.3) / 0.7, 3);
    r.fx.skew.x = dir * 0.45 * k;
    r.fx.skew.y = -dir * 0.15 * k;
    r.fx.scale.set(1 - 0.12 * k, 1 + 0.08 * k);
  },
  // Pancake! Flat as flat, then it pops up into the air and lands with a wobble.
  pancake: (r, t) => {
    let sx = 1, sy = 1, y = 0;
    if (t < 0.25) {
      const k = ease.outCubic(Math.min(1, t / 0.1));
      sx = 1 + 0.75 * k;
      sy = 1 - 0.7 * k;
    } else if (t < 0.65) {
      const k = (t - 0.25) / 0.4;
      y = Math.sin(k * Math.PI) * r.size * 0.6;
      sx = 0.85;
      sy = 1.2;
    } else {
      const k = elasticSettle((t - 0.65) / 0.35, 3);
      sx = 1 + 0.3 * k;
      sy = 1 - 0.3 * k;
    }
    r.fx.y = r.restY - y;
    r.fx.scale.set(sx, sy);
  },
  // --- teddies ---
  // A big hug: squeezes in, wiggles side to side, and lets go.
  hug: (r, t) => {
    const k = Math.sin(t * Math.PI);
    r.fx.scale.set(1 - 0.12 * k, 1 + 0.06 * k);
    r.fx.rotation = Math.sin(t * Math.PI * 4) * 0.12 * k;
  },
  // When shaken hard while being carried.
  dizzy: (r, t) => {
    r.fx.rotation = 0.25 * Math.sin(t * Math.PI * 10) * decay(t);
    r.body.rotation = 0.3 * Math.sin(t * Math.PI * 4) * decay(t);
  },
} satisfies Record<string, Anim>;

export type ReactionName = keyof typeof anims;

const DURATION: Record<ReactionName, number> = {
  flatten: 900,
  slowRise: 2600,
  tall: 900,
  jelly: 1000,
  poke: 1200,
  twist: 1100,
  pancake: 1300,
  hug: 1100,
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

export const SOUND_FOR: Record<ReactionName, PitchedSound> = {
  flatten: 'squish',
  slowRise: 'squish',
  tall: 'squish',
  jelly: 'squish',
  poke: 'squish',
  twist: 'squish',
  pancake: 'squish',
  hug: 'giggle',
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
/** Squishies squish a different way each time. */
export const SQUISH_REACTIONS: ReactionName[] = ['flatten', 'slowRise', 'tall', 'jelly', 'poke', 'twist', 'pancake'];
/** Teddies mostly want hugs. */
export const BEAR_REACTIONS: ReactionName[] = ['hug', 'hug', 'giggle', 'wobble', 'bounce', 'spin'];

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
